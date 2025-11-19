'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useGameState } from '@/lib/gameState';
import { createNewGame } from '@/lib/sudokuGenerator';
import Board from '@/components/Board';
import Controls from '@/components/Controls';

export default function GameRoom() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = params.roomId;
  const shouldCreate = searchParams.get('create') === 'true';
  
  const { gameState, loading, updateCell, updateCellsBatch, updateNotes, updateNotesBatch, clearNotes, clearModeContent, clearModeContentBatch, isOffline, setLocalGameState } = useGameState(roomId);
  const [selectedCells, setSelectedCells] = useState(new Set()); // Set of "r-c" strings
  const [inputMode, setInputMode] = useState('answer'); // 'answer', 'center', 'corner', 'color'
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState('add'); // 'add' or 'remove' - for Ctrl+drag behavior

  // Generate game if needed (offline or explicit create)
  useEffect(() => {
      if (!loading && !gameState && (isOffline || shouldCreate)) {
          console.log("Generating new game locally...");
          const newGame = createNewGame();
          setLocalGameState(newGame);
      }
  }, [loading, gameState, isOffline, shouldCreate, setLocalGameState]);

  const handleMouseDown = (r, c, e) => {
      const cellKey = `${r}-${c}`;
      
      if (e.ctrlKey || e.metaKey) {
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

    if (inputMode === 'answer') {
      // Check if ALL selected cells have this number
      let allHaveNumber = true;
      selectedCells.forEach(cellKey => {
        const [r, c] = cellKey.split('-').map(Number);
        if (gameState.board[r][c] !== num) {
          allHaveNumber = false;
        }
      });

      // If all have it, remove it. Otherwise, add it to all.
      const updates = [];
      selectedCells.forEach(cellKey => {
        const [r, c] = cellKey.split('-').map(Number);
        const newValue = allHaveNumber ? 0 : num;
        updates.push({ row: r, col: c, value: newValue });
      });
      updateCellsBatch(updates);
    } else {
      // For notes mode, check if ALL empty cells have this note
      const emptyCells = [];
      selectedCells.forEach(cellKey => {
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
      if (inputMode === 'answer') {
        // Batch clear for answer mode
        const updates = [];
        selectedCells.forEach(cellKey => {
          const [r, c] = cellKey.split('-').map(Number);
          updates.push({ row: r, col: c, value: 0 });
        });
        updateCellsBatch(updates);
      } else {
        // Batch clear for mode content
        const updates = [];
        selectedCells.forEach(cellKey => {
          const [r, c] = cellKey.split('-').map(Number);
          updates.push({ row: r, col: c, mode: inputMode });
        });
        clearModeContentBatch(updates);
      }
    }
  }, [selectedCells, inputMode, updateCellsBatch, clearModeContentBatch]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedCells.size === 0) return;
      
      // Arrow keys only work with single cell selection
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
  }, [selectedCells, handleNumberClick, handleDelete]);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  if (loading) {
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
    <main className="container" style={{ padding: '1rem' }}>
      <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
        <h1>Killer Sudoku</h1>
        <p style={{ marginBottom: '0.5rem' }}>Room: {roomId.slice(0, 8)}...</p>
        {isOffline && <span style={{ color: 'orange', fontSize: '0.8rem' }}>Offline Mode</span>}
      </div>

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
        <div style={{ flex: '2 1 400px', maxWidth: '650px' }}>
          <Board 
            gameState={gameState} 
            onMouseDown={handleMouseDown}
            onMouseEnter={handleMouseEnter}
            selectedCells={selectedCells}
            cages={gameState.cages}
          />
        </div>

        {/* Controls Container - Takes up less space */}
        <div style={{ flex: '1 1 300px', maxWidth: '400px' }}>
          <Controls 
            onNumberClick={handleNumberClick} 
            onDelete={handleDelete} 
            onShare={handleShare}
            inputMode={inputMode}
            onModeChange={setInputMode}
          />
          
          <div className="glass-panel" style={{ marginTop: '1rem', padding: '1rem' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>How to Play</h3>
            <ul style={{ fontSize: '0.9rem', color: 'var(--cage-text)', paddingLeft: '1.2rem' }}>
                <li>Fill the grid with numbers 1-9.</li>
                <li>Normal Sudoku rules apply.</li>
                <li>Numbers in cages (dashed lines) must sum to the small number.</li>
                <li>Numbers cannot repeat within a cage.</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
