/**
 * @file Reduccion de texto para las estadisticas del idioma.
 *
 * Los bigramas y la lista de palabras se cuentan sobre una version simplificada
 * del español: minusculas, sin tildes (pero con Ñ), y con todo lo que no sea
 * letra convertido en espacio. Asi la tabla es chica y la verificacion funciona
 * igual aunque el texto venga con puntuacion o mayusculas raras.
 *
 * Ojo: `scripts/generar-tablas.mjs` repite esta misma logica en vez de importar
 * este archivo, porque el script corre ANTES de que existan los JSON de datos y
 * necesita poder correr sin ellos. Si se cambia una, hay que cambiar la otra.
 */

/** [TX-01] Letras del español en minusculas, mas el espacio. */
export const LETRAS_Y_ESPACIO = 'abcdefghijklmnñopqrstuvwxyz '

const PERMITIDAS = new Set(Array.from(LETRAS_Y_ESPACIO))

/**
 * [TX-02] Quita tildes y dieresis pero conserva la Ñ.
 *
 * Descompone (NFD) y borra solo el acento agudo (U+0301) y la dieresis
 * (U+0308). La virgulilla de la Ñ es U+0303 y se deja: borrar todas las marcas
 * convertiria "ñ" en "n" y el español perderia una letra que sí cuenta.
 *
 * @param {string} texto
 * @returns {string}
 */
export function quitarTildes(texto) {
  return texto.normalize('NFD').replace(/[́̈]/g, '').normalize('NFC')
}

/**
 * [TX-03] Deja el texto en minusculas, sin tildes y con solo letras y espacios simples.
 *
 * @param {string} texto
 * @returns {string} Texto reducido, sin espacios repetidos ni al inicio o final.
 */
export function reducir(texto) {
  return Array.from(quitarTildes(String(texto).toLowerCase()))
    .map((caracter) => (PERMITIDAS.has(caracter) ? caracter : ' '))
    .join('')
    .replace(/ {2,}/g, ' ')
    .trim()
}

/**
 * [TX-04] Pares de caracteres consecutivos del texto reducido.
 *
 * @param {string} texto
 * @returns {string[]} Lista de bigramas; vacia si el texto reducido es muy corto.
 */
export function bigramasDe(texto) {
  const reducido = reducir(texto)
  const pares = []
  for (let i = 0; i < reducido.length - 1; i += 1) {
    pares.push(reducido.slice(i, i + 2))
  }
  return pares
}

/**
 * [TX-05] Palabras del texto reducido, de 2 a 20 caracteres.
 *
 * @param {string} texto
 * @returns {string[]}
 */
export function palabrasDe(texto) {
  return reducir(texto)
    .split(' ')
    .filter((palabra) => palabra.length >= 2 && palabra.length <= 20)
}
