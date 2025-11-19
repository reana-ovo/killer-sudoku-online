// Simple Sudoku Generator and Solver for Killer Sudoku
// This is a basic implementation. For a production app, we might want a more optimized solver.

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

export function generateSudoku() {
  const board = Array.from({ length: 9 }, () => Array(9).fill(BLANK));
  solveSudoku(board);
  return board;
}

// Generate Cages for Killer Sudoku
// A simple approach: Randomly walk the grid and group adjacent cells.
export function generateCages(solutionBoard) {
  const cages = [];
  const visited = Array.from({ length: 9 }, () => Array(9).fill(false));

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (visited[r][c]) continue;

      const cageSize = Math.floor(Math.random() * 4) + 1; // Cage size 1-4
      const cageCells = [{ r, c }];
      visited[r][c] = true;

      let currentR = r;
      let currentC = c;

      for (let i = 1; i < cageSize; i++) {
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

        if (neighbors.length > 0) {
          const next = neighbors[Math.floor(Math.random() * neighbors.length)];
          visited[next.r][next.c] = true;
          cageCells.push(next);
          currentR = next.r;
          currentC = next.c;
        } else {
          break;
        }
      }

      const sum = cageCells.reduce((acc, cell) => acc + solutionBoard[cell.r][cell.c], 0);
      cages.push({ cells: cageCells, sum });
    }
  }
  return cages;
}

export function createNewGame() {
    const solution = generateSudoku();
    const cages = generateCages(solution);
    // Create an empty board for the player, but maybe pre-fill some if we want standard Sudoku rules too?
    // For Killer Sudoku, usually the board is empty, only cages are given.
    const initialBoard = Array.from({ length: 9 }, () => Array(9).fill(0));
    
    // Initialize notes (9x9 grid of { center: [], corner: [], colors: [] })
  const notes = Array(9).fill(null).map(() => 
    Array(9).fill(null).map(() => ({ center: [], corner: [], colors: [] }))
  );

  return {
    board: initialBoard,
    solved: solution,
    cages,
    notes
  };
}
