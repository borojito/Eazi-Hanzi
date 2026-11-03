/* Eazi Hanzi — Candidatos de caracteres a partir de pinyin escrito.
   Igual que el reconocimiento de escritura (js/handwriting.js), usa el servicio
   publico de Google Input Tools: no hay diccionario propio. Se escribe pinyin sin
   tonos ("woxihuanzhongwen") y devuelve varias opciones de caracteres. */

const PINYIN_IME_URL = 'https://inputtools.google.com/request?itc=zh-t-i0-pinyin&num=9&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage&text=';

/* Devuelve [{ text, consumed }] (consumed = cuantas letras de pinyin cubre esa
   opcion), [] si no hay coincidencias, o null si fallo la conexion. */
async function fetchPinyinCandidates(pinyin) {
  const query = (pinyin || '').trim().toLowerCase();
  if (!query) return [];
  try {
    const res = await fetch(PINYIN_IME_URL + encodeURIComponent(query));
    if (!res.ok) return null;
    const data = await res.json();
    if (data[0] !== 'SUCCESS' || !data[1] || !data[1][0]) return [];
    const words = data[1][0][1] || [];
    const meta = data[1][0][3] || {};
    const lengths = meta.matched_length || [];
    return words.map((text, i) => ({
      text,
      consumed: typeof lengths[i] === 'number' ? lengths[i] : query.length,
    }));
  } catch (err) {
    return null;
  }
}
