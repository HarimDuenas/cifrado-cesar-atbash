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
 * [CS-05] Reduce un desplazamiento escrito como texto, de cualquier tamaño.
 *
 * Es `normalizarDesplazamiento` para lo que escribe el usuario. Se hace con
 * BigInt porque un `number` pierde precision arriba de 2^53: con k de 17
 * digitos, `k % 95` ya da un residuo equivocado y el cifrado no coincidiria con
 * la k que se muestra. Con BigInt el residuo es exacto sin importar los digitos.
 *
 * @param {string} entrada Entero en decimal, con signo opcional ("300", "-5").
 * @param {number} n Tamaño del alfabeto.
 * @returns {number} El desplazamiento equivalente en [0, N).
 * @throws {Error} Si la entrada no es un entero.
 *
 * @example
 * reducirDesplazamiento('300', 95)                    // 15
 * reducirDesplazamiento('-1', 95)                     // 94
 * reducirDesplazamiento('123456789012345678901', 95)  // exacto, sin redondeo
 */
export function reducirDesplazamiento(entrada, n) {
  const limpia = String(entrada ?? '').trim()
  if (!/^[+-]?\d+$/.test(limpia)) {
    throw new Error(`El desplazamiento debe ser un numero entero y recibio "${limpia}".`)
  }
  const m = BigInt(n)
  return Number(((BigInt(limpia) % m) + m) % m)
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
