# CLAUDE.md — Eazi Hanzi

Este archivo le da contexto a Claude Code sobre el proyecto. Léelo completo antes de escribir o modificar código.

## Perfil / rol

Actúa como una ingeniera de sistemas frontend con 5 años de experiencia. Prioridades, en este orden:

1. **Que funcione correctamente** antes que nada.
2. **Que se vea pulido y coherente** con el sistema de diseño de este documento — no uses estilos por defecto de librerías (ej. un date picker o un botón sin personalizar); todo debe sentirse parte de la misma marca.
3. **Código limpio y componentizado**: separa por módulo/función, evita archivos gigantes, nombra cosas de forma clara.
4. **Simplicidad sobre sobre-ingeniería**: este es un sitio estático sin backend. Antes de agregar una librería o dependencia nueva, evalúa si realmente hace falta o si se resuelve con HTML/CSS/JS plano.
5. **Responsive real**: no solo "que no se rompa" en mobile — que la experiencia se sienta diseñada para ambos tamaños.

## Qué es este proyecto

Una herramienta web para aprender caracteres chinos (hanzi), con 4 módulos independientes: flashcards, pinyin/tonos, trazos, y un reto personalizado donde el usuario elige sus propios caracteres y en qué enfocarse.

**La app es solo español.** No hay significados en inglés en ninguna parte — se quitaron a propósito. No reintroducir un campo `meaning_en`.

## Stack técnico

