'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useGameState } from '@/lib/gameState';
import { createNewGame } from '@/lib/sudokuGenerator';
import Board from '@/components/Board';
import Header from '@/components/Header';
import Controls from '@/components/Controls';

export default function GameRoom() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = params.roomId;
  const shouldCreate = searchParams.get('create') === 'true';
  const urlDifficulty = searchParams.get('difficulty') || 'Medium';
  
  // Load local data asynchronously to avoid hydration mismatch
  const [initialLocalData, setInitialLocalData] = useState(null);
  const [isLocalDataLoaded, setIsLocalDataLoaded] = useState(false);
  const [isMultiplayerEnabled, setIsMultiplayerEnabled] = useState(!shouldCreate);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`killer-sudoku-${roomId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setInitialLocalData(parsed);
          // If we found local data, we should be in local mode
          if (!shouldCreate) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsMultiplayerEnabled(false);
          }
        } catch (e) {
          console.error('Failed to parse local game data:', e);
        }
      }
      setIsLocalDataLoaded(true);
    }
  }, [roomId, shouldCreate]);

  const { 
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
    canUndo, 
    canRedo, 
    clearUndoHistory, 
    isOffline, 
    isConnected, 
    setLocalGameState,
    users,
    currentUser,
    updateUserName
  } = useGameState(roomId, initialLocalData, isMultiplayerEnabled);
  
  const [selectedCells, setSelectedCells] = useState(new Set()); // Set of "r-c" strings
  const [inputMode, setInputMode] = useState('answer'); // 'answer', 'center', 'corner', 'color'
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState('add'); // 'add' or 'remove' - for Ctrl+drag behavior
  const [isMultiSelectActive, setIsMultiSelectActive] = useState(false); // Toggle for mobile multi-selection
  const [showRules, setShowRules] = useState(false);
  const [difficulty, setDifficulty] = useState(urlDifficulty);

  // Update difficulty when local data is loaded
  useEffect(() => {
    if (initialLocalData && initialLocalData.difficulty) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDifficulty(initialLocalData.difficulty);
    }
  }, [initialLocalData]);

  // Use ref to track if we've synced difficulty from gameState
  const hasInitializedDifficulty = React.useRef(false);
  
  // Update difficulty if gameState has it (when joining) - only once
  useEffect(() => {
    if (gameState && gameState.difficulty && !hasInitializedDifficulty.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDifficulty(gameState.difficulty);
      hasInitializedDifficulty.current = true;
    }
  }, [gameState]);

  const handleDifficultyChange = async (newDifficulty) => {
    setDifficulty(newDifficulty);
    if (!isMultiplayerEnabled) {
        const newGame = await createNewGame(newDifficulty);
        setLocalGameState(newGame);
        clearUndoHistory();
    } else {
        if (confirm('Changing difficulty will start a new game for everyone. Continue?')) {
            const newGame = await createNewGame(newDifficulty);
            setLocalGameState(newGame);
            clearUndoHistory();
        } else {
            setDifficulty(difficulty); 
        }
    }
  };

  // Generate game if needed (offline or explicit create)
  useEffect(() => {
      // Only generate if:
      // 1. We have finished checking for local data
      // 2. We don't have a gameState yet
      // 3. We don't have initial local data (or we do, but we want to create new)
      // 4. We are in local mode OR explicitly creating
      if (isLocalDataLoaded && !gameState && !initialLocalData && (!isMultiplayerEnabled || shouldCreate)) {
          const initGame = async () => {
            console.log("Generating new game locally...");
            const newGame = await createNewGame(difficulty);
            setLocalGameState(newGame);
            clearUndoHistory();
            
            // Remove ?create=true from URL to prevent resetting to offline on refresh
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
          };
          initGame();
      }
  }, [gameState, isMultiplayerEnabled, shouldCreate, setLocalGameState, clearUndoHistory, difficulty, initialLocalData, isLocalDataLoaded]);



  // ... (mouse handlers remain the same)
  const handleMouseDown = (r, c, e) => {
      const cellKey = `${r}-${c}`;
      
      if (e.ctrlKey || e.metaKey || isMultiSelectActive) {
          // Ctrl+drag: determine mode based on first cell
          const wasSelected = selectedCells.has(cellKey);
          setDragMode(wasSelected ? 'remove' : 'add');
          setIsDragging(true);
          
          // Toggle the first cell
          setSelectedCells(prev => {
              const newSet = new Set(prev);
              if (wasSelected) {
                  newSet.delete(cellKey);
              } else {
                  newSet.add(cellKey);
              }
              return newSet;
          });
      } else {
          // Normal drag: always add mode, start fresh selection
          setDragMode('add');
          setIsDragging(true);
          setSelectedCells(new Set([cellKey]));
      }
  };

  const handleMouseEnter = (r, c) => {
      if (isDragging) {
          const cellKey = `${r}-${c}`;
          setSelectedCells(prev => {
              const newSet = new Set(prev);
              if (dragMode === 'add') {
                  newSet.add(cellKey);
              } else {
                  newSet.delete(cellKey);
              }
              return newSet;
          });
      }
  };

  const handleMouseUp = () => {
      setIsDragging(false);
  };

  // Global mouse up to catch releases outside board
  useEffect(() => {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleNumberClick = useCallback((num) => {
    if (selectedCells.size === 0) return;

    // Filter out given cells from modification
    const editableCells = [...selectedCells].filter(cellKey => {
        return !gameState.givens || !gameState.givens.has(cellKey);
    });

    if (editableCells.length === 0) return;

    if (inputMode === 'answer') {
      // Check if ALL editable selected cells have this number
      let allHaveNumber = true;
      editableCells.forEach(cellKey => {
        const [r, c] = cellKey.split('-').map(Number);
        if (gameState.board[r][c] !== num) {
          allHaveNumber = false;
        }
      });

      // If all have it, remove it. Otherwise, add it to all.
      const updates = [];
      editableCells.forEach(cellKey => {
        const [r, c] = cellKey.split('-').map(Number);
        const newValue = allHaveNumber ? 0 : num;
        updates.push({ row: r, col: c, value: newValue });
      });
      updateCellsBatch(updates);
    } else {
      // For notes mode, check if ALL empty cells have this note
      const emptyCells = [];
      editableCells.forEach(cellKey => {
        const [r, c] = cellKey.split('-').map(Number);
        if (gameState.board[r][c] === 0) {
          emptyCells.push({ r, c, key: cellKey });
        }
      });

      if (emptyCells.length === 0) return;

      // Check if ALL empty cells have this note/color
      let allHaveNote = true;
      emptyCells.forEach(({ r, c }) => {
        const cellNotes = gameState.notes?.[r]?.[c];
        if (!cellNotes) {
          allHaveNote = false;
          return;
        }

        if (inputMode === 'center') {
          if (!cellNotes.center.includes(num)) {
            allHaveNote = false;
          }
        } else if (inputMode === 'corner') {
          if (!cellNotes.corner.includes(num)) {
            allHaveNote = false;
          }
        } else if (inputMode === 'color') {
          const colors = [
            '#fecaca', '#fed7aa', '#fde68a',
            '#bbf7d0', '#a5f3fc', '#bfdbfe',
            '#ddd6fe', '#f5d0fe', '#e5e7eb'
          ];
          const targetColor = colors[num - 1];
          const colorArray = cellNotes.colors || [];
          if (!colorArray.includes(targetColor)) {
            allHaveNote = false;
          }
        }
      });

      // Apply the same action to all cells
      const updates = [];
      emptyCells.forEach(({ r, c }) => {
        updates.push({ row: r, col: c, type: inputMode, value: num, shouldRemove: allHaveNote });
      });
      
      if (updates.length > 0) {
        updateNotesBatch(updates);
      }
    }
  }, [selectedCells, inputMode, gameState, updateCellsBatch, updateNotesBatch]);

  const handleDelete = useCallback(() => {
    if (selectedCells.size > 0) {
      // Filter out given cells
      const editableCells = [...selectedCells].filter(cellKey => {
        return !gameState.givens || !gameState.givens.has(cellKey);
      });
      
      if (editableCells.length === 0) return;

      if (inputMode === 'answer') {
        // Batch clear for answer mode
        const updates = [];
        editableCells.forEach(cellKey => {
          const [r, c] = cellKey.split('-').map(Number);
          updates.push({ row: r, col: c, value: 0 });
        });
        updateCellsBatch(updates);
      } else {
        // Batch clear for mode content
        const updates = [];
        editableCells.forEach(cellKey => {
          const [r, c] = cellKey.split('-').map(Number);
          updates.push({ row: r, col: c, mode: inputMode });
        });
        clearModeContentBatch(updates);
      }
    }
  }, [selectedCells, inputMode, updateCellsBatch, clearModeContentBatch, gameState]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedCells.size === 0) return;
      
      // Undo/Redo shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      // Arrow key navigation
      if (selectedCells.size === 1) {
          const [r, c] = [...selectedCells][0].split('-').map(Number);
          let newR = r, newC = c;
          
          if (e.key === 'ArrowUp') newR = Math.max(0, r - 1);
          else if (e.key === 'ArrowDown') newR = Math.min(8, r + 1);
          else if (e.key === 'ArrowLeft') newC = Math.max(0, c - 1);
          else if (e.key === 'ArrowRight') newC = Math.min(8, c + 1);
          
          if (newR !== r || newC !== c) {
              setSelectedCells(new Set([`${newR}-${newC}`]));
              return;
          }
      }

      if (e.key >= '1' && e.key <= '9') {
        handleNumberClick(parseInt(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCells, handleNumberClick, handleDelete, undo, redo]);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  if (loading || (shouldCreate && !gameState)) {
    return (
      <main className="container">
        <div className="glass-panel">
          <h2>Loading Game...</h2>
        </div>
      </main>
    );
  }

  // Show loading state while checking local data or loading game
  if (!isLocalDataLoaded || loading || (shouldCreate && !gameState)) {
    return (
      <main className="container">
        <div className="glass-panel">
          <h2>Loading Game...</h2>
        </div>
      </main>
    );
  }

  if (!gameState) {
    return (
      <main className="container">
        <div className="glass-panel">
          <h2>Game not found</h2>
          <p>Could not load the game. Please try creating a new one.</p>
          <button className="btn" onClick={() => router.push('/')}>Go Home</button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: '1rem', width: '100%', maxWidth: '100%' }}>
      <Header 
        difficulty={difficulty}
        onDifficultyChange={handleDifficultyChange}
        users={users}
        currentUser={currentUser}
        onUpdateName={updateUserName}
        isMultiplayerEnabled={isMultiplayerEnabled}
        onToggleMultiplayer={() => setIsMultiplayerEnabled(true)}
        isConnected={isConnected}
      />

      <div style={{ 
        display: 'flex', 
        flexDirection: 'row', /* Default to row for desktop */
        flexWrap: 'wrap', /* Wrap on smaller screens */
        alignItems: 'flex-start', 
        justifyContent: 'center',
        width: '100%', 
        gap: '2rem' 
      }}>
        {/* Board Container */}
        <div style={{ flex: '2 1 25rem', maxWidth: '40.625rem' }}>
          <Board 
            gameState={gameState} 
            onMouseDown={handleMouseDown}
            onMouseEnter={handleMouseEnter}
            selectedCells={selectedCells}
            cages={gameState.cages}
          />
        </div>

        {/* Controls Container */}
        <div style={{ flex: '0 1 auto', maxWidth: '100%' }}>
          <Controls 
            onNumberClick={handleNumberClick} 
            onDelete={handleDelete} 
            onShare={handleShare}
            inputMode={inputMode}
            onModeChange={setInputMode}
            isMultiSelectActive={isMultiSelectActive}
            onMultiSelectToggle={() => setIsMultiSelectActive(prev => !prev)}
            onShowRules={() => setShowRules(true)}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            isMultiplayerEnabled={isMultiplayerEnabled}
            onToggleMultiplayer={() => setIsMultiplayerEnabled(true)}
            isConnected={isConnected}
          />
          
          {/* Rules Modal */}
          {showRules && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              backdropFilter: 'blur(0.25rem)'
            }} onClick={() => setShowRules(false)}>
              <div 
                className="glass-panel" 
                style={{ 
                  maxWidth: '25rem', 
                  width: '90%', 
                  padding: '2rem',
                  position: 'relative'
                }}
                onClick={e => e.stopPropagation()}
              >
                <button 
                  onClick={() => setShowRules(false)}
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: 'var(--foreground)'
                  }}
                >
                  ×
                </button>
                <h3 style={{ marginBottom: '1rem' }}>How to Play</h3>
                <ul style={{ fontSize: '0.9rem', color: 'var(--cage-text)', paddingLeft: '1.2rem', lineHeight: '1.6' }}>
                    <li>Fill the grid with numbers 1-9.</li>
                    <li>Normal Sudoku rules apply.</li>
                    <li>Numbers in cages (dashed lines) must sum to the small number.</li>
                    <li>Numbers cannot repeat within a cage.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
