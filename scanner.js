// scanner.js — Kamera ile Rubik Küp yüz tarama

let scannerActive = false;
let videoStream = null;
let scanFace = 'F';
let animFrameId = null;
let usingFrontCamera = false;

const COLOR_REFS = [
  { name: 'w', rgb: [255, 255, 255] },
  { name: 'y', rgb: [255, 213, 0] },
  { name: 'g', rgb: [0, 166, 81] },
  { name: 'b', rgb: [0, 81, 186] },
  { name: 'o', rgb: [255, 111, 0] },
  { name: 'r', rgb: [232, 19, 42] },
];

function colorDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr * 2 + dg * dg * 4 + db * db * 3);
}

function detectColor(r, g, b) {
  let best = null;
  let bestDist = Infinity;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2 / 255;
  const s = max === min ? 0 : (max - min) / (l > 0.5 ? (510 - max - min) : (max + min));

  if (l > 0.75 && s < 0.3) return 'w';

  for (const ref of COLOR_REFS) {
    const d = colorDistance(r, g, b, ref.rgb[0], ref.rgb[1], ref.rgb[2]);
    if (d < bestDist) {
      bestDist = d;
      best = ref.name;
    }
  }
  return best;
}

function sampleRegion(imageData, cx, cy, radius) {
  const w = imageData.width;
  let totalR = 0, totalG = 0, totalB = 0, count = 0;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) continue;
      const idx = (y * w + x) * 4;
      totalR += imageData.data[idx];
      totalG += imageData.data[idx + 1];
      totalB += imageData.data[idx + 2];
      count++;
    }
  }

  return {
    r: Math.round(totalR / count),
    g: Math.round(totalG / count),
    b: Math.round(totalB / count),
  };
}

async function startScanner() {
  const video = document.getElementById('scanner-video');
  const panel = document.getElementById('scanner-panel');

  panel.style.display = 'block';

  // Önce arka kamerayı dene
  try {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    usingFrontCamera = false;
  } catch (e) {
    // Arka kamera yoksa ön kamerayı dene
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      usingFrontCamera = true;
    } catch (err) {
      showMessage('Kamera erişimi reddedildi: ' + err.message, 'error');
      panel.style.display = 'none';
      return;
    }
  }

  video.srcObject = videoStream;
  await video.play();
  scannerActive = true;
  drawOverlay();
}

function stopScanner() {
  scannerActive = false;
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  if (videoStream) {
    videoStream.getTracks().forEach(t => t.stop());
    videoStream = null;
  }
  const video = document.getElementById('scanner-video');
  video.srcObject = null;
  document.getElementById('scanner-panel').style.display = 'none';
}

const COLOR_MAP = { w: '#fff', y: '#ffd500', g: '#00a651', b: '#0051ba', o: '#ff6f00', r: '#e8132a' };

