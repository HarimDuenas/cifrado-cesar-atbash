/**
 * @file Detector: calcula la clave y entrega una sola linea.
 * Paso 0, ¿es atacable? · paso 1, preseleccion · paso 2, verificacion · paso 3, resultado.
 * La correlacion R(a, b) = Σᵢ ref[i] · obs[(a·i + b) mod N] es el metodo de al-Kindī.
 */

import { modulo } from './alfabeto.js'
import { aplicarAfin, claveInversa, esInvertible } from './afin.js'
import {
  coberturaDePalabras,
  histograma,
  indiceDeCoincidencia,
  puntajeBigramas,
  referenciaParaAlfabeto,
} from './frecuencias.js'
import { legibilidad } from './texto.js'

/** [DT-01] */
export const MINIMO_SIMBOLOS = 12

/** [DT-02] */
export const UMBRAL_IC = 0.35

/** [DT-03] */
export const CANDIDATOS_A_VERIFICAR = 8

/** [DT-04] puntaje = simbolos + bigramas + 0.5 · palabras */
export const PESOS = Object.freeze({ simbolos: 1, bigramas: 1, palabras: 0.5 })

/** [DT-14] */
export const MARGEN_MINIMO = 0.25

// Bigramas de un texto sin pares de letras.
const SIN_BIGRAMAS = -6

// Se suma CASTIGO_ILEGIBLE · log10(legibilidad) a los bigramas.
const CASTIGO_ILEGIBLE = 3

/** [DT-05] */
export const MINIMA_COBERTURA = 0.2

/** [DT-11] */
export const PRESELECCION = 32

// Frecuencia minima de un simbolo que el español no usa.
const PISO_SIMBOLO = 1e-5

/**
 * @typedef {object} Candidato
 * @property {import('./afin.js').ClaveAfin} clave
 * @property {string} familia 'cesar', 'atbash' o 'afin'.
 * @property {number | null} desplazamiento Solo en Cesar.
 * @property {number} correlacion
 * @property {string} textoClaro
 * @property {number} bigramas
 * @property {number} palabras
 * @property {number} simbolos
 * @property {number} puntaje
 */

/**
 * @typedef {object} Resultado
 * @property {boolean} atacable
 * @property {string} diagnostico
 * @property {number} ic
 * @property {number} icEsperado
 * @property {number} icAleatorio 1/N
 * @property {number} simbolos Simbolos del texto que estan en el alfabeto.
 * @property {Candidato | null} ganador
 * @property {number} confianza Entre 0 y 1.
 * @property {Candidato[]} candidatos Mejor primero.
 * @property {number[]} curvaCesar R(b) con a = 1, en [0, 1].
 * @property {number[]} curvaReflexion R(b) con a = -1, en [0, 1].
 */

/**
 * [DT-06]
 * @param {Float64Array} ref
 * @param {Float64Array} obs
 * @param {number} a
 * @param {number} b
 * @param {number} n
 * @returns {number}
 */
export function correlacion(ref, obs, a, b, n) {
  let suma = 0
  for (let i = 0; i < n; i += 1) {
    suma += ref[i] * obs[modulo(a * i + b, n)]
  }
  return suma
}

/**
 * [DT-12]
 * @param {ArrayLike<number>} conteos Por indice, en el criptograma.
 * @param {Float64Array} ref
 * @param {import('./afin.js').ClaveAfin} clave
 * @param {number} n
 * @returns {number} Log-probabilidad promedio por simbolo.
 */
export function verosimilitud(conteos, ref, clave, n) {
  const { a, b } = claveInversa(clave, n)
  let suma = 0
  let total = 0
  for (let j = 0; j < n; j += 1) {
    if (conteos[j] === 0) continue
    suma += conteos[j] * Math.log10(Math.max(ref[modulo(a * j + b, n)], PISO_SIMBOLO))
    total += conteos[j]
  }
  return total > 0 ? suma / total : -Infinity
}

/**
 * [DT-13]
 * @param {Float64Array} ref
 * @param {import('./alfabeto.js').Alfabeto} alfabeto
 * @returns {Float64Array}
 */
