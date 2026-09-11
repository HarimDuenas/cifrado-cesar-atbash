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
 * Rango imprimible del codigo ASCII: del espacio (32) a la virgulilla (126).
 * Son 95 simbolos e incluye espacios, digitos, puntuacion, mayusculas y
 * minusculas. Es el alfabeto por defecto del programa.
 */
export const ASCII_IMPRIMIBLE = Array.from(
  { length: 95 },
  (_, i) => String.fromCharCode(32 + i),
).join('')

/** Alfabeto clasico del castellano, en mayusculas y con Ñ. Sin espacios. */
export const ESPANOL_MAYUSCULAS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'

/** Alfabetos listos para elegir en la interfaz. */
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
 * Modulo que siempre cae en el rango [0, m).
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
 * Construye un alfabeto validado a partir de una cadena o de una lista.
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
