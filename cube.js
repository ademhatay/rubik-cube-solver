// cube.js — 2x2x2 Rubik Küp State & Move Engine

// Sticker indeksleri (her yüzde 4 sticker):
//   0 | 1
//   -----
//   2 | 3

function createSolvedState() {
  return {
    U: ['w', 'w', 'w', 'w'],
    D: ['y', 'y', 'y', 'y'],
    F: ['g', 'g', 'g', 'g'],
    B: ['b', 'b', 'b', 'b'],
    L: ['o', 'o', 'o', 'o'],
    R: ['r', 'r', 'r', 'r']
  };
}

function cloneState(state) {
  const s = {};
  for (const face of ['U', 'D', 'F', 'B', 'L', 'R']) {
    s[face] = [...state[face]];
  }
  return s;
}

// Yüzü saat yönünde 90° döndür
function rotateFaceCW(state, face) {
  const f = state[face];
  const temp = f[0];
  f[0] = f[2];
  f[2] = f[3];
  f[3] = f[1];
  f[1] = temp;
}

// Yüzü saat yönünün tersine 90° döndür
function rotateFaceCCW(state, face) {
  const f = state[face];
  const temp = f[0];
  f[0] = f[1];
  f[1] = f[3];
  f[3] = f[2];
  f[2] = temp;
}

// Cycle helper: a[ia] <- b[ib] <- c[ic] <- d[id] <- a[ia]
function cycle4(state, a, ia, b, ib, c, ic, d, id) {
  const temp = state[a][ia];
  state[a][ia] = state[d][id];
  state[d][id] = state[c][ic];
  state[c][ic] = state[b][ib];
  state[b][ib] = temp;
}

