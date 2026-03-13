// solver.js — 2x2x2 Bidirectional BFS Solver
// Sadece U, R, F hamleleri yeterli (DBL köşe sabit tutulur)

function solve2x2(state) {
  if (isSolved(state)) return [];

  const moveNames = ['U', "U'", 'U2', 'R', "R'", 'R2', 'F', "F'", 'F2'];

  function reverseMove(m) {
    if (m.endsWith("'")) return m[0];
    if (m.endsWith('2')) return m;
    return m + "'";
  }

  // State'ten tüm 9 hamleyi uygulayıp sonuçları döndür
  function expand(stateStr) {
    const results = [];
    for (const move of moveNames) {
      const s = stateFromString(stateStr);
      applyMove(s, move);
      results.push({ key: stateToString(s), move });
    }
    return results;
  }

  const startKey = stateToString(state);
  const solvedKey = stateToString(createSolvedState());

  if (startKey === solvedKey) return [];

  // Her visited map: stateKey -> { parent: stateKey, move: string } veya null (kök)
  const forwardVisited = new Map();
  const backwardVisited = new Map();

  forwardVisited.set(startKey, null);
  backwardVisited.set(solvedKey, null);

  let forwardFrontier = [startKey];
  let backwardFrontier = [solvedKey];

  // Yolunu geri izle
  function tracePath(visited, key) {
    const moves = [];
    let current = key;
    while (visited.get(current) !== null) {
      const { parent, move } = visited.get(current);
      moves.push(move);
      current = parent;
    }
    moves.reverse();
    return moves;
  }

  for (let depth = 0; depth < 7; depth++) {
    // Forward genişlet
    const newForwardFrontier = [];
    for (const stateKey of forwardFrontier) {
      for (const { key, move } of expand(stateKey)) {
        if (!forwardVisited.has(key)) {
          forwardVisited.set(key, { parent: stateKey, move });
          newForwardFrontier.push(key);

          if (backwardVisited.has(key)) {
            const fwd = tracePath(forwardVisited, key);
            const bwd = tracePath(backwardVisited, key);
            return [...fwd, ...bwd.reverse().map(reverseMove)];
          }
        }
      }
    }
    forwardFrontier = newForwardFrontier;

    // Backward genişlet
    const newBackwardFrontier = [];
    for (const stateKey of backwardFrontier) {
      for (const { key, move } of expand(stateKey)) {
        if (!backwardVisited.has(key)) {
          backwardVisited.set(key, { parent: stateKey, move });
          newBackwardFrontier.push(key);

          if (forwardVisited.has(key)) {
            const fwd = tracePath(forwardVisited, key);
            const bwd = tracePath(backwardVisited, key);
            return [...fwd, ...bwd.reverse().map(reverseMove)];
          }
        }
      }
    }
    backwardFrontier = newBackwardFrontier;
  }

  return null;
}

// stateToString'den geri dönüşüm
function stateFromString(str) {
  const parts = str.split('|');
  const faces = ['U', 'D', 'F', 'B', 'L', 'R'];
  const state = {};
  for (let i = 0; i < 6; i++) {
    state[faces[i]] = parts[i].split('');
  }
  return state;
}