export function referenciaSinMayusculas(ref, alfabeto) {
  const porFamilia = new Map()
  alfabeto.simbolos.forEach((simbolo, i) => {
    const familia = simbolo.toLowerCase()
    porFamilia.set(familia, (porFamilia.get(familia) ?? 0) + ref[i])
  })
  return Float64Array.from(alfabeto.simbolos, (simbolo) => porFamilia.get(simbolo.toLowerCase()))
}

/**
 * [DT-07]
 * @param {number} n
 * @param {boolean} [soloCesarYAtbash=false]
 * @returns {number[]}
 */
export function multiplicadoresValidos(n, soloCesarYAtbash = false) {
  if (soloCesarYAtbash) return [1, modulo(-1, n)]
  const validos = []
  for (let a = 1; a < n; a += 1) {
    if (esInvertible(a, n)) validos.push(a)
  }
  return validos
}

/**
 * [DT-08]
 * @param {import('./afin.js').ClaveAfin} clave
 * @param {number} n
 * @returns {{familia: string, desplazamiento: number | null, etiqueta: string}}
 */
export function clasificar({ a, b }, n) {
  if (modulo(a, n) === 1) {
    const k = modulo(b, n)
    return {
      familia: 'cesar',
      desplazamiento: k,
      etiqueta: `César, módulo ${k}`,
    }
  }
  if (modulo(a, n) === modulo(-1, n) && modulo(b, n) === modulo(n - 1, n)) {
    return {
      familia: 'atbash',
      desplazamiento: null,
      etiqueta: 'Atbash — no utiliza módulo: es una permutación fija',
    }
  }
  return {
    familia: 'afin',
    desplazamiento: null,
    etiqueta: `Afín, a = ${modulo(a, n)} y b = ${modulo(b, n)}`,
  }
}

/**
 * [DT-09]
 * @param {number[]} puntajes
 * @returns {number[]} Suman 1.
 */
export function probabilidades(puntajes) {
  if (puntajes.length === 0) return []
  if (puntajes.length === 1) return [1]

  // Softmax con la desviacion estandar de los propios puntajes como escala.
  const media = puntajes.reduce((suma, p) => suma + p, 0) / puntajes.length
  const varianza = puntajes.reduce((suma, p) => suma + (p - media) ** 2, 0) / puntajes.length
  const escala = Math.max(Math.sqrt(varianza), 1e-9)

  const exponenciales = puntajes.map((p) => Math.exp((p - Math.max(...puntajes)) / escala))
  const total = exponenciales.reduce((suma, e) => suma + e, 0)
  return exponenciales.map((e) => e / total)
}

// Lleva una lista a [0, 1] para graficarla.
function normalizar(valores) {
  const minimo = Math.min(...valores)
  const maximo = Math.max(...valores)
  const rango = maximo - minimo
  return valores.map((valor) => (rango > 0 ? (valor - minimo) / rango : 0))
}

/**
 * [DT-10]
 * @param {string} criptograma
 * @param {import('./alfabeto.js').Alfabeto} alfabeto
 * @param {object} [opciones]
 * @param {boolean} [opciones.soloCesarYAtbash=true] Con false, prueba la familia afin completa.
 * @returns {Resultado}
 * @example
 * detectar(cifrarCesar(frase, alfabeto, 17), alfabeto).ganador.desplazamiento  // 17
 */