const MOVES = {
  'U': (s) => {
    rotateFaceCW(s, 'U');
    cycle4(s, 'F', 0, 'R', 0, 'B', 0, 'L', 0);
    cycle4(s, 'F', 1, 'R', 1, 'B', 1, 'L', 1);
  },
  "U'": (s) => {
    rotateFaceCCW(s, 'U');
    cycle4(s, 'F', 0, 'L', 0, 'B', 0, 'R', 0);
    cycle4(s, 'F', 1, 'L', 1, 'B', 1, 'R', 1);
  },
  'U2': (s) => { MOVES['U'](s); MOVES['U'](s); },

  'D': (s) => {
    rotateFaceCW(s, 'D');
    cycle4(s, 'F', 2, 'L', 2, 'B', 2, 'R', 2);
    cycle4(s, 'F', 3, 'L', 3, 'B', 3, 'R', 3);
  },
  "D'": (s) => {
    rotateFaceCCW(s, 'D');
    cycle4(s, 'F', 2, 'R', 2, 'B', 2, 'L', 2);
    cycle4(s, 'F', 3, 'R', 3, 'B', 3, 'L', 3);
  },
  'D2': (s) => { MOVES['D'](s); MOVES['D'](s); },

  'R': (s) => {
    rotateFaceCW(s, 'R');
    // F sağ sütun (1,3) -> U sağ sütun (1,3) -> B sol sütun (2,0) -> D sağ sütun (1,3)
    const t0 = s.U[1];
    const t1 = s.U[3];
    s.U[1] = s.F[1];
    s.U[3] = s.F[3];
    s.F[1] = s.D[1];
    s.F[3] = s.D[3];
    s.D[1] = s.B[2];
    s.D[3] = s.B[0];
    s.B[2] = t0;
    s.B[0] = t1;
  },
  "R'": (s) => {
    rotateFaceCCW(s, 'R');
    const t0 = s.U[1];
    const t1 = s.U[3];
    s.U[1] = s.B[2];
    s.U[3] = s.B[0];
    s.B[2] = s.D[1];
    s.B[0] = s.D[3];
    s.D[1] = s.F[1];
    s.D[3] = s.F[3];
    s.F[1] = t0;
    s.F[3] = t1;
  },
  'R2': (s) => { MOVES['R'](s); MOVES['R'](s); },

  'L': (s) => {
    rotateFaceCW(s, 'L');
    const t0 = s.U[0];
    const t1 = s.U[2];
    s.U[0] = s.B[3];
    s.U[2] = s.B[1];
    s.B[3] = s.D[0];
    s.B[1] = s.D[2];
    s.D[0] = s.F[0];
    s.D[2] = s.F[2];
    s.F[0] = t0;
    s.F[2] = t1;
  },
  "L'": (s) => {
    rotateFaceCCW(s, 'L');
    const t0 = s.U[0];
    const t1 = s.U[2];
    s.U[0] = s.F[0];
    s.U[2] = s.F[2];
    s.F[0] = s.D[0];
    s.F[2] = s.D[2];
    s.D[0] = s.B[3];
    s.D[2] = s.B[1];
    s.B[3] = t0;
    s.B[1] = t1;
  },
  'L2': (s) => { MOVES['L'](s); MOVES['L'](s); },

  'F': (s) => {
    rotateFaceCW(s, 'F');
    const t0 = s.U[2];
    const t1 = s.U[3];
    s.U[2] = s.L[3];
    s.U[3] = s.L[1];
    s.L[1] = s.D[0];
    s.L[3] = s.D[1];
    s.D[0] = s.R[2];
    s.D[1] = s.R[0];
    s.R[0] = t0;
    s.R[2] = t1;
  },
  "F'": (s) => {
    rotateFaceCCW(s, 'F');
    const t0 = s.U[2];
    const t1 = s.U[3];
    s.U[2] = s.R[0];
    s.U[3] = s.R[2];
    s.R[0] = s.D[1];
    s.R[2] = s.D[0];
    s.D[0] = s.L[1];
    s.D[1] = s.L[3];
    s.L[1] = t1;
    s.L[3] = t0;
  },
  'F2': (s) => { MOVES['F'](s); MOVES['F'](s); },

  'B': (s) => {
    rotateFaceCW(s, 'B');
    const t0 = s.U[0];
    const t1 = s.U[1];
    s.U[0] = s.R[1];
    s.U[1] = s.R[3];
    s.R[1] = s.D[3];
    s.R[3] = s.D[2];
    s.D[2] = s.L[0];
    s.D[3] = s.L[2];
    s.L[0] = t1;
    s.L[2] = t0;
  },
  "B'": (s) => {
    rotateFaceCCW(s, 'B');
    const t0 = s.U[0];
    const t1 = s.U[1];
    s.U[0] = s.L[2];
    s.U[1] = s.L[0];
    s.L[0] = s.D[3];
    s.L[2] = s.D[2];
    s.D[2] = s.R[3];
    s.D[3] = s.R[1];
    s.R[1] = t0;
    s.R[3] = t1;
  },
  'B2': (s) => { MOVES['B'](s); MOVES['B'](s); },
};

function applyMove(state, move) {
  MOVES[move](state);
}

function applyMoves(state, moves) {
  for (const m of moves) {
    applyMove(state, m);
  }
}

function isSolved(state) {
  for (const face of ['U', 'D', 'F', 'B', 'L', 'R']) {
    const c = state[face][0];
    if (state[face][1] !== c || state[face][2] !== c || state[face][3] !== c) {
      return false;
    }
  }
  return true;
}

function stateToString(state) {
  return ['U', 'D', 'F', 'B', 'L', 'R'].map(f => state[f].join('')).join('|');
}

// Rastgele karıştırma
function scramble(state, numMoves = 12) {
  const moveNames = ['U', "U'", 'U2', 'R', "R'", 'R2', 'F', "F'", 'F2'];
  const moves = [];
  for (let i = 0; i < numMoves; i++) {
    const m = moveNames[Math.floor(Math.random() * moveNames.length)];
    applyMove(state, m);
    moves.push(m);
  }
  return moves;
}
