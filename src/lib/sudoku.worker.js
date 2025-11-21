// Simple Sudoku Generator and Solver for Killer Sudoku
// Restored from sudokuGenerator.js

const BLANK = 0;

function isValid(board, row, col, num) {
  // Check row
  for (let x = 0; x < 9; x++) {
    if (board[row][x] === num) return false;
  }

  // Check col
  for (let x = 0; x < 9; x++) {
    if (board[x][col] === num) return false;
  }

  // Check 3x3 box
  const startRow = row - (row % 3);
  const startCol = col - (col % 3);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[i + startRow][j + startCol] === num) return false;
    }
  }

  return true;
}

function solveSudoku(board) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === BLANK) {
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
        for (let num of nums) {
          if (isValid(board, row, col, num)) {
            board[row][col] = num;
            if (solveSudoku(board)) return true;
            board[row][col] = BLANK;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function generateSudoku() {
  const board = Array.from({ length: 9 }, () => Array(9).fill(BLANK));
  solveSudoku(board);
  return board;
}

// Generate Cages for Killer Sudoku
function generateCages(solutionBoard, difficulty = 'Medium', options = {}) {
  const cages = [];
  const visited = Array.from({ length: 9 }, () => Array(9).fill(false));
  const { uncagedProbability = 0, minCageSize = 1 } = options;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (visited[r][c]) continue;

      // Uncaged probability check (for Expert mode)
      if (Math.random() < uncagedProbability) {
        visited[r][c] = true;
        continue;
      }

      // Determine target size
      // For Hard, we want minCageSize 2, so we pick from 2 to 4 (or 5)
      // For others, 1 to 4
      const maxCageSize = 4;
      const effectiveMin = minCageSize;
      const targetSize = Math.floor(Math.random() * (maxCageSize - effectiveMin + 1)) + effectiveMin;
      
      const cageCells = [{ r, c }];
      visited[r][c] = true;

      let currentR = r;
      let currentC = c;

      // Try to grow the cage
      for (let i = 1; i < targetSize; i++) {
        const neighbors = [
          { r: currentR - 1, c: currentC },
          { r: currentR + 1, c: currentC },
          { r: currentR, c: currentC - 1 },
          { r: currentR, c: currentC + 1 },
        ].filter(
          (n) =>
            n.r >= 0 &&
            n.r < 9 &&
            n.c >= 0 &&
            n.c < 9 &&
            !visited[n.r][n.c]
        );

        // Filter neighbors based on difficulty
        let validNeighbors = neighbors;
        
        if (difficulty === 'Medium') {
            // Prefer neighbors within the same 3x3 box
            const currentBoxRow = Math.floor(currentR / 3);
            const currentBoxCol = Math.floor(currentC / 3);
            
            const boxNeighbors = neighbors.filter(n => 
                Math.floor(n.r / 3) === currentBoxRow && 
                Math.floor(n.c / 3) === currentBoxCol
            );
            
            if (boxNeighbors.length > 0 && Math.random() < 0.9) {
                validNeighbors = boxNeighbors;
            }
        }

        if (validNeighbors.length > 0) {
          const next = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
          visited[next.r][next.c] = true;
          cageCells.push(next);
          currentR = next.r;
          currentC = next.c;
        } else {
          break;
        }
      }

      // Post-processing for Hard mode (minCageSize enforcement)
      if (cageCells.length < minCageSize) {
          // Find a neighbor that belongs to an existing cage
          const neighbors = [
              { r: cageCells[0].r - 1, c: cageCells[0].c },
              { r: cageCells[0].r + 1, c: cageCells[0].c },
              { r: cageCells[0].r, c: cageCells[0].c - 1 },
              { r: cageCells[0].r, c: cageCells[0].c + 1 },
          ].filter(n => n.r >= 0 && n.r < 9 && n.c >= 0 && n.c < 9);

          let merged = false;
          for (let n of neighbors) {
              const neighborCage = cages.find(cage => 
                  cage.cells.some(cell => cell.r === n.r && cell.c === n.c)
              );
              
              if (neighborCage) {
                  // Merge into this cage
                  neighborCage.cells.push(cageCells[0]);
                  neighborCage.sum += solutionBoard[cageCells[0].r][cageCells[0].c];
                  merged = true;
                  break;
              }
          }
          
          if (!merged) {
              const sum = cageCells.reduce((acc, cell) => acc + solutionBoard[cell.r][cell.c], 0);
              cages.push({ cells: cageCells, sum });
          }
      } else {
          const sum = cageCells.reduce((acc, cell) => acc + solutionBoard[cell.r][cell.c], 0);
          cages.push({ cells: cageCells, sum });
      }
    }
  }
  return cages;
}

// Solver to check for unique solution
function countSolutions(board, cages, givens, limit = 2) {
    let count = 0;
    const tempBoard = board.map(row => [...row]);

    // Optimization: Pre-compute cell -> cage mapping
    const cellToCageMap = new Map();
    cages.forEach(cage => {
        cage.cells.forEach(cell => {
            cellToCageMap.set(`${cell.r}-${cell.c}`, cage);
        });
    });

    // Helper to check if placement is valid
    function isValidPlacement(r, c, num) {
        // Standard Sudoku checks
        for (let i = 0; i < 9; i++) {
            if (tempBoard[r][i] === num) return false;
            if (tempBoard[i][c] === num) return false;
        }
        const startR = r - (r % 3);
        const startC = c - (c % 3);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (tempBoard[startR + i][startC + j] === num) return false;
            }
        }

        // Cage checks
        const cage = cellToCageMap.get(`${r}-${c}`);
        if (cage) {
            // Check duplicate in cage
            for (const cell of cage.cells) {
                if (tempBoard[cell.r][cell.c] === num) return false;
            }

            // Check sum constraint if cage is full
            let currentSum = num;
            let filledCount = 1;
            for (const cell of cage.cells) {
                const val = tempBoard[cell.r][cell.c];
                if (val !== 0) {
                    currentSum += val;
                    filledCount++;
                }
            }
            
            // Optimization: if current sum exceeds target, invalid
            if (currentSum > cage.sum) return false;

            // If cage is full, sum must match exactly
            if (filledCount === cage.cells.length) {
                if (currentSum !== cage.sum) return false;
            }
        }

        return true;
    }

    function solve(index) {
        if (count >= limit) return;

        if (index === 81) {
            count++;
            return;
        }

        const r = Math.floor(index / 9);
        const c = index % 9;

        // Skip givens
        if (tempBoard[r][c] !== 0) {
            solve(index + 1);
            return;
        }

        for (let num = 1; num <= 9; num++) {
            if (isValidPlacement(r, c, num)) {
                tempBoard[r][c] = num;
                solve(index + 1);
                if (count >= limit) return;
                tempBoard[r][c] = 0;
            }
        }
    }
    
    solve(0);
    return count;
}

