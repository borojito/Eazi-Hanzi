/* Eazi Hanzi — Utilidades de tonos del pinyin
   Generan las 5 variantes tonales de UNA silaba de la palabra
   (ren / rēn / rén / rěn / rèn) en vez de comparar contra otras palabras. */

const TONE_VOWELS = {
  a: ['a', 'ā', 'á', 'ǎ', 'à'],
  e: ['e', 'ē', 'é', 'ě', 'è'],
  i: ['i', 'ī', 'í', 'ǐ', 'ì'],
  o: ['o', 'ō', 'ó', 'ǒ', 'ò'],
  u: ['u', 'ū', 'ú', 'ǔ', 'ù'],
  'ü': ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

/* Mapa inverso: vocal marcada -> { base, tone } */
const MARKED_VOWELS = {};
Object.keys(TONE_VOWELS).forEach((base) => {
  TONE_VOWELS[base].forEach((ch, tone) => {
    MARKED_VOWELS[ch] = { base, tone };
  });
});

/* Tono de la primera silaba marcada — se usa para colorear los chips de tono.
   Devuelve 1-4, o 0 si es neutro. */
function getToneFromPinyin(pinyin) {
  for (const ch of pinyin || '') {
    const info = MARKED_VOWELS[ch];
    if (info && info.tone > 0) return info.tone;
  }
  return 0;
}

/* Posiciones de las vocales que YA llevan marca tonal.
   Cada una identifica una silaba con tono (jīdàn -> la ī y la à). */
function markedVowelIndexes(word) {
  const found = [];
  [...word].forEach((ch, i) => {
    const info = MARKED_VOWELS[ch];
    if (info && info.tone > 0) found.push(i);
  });
  return found;
}

/* Para palabras sin ninguna marca (todo neutro): donde iria la marca segun
   las reglas del pinyin — si hay 'a' se marca esa; si no, la 'o' o la 'e';
   si no, la ultima vocal. */
function neutralToneTargetIndex(word) {
  const chars = [...word];
  const lower = word.toLowerCase();

  let target = lower.indexOf('a');
  if (target === -1) {
    const o = lower.indexOf('o');
    const e = lower.indexOf('e');
    if (o !== -1 && e !== -1) target = Math.min(o, e);
    else if (o !== -1) target = o;
    else if (e !== -1) target = e;
  }
  if (target === -1) {
    for (let i = chars.length - 1; i >= 0; i--) {
      if (TONE_VOWELS[chars[i].toLowerCase()]) { target = i; break; }
    }
  }
  return target;
}

/* Devuelve las 5 opciones tonales de una palabra cambiando la marca de UNA
   sola vocal y dejando el resto del pinyin intacto. Asi 鸡蛋 (jīdàn) genera
   jidàn / jīdàn / jídàn / jǐdàn / jìdàn — la segunda silaba conserva su tono,
   funcione o no con espacios entre silabas.
   Formato: [{ text, tone, isCorrect }] en orden 1, 2, 3, 4, neutro.
   Devuelve [] si no hay ninguna vocal que marcar. */
function buildToneOptions(pinyin) {
  const word = (pinyin || '').trim();
  if (!word) return [];

  const chars = [...word];
  const marked = markedVowelIndexes(word);

  // Se varia una silaba que ya tenga tono; si no hay ninguna, la del tono neutro.
  const target = marked.length > 0
    ? marked[Math.floor(Math.random() * marked.length)]
    : neutralToneTargetIndex(word);

  if (target === -1) return [];

  const info = MARKED_VOWELS[chars[target]];
  const baseVowel = info ? info.base : chars[target].toLowerCase();
  if (!TONE_VOWELS[baseVowel]) return [];

  const correctTone = info ? info.tone : 0;

  const options = [1, 2, 3, 4, 0].map((tone) => {
    const variant = chars.slice();
    variant[target] = TONE_VOWELS[baseVowel][tone];
    return { text: variant.join(''), tone, isCorrect: tone === correctTone };
  });

  // Seguridad: las 5 opciones deben poder distinguirse entre si.
  if (new Set(options.map((o) => o.text)).size < options.length) return [];

  return options;
}
