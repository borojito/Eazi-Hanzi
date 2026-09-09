/* Eazi Hanzi — Pronunciacion (Web Speech API, voz zh-CN) */

/* Algunos navegadores (Chrome/Edge) cargan la lista de voces de forma asincrona:
   si se pide la voz zh-CN antes de que esten listas, la busqueda falla en silencio.
   Se dispara la carga apenas se puede y se escucha el evento de cambio. */
if ('speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

function getChineseVoice() {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang === 'zh-CN') || voices.find((v) => v.lang && v.lang.startsWith('zh')) || null;
}

function speakChinese(text) {
  if (!('speechSynthesis' in window) || !text) return;
  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-CN';
  utter.rate = 0.85;
  const voice = getChineseVoice();
  if (voice) utter.voice = voice;

  synth.cancel();
  // Bug conocido de Chrome/Edge: speak() llamado justo despues de cancel() en el
  // mismo tick a veces se pierde. Un pequeno delay evita que el audio no suene.
  setTimeout(() => synth.speak(utter), 50);
}

/* Boton de audio reutilizable */
function createAudioButton(getText) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-seal audio-btn';
  btn.title = 'Escuchar pronunciacion';
  btn.setAttribute('aria-label', 'Escuchar pronunciacion');
  btn.innerHTML = '&#128266;';
  btn.addEventListener('click', () => speakChinese(getText()));
  return btn;
}