export function detectar(criptograma, alfabeto, { soloCesarYAtbash = true } = {}) {
  const { conteos, proporciones: obs, total } = histograma(criptograma, alfabeto)
  const { proporciones: ref, cobertura, icEsperado } = referenciaParaAlfabeto(alfabeto)

  const ic = indiceDeCoincidencia(conteos, total)
  const icAleatorio = 1 / alfabeto.n

  const base = {
    ic,
    icEsperado,
    icAleatorio,
    simbolos: total,
    ganador: null,
    confianza: 0,
    candidatos: [],
    curvaCesar: [],
    curvaReflexion: [],
  }

  // Paso 0
  if (total < MINIMO_SIMBOLOS) {
    return {
      ...base,
      atacable: false,
      diagnostico:
        `El texto tiene ${total} símbolos del alfabeto y hacen falta al menos ` +
        `${MINIMO_SIMBOLOS}: con menos, el análisis de frecuencias no tiene muestra suficiente.`,
    }
  }

  if (cobertura < MINIMA_COBERTURA) {
    return {
      ...base,
      atacable: false,
      diagnostico:
        'El alfabeto casi no aparece en el corpus del español, así que no hay tabla de ' +
        'referencia con la que comparar. El cifrado funciona, pero la detección automática no.',
    }
  }

  const umbral = icAleatorio + UMBRAL_IC * (icEsperado - icAleatorio)
  if (ic < umbral) {
    return {
      ...base,
      atacable: false,
      diagnostico:
        `El índice de coincidencia es ${ic.toFixed(4)} y el del español en este alfabeto es ` +
        `${icEsperado.toFixed(4)} (un texto al azar daría ${icAleatorio.toFixed(4)}). ` +
        'Es demasiado plano para una sustitución monoalfabética: esto no es César ni Atbash.',
    }
  }

  // Paso 1
  const n = alfabeto.n
  const curvaCesar = Array.from({ length: n }, (_, b) => correlacion(ref, obs, 1, b, n))
  const curvaReflexion = Array.from({ length: n }, (_, b) =>
    correlacion(ref, obs, modulo(-1, n), b, n),
  )

  // Cesar: las N claves (1, b). Atbash: solo (-1, N - 1).
  const claves = []
  if (soloCesarYAtbash) {
    for (let b = 0; b < n; b += 1) claves.push({ a: 1, b })
    claves.push({ a: modulo(-1, n), b: n - 1 })
  } else {
    for (const a of multiplicadoresValidos(n)) {
      for (let b = 0; b < n; b += 1) claves.push({ a, b })
    }
  }

  const refPlegada = referenciaSinMayusculas(ref, alfabeto)
  const aVerificar = claves
    .map((clave) => ({ clave, simbolos: verosimilitud(conteos, refPlegada, clave, n) }))
    .sort((x, y) => y.simbolos - x.simbolos)
    .slice(0, PRESELECCION)

  // Paso 2: bigramas y palabras se corrigen por legibilidad.
  const mejores = aVerificar.map(({ clave, simbolos }) => {
    const textoClaro = aplicarAfin(criptograma, alfabeto, claveInversa(clave, n))
    const legible = Math.max(legibilidad(textoClaro), 1e-3)
    return {
      clave,
      ...clasificar(clave, n),
      correlacion: correlacion(ref, obs, clave.a, clave.b, n),
      textoClaro,
      bigramas: puntajeBigramas(textoClaro) + CASTIGO_ILEGIBLE * Math.log10(legible),
      palabras: coberturaDePalabras(textoClaro) * legible,
      simbolos,
    }
  })

  const candidatos = mejores
    .map((candidato) => ({
      ...candidato,
      puntaje:
        PESOS.simbolos * candidato.simbolos +
        PESOS.bigramas *
          (Number.isFinite(candidato.bigramas) ? candidato.bigramas : SIN_BIGRAMAS) +
        PESOS.palabras * candidato.palabras,
    }))
    .sort((x, y) => y.puntaje - x.puntaje)
    .slice(0, CANDIDATOS_A_VERIFICAR)

  const probs = probabilidades(candidatos.map((candidato) => candidato.puntaje))
  const ganador = candidatos[0]

  // Empate: se abstiene en vez de apostar.
  const ventaja = candidatos.length > 1 ? ganador.puntaje - candidatos[1].puntaje : Infinity
  if (ventaja < MARGEN_MINIMO) {
    return {
      ...base,
      atacable: false,
      candidatos,
      diagnostico:
        `Con ${total} símbolos, dos claves explican el texto casi igual de bien ` +
        `("${ganador.textoClaro.slice(0, 24)}" y "${candidatos[1].textoClaro.slice(0, 24)}"). ` +
        'No hay muestra suficiente para decidir entre ellas; con un texto un poco más largo se resuelve.',
    }
  }

  // Paso 3
  return {
    ...base,
    atacable: true,
    ganador,
    confianza: probs[0] ?? 0,
    candidatos,
    curvaCesar: normalizar(curvaCesar),
    curvaReflexion: normalizar(curvaReflexion),
    diagnostico: ganador.etiqueta,
  }
}
