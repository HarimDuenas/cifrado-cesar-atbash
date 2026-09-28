/**
 * @file Modelo del alfabeto: el conjunto ordenado de simbolos con el que se
 * cifra y se descifra.
 *
 * Es la pauta de todo lo demas, porque define dos cosas: N (cuantos simbolos
 * hay, que es el modulo de la aritmetica) y el indice de cada simbolo, que es
 * el numero que los cifrados mueven. Cambiar el alfabeto cambia el resultado
 * de cada operacion, aunque el texto y la clave sean los mismos.
 */

/**
 * [AL-01] Rango imprimible del codigo ASCII: del espacio (32) a la virgulilla (126).
 * Son 95 simbolos e incluye espacios, digitos, puntuacion, mayusculas y
 * minusculas. Es el alfabeto por defecto del programa.
 */
export const ASCII_IMPRIMIBLE = Array.from(
  { length: 95 },
  (_, i) => String.fromCharCode(32 + i),
).join('')

/** [AL-02] Alfabeto clasico del castellano, en mayusculas y con Ñ. Sin espacios. */
export const ESPANOL_MAYUSCULAS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'

/** [AL-03] Alfabetos listos para elegir en la interfaz. */
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
 * [AL-04] Modulo que siempre cae en el rango [0, m).
 *
 * Hace falta porque el operador `%` de JavaScript conserva el signo del
 * dividendo: `-3 % 26` da `-3`, no `23`. Sin esta funcion, una clave negativa
 * o el `a = -1` de Atbash se saldrian del alfabeto.
 *
 * @param {number} a Cualquier entero.
 * @param {number} m Modulo, debe ser mayor que 0.
 * @returns {number} El residuo, siempre en [0, m).
 */
export function modulo(a, m) {
  return ((a % m) + m) % m
}

/**
 * @typedef {object} Alfabeto
 * @property {readonly string[]} simbolos Los simbolos en orden, uno por code point.
 * @property {number} n Cuantos simbolos tiene. Es el modulo aritmetico.
 * @property {(simbolo: string) => number} indiceDe Posicion de un simbolo, o -1 si no pertenece.
 * @property {(indice: number) => string} simboloEn Simbolo en una posicion; el indice se toma modulo N.
 * @property {() => string} toString Los simbolos concatenados.
 */

/**
 * [AL-05] Construye un alfabeto validado a partir de una cadena o de una lista.
 *
 * El texto se recorre con `Array.from`, que separa por code points y no por
 * unidades UTF-16: asi un emoji cuenta como un solo simbolo en vez de partirse
 * en dos mitades invalidas.
 *
 * @param {string | Iterable<string>} entrada Los simbolos del alfabeto.
 * @param {object} [opciones]
 * @param {boolean} [opciones.normalizar=true] Normaliza a NFC, para que "ñ" y
 *   "n + tilde combinable" no sean dos entradas distintas del mismo alfabeto.
 * @returns {Alfabeto} Alfabeto inmutable, listo para cifrar.
 * @throws {Error} Si quedan menos de 2 simbolos, o si alguno esta repetido.
 *
 * @example
 * const alfabeto = crearAlfabeto(ASCII_IMPRIMIBLE)
 * alfabeto.n                 // 95
 * alfabeto.indiceDe(' ')     // 0  (el espacio es el primer simbolo)
 * alfabeto.simboloEn(17)     // '1'
 */
