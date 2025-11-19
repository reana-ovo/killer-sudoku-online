'use client';

import React from 'react';

export default function Board({ gameState, onCellClick, selectedCell, cages }) {
  if (!gameState) return <div className="glass-panel">Loading Board...</div>;

  const { board } = gameState;

  // Helper to get cage info for a cell
  const getCageInfo = (r, c) => {
    if (!cages) return null;
    return cages.find(cage => cage.cells.some(cell => cell.r === r && cell.c === c));
  };

  // Helper to determine cage borders
  const getCageBorders = (r, c, cage) => {
    if (!cage) return {};
    const isRightEdge = !cage.cells.some(cell => cell.r === r && cell.c === c + 1);
    const isBottomEdge = !cage.cells.some(cell => cell.r === r + 1 && cell.c === c);
    const isLeftEdge = !cage.cells.some(cell => cell.r === r && cell.c === c - 1);
    const isTopEdge = !cage.cells.some(cell => cell.r === r - 1 && cell.c === c);
    
    return {
        borderRight: isRightEdge ? '2px dashed var(--cage-border)' : 'none',
        borderBottom: isBottomEdge ? '2px dashed var(--cage-border)' : 'none',
        borderLeft: isLeftEdge ? '2px dashed var(--cage-border)' : 'none',
        borderTop: isTopEdge ? '2px dashed var(--cage-border)' : 'none',
    };
  };

  return (
    <div 
      className="glass-panel" 
      style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(9, minmax(0, 1fr))', 
        gap: '0', 
        padding: '0', 
        width: '100%',
        aspectRatio: '1',
        userSelect: 'none',
        border: '2px solid var(--foreground)' 
      }}
    >
      {board.map((row, r) =>
        row.map((cellValue, c) => {
          const cageInfo = getCageInfo(r, c);
          const cageStyle = getCageBorders(r, c, cageInfo);
          
          // Check if cell is selected
          const isSelected = selectedCell && selectedCell.r === r && selectedCell.c === c;

          // Grid borders (thicker every 3 cells)
          const borderRight = (c + 1) % 3 === 0 && c !== 8 ? '2px solid var(--foreground)' : '1.5px solid var(--grid-line)';
          const borderBottom = (r + 1) % 3 === 0 && r !== 8 ? '2px solid var(--foreground)' : '1.5px solid var(--grid-line)';

          // Show sum only in the top-left-most cell of the cage
          const showSum = cageInfo && cageInfo.cells[0].r === r && cageInfo.cells[0].c === c;

          const cellColor = gameState.notes && gameState.notes[r][c].color;
          const backgroundColor = cellColor || 'transparent';

          return (
            <div
              key={`${r}-${c}`}
              onClick={() => onCellClick(r, c)}
              style={{
                position: 'relative',
                borderRight: borderRight,
                borderBottom: borderBottom,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'clamp(1rem, 2.5vw, 2rem)', // Responsive font size
                fontWeight: 'bold',
                cursor: 'pointer',
                backgroundColor: backgroundColor,
                color: cellValue === 0 ? 'transparent' : '#3b82f6', // Answer: Blue
                overflow: 'hidden', // Prevent content from expanding cell
                aspectRatio: '1/1', // Enforce square aspect ratio
                transition: 'background-color 0.2s ease'
              }}
            >
              {/* Cage Border Layer - Inset to create margin and not overlap grid lines */}
              {cageInfo && (
                  <div style={{
                      position: 'absolute',
                      top: '4px',
                      left: '4px',
                      right: '4px',
                      bottom: '4px',
                      pointerEvents: 'none',
                      ...cageStyle
                  }} />
              )}

              {/* Selection Border Overlay - Higher z-index than cage sum */}
              {isSelected && (
                  <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      boxShadow: 'inset 0 0 0 3px var(--primary)',
                      zIndex: 3,
                      pointerEvents: 'none'
                  }} />
              )}

              {/* Cage Sum */}
              {showSum && (
                <div style={{
                  position: 'absolute',
                  top: '0px',
                  left: '8px',
                  fontSize: '0.7rem',
                  lineHeight: 1,
                  fontWeight: 'bold',
                  color: 'var(--cage-text)',
                  backgroundColor: backgroundColor === 'transparent' ? 'var(--background)' : backgroundColor,
                  padding: '0 2px',
                  zIndex: 2,
                  pointerEvents: 'none'
                }}>
                  {cageInfo.sum}
                </div>
              )}
              
              {/* Cell Value or Notes */}
              <span style={{ zIndex: 1, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {cellValue !== 0 ? (
                    cellValue
                ) : (
                    <>
                        {/* Center Notes */}
                        {gameState.notes && gameState.notes[r][c].center.length > 0 && (
                            <div style={{ 
                                fontSize: '0.8rem', 
                                lineHeight: 1, 
                                color: '#3b82f6', // Center: Blue
                                display: 'flex',
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                maxWidth: '100%'
                            }}>
                                {gameState.notes[r][c].center.join('')}
                            </div>
                        )}
                        
                        {/* Corner Notes */}
                        {gameState.notes && gameState.notes[r][c].corner.length > 0 && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gridTemplateRows: 'repeat(3, 1fr)',
                                pointerEvents: 'none',
                                padding: '6px' // Significantly increased padding
                            }}>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                                    <div key={n} style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        fontSize: '0.7rem', // Adjusted font size
                                        fontWeight: 'bold',
                                        color: '#a855f7', // Corner: Purple
                                        visibility: gameState.notes[r][c].corner.includes(n) ? 'visible' : 'hidden'
                                    }}>
                                        {n}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
