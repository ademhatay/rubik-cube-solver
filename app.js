// app.js — Ana uygulama mantığı

let cubeState = createSolvedState();
let selectedColor = 'w';
let solution = null;
let solutionStep = 0;
let presolveState = null;

// DOM hazır olduğunda başlat
document.addEventListener('DOMContentLoaded', init);

function init() {
  renderCube3D();
  renderCubeNet();
  setupPalette();
  setupButtons();
  setupMoveButtons();
}

// ========== 3D Küp Render ==========
function renderCube3D() {
  const scene = document.getElementById('cube-scene');
  scene.innerHTML = '';

  for (const face of ['U', 'D', 'F', 'B', 'L', 'R']) {
    const faceDiv = document.createElement('div');
    faceDiv.className = `face face-${face}`;

    for (let i = 0; i < 4; i++) {
      const sticker = document.createElement('div');
      sticker.className = `sticker color-${cubeState[face][i]}`;
      sticker.dataset.face = face;
      sticker.dataset.index = i;
      sticker.addEventListener('click', onStickerClick);
      faceDiv.appendChild(sticker);
    }

    scene.appendChild(faceDiv);
  }
}

// ========== Net (Açılmış) Küp Render ==========
function renderCubeNet() {
  const netContainer = document.getElementById('cube-net');
  netContainer.innerHTML = '';

  for (const face of ['U', 'L', 'F', 'R', 'B', 'D']) {
    const faceDiv = document.createElement('div');
    faceDiv.className = `net-face net-face-${face}`;

    for (let i = 0; i < 4; i++) {
      const sticker = document.createElement('div');
      sticker.className = `net-sticker color-${cubeState[face][i]}`;
      sticker.dataset.face = face;
      sticker.dataset.index = i;
      sticker.title = `${face}[${i}]`;
      sticker.addEventListener('click', onStickerClick);
      faceDiv.appendChild(sticker);
    }

    netContainer.appendChild(faceDiv);
  }
}

// ========== Sticker Tıklama ==========
function onStickerClick(e) {
  const face = e.target.dataset.face;
  const index = parseInt(e.target.dataset.index);

  cubeState[face][index] = selectedColor;
  clearSolution();
  renderCube3D();
  renderCubeNet();
}

