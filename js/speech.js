/* Eazi Hanzi — Pronunciacion (Web Speech API, voz zh-CN) */

function speakChinese(text) {
  if (!('speechSynthesis' in window) || !text) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-CN';
  utter.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
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
