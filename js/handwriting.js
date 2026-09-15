/* Eazi Hanzi — Dibujo libre + reconocimiento de escritura a mano.
   No hay backend propio: se usa el mismo servicio publico de reconocimiento de
   escritura de Google que usan herramientas como drawchinese.com. El usuario
   dibuja libremente (sin validar nada trazo por trazo) y recien al terminar se
   manda el dibujo a reconocer. */

const HANDWRITING_API_URL = 'https://inputtools.google.com/request?ime=handwriting&app=mobilesearch&cs=1&oe=UTF-8';

/* Crea un tablero de dibujo libre dentro de containerEl (reusa la cuadricula
   .tianzige ya definida para los tableros de Hanzi Writer).
   Devuelve { getStrokes, hasStrokes, clear, destroy, size }. */
function createFreehandBoard(containerEl, size) {
  containerEl.innerHTML = '';
  containerEl.classList.add('tianzige');
  containerEl.style.width = size + 'px';
  containerEl.style.height = size + 'px';

  const canvas = document.createElement('canvas');
  canvas.className = 'freehand-canvas';
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  containerEl.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.lineWidth = Math.max(3, Math.round(size * 0.03));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#3B7A57';

  let strokes = [];
  let current = null;
  let drawing = false;

  function pointFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  function start(e) {
    e.preventDefault();
    drawing = true;
    const p = pointFromEvent(e);
    current = { x: [p.x], y: [p.y] };
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    const p = pointFromEvent(e);
    current.x.push(p.x);
    current.y.push(p.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function end(e) {
    if (!drawing) return;
    if (e) e.preventDefault();
    drawing = false;
    if (current && current.x.length > 1) strokes.push(current);
    current = null;
  }

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  canvas.addEventListener('touchend', end);

  function clear() {
    strokes = [];
    current = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function destroy() {
    window.removeEventListener('mouseup', end);
  }

  /* Revela el caracter esperado sobre la cuadricula (ej. al saltar un ejercicio) */
  function showAnswer(ch) {
    if (!ch) return;
    ctx.save();
    ctx.fillStyle = 'rgba(30,27,24,0.35)';
    ctx.font = Math.round(size * 0.65) + 'px "Noto Serif", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, size / 2, size / 2);
    ctx.restore();
  }

  return {
    getStrokes: () => strokes,
    hasStrokes: () => strokes.length > 0,
    clear,
    showAnswer,
    destroy,
    size,
  };
}

/* Manda los trazos dibujados al reconocedor de escritura de Google y devuelve la
   lista de caracteres candidatos (el mas probable primero). Devuelve [] si no
   hubo coincidencias y null si fallo la conexion (para distinguir los dos casos). */
async function recognizeHandwriting(strokes, size) {
  if (!strokes || strokes.length === 0) return [];

  const body = {
    app_version: 0.4,
    api_level: '537.36',
    device: navigator.userAgent,
    input_type: 0,
    options: 'enable_pre_space',
    requests: [
      {
        writing_guide: { writing_area_width: size, writing_area_height: size },
        pre_context: '',
        max_num_results: 6,
        max_completions: 0,
        language: 'zh',
        ink: strokes.map((s) => [s.x, s.y]),
      },
    ],
  };

  try {
    const res = await fetch(HANDWRITING_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data[0] !== 'SUCCESS' || !data[1] || !data[1][0]) return [];
    return data[1][0][1] || [];
  } catch (err) {
    return null;
  }
}
