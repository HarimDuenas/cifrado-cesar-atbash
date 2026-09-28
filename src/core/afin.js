/**
 * @file Cifrado afin: C(i) = (a · i + b) mod N.
 * Cesar es a = 1, b = k. Atbash es a = -1, b = N - 1.
 */

import { modulo } from './alfabeto.js'

/**
 * @typedef {object} ClaveAfin
 * @property {number} a Invertible modulo N.
 * @property {number} b
 */

/**
 * [AF-01]
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function mcd(a, b) {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    ;[x, y] = [y, x % y]
  }
  return x
}

/**
 * [AF-02]
 * @param {number} a
 * @param {number} n
 * @returns {boolean}
 */
export function esInvertible(a, n) {
  return mcd(modulo(a, n), n) === 1
}

/**
 * [AF-03]
 * @param {number} a
 * @param {number} n
 * @returns {number} En [0, n).
 * @throws {Error} Si `a` no es invertible modulo `n`.
 */
export function inversoModular(a, n) {
  // Euclides extendido.
  const base = modulo(a, n)
  let [residuoAnterior, residuo] = [n, base]
  let [coefAnterior, coef] = [0, 1]

  while (residuo !== 0) {
    const cociente = Math.floor(residuoAnterior / residuo)
    ;[residuoAnterior, residuo] = [residuo, residuoAnterior - cociente * residuo]
    ;[coefAnterior, coef] = [coef, coefAnterior - cociente * coef]
  }

  if (residuoAnterior !== 1) {
    throw new Error(
      `El multiplicador a = ${a} no es invertible con un alfabeto de ${n} simbolos, ` +
        'asi que el mensaje no se podria descifrar.',
    )
  }

  return modulo(coefAnterior, n)
}

/**
 * [AF-04]
 * @param {ClaveAfin} clave
 * @param {number} n
 * @returns {ClaveAfin}
 */
export function claveInversa({ a, b }, n) {
  const inverso = inversoModular(a, n)
  return { a: inverso, b: modulo(-inverso * b, n) }
}

/**
 * [AF-05]
 * @param {string} texto
 * @param {import('./alfabeto.js').Alfabeto} alfabeto
 * @param {ClaveAfin} clave
 * @returns {string}
 * @throws {Error} Si la clave no es entera o `a` no es invertible.
 * @example
 * aplicarAfin('HOLA', crearAlfabeto(ASCII_IMPRIMIBLE), { a: 1, b: 17 })
 */
export function aplicarAfin(texto, alfabeto, { a, b }) {
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    throw new Error(`La clave afin debe tener enteros y recibio a = ${a}, b = ${b}.`)
  }
  if (!esInvertible(a, alfabeto.n)) {
    throw new Error(
      `El multiplicador a = ${a} no es invertible con un alfabeto de ${alfabeto.n} simbolos, ` +
        'asi que dos simbolos distintos terminarian en el mismo y el mensaje no se podria descifrar.',
    )
  }

  // Lo que no esta en el alfabeto pasa sin cambio.
  let salida = ''
  for (const simbolo of texto) {
    const indice = alfabeto.indiceDe(simbolo)
    salida += indice === -1 ? simbolo : alfabeto.simboloEn(a * indice + b)
  }
  return salida
}
