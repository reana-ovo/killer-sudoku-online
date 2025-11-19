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
  
  const { gameState, loading, updateCell, updateNotes, clearNotes, clearModeContent, isOffline, setLocalGameState } = useGameState(roomId);
  const [selectedCell, setSelectedCell] = useState(null);
  const [inputMode, setInputMode] = useState('answer'); // 'answer', 'center', 'corner', 'color'

  // Generate game if needed (offline or explicit create)
  useEffect(() => {
      if (!loading && !gameState && (isOffline || shouldCreate)) {
          console.log("Generating new game locally...");
          const newGame = createNewGame();
          setLocalGameState(newGame);
      }
  }, [loading, gameState, isOffline, shouldCreate, setLocalGameState]);

  const handleCellClick = (r, c) => {
    setSelectedCell({ r, c });
  };

  const handleNumberClick = useCallback((num) => {
    if (!selectedCell) return;
    const { r, c } = selectedCell;

    if (inputMode === 'answer') {
        const currentValue = gameState.board[r][c];
        const newValue = currentValue === num ? 0 : num;
        updateCell(r, c, newValue);
    } else {
        // Notes mode
        if (gameState.board[r][c] !== 0) return; 
        updateNotes(r, c, inputMode, num);
    }
  }, [selectedCell, inputMode, gameState, updateCell, updateNotes]);

  const handleDelete = useCallback(() => {
    if (selectedCell) {
      const { r, c } = selectedCell;
      if (inputMode === 'answer') {
          updateCell(r, c, 0);
      } else {
          clearModeContent(r, c, inputMode);
      }
    }
  }, [selectedCell, inputMode, updateCell, clearModeContent]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedCell) return;
      
      const { r, c } = selectedCell;
      
      if (e.key >= '1' && e.key <= '9') {
        handleNumberClick(parseInt(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleDelete();
      } else if (e.key === 'ArrowUp') {
        setSelectedCell({ r: Math.max(0, r - 1), c });
      } else if (e.key === 'ArrowDown') {
        setSelectedCell({ r: Math.min(8, r + 1), c });
      } else if (e.key === 'ArrowLeft') {
        setSelectedCell({ r, c: Math.max(0, c - 1) });
      } else if (e.key === 'ArrowRight') {
        setSelectedCell({ r, c: Math.min(8, c + 1) });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, handleNumberClick, handleDelete]);

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
            onCellClick={handleCellClick} 
            selectedCell={selectedCell}
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
