(function () {
  const isReview = new URLSearchParams(window.location.search).get('review') === '1';

  let source = [];
  let order = [];
  let charIndex = 0;
  let listIndex = 0; // puesto donde iba en "En orden", para volver ahi al salir de Aleatorio
  let mode = 'watch'; // 'watch' | 'guided' (con ayuda: muestra el contorno) | 'free' (dibujo libre + reconocimiento)
  let writers = [];
  let freehandBoards = [];
  let isRecognizing = false;
  let isPlaying = false;
  let hasAnimated = false;
  let activeWriter = 0;

  const emptyStateEl = document.getElementById('tz-empty-state');
  const contentEl = document.getElementById('tz-content');
  const titleEl = document.getElementById('tz-title');

  const boardsEl = document.getElementById('tz-boards');
  const hanziInfoEl = document.getElementById('tz-current-hanzi');
  const pinyinChipEl = document.getElementById('tz-pinyin-chip');
  const meaningEl = document.getElementById('tz-meaning');
  const positionEl = document.getElementById('tz-position');
  const masteryPanelEl = document.getElementById('tz-mastery-panel');
  const navHintEl = document.getElementById('tz-nav-hint');
  const prevBtn = document.getElementById('tz-prev');
  const nextBtn = document.getElementById('tz-next');

  const modeWatchBtn = document.getElementById('tz-mode-watch');
  const modeGuidedBtn = document.getElementById('tz-mode-guided');
  const modeFreeBtn = document.getElementById('tz-mode-free');
  const quizFeedback = document.getElementById('tz-quiz-feedback');

  const playBtn = document.getElementById('tz-play');
  const resetBtn = document.getElementById('tz-reset');
  const audioBtn = document.getElementById('tz-audio');
  const speedWrap = document.getElementById('tz-speed');
  const speedRange = document.getElementById('tz-speed-range');
  const recognizeBtn = document.getElementById('tz-recognize');
  const recognizeHintEl = document.getElementById('tz-recognize-hint');

  function loadSource() {
    if (isReview) return getStrugglingCharsData();
    return getActiveList().filter((c) => c.resolved);
  }

  function buildOrder() {
    return getRandomOrder() ? shuffleArray(source) : source.slice();
  }

  function currentChar() {
    return order[charIndex];
  }

  function updateInfo() {
    const char = currentChar();
    hanziInfoEl.textContent = char.hanzi;
    const tone = getToneFromPinyin(char.pinyin);
    pinyinChipEl.className = 'tone-chip tone-chip--' + tone;
    pinyinChipEl.textContent = char.pinyin;
    meaningEl.textContent = char.meaning_es;
    positionEl.textContent = (charIndex + 1) + ' / ' + order.length;
    renderMasteryPanel(masteryPanelEl, {
      hanzi: char.hanzi,
      list: source,
      charEl: hanziInfoEl,
      onChange: updateNavLock,
    });
    updateNavLock();
  }

  /* No se puede avanzar sin marcar el nivel del caracter actual.
     Volver hacia atras no requiere marcar el actual, pero solo se puede ir a un
     caracter anterior que ya este categorizado (si no, se podria volver infinito). */
  function updateNavLock() {
    const locked = !isRated(currentChar().hanzi);
    nextBtn.disabled = locked;
    navHintEl.hidden = !locked;

    const prevIndex = (charIndex - 1 + order.length) % order.length;
    prevBtn.disabled = !isRated(order[prevIndex].hanzi);
    renderProgressPanel(); // los conteos de abajo cambian al marcar
  }

  function destroyFreehandBoards() {
    freehandBoards.forEach((b) => b.destroy());
    freehandBoards = [];
  }

  function buildBoards() {
    isPlaying = false;
    hasAnimated = false;
    activeWriter = 0;
    playBtn.innerHTML = '&#9654;';
    quizFeedback.hidden = true;
    recognizeBtn.hidden = mode !== 'free';
    recognizeHintEl.hidden = mode !== 'free';
    destroyFreehandBoards();

    if (mode === 'free') {
      buildFreehandBoards();
      return;
    }

    const result = createHanziBoards(boardsEl, currentChar().hanzi, {
      showOutline: true,
      speed: Number(speedRange.value),
    });
    writers = result.writers;

    if (writers.length === 0) {
      quizFeedback.hidden = false;
      quizFeedback.className = 'tz-quiz-feedback feedback-incorrect';
      quizFeedback.textContent = 'No hay caracteres chinos que dibujar en "' + currentChar().hanzi + '".';
      return;
    }

    if (mode === 'guided') startQuiz();
  }

  function startQuiz() {
    quizFeedback.hidden = true;
    quizBoards(writers, {
      onMistake: () => {
        quizFeedback.hidden = false;
        quizFeedback.className = 'tz-quiz-feedback feedback-incorrect';
        quizFeedback.textContent = 'Trazo incorrecto, intenta de nuevo.';
      },
      onCharComplete: (done, total) => {
        if (done < total) {
          quizFeedback.hidden = false;
          quizFeedback.className = 'tz-quiz-feedback feedback-correct';
          quizFeedback.textContent = 'Caracter ' + done + ' de ' + total + ' listo. ¡Sigue!';
        }
      },
      onAllComplete: () => {
        quizFeedback.hidden = false;
        quizFeedback.className = 'tz-quiz-feedback feedback-correct';
        quizFeedback.textContent = '¡Muy bien! Palabra completa.';
      },
    });
  }

  /* Modo "Dibujar sin ayuda": una cuadricula de dibujo libre por caracter, sin
     validar nada mientras se dibuja. Recien al tocar "Reconocer" se manda el
     trazo al reconocedor de escritura (ver js/handwriting.js). */
  function buildFreehandBoards() {
    writers = [];
    boardsEl.innerHTML = '';
    const chars = splitHanziChars(currentChar().hanzi);

    if (chars.length === 0) {
      quizFeedback.hidden = false;
      quizFeedback.className = 'tz-quiz-feedback feedback-incorrect';
      quizFeedback.textContent = 'No hay caracteres chinos que dibujar en "' + currentChar().hanzi + '".';
      return;
    }

    const size = boardSizeFor(chars.length, boardsEl.clientWidth);
    freehandBoards = chars.map(() => {
      const board = document.createElement('div');
      boardsEl.appendChild(board);
      return createFreehandBoard(board, size);
    });
  }

  async function recognizeCurrent() {
    if (mode !== 'free' || isRecognizing || freehandBoards.length === 0) return;

    const chars = splitHanziChars(currentChar().hanzi);
    if (!freehandBoards.some((b) => b.hasStrokes())) {
      quizFeedback.hidden = false;
      quizFeedback.className = 'tz-quiz-feedback feedback-incorrect';
      quizFeedback.textContent = 'Dibuja el caracter antes de reconocerlo.';
      return;
    }

    isRecognizing = true;
    recognizeBtn.disabled = true;
    quizFeedback.hidden = false;
    quizFeedback.className = 'tz-quiz-feedback';
    quizFeedback.textContent = 'Reconociendo...';

    const results = await Promise.all(
      freehandBoards.map((b) => recognizeHandwriting(b.getStrokes(), b.size))
    );

    isRecognizing = false;
    recognizeBtn.disabled = false;

    if (results.some((r) => r === null)) {
      quizFeedback.className = 'tz-quiz-feedback feedback-incorrect';
      quizFeedback.textContent = 'No se pudo conectar con el reconocimiento de escritura. Intenta de nuevo.';
      return;
    }

    const allCorrect = chars.every((ch, i) => (results[i] || []).slice(0, 3).includes(ch));

    if (allCorrect) {
      quizFeedback.className = 'tz-quiz-feedback feedback-correct';
      quizFeedback.textContent = '¡Muy bien! Se reconocio ' + currentChar().hanzi + '.';
    } else {
      const guess = chars.map((ch, i) => (results[i] && results[i][0]) || '?').join('');
      quizFeedback.className = 'tz-quiz-feedback feedback-incorrect';
      quizFeedback.textContent = 'Se reconocio como "' + guess + '". Intenta de nuevo.';
    }
  }

  function setMode(newMode) {
    mode = newMode;
    modeWatchBtn.classList.toggle('is-active', mode === 'watch');
    modeGuidedBtn.classList.toggle('is-active', mode === 'guided');
    modeFreeBtn.classList.toggle('is-active', mode === 'free');
    // reproducir y velocidad solo aplican a la animacion; el reiniciar sirve en todos los modos
    playBtn.hidden = mode !== 'watch';
    speedWrap.hidden = mode !== 'watch';
    buildBoards();
  }

  function goTo(newIndex) {
    charIndex = (newIndex + order.length) % order.length;
    updateInfo();
    buildBoards();
  }

  modeWatchBtn.addEventListener('click', () => setMode('watch'));
  modeGuidedBtn.addEventListener('click', () => setMode('guided'));
  modeFreeBtn.addEventListener('click', () => setMode('free'));

  playBtn.addEventListener('click', () => {
    if (writers.length === 0) return;

    if (isPlaying) {
      const writer = writers[activeWriter];
      if (writer && typeof writer.pauseAnimation === 'function') {
        writer.pauseAnimation();
        isPlaying = false;
        playBtn.innerHTML = '&#9654;';
      }
      return;
    }

    isPlaying = true;
    playBtn.innerHTML = '&#10074;&#10074;';

    const writer = writers[activeWriter];
    if (hasAnimated && writer && typeof writer.resumeAnimation === 'function') {
      writer.resumeAnimation();
      return;
    }

    hasAnimated = true;
    animateBoardsInSequence(
      writers,
      (i) => { activeWriter = i; },
      () => {
        isPlaying = false;
        hasAnimated = false;
        activeWriter = 0;
        playBtn.innerHTML = '&#9654;';
      }
    );
  });

  resetBtn.addEventListener('click', buildBoards);
  audioBtn.addEventListener('click', () => speakChinese(currentChar().hanzi));
  recognizeBtn.addEventListener('click', recognizeCurrent);

  speedRange.addEventListener('change', () => {
    if (mode === 'watch') buildBoards();
  });

  prevBtn.addEventListener('click', () => goTo(charIndex - 1));
  nextBtn.addEventListener('click', () => goTo(charIndex + 1));

  initOrderSwitch(document.getElementById('tz-order-switch'), (isRandom, changed) => {
    if (isRandom) {
      if (changed) listIndex = charIndex; // se guarda el puesto en la lista justo antes de salir de "En orden"
      order = buildOrder();
      goTo(0);
    } else {
      order = buildOrder();
      goTo(listIndex);
    }
  });

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (source.length === 0) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildBoards, 250);
  });

  source = loadSource();
  if (source.length === 0) {
    emptyStateEl.hidden = false;
  } else {
    contentEl.hidden = false;
    if (isReview) titleEl.textContent = 'Repaso de complicados';
    order = buildOrder();
    updateInfo();
    buildBoards();
  }
})();
