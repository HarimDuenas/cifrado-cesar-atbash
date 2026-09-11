/**
 * @file Cifrado Atbash: el caso afin con `a = -1` y `b = N - 1`.
 *
 * Voltea el alfabeto de punta a punta, asi que el primer simbolo se cambia por
 * el ultimo, el segundo por el penultimo, y asi. En formula:
 *
 *     C(i) = (N - 1 - i) mod N
 *
 * Dos consecuencias que conviene tener claras, porque el programa las reporta:
 *
 * 1. **No tiene clave.** Es una permutacion fija: el unico "secreto" es saber
 *    que se uso Atbash, y eso es seguridad por oscuridad. Por lo mismo, aqui no
 *    hay modulo que elegir ni que detectar.
 * 2. **Es su propia inversa.** Aplicarlo dos veces devuelve el texto original,
 *    asi que cifrar y descifrar son la misma funcion.
 */

import { aplicarAfin } from './afin.js'

/** El multiplicador que define a Atbash dentro de la familia afin. */
export const A_ATBASH = -1

/**
 * Clave afin equivalente a Atbash para un alfabeto de `n` simbolos.
 *
 * @param {number} n Tamaño del alfabeto.
 * @returns {import('./afin.js').ClaveAfin} La clave `{ a: -1, b: n - 1 }`.
 */
export function claveAtbash(n) {
  return { a: A_ATBASH, b: n - 1 }
}

/**
 * Aplica Atbash. Sirve para cifrar y para descifrar, porque es su propia
 * inversa: `atbash(atbash(texto)) === texto`.
 *
 * @param {string} texto Texto claro o criptograma, da lo mismo.
 * @param {import('./alfabeto.js').Alfabeto} alfabeto Alfabeto con el que se opera.
 * @returns {string} El texto con el alfabeto volteado.
 *
 * @example
 * const alfabeto = crearAlfabeto(ESPANOL_MAYUSCULAS)
 * atbash('ABC', alfabeto)  // 'ZYX'
 */
export function atbash(texto, alfabeto) {
  return aplicarAfin(texto, alfabeto, claveAtbash(alfabeto.n))
}

/** Alias explicito para leer el codigo de la interfaz sin ambiguedad. */
export const cifrarAtbash = atbash

/** Alias explicito: es la misma operacion que cifrar. */
export const descifrarAtbash = atbash
