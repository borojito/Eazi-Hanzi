/* Eazi Hanzi — Sección "Tu progreso" compartida.
   Va en el inicio y al final de los módulos de práctica (no en el Reto).
   Las insignias de "Ya lo sé" y "Complicados" abren la lista de sus caracteres. */

let progressOpenGroup = null; // 'known' | 'struggling' | null

function progressGroups() {
  return {
    known: {
      label: 'Ya lo sé',
      chars: getKnownCharsData(),
      modifier: 'seal-badge--tertiary',
      empty: 'Todavía no has marcado ningún caracter como "Ya lo sé".',
    },
    struggling: {
      label: 'Complicados',
      chars: getStrugglingCharsData(),
      modifier: 'seal-badge--secondary',
      empty: 'No tienes caracteres marcados como complicados.',
    },
  };
}

function buildSeal(key, group, isOpen) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className =
    'seal-badge seal-badge--button ' + group.modifier + (isOpen ? ' is-open' : '');
  btn.dataset.group = key;
  btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  btn.innerHTML =
    '<span class="seal-badge__value">' + group.chars.length + '</span>' +
    '<span class="seal-badge__label">' + group.label + '</span>';
  btn.addEventListener('click', () => {
    progressOpenGroup = progressOpenGroup === key ? null : key;
    renderProgressPanel();
  });
  return btn;
}

function buildCharRow(char) {
  const level = getMasteryLevel(char.hanzi);
  const row = document.createElement('li');
  row.className = 'progress-char';

  const hanzi = document.createElement('span');
  hanzi.className = 'progress-char__hanzi';
  hanzi.textContent = char.hanzi;

  const pinyin = document.createElement('span');
  pinyin.className = 'tone-chip tone-chip--' + getToneFromPinyin(char.pinyin);
  pinyin.textContent = char.pinyin;

  const meaning = document.createElement('span');
  meaning.className = 'progress-char__meaning';
  meaning.textContent = char.meaning_es;

  const tag = document.createElement('span');
  tag.className = 'mastery-tag mastery-tag--' + level;
  tag.textContent = MASTERY_LABELS[level] || '';

  const audio = createAudioButton(() => char.hanzi);
  audio.classList.add('progress-char__audio');

  row.append(hanzi, pinyin, meaning, tag, audio);
  return row;
}

function renderProgressPanel() {
  const host = document.getElementById('progress-panel');
  if (!host) return;

  const groups = progressGroups();
  const strugglingCount = groups.struggling.chars.length;

  host.innerHTML = '';
  host.className = 'section progress-section';

  const container = document.createElement('div');
  container.className = 'container';
  host.appendChild(container);

  const title = document.createElement('h2');
  title.className = 'section-title';
  title.textContent = 'Tu progreso';
  container.appendChild(title);

  const row = document.createElement('div');
  row.className = 'progress-row';

  Object.keys(groups).forEach((key) => {
    row.appendChild(buildSeal(key, groups[key], progressOpenGroup === key));
  });
  container.appendChild(row);

  const hint = document.createElement('p');
  hint.className = 'progress-hint text-muted';
  hint.textContent = 'Toca "Ya lo sé" o "Complicados" para ver sus caracteres.';
  container.appendChild(hint);

  // lista desplegable del grupo abierto
  if (progressOpenGroup) {
    const group = groups[progressOpenGroup];
    const panel = document.createElement('div');
    panel.className = 'card progress-list';

    if (group.chars.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-muted mb-0';
      empty.textContent = group.empty;
      panel.appendChild(empty);
    } else {
      const list = document.createElement('ul');
      list.className = 'progress-char-list';
      group.chars.forEach((char) => list.appendChild(buildCharRow(char)));
      panel.appendChild(list);
    }
    container.appendChild(panel);
  }

  // repaso de complicados
  const actions = document.createElement('div');
  actions.className = 'progress-actions';

  if (strugglingCount > 0) {
    const link = document.createElement('a');
    link.className = 'btn btn-secondary';
    link.href = 'flashcards.html?review=1';
    link.textContent = 'Repaso de complicados (' + strugglingCount + ')';
    actions.appendChild(link);
  } else {
    const disabled = document.createElement('button');
    disabled.className = 'btn btn-secondary';
    disabled.type = 'button';
    disabled.disabled = true;
    disabled.textContent = 'Repaso de complicados';
    actions.appendChild(disabled);

    const note = document.createElement('span');
    note.className = 'text-muted progress-actions__note';
    note.textContent = 'Marca caracteres como "Necesito seguir estudiando" o "Podría repasar" para usarlo.';
    actions.appendChild(note);
  }
  container.appendChild(actions);
}

document.addEventListener('DOMContentLoaded', renderProgressPanel);
