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
  
  // Version tracking for local-first sync
  const [localVersion, setLocalVersion] = useState(0);
  const localVersionRef = useRef(0);
  const pendingUpdateTimer = useRef(null);

  // History management for undo/redo
  // Tracks ALL state changes (local + remote) for accurate undo/redo
  const [history, setHistory] = useState([initialGameData]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const maxHistorySize = 50;
  const isUndoRedoAction = useRef(false); // Flag to prevent adding history during undo/redo

  // Helper to add state to history
  const pushToHistory = useRef((newState) => {
    // Don't add to history if this is an undo/redo action
    if (isUndoRedoAction.current) return;

    setHistory(prev => {
      // Truncate future history if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1);
      
      // Add new state
      newHistory.push(newState);
      
      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
        // Adjust index since we removed first element
        setHistoryIndex(maxHistorySize - 1);
      } else {
        setHistoryIndex(newHistory.length - 1);
      }
      
      return newHistory;
    });
  }).current;

  // Debounced Supabase sync (300ms delay to batch rapid changes)
  const syncToSupabase = useRef((newState, version) => {
    if (!isSupabaseConfigured || isOffline) return;
    
    // Clear any pending update
    if (pendingUpdateTimer.current) {
      clearTimeout(pendingUpdateTimer.current);
    }
    
    // Schedule new update
    pendingUpdateTimer.current = setTimeout(async () => {
      try {
        await supabase
          .from('games')
          .update({ 
            board_state: { ...newState, version, lastModified: Date.now() }
          })
          .eq('id', roomId);
      } catch (e) {
        console.error("Failed to sync update:", e);
      }
    }, 300);
  }).current;

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
          const newState = payload.new.board_state;
          const remoteVersion = newState?.version || 0;
          
          // Only update if remote version is newer than local
          // This prevents stale updates from overwriting optimistic local changes
          if (remoteVersion > localVersionRef.current) {
            setGameState(newState);
            stateRef.current = newState;
            // Add remote changes to history (tracks both local AND remote for accurate undo/redo)
            pushToHistory(newState);
            // Don't update localVersion - it only increments on local changes
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]); // Removed initialGameData dependency to avoid loop, handled in separate effect

  const updateCell = (row, col, value) => {
    const currentBoard = gameState?.board || stateRef.current?.board;
    if (!currentBoard) return;

    // Increment local version
    const newVersion = localVersionRef.current + 1;
    localVersionRef.current = newVersion;
    setLocalVersion(newVersion);

    // Apply change optimistically
    const newBoard = [...currentBoard];
    newBoard[row] = [...newBoard[row]];
    newBoard[row][col] = value;

    const newGameState = { 
      ...(gameState || stateRef.current), 
      board: newBoard,
      version: newVersion,
      lastModified: Date.now()
    };
    
    setGameState(newGameState);
    stateRef.current = newGameState;

    // Add to history for undo/redo
    pushToHistory(newGameState);

    // Debounced sync to Supabase
    syncToSupabase(newGameState, newVersion);
  };

  const updateNotes = (row, col, type, value) => {
      const currentNotes = gameState?.notes || stateRef.current?.notes;
      // If notes don't exist (old game), initialize them
      let newNotes = currentNotes ? [...currentNotes] : Array(9).fill(null).map(() => Array(9).fill(null).map(() => ({ center: [], corner: [], colors: [] })));
      
      // Increment local version
      const newVersion = localVersionRef.current + 1;
      localVersionRef.current = newVersion;
      setLocalVersion(newVersion);
      
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

      const newGameState = { 
        ...(gameState || stateRef.current), 
        notes: newNotes,
        version: newVersion,
        lastModified: Date.now()
      };
      
      setGameState(newGameState);
      stateRef.current = newGameState;

      // Add to history for undo/redo
      pushToHistory(newGameState);

      // Debounced sync to Supabase
      syncToSupabase(newGameState, newVersion);
  };

  const clearModeContent = (row, col, mode) => {
      const currentNotes = gameState?.notes || stateRef.current?.notes;
      if (!currentNotes) return;

      const newVersion = localVersionRef.current + 1;
      localVersionRef.current = newVersion;
      setLocalVersion(newVersion);

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

      const newGameState = { 
        ...(gameState || stateRef.current), 
        notes: newNotes,
        version: newVersion,
        lastModified: Date.now()
      };
      setGameState(newGameState);
      stateRef.current = newGameState;

      pushToHistory(newGameState);

      syncToSupabase(newGameState, newVersion);
  };

  // Batch update for multiple cells (for multi-selection)
  const updateCellsBatch = (updates) => {
    const currentBoard = gameState?.board || stateRef.current?.board;
    if (!currentBoard) return;

    const newVersion = localVersionRef.current + 1;
    localVersionRef.current = newVersion;
    setLocalVersion(newVersion);

    const newBoard = currentBoard.map(row => [...row]);
    updates.forEach(({ row, col, value }) => {
      newBoard[row][col] = value;
    });

    const newGameState = { 
      ...(gameState || stateRef.current), 
      board: newBoard,
      version: newVersion,
      lastModified: Date.now()
    };
    setGameState(newGameState);
    stateRef.current = newGameState;

    pushToHistory(newGameState);

    syncToSupabase(newGameState, newVersion);
  };

  // Batch update for notes (for multi-selection)
  const updateNotesBatch = (updates) => {
    const currentNotes = gameState?.notes || stateRef.current?.notes;
    let newNotes = currentNotes ? [...currentNotes] : Array(9).fill(null).map(() => Array(9).fill(null).map(() => ({ center: [], corner: [], colors: [] })));

    const newVersion = localVersionRef.current + 1;
    localVersionRef.current = newVersion;
    setLocalVersion(newVersion);

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

    const newGameState = { 
      ...(gameState || stateRef.current), 
      notes: newNotes,
      version: newVersion,
      lastModified: Date.now()
    };
    setGameState(newGameState);
    stateRef.current = newGameState;

    pushToHistory(newGameState);

    syncToSupabase(newGameState, newVersion);
  };

  // Batch clear for mode content (for multi-selection delete)
  const clearModeContentBatch = (updates) => {
    const currentNotes = gameState?.notes || stateRef.current?.notes;
    if (!currentNotes) return;

    const newVersion = localVersionRef.current + 1;
    localVersionRef.current = newVersion;
    setLocalVersion(newVersion);

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

    const newGameState = { 
      ...(gameState || stateRef.current), 
      notes: newNotes,
      version: newVersion,
      lastModified: Date.now()
    };
    setGameState(newGameState);
    stateRef.current = newGameState;

    pushToHistory(newGameState);

    syncToSupabase(newGameState, newVersion);
  };

  const clearNotes = (row, col) => {
      const currentNotes = gameState?.notes || stateRef.current?.notes;
      if (!currentNotes) return;

      const newVersion = localVersionRef.current + 1;
      localVersionRef.current = newVersion;
      setLocalVersion(newVersion);

      let newNotes = [...currentNotes];
      newNotes[row] = [...newNotes[row]];
      newNotes[row][col] = { center: [], corner: [], colors: [] };

      const newGameState = { 
        ...(gameState || stateRef.current), 
        notes: newNotes,
        version: newVersion,
        lastModified: Date.now()
      };
      setGameState(newGameState);
      stateRef.current = newGameState;

      pushToHistory(newGameState);

      syncToSupabase(newGameState, newVersion);
  };

  // Undo/Redo functions
  const undo = () => {
    if (historyIndex <= 0) return; // Can't undo further

    isUndoRedoAction.current = true;
    const newIndex = historyIndex - 1;
    const previousState = history[newIndex];

    // Increment version for undo action
    const newVersion = localVersionRef.current + 1;
    localVersionRef.current = newVersion;
    setLocalVersion(newVersion);

    const stateWithVersion = {
      ...previousState,
      version: newVersion,
      lastModified: Date.now()
    };

    setGameState(stateWithVersion);
    stateRef.current = stateWithVersion;
    setHistoryIndex(newIndex);

    // Sync undo to Supabase
    syncToSupabase(stateWithVersion, newVersion);

    isUndoRedoAction.current = false;
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return; // Can't redo further

    isUndoRedoAction.current = true;
    const newIndex = historyIndex + 1;
    const nextState = history[newIndex];

    // Increment version for redo action
    const newVersion = localVersionRef.current + 1;
    localVersionRef.current = newVersion;
    setLocalVersion(newVersion);

    const stateWithVersion = {
      ...nextState,
      version: newVersion,
      lastModified: Date.now()
    };

    setGameState(stateWithVersion);
    stateRef.current = stateWithVersion;
    setHistoryIndex(newIndex);

    // Sync redo to Supabase
    syncToSupabase(stateWithVersion, newVersion);

    isUndoRedoAction.current = false;
  };

  const canUndo = () => historyIndex > 0;
  const canRedo = () => historyIndex < history.length - 1;

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
    undo,
    redo,
    canUndo: canUndo(),
    canRedo: canRedo(),
    isOffline, 
    setLocalGameState 
  };
}