export function crearAlfabeto(entrada, { normalizar = true } = {}) {
  // La normalizacion va ANTES de separar por code points, y el orden importa:
  // "n" + tilde combinable son dos code points que NFC junta en uno solo ("ñ").
  // Separando primero, cada mitad se normaliza por su cuenta, no se juntan, y
  // el alfabeto termina con un simbolo de mas. Lo detecto un test.
  const fuente = typeof entrada === 'string'
    ? entrada
    : Array.from(entrada ?? []).join('')

  const simbolos = Array.from(normalizar ? fuente.normalize('NFC') : fuente)

  if (simbolos.length < 2) {
    throw new Error(
      `El alfabeto necesita al menos 2 simbolos para que el cifrado tenga sentido, y recibio ${simbolos.length}.`,
    )
  }

  // Un simbolo repetido volveria ambiguo el descifrado: la misma letra tendria
  // dos indices posibles y no habria forma de saber cual se uso al cifrar.
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
 * [AL-06] Deja cada simbolo una sola vez, en el lugar de su primera aparicion.
 *
 * `crearAlfabeto` sigue rechazando repetidos a proposito: esta funcion es la
 * que se aplica ANTES, sobre lo que escribe el usuario, y devuelve tambien lo
 * que quito para que la interfaz lo diga en vez de corregirlo en silencio.
 * Usa la misma normalizacion y la misma separacion por code points que
 * `crearAlfabeto`, para que las dos cuenten los simbolos igual.
 *
 * @param {string} entrada Texto crudo del alfabeto.
 * @param {object} [opciones]
 * @param {boolean} [opciones.normalizar=true] Normaliza a NFC antes de comparar.
 * @returns {{ simbolos: string, repetidos: string[] }} La cadena sin repetidos y
 *   la lista de simbolos que aparecian mas de una vez, en orden de aparicion.
 *
 * @example
 * quitarRepetidos('HOLA MUNDO')
 * // { simbolos: 'HOLA MUND', repetidos: ['O'] }
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

/**
 * Caracteres que no se ven y que nadie pone a proposito en un alfabeto, pero
 * que se cuelan al copiar de Word, un PDF o un chat: selectores de variacion
 * (el U+FE0F que convierte "✔" en emoji), espacios de ancho cero, marcas de
 * direccion, el guion suave y la marca de orden de bytes.
 */
const INVISIBLES = /[︀-️​-‏⁠﻿­]/u

/**
 * [AL-07] Limpia un alfabeto pegado, antes de quitar repetidos.
 *
 * Un solo caracter de mas cambia N y descuadra la vuelta del alfabeto: medido,
 * un salto de linea al final hacia que "Disfruta tu tiempo" saliera "tiTkpo".
 * Por eso se quitan siempre los saltos de linea, los tabuladores y los
 * invisibles, y el espacio de no separacion (U+00A0, el que mete Word) se
 * cambia por un espacio normal.
 *
 * Los espacios al inicio o al final NO se quitan: el espacio puede ser parte
 * legitima del alfabeto. Solo se cuentan, para que la interfaz pregunte.
 *
 * @param {string} entrada Texto crudo del alfabeto, tal como se pego.
 * @returns {{
 *   simbolos: string,
 *   saltos: number,
 *   tabuladores: number,
 *   invisibles: string[],
 *   espaciosDuros: number,
 *   espaciosBorde: { inicio: number, fin: number },
 * }} La cadena limpia y lo que se hizo, para avisarlo.
 *
 * @example
 * limpiarAlfabeto('ABC\r\n').simbolos        // 'ABC'
 * limpiarAlfabeto('✔️★').invisibles    // ['U+FE0F']
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
      // El \r de un salto de Windows (\r\n) no cuenta como un salto aparte.
    } else if (caracter === '\t') {
      tabuladores += 1
    } else if (INVISIBLES.test(caracter)) {
      invisibles.push(`U+${caracter.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`)
    } else if (caracter === ' ') {
      espaciosDuros += 1
      limpios.push(' ')
    } else {
      limpios.push(caracter)
    }
  }

  const simbolos = limpios.join('')
  const inicio = simbolos.length - simbolos.replace(/^ +/, '').length
  const fin = simbolos.trim() === '' ? 0 : simbolos.length - simbolos.replace(/ +$/, '').length

  return { simbolos, saltos, tabuladores, invisibles, espaciosDuros, espaciosBorde: { inicio, fin } }
}