- **Sitio estático**: HTML/CSS/JS (sin framework de backend, sin base de datos).
- **Despliegue**: GitHub Pages — repo público, Pages activado desde `Settings → Pages`.
- **Progreso del usuario**: guardado en `localStorage` del navegador (lista activa de sesión, biblioteca de caracteres ya resueltos, nivel de dominio por carácter, resultados de reto). No hay login ni cuentas.
- **Trazos**: librería [Hanzi Writer](https://github.com/chanind/hanzi-writer) (datos de stroke order de [Make Me a Hanzi](https://github.com/skishore/makemeahanzi)). Trae animación por trazo, modo outline, y validación de trazos dibujados a mano — no reinventar esto desde cero.
- **Audio de pronunciación**: Web Speech API (voz `zh-CN`).
- **Sin contenido precargado**: la app no trae ningún carácter "de fábrica". Todo carácter viene del usuario en cada sesión.

## Cómo se generan los datos por carácter (pinyin + significados)

La app **no** tiene un diccionario propio ni llama a APIs externas de traducción. En vez de eso:
1. La pantalla de inicio ("Prepárate para aprender") muestra un **prompt copiable** (`AI_PROMPT_TEMPLATE` en `js/parse.js`) que el usuario pega en la IA de su preferencia (junto con los caracteres que quiere estudiar).
2. La IA responde en un formato fijo: `caracter | pinyin | significado en español` (una línea por palabra/carácter). El parser también acepta una 4ª columna e **ignora** su contenido, para no romper listas generadas con el prompt viejo.
3. El usuario pega esa respuesta en la app; `parseAIResponse()` la interpreta. Una línea que no respeta el formato se marca como **"no encontrado"** en vez de descartarse en silencio.
4. El usuario **nunca** escribe pinyin ni significados a mano.

Si se cambia esta estrategia (ej. por un diccionario tipo CC-CEDICT embebido), actualizar `js/parse.js` y este documento.

## Estructura de la app (pantalla inicial + 4 módulos)

### Inicio (`index.html`) — selector de práctica
Solo pregunta **"¿Qué quieres practicar hoy?"** con 3 tarjetas, una por área, cada una con su color: **Practicar caracteres** (`caracteres.html`, bermellón), **Practicar escucha** (`escucha.html`, naranja caqui) y **Orden de trazos** (`orden.html`, rosa durazno). Los colores viven como `--area-*` en `design-system.css`. El logo de todas las páginas lleva a este inicio. Las áreas de Escucha y Orden de trazos son **independientes**: su barra superior solo tiene "Inicio" (→ `index.html`); la barra "Inicio / Flashcards / Pinyin / Trazos / Reto" es solo de las páginas de caracteres (donde "Inicio" → `caracteres.html`). `mode-sidebar.js` (barra lateral izquierda con las 3 áreas) está en `caracteres.html`, `escucha.html` y `orden.html`.

### Preparar la lista — "Prepárate para aprender" (`caracteres.html`)
(Antes era `index.html`; `data-page="caracteres"`.)
- Textarea con el prompt para IA (copiable) + textarea para pegar la respuesta de la IA.
- Botón **"Comenzar"**: parsea la respuesta y la guarda como lista activa de la sesión (`ehpy.activeList`); esa lista alimenta los 4 módulos.
- Botón **"Repaso de complicados"**: lleva directo a Flashcards en modo repaso (`flashcards.html?review=1`) usando los caracteres en nivel "Necesito seguir estudiando" / "Podría repasar", sin pedir texto nuevo.
- Resumen de progreso ("ya lo sé", complicados).

### 1. Flashcards
- Tarjeta con el hanzi al frente; al voltear muestra pinyin + significado.
- **Volteo 3D**: `perspective` en el escenario (`.fc-stage`) + `preserve-3d` en `.flashcard`, y el `rotateY` en `.flashcard__inner`. ⚠️ **No agregar una animación `@keyframes` de transform al contenedor**: competía con el `transition: transform` del hover sobre la misma propiedad y la tarjeta se congelaba o desaparecía al voltear rápido.
- Panel de niveles a la derecha (ver más abajo) + botón de pronunciación.
- Cada carácter aparece **una sola vez**; el modo aleatorio solo baraja el orden (antes se duplicaban por peso y se repetían).
- Soporta `?review=1` para trabajar sobre los caracteres complicados en vez de la lista activa.

### 2. Pinyin (tonos)
- Se muestra un carácter y las opciones son **la misma sílaba en sus 5 tonos** (ej. para `rén`: rēn / rén / rěn / rèn / ren), nunca otras palabras de la lista. Por eso ya no hace falta un mínimo de caracteres.
- `buildToneOptions` cambia la marca de **una sola vocal** y deja el resto del pinyin intacto. Es clave que funcione **con y sin espacios entre sílabas**: 鸡蛋 puede llegar como `jīdàn`, y al variar la 1ª sílaba la 2ª debe conservar su tono (`jídàn`, no `jidán`). No volver a segmentar por espacios.
- Las opciones van en orden fijo 1-2-3-4-neutro y cada una lleva el color de su tono (`--tone-1` … `--tone-neutral`).
- Audio de apoyo (Web Speech API) + 3 botones de nivel de dominio.
- Soporta `?review=1`.

### 3. Trazos
- Animación trazo por trazo sobre cuadrícula guía (ver sección de diseño: tianzige/mizige).
- **Palabras de varios caracteres**: Hanzi Writer solo dibuja un carácter por instancia, así que se crea **una cuadrícula por carácter** (`js/hanzi-boards.js`). La animación recorre los tableros en secuencia; el quiz los activa todos a la vez.
- Tres modos:
  - **Ver animación**: reproduce el orden de trazos con Hanzi Writer.
  - **Dibujar con ayuda**: quiz de Hanzi Writer con el contorno del carácter visible de fondo (`showOutline: true`), valida trazo por trazo y da pista automática a los 2 fallos.
  - **Dibujar sin ayuda**: dibujo **libre** al estilo drawchinese.com — no es Hanzi Writer. Es una cuadrícula de dibujo propia (`js/handwriting.js`, `createFreehandBoard`) donde el usuario dibuja con el mouse/dedo sin ninguna validación en el camino; al tocar "Reconocer caracter" se manda el trazo al servicio público de reconocimiento de escritura a mano de Google (`inputtools.google.com/request?ime=handwriting`, la misma API que usan herramientas como drawchinese.com/MDBG) y se compara el carácter reconocido contra el real. **Es (junto con el IME de pinyin de la sección Escucha, mismo host) la única dependencia externa de la app** — se eligió a propósito para lograr dibujo verdaderamente libre, algo que Hanzi Writer no permite (siempre valida contra el trazo esperado). Si falla la conexión se muestra un aviso en vez de romper la pantalla.
- **Una sola barra de controles** para los tres modos (había dos botones de reiniciar): reiniciar y audio siempre visibles; reproducir y velocidad solo en modo animación.
- Soporta `?review=1`.

### 4. Reto
- Dos formas de armar el reto: **"Mi lista de esta sesión"** o **"Repasar mis caracteres complicados"** (automático, sin volver a escribir nada).
- Elige uno o varios enfoques: escritura, tonos, significado.
- **Qué se muestra en cada ejercicio** (la pista nunca puede ser la respuesta):
  - *Escritura*: pinyin + significado, **sin el hanzi y sin contorno guía** — se escribe de memoria, dibujo libre (igual que "Dibujar sin ayuda" en Trazos, ver esa sección). Una cuadrícula por carácter, y un botón ámbar "Reconocer caracter" manda el dibujo al reconocedor de escritura.
  - *Tonos*: solo el hanzi; las opciones son los 5 tonos de la sílaba (igual que el módulo de Pinyin).
  - *Significado*: hanzi + pinyin, y se elige el significado.
- **Botón "No la sé, saltar"**: cuenta como fallo, revela la respuesta (en escritura muestra el carácter en la cuadrícula) y pasa a la siguiente.
- **Reconocer correctamente cuenta como acierto** en escritura — no hay conteo de errores de trazo, solo si el reconocimiento coincidió o no.
- El Reto **siempre va en orden aleatorio** (no tiene switch de orden).
- Pantalla de resultados con puntaje y resumen de aciertos/errores.

## Sección "Escucha" — dictado de frases (`escucha.html`)

Segunda área de la app, independiente de la lista de caracteres y de sus módulos (no aparece en el nav de Flashcards…Reto). Se llega desde el inicio o desde la **barra lateral izquierda** (`js/mode-sidebar.js`, `.mode-sidebar`).

- **Tema naranja**: `escucha.css` redefine `--color-primary*` (caqui `#CC5A20`) solo bajo `body[data-page="escucha"]`. Los errores siguen en rojo (`--color-danger`).
- **Frases**: textarea "Escribe tus frases en chino solamente", una por línea (borrador en `ehpy.listening.draft`, lo borra `resetApp`). Líneas sin caracteres chinos se ignoran. No usan `activeList` ni niveles de dominio.
- **Dictado**: altavoz grande en el centro → reproduce una frase aleatoria (cada frase sale una vez por ronda) y recién entonces aparecen las 3 formas de responder:
  1. **Teclado (pinyin)**: se escribe pinyin sin tonos y salen candidatos de caracteres (`js/pinyin-ime.js`, Google Input Tools — misma dependencia externa que el reconocimiento de escritura; usa `matched_length` para consumir solo lo elegido). Teclas 1–9 / espacio eligen.
  2. **Dibujar**: un `createFreehandBoard` + "Reconocer caracter"; se elige entre los candidatos y se agrega a la respuesta.
  3. **En papel**: se muestra la frase y la usuaria toca los caracteres donde se equivocó.
- **Revisión** (`js/dictation-diff.js`, `compareDictation`): LCS sobre solo los caracteres chinos (ignora puntuación). La frase sale grande con los errores en rojo + una fila por error ("Pusiste «X» · Debía ser «Y» / Te faltó / Te sobró").
- **Resultados**: porcentaje de frases sin errores y botón "Intentar nuevamente con las que fallé" (misma mecánica, solo con las falladas).
- **Deshacer / Ctrl+Z**: todo `createFreehandBoard` (Trazos "sin ayuda", Reto escritura y Escucha) trae un botón ↶ y atiende Ctrl+Z sobre el último tablero tocado. El quiz de Hanzi Writer ("con ayuda") no lo tiene.

## Sección "Orden de trazos" (`orden.html`)

Consulta libre, sin lista ni niveles, área independiente con **tema rosa durazno** (`--area-orden*`, fondo cálido amarillento, solo bajo `body[data-page="orden"]`). La barra lateral tiene 3 entradas: Practicar caracteres / Practicar escucha / Orden de trazos ("caracteres", no "letras"). **Velocidad**: rango 0.25x–3x y `hanziSpeedOptions()` (en `hanzi-boards.js`) escala también la pausa entre trazos; se aplica en vivo con `updateOptions` y el evento `input` (también en Trazos). Antes, rango 0.5–2 con pausa fija casi no se notaba. Se escribe cualquier palabra en chino (máx. 12 caracteres) y debajo sale una cuadrícula de Hanzi Writer por carácter, con pinyin, número de trazos, reproducir/pausar, reiniciar, audio y velocidad. **Al pasar el mouse (o tocar) una cuadrícula se anima solo ese carácter.** El pinyin sale de **pinyin-pro** (CDN jsDelivr fijo en 3.26.0; se calcula por tramo para resolver lecturas como 银行/行走) — segunda librería externa de la app, evaluada porque Hanzi Writer no trae pinyin y no hay diccionario propio.

Escucha también tiene el `.order-switch` "En orden / Aleatorio" (comparte `ehpy.randomOrder`).

## Orden de práctica (aleatorio vs. lista)

Las 3 pantallas de práctica (Flashcards, Pinyin, Trazos) tienen un `.order-switch` ("En orden" / "Aleatorio"). La preferencia se guarda en `ehpy.randomOrder` y **se comparte entre esas pantallas**. Lógica compartida en `js/order-ui.js` (incluye `shuffleArray`, el único shuffle del proyecto). El Reto no usa esta preferencia: siempre baraja.

## La memoria de la app = la sesión activa

La app **solo** maneja los caracteres de la lista pegada en la pantalla inicial. Al guardar una lista nueva (`saveActiveList`) se **borran los niveles de dominio de caracteres que no estén en ella** (`pruneMasteryToList`). Por eso:

- El repaso de complicados y los contadores del inicio salen siempre de la lista activa, nunca de sesiones viejas.
- No existe una "biblioteca" de caracteres entre sesiones (se eliminó; `storage.js` limpia la clave vieja `ehpy.library` al cargar).

Si en el futuro se quiere historial entre sesiones, hay que rediseñarlo explícitamente — hoy es intencional que no lo haya.

## Nivel de dominio (compartido entre Flashcards, Pinyin y Trazos)

Cada carácter tiene **un solo nivel**, el más reciente, guardado en `localStorage` (`ehpy.mastery`) y compartido por los tres módulos de práctica (no hay un nivel distinto por módulo):
1. **"Necesito seguir estudiando"**
2. **"Podría repasar"**
3. **"Ya lo sé"**

Los niveles 1 y 2 son los que arma automáticamente el "Repaso de complicados" (home y Reto).

**Marcar el nivel es obligatorio solo para avanzar**: en Flashcards, Pinyin y Trazos no se puede pasar al *siguiente* carácter sin elegir uno de los 3 niveles. Mientras esté pendiente, el botón "Siguiente" queda deshabilitado, aparece un `.nav-hint` y el panel se resalta (`.mastery-panel.is-required`). En Pinyin además hay que haber respondido la pregunta. Un carácter ya calificado en una pasada anterior no vuelve a pedirlo (`isRated()` en `storage.js`). El botón **"Anterior" no requiere marcar el carácter actual**, pero sí exige que el carácter al que se volvería ya esté categorizado — si no, queda deshabilitado. Sin este límite se podría "devolver" infinito dando vueltas sobre el orden circular sin marcar nada.

Se renderizan con `renderMasteryPanel()` (`js/mastery-ui.js`) como un **panel a la derecha** del área de práctica (`.practice-layout`, que en desktop es de 2 columnas y en móvil apila). Cada cajita muestra **el conteo** de caracteres de la lista en ese nivel, y al elegir una, un clon del carácter **vuela hasta la cajita** (Web Animations API) y la cajita rebota.

## Sección "Tu progreso" (compartida)

`js/progress-panel.js` renderiza la sección dentro de `<section id="progress-panel">`. Va en el **inicio y al final de Flashcards, Pinyin y Trazos** — **no en el Reto**, que tiene su propia forma de elegir origen.

- Insignias: **"Ya lo sé"** y **"Complicados"**, que son botones: al tocarlos despliegan la **lista de sus caracteres** (hanzi, chip de tono, significado, etiqueta de nivel y botón de audio).
- **No hay racha / streak.** Se quitó por completo (insignia, `getStreak`, `registerActivityToday` y la clave `ehpy.streak`); no reintroducirla.
- Solo un grupo abierto a la vez; el estado (`progressOpenGroup`) se conserva entre re-renders.
- Ahí vive también el botón **"Repaso de complicados"**, deshabilitado cuando no hay ninguno.
- Los módulos llaman `renderProgressPanel()` al marcar un nivel para que los conteos no queden viejos.
- Como todo lo demás, las listas salen **solo de la sesión activa** (`getCharsByLevel`, `getStrugglingCharsData`).

## Otros elementos compartidos

- `js/speech.js` — `speakChinese()` y `createAudioButton()`. Hay botón de audio en los 4 módulos.
- `js/site-footer.js` — en las páginas de caracteres inyecta el pie "Seguir repasando…" con accesos a los otros módulos (según el `data-page` del `<body>`) y el botón "¿Estudiar nuevos caracteres?" que vuelve a `caracteres.html`; en Escucha y Orden de trazos solo "Elegir otra práctica" (→ `index.html`).
- `resetApp()` en `storage.js` borra **todo** lo guardado; el botón vive en el inicio ("Borrar todo y empezar de cero").
- El Reto va destacado en rojo (`.module-card--reto` en el inicio, `.btn-reto` en el pie).
- **No hay pista / rayos X en ningún módulo** — se quitó a propósito.

## Modelo de datos por carácter

Cada entrada de la lista activa / biblioteca tiene esta forma (generada automáticamente vía el prompt de IA, ver arriba):

```json
{
  "hanzi": "你好",
  "pinyin": "nǐ hǎo",
  "meaning_es": "hola",
  "resolved": true
}
```

El stroke order real lo provee Hanzi Writer/Make Me a Hanzi a partir del carácter — no hay que almacenarlo manualmente.

## Sistema de diseño — "Warm Vermilion & Rice Paper"

Estética que combina papel de arroz y caligrafía china tradicional con una interfaz cálida y contemporánea.

### Variables CSS (usar como fuente de verdad, no hardcodear hex sueltos en los componentes)

```css
:root {
  /* Colores base */
  --color-primary: #C22F2F;        /* Bermellón — botones, trazo activo, acentos */
  --color-primary-hover: #B82525;
  --color-primary-active: #9E1B1B;
  --color-secondary: #D4A359;      /* Ámbar imperial — pistas, mastery */
  --color-tertiary: #3B7A57;       /* Jade — aciertos, progreso, rachas */

  --color-text: #1E1B18;           /* Tinta de hollín de pino */
  --color-text-secondary: #4A433E;
  --color-text-muted: #8A827A;

  --color-bg: #FBF7F0;             /* Pergamino base */
  --color-surface: #FFFDF9;        /* Papel Xuan — tarjetas */
  --color-surface-sunken: #F5EFEB; /* Área de práctica de trazos */
  --color-border: #EADECE;

  /* Tonos de pinyin */
  --tone-1: #C22F2F; /* bermellón */
  --tone-2: #D4A359; /* ámbar */
  --tone-3: #3B7A57; /* jade */
  --tone-4: #7A3B69; /* ciruela */
  --tone-neutral: #8A827A; /* pizarra */

  /* Tipografía */
  --font-serif: 'Noto Serif', serif;      /* hanzi, títulos */
  --font-sans: 'Plus Jakarta Sans', sans-serif; /* UI, pinyin, cuerpo */

  /* Radios y sombras */
  --radius-card: 1rem;
  --radius-btn: 0.75rem;
  --radius-pill: 9999px;
  --shadow-card: 0 2px 8px -1px rgba(65,48,30,0.05), 0 1px 3px 0 rgba(65,48,30,0.03);
  --shadow-card-hover: 0 8px 24px -4px rgba(65,48,30,0.08), 0 3px 6px -2px rgba(65,48,30,0.04);
}
```

### Componentes clave

- **Tarjetas**: fondo `--color-surface`, borde `1px solid --color-border`, `--radius-card`, `--shadow-card`. Al interactuar, sube a `--shadow-card-hover`.
- **Botón primario**: fondo `--color-primary`, texto blanco, `--radius-btn`, hover `--color-primary-hover`, active `--color-primary-active`.
- **Botón secundario**: fondo `--color-surface-sunken`, borde sutil `--color-border`, texto `--color-text`.
- **Área de trazos**: cuadrado (320px mobile / 440px desktop), fondo `--color-surface-sunken`, líneas guía tianzige/mizige punteadas en ámbar muy tenue (`rgba(212,163,89,0.35)`).
- **Insignias de progreso**: cuadrado con esquinas casi rectas (3-4px de radio), estilo sello de tinta estampado.
- **Chips de tono**: pill (`--radius-pill`) con el color de `--tone-1` a `--tone-neutral` según corresponda.
- **Carácter protagonista**: `--font-serif`, 100px desktop / 68px mobile (`.hanzi-display--hero`). Pinyin (`.tone-chip`) y significado también se mantienen grandes y legibles en los 4 módulos y en las listas de "Tu progreso" — no volver a los tamaños pequeños de UI genérica.

### Layout

- Grid: 12 columnas desktop, 8 tablet, 4 mobile.
- Espaciado generoso entre secciones (~48px) — evitar que se sienta apretado.
- Responsive en los 4 módulos.

## Marca

- **Nombre**: **Eazi Hanzi** (se quitó "Peng You").
- **Wordmark**: solo el logo + el texto "Eazi Hanzi" en `--font-serif`, rojo oscuro (`--color-primary-active`). **Sin caracteres chinos en el header.** Markup compartido en el `.brand` de las 5 páginas.
- **Logo**: ratita con traje chino tradicional rojo/dorado, sosteniendo un pincel de caligrafía, estilo ilustración de línea limpia, enmarcada en cápsula con borde rojo salmón (`assets/logo.svg`). Gira levemente al pasar el mouse.

## Despliegue

1. Repositorio en GitHub con los archivos del proyecto.
2. `Settings → Pages` → activar, eligiendo rama/carpeta de publicación.
3. URL pública tipo `usuario.github.io/nombre-repo`.
4. Cada push a la rama configurada actualiza el sitio automáticamente.

## Estado actual / próximos pasos

- [x] Construir estructura base (pantalla inicial + 4 módulos).
- [x] Integrar Hanzi Writer en el módulo de Trazos ("Ver animación" y "Dibujar con ayuda").
- [x] Dibujo libre + reconocimiento de escritura (Google handwriting) en "Dibujar sin ayuda" (Trazos) y en el enfoque "Escritura" del Reto.
- [x] Implementar guardado de progreso en localStorage (`js/storage.js`).
- [x] Quitar todo contenido precargado — la app arranca vacía, el usuario pega su propia lista.
- [x] Pantalla "Prepárate para aprender" con prompt de IA + parseo de la respuesta (`js/parse.js`).
- [x] Sistema de 3 niveles de dominio compartido entre Flashcards, Pinyin y Trazos (`js/mastery-ui.js`).
- [x] Reto con las dos opciones de origen (lista de sesión / caracteres complicados).
- [x] Marca: solo logo + "Eazi Hanzi" (sin "Peng You" y sin caracteres chinos en el header).
- [x] Botones de nivel a color + animaciones, volteo 3D de flashcards.
- [x] La app solo maneja los caracteres de la sesión activa (se purga lo viejo).
- [x] Reto: botón de saltar, siempre aleatorio, sin conteo de errores de trazo, con audio.
- [x] Panel de niveles a la derecha con conteo + animación del carácter volando a la cajita.
- [x] Pie de página compartido ("Seguir repasando…") y botón de borrar todo.
- [x] Fix: tonos de palabras de 2+ sílabas sin espacios (鸡蛋), aleatorio sin repetir, volteo de flashcards.
- [x] Opciones de tono reales (5 tonos de la misma sílaba) en Pinyin y en el Reto.
- [x] Soporte de palabras de varios caracteres (una cuadrícula por carácter) en Trazos y Reto.
- [x] Escritura de memoria en el Reto (sin contorno guía) y orden aleatorio en todas las pantallas.
- [ ] Reemplazar el logo SVG placeholder por la ilustración final de la mascota.
- [ ] Desplegar a GitHub Pages.

## Historia del proyecto (contexto, no estado actual)

Antes de esta versión hubo dos documentos de planteamiento (`planteamiento-herramienta-chino.md` y `CORRECCIONES.md`, ya eliminados una vez incorporados aquí) que registran cómo evolucionó el proyecto. Se deja el resumen como contexto histórico — **nada de esto describe el comportamiento actual**, que es el que documenta el resto de este archivo:

- **Planteamiento original**: la app se llamaba **"Eazi Hanzi Peng You"** (de "easy" + 汉字 hanzi + 朋友 péngyou, "amigo"), con caracteres chinos en el header. Se simplificó a **"Eazi Hanzi"** sin caracteres chinos en la marca (ver sección "Marca").
- **Significados en dos idiomas**: la idea inicial incluía significado en español **e inglés** por carácter (`meaning_en`), pensando en un diccionario tipo CC-CEDICT embebido. Se descartó: la app es solo español y los datos se generan vía prompt de IA copiable, no vía diccionario propio (ver "Cómo se generan los datos por carácter").
- **Primera versión construida traía caracteres de ejemplo precargados** (contenido "de fábrica"). Se corrigió a propósito: la app arranca vacía y el usuario pega su propia lista cada sesión (ver "Sin contenido precargado").
- **Racha / streak de progreso**: llegó a estar en el diseño de progreso y luego se quitó por completo (insignia, `getStreak`, `registerActivityToday`, clave `ehpy.streak`). No reintroducirla (ver "Sección 'Tu progreso'").
- **Flashcards con repetición espaciada** y **niveles distintos por módulo** ("aprendida" / "por repasar" solo en Flashcards) fueron ideas tempranas, reemplazadas por el sistema único de 3 niveles de dominio compartido entre Flashcards, Pinyin y Trazos.
- El nombre del sistema de diseño ("Warm Vermilion & Rice Paper") y su paleta de colores se mantuvieron estables desde el planteamiento original hasta hoy.
