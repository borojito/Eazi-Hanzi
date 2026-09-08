/* Eazi Hanzi — Panel lateral con los 3 niveles de dominio, su conteo,
   y la animacion del caracter "volando" hacia la cajita elegida. */

const MASTERY_DEFS = [
  { level: MASTERY_LEVELS.KNOWN, label: 'Ya lo sé', mod: 'known' },
  { level: MASTERY_LEVELS.REVIEW, label: 'Podría repasar', mod: 'review' },
  { level: MASTERY_LEVELS.STUDYING, label: 'Necesito seguir estudiando', mod: 'studying' },
];

/* Cuantos caracteres de la lista estan en cada nivel */
function countByLevel(list, level) {
  const map = getMasteryMap();
  return list.filter((c) => map[c.hanzi] && map[c.hanzi].level === level).length;
}

/* Manda un clon del caracter volando desde charEl hasta la cajita destino */
function flyHanziTo(charEl, targetEl, text) {
  if (!charEl || !targetEl || typeof charEl.animate !== 'function') return;

  const from = charEl.getBoundingClientRect();
  const to = targetEl.getBoundingClientRect();
  if (!from.width || !to.width) return;

  const ghost = document.createElement('span');
  ghost.className = 'flying-hanzi';
  ghost.textContent = text;
  ghost.style.left = from.left + from.width / 2 + 'px';
  ghost.style.top = from.top + from.height / 2 + 'px';
  ghost.style.fontSize = Math.max(28, Math.min(from.height, 90)) + 'px';
  document.body.appendChild(ghost);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);

  const anim = ghost.animate(
    [
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx * 0.55}px), calc(-50% + ${dy * 0.55 - 40}px)) scale(0.75)`, opacity: 0.95, offset: 0.6 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.2)`, opacity: 0 },
    ],
    { duration: 750, easing: 'cubic-bezier(0.4, 0.1, 0.25, 1)' }
  );
  anim.onfinish = () => ghost.remove();
  anim.oncancel = () => ghost.remove();

  // la cajita "recibe" el caracter
  setTimeout(() => {
    targetEl.classList.add('is-receiving');
    targetEl.addEventListener('animationend', () => targetEl.classList.remove('is-receiving'), { once: true });
  }, 600);
}

/* Pinta el panel. opts: { hanzi, list, charEl, onChange }
   Marcar un nivel es obligatorio para avanzar, asi que mientras el caracter
   no tenga nivel el panel se resalta y lo pide explicitamente. */
function renderMasteryPanel(containerEl, opts) {
  const options = opts || {};
  const hanzi = options.hanzi;
  const list = options.list || [];
  const currentLevel = getMasteryLevel(hanzi);
  const pending = currentLevel === null;

  containerEl.innerHTML = '';
  containerEl.className = 'mastery-panel' + (pending ? ' is-required' : '');

  const title = document.createElement('p');
  title.className = 'mastery-panel__title';
  title.textContent = pending ? 'Marca tu nivel para continuar' : '¿Cómo vas con este?';
  containerEl.appendChild(title);

  MASTERY_DEFS.forEach((def) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'mastery-box mastery-box--' + def.mod + (currentLevel === def.level ? ' is-active' : '');
    btn.innerHTML =
      '<span class="mastery-box__label">' + def.label + '</span>' +
      '<span class="mastery-box__count">' + countByLevel(list, def.level) + '</span>';

    btn.addEventListener('click', () => {
      if (getMasteryLevel(hanzi) !== def.level) {
        flyHanziTo(options.charEl, btn, hanzi);
      }
      setMasteryLevel(hanzi, def.level);
      renderMasteryPanel(containerEl, options);
      if (options.onChange) options.onChange(def.level);
    });

    containerEl.appendChild(btn);
  });
}
