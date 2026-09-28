/**
 * @file Cifrado Atbash: el caso afin con a = -1 y b = N - 1.
 * No tiene clave y es su propia inversa.
 */

import { aplicarAfin } from './afin.js'

/** [AT-01] */
export const A_ATBASH = -1

/**
 * [AT-02]
 * @param {number} n
 * @returns {import('./afin.js').ClaveAfin}
 */
export function claveAtbash(n) {
  return { a: A_ATBASH, b: n - 1 }
}

/**
 * [AT-03]
 * @param {string} texto
 * @param {import('./alfabeto.js').Alfabeto} alfabeto
 * @returns {string}
 * @example
 * atbash('ABC', crearAlfabeto(ESPANOL_MAYUSCULAS))  // 'ZYX'
 */
export function atbash(texto, alfabeto) {
  return aplicarAfin(texto, alfabeto, claveAtbash(alfabeto.n))
}

/** [AT-04] */
export const cifrarAtbash = atbash

/** [AT-05] */
export const descifrarAtbash = atbash