function drawOverlay() {
  if (!scannerActive) return;

  const video = document.getElementById('scanner-video');
  const canvas = document.getElementById('scanner-overlay');
  const ctx = canvas.getContext('2d');
  const preview = document.getElementById('scan-preview');
  const previewCtx = preview.getContext('2d');

  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  canvas.width = vw;
  canvas.height = vh;

  // Ön kamerada yatay aynalama düzelt
  ctx.save();
  if (usingFrontCamera) {
    ctx.translate(vw, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, vw, vh);
  ctx.restore();

  // Kılavuz çerçeve — ekranın %60'ı
  const size = Math.min(vw, vh) * 0.6;
  const x0 = (vw - size) / 2;
  const y0 = (vh - size) / 2;
  const cellSize = size / 2;

  // Karartma
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, vw, y0);
  ctx.fillRect(0, y0 + size, vw, vh - y0 - size);
  ctx.fillRect(0, y0, x0, size);
  ctx.fillRect(x0 + size, y0, vw - x0 - size, size);

  // Dış çerçeve
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.strokeRect(x0, y0, size, size);

  // İç grid çizgileri (noktalı)
  ctx.setLineDash([8, 6]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.moveTo(x0 + cellSize, y0);
  ctx.lineTo(x0 + cellSize, y0 + size);
  ctx.moveTo(x0, y0 + cellSize);
  ctx.lineTo(x0 + size, y0 + cellSize);
  ctx.stroke();
  ctx.setLineDash([]);

  // Renk örnekleme
  const imageData = ctx.getImageData(0, 0, vw, vh);
  const sampleRadius = Math.floor(cellSize * 0.18);
  const detectedColors = [];

  preview.width = 80;
  preview.height = 80;

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const cx = Math.floor(x0 + col * cellSize + cellSize / 2);
      const cy = Math.floor(y0 + row * cellSize + cellSize / 2);

      const sample = sampleRegion(imageData, cx, cy, sampleRadius);
      const color = detectColor(sample.r, sample.g, sample.b);
      detectedColors.push(color);

      // Örnekleme bölgesini göster (yuvarlak köşeli kare)
      const boxSize = sampleRadius * 2 + 8;
      ctx.fillStyle = COLOR_MAP[color];
      ctx.beginPath();
      ctx.roundRect(cx - boxSize / 2, cy - boxSize / 2, boxSize, boxSize, 6);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Renk harfi
      ctx.fillStyle = color === 'w' || color === 'y' ? '#000' : '#fff';
      ctx.font = `bold ${Math.floor(boxSize * 0.5)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(color.toUpperCase(), cx, cy);

      // Önizleme
      previewCtx.fillStyle = COLOR_MAP[color];
      previewCtx.fillRect(col * 40, row * 40, 38, 38);
      previewCtx.strokeStyle = '#222';
      previewCtx.lineWidth = 1;
      previewCtx.strokeRect(col * 40, row * 40, 38, 38);
    }
  }

  canvas.dataset.detected = JSON.stringify(detectedColors);

  // Yüz bilgisi ve yönlendirme talimatları
  const faceNames = { F: 'Ön', R: 'Sağ', B: 'Arka', L: 'Sol', U: 'Üst', D: 'Alt' };
  const faceInstructions = {
    F: 'Küpü doğrudan karşına tut',
    R: 'Küpü sola doğru 90° çevir →',
    B: 'Küpü 180° çevir (arkasını göster)',
    L: 'Küpü sağa doğru 90° çevir ←',
    U: 'Küpü öne eğ, üst yüzü göster ↓',
    D: 'Küpü arkaya eğ, alt yüzü göster ↑',
  };

  const fontSize = Math.max(14, Math.floor(size * 0.07));

  // Üst etiket arka planı
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  const labelH = fontSize * 3.2;
  ctx.beginPath();
  ctx.roundRect(x0, y0 - labelH - 8, size, labelH, 8);
  ctx.fill();

  // Yüz adı
  ctx.fillStyle = '#7c3aed';
  ctx.font = `bold ${fontSize * 1.2}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`${scanFace} — ${faceNames[scanFace]} Yüz`, x0 + size / 2, y0 - labelH - 2);

  // Yönlendirme
  ctx.fillStyle = '#fff';
  ctx.font = `${fontSize}px sans-serif`;
  ctx.fillText(faceInstructions[scanFace], x0 + size / 2, y0 - labelH + fontSize * 1.4);

  // Alt köşelere hücre numaraları (1-4)
  ctx.font = `bold ${Math.floor(cellSize * 0.15)}px sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const num = row * 2 + col + 1;
      ctx.fillText(num, x0 + col * cellSize + 6, y0 + row * cellSize + 4);
    }
  }

  animFrameId = requestAnimationFrame(drawOverlay);
}

function captureCurrentFace() {
  const canvas = document.getElementById('scanner-overlay');
  const detected = JSON.parse(canvas.dataset.detected || '[]');

  if (detected.length !== 4) {
    showMessage('Renk algılanamadı, tekrar deneyin.', 'error');
    return;
  }

  cubeState[scanFace] = [...detected];
  renderCube3D();
  renderCubeNet();
  clearSolution();

  // Tamamlanan yüz tab'ını işaretle
  const tab = document.querySelector(`.face-tab[data-face="${scanFace}"]`);
  if (tab) tab.classList.add('done');

  // Sonraki yüze geç
  const faceOrder = ['F', 'R', 'B', 'L', 'U', 'D'];
  const currentIdx = faceOrder.indexOf(scanFace);
  if (currentIdx < faceOrder.length - 1) {
    scanFace = faceOrder[currentIdx + 1];
    syncFaceTabs();
    const faceNames = { F: 'Ön', R: 'Sağ', B: 'Arka', L: 'Sol', U: 'Üst', D: 'Alt' };
    showMessage(`Kaydedildi! Şimdi ${scanFace} (${faceNames[scanFace]}) yüzünü gösterin.`, 'success');
  } else {
    showMessage('Tum yüzler tarandı! "Dogrula" ile kontrol edin.', 'success');
    stopScanner();
  }
}

function syncFaceTabs() {
  document.querySelectorAll('.face-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.face === scanFace);
  });
  const sel = document.getElementById('scan-face-select');
  if (sel) sel.value = scanFace;
}

function updateFaceSelector() {
  syncFaceTabs();
}

function setupScanner() {
  document.getElementById('btn-scan').addEventListener('click', () => {
    if (scannerActive) {
      stopScanner();
    } else {
      scanFace = 'F';
      // Tab done durumlarını sıfırla
      document.querySelectorAll('.face-tab').forEach(t => t.classList.remove('done'));
      syncFaceTabs();
      startScanner();
    }
  });

  document.getElementById('scan-face-select').addEventListener('change', (e) => {
    scanFace = e.target.value;
    syncFaceTabs();
  });

  // Yüz tab butonları
  document.querySelectorAll('.face-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      scanFace = tab.dataset.face;
      syncFaceTabs();
    });
  });

  document.getElementById('btn-capture').addEventListener('click', captureCurrentFace);
  document.getElementById('btn-scan-close').addEventListener('click', stopScanner);
}

document.addEventListener('DOMContentLoaded', setupScanner);
