/* Eazi Hanzi — Comparacion de dictado.
   Compara lo que escribio el usuario contra la frase original, caracter por
   caracter, ignorando puntuacion, espacios y letras latinas (solo cuentan los
   caracteres chinos). Usa la subsecuencia comun mas larga (LCS) para que un
   caracter de mas o de menos no marque como error todo lo que viene despues. */

const DICTATION_CJK = /[㐀-䶿一-鿿豈-﫿]/;

function dictationCjkOnly(text) {
  return [...(text || '')].filter((ch) => DICTATION_CJK.test(ch));
}

/* Devuelve:
   {
     correct: boolean,
     wrongTarget: Set<number>   // indices (sobre los caracteres chinos de la frase) marcados mal
     errors: [{ expected, got }]  // expected '' = sobro; got '' = falto
   } */
function compareDictation(target, answer) {
  const T = dictationCjkOnly(target);
  const U = dictationCjkOnly(answer);
  const n = T.length;
  const m = U.length;

  // tabla LCS
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = T[i] === U[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  // pares (i, j) que coinciden
  const matches = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (T[i] === U[j]) {
      matches.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  matches.push([n, m]); // centinela para cerrar el ultimo hueco

  const wrongTarget = new Set();
  const errors = [];
  let prevI = 0;
  let prevJ = 0;
  matches.forEach(([mi, mj]) => {
    if (mi > prevI || mj > prevJ) {
      for (let k = prevI; k < mi; k++) wrongTarget.add(k);
      errors.push({ expected: T.slice(prevI, mi).join(''), got: U.slice(prevJ, mj).join('') });
    }
    prevI = mi + 1;
    prevJ = mj + 1;
  });

  return { correct: errors.length === 0, wrongTarget, errors };
}
