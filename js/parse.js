/* Eazi Hanzi — Parseo de la respuesta de IA en el formato:
   caracter | pinyin | significado en español */

const AI_PROMPT_TEMPLATE = `Actua como un diccionario de chino mandarin. Te voy a dar una lista de caracteres o palabras en chino. Para cada uno dame UNA linea con este formato exacto y nada mas (sin numerar, sin explicaciones, sin markdown, sin lineas en blanco):

caracter | pinyin con marcas de tono | significado breve en español

Reglas del pinyin: usa las marcas de tono (nǐ, hǎo) y separa cada silaba con un espacio (escribe "nǐ hǎo", no "nǐhǎo").

Ejemplo:
你好 | nǐ hǎo | hola

Aqui esta mi lista, respeta el mismo orden:
`;

function buildAIPrompt(rawText) {
  return AI_PROMPT_TEMPLATE + rawText.trim();
}

/* Convierte el texto pegado por el usuario (respuesta de la IA) en una lista de
   caracteres con sus datos. Las lineas que no cumplen el formato esperado se
   marcan como "no encontrado" en vez de descartarse en silencio.
   Se aceptan 4 columnas por compatibilidad con listas viejas (la 4a se ignora). */
function parseAIResponse(text) {
  const lines = (text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const entries = [];
  const seen = new Set();

  lines.forEach((line) => {
    const parts = line.split('|').map((p) => p.trim());
    const usable = parts.slice(0, 3);

    let entry;
    if (parts.length >= 3 && usable.every((p) => p.length > 0)) {
      entry = {
        hanzi: usable[0],
        pinyin: usable[1],
        meaning_es: usable[2],
        resolved: true,
      };
    } else {
      // Formato invalido: se conserva la linea para que el usuario vea que algo fallo,
      // en vez de perder el caracter silenciosamente.
      entry = {
        hanzi: parts[0] || line,
        pinyin: 'no encontrado',
        meaning_es: 'no encontrado',
        resolved: false,
      };
    }

    if (!seen.has(entry.hanzi)) {
      seen.add(entry.hanzi);
      entries.push(entry);
    }
  });

  return entries;
}
