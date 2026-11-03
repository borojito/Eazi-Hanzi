/* Eazi Hanzi — Pie de pagina compartido.
   - Paginas de caracteres: accesos a los otros modulos + boton para empezar con
     caracteres nuevos.
   - Escucha y Orden de trazos: solo un acceso para elegir otra practica.
   Se inyecta segun el data-page del <body>. */

const SITE_PAGES = [
  { id: 'flashcards', href: 'flashcards.html', label: 'Flashcards' },
  { id: 'pinyin', href: 'pinyin.html', label: 'Pinyin y tonos' },
  { id: 'trazos', href: 'trazos.html', label: 'Trazos' },
  { id: 'reto', href: 'reto.html', label: 'Reto' },
];

const STANDALONE_PAGES = ['escucha', 'orden'];

function renderSiteFooter() {
  const current = document.body.dataset.page || '';
  const host = document.getElementById('site-footer');
  if (!host) return;

  if (STANDALONE_PAGES.includes(current)) {
    host.innerHTML =
      '<div class="container site-footer__inner">' +
      '<p class="site-footer__title">¿Quieres practicar otra cosa?</p>' +
      '<div class="site-footer__links"><a href="index.html" class="btn btn-secondary">Elegir otra práctica</a></div>' +
      '</div>';
    return;
  }

  const links = SITE_PAGES.filter((p) => p.id !== current)
    .map((p) => {
      const cls = p.id === 'reto' ? 'btn btn-primary btn-reto' : 'btn btn-secondary';
      return '<a href="' + p.href + '" class="' + cls + '">' + p.label + '</a>';
    })
    .join('');

  // en la pagina de preparar la lista no tiene sentido el boton que lleva a ella
  const restart = current === 'caracteres'
    ? ''
    : '<div class="site-footer__restart">' +
      '<a href="caracteres.html" class="btn btn-ghost">¿Estudiar nuevos caracteres?</a>' +
      '</div>';

  host.innerHTML =
    '<div class="container site-footer__inner">' +
    '<p class="site-footer__title">Seguir repasando…</p>' +
    '<div class="site-footer__links">' + links + '</div>' +
    restart +
    '</div>';
}

document.addEventListener('DOMContentLoaded', renderSiteFooter);
