# 🐭 Eazi Hanzi

Herramienta web para aprender caracteres chinos (hanzi) de forma independiente y sin cuenta: flashcards, pronunciación (pinyin/tonos), trazos y un reto personalizado.

Sitio 100% estático (HTML/CSS/JS), sin backend ni base de datos. Hecho con ayuda de [Claude Code](https://claude.com/claude-code); estilos e ilustraciones apoyados en [Google Stitch](https://stitch.withgoogle.com/).

## ✨ Qué hace

La app **no trae ningún carácter precargado**. En cada sesión, el usuario:

1. Pega en la pantalla de inicio ("Prepárate para aprender") un **prompt copiable** en la IA de su preferencia (ChatGPT, Claude, Gemini, etc.), junto con los caracteres chinos que quiere estudiar.
2. La IA responde en un formato fijo: `caracter | pinyin | significado en español`.
3. El usuario pega esa respuesta en la app, que la interpreta y arma la **lista activa** de la sesión.
4. Esa lista alimenta los 4 módulos de práctica.

No hay diccionario propio ni llamadas a APIs externas de traducción — todo el pinyin y los significados los genera la IA que el usuario ya usa.

## 🧩 Módulos

### Pantalla inicial
Prompt de IA + textarea para pegar la respuesta, botón **Comenzar** (arma la lista activa) y botón **Repaso de complicados** (va directo a Flashcards con los caracteres marcados como difíciles, sin pegar nada nuevo). Incluye un resumen del progreso de la sesión.

### 1. Flashcards
Tarjeta con volteo 3D: el hanzi al frente, pinyin + significado al voltear. Cada carácter aparece una sola vez; el orden puede ser fijo o aleatorio.

### 2. Pinyin (tonos)
Se muestra un carácter y hay que identificar su tono correcto entre las 5 variantes posibles de la misma sílaba (los 4 tonos + neutro), nunca otras palabras de la lista.

### 3. Trazos
Animación de trazo por trazo sobre una cuadrícula guía (田字格), usando [Hanzi Writer](https://github.com/chanind/hanzi-writer). Soporta palabras de varios caracteres (una cuadrícula por carácter) y un modo donde el usuario dibuja y se valida en tiempo real.

### 4. Reto
Modo combinado y siempre aleatorio. El usuario elige el origen (lista de la sesión o caracteres complicados) y uno o varios enfoques: escritura de memoria, tonos o significado. Termina con una pantalla de resultados.

Todos los módulos de práctica comparten:
- Un **nivel de dominio por carácter** ("Necesito seguir estudiando" / "Podría repasar" / "Ya lo sé"), obligatorio antes de avanzar.
- Un panel de **progreso** con insignias de "Ya lo sé" y "Complicados".
- Audio de pronunciación (Web Speech API, voz `zh-CN`).

## 🎨 Diseño

Sistema de diseño propio, **"Warm Vermilion & Rice Paper"**: papel de arroz y caligrafía china tradicional combinados con una interfaz cálida y contemporánea. Bermellón como color primario, ámbar imperial y jade como acentos, tipografías Noto Serif (hanzi/títulos) y Plus Jakarta Sans (UI). Definido en `css/design-system.css`.

## 🗂️ Estructura del proyecto

```
index.html          → Pantalla inicial ("Prepárate para aprender")
flashcards.html      trazos.html      pinyin.html      reto.html
css/
  design-system.css → Variables de diseño (colores, tipografía, radios, sombras)
  home.css / flashcards.css / pinyin.css / trazos.css / reto.css
js/
  parse.js          → Prompt de IA + parseo de la respuesta pegada
  storage.js        → localStorage: lista activa, niveles de dominio, reset
  mastery-ui.js      → Panel de niveles de dominio (compartido)
  progress-panel.js  → Sección "Tu progreso" (compartida)
  order-ui.js        → Switch "En orden / Aleatorio" (compartido)
  speech.js          → Audio de pronunciación
  site-footer.js     → Pie de página compartido
  hanzi-boards.js    → Cuadrículas de Hanzi Writer para palabras multi-carácter
  pinyin-tones.js    → Generación de opciones de tono
  home.js / flashcards.js / pinyin.js / trazos.js / reto.js → lógica de cada pantalla
assets/logo.svg      → Logo (mascota, placeholder)
```

## 💾 Progreso del usuario

Todo se guarda en `localStorage` del navegador, sin cuenta ni login:

- **Lista activa** de la sesión actual.
- **Nivel de dominio** por carácter, compartido entre Flashcards, Pinyin y Trazos.

Al pegar una lista nueva se eliminan los niveles de dominio de caracteres que ya no estén en ella — la app solo trabaja con la sesión activa, no mantiene una biblioteca acumulada entre sesiones. El botón **"Borrar todo y empezar de cero"** (en el inicio) borra todo lo guardado.

## 🚀 Desplegar en GitHub Pages

1. Subir este repositorio a GitHub (puede ser público).
2. Ir a `Settings → Pages` y activar GitHub Pages eligiendo la rama y carpeta de publicación (por ejemplo, `main` / `/root`).
3. GitHub genera una URL pública tipo `usuario.github.io/nombre-repo`.
4. Cada push a la rama configurada actualiza el sitio automáticamente.

No requiere build ni instalación de dependencias: es HTML/CSS/JS plano.

## 🛠️ Stack

- HTML / CSS / JavaScript sin frameworks.
- [Hanzi Writer](https://github.com/chanind/hanzi-writer) para animación y validación de trazos (datos de [Make Me a Hanzi](https://github.com/skishore/makemeahanzi)).
- Web Speech API para audio de pronunciación.
- `localStorage` para persistencia local, sin backend.