self.onmessage = async function(e) {
    const { difficulty } = e.data;
    
    let attempts = 0;
    const maxAttempts = 50; // Increased retry limit

    try {
        while (attempts < maxAttempts) {
            attempts++;
            
            // Report progress
            self.postMessage({ 
                type: 'status', 
                message: `正在生成第 ${attempts} 次尝试...` 
            });

            // Yield to main thread (simulated in worker by just continuing, but good for message processing)
            // In worker, we don't strictly need to yield, but it helps if we want to receive 'abort' messages (not implemented here)
            
            const solution = generateSudoku();
            
            let uncagedProbability = 0;
            let minCageSize = 1;
            let givensCount = 0;

            if (difficulty === 'Easy') {
                givensCount = Math.floor(Math.random() * 6) + 4; // 4-9
                minCageSize = 1;
                uncagedProbability = 0;
            } else if (difficulty === 'Medium') {
                givensCount = 0;
                minCageSize = 1;
                uncagedProbability = 0;
            } else if (difficulty === 'Hard') {
                givensCount = 0;
                minCageSize = 2;
                uncagedProbability = 0;
            } else if (difficulty === 'Expert') {
                givensCount = Math.floor(Math.random() * 6); // 0-5
                
                if (givensCount > 0) {
                    uncagedProbability = 0.5 + (givensCount * 0.05); 
                } else {
                    uncagedProbability = 0.35;
                }
                minCageSize = 2; 
            }

            const cages = generateCages(solution, difficulty, { uncagedProbability, minCageSize });
            
            // Initialize board and givens
            const initialBoard = Array.from({ length: 9 }, () => Array(9).fill(0));
            const givens = new Set();

            if (givensCount > 0) {
                let candidateCells = [];
                
                if (difficulty === 'Expert') {
                    const cagedCells = new Set();
                    cages.forEach(cage => {
                        cage.cells.forEach(cell => cagedCells.add(`${cell.r}-${cell.c}`));
                    });

                    for(let r=0; r<9; r++) {
                        for(let c=0; c<9; c++) {
                            if (!cagedCells.has(`${r}-${c}`)) {
                                candidateCells.push({r, c});
                            }
                        }
                    }
                } else {
                    for(let r=0; r<9; r++) {
                        for(let c=0; c<9; c++) {
                            candidateCells.push({r, c});
                        }
                    }
                }

                candidateCells.sort(() => Math.random() - 0.5);
                const countToTake = Math.min(givensCount, candidateCells.length);
                
                for(let i=0; i<countToTake; i++) {
                    const {r, c} = candidateCells[i];
                    initialBoard[r][c] = solution[r][c];
                    givens.add(`${r}-${c}`);
                }
            }

            // Verify Uniqueness
            self.postMessage({ 
                type: 'status', 
                message: `正在验证唯一性 (尝试 ${attempts})...` 
            });

            const solutions = countSolutions(initialBoard, cages, givens);
            
            if (solutions === 1) {
                const notes = Array(9).fill(null).map(() => 
                    Array(9).fill(null).map(() => ({ center: [], corner: [], colors: [] }))
                );

                self.postMessage({
                    type: 'success',
                    puzzle: {
                        board: initialBoard,
                        solved: solution,
                        cages,
                        notes,
                        difficulty,
                        givens: Array.from(givens)
                    }
                });
                return;
            }
        }

        // If we reach here, we failed to generate a unique puzzle
        self.postMessage({ 
            type: 'error', 
            message: "Failed to generate unique puzzle within attempt limit." 
        });

    } catch (error) {
        self.postMessage({ 
            type: 'error', 
            message: error.message 
        });
    }
};
