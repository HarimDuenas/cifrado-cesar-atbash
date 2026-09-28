/**
 * @file Reduccion del texto para medir el idioma: minusculas, sin tildes, con Ñ.
 * `scripts/generar-tablas.mjs` repite esta logica: si cambia una, cambia la otra.
 */

/** [TX-01] */
export const LETRAS_Y_ESPACIO = 'abcdefghijklmnñopqrstuvwxyz '

const PERMITIDAS = new Set(Array.from(LETRAS_Y_ESPACIO))

/**
 * [TX-02]
 * @param {string} texto
 * @returns {string}
 */
export function quitarTildes(texto) {
  // Solo acento agudo y dieresis; la tilde de la Ñ (U+0303) se queda.
  return texto.normalize('NFD').replace(/[\u0301\u0308]/g, '').normalize('NFC')
}

/**
 * [TX-03]
 * @param {string} texto
 * @returns {string}
 */
export function reducir(texto) {
  return Array.from(quitarTildes(String(texto).toLowerCase()))
    .map((caracter) => (PERMITIDAS.has(caracter) ? caracter : ' '))
    .join('')
    .replace(/ {2,}/g, ' ')
    .trim()
}

/**
 * [TX-04]
 * @param {string} texto
 * @returns {string[]}
 */
export function bigramasDe(texto) {
  const reducido = reducir(texto)
  const pares = []
  for (let i = 0; i < reducido.length - 1; i += 1) {
    pares.push(reducido.slice(i, i + 2))
  }
  return pares
}

const PUNTUACION_ESPAÑOLA = new Set(Array.from('0123456789.,;:¿?¡!"\'()-«»'))

/**
 * [TX-06]
 * @param {string} texto
 * @returns {number} Entre 0 y 1; un texto vacio da 0.
 */
export function legibilidad(texto) {
  const caracteres = Array.from(String(texto))
  if (caracteres.length === 0) return 0
  let legibles = 0
  for (const caracter of caracteres) {
    const simple = quitarTildes(caracter.toLowerCase())
    if (PERMITIDAS.has(simple) || /\s/.test(caracter) || PUNTUACION_ESPAÑOLA.has(caracter)) {
      legibles += 1
    }
  }
  return legibles / caracteres.length
}

/**
 * [TX-05]
 * @param {string} texto
 * @returns {string[]} Palabras de 2 a 20 caracteres.
 */
export function palabrasDe(texto) {
  return reducir(texto)
    .split(' ')
    .filter((palabra) => palabra.length >= 2 && palabra.length <= 20)
}
