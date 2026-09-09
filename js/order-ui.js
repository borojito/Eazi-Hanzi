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
      const changed = isRandom !== getRandomOrder();
      setRandomOrder(isRandom);
      paint();
      // "Aleatorio" reordena en cada click, aunque ya estuviera activo.
      // "En orden" solo dispara el cambio si realmente se venia de aleatorio.
      // `changed` avisa al modulo si esta es la transicion real (para que sepa
      // cuando guardar/restaurar el puesto en el que iba en la lista en orden).
      if (onChange && (changed || isRandom)) onChange(isRandom, changed);
    });
  });

  paint();
}
