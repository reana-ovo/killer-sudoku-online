import { useState, useEffect, useCallback } from 'react';
import * as Y from 'yjs';
import { useYjsSync } from './useYjsSync';

export function useGameState(roomId, initialGameData, isMultiplayerEnabled = false) {
  const [gameState, setGameState] = useState(initialGameData);

  
  // Initialize Yjs sync
  const { 
    yboard, 
    ynotes, 
    ycages, 
    undoManager, 
    isConnected, 
    isSynced,
    isOffline 
  } = useYjsSync(roomId, isMultiplayerEnabled);

  // Initialize Yjs document with game data (only once)
  useEffect(() => {
    if (!initialGameData || yboard.length > 0) return;

    console.log('Initializing Yjs document with game data', { 
      hasInitialData: !!initialGameData, 
      yboardLength: yboard.length 
    });
    
    // Use Y.Doc transaction for atomic updates
    yboard.doc.transact(() => {
      // Initialize board
      initialGameData.board.forEach((row) => {
        const yRow = new Y.Array();
        row.forEach(cell => yRow.push([cell]));
        yboard.push([yRow]);
      });

      // Initialize notes
      if (initialGameData.notes) {
        const notesData = {};
        initialGameData.notes.forEach((row, r) => {
          row.forEach((cell, c) => {
            const key = `${r}-${c}`;
            notesData[key] = cell;
          });
        });
        ynotes.set('data', notesData);
      }

      // Initialize cages
      if (initialGameData.cages) {
        initialGameData.cages.forEach(cage => {
          ycages.push([cage]);
        });
      }
    }, 'init');



  }, [initialGameData, yboard, ynotes, ycages]);

  // Observe Yjs changes and update React state
  useEffect(() => {
    const updateGameState = () => {
      // Convert Yjs arrays/maps back to plain JavaScript
      const board = [];
      yboard.forEach(yRow => {
        const row = [];
        yRow.forEach(cell => row.push(cell));
        board.push(row);
      });

      // Convert notes map back to 2D array
      const notesData = ynotes.get('data') || {};
      const notes = Array(9).fill(null).map(() => 
        Array(9).fill(null).map(() => ({ center: [], corner: [], colors: [] }))
      );
      
      Object.entries(notesData).forEach(([key, value]) => {
        const [r, c] = key.split('-').map(Number);
        notes[r][c] = value;
      });

      // Convert cages
      const cages = [];
      ycages.forEach(cage => cages.push(cage));

      setGameState({
        board,
        notes,
        cages
      });
    };

    // Initial update
    if (yboard.length > 0) {
      updateGameState();
    }

    // Observe changes
    const boardObserver = () => updateGameState();
    const notesObserver = () => updateGameState();
    const cagesObserver = () => updateGameState();

    yboard.observeDeep(boardObserver);
    ynotes.observe(notesObserver);
    ycages.observe(cagesObserver);

    return () => {
      yboard.unobserveDeep(boardObserver);
      ynotes.unobserve(notesObserver);
      ycages.unobserve(cagesObserver);
    };
  }, [yboard, ynotes, ycages]);

  // Update functions - modify Yjs structures (automatic sync!)
  const updateCell = useCallback((row, col, value) => {
    const yRow = yboard.get(row);
    if (yRow) {
      yRow.delete(col, 1);
      yRow.insert(col, [value]);
    }
  }, [yboard]);

  const updateNotes = useCallback((row, col, type, value) => {
    const notesData = ynotes.get('data') || {};
    const key = `${row}-${col}`;
    const cellNotes = notesData[key] || { center: [], corner: [], colors: [] };
    
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

    notesData[key] = cellNotes;
    ynotes.set('data', notesData);
  }, [ynotes]);

  const clearNotes = useCallback((row, col) => {
    const notesData = ynotes.get('data') || {};
    const key = `${row}-${col}`;
    notesData[key] = { center: [], corner: [], colors: [] };
    ynotes.set('data', notesData);
  }, [ynotes]);

  const clearModeContent = useCallback((row, col, mode) => {
    const notesData = ynotes.get('data') || {};
    const key = `${row}-${col}`;
    const cellNotes = notesData[key] || { center: [], corner: [], colors: [] };

    if (mode === 'center') {
      cellNotes.center = [];
    } else if (mode === 'corner') {
      cellNotes.corner = [];
    } else if (mode === 'color') {
      cellNotes.colors = [];
    }

    notesData[key] = cellNotes;
    ynotes.set('data', notesData);
  }, [ynotes]);

  // Batch operations
  const updateCellsBatch = useCallback((updates) => {
    yboard.doc.transact(() => {
      updates.forEach(({ row, col, value }) => {
        const yRow = yboard.get(row);
        if (yRow) {
          yRow.delete(col, 1);
          yRow.insert(col, [value]);
        }
      });
    });
  }, [yboard]);

  const updateNotesBatch = useCallback((updates) => {
    const notesData = ynotes.get('data') || {};
    
    updates.forEach(({ row, col, type, value, shouldRemove }) => {
      const key = `${row}-${col}`;
      const cellNotes = notesData[key] || { center: [], corner: [], colors: [] };

      if (type === 'center') {
        if (shouldRemove) {
          cellNotes.center = cellNotes.center.filter(v => v !== value);
        } else if (!cellNotes.center.includes(value)) {
          cellNotes.center = [...cellNotes.center, value].sort();
        }
      } else if (type === 'corner') {
        if (shouldRemove) {
          cellNotes.corner = cellNotes.corner.filter(v => v !== value);
        } else if (!cellNotes.corner.includes(value)) {
          cellNotes.corner = [...cellNotes.corner, value].sort();
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
          cellNotes.colors = colorArray.filter(c => c !== newColor);
        } else if (!colorArray.includes(newColor)) {
          cellNotes.colors = [...colorArray, newColor];
        }
      }

      notesData[key] = cellNotes;
    });

    ynotes.set('data', notesData);
  }, [ynotes]);

  const clearModeContentBatch = useCallback((updates) => {
    const notesData = ynotes.get('data') || {};

    updates.forEach(({ row, col, mode }) => {
      const key = `${row}-${col}`;
      const cellNotes = notesData[key] || { center: [], corner: [], colors: [] };
      
      if (mode === 'center') {
        cellNotes.center = [];
      } else if (mode === 'corner') {
        cellNotes.corner = [];
      } else if (mode === 'color') {
        cellNotes.colors = [];
      }

      notesData[key] = cellNotes;
    });

    ynotes.set('data', notesData);
  }, [ynotes]);

  // Undo/Redo using Yjs UndoManager
  const undo = useCallback(() => {
    if (undoManager.canUndo()) {
      undoManager.undo();
    }
  }, [undoManager]);

  const redo = useCallback(() => {
    if (undoManager.canRedo()) {
      undoManager.redo();
    }
  }, [undoManager]);

  const canUndo = undoManager.canUndo();
  const canRedo = undoManager.canRedo();

  // Helper to manually set state (for local game generation)
  const setLocalGameState = useCallback((newState) => {
    if (!newState) return;

    yboard.doc.transact(() => {
      // Clear existing
      yboard.delete(0, yboard.length);
      ynotes.clear();
      ycages.delete(0, ycages.length);

      // Set new data
      newState.board.forEach((row) => {
        const yRow = new Y.Array();
        row.forEach(cell => yRow.push([cell]));
        yboard.push([yRow]);
      });

      if (newState.notes) {
        const notesData = {};
        newState.notes.forEach((row, r) => {
          row.forEach((cell, c) => {
            notesData[`${r}-${c}`] = cell;
          });
        });
        ynotes.set('data', notesData);
      }

      if (newState.cages) {
        newState.cages.forEach(cage => ycages.push([cage]));
      }
    });
  }, [yboard, ynotes, ycages]);

  const clearUndoHistory = useCallback(() => {
    undoManager.clear();
  }, [undoManager]);

  return {
    gameState,
    loading: !gameState && (!isMultiplayerEnabled || !isSynced),
    updateCell,
    updateCellsBatch,
    updateNotes,
    updateNotesBatch,
    clearNotes,
    clearModeContent,
    clearModeContentBatch,
    undo,
    redo,
    canUndo,
    canRedo,
    clearUndoHistory,
    isOffline,
    isConnected,
    setLocalGameState
  };
}
