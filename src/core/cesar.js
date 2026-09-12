/**
 * @file Cifrado Cesar: el caso afin con `a = 1`.
 *
 * Solo corre cada simbolo `k` lugares dentro del alfabeto. Ese `k` es lo que la
 * rubrica llama "el modulo a utilizar para el cifrado"; el otro sentido de la
 * palabra, el modulo aritmetico, es N (el tamaño del alfabeto).
 */

import { aplicarAfin } from './afin.js'
import { modulo } from './alfabeto.js'

/** [CS-01] El multiplicador que define a Cesar dentro de la familia afin. */
export const A_CESAR = 1

/**
 * [CS-02] Normaliza un desplazamiento a su equivalente en [0, N).
 *
 * Un `k` de 112 sobre 95 simbolos es el mismo cifrado que un `k` de 17, y un
 * `k` de -1 es el mismo que 94. Se normaliza para poder mostrarle al usuario
 * el valor que de verdad se aplico.
 *
 * @param {number} k Desplazamiento pedido.
 * @param {number} n Tamaño del alfabeto.
 * @returns {number} El desplazamiento equivalente en [0, N).
 * @throws {Error} Si `k` no es un entero.
 */
export function normalizarDesplazamiento(k, n) {
  if (!Number.isInteger(k)) {
    throw new Error(`El desplazamiento debe ser un numero entero y recibio ${k}.`)
  }
  return modulo(k, n)
}

/**
 * [CS-03] Cifra con Cesar.
 *
 * @param {string} texto Texto claro.
 * @param {import('./alfabeto.js').Alfabeto} alfabeto Alfabeto con el que se cifra.
 * @param {number} k Desplazamiento.
 * @returns {string} Criptograma.
 *
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
 * [CS-04] Descifra un Cesar del que ya se conoce el desplazamiento.
 *
 * Es la misma operacion en sentido contrario: correr el alfabeto `-k` lugares.
 *
 * @param {string} criptograma Texto cifrado.
 * @param {import('./alfabeto.js').Alfabeto} alfabeto Alfabeto con el que se cifro.
 * @param {number} k Desplazamiento usado al cifrar.
 * @returns {string} Texto claro.
 */
export function descifrarCesar(criptograma, alfabeto, k) {
  return aplicarAfin(criptograma, alfabeto, {
    a: A_CESAR,
    b: -normalizarDesplazamiento(k, alfabeto.n),
  })
}
