/* Eazi Hanzi — Escucha: dictado de frases.
   Flujo: frases (textarea) -> dictado (altavoz + 3 formas de responder) ->
   revision con errores resaltados -> resultados con opcion de repetir las falladas. */
(function () {
  /* ---------- Estado ---------- */
  let phrases = [];        // frases validas del textarea
  let queue = [];          // frases de la ronda actual (barajadas)
  let idx = 0;
  let results = [];        // { phrase, correct, errors }
  let mode = 'type';       // 'type' | 'draw' | 'paper'
  let composed = '';       // texto armado en modo teclado / dibujo
  let pinyinBuffer = '';
  let candidateSeq = 0;    // descarta respuestas viejas del IME
  let candidates = [];
  let drawBoard = null;
  let checked = false;
  let paperWrong = new Set();
  let imeTimer = null;

  /* ---------- Elementos ---------- */
  const $ = (id) => document.getElementById(id);
  const setupEl = $('ls-setup');
  const playEl = $('ls-play');
  const resultsEl = $('ls-results');

  const phrasesInput = $('ls-phrases');
  const countEl = $('ls-count');
  const noteEl = $('ls-note');
  const startBtn = $('ls-start');

  const progressEl = $('ls-progress');
  const speakerBtn = $('ls-speaker');
  const speakerHint = $('ls-speaker-hint');
  const answerEl = $('ls-answer');
  const composeEl = $('ls-compose');
  const composeText = $('ls-compose-text');
  const composeDel = $('ls-compose-del');
  const checkBtn = $('ls-check');

  const panes = { type: $('ls-pane-type'), draw: $('ls-pane-draw'), paper: $('ls-pane-paper') };
  const pinyinInput = $('ls-pinyin-input');
  const candidatesEl = $('ls-candidates');
  const drawBoardEl = $('ls-draw-board');
  const drawCandidatesEl = $('ls-draw-candidates');
  const recognizeBtn = $('ls-recognize');

  const reviewEl = $('ls-review');
  const reviewKicker = $('ls-review-kicker');
  const phraseEl = $('ls-phrase');
  const errorsEl = $('ls-errors');
  const paperInstruction = $('ls-paper-instruction');
  const nextBtn = $('ls-next');

  /* ---------- 1. Frases ---------- */

  function parsePhrases(text) {
    const seen = new Set();
    const valid = [];
    let ignored = 0;
    text.split(/\r?\n/).forEach((raw) => {
      const line = raw.trim();
      if (!line) return;
      if (splitHanziChars(line).length === 0) { ignored++; return; }
      if (seen.has(line)) return;
      seen.add(line);
      valid.push(line);
    });
    return { valid, ignored };
  }

  function onPhrasesChange() {
    const { valid, ignored } = parsePhrases(phrasesInput.value);
    phrases = valid;
    countEl.textContent = valid.length + (valid.length === 1 ? ' frase' : ' frases');
    startBtn.disabled = valid.length === 0;
    noteEl.hidden = ignored === 0;
    if (ignored > 0) {
      noteEl.textContent = ignored + (ignored === 1 ? ' línea se ignora' : ' líneas se ignoran') + ' porque no tiene caracteres chinos.';
    }
    writeJSON(STORAGE_KEYS.listeningDraft, phrasesInput.value);
  }

  phrasesInput.addEventListener('input', onPhrasesChange);
  phrasesInput.value = readJSON(STORAGE_KEYS.listeningDraft, '') || '';
  onPhrasesChange();

  /* ---------- Pantallas ---------- */

  function show(which) {
    setupEl.hidden = which !== 'setup';
    playEl.hidden = which !== 'play';
    resultsEl.hidden = which !== 'results';
  }

  function startRound(list) {
    // misma preferencia que Flashcards, Pinyin y Trazos (ehpy.randomOrder)
    queue = getRandomOrder() ? shuffleArray(list) : list.slice();
    idx = 0;
    results = [];
    show('play');
    loadPhrase();
  }

  initOrderSwitch($('ls-order-switch'));
  startBtn.addEventListener('click', () => startRound(phrases));

  $('ls-quit').addEventListener('click', () => {
    if (confirm('¿Salir del dictado? Se perderá el avance de esta ronda.')) show('setup');
  });
  $('ls-restart').addEventListener('click', () => show('setup'));
  $('ls-retry').addEventListener('click', () => {
    startRound(results.filter((r) => !r.correct).map((r) => r.phrase));
  });

  /* ---------- 2. Una frase ---------- */

  const currentPhrase = () => queue[idx];

  function loadPhrase() {
    checked = false;
    composed = '';
    pinyinBuffer = '';
    candidates = [];
    paperWrong = new Set();

    progressEl.textContent = 'Frase ' + (idx + 1) + ' / ' + queue.length;
    speakerHint.textContent = 'Toca el altavoz para escuchar la frase';
    speakerHint.hidden = false;
    answerEl.hidden = true;
    reviewEl.hidden = true;
    errorsEl.innerHTML = '';
    pinyinInput.value = '';
    renderCandidates(candidatesEl, [], '');
    renderCandidates(drawCandidatesEl, [], '');
    if (drawBoard) drawBoard.clear();
    renderComposed();
    setMode(mode);
  }

  function playPhrase() {
    speakChinese(currentPhrase());
    speakerBtn.classList.add('is-playing');
    setTimeout(() => speakerBtn.classList.remove('is-playing'), 1400);
  }

  speakerBtn.addEventListener('click', () => {
    if (checked) return;
    playPhrase();
    if (answerEl.hidden) {
      answerEl.hidden = false;
      speakerHint.textContent = 'Toca otra vez para repetirla';
      focusAnswer();
    }
  });

  $('ls-replay').addEventListener('click', playPhrase);

  function focusAnswer() {
    if (mode === 'type') pinyinInput.focus();
  }

  /* ---------- Modos de respuesta ---------- */

  function setMode(newMode) {
    mode = newMode;
    document.querySelectorAll('.ls-mode').forEach((b) => b.classList.toggle('is-active', b.dataset.mode === mode));
    Object.keys(panes).forEach((k) => (panes[k].hidden = k !== mode));
    composeEl.hidden = mode === 'paper';
    checkBtn.textContent = mode === 'paper' ? 'Mostrar la frase' : 'Comprobar';
    if (mode === 'draw') ensureDrawBoard();
    if (!answerEl.hidden) focusAnswer();
  }

  document.querySelectorAll('.ls-mode').forEach((b) => {
    b.addEventListener('click', () => { if (!checked) setMode(b.dataset.mode); });
  });

  function renderComposed() {
    composeText.textContent = composed;
    composeDel.disabled = composed.length === 0;
  }

  function appendComposed(text) {
    composed += text;
    renderComposed();
  }

  composeDel.addEventListener('click', () => {
    composed = [...composed].slice(0, -1).join('');
    renderComposed();
  });

  /* Lista de candidatos (compartida por teclado y dibujo) */
  function renderCandidates(host, list, emptyMsg, errorMsg) {
    host.innerHTML = '';
    if (errorMsg) {
      host.innerHTML = '<p class="ls-candidates__msg ls-candidates__msg--error"></p>';
      host.firstChild.textContent = errorMsg;
      return;
    }
    if (list.length === 0 && emptyMsg) {
      host.innerHTML = '<p class="ls-candidates__msg"></p>';
      host.firstChild.textContent = emptyMsg;
      return;
    }
    list.forEach((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ls-candidate';
      b.innerHTML = '<small>' + (i + 1) + '</small>';
      b.appendChild(document.createTextNode(c.text));
      b.addEventListener('click', () => c.onPick());
      host.appendChild(b);
    });
  }

  /* ---- Teclado con pinyin ---- */

  function pickPinyin(c) {
    appendComposed(c.text);
    pinyinBuffer = pinyinBuffer.trim().slice(c.consumed).trimStart();
    pinyinInput.value = pinyinBuffer;
    pinyinInput.focus();
    refreshPinyinCandidates();
  }

  async function refreshPinyinCandidates() {
    const query = pinyinBuffer.trim();
    const seq = ++candidateSeq;
    if (!query) {
      candidates = [];
      renderCandidates(candidatesEl, [], '');
      return;
    }
    const found = await fetchPinyinCandidates(query);
    if (seq !== candidateSeq) return; // llego tarde: ya se escribio otra cosa
    if (found === null) {
      candidates = [];
      renderCandidates(candidatesEl, [], '', 'No se pudo conectar con el servicio de pinyin. Revisa tu conexión.');
      return;
    }
    candidates = found.map((c) => ({ ...c, onPick: () => pickPinyin(c) }));
    renderCandidates(candidatesEl, candidates, 'Sin opciones para "' + query + '". Revisa el pinyin.');
  }

  pinyinInput.addEventListener('input', () => {
    if (pinyinInput.dataset.composing === '1') return;
    // si el sistema operativo ya escribio caracteres chinos, pasan directo a la respuesta
    const cjk = splitHanziChars(pinyinInput.value).join('');
    if (cjk) {
      appendComposed(cjk);
      pinyinInput.value = pinyinInput.value.replace(/[^\x00-\x7F]/g, '');
    }
    pinyinBuffer = pinyinInput.value;
    clearTimeout(imeTimer);
    imeTimer = setTimeout(refreshPinyinCandidates, 150);
  });
  pinyinInput.addEventListener('compositionstart', () => (pinyinInput.dataset.composing = '1'));
  pinyinInput.addEventListener('compositionend', () => {
    pinyinInput.dataset.composing = '0';
    pinyinInput.dispatchEvent(new Event('input'));
  });

  pinyinInput.addEventListener('keydown', (e) => {
    if (pinyinInput.dataset.composing === '1') return;
    if (/^[1-9]$/.test(e.key) && candidates[Number(e.key) - 1]) {
      e.preventDefault();
      candidates[Number(e.key) - 1].onPick();
    } else if ((e.key === ' ' || e.key === 'Enter') && pinyinBuffer.trim() && candidates[0]) {
      e.preventDefault();
      candidates[0].onPick();
    } else if (e.key === 'Enter' && !pinyinBuffer.trim()) {
      e.preventDefault();
      checkBtn.click();
    } else if (e.key === 'Backspace' && pinyinInput.value === '') {
      composed = [...composed].slice(0, -1).join('');
      renderComposed();
    }
  });

  /* ---- Dibujo ---- */

  function ensureDrawBoard() {
    if (drawBoard) return;
    const size = window.innerWidth >= 768 ? 300 : Math.min(280, window.innerWidth - 80);
    drawBoard = createFreehandBoard(drawBoardEl, size);
  }

  recognizeBtn.addEventListener('click', async () => {
    if (!drawBoard || !drawBoard.hasStrokes()) {
      renderCandidates(drawCandidatesEl, [], '', 'Dibuja un carácter antes de reconocerlo.');
      return;
    }
    recognizeBtn.disabled = true;
    renderCandidates(drawCandidatesEl, [], 'Reconociendo...');
    const found = await recognizeHandwriting(drawBoard.getStrokes(), drawBoard.size);
    recognizeBtn.disabled = false;
    if (found === null) {
      renderCandidates(drawCandidatesEl, [], '', 'No se pudo conectar con el reconocimiento. Intenta de nuevo.');
      return;
    }
    const list = found.slice(0, 6).map((text) => ({
      text,
      onPick: () => {
        appendComposed(text);
        drawBoard.clear();
        renderCandidates(drawCandidatesEl, [], '');
      },
    }));
    renderCandidates(drawCandidatesEl, list, 'No se reconoció. Borra y vuelve a dibujar.');
  });

  $('ls-draw-clear').addEventListener('click', () => {
    if (drawBoard) drawBoard.clear();
    renderCandidates(drawCandidatesEl, [], '');
  });

  /* ---------- Revision ---------- */

  /* Pinta la frase grande: cada caracter chino puede quedar ok / mal; la
     puntuacion se muestra sin comparar. En modo papel los caracteres son botones. */
  function renderPhrase(wrongSet, clickable) {
    phraseEl.innerHTML = '';
    let k = 0;
    [...currentPhrase()].forEach((ch) => {
      const isCjk = splitHanziChars(ch).length === 1;
      const el = document.createElement(isCjk && clickable ? 'button' : 'span');
      el.textContent = ch;
      el.className = 'ls-char';
      if (!isCjk) {
        el.classList.add('ls-char--punct');
      } else {
        const myIndex = k++;
        el.classList.add(wrongSet.has(myIndex) ? 'is-wrong' : 'is-ok');
        if (clickable) {
          el.type = 'button';
          el.addEventListener('click', () => {
            if (paperWrong.has(myIndex)) paperWrong.delete(myIndex);
            else paperWrong.add(myIndex);
            el.classList.toggle('is-wrong', paperWrong.has(myIndex));
            el.classList.toggle('is-ok', !paperWrong.has(myIndex));
            updatePaperKicker();
          });
        }
      }
      phraseEl.appendChild(el);
    });
  }

  function errorRow(err) {
    const row = document.createElement('div');
    row.className = 'ls-error';
    const tag = document.createElement('span');
    tag.className = 'ls-error__tag';
    row.appendChild(tag);
    const add = (label, text) => {
      const s = document.createElement('span');
      s.append(label + ' ');
      const b = document.createElement('b');
      b.textContent = '«' + text + '»';
      s.appendChild(b);
      row.appendChild(s);
    };
    if (err.got && err.expected) {
      tag.textContent = 'Error';
      add('Pusiste', err.got);
      add('Debía ser', err.expected);
    } else if (err.expected) {
      tag.textContent = 'Faltó';
      add('Te faltó', err.expected);
    } else {
      tag.textContent = 'Sobró';
      add('Te sobró', err.got);
    }
    return row;
  }

  function finishToReview() {
    answerEl.hidden = true;
    speakerHint.hidden = true;
    reviewEl.hidden = false;
    nextBtn.textContent = idx + 1 < queue.length ? 'Siguiente' : 'Ver resultados';
  }

  function updatePaperKicker() {
    const n = paperWrong.size;
    reviewKicker.className = 'ls-review__kicker ' + (n === 0 ? 'is-ok' : 'is-bad');
    reviewKicker.textContent = n === 0 ? 'Sin errores marcados' : n + (n === 1 ? ' error marcado' : ' errores marcados');
  }

  function checkAnswer() {
    if (checked) return;
    checked = true;
    errorsEl.innerHTML = '';

    if (mode === 'paper') {
      paperInstruction.hidden = false;
      renderPhrase(paperWrong, true);
      updatePaperKicker();
      finishToReview();
      return;
    }

    paperInstruction.hidden = true;
    const typed = composed;
    const cmp = compareDictation(currentPhrase(), typed);
    results.push({ phrase: currentPhrase(), correct: cmp.correct, errors: cmp.errors });

    renderPhrase(cmp.wrongTarget, false);
    reviewKicker.className = 'ls-review__kicker ' + (cmp.correct ? 'is-ok' : 'is-bad');
    reviewKicker.textContent = cmp.correct ? '¡Perfecto!' : 'Te equivocaste';

    if (cmp.correct) {
      const ok = document.createElement('p');
      ok.className = 'ls-error__ok';
      ok.textContent = 'Escribiste la frase sin errores.';
      errorsEl.appendChild(ok);
    } else {
      if (typed) {
        const mine = document.createElement('p');
        mine.className = 'text-muted';
        mine.style.margin = '0';
        mine.textContent = 'Tu respuesta: ' + typed;
        errorsEl.appendChild(mine);
      }
      cmp.errors.forEach((err) => errorsEl.appendChild(errorRow(err)));
    }
    finishToReview();
  }

  checkBtn.addEventListener('click', checkAnswer);

  nextBtn.addEventListener('click', () => {
    if (mode === 'paper' && !results.some((r) => r.phrase === currentPhrase() && r.round === idx)) {
      // en papel el resultado se guarda al avanzar, con lo que la usuaria marco
      results.push({ phrase: currentPhrase(), correct: paperWrong.size === 0, errors: [], round: idx });
    }
    idx++;
    if (idx >= queue.length) showResults();
    else loadPhrase();
  });

  /* ---------- 3. Resultados ---------- */

  function showResults() {
    const total = results.length;
    const good = results.filter((r) => r.correct).length;
    const pct = total ? Math.round((good / total) * 100) : 0;
    $('ls-score-value').textContent = pct + '%';
    $('ls-score-label').textContent = good + ' de ' + total + (total === 1 ? ' frase' : ' frases') + ' sin errores';

    const summary = $('ls-summary');
    summary.innerHTML = '';
    results.forEach((r) => {
      const item = document.createElement('div');
      item.className = 'ls-summary-item';
      const text = document.createElement('span');
      text.className = 'ls-summary-item__text';
      text.textContent = r.phrase;
      const tag = document.createElement('span');
      tag.className = 'ls-summary-item__tag ' + (r.correct ? 'ls-summary-item__tag--ok' : 'ls-summary-item__tag--fail');
      tag.textContent = r.correct ? 'Bien' : 'Repasar';
      item.append(text, createAudioButton(() => r.phrase), tag);
      summary.appendChild(item);
    });

    const failed = total - good;
    const retry = $('ls-retry');
    retry.hidden = failed === 0;
    retry.textContent = 'Intentar nuevamente con las que fallé (' + failed + ')';
    show('results');
  }
})();