// ========== Renk Paleti ==========
function setupPalette() {
  const btns = document.querySelectorAll('.palette-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedColor = btn.dataset.color;
      btns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
  // İlk rengi seç
  document.querySelector(`.palette-btn[data-color="w"]`).classList.add('selected');
}

// ========== Butonlar ==========
function setupButtons() {
  document.getElementById('btn-reset').addEventListener('click', () => {
    cubeState = createSolvedState();
    clearSolution();
    renderCube3D();
    renderCubeNet();
    showMessage('Küp çözülmüş haline döndürüldü.', 'info');
  });

  document.getElementById('btn-scramble').addEventListener('click', () => {
    cubeState = createSolvedState();
    const moves = scramble(cubeState);
    clearSolution();
    renderCube3D();
    renderCubeNet();
    showMessage(`Karıştırıldı: ${moves.join(' ')}`, 'info');
  });

  document.getElementById('btn-validate').addEventListener('click', () => {
    const result = validateState(cubeState);
    if (result.valid) {
      showMessage('Küp durumu geçerli!', 'success');
    } else {
      showMessage('Hata: ' + result.errors.join(' | '), 'error');
    }
  });

  document.getElementById('btn-solve').addEventListener('click', () => {
    const result = validateState(cubeState);
    if (!result.valid) {
      showMessage('Önce küp durumunu düzeltin: ' + result.errors.join(' | '), 'error');
      return;
    }

    if (isSolved(cubeState)) {
      showMessage('Küp zaten çözülmüş!', 'success');
      return;
    }

    showMessage('Çözüm aranıyor...', 'info');

    // Solver'ı async çalıştır (UI bloklanmasın)
    setTimeout(() => {
      const sol = solve2x2(cubeState);
      if (sol === null) {
        showMessage('Çözüm bulunamadı! Küp durumunu kontrol edin.', 'error');
        return;
      }

      solution = sol;
      solutionStep = 0;
      presolveState = cloneState(cubeState);

      showMessage(`Çözüm bulundu! ${sol.length} hamle`, 'success');
      renderSolution();
      document.getElementById('btn-next').disabled = false;
      document.getElementById('btn-prev').disabled = true;
      document.getElementById('btn-play-all').disabled = false;
    }, 50);
  });

  document.getElementById('btn-next').addEventListener('click', nextStep);
  document.getElementById('btn-prev').addEventListener('click', prevStep);
  document.getElementById('btn-play-all').addEventListener('click', playAll);
}

// ========== Hamle Butonları ==========
function setupMoveButtons() {
  const container = document.getElementById('move-buttons');
  const moves = ['U', "U'", 'U2', 'D', "D'", 'D2', 'R', "R'", 'R2', 'L', "L'", 'L2', 'F', "F'", 'F2', 'B', "B'", 'B2'];

  for (const m of moves) {
    const btn = document.createElement('button');
    btn.className = 'move-btn';
    btn.textContent = m;
    btn.addEventListener('click', () => {
      applyMove(cubeState, m);
      clearSolution();
      renderCube3D();
      renderCubeNet();
    });
    container.appendChild(btn);
  }
}

// ========== Çözüm Gösterimi ==========
function renderSolution() {
  const panel = document.getElementById('solution-panel');
  const movesContainer = document.getElementById('solution-moves');
  movesContainer.innerHTML = '';

  if (!solution || solution.length === 0) {
    panel.style.display = 'none';
    return;
  }

  panel.style.display = 'block';

  for (let i = 0; i < solution.length; i++) {
    const badge = document.createElement('span');
    badge.className = 'move-badge';
    if (i < solutionStep) badge.classList.add('done');
    if (i === solutionStep) badge.classList.add('current');
    badge.textContent = solution[i];
    movesContainer.appendChild(badge);
  }

  document.getElementById('step-info').textContent =
    `Adım ${solutionStep} / ${solution.length}`;
}

function nextStep() {
  if (!solution || solutionStep >= solution.length) return;

  applyMove(cubeState, solution[solutionStep]);
  solutionStep++;

  renderCube3D();
  renderCubeNet();
  renderSolution();

  document.getElementById('btn-prev').disabled = false;
  if (solutionStep >= solution.length) {
    document.getElementById('btn-next').disabled = true;
    document.getElementById('btn-play-all').disabled = true;
    showMessage('Küp çözüldü!', 'success');
  }
}

function prevStep() {
  if (!solution || solutionStep <= 0) return;

  solutionStep--;
  // State'i baştan oluştur
  cubeState = cloneState(presolveState);
  for (let i = 0; i < solutionStep; i++) {
    applyMove(cubeState, solution[i]);
  }

  renderCube3D();
  renderCubeNet();
  renderSolution();

  document.getElementById('btn-next').disabled = false;
  document.getElementById('btn-play-all').disabled = false;
  if (solutionStep <= 0) {
    document.getElementById('btn-prev').disabled = true;
  }
}

async function playAll() {
  if (!solution) return;
  document.getElementById('btn-play-all').disabled = true;

  while (solutionStep < solution.length) {
    applyMove(cubeState, solution[solutionStep]);
    solutionStep++;
    renderCube3D();
    renderCubeNet();
    renderSolution();
    await sleep(500);
  }

  document.getElementById('btn-next').disabled = true;
  showMessage('Küp çözüldü!', 'success');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function clearSolution() {
  solution = null;
  solutionStep = 0;
  presolveState = null;
  document.getElementById('solution-panel').style.display = 'none';
  document.getElementById('btn-next').disabled = true;
  document.getElementById('btn-prev').disabled = true;
  document.getElementById('btn-play-all').disabled = true;
  hideMessage();
}

// ========== Mesaj Gösterimi ==========
function showMessage(text, type) {
  const msg = document.getElementById('message');
  msg.textContent = text;
  msg.className = `message show ${type}`;
}

function hideMessage() {
  const msg = document.getElementById('message');
  msg.className = 'message';
}

// ========== Küp Döndürme ==========
let isDragging = false;
let dragStartX, dragStartY;
let rotX = -25, rotY = -35;

function updateCubeRotation(animate) {
  const scene = document.getElementById('cube-scene');
  if (animate) {
    scene.style.transition = 'transform 0.4s ease';
  } else {
    scene.style.transition = 'none';
  }
  scene.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
}

// Preset açılara hızlı geçiş
const VIEW_PRESETS = {
  'front':       { x: 0,   y: 0 },
  'back':        { x: 0,   y: 180 },
  'top':         { x: -90, y: 0 },
  'bottom':      { x: 90,  y: 0 },
  'left':        { x: 0,   y: 90 },
  'right':       { x: 0,   y: -90 },
  'perspective': { x: -25, y: -35 },
};

function setView(name) {
  const preset = VIEW_PRESETS[name];
  rotX = preset.x;
  rotY = preset.y;
  updateCubeRotation(true);
  // Aktif butonu işaretle
  document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
  const active = document.querySelector(`.view-btn[data-view="${name}"]`);
  if (active) active.classList.add('active');
}

function setupRotationControls() {
  const wrapper = document.querySelector('.cube-wrapper');

  // Mouse drag
  wrapper.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('sticker')) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    wrapper.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    rotY += dx * 0.5;
    rotX -= dy * 0.5;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    updateCubeRotation(false);
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    wrapper.style.cursor = 'grab';
  });

  // Touch desteği
  wrapper.addEventListener('touchstart', (e) => {
    if (e.target.classList.contains('sticker')) return;
    isDragging = true;
    dragStartX = e.touches[0].clientX;
    dragStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - dragStartX;
    const dy = e.touches[0].clientY - dragStartY;
    rotY += dx * 0.5;
    rotX -= dy * 0.5;
    dragStartX = e.touches[0].clientX;
    dragStartY = e.touches[0].clientY;
    updateCubeRotation(false);
  }, { passive: true });

  document.addEventListener('touchend', () => {
    isDragging = false;
  });

  // Yön tuşları ile döndürme
  document.addEventListener('keydown', (e) => {
    // Input/textarea'daysa atla
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    let handled = true;
    switch (e.key) {
      case 'ArrowLeft':  rotY -= 15; break;
      case 'ArrowRight': rotY += 15; break;
      case 'ArrowUp':    rotX -= 15; break;
      case 'ArrowDown':  rotX += 15; break;
      default: handled = false;
    }
    if (handled) {
      e.preventDefault();
      updateCubeRotation(true);
    }
  });

  // Görünüm butonları
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });

  // 90° döndürme butonları
  document.getElementById('rot-left').addEventListener('click', () => {
    rotY -= 90;
    updateCubeRotation(true);
  });
  document.getElementById('rot-right').addEventListener('click', () => {
    rotY += 90;
    updateCubeRotation(true);
  });
  document.getElementById('rot-up').addEventListener('click', () => {
    rotX -= 90;
    updateCubeRotation(true);
  });
  document.getElementById('rot-down').addEventListener('click', () => {
    rotX += 90;
    updateCubeRotation(true);
  });

  document.getElementById('rot-reset').addEventListener('click', () => {
    setView('perspective');
  });
}

document.addEventListener('DOMContentLoaded', setupRotationControls);
