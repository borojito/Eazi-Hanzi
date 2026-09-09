(function () {
  const isReview = new URLSearchParams(window.location.search).get('review') === '1';

  let source = [];
  let deck = [];
  let index = 0;
  let listIndex = 0; // puesto donde iba en "En orden", para volver ahi al salir de Aleatorio

  const emptyStateEl = document.getElementById('fc-empty-state');
  const contentEl = document.getElementById('fc-content');
  const titleEl = document.getElementById('fc-title');

  const cardEl = document.getElementById('flashcard');
  const hanziEl = document.getElementById('fc-hanzi');
  const pinyinChip = document.getElementById('fc-pinyin-chip');
  const meaningEsEl = document.getElementById('fc-meaning-es');
  const indexEl = document.getElementById('fc-index');
  const totalEl = document.getElementById('fc-total');
  const masteryPanelEl = document.getElementById('fc-mastery-panel');
  const audioBtn = document.getElementById('fc-audio');
  const navHintEl = document.getElementById('fc-nav-hint');
  const prevBtn = document.getElementById('fc-prev');
  const nextBtn = document.getElementById('fc-next');

  function loadSource() {
    if (isReview) return getStrugglingCharsData();
    return getActiveList().filter((c) => c.resolved);
  }

  /* Cada caracter aparece UNA sola vez; "aleatorio" solo cambia el orden. */
  function buildDeck(list) {
    return getRandomOrder() ? shuffleArray(list) : list.slice();
  }

  function applyTone(char) {
    const tone = getToneFromPinyin(char.pinyin);
    pinyinChip.className = 'tone-chip tone-chip--' + tone;
    pinyinChip.textContent = char.pinyin;
  }

  function render() {
    const char = deck[index];

    // Si la tarjeta estaba volteada, no se anima la vuelta al frente: si no, el
    // contenido nuevo se actualiza a mitad de giro y por un instante se ve el
    // siguiente caracter en la cara de atras (se siente como que se traba/salta).
    const wasFlipped = cardEl.classList.contains('is-flipped');
    if (wasFlipped) {
      cardEl.classList.add('no-flip-transition');
      cardEl.classList.remove('is-flipped');
    }

    hanziEl.textContent = char.hanzi;
    applyTone(char);
    meaningEsEl.textContent = char.meaning_es;
    indexEl.textContent = index + 1;
    totalEl.textContent = deck.length;

    renderMasteryPanel(masteryPanelEl, {
      hanzi: char.hanzi,
      list: source,
      charEl: hanziEl,
      onChange: updateNavLock,
    });
    updateNavLock();

    if (wasFlipped) {
      // fuerza reflow para que el navegador aplique el reseteo sin transicion
      // antes de volver a habilitarla para el proximo volteo del usuario
      void cardEl.offsetWidth;
      cardEl.classList.remove('no-flip-transition');
    }
  }

  /* No se puede avanzar sin marcar el nivel del caracter actual */
  function updateNavLock() {
    const locked = !isRated(deck[index].hanzi);
    prevBtn.disabled = locked;
    nextBtn.disabled = locked;
    navHintEl.hidden = !locked;
    renderProgressPanel(); // los conteos de abajo cambian al marcar
  }

  function flip() {
    cardEl.classList.toggle('is-flipped');
  }

  function next() {
    index = (index + 1) % deck.length;
    render();
  }

  function prev() {
    index = (index - 1 + deck.length) % deck.length;
    render();
  }

  cardEl.addEventListener('click', flip);
  cardEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
  });

  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);
  audioBtn.addEventListener('click', () => speakChinese(deck[index].hanzi));

  initOrderSwitch(document.getElementById('fc-order-switch'), (isRandom, changed) => {
    if (isRandom) {
      if (changed) listIndex = index; // se guarda el puesto en la lista justo antes de salir de "En orden"
      deck = buildDeck(source);
      index = 0;
    } else {
      deck = buildDeck(source);
      index = listIndex;
    }
    render();
  });

  source = loadSource();
  if (source.length === 0) {
    emptyStateEl.hidden = false;
    contentEl.hidden = true;
  } else {
    emptyStateEl.hidden = true;
    contentEl.hidden = false;
    if (isReview) titleEl.textContent = 'Repaso de complicados';
    deck = buildDeck(source);
    render();
  }
})();
