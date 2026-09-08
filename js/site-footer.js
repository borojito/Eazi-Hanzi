/* Eazi Hanzi — Pie de pagina compartido: accesos a los otros modulos
   + boton para empezar con caracteres nuevos.
   Se inyecta segun el data-page del <body>. */

const SITE_PAGES = [
  { id: 'flashcards', href: 'flashcards.html', label: 'Flashcards' },
  { id: 'pinyin', href: 'pinyin.html', label: 'Pinyin y tonos' },
  { id: 'trazos', href: 'trazos.html', label: 'Trazos' },
  { id: 'reto', href: 'reto.html', label: 'Reto' },
];

function renderSiteFooter() {
  const current = document.body.dataset.page || '';
  const host = document.getElementById('site-footer');
  if (!host) return;

  const links = SITE_PAGES.filter((p) => p.id !== current)
    .map((p) => {
      const cls = p.id === 'reto' ? 'btn btn-primary btn-reto' : 'btn btn-secondary';
      return '<a href="' + p.href + '" class="' + cls + '">' + p.label + '</a>';
    })
    .join('');

  // en el inicio no tiene sentido el boton que lleva al inicio
  const restart = current === 'index'
    ? ''
    : '<div class="site-footer__restart">' +
      '<a href="index.html" class="btn btn-ghost">¿Estudiar nuevos caracteres?</a>' +
      '</div>';

  host.innerHTML =
    '<div class="container site-footer__inner">' +
    '<p class="site-footer__title">Seguir repasando…</p>' +
    '<div class="site-footer__links">' + links + '</div>' +
    restart +
    '</div>';
}

document.addEventListener('DOMContentLoaded', renderSiteFooter);
