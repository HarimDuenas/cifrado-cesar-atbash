/**
 * @file Cifrado Cesar: el caso afin con a = 1.
 */

import { aplicarAfin } from './afin.js'
import { modulo } from './alfabeto.js'

/** [CS-01] */
export const A_CESAR = 1

/**
 * [CS-02]
 * @param {number} k
 * @param {number} n
 * @returns {number} En [0, N).
 * @throws {Error} Si `k` no es entero.
 */
export function normalizarDesplazamiento(k, n) {
  if (!Number.isInteger(k)) {
    throw new Error(`El desplazamiento debe ser un numero entero y recibio ${k}.`)
  }
  return modulo(k, n)
}

/**
 * [CS-05]
 * @param {string} entrada Entero con signo opcional: "300", "-5".
 * @param {number} n
 * @returns {number} En [0, N).
 * @throws {Error} Si no es un entero.
 * @example
 * reducirDesplazamiento('300', 95)  // 15
 */
export function reducirDesplazamiento(entrada, n) {
  const limpia = String(entrada ?? '').trim()
  if (!/^[+-]?\d+$/.test(limpia)) {
    throw new Error(`El desplazamiento debe ser un numero entero y recibio "${limpia}".`)
  }
  // BigInt: con number, arriba de 2^53 el residuo sale mal.
  const m = BigInt(n)
  return Number(((BigInt(limpia) % m) + m) % m)
}

/**
 * [CS-03]
 * @param {string} texto
 * @param {import('./alfabeto.js').Alfabeto} alfabeto
 * @param {number} k
 * @returns {string}
 * @example
 * cifrarCesar('HOLA', crearAlfabeto(ESPANOL_MAYUSCULAS), 3)  // 'KRÑD'
 */
export function cifrarCesar(texto, alfabeto, k) {
  return aplicarAfin(texto, alfabeto, {
    a: A_CESAR,
    b: normalizarDesplazamiento(k, alfabeto.n),
  })
}

/**
 * [CS-04]
 * @param {string} criptograma
 * @param {import('./alfabeto.js').Alfabeto} alfabeto
 * @param {number} k
 * @returns {string}
 */
export function descifrarCesar(criptograma, alfabeto, k) {
  return aplicarAfin(criptograma, alfabeto, {
    a: A_CESAR,
    b: -normalizarDesplazamiento(k, alfabeto.n),
  })
}
