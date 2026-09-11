/**
 * @file El cifrado Afin (El corazon del proyecto).
 *
 * Cesar y Atbash no son dos cifrados distintos: son dos casos particulares de
 * la misma operacion sobre el indice `i` de cada simbolo dentro del alfabeto.
 *
 *     C(i) = (a · i + b) mod N
 *
 *     Cesar  ->  a = +1,  b = k        (corre el alfabeto k lugares)
 *     Atbash ->  a = -1,  b = N - 1    (lo voltea de punta a punta)
 *
 * Tratarlos como una sola familia es lo que permite despues *calcular* la clave
 * en vez de probar las N posibles: ver `detector.js`.
 */

import { modulo } from './alfabeto.js'

/**
 * @typedef {object} ClaveAfin
 * @property {number} a Multiplicador. Debe ser invertible modulo N.
 * @property {number} b Desplazamiento.
 */

/**
 * Maximo comun divisor por el algoritmo de Euclides.
 *
 * @param {number} a
 * @param {number} b
 * @returns {number} El MCD de los valores absolutos.
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
 * Dice si `a` sirve como multiplicador de un cifrado afin con modulo `n`.
 *
 * Solo sirve si `a` y `n` no comparten divisores: si los comparten, la
 * operacion manda dos simbolos distintos al mismo resultado y el mensaje deja
 * de poder descifrarse. Por eso Cesar (`a = 1`) y Atbash (`a = -1`) siempre son
 * validos, con cualquier alfabeto.
 *
 * @param {number} a Multiplicador.
 * @param {number} n Tamaño del alfabeto.
 * @returns {boolean}
 */
export function esInvertible(a, n) {
  return mcd(modulo(a, n), n) === 1
}

/**
 * Inverso multiplicativo de `a` modulo `n`: el numero que cumple
 * `a · inverso ≡ 1 (mod n)`. Es la pieza que permite deshacer la
 * multiplicacion al descifrar.
 *
 * Se calcula con el algoritmo extendido de Euclides, que va guardando cuanto
 * de `a` hay en cada residuo.
 *
 * @param {number} a Multiplicador.
 * @param {number} n Tamaño del alfabeto.
 * @returns {number} El inverso, en [0, n).
 * @throws {Error} Si `a` no es invertible modulo `n`.
 */
export function inversoModular(a, n) {
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
 * Clave que deshace a otra: si `C(i) = (a·i + b) mod N`, su inversa es
 * `P(j) = (a⁻¹·j - a⁻¹·b) mod N`.
 *
 * @param {ClaveAfin} clave Clave original.
 * @param {number} n Tamaño del alfabeto.
 * @returns {ClaveAfin} La clave que revierte la operacion.
 */
export function claveInversa({ a, b }, n) {
  const inverso = inversoModular(a, n)
  return { a: inverso, b: modulo(-inverso * b, n) }
}

/**
 * Aplica una clave afin a un texto, simbolo por simbolo.
 *
 * Los caracteres que no pertenecen al alfabeto **pasan sin cambio**. Es una
 * decision de diseño: si se descartaran, el mensaje descifrado no coincidiria
 * con el original; y si se cifraran, harian falta en el alfabeto. Con el ASCII
 * imprimible por defecto, esto significa que las vocales acentuadas y la ñ
 * quedan a la vista en el criptograma.
 *
 * @param {string} texto Texto de entrada.
 * @param {import('./alfabeto.js').Alfabeto} alfabeto Alfabeto con el que se opera.
 * @param {ClaveAfin} clave Multiplicador y desplazamiento.
 * @returns {string} El texto transformado.
 * @throws {Error} Si el multiplicador no es invertible (el resultado no se podria deshacer).
 *
 * @example
 * const alfabeto = crearAlfabeto(ASCII_IMPRIMIBLE)
 * aplicarAfin('HOLA', alfabeto, { a: 1, b: 17 })  // corrimiento de 17
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

  let salida = ''
  for (const simbolo of texto) {
    const indice = alfabeto.indiceDe(simbolo)
    salida += indice === -1 ? simbolo : alfabeto.simboloEn(a * indice + b)
  }
  return salida
}
