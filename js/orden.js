/* Eazi Hanzi — Orden de trazos: consulta libre de cualquier caracter.
   Una cuadricula por caracter (Hanzi Writer). Al pasar el mouse por encima de
   una se anima solo ese caracter. El pinyin sale de pinyin-pro (libreria
   embebida por CDN, sin llamadas de red en cada busqueda). */
(function () {
  const MAX_CHARS = 12;

  let text = '';
  let chars = [];
  let writers = [];
  let state = 'idle';   // 'idle' | 'playing' | 'paused'
  let activeWriter = 0;
  let runToken = 0;     // invalida secuencias viejas al reiniciar o al pasar el mouse

  const $ = (id) => document.getElementById(id);
  const inputEl = $('od-input');
  const noteEl = $('od-note');
  const resultEl = $('od-result');
  const pinyinEl = $('od-pinyin');
  const boardsEl = $('od-boards');
  const playBtn = $('od-play');
  const speedRange = $('od-speed');

  /* ---------- Pinyin ---------- */

  /* Pinyin por caracter. Se calcula por tramos seguidos de caracteres chinos para
     que la libreria resuelva los caracteres con varias lecturas (银行 vs 行走). */
  function pinyinPerChar(input) {
    const out = [];
    const runs = input.match(/[㐀-䶿一-鿿豈-﫿]+/g) || [];
    runs.forEach((run) => {
      let list = [];
      try {
        list = window.pinyinPro ? pinyinPro.pinyin(run, { type: 'array', toneType: 'symbol' }) : [];
      } catch (e) {
        list = [];
      }
      [...run].forEach((_, i) => out.push(list[i] || ''));
    });
    return out;
  }

  function chipHTML(py) {
    return '<span class="tone-chip tone-chip--' + getToneFromPinyin(py) + '">' + py + '</span>';
  }

  /* ---------- Render ---------- */

  function parseInput(value) {
    const all = splitHanziChars(value);
    const ignoredNonChinese = [...value.trim()].some((ch) => !/\s/.test(ch) && splitHanziChars(ch).length === 0);
    return { list: all.slice(0, MAX_CHARS), truncated: all.length > MAX_CHARS, ignoredNonChinese };
  }

  function render() {
    runToken++;
    const { list, truncated, ignoredNonChinese } = parseInput(inputEl.value);

    const notes = [];
    if (ignoredNonChinese) notes.push('Solo se muestran los caracteres chinos.');
    if (truncated) notes.push('Máximo ' + MAX_CHARS + ' caracteres a la vez.');
    noteEl.hidden = notes.length === 0;
    noteEl.textContent = notes.join(' ');

    text = list.join('');
    chars = list;
    resultEl.hidden = chars.length === 0;
    boardsEl.innerHTML = '';
    writers = [];
    setState('idle');
    if (chars.length === 0) return;

    const py = pinyinPerChar(text);
    pinyinEl.innerHTML = py.filter(Boolean).map(chipHTML).join('');

    const size = window.innerWidth >= 768 ? 240 : 150;
    chars.forEach((ch, i) => {
      const cell = document.createElement('div');
      cell.className = 'od-cell';
      const board = document.createElement('div');
      board.className = 'tianzige';
      board.style.width = size + 'px';
      board.style.height = size + 'px';
      cell.appendChild(board);

      const label = document.createElement('div');
      label.className = 'od-cell__label';
      if (py[i]) label.innerHTML = chipHTML(py[i]);
      const strokes = document.createElement('span');
      strokes.className = 'od-cell__strokes';
      label.appendChild(strokes);
      cell.appendChild(label);
      boardsEl.appendChild(cell);

      const writer = HanziWriter.create(board, ch, {
        width: size,
        height: size,
        padding: Math.round(size * 0.06),
        showOutline: true,
        showCharacter: true,
        ...hanziSpeedOptions(speedRange.value),
        strokeColor: getComputedStyle(document.body).getPropertyValue('--color-primary').trim() || '#CE5A6C',
        outlineColor: 'rgba(212,163,89,0.45)',
        radicalColor: '#D4A359',
      });
      writers.push(writer);

      HanziWriter.loadCharacterData(ch)
        .then((data) => { strokes.textContent = data.strokes.length + (data.strokes.length === 1 ? ' trazo' : ' trazos'); })
        .catch(() => { strokes.textContent = 'sin datos'; });

      // al pasar el mouse (o tocar) se anima solo este caracter
      board.addEventListener('mouseenter', () => animateOne(i));
      board.addEventListener('click', () => animateOne(i));
    });
  }

  /* ---------- Animacion ---------- */

  function setState(next) {
    state = next;
    playBtn.innerHTML = next === 'playing' ? '&#10074;&#10074;' : '&#9654;';
  }

  function animateOne(i) {
    runToken++; // corta la secuencia general si estaba corriendo
    setState('idle');
    writers[i].animateCharacter();
  }

  function playSequence() {
    const token = ++runToken;
    let i = 0;
    function step() {
      if (token !== runToken) return;
      if (i >= writers.length) {
        setState('idle');
        activeWriter = 0;
        return;
      }
      activeWriter = i;
      const current = writers[i++];
      current.animateCharacter({ onComplete: () => step() });
    }
    step();
  }

  playBtn.addEventListener('click', () => {
    if (writers.length === 0) return;
    if (state === 'playing') {
      writers[activeWriter].pauseAnimation();
      setState('paused');
    } else if (state === 'paused') {
      writers[activeWriter].resumeAnimation();
      setState('playing');
    } else {
      setState('playing');
      playSequence();
    }
  });

  $('od-reset').addEventListener('click', render);
  $('od-audio').addEventListener('click', () => speakChinese(text));

  // "input" (no "change"): se aplica mientras se arrastra, sin soltar
  speedRange.addEventListener('input', () => {
    $('od-speed-value').textContent = Number(speedRange.value) + 'x';
    writers.forEach((w) => w.updateOptions(hanziSpeedOptions(speedRange.value)));
  });

  let debounce = null;
  inputEl.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(render, 250);
  });

  render();
})();
