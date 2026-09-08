/* Eazi Hanzi Peng You — Switch de orden (lista / aleatorio), compartido entre modulos */

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Conecta un .order-switch: pinta el estado guardado y avisa cuando cambia.
   La preferencia se comparte entre todas las pantallas. */
function initOrderSwitch(switchEl, onChange) {
  if (!switchEl) return;
  const buttons = [...switchEl.querySelectorAll('.order-switch__btn')];

  function paint() {
    const isRandom = getRandomOrder();
    buttons.forEach((btn) => {
      btn.classList.toggle('is-active', (btn.dataset.order === 'random') === isRandom);
    });
  }

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const isRandom = btn.dataset.order === 'random';
      if (isRandom === getRandomOrder()) return;
      setRandomOrder(isRandom);
      paint();
      if (onChange) onChange(isRandom);
    });
  });

  paint();
}
