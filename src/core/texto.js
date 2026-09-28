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

/** Lo que puede aparecer en un texto en español ademas de letras y espacios. */
const PUNTUACION_ESPAÑOLA = new Set(Array.from('0123456789.,;:¿?¡!"\'()-«»'))

/**
 * [TX-06] Que proporcion del texto se puede leer como español.
 *
 * `reducir` convierte en espacio todo lo que no es letra, y eso esta bien para
 * contar bigramas, pero esconde un problema: con un alfabeto de cientos de
 * simbolos, un descifrado equivocado sale lleno de simbolos raros, `reducir`
 * los borra y lo poco que queda ("so", "de") parece español. Esta medida si
 * los cuenta: letras (con o sin tilde, con Ñ), digitos, espacios y puntuacion
 * cuentan como legibles; "⓪", "☿" o "Ж" no.
 *
 * @param {string} texto
 * @returns {number} Entre 0 y 1. Un texto vacio da 0.
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
