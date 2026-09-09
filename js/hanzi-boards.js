/* Eazi Hanzi Peng You — Tableros de trazos (uno por caracter)
   Una palabra como 你好 necesita 2 cuadriculas: Hanzi Writer solo dibuja
   un caracter por instancia. */

const CJK_PATTERN = /[㐀-䶿一-鿿豈-﫿]/;

/* Separa una palabra en sus caracteres dibujables */
function splitHanziChars(word) {
  return [...(word || '')].filter((ch) => CJK_PATTERN.test(ch));
}

/* Tamaño de cada cuadricula segun cuantas quepan a lo ancho */
function boardSizeFor(count, containerWidth) {
  const isDesktop = window.innerWidth >= 768;
  const maxSize = isDesktop ? 400 : 290;
  const gap = 16;
  const available = Math.min(containerWidth || maxSize, isDesktop ? 900 : 340);
  const perBoard = Math.floor((available - gap * (count - 1)) / count);
  return Math.max(105, Math.min(maxSize, perBoard));
}

/* Crea una cuadricula por caracter y devuelve { writers, chars, size } */
function createHanziBoards(containerEl, word, opts) {
  const options = opts || {};
  containerEl.innerHTML = '';

  const chars = splitHanziChars(word);
  const size = options.size || boardSizeFor(chars.length, containerEl.clientWidth);
  const writers = [];

  chars.forEach((ch) => {
    const board = document.createElement('div');
    board.className = 'tianzige';
    board.style.width = size + 'px';
    board.style.height = size + 'px';
    containerEl.appendChild(board);

    writers.push(
      HanziWriter.create(board, ch, {
        width: size,
        height: size,
        padding: Math.round(size * 0.06),
        showOutline: options.showOutline !== false,
        // Hanzi Writer muestra el caracter relleno por defecto (showCharacter),
        // independiente del outline. Si no se pide explicitamente, se hereda de
        // showOutline para no revelar el caracter un instante antes de que el
        // quiz lo oculte (por ej. en el modo "de memoria" del Reto).
        showCharacter: options.showCharacter !== undefined ? options.showCharacter : options.showOutline !== false,
        strokeAnimationSpeed: options.speed || 1,
        delayBetweenStrokes: 250,
        strokeColor: '#C22F2F',
        outlineColor: 'rgba(212,163,89,0.45)',
        drawingColor: '#3B7A57',
        radicalColor: '#D4A359',
        highlightColor: '#D4A359', // color de la pista (highlightStroke)
        showHintAfterMisses: options.showHintAfterMisses === false ? false : 2,
        highlightOnComplete: true,
        leniency: options.leniency || 1.2,
      })
    );
  });

  return { writers, chars, size };
}

/* Anima los caracteres uno tras otro. onStep recibe el indice en curso. */
function animateBoardsInSequence(writers, onStep, onDone) {
  let i = 0;
  function step() {
    if (i >= writers.length) {
      if (onDone) onDone();
      return;
    }
    const current = i;
    i += 1;
    if (onStep) onStep(current);
    writers[current].animateCharacter({ onComplete: step });
  }
  step();
}

/* Quiz sobre todos los tableros a la vez.
   onAllComplete se dispara cuando el ultimo caracter queda terminado.
   Devuelve { hint() } para resaltar solo el proximo trazo esperado del primer
   tablero sin terminar, sin revelar el resto del caracter. */
function quizBoards(writers, handlers) {
  const h = handlers || {};
  let completed = 0;
  let mistakes = 0;
  const progress = writers.map(() => ({ strokeNum: 0, done: false }));

  writers.forEach((writer, i) => {
    writer.quiz({
      onMistake: (data) => {
        progress[i].strokeNum = data.strokeNum;
        mistakes += 1;
        if (h.onMistake) h.onMistake(mistakes);
      },
      onCorrectStroke: (data) => {
        progress[i].strokeNum = data.strokeNum + 1;
      },
      onComplete: () => {
        progress[i].done = true;
        completed += 1;
        if (h.onCharComplete) h.onCharComplete(completed, writers.length);
        if (completed === writers.length && h.onAllComplete) h.onAllComplete(mistakes);
      },
    });
  });

  function hint() {
    const i = progress.findIndex((p) => !p.done);
    if (i === -1) return;
    writers[i].highlightStroke(progress[i].strokeNum);
  }

  return { hint };
}
