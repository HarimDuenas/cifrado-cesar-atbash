/**
 * @file Alfabeto: define N y el indice de cada simbolo.
 */

/** [AL-01] */
export const ASCII_IMPRIMIBLE = Array.from(
  { length: 95 },
  (_, i) => String.fromCharCode(32 + i),
).join('')

/** [AL-02] */
export const ESPANOL_MAYUSCULAS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'

/** [AL-03] */
export const PRESETS = Object.freeze({
  asciiImprimible: Object.freeze({
    id: 'asciiImprimible',
    nombre: 'ASCII imprimible (32-126)',
    simbolos: ASCII_IMPRIMIBLE,
  }),
  espanolMayusculas: Object.freeze({
    id: 'espanolMayusculas',
    nombre: 'A-Z con Ñ',
    simbolos: ESPANOL_MAYUSCULAS,
  }),
})

/**
 * [AL-04]
 * @param {number} a
 * @param {number} m Mayor que 0.
 * @returns {number} Residuo en [0, m).
 */
export function modulo(a, m) {
  // % de JS conserva el signo: -3 % 26 da -3.
  return ((a % m) + m) % m
}

/**
 * @typedef {object} Alfabeto
 * @property {readonly string[]} simbolos Uno por code point.
 * @property {number} n Modulo aritmetico.
 * @property {(simbolo: string) => number} indiceDe -1 si no pertenece.
 * @property {(indice: number) => string} simboloEn El indice se toma modulo N.
 * @property {() => string} toString
 */

/**
 * [AL-05]
 * @param {string | Iterable<string>} entrada
 * @param {object} [opciones]
 * @param {boolean} [opciones.normalizar=true] Normaliza a NFC.
 * @returns {Alfabeto}
 * @throws {Error} Menos de 2 simbolos o simbolos repetidos.
 * @example
 * crearAlfabeto(ASCII_IMPRIMIBLE).n  // 95
 */
export function crearAlfabeto(entrada, { normalizar = true } = {}) {
  // NFC antes de separar: si no, "n" + tilde combinable cuenta como dos simbolos.
  const fuente = typeof entrada === 'string'
    ? entrada
    : Array.from(entrada ?? []).join('')

  const simbolos = Array.from(normalizar ? fuente.normalize('NFC') : fuente)

  if (simbolos.length < 2) {
    throw new Error(
      `El alfabeto necesita al menos 2 simbolos para que el cifrado tenga sentido, y recibio ${simbolos.length}.`,
    )
  }

  // Un repetido tendria dos indices: el descifrado seria ambiguo.
  const posiciones = new Map()
  const repetidos = new Set()
  for (const [indice, simbolo] of simbolos.entries()) {
    if (posiciones.has(simbolo)) repetidos.add(simbolo)
    else posiciones.set(simbolo, indice)
  }

  if (repetidos.size > 0) {
    const lista = [...repetidos].map((simbolo) => JSON.stringify(simbolo)).join(', ')
    throw new Error(`El alfabeto tiene simbolos repetidos y el descifrado seria ambiguo: ${lista}.`)
  }

  const n = simbolos.length
  const congelados = Object.freeze(simbolos)

  return Object.freeze({
    simbolos: congelados,
    n,

    indiceDe(simbolo) {
      const clave = normalizar ? String(simbolo).normalize('NFC') : String(simbolo)
      return posiciones.has(clave) ? posiciones.get(clave) : -1
    },

    simboloEn(indice) {
      return congelados[modulo(indice, n)]
    },

    toString() {
      return congelados.join('')
    },
  })
}

/**
 * [AL-06]
 * @param {string} entrada
 * @param {object} [opciones]
 * @param {boolean} [opciones.normalizar=true]
 * @returns {{ simbolos: string, repetidos: string[] }}
 * @example
 * quitarRepetidos('HOLA MUNDO')  // { simbolos: 'HOLA MUND', repetidos: ['O'] }
 */
export function quitarRepetidos(entrada, { normalizar = true } = {}) {
  const fuente = String(entrada ?? '')
  const simbolos = Array.from(normalizar ? fuente.normalize('NFC') : fuente)

  const vistos = new Set()
  const repetidos = new Set()
  const unicos = []
  for (const simbolo of simbolos) {
    if (vistos.has(simbolo)) {
      repetidos.add(simbolo)
    } else {
      vistos.add(simbolo)
      unicos.push(simbolo)
    }
  }

  return { simbolos: unicos.join(''), repetidos: [...repetidos] }
}

// Selectores de variacion, ancho cero, marcas de direccion, BOM y guion suave.
const INVISIBLES = /[\uFE00-\uFE0F\u200B-\u200F\u2060\uFEFF\u00AD]/u

/**
 * [AL-07]
 * @param {string} entrada Tal como se pego.
 * @returns {{
 *   simbolos: string,
 *   saltos: number,
 *   tabuladores: number,
 *   invisibles: string[],
 *   espaciosDuros: number,
 *   espaciosBorde: { inicio: number, fin: number },
 * }}
 * @example
 * limpiarAlfabeto('ABC\r\n').simbolos  // 'ABC'
 */
export function limpiarAlfabeto(entrada) {
  let saltos = 0
  let tabuladores = 0
  let espaciosDuros = 0
  const invisibles = []
  const limpios = []

  for (const caracter of Array.from(String(entrada ?? ''))) {
    if (caracter === '\n') {
      saltos += 1
    } else if (caracter === '\r') {
      // Parte de un \r\n: ya se cuenta con el \n.
    } else if (caracter === '\t') {
      tabuladores += 1
    } else if (INVISIBLES.test(caracter)) {
      invisibles.push(`U+${caracter.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`)
    } else if (caracter === '\u00A0') {
      espaciosDuros += 1
      limpios.push(' ')
    } else {
      limpios.push(caracter)
    }
  }

  // Los espacios del borde no se quitan: pueden ser parte del alfabeto.
  const simbolos = limpios.join('')
  const inicio = simbolos.length - simbolos.replace(/^ +/, '').length
  const fin = simbolos.trim() === '' ? 0 : simbolos.length - simbolos.replace(/ +$/, '').length

  return { simbolos, saltos, tabuladores, invisibles, espaciosDuros, espaciosBorde: { inicio, fin } }
}
