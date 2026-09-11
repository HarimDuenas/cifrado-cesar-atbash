/**
 * @file Las cuentas de al-Kindī: histogramas, indice de coincidencia y las
 * tablas de referencia del español.
 *
 * Aqui no hay nada de criptografia todavia. Solo se mide: cuantas veces
 * aparece cada simbolo en un texto, que tan parecido es eso a lo que hace el
 * español, y que tan "apelotonada" esta la distribucion. El ataque en si vive
 * en `detector.js`.
 */

import frecuenciasEs from '../data/frecuencias-es.json'
import palabrasEs from '../data/palabras-es.json'
import { bigramasDe, palabrasDe } from './texto.js'

/** De donde salieron las tablas: URL del corpus, su SHA-256 y la fecha. */
export const METADATOS_REFERENCIA = Object.freeze(frecuenciasEs.metadatos)

/** IC del español medido sobre el corpus, y el de un texto al azar. */
export const IC_REFERENCIA = Object.freeze(frecuenciasEs.indiceDeCoincidencia)

/** Proporcion de cada caracter en el corpus, tal cual (distingue mayusculas). */
const UNIGRAMAS = new Map(frecuenciasEs.unigramas)

/** Proporcion de cada par de letras en el corpus reducido. */
const BIGRAMAS = new Map(frecuenciasEs.bigramas)

/** Las 5000 palabras mas usadas del corpus. */
export const PALABRAS = new Set(palabrasEs.palabras)

/**
 * Probabilidad que se le asigna a un bigrama que no aparece en la tabla.
 * No puede ser cero: un solo par raro dejaria el puntaje en -infinito y
 * tumbaria a un candidato que por lo demas es correcto.
 */
const PISO_BIGRAMA = 1e-7

/**
 * Se le suma a cada simbolo de la referencia para que ninguno quede en cero.
 * Sin esto, un simbolo que no aparece en el corpus (un emoji, por ejemplo)
 * volveria imposible cualquier texto que lo use.
 */
export const SUAVIZADO = 1e-6

/**
 * @typedef {object} Histograma
 * @property {Float64Array} conteos Cuantas veces aparece el simbolo de cada indice.
 * @property {Float64Array} proporciones Los mismos conteos divididos por el total.
 * @property {number} total Cuantos simbolos del texto pertenecen al alfabeto.
 */

/**
 * Cuenta los simbolos de un texto segun su posicion en el alfabeto.
 *
 * Los caracteres que no pertenecen al alfabeto se ignoran: no fueron cifrados,
 * asi que no dicen nada sobre la clave.
 *
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
 * Indice de coincidencia: la probabilidad de que dos simbolos tomados al azar
 * del texto resulten ser el mismo.
 *
 *     IC = Σ nᵢ(nᵢ - 1) / [ n(n - 1) ]
 *
 * Es la pieza que permite preguntar *antes de atacar* si vale la pena atacar:
 * una sustitucion monoalfabetica solo cambia los simbolos de lugar, asi que el
 * IC no se altera. Si el IC de un criptograma se parece al del español, pudo
 * hacerse con Cesar o Atbash; si se desploma hacia 1/N, no.
 *
 * @param {Float64Array | number[]} conteos Conteo por simbolo.
 * @param {number} total Suma de los conteos.
 * @returns {number} El IC, entre 0 y 1.
 */
export function indiceDeCoincidencia(conteos, total) {
  if (total < 2) return 0
  let suma = 0
  for (const cantidad of conteos) suma += cantidad * (cantidad - 1)
  return suma / (total * (total - 1))
}

/**
 * @typedef {object} Referencia
 * @property {Float64Array} proporciones Proporcion esperada de cada indice del alfabeto.
 * @property {number} cobertura Que parte del corpus cae dentro de este alfabeto (0 a 1).
 * @property {number} icEsperado IC teorico de esa distribucion (Σ pᵢ²).
 */

/**
 * Proyecta la tabla del español sobre el alfabeto que eligio el usuario.
 *
 * La tabla trae proporciones de todo el corpus, pero el alfabeto puede ser
 * cualquier subconjunto (o incluir simbolos que el corpus no tiene). Se toman
 * las proporciones de los simbolos presentes, se suaviza y se renormaliza para
 * que sumen 1 dentro de ese alfabeto.
 *
 * `cobertura` es el dato honesto para la interfaz: si es muy baja, el alfabeto
 * no tiene nada que ver con el español y el ataque estadistico no aplica.
 *
 * @param {import('./alfabeto.js').Alfabeto} alfabeto
 * @returns {Referencia}
 */
export function referenciaParaAlfabeto(alfabeto) {
  // Mismo criterio que `quitarTildes` de texto.js, repetido aqui como ayudante
  // local para no acoplar este modulo al de reduccion: se quitan acento agudo
  // y dieresis, nunca la virgulilla de la Ñ.
  const sinTildes = (simbolo) =>
    simbolo.normalize('NFD').replace(/[́̈]/g, '').normalize('NFC')

  // Por que "doblar" y no buscar cada simbolo tal cual: un alfabeto de puras
  // mayusculas (A-Z con Ñ) solo encontraria en el corpus las mayusculas, que
  // son las que abren oracion, y la referencia quedaria en el 2% del texto.
  // Doblando minusculas y acentuadas sobre el simbolo del alfabeto, ese
  // alfabeto recibe la frecuencia real de las letras del español. Con el ASCII
  // imprimible, que ya trae ambas cajas, cada caracter cae en si mismo y esto
  // no cambia nada. Lo detecto un test con el alfabeto de 27 letras.
  const destino = new Map()
  for (const [indice, simbolo] of alfabeto.simbolos.entries()) {
    for (const variante of [simbolo, sinTildes(simbolo)]) {
      if (!destino.has(variante)) destino.set(variante, indice)
    }
  }

  const proporciones = new Float64Array(alfabeto.n)
  let cobertura = 0

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
    // Ningun simbolo del alfabeto aparece en el corpus: no hay referencia.
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
 * Que tan español se ve un texto segun sus pares de letras.
 *
 * Devuelve el promedio del logaritmo de la probabilidad de cada bigrama. Es un
 * numero negativo: mas cerca de cero, mas parecido al español. Sirve para
 * descartar candidatos que tienen las frecuencias correctas pero producen
 * combinaciones imposibles como "qx" o "ññ".
 *
 * @param {string} texto
 * @returns {number} Log-probabilidad promedio, o -Infinity si no hay bigramas.
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
 * Que proporcion de las letras del texto forman palabras que existen.
 *
 * Se pesa por longitud: acertar "constantinopla" dice mucho mas que acertar
 * "de". Es el juez que salva los textos cortos, donde las frecuencias solas no
 * alcanzan.
 *
 * @param {string} texto
 * @returns {number} Entre 0 y 1.
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
