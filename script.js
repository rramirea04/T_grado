/* ---------- Variables globales ---------- */
const panels = Array.from(document.querySelectorAll('.panel')); // todos los panels
const screensCount = panels.length; // número real de pantallas
let idx = 0;
const frame = document.querySelector('.frame');
const bar = document.getElementById('bar');
const startBtn = document.getElementById('startBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const helpBtn = document.getElementById('helpBtn');
const endGameBtn = document.getElementById('endGameBtn');
const exitInput = document.getElementById('exitInput');
const savedMessage = document.getElementById('savedMessage');
const presentBtn = document.getElementById('presentBtn');

let originalRefsHtml = null; // guardar HTML original de referencias para restaurar
let crawlTimeout = null;     // timeout que controla la restauración después de la animación

/* ---------- Util: obtener panel por índice ---------- */
function getPanel(i) {
  return document.getElementById('screen-' + i);
}

/* ---------- Mostrar pantalla segura ---------- */
function show(n) {
  // asegurar índice válido
  const target = Math.max(0, Math.min(n, screensCount - 1)); // clip usando screensCount
  // siempre quitamos refs-active al inicio (para evitar que se quede pegado)
  frame.classList.remove('refs-active');

  // ocultar todos los panels
  panels.forEach(p => {
    p.style.display = 'none';
  });

  // cancelar crawl si estaba corriendo
  cancelRestoreCrawl();

  // mostrar el panel solicitado
  const p = getPanel(target);
  if (!p) {
    console.warn('Panel no encontrado:', target);
    return;
  }
  p.style.display = 'flex';
  p.style.flexDirection = 'column';

  idx = target;

  // actualizar progress bar si existe
  if (bar) {
    const pct = ((idx + 1) / Math.max(screensCount, 1)) * 100;
    bar.style.width = pct + '%';
  }

  // foco en input en misión 8
  if (idx === 8 && exitInput) exitInput.focus();

  // habilitar/deshabilitar botones
  if (prevBtn) prevBtn.disabled = idx === 0;
  if (nextBtn) nextBtn.disabled = idx === (screensCount - 1);

  // si es la pantalla 10 (última) e índice coincide, iniciar crawl
  // detecta la id real de screen-10 (si existe)
  const lastIndex = screensCount - 1;
  if (idx === lastIndex && getPanel(lastIndex) && lastIndex === 10) {
    startCrawl();
  }
}

/* ---------- Navegación ---------- */
function goNext() { show(idx + 1); }
function goPrev() { show(idx - 1); }

/* ---------- Eventos UI ---------- */
startBtn?.addEventListener('click', () => goNext());
nextBtn?.addEventListener('click', () => goNext());
prevBtn?.addEventListener('click', () => goPrev());
helpBtn?.addEventListener('click', () => {
  alert("Navega con ← → o con los botones. En la pantalla de evaluación escribe una idea y presiona Enter.");
});
endGameBtn?.addEventListener('click', () => show(10));

/* ---------- Teclado ---------- */
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') { goNext(); }
  if (e.key === 'ArrowLeft')  { goPrev(); }
  if (e.key === 'Enter') {
    if (idx === 0) { goNext(); }
    else if (idx === 8 && exitInput && exitInput.value.trim() !== '') { saveExit(); goNext(); }
  }
});

/* ---------- Guardar idea ---------- */
function saveExit() {
  if (!exitInput || !savedMessage) return;
  const val = exitInput.value.trim();
  if (!val) return;
  savedMessage.textContent = 'Idea guardada: "' + val + '" — gracias.';
  exitInput.value = '';
}
exitInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    saveExit();
    setTimeout(() => goNext(), 320);
  }
});

