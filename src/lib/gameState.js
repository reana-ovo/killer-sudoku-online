import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

const isSupabaseConfigured = 
  process.env.NEXT_PUBLIC_SUPABASE_URL && 
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder-project.supabase.co' &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY !== 'placeholder-key';

export function useGameState(roomId, initialGameData) {
  const [gameState, setGameState] = useState(initialGameData);
  // Initialize loading based on config: if offline, we are ready immediately (unless waiting for something else).
  // If online, we need to fetch.
  const [loading, setLoading] = useState(isSupabaseConfigured && !initialGameData);
  const [isOffline, setIsOffline] = useState(!isSupabaseConfigured);
  const stateRef = useRef(initialGameData);



  useEffect(() => {
    if (!roomId) return;

    // If offline or not configured, we just use local state
    if (!isSupabaseConfigured) {
        return;
    }

    // Fetch initial state from Supabase
    const fetchGame = async () => {
      try {
        const { data, error } = await supabase
            .from('games')
            .select('board_state')
            .eq('id', roomId)
            .single();

        if (data) {
            setGameState(data.board_state);
            stateRef.current = data.board_state;
        } else if (error) {
            console.error("Error fetching game:", error);
            // Fallback to offline if fetch fails
            setIsOffline(true);
        }
      } catch (e) {
          console.error("Exception fetching game:", e);
          setIsOffline(true);
      }
      setLoading(false);
    };

    fetchGame();

    // Subscribe to changes
    const channel = supabase
      .channel(`game:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          setGameState(payload.new.board_state);
          stateRef.current = payload.new.board_state;
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]); // Removed initialGameData dependency to avoid loop, handled in separate effect

  const updateCell = async (row, col, value) => {
    const currentBoard = gameState?.board || stateRef.current?.board;
    if (!currentBoard) return;

    const newBoard = [...currentBoard];
    newBoard[row] = [...newBoard[row]];
    newBoard[row][col] = value;

    const newGameState = { ...(gameState || stateRef.current), board: newBoard };
    setGameState(newGameState); // Optimistic update
    stateRef.current = newGameState;

    if (!isOffline && isSupabaseConfigured) {
        try {
            await supabase
            .from('games')
            .update({ board_state: newGameState })
            .eq('id', roomId);
        } catch (e) {
            console.error("Failed to sync update:", e);
        }
    }
  };

  const updateNotes = async (row, col, type, value) => {
      const currentNotes = gameState?.notes || stateRef.current?.notes;
      // If notes don't exist (old game), initialize them
      let newNotes = currentNotes ? [...currentNotes] : Array(9).fill(null).map(() => Array(9).fill(null).map(() => ({ center: [], corner: [], colors: [] })));
      
      newNotes[row] = [...newNotes[row]];
      const cellNotes = { ...newNotes[row][col] };
      
      if (type === 'center') {
          if (cellNotes.center.includes(value)) {
              cellNotes.center = cellNotes.center.filter(v => v !== value);
          } else {
              cellNotes.center = [...cellNotes.center, value].sort();
          }
      } else if (type === 'corner') {
          if (cellNotes.corner.includes(value)) {
              cellNotes.corner = cellNotes.corner.filter(v => v !== value);
          } else {
              cellNotes.corner = [...cellNotes.corner, value].sort();
          }
      } else if (type === 'color') {
          // Toggle color: add if not present, remove if present
          const colors = [
              '#fecaca', '#fed7aa', '#fde68a',
              '#bbf7d0', '#a5f3fc', '#bfdbfe',
              '#ddd6fe', '#f5d0fe', '#e5e7eb'
          ];
          const newColor = colors[value - 1];
          const colorArray = cellNotes.colors || [];
          
          if (colorArray.includes(newColor)) {
              cellNotes.colors = colorArray.filter(c => c !== newColor);
          } else {
              cellNotes.colors = [...colorArray, newColor];
          }
      }

      newNotes[row][col] = cellNotes;

      const newGameState = { ...(gameState || stateRef.current), notes: newNotes };
      setGameState(newGameState);
      stateRef.current = newGameState;

      if (!isOffline && isSupabaseConfigured) {
        try {
            await supabase
            .from('games')
            .update({ board_state: newGameState })
            .eq('id', roomId);
        } catch (e) {
            console.error("Failed to sync update:", e);
        }
    }
  };

  const clearModeContent = async (row, col, mode) => {
      const currentNotes = gameState?.notes || stateRef.current?.notes;
      if (!currentNotes) return;

      let newNotes = [...currentNotes];
      newNotes[row] = [...newNotes[row]];
      const cellNotes = { ...newNotes[row][col] };

      if (mode === 'center') {
          cellNotes.center = [];
      } else if (mode === 'corner') {
          cellNotes.corner = [];
      } else if (mode === 'color') {
          cellNotes.colors = [];
      }

      newNotes[row][col] = cellNotes;

      const newGameState = { ...(gameState || stateRef.current), notes: newNotes };
      setGameState(newGameState);
      stateRef.current = newGameState;

      if (!isOffline && isSupabaseConfigured) {
        try {
            await supabase
            .from('games')
            .update({ board_state: newGameState })
            .eq('id', roomId);
        } catch (e) {
            console.error("Failed to sync update:", e);
        }
    }
  };

  // Batch update for multiple cells (for multi-selection)
  const updateCellsBatch = async (updates) => {
    const currentBoard = gameState?.board || stateRef.current?.board;
    if (!currentBoard) return;

    const newBoard = currentBoard.map(row => [...row]);
    updates.forEach(({ row, col, value }) => {
      newBoard[row][col] = value;
    });

    const newGameState = { ...(gameState || stateRef.current), board: newBoard };
    setGameState(newGameState);
    stateRef.current = newGameState;

    if (!isOffline && isSupabaseConfigured) {
      try {
        await supabase
          .from('games')
          .update({ board_state: newGameState })
          .eq('id', roomId);
      } catch (e) {
        console.error("Failed to sync batch update:", e);
      }
    }
  };

  // Batch update for notes (for multi-selection)
  const updateNotesBatch = async (updates) => {
    const currentNotes = gameState?.notes || stateRef.current?.notes;
    let newNotes = currentNotes ? [...currentNotes] : Array(9).fill(null).map(() => Array(9).fill(null).map(() => ({ center: [], corner: [], colors: [] })));

    newNotes = newNotes.map(row => row.map(cell => ({ ...cell })));

    updates.forEach(({ row, col, type, value, shouldRemove }) => {
      const cellNotes = newNotes[row][col];

      if (type === 'center') {
        if (shouldRemove) {
          // Remove the note
          cellNotes.center = cellNotes.center.filter(v => v !== value);
        } else {
          // Add the note if not present
          if (!cellNotes.center.includes(value)) {
            cellNotes.center = [...cellNotes.center, value].sort();
          }
        }
      } else if (type === 'corner') {
        if (shouldRemove) {
          // Remove the note
          cellNotes.corner = cellNotes.corner.filter(v => v !== value);
        } else {
          // Add the note if not present
          if (!cellNotes.corner.includes(value)) {
            cellNotes.corner = [...cellNotes.corner, value].sort();
          }
        }
      } else if (type === 'color') {
        const colors = [
          '#fecaca', '#fed7aa', '#fde68a',
          '#bbf7d0', '#a5f3fc', '#bfdbfe',
          '#ddd6fe', '#f5d0fe', '#e5e7eb'
        ];
        const newColor = colors[value - 1];
        const colorArray = cellNotes.colors || [];
        
        if (shouldRemove) {
          // Remove the color
          cellNotes.colors = colorArray.filter(c => c !== newColor);
        } else {
          // Add the color if not present
          if (!colorArray.includes(newColor)) {
            cellNotes.colors = [...colorArray, newColor];
          }
        }
      }
    });

    const newGameState = { ...(gameState || stateRef.current), notes: newNotes };
    setGameState(newGameState);
    stateRef.current = newGameState;

    if (!isOffline && isSupabaseConfigured) {
      try {
        await supabase
          .from('games')
          .update({ board_state: newGameState })
          .eq('id', roomId);
      } catch (e) {
        console.error("Failed to sync batch update:", e);
      }
    }
  };

  // Batch clear for mode content (for multi-selection delete)
  const clearModeContentBatch = async (updates) => {
    const currentNotes = gameState?.notes || stateRef.current?.notes;
    if (!currentNotes) return;

    let newNotes = currentNotes.map(row => row.map(cell => ({ ...cell })));

    updates.forEach(({ row, col, mode }) => {
      const cellNotes = newNotes[row][col];
      if (mode === 'center') {
        cellNotes.center = [];
      } else if (mode === 'corner') {
        cellNotes.corner = [];
      } else if (mode === 'color') {
        cellNotes.colors = [];
      }
    });

    const newGameState = { ...(gameState || stateRef.current), notes: newNotes };
    setGameState(newGameState);
    stateRef.current = newGameState;

    if (!isOffline && isSupabaseConfigured) {
      try {
        await supabase
          .from('games')
          .update({ board_state: newGameState })
          .eq('id', roomId);
      } catch (e) {
        console.error("Failed to sync batch update:", e);
      }
    }
  };

  const clearNotes = async (row, col) => {
      const currentNotes = gameState?.notes || stateRef.current?.notes;
      if (!currentNotes) return;

      let newNotes = [...currentNotes];
      newNotes[row] = [...newNotes[row]];
      newNotes[row][col] = { center: [], corner: [], colors: [] };

      const newGameState = { ...(gameState || stateRef.current), notes: newNotes };
      setGameState(newGameState);
      stateRef.current = newGameState;

      if (!isOffline && isSupabaseConfigured) {
        try {
            await supabase
            .from('games')
            .update({ board_state: newGameState })
            .eq('id', roomId);
        } catch (e) {
            console.error("Failed to sync update:", e);
        }
    }
  };

  // Helper to manually set state (e.g. when generating locally)
  const setLocalGameState = (newState) => {
      setGameState(newState);
      stateRef.current = newState;
  };

  return { 
    gameState, 
    loading, 
    updateCell, 
    updateCellsBatch,
    updateNotes, 
    updateNotesBatch,
    clearNotes, 
    clearModeContent,
    clearModeContentBatch,
    isOffline, 
    setLocalGameState 
  };
}
