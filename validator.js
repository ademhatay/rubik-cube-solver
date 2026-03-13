// validator.js — 2x2x2 Küp State Doğrulama

function validateState(state) {
  const errors = [];

  // 1. Her renkten tam 4 adet olmalı
  const colorCount = {};
  for (const face of ['U', 'D', 'F', 'B', 'L', 'R']) {
    for (const c of state[face]) {
      colorCount[c] = (colorCount[c] || 0) + 1;
    }
  }

  const validColors = ['w', 'y', 'g', 'b', 'o', 'r'];
  for (const c of validColors) {
    const count = colorCount[c] || 0;
    if (count !== 4) {
      const colorNames = { w: 'Beyaz', y: 'Sarı', g: 'Yeşil', b: 'Mavi', o: 'Turuncu', r: 'Kırmızı' };
      errors.push(`${colorNames[c]}: ${count} adet (4 olmalı)`);
    }
  }

  // Toplam sticker sayısı
  const total = Object.values(colorCount).reduce((a, b) => a + b, 0);
  if (total !== 24) {
    errors.push(`Toplam sticker sayısı ${total} (24 olmalı)`);
  }

  // Bilinmeyen renk var mı
  for (const c of Object.keys(colorCount)) {
    if (!validColors.includes(c)) {
      errors.push(`Bilinmeyen renk: ${c}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // 2. Corner kontrolü — 8 corner'ın geçerli olup olmadığını kontrol et
  const corners = getCorners(state);
  const cornerCheck = validateCorners(corners);
  if (!cornerCheck.valid) {
    return cornerCheck;
  }

  return { valid: true, errors: [] };
}

// 8 corner'ı state'ten çıkar
// Her corner 3 renkten oluşur (U/D yüzü, F/B yüzü, L/R yüzü sırasıyla)
function getCorners(state) {
  return [
    // Üst katman (U yüzüne bakan taraftan)
    // UFL: U[2], F[0], L[1]
    [state.U[2], state.F[0], state.L[1]],
    // UFR: U[3], R[0], F[1]
    [state.U[3], state.R[0], state.F[1]],
    // UBR: U[1], B[0], R[1]
    [state.U[1], state.B[0], state.R[1]],
    // UBL: U[0], L[0], B[1]
    [state.U[0], state.L[0], state.B[1]],
    // Alt katman
    // DFL: D[0], L[3], F[2]
    [state.D[0], state.L[3], state.F[2]],
    // DFR: D[1], F[3], R[2]
    [state.D[1], state.F[3], state.R[2]],
    // DBR: D[3], R[3], B[2]
    [state.D[3], state.R[3], state.B[2]],
    // DBL: D[2], B[3], L[2]
    [state.D[2], state.B[3], state.L[2]],
  ];
}

function validateCorners(corners) {
  // Geçerli corner parçaları (çözülmüş küpten)
  const validCornerSets = [
    ['w', 'g', 'o'], // UFL
    ['w', 'r', 'g'], // UFR
    ['w', 'b', 'r'], // UBR
    ['w', 'o', 'b'], // UBL
    ['y', 'o', 'g'], // DFL
    ['y', 'g', 'r'], // DFR
    ['y', 'r', 'b'], // DBR
    ['y', 'b', 'o'], // DBL
  ];

  const usedCorners = new Set();

  for (let i = 0; i < 8; i++) {
    const corner = corners[i];
    const sorted = [...corner].sort().join('');

    let found = false;
    for (let j = 0; j < validCornerSets.length; j++) {
      const validSorted = [...validCornerSets[j]].sort().join('');
      if (sorted === validSorted) {
        if (usedCorners.has(j)) {
          return {
            valid: false,
            errors: [`Aynı köşe parçası birden fazla kez kullanılmış: ${corner.join(',')}`]
          };
        }
        usedCorners.add(j);
        found = true;
        break;
      }
    }

    if (!found) {
      return {
        valid: false,
        errors: [`Geçersiz köşe kombinasyonu: ${corner.join(',')}`]
      };
    }
  }

  // Corner orientation kontrolü
  // Her corner'ın orientation değeri 0, 1 veya 2 olabilir
  // Toplam orientation mod 3 === 0 olmalı
  let totalOrientation = 0;
  for (let i = 0; i < 8; i++) {
    const corner = corners[i];
    // U/D rengi hangi pozisyonda?
    if (corner[0] === 'w' || corner[0] === 'y') {
      totalOrientation += 0;
    } else if (corner[1] === 'w' || corner[1] === 'y') {
      totalOrientation += 1;
    } else {
      totalOrientation += 2;
    }
  }

  if (totalOrientation % 3 !== 0) {
    return {
      valid: false,
      errors: ['Köşe yönelimleri geçersiz — fiziksel olarak imkansız bir durum']
    };
  }

  return { valid: true, errors: [] };
}
