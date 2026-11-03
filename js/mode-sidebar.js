/* Eazi Hanzi — Barra lateral para cambiar de area: caracteres / escucha / orden de trazos.
   Se inyecta en <aside id="mode-sidebar"> segun el data-page del <body>.
   El inicio (index.html) es el selector principal; la barra permite saltar
   entre areas sin volver a el. */

const SIDEBAR_MODES = [
  { id: 'caracteres', href: 'caracteres.html', icon: '字', label: 'Practicar caracteres', hint: 'Flashcards, pinyin, trazos y reto', pages: ['caracteres'] },
  { id: 'escucha', href: 'escucha.html', icon: '听', label: 'Practicar escucha', hint: 'Dictado de frases', pages: ['escucha'] },
  { id: 'orden', href: 'orden.html', icon: '笔', label: 'Orden de trazos', hint: 'Consulta cualquier caracter', pages: ['orden'] },
];

function renderModeSidebar() {
  const host = document.getElementById('mode-sidebar');
  if (!host) return;
  const current = document.body.dataset.page || '';

  host.innerHTML =
    '<p class="mode-sidebar__title">¿Qué quieres practicar?</p>' +
    '<nav class="mode-sidebar__nav" aria-label="Tipo de práctica">' +
    SIDEBAR_MODES.map((m) => {
      const active = m.pages.includes(current);
      return '<a href="' + m.href + '" class="mode-sidebar__item mode-sidebar__item--' + m.id + (active ? ' is-active' : '') + '"' +
        (active ? ' aria-current="page"' : '') + '>' +
        '<span class="mode-sidebar__icon">' + m.icon + '</span>' +
        '<span class="mode-sidebar__text"><strong>' + m.label + '</strong><small>' + m.hint + '</small></span>' +
        '</a>';
    }).join('') +
    '</nav>';
}

document.addEventListener('DOMContentLoaded', renderModeSidebar);