/* ---------- CRAWL: iniciar y restaurar ---------- */
function startCrawl() {
  const screen10 = getPanel(10);
  if (!screen10) return;

  // si ya está en marcha, no reiniciar
  if (screen10.dataset.crawlStarted === '1') return;
  screen10.dataset.crawlStarted = '1';

  // capturar HTML original si no existe
  const refsContentEl = screen10.querySelector('#refsContent');
  originalRefsHtml = originalRefsHtml || (refsContentEl ? refsContentEl.outerHTML : screen10.innerHTML);

  // limpiar y crear crawlBox + crawlInner
  screen10.innerHTML = '';
  screen10.style.position = 'relative';
  screen10.style.overflow = 'hidden';

  const box = document.createElement('div');
  box.className = 'crawlBox';

  const inner = document.createElement('div');
  inner.className = 'crawlInner';
  // si teníamos refsContent, solo poner su innerHTML
  inner.innerHTML = refsContentEl ? refsContentEl.innerHTML : originalRefsHtml;

  box.appendChild(inner);
  screen10.appendChild(box);

  // ocultar aside/footer SOLO en screen-10
  setTimeout(() => {
    if (idx === 10) frame.classList.add('refs-active');
  }, 200);

  // Preparar restauración al terminar la animación
  // Debe coincidir con CSS: 220s -> 220000 ms
  const animDurationMs = 220000;
  // limpia cualquier timeout previo
  if (crawlTimeout) clearTimeout(crawlTimeout);
  crawlTimeout = setTimeout(() => restoreRefs(screen10), animDurationMs + 300);
}

/* cancelar restauración pendiente y limpiar crawl si sales antes */
function cancelRestoreCrawl() {
  if (crawlTimeout) {
    clearTimeout(crawlTimeout);
    crawlTimeout = null;
  }
  const screen10 = getPanel(10);
  if (!screen10) return;
  // si existe crawlBox, restaurar inmediatamente
  const box = screen10.querySelector('.crawlBox');
  if (box) {
    restoreRefs(screen10);
  }
}

/* restaura el contenido original de screen-10 y quita clase refs-active */
function restoreRefs(screen10) {
  if (!screen10) return;
  // vaciar y restaurar originalRefsHtml como #refsContent
  screen10.innerHTML = '';
  const restore = document.createElement('div');
  restore.id = 'refsContent';
  restore.style.maxWidth = '820px';
  restore.style.margin = '0 auto';
  restore.style.textAlign = 'left';
  restore.style.color = '#ffe86c';
  restore.innerHTML = (originalRefsHtml || '');
  screen10.appendChild(restore);

  // quitar refs-active para mostrar aside/footer
  frame.classList.remove('refs-active');

  // permitir re-ejecutar el crawl
  delete screen10.dataset.crawlStarted;

  if (crawlTimeout) {
    clearTimeout(crawlTimeout);
    crawlTimeout = null;
  }
}

/* ---------- Accesibilidad (anuncio) ---------- */
function announce(msg) {
  const t = document.createElement('div');
  t.style.position = 'absolute';
  t.style.left = '-9999px';
  t.setAttribute('aria-live', 'polite');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 800);
}
document.addEventListener('keydown', () => announce('Pantalla ' + (idx + 1)));

/* ---------- Inicializar en 0 ---------- */
show(0);

/* ---------- Pantalla completa (un solo openFullscreen) ---------- */
function openFullscreen() {
  const elem = document.documentElement;

  // ocultar botón al entrar en full screen
  if (presentBtn) presentBtn.style.display = "none";

  if (elem.requestFullscreen) elem.requestFullscreen();
  else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
  else if (elem.mozRequestFullScreen) elem.mozRequestFullScreen();
  else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
}

presentBtn?.addEventListener('click', openFullscreen);

/* Detectar salida del modo pantalla completa y mostrar botón */
function handleFsExit() {
  if (!document.fullscreenElement &&
      !document.webkitFullscreenElement &&
      !document.mozFullScreenElement &&
      !document.msFullscreenElement) {
    if (presentBtn) presentBtn.style.display = "block";
  }
}

document.addEventListener("fullscreenchange", handleFsExit);
document.addEventListener("webkitfullscreenchange", handleFsExit);
document.addEventListener("mozfullscreenchange", handleFsExit);
document.addEventListener("MSFullscreenChange", handleFsExit);
