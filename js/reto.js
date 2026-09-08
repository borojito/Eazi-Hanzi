(function () {
  const FOCUS_LABELS = {
    escritura: 'Escritura',
    tonos: 'Tonos',
    es: 'Significado',
  };

  let pool = []; // caracteres del origen elegido (para distractores)
  let exercises = [];
  let exIndex = 0;
  let results = [];
  let answered = false;          // evita contar dos veces la misma pregunta
  let currentOptionsWrap = null; // opciones en pantalla (para el boton de saltar)
  let currentWriters = [];       // cuadriculas en pantalla (para el boton de saltar)

  const setupGridEl = document.querySelector('.reto-setup-grid');
  const emptyStateEl = document.getElementById('reto-empty-state');

  const sourceActiveInput = document.getElementById('reto-source-active');
  const sourceStrugglingInput = document.getElementById('reto-source-struggling');
  const sourceActiveHint = document.getElementById('reto-source-active-hint');
  const sourceStrugglingHint = document.getElementById('reto-source-struggling-hint');

  const summaryEl = document.getElementById('reto-summary');
  const startBtn = document.getElementById('reto-start');

  const setupEl = document.getElementById('reto-setup');
  const playEl = document.getElementById('reto-play');
  const resultsEl = document.getElementById('reto-results');

  const progressEl = document.getElementById('reto-progress');
  const exerciseEl = document.getElementById('reto-exercise');
  const quitBtn = document.getElementById('reto-quit');
  const skipBtn = document.getElementById('reto-skip');

  /* ---------- Utilidades ---------- */

  const shuffle = shuffleArray;

  function activeChars() {
    return getActiveList().filter((c) => c.resolved);
  }

  function selectedFocusValues() {
    return [...document.querySelectorAll('input[name="focus"]:checked')].map((el) => el.value);
  }

  function selectedSourceChars() {
    const source = document.querySelector('input[name="reto-source"]:checked').value;
    return source === 'struggling' ? getStrugglingCharsData() : activeChars();
  }

  /* ---------- Pantalla de configuracion ---------- */

  function setupSourceOptions() {
    const activeCount = activeChars().length;
    const strugglingCount = getStrugglingCharsData().length;

    sourceActiveHint.textContent = activeCount + (activeCount === 1 ? ' caracter' : ' caracteres');
    sourceStrugglingHint.textContent = strugglingCount + (strugglingCount === 1 ? ' caracter' : ' caracteres');

    sourceActiveInput.disabled = activeCount === 0;
    sourceStrugglingInput.disabled = strugglingCount === 0;

    if (activeCount === 0 && strugglingCount === 0) {
      setupGridEl.hidden = true;
      emptyStateEl.hidden = false;
      return;
    }
    setupGridEl.hidden = false;
    emptyStateEl.hidden = true;

    if (activeCount === 0) sourceStrugglingInput.checked = true;
    else if (strugglingCount === 0) sourceActiveInput.checked = true;
  }

  function updateSummary() {
    const chars = selectedSourceChars();
    const focusChosen = selectedFocusValues().length > 0;
    summaryEl.textContent = chars.length + (chars.length === 1 ? ' caracter seleccionado' : ' caracteres seleccionados');
    startBtn.disabled = !(chars.length > 0 && focusChosen);
  }

  document.querySelectorAll('input[name="reto-source"]').forEach((el) => {
    el.addEventListener('change', updateSummary);
  });
  document.querySelectorAll('input[name="focus"]').forEach((el) => {
    el.addEventListener('change', updateSummary);
  });

  /* ---------- Generacion de ejercicios ---------- */

  function buildExercises() {
    const chars = selectedSourceChars();
    pool = chars;
    const focus = selectedFocusValues();
    const list = [];
    chars.forEach((char) => {
      focus.forEach((type) => list.push({ type, char }));
    });
    return shuffle(list); // el reto siempre va en orden aleatorio
  }

  function distractorsFor(char, field, count) {
    return shuffle(pool.filter((c) => c.hanzi !== char.hanzi && c[field] !== char[field])).slice(0, count);
  }

  /* ---------- Render de un ejercicio ---------- */

  function renderExercise() {
    const ex = exercises[exIndex];
    progressEl.textContent = 'Pregunta ' + (exIndex + 1) + ' / ' + exercises.length;
    exerciseEl.innerHTML = '';

    answered = false;
    currentOptionsWrap = null;
    currentWriters = [];
    skipBtn.disabled = false;

    if (ex.type === 'tonos') renderToneExercise(ex);
    else if (ex.type === 'es') renderMCQExercise(ex, 'meaning_es', 'Elige el significado correcto');
    else if (ex.type === 'escritura') renderWritingExercise(ex);
  }

  function toneChipHTML(char) {
    return '<span class="tone-chip tone-chip--' + getToneFromPinyin(char.pinyin) + '">' + char.pinyin + '</span>';
  }

  function appendPrompt(kicker, innerHTML, char) {
    const prompt = document.createElement('div');
    prompt.className = 'reto-exercise__prompt';
    prompt.innerHTML = '<span class="reto-exercise__kicker">' + kicker + '</span>' + innerHTML;
    exerciseEl.appendChild(prompt);

    if (char) {
      const audioRow = document.createElement('div');
      audioRow.className = 'reto-exercise__audio';
      audioRow.appendChild(createAudioButton(() => char.hanzi));
      exerciseEl.appendChild(audioRow);
    }
  }

  /* Traducir: se muestra el caracter Y su pinyin, se pregunta el significado */
  function renderMCQExercise(ex, field, kicker) {
    const char = ex.char;
    const options = shuffle([char, ...distractorsFor(char, field, 3)]);

    appendPrompt(
      kicker,
      '<span class="hanzi-display hanzi-display--hero">' + char.hanzi + '</span>' +
      '<span class="reto-exercise__pinyin">' + toneChipHTML(char) + '</span>',
      char
    );

    const optionsWrap = document.createElement('div');
    optionsWrap.className = 'reto-exercise__options';
    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'reto-option';
      btn.textContent = opt[field];
      if (opt.hanzi === char.hanzi) btn.dataset.correct = '1';
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const isCorrect = opt.hanzi === char.hanzi;
        lockOptions(optionsWrap);
        btn.classList.add(isCorrect ? 'is-correct' : 'is-incorrect');
        if (!isCorrect) markCorrectOption(optionsWrap);
        recordResult(ex, isCorrect);
        showFeedbackAndNext(isCorrect, isCorrect ? '¡Correcto!' : 'La respuesta correcta era: ' + char[field]);
      });
      optionsWrap.appendChild(btn);
    });
    exerciseEl.appendChild(optionsWrap);
    currentOptionsWrap = optionsWrap;
  }

  function lockOptions(wrap) {
    [...wrap.children].forEach((b) => (b.disabled = true));
  }

  function markCorrectOption(wrap) {
    const correctBtn = wrap.querySelector('[data-correct="1"]');
    if (correctBtn) correctBtn.classList.add('is-correct');
  }

  /* Tonos: las opciones son la misma silaba en sus 5 tonos */
  function renderToneExercise(ex) {
    const char = ex.char;
    const toneOptions = buildToneOptions(char.pinyin);

    if (toneOptions.length === 0) {
      // sin vocal marcable no hay tonos que comparar: se cae al modo de opciones normales
      renderMCQExercise(ex, 'pinyin', 'Elige el pinyin correcto');
      return;
    }

    appendPrompt(
      '¿Qué tono lleva?',
      '<span class="hanzi-display hanzi-display--hero">' + char.hanzi + '</span>',
      char
    );

    const optionsWrap = document.createElement('div');
    optionsWrap.className = 'reto-exercise__options reto-exercise__options--tones';
    toneOptions.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'tone-option tone-option--tone' + opt.tone;
      btn.innerHTML =
        '<span class="tone-option__tone">' + (opt.tone === 0 ? '·' : opt.tone) + '</span>' +
        '<span>' + opt.text + '</span>';
      if (opt.isCorrect) btn.dataset.correct = '1';
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        lockOptions(optionsWrap);
        btn.classList.add(opt.isCorrect ? 'is-correct' : 'is-incorrect');
        if (!opt.isCorrect) markCorrectOption(optionsWrap);
        recordResult(ex, opt.isCorrect);
        showFeedbackAndNext(
          opt.isCorrect,
          opt.isCorrect ? '¡Correcto!' : char.hanzi + ' se pronuncia ' + char.pinyin
        );
      });
      optionsWrap.appendChild(btn);
    });
    exerciseEl.appendChild(optionsWrap);
    currentOptionsWrap = optionsWrap;
  }

  /* Escritura: de memoria — sin contorno guia. Se muestra pinyin y traduccion,
     y una cuadricula por cada caracter de la palabra. */
  function renderWritingExercise(ex) {
    const char = ex.char;

    appendPrompt(
      'Escríbelo de memoria',
      '<span class="reto-exercise__pinyin">' + toneChipHTML(char) + '</span>' +
      '<span class="reto-exercise__meaning">' + char.meaning_es + '</span>',
      char
    );

    const boardsWrap = document.createElement('div');
    boardsWrap.className = 'reto-boards';
    exerciseEl.appendChild(boardsWrap);

    const result = createHanziBoards(boardsWrap, char.hanzi, {
      showOutline: false,        // de memoria: sin sombra del caracter
      showHintAfterMisses: false,
      leniency: 1.3,
      size: char.hanzi.length > 1 ? 200 : 260,
    });
    currentWriters = result.writers;

    if (result.writers.length === 0) {
      answered = true;
      recordResult(ex, false);
      showFeedbackAndNext(false, 'No hay caracteres chinos que dibujar aqui.');
      return;
    }

    // Terminar de escribirlo cuenta como acierto: los trazos ya se validan solos.
    quizBoards(result.writers, {
      onAllComplete: () => {
        if (answered) return;
        answered = true;
        recordResult(ex, true);
        showFeedbackAndNext(true, '¡Muy bien! Escribiste ' + char.hanzi);
      },
    });
  }

  function showFeedbackAndNext(isCorrect, message) {
    skipBtn.disabled = true;

    const feedback = document.createElement('div');
    feedback.className = 'reto-exercise__feedback ' + (isCorrect ? 'feedback-correct' : 'feedback-incorrect');
    feedback.textContent = message;
    exerciseEl.appendChild(feedback);

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-primary reto-exercise__next';
    nextBtn.textContent = exIndex + 1 < exercises.length ? 'Siguiente' : 'Ver resultados';
    nextBtn.addEventListener('click', advance);
    exerciseEl.appendChild(nextBtn);
  }

  function recordResult(ex, isCorrect) {
    results.push({ hanzi: ex.char.hanzi, type: ex.type, correct: isCorrect });
  }

  function advance() {
    exIndex += 1;
    if (exIndex >= exercises.length) {
      finishReto();
    } else {
      renderExercise();
    }
  }

  /* Saltar: cuenta como fallo y muestra la respuesta */
  function skipExercise() {
    if (answered) return;
    answered = true;

    const ex = exercises[exIndex];
    const char = ex.char;
    recordResult(ex, false);

    if (currentOptionsWrap) {
      lockOptions(currentOptionsWrap);
      markCorrectOption(currentOptionsWrap);
    }
    // en escritura se revela el caracter en las cuadriculas
    currentWriters.forEach((w) => {
      w.cancelQuiz();
      w.showCharacter();
    });

    let answer;
    if (ex.type === 'escritura') answer = char.hanzi + ' (' + char.pinyin + ')';
    else if (ex.type === 'tonos') answer = char.pinyin;
    else answer = char.meaning_es;

    showFeedbackAndNext(false, 'La respuesta era: ' + answer);
  }

  skipBtn.addEventListener('click', skipExercise);

  quitBtn.addEventListener('click', () => {
    if (confirm('¿Salir del reto? Se perdera el progreso de esta sesion.')) {
      showSetup();
    }
  });

  /* ---------- Resultados ---------- */

  function finishReto() {
    const correctCount = results.filter((r) => r.correct).length;
    saveRetoResult({
      score: correctCount,
      total: results.length,
      focus: selectedFocusValues(),
    });
    renderResults(correctCount);
    playEl.hidden = true;
    resultsEl.hidden = false;
  }

  function renderResults(correctCount) {
    document.getElementById('reto-score-value').textContent = correctCount + '/' + results.length;
    document.getElementById('reto-score-label').textContent =
      correctCount === results.length ? '¡Reto perfecto!' : 'aciertos en este reto';

    const reviewEl = document.getElementById('reto-review');
    reviewEl.innerHTML = '';
    results.forEach((r) => {
      const char = pool.find((c) => c.hanzi === r.hanzi);
      const item = document.createElement('div');
      item.className = 'reto-review-item';
      item.innerHTML =
        '<span class="reto-review-item__hanzi">' + r.hanzi + '</span>' +
        '<span class="reto-review-item__detail">' + (char ? char.pinyin + ' · ' + char.meaning_es : '') +
        ' — ' + FOCUS_LABELS[r.type] + '</span>' +
        '<span class="reto-review-item__result ' + (r.correct ? 'reto-review-item__result--ok' : 'reto-review-item__result--fail') + '">' +
        (r.correct ? 'Correcto' : 'Repasar') + '</span>';
      reviewEl.appendChild(item);
    });
  }

  document.getElementById('reto-again').addEventListener('click', showSetup);

  /* ---------- Transiciones de pantalla ---------- */

  function showSetup() {
    resultsEl.hidden = true;
    playEl.hidden = true;
    setupEl.hidden = false;
    setupSourceOptions();
    updateSummary();
  }

  function startReto() {
    exercises = buildExercises();
    exIndex = 0;
    results = [];
    setupEl.hidden = true;
    resultsEl.hidden = true;
    playEl.hidden = false;
    renderExercise();
  }

  startBtn.addEventListener('click', startReto);

  /* ---------- Init ---------- */

  setupSourceOptions();
  updateSummary();
})();
