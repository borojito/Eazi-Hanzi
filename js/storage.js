/* Eazi Hanzi Peng You — Persistencia en localStorage */

const STORAGE_KEYS = {
  activeList: 'ehpy.activeList', // lista de palabras/caracteres de la sesion activa
  mastery: 'ehpy.mastery',       // nivel de dominio por caracter, compartido entre modulos
  retoResults: 'ehpy.reto.results',
  randomOrder: 'ehpy.randomOrder', // practicar en orden de la lista o aleatorio
};

/* Niveles de dominio (compartidos por Flashcards, Pinyin y Trazos) */
const MASTERY_LEVELS = {
  STUDYING: 1, // "Necesito seguir estudiando"
  REVIEW: 2,   // "Podría repasar"
  KNOWN: 3,    // "Ya lo sé"
};

const MASTERY_LABELS = {
  1: 'Necesito seguir estudiando',
  2: 'Podría repasar',
  3: 'Ya lo sé',
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* almacenamiento no disponible; se ignora silenciosamente */
  }
}

/* ---------- Lista activa de la sesion ---------- */
/* Cada entrada: { hanzi, pinyin, meaning_es, resolved: boolean } */

function getActiveList() {
  return readJSON(STORAGE_KEYS.activeList, []);
}

/* Al iniciar una sesion nueva la app se queda SOLO con esos caracteres:
   se borran los niveles de caracteres de sesiones anteriores para que no
   reaparezcan en el repaso ni en los contadores. */
function saveActiveList(list) {
  writeJSON(STORAGE_KEYS.activeList, list);
  pruneMasteryToList(list);
}

function pruneMasteryToList(list) {
  const allowed = new Set(list.map((c) => c.hanzi));
  const map = getMasteryMap();
  let changed = false;
  Object.keys(map).forEach((hanzi) => {
    if (!allowed.has(hanzi)) {
      delete map[hanzi];
      changed = true;
    }
  });
  if (changed) writeJSON(STORAGE_KEYS.mastery, map);
}

/* ---------- Nivel de dominio ---------- */
/* Estructura: { "你好": { level: 1|2|3, updatedAt: ts } } */

function getMasteryMap() {
  return readJSON(STORAGE_KEYS.mastery, {});
}

function getMasteryLevel(hanzi) {
  const map = getMasteryMap();
  return map[hanzi] ? map[hanzi].level : null;
}

/* Un caracter esta "calificado" si ya tiene nivel elegido.
   Es obligatorio antes de pasar al siguiente. */
function isRated(hanzi) {
  return getMasteryLevel(hanzi) !== null;
}

function setMasteryLevel(hanzi, level) {
  const map = getMasteryMap();
  map[hanzi] = { level, updatedAt: Date.now() };
  writeJSON(STORAGE_KEYS.mastery, map);
}

/* Caracteres complicados ("Necesito seguir estudiando" o "Podria repasar").
   Siempre salen de la lista de la sesion activa — nunca de sesiones viejas. */
function getStrugglingCharsData() {
  const map = getMasteryMap();
  return getActiveList().filter((c) => {
    if (!c.resolved || !map[c.hanzi]) return false;
    const level = map[c.hanzi].level;
    return level === MASTERY_LEVELS.STUDYING || level === MASTERY_LEVELS.REVIEW;
  });
}

function getStrugglingChars() {
  return getStrugglingCharsData().map((c) => c.hanzi);
}

/* Caracteres de la sesion activa que estan en un nivel concreto */
function getCharsByLevel(level) {
  const map = getMasteryMap();
  return getActiveList().filter(
    (c) => c.resolved && map[c.hanzi] && map[c.hanzi].level === level
  );
}

function getKnownCharsData() {
  return getCharsByLevel(MASTERY_LEVELS.KNOWN);
}

function getKnownCount() {
  return getKnownCharsData().length;
}

/* ---------- Preferencia de orden (compartida entre modulos) ---------- */

function getRandomOrder() {
  return readJSON(STORAGE_KEYS.randomOrder, false) === true;
}

function setRandomOrder(isRandom) {
  writeJSON(STORAGE_KEYS.randomOrder, isRandom === true);
}

/* ---------- Reto ---------- */

function saveRetoResult(result) {
  const results = readJSON(STORAGE_KEYS.retoResults, []);
  results.unshift({ ...result, date: Date.now() });
  writeJSON(STORAGE_KEYS.retoResults, results.slice(0, 20));
}

function getRetoResults() {
  return readJSON(STORAGE_KEYS.retoResults, []);
}

/* ---------- Reinicio total ---------- */

/* Borra todo lo guardado por la app en este navegador */
function resetApp() {
  Object.values(STORAGE_KEYS).forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      /* almacenamiento no disponible */
    }
  });
}

/* Limpieza de datos de versiones anteriores:
   - ehpy.library: la biblioteca entre sesiones ya no existe, la app trabaja
     solo con los caracteres de la sesion activa.
   - ehpy.streak: la racha se quito de la app. */
['ehpy.library', 'ehpy.streak'].forEach((key) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    /* almacenamiento no disponible */
  }
});
