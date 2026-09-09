(function () {
  const isReview = new URLSearchParams(window.location.search).get('review') === '1';

  let source = [];
  let order = [];
  let charIndex = 0;
  let listIndex = 0; // puesto donde iba en "En orden", para volver ahi al salir de Aleatorio
  let mode = 'watch'; // 'watch' | 'quiz'
  let writers = [];
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
  const modeQuizBtn = document.getElementById('tz-mode-quiz');
  const quizFeedback = document.getElementById('tz-quiz-feedback');

  const playBtn = document.getElementById('tz-play');
  const resetBtn = document.getElementById('tz-reset');
  const audioBtn = document.getElementById('tz-audio');
  const speedWrap = document.getElementById('tz-speed');
  const speedRange = document.getElementById('tz-speed-range');

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

  /* No se puede avanzar sin marcar el nivel del caracter actual */
  function updateNavLock() {
    const locked = !isRated(currentChar().hanzi);
    prevBtn.disabled = locked;
    nextBtn.disabled = locked;
    navHintEl.hidden = !locked;
    renderProgressPanel(); // los conteos de abajo cambian al marcar
  }

  function buildBoards() {
    isPlaying = false;
    hasAnimated = false;
    activeWriter = 0;
    playBtn.innerHTML = '&#9654;';
    quizFeedback.hidden = true;

    const result = createHanziBoards(boardsEl, currentChar().hanzi, {
      showOutline: mode === 'watch',
      speed: Number(speedRange.value),
    });
    writers = result.writers;

    if (writers.length === 0) {
      quizFeedback.hidden = false;
      quizFeedback.className = 'tz-quiz-feedback feedback-incorrect';
      quizFeedback.textContent = 'No hay caracteres chinos que dibujar en "' + currentChar().hanzi + '".';
      return;
    }

    if (mode === 'quiz') startQuiz();
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

  function setMode(newMode) {
    mode = newMode;
    modeWatchBtn.classList.toggle('is-active', mode === 'watch');
    modeQuizBtn.classList.toggle('is-active', mode === 'quiz');
    // reproducir y velocidad solo aplican a la animacion; el reiniciar sirve en ambos modos
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
  modeQuizBtn.addEventListener('click', () => setMode('quiz'));

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
