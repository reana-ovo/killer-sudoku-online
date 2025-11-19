import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

const isSupabaseConfigured = 
  process.env.NEXT_PUBLIC_SUPABASE_URL && 
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder-project.supabase.co' &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'placeholder-key';

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
      let newNotes = currentNotes ? [...currentNotes] : Array(9).fill(null).map(() => Array(9).fill(null).map(() => ({ center: [], corner: [] })));
      
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
          // Toggle color: if same color, remove it.
          // We map numbers 1-9 to specific colors.
          const colors = [
              '#fca5a5', // 1: Red
              '#fdba74', // 2: Orange
              '#fcd34d', // 3: Amber
              '#86efac', // 4: Green
              '#67e8f9', // 5: Cyan
              '#93c5fd', // 6: Blue
              '#c4b5fd', // 7: Violet
              '#f0abfc', // 8: Fuchsia
              '#fda4af'  // 9: Rose
          ];
          const newColor = colors[value - 1];
          if (cellNotes.color === newColor) {
              cellNotes.color = null;
          } else {
              cellNotes.color = newColor;
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
          cellNotes.color = null;
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

  const clearNotes = async (row, col) => {
      const currentNotes = gameState?.notes || stateRef.current?.notes;
      if (!currentNotes) return;

      let newNotes = [...currentNotes];
      newNotes[row] = [...newNotes[row]];
      newNotes[row][col] = { center: [], corner: [], color: null };

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

  return { gameState, loading, updateCell, updateNotes, clearNotes, clearModeContent, isOffline, setLocalGameState };
}
