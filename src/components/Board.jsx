'use client';

import React from 'react';

export default function Board({ gameState, onMouseDown, onMouseEnter, selectedCells, cages }) {
  // Touch handling
  const handleTouchStart = (r, c, e) => {
    // Prevent default to stop scrolling/zooming while selecting
    if (e.cancelable) e.preventDefault();
    onMouseDown(r, c, { ctrlKey: false, metaKey: false, ...e }); // Pass mock event or real event if needed
  };

  const handleTouchMove = (e) => {
    if (e.cancelable) e.preventDefault();
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (element) {
      // Find the closest cell wrapper if we hit a child element
      const cell = element.closest('[data-cell="true"]');
      if (cell) {
        const r = parseInt(cell.dataset.r);
        const c = parseInt(cell.dataset.c);
        if (!isNaN(r) && !isNaN(c)) {
          onMouseEnter(r, c);
        }
      }
    }
  };

  if (!gameState) return <div className="glass-panel">Loading Board...</div>;

  const { board } = gameState;

  // Helper to get cage info for a cell
  const getCageInfo = (r, c) => {
    if (!cages) return null;
    return cages.find(cage => cage.cells.some(cell => cell.r === r && cell.c === c));
  };

  // Helper to check if a cell is in a specific set of cells (for connection logic)
  const isCellInSet = (r, c, cellSet) => {
    return cellSet.has(`${r}-${c}`);
  };

  // Helper to check if a cell is in a specific cage
  const isCellInCage = (r, c, cage) => {
    if (!cage) return false;
    return cage.cells.some(cell => cell.r === r && cell.c === c);
  };

  // Component to render smart borders
  const CellBorders = ({ r, c, type, color, isConnected }) => {
    // Check neighbors
    const top = isConnected(r - 1, c);
    const bottom = isConnected(r + 1, c);
    const left = isConnected(r, c - 1);
    const right = isConnected(r, c + 1);
    const topLeft = isConnected(r - 1, c - 1);
    const topRight = isConnected(r - 1, c + 1);
    const bottomLeft = isConnected(r + 1, c - 1);
    const bottomRight = isConnected(r + 1, c + 1);

    const borderStyle = type === 'cage' ? '0.125rem dashed' : '0.1875rem solid';
    // Radius for cages matches the inset, no radius for selection
    const radius = type === 'cage' ? '0.375rem' : '0';

    const style = {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: 'none',
      zIndex: type === 'cage' ? 2 : 3,
      // Borders
      borderTop: !top ? `${borderStyle} ${color}` : 'none',
      borderBottom: !bottom ? `${borderStyle} ${color}` : 'none',
      borderLeft: !left ? `${borderStyle} ${color}` : 'none',
      borderRight: !right ? `${borderStyle} ${color}` : 'none',
      // Corners (Outer) - Only round if BOTH sides are disconnected (true outer corner)
      borderTopLeftRadius: (!top && !left) ? radius : 0,
      borderTopRightRadius: (!top && !right) ? radius : 0,
      borderBottomLeftRadius: (!bottom && !left) ? radius : 0,
      borderBottomRightRadius: (!bottom && !right) ? radius : 0,
    };
    
    // Inset for cages
    // If connected, no inset on that side to allow borders to touch neighbors
    if (type === 'cage') {
        style.top = top ? '0' : '0.25rem';
        style.left = left ? '0' : '0.25rem';
        style.right = right ? '0' : '0.25rem';
        style.bottom = bottom ? '0' : '0.25rem';
    }

    // Inner Corner Helper (CSS-based)
    // Places a small square at the corner vertex to create a concave corner curve.
    const InnerCorner = ({ type: cornerType, borderType }) => {
        const borderWidth = borderType === 'cage' ? '0.125rem' : '0.1875rem';
        const borderStyle = borderType === 'cage' ? 'dashed' : 'solid';
        const borderColor = borderType === 'cage' ? color : 'var(--primary)';
        // For selection with no inset, we still want a small inner corner radius
        const cornerRadius = borderType === 'cage' ? '0.375rem' : '0.25rem';
        // Size should be radius minus HALF the border width (border is centered on edge)
        const size = borderType === 'cage' 
            ? '0.3125rem'  // 0.375rem radius - 0.0625rem (half of 0.125rem)
            : '0.15625rem'; // 0.25rem radius - 0.09375rem (half of 0.1875rem)
        
        const commonStyle = {
            position: 'absolute',
            width: size,
            height: size,
            boxSizing: 'border-box',
            zIndex: 10,
            pointerEvents: 'none',
        };

        let specificStyle = {};
        
        // Logic:
        // To create a concave (inward) curve, we position at the vertex but apply borders
        // on the OPPOSITE sides with radius on that opposite corner.
        // For "Top Left Inner" at (0,0): use borderBottom+borderRight with borderBottomRightRadius
        
        switch (cornerType) {
            case 'TL': // Top-Left Inner
                specificStyle = {
                    top: '0',
                    left: '0',
                    borderBottom: `${borderWidth} ${borderStyle} ${borderColor}`,
                    borderRight: `${borderWidth} ${borderStyle} ${borderColor}`,
                    borderBottomRightRadius: cornerRadius,
                };
                break;
            case 'TR': // Top-Right Inner
                specificStyle = {
                    top: '0',
                    right: '0',
                    borderBottom: `${borderWidth} ${borderStyle} ${borderColor}`,
                    borderLeft: `${borderWidth} ${borderStyle} ${borderColor}`,
                    borderBottomLeftRadius: cornerRadius,
                };
                break;
            case 'BR': // Bottom-Right Inner
                specificStyle = {
                    bottom: '0',
                    right: '0',
                    borderTop: `${borderWidth} ${borderStyle} ${borderColor}`,
                    borderLeft: `${borderWidth} ${borderStyle} ${borderColor}`,
                    borderTopLeftRadius: cornerRadius,
                };
                break;
            case 'BL': // Bottom-Left Inner
                specificStyle = {
                    bottom: '0',
                    left: '0',
                    borderTop: `${borderWidth} ${borderStyle} ${borderColor}`,
                    borderRight: `${borderWidth} ${borderStyle} ${borderColor}`,
                    borderTopRightRadius: cornerRadius,
                };
                break;
        }

        return <div style={{ ...commonStyle, ...specificStyle }} />;
    };

    return (
        <>
            <div style={style} />
            {/* Inner Corners - Rendered if orthogonal neighbors exist but diagonal is missing */}
            {(type === 'cage' || type === 'selection') && (
                <>
                    {/* Top Left Inner: Top & Left exist, TopLeft missing. */}
                    {top && left && !topLeft && <InnerCorner type="TL" borderType={type} />}
                    
                    {/* Top Right Inner: Top & Right exist, TopRight missing. */}
                    {top && right && !topRight && <InnerCorner type="TR" borderType={type} />}
                    
                    {/* Bottom Right Inner: Bottom & Right exist, BottomRight missing. */}
                    {bottom && right && !bottomRight && <InnerCorner type="BR" borderType={type} />}
                    
                    {/* Bottom Left Inner: Bottom & Left exist, BottomLeft missing. */}
                    {bottom && left && !bottomLeft && <InnerCorner type="BL" borderType={type} />}
                </>
            )}
        </>
    );
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
        border: '0.125rem solid var(--foreground)' 
      }}
    >
      {board.map((row, r) =>
        row.map((cellValue, c) => {
          const cageInfo = getCageInfo(r, c);
          
          // Check if cell is selected
          const isSelected = selectedCells.has(`${r}-${c}`);

          // Grid borders (thicker every 3 cells)
          const borderRight = (c + 1) % 3 === 0 && c !== 8 ? '0.125rem solid var(--foreground)' : '0.09375rem solid var(--grid-line)';
          const borderBottom = (r + 1) % 3 === 0 && r !== 8 ? '0.125rem solid var(--foreground)' : '0.09375rem solid var(--grid-line)';

          // Show sum only in the top-left-most cell of the cage
          const showSum = cageInfo && cageInfo.cells[0].r === r && cageInfo.cells[0].c === c;

          const cellColors = gameState.notes && gameState.notes[r][c].colors;
          
          // Sort colors to ensure consistent order
          const sortedColors = cellColors && cellColors.length > 0 
            ? [...cellColors].sort() 
            : cellColors;
          
          // Generate background style based on number of colors
          const getBackgroundStyle = () => {
            if (!sortedColors || sortedColors.length === 0) {
              return 'transparent';
            }
            
            if (sortedColors.length === 1) {
              // Single color: solid background
              return sortedColors[0];
            }
            
            if (sortedColors.length === 2) {
              // Two colors: diagonal split (slightly tilted)
              return `linear-gradient(120deg, ${sortedColors[0]} 0%, ${sortedColors[0]} 50%, ${sortedColors[1]} 50%, ${sortedColors[1]} 100%)`;
            }
            
            // Three or more colors: pie chart style
            const anglePerColor = 360 / sortedColors.length;
            const stops = sortedColors.map((color, index) => {
              const startAngle = index * anglePerColor;
              const endAngle = (index + 1) * anglePerColor;
              return `${color} ${startAngle}deg ${endAngle}deg`;
            });
            
            return `conic-gradient(${stops.join(', ')})`;
          };

          const backgroundColor = getBackgroundStyle();

          return (
            <div
              key={`${r}-${c}`}
              data-cell="true"
              data-r={r}
              data-c={c}
              onMouseDown={(e) => onMouseDown(r, c, e)}
              onMouseEnter={() => onMouseEnter(r, c)}
              onTouchStart={(e) => handleTouchStart(r, c, e)}
              onTouchMove={handleTouchMove}
              style={{
                position: 'relative',
                borderRight: borderRight,
                borderBottom: borderBottom,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem', // Scaled via root font size
                fontWeight: 'bold',
                cursor: 'pointer',
                background: backgroundColor, // Use 'background' instead of 'backgroundColor' to support gradients
                color: cellValue === 0 ? 'transparent' : '#3b82f6', // Answer: Blue
                // overflow: 'hidden', // REMOVED to allow inner corners to extend
                aspectRatio: '1/1', // Enforce square aspect ratio
                transition: 'background 0.2s ease'
              }}
            >
              {/* Cage Borders */}
              {cageInfo && (
                <CellBorders 
                    r={r} 
                    c={c} 
                    type="cage" 
                    color="var(--cage-border)" 
                    isConnected={(nr, nc) => isCellInCage(nr, nc, cageInfo)} 
                />
              )}

              {/* Selection Borders */}
              {isSelected && (
                <CellBorders 
                    r={r} 
                    c={c} 
                    type="selection" 
                    color="var(--primary)" 
                    isConnected={(nr, nc) => isCellInSet(nr, nc, selectedCells)} 
                />
              )}

              {/* Cage Sum */}
              {showSum && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '0.75rem',
                  fontSize: '0.7rem',
                  lineHeight: 1,
                  fontWeight: 'bold',
                  color: 'var(--cage-text)',
                  backgroundColor: cellColors && cellColors.length > 0 ? cellColors[0] : 'var(--background)',
                  padding: '0 0.125rem',
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
                                padding: '0.375rem' // Significantly increased padding
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
