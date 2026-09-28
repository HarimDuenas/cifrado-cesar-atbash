/**
 * @file Histogramas, indice de coincidencia y tablas de referencia del español.
 */

import frecuenciasEs from '../data/frecuencias-es.json'
import palabrasEs from '../data/palabras-es.json'
import { bigramasDe, palabrasDe } from './texto.js'

/** [FR-01] */
export const METADATOS_REFERENCIA = Object.freeze(frecuenciasEs.metadatos)

/** [FR-02] */
export const IC_REFERENCIA = Object.freeze(frecuenciasEs.indiceDeCoincidencia)

// Distingue mayusculas.
const UNIGRAMAS = new Map(frecuenciasEs.unigramas)

// Sobre el texto reducido.
const BIGRAMAS = new Map(frecuenciasEs.bigramas)

/** [FR-03] */
export const PALABRAS = new Set(palabrasEs.palabras)

// Un bigrama que no esta en la tabla no puede valer cero.
const PISO_BIGRAMA = 1e-7

/** [FR-04] */
export const SUAVIZADO = 1e-6

/**
 * @typedef {object} Histograma
 * @property {Float64Array} conteos
 * @property {Float64Array} proporciones
 * @property {number} total Simbolos del texto que estan en el alfabeto.
 */

/**
 * [FR-05]
 * @param {string} texto
 * @param {import('./alfabeto.js').Alfabeto} alfabeto
 * @returns {Histograma}
 */
export function histograma(texto, alfabeto) {
  const conteos = new Float64Array(alfabeto.n)
  let total = 0

  for (const simbolo of String(texto)) {
    const indice = alfabeto.indiceDe(simbolo)
    if (indice !== -1) {
      conteos[indice] += 1
      total += 1
    }
  }

  const proporciones = new Float64Array(alfabeto.n)
  if (total > 0) {
    for (let i = 0; i < alfabeto.n; i += 1) proporciones[i] = conteos[i] / total
  }

  return { conteos, proporciones, total }
}

/**
 * [FR-06] IC = Σ nᵢ(nᵢ - 1) / [ n(n - 1) ]
 * @param {Float64Array | number[]} conteos
 * @param {number} total
 * @returns {number}
 */
export function indiceDeCoincidencia(conteos, total) {
  if (total < 2) return 0
  let suma = 0
  for (const cantidad of conteos) suma += cantidad * (cantidad - 1)
  return suma / (total * (total - 1))
}

/**
 * @typedef {object} Referencia
 * @property {Float64Array} proporciones Esperada por indice del alfabeto.
 * @property {number} cobertura Parte del corpus que cae en el alfabeto (0 a 1).
 * @property {number} icEsperado Σ pᵢ²
 */

/**
 * [FR-07]
 * @param {import('./alfabeto.js').Alfabeto} alfabeto
 * @returns {Referencia}
 */
export function referenciaParaAlfabeto(alfabeto) {
  const sinTildes = (simbolo) =>
    simbolo.normalize('NFD').replace(/[\u0301\u0308]/g, '').normalize('NFC')

  // Primero cada simbolo tal cual y despues sus variantes sin tilde, para que
  // la "ó" no se quede con la frecuencia de la "o".
  const destino = new Map()
  for (const [indice, simbolo] of alfabeto.simbolos.entries()) {
    if (!destino.has(simbolo)) destino.set(simbolo, indice)
  }
  for (const [indice, simbolo] of alfabeto.simbolos.entries()) {
    const plano = sinTildes(simbolo)
    if (!destino.has(plano)) destino.set(plano, indice)
  }

  const proporciones = new Float64Array(alfabeto.n)
  let cobertura = 0

  // Cada caracter del corpus cae en su variante que exista en el alfabeto,
  // asi un alfabeto de puras mayusculas recibe la frecuencia de las minusculas.
  for (const [caracter, proporcion] of UNIGRAMAS) {
    const plano = sinTildes(caracter)
    const variantes = [
      caracter,
      plano,
      caracter.toLowerCase(),
      caracter.toUpperCase(),
      plano.toLowerCase(),
      plano.toUpperCase(),
    ]
    const variante = variantes.find((candidata) => destino.has(candidata))
    if (variante === undefined) continue

    proporciones[destino.get(variante)] += proporcion
    cobertura += proporcion
  }

  if (cobertura <= 0) {
    proporciones.fill(1 / alfabeto.n)
    return { proporciones, cobertura: 0, icEsperado: 1 / alfabeto.n }
  }

  let suma = 0
  for (let i = 0; i < alfabeto.n; i += 1) {
    proporciones[i] += SUAVIZADO
    suma += proporciones[i]
  }

  let icEsperado = 0
  for (let i = 0; i < alfabeto.n; i += 1) {
    proporciones[i] /= suma
    icEsperado += proporciones[i] ** 2
  }

  return { proporciones, cobertura, icEsperado }
}

/**
 * [FR-08]
 * @param {string} texto
 * @returns {number} Log-probabilidad promedio; -Infinity si no hay bigramas.
 */
export function puntajeBigramas(texto) {
  const pares = bigramasDe(texto)
  if (pares.length === 0) return -Infinity

  let suma = 0
  for (const par of pares) {
    suma += Math.log10(BIGRAMAS.get(par) ?? PISO_BIGRAMA)
  }
  return suma / pares.length
}

/**
 * [FR-09]
 * @param {string} texto
 * @returns {number} Entre 0 y 1, pesado por longitud de palabra.
 */
export function coberturaDePalabras(texto) {
  const palabras = palabrasDe(texto)
  if (palabras.length === 0) return 0

  let letras = 0
  let reconocidas = 0
  for (const palabra of palabras) {
    letras += palabra.length
    if (PALABRAS.has(palabra)) reconocidas += palabra.length
  }
  return letras > 0 ? reconocidas / letras : 0
}
