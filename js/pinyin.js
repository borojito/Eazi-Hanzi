(function () {
  const isReview = new URLSearchParams(window.location.search).get('review') === '1';

  const TONE_NAMES = { 1: '1er tono', 2: '2do tono', 3: '3er tono', 4: '4to tono', 0: 'neutro' };

  let source = [];
  let order = [];
  let index = 0;
  let listIndex = 0; // puesto donde iba en "En orden", para volver ahi al salir de Aleatorio
  let score = 0;
  let answered = false;
  let correctToneOfQuestion = 0; // tono de la silaba que se esta preguntando

  const emptyStateEl = document.getElementById('py-empty-state');
  const contentEl = document.getElementById('py-content');
  const titleEl = document.getElementById('py-title');

  const hanziEl = document.getElementById('py-hanzi');
  const meaningEl = document.getElementById('py-meaning');
  const optionsEl = document.getElementById('py-options');
  const feedbackEl = document.getElementById('py-feedback');
  const indexEl = document.getElementById('py-index');
  const totalEl = document.getElementById('py-total');
  const scoreEl = document.getElementById('py-score');
  const prevBtn = document.getElementById('py-prev');
  const nextBtn = document.getElementById('py-next');
  const audioBtn = document.getElementById('py-audio');
  const masteryPanelEl = document.getElementById('py-mastery-panel');
  const navHintEl = document.getElementById('py-nav-hint');

  function loadSource() {
    if (isReview) return getStrugglingCharsData();
    return getActiveList().filter((c) => c.resolved);
  }

  function buildOrder() {
    return getRandomOrder() ? shuffleArray(source) : source.slice();
  }

  function render() {
    answered = false;
    feedbackEl.hidden = true;
    nextBtn.disabled = true;

    const char = order[index];
    hanziEl.textContent = char.hanzi;
    meaningEl.textContent = char.meaning_es;
    indexEl.textContent = index + 1;
    totalEl.textContent = order.length;
    scoreEl.textContent = score + ' aciertos';

    renderMasteryPanel(masteryPanelEl, {
      hanzi: char.hanzi,
      list: source,
      charEl: hanziEl,
      onChange: updateNextState,
    });

    renderOptions(char);
    updateNextState();
  }

  /* Las opciones son la MISMA silaba en sus 5 tonos, en orden fijo 1-4 + neutro */
  function renderOptions(char) {
    const options = buildToneOptions(char.pinyin);
    optionsEl.innerHTML = '';

    if (options.length === 0) {
      // pinyin sin vocal marcable: no hay tonos que comparar, se salta el caracter
      feedbackEl.hidden = false;
      feedbackEl.className = 'py-feedback feedback-incorrect';
      feedbackEl.textContent = 'No se pudo generar opciones de tono para "' + char.pinyin + '".';
      answered = true; // no hay nada que responder, pero igual hay que marcar el nivel
      updateNextState();
      return;
    }

    const correct = options.find((o) => o.isCorrect);
    correctToneOfQuestion = correct ? correct.tone : 0;

    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'tone-option tone-option--tone' + opt.tone;
      btn.innerHTML =
        '<span class="tone-option__tone">' + (opt.tone === 0 ? '·' : opt.tone) + '</span>' +
        '<span>' + opt.text + '</span>';
      if (opt.isCorrect) btn.dataset.correct = '1';
      btn.addEventListener('click', () => handleAnswer(btn, opt, char));
      optionsEl.appendChild(btn);
    });
  }

  function handleAnswer(btn, chosen, char) {
    if (answered) return;
    answered = true;

    [...optionsEl.children].forEach((b) => (b.disabled = true));
    btn.classList.add(chosen.isCorrect ? 'is-correct' : 'is-incorrect');

    if (chosen.isCorrect) {
      score += 1;
    } else {
      const correctBtn = optionsEl.querySelector('[data-correct="1"]');
      if (correctBtn) correctBtn.classList.add('is-correct');
    }

    feedbackEl.hidden = false;
    feedbackEl.className = 'py-feedback ' + (chosen.isCorrect ? 'feedback-correct' : 'feedback-incorrect');
    feedbackEl.textContent = chosen.isCorrect
      ? '¡Correcto! ' + char.hanzi + ' se pronuncia ' + char.pinyin
      : 'Casi — ' + char.hanzi + ' se pronuncia ' + char.pinyin +
        ' (aquí va ' + TONE_NAMES[correctToneOfQuestion] + ')';

    scoreEl.textContent = score + ' aciertos';
    updateNextState();
    speakChinese(char.hanzi);
  }

  /* Si el caracter ya tiene un nivel marcado (de esta vuelta o de una anterior),
     se puede continuar sin responder el quiz. Si no, hay que marcar un nivel primero. */
  function updateNextState() {
    const rated = isRated(order[index].hanzi);
    prevBtn.disabled = !rated;
    nextBtn.disabled = !rated;
    navHintEl.hidden = rated;
    renderProgressPanel(); // los conteos de abajo cambian al marcar
  }

  function next() {
    index = (index + 1) % order.length;
    if (index === 0) order = buildOrder();
    render();
  }

  function prev() {
    index = (index - 1 + order.length) % order.length;
    render();
  }

  audioBtn.addEventListener('click', () => speakChinese(order[index].hanzi));
  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  initOrderSwitch(document.getElementById('py-order-switch'), (isRandom, changed) => {
    if (isRandom) {
      if (changed) listIndex = index; // se guarda el puesto en la lista justo antes de salir de "En orden"
      order = buildOrder();
      index = 0;
    } else {
      order = buildOrder();
      index = listIndex;
    }
    render();
  });

  source = loadSource();
  if (source.length === 0) {
    emptyStateEl.hidden = false;
  } else {
    contentEl.hidden = false;
    if (isReview) titleEl.textContent = 'Repaso de complicados';
    order = buildOrder();
    render();
  }
})();
