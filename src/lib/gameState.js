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
    ymeta,
    ygivens,
    undoManager, 
    isConnected, 
    isSynced,
    isOffline,
    users,
    currentUser,
    updateUserName
  } = useYjsSync(roomId, isMultiplayerEnabled, initialGameData);

  // Initialize Yjs document with game data (only once)
  useEffect(() => {
    if (initialGameData && yboard.length === 0) {
      console.log('Initializing Yjs doc with initialGameData', initialGameData);
      yboard.doc.transact(() => {
        // Board
        yboard.delete(0, yboard.length);
        initialGameData.board.forEach((row) => {
          const yRow = new Y.Array();
          row.forEach(cell => yRow.push([cell]));
          yboard.push([yRow]);
        });
        
        // Notes
        if (initialGameData.notes) {
          const notesData = {};
          initialGameData.notes.forEach((row, r) => {
            row.forEach((cell, c) => {
              const key = `${r}-${c}`;
              notesData[key] = cell;
            });
          });
          ynotes.clear(); // Clear existing data if any
          ynotes.set('data', notesData);
        }

        // Cages
        ycages.delete(0, ycages.length);
        initialGameData.cages.forEach(cage => {
          ycages.push([cage]);
        });
        
        // Givens
        if (initialGameData.givens) {
            ygivens.delete(0, ygivens.length);
            initialGameData.givens.forEach(given => {
              ygivens.push([given]);
            });
        }

        // Difficulty
        if (initialGameData.difficulty) {
          ymeta.set('difficulty', initialGameData.difficulty);
        }
      }, 'init');
    }
  }, [initialGameData, yboard, ynotes, ycages, ygivens, ymeta]);

  // Observe Yjs changes and update React state
  useEffect(() => {
    const updateState = () => {
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

      // Get difficulty
      const difficulty = ymeta.get('difficulty');

      // Get givens
      const givens = new Set();
      ygivens.forEach(given => givens.add(given));

      setGameState({
        board,
        notes,
        cages,
        difficulty,
        givens
      });
    };

    // Initial update
    if (yboard.length > 0) {
      updateState();
    }

    // Observe changes
    const boardObserver = () => updateState();
    const notesObserver = () => updateState();
    const cagesObserver = () => updateState();
    const metaObserver = () => updateState();
    const givensObserver = () => updateState();

    yboard.observeDeep(boardObserver);
    ynotes.observe(notesObserver);
    ycages.observe(cagesObserver);
    ymeta.observe(metaObserver);
    ygivens.observe(givensObserver);

    return () => {
      yboard.unobserveDeep(boardObserver);
      ynotes.unobserve(notesObserver);
      ycages.unobserve(cagesObserver);
      ymeta.unobserve(metaObserver);
      ygivens.unobserve(givensObserver);
    };
  }, [yboard, ynotes, ycages, ymeta, ygivens]);



  // Save to localStorage when state changes (if offline)
  useEffect(() => {
    if (!isMultiplayerEnabled && gameState) {
      const dataToSave = {
        board: gameState.board,
        notes: gameState.notes,
        cages: gameState.cages,
        difficulty: gameState.difficulty, // Save difficulty too
        givens: Array.from(gameState.givens || []) // Save givens
      };
      localStorage.setItem(`killer-sudoku-${roomId}`, JSON.stringify(dataToSave));
    }
  }, [gameState, isMultiplayerEnabled, roomId]);

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
      ygivens.delete(0, ygivens.length);

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

      if (newState.givens) {
        newState.givens.forEach(given => ygivens.push([given]));
      }

      if (newState.difficulty) {
        ymeta.set('difficulty', newState.difficulty);
      }
    });
  }, [yboard, ynotes, ycages, ymeta, ygivens]);

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
    isOffline: !isMultiplayerEnabled,
    isConnected,
    users,
    currentUser,
    updateUserName,
    setLocalGameState
  };
}
