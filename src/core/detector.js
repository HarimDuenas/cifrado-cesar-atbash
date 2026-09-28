/**
 * @file El ataque: descifra sin que nadie elija nada.
 *
 * La diferencia con el descifrado tipico esta aqui. Lo comun es probar las N
 * claves posibles, calificar los N resultados y mostrarle al usuario una lista
 * para que escoja. Este detector **calcula** la clave y entrega una sola linea.
 *
 * Los cuatro pasos:
 *
 *   0. ¿Es atacable?  Indice de coincidencia contra el del español.
 *   1. ¿Que clave?    Correlacion cruzada del histograma contra la referencia.
 *   2. ¿Es correcta?  Verificacion con bigramas y palabras del español.
 *   3. Resultado      Tipo, modulo, texto claro y confianza.
 *
 * El paso 1 es el metodo de al-Kindī escrito en algebra. El dijo: cuenta las
 * letras de un texto normal, cuenta las del criptograma y emparejalas. La
 * correlacion cruzada es exactamente esa comparacion, resuelta de una vez en
 * lugar de a ojo:
 *
 *     R(a, b) = Σᵢ ref[i] · obs[(a·i + b) mod N]
 *
 * El par (a, b) que da el pico mas alto es la clave que mejor superpone las dos
 * distribuciones.
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

/** [DT-01] Menos simbolos que esto y la estadistica no tiene de donde agarrarse. */
export const MINIMO_SIMBOLOS = 12

/**
 * [DT-02] Que tan arriba del azar tiene que estar el IC para dar por bueno que el
 * texto es monoalfabetico. 0 seria "cualquier cosa pasa" y 1 "solo si el IC es
 * identico al del español". 0.35 deja pasar textos cortos, donde el IC medido
 * baja por falta de muestra, y sigue rechazando texto aleatorio.
 */
export const UMBRAL_IC = 0.35

/**
 * [DT-03] Cuantos candidatos, ya verificados, se muestran como evidencia y entran
 * al calculo de la confianza.
 */
export const CANDIDATOS_A_VERIFICAR = 8

/**
 * [DT-04] Peso de cada juez al combinar la verificacion. Suman 1.
 *
 * `simbolos` es el juez que mira TODO lo descifrado, no solo las letras: sin el,
 * con alfabetos de cientos de simbolos una clave equivocada convertia casi todo
 * en simbolos raros, esos simbolos se borraban antes de calificar y lo poco que
 * quedaba ("e e a de dad") parecia español. Asi fallo el examen.
 */
export const PESOS = Object.freeze({ bigramas: 0.35, palabras: 0.3, simbolos: 0.35 })

/**
 * [DT-05] Si la cobertura del alfabeto en el corpus es menor a esto, no hay tabla de
 * referencia util (por ejemplo, un alfabeto de puros emojis).
 */
export const MINIMA_COBERTURA = 0.2

/**
 * [DT-11] Cuantas claves, las mas verosimiles simbolo por simbolo, pasan a la
 * verificacion con bigramas y palabras.
 *
 * El filtro va primero a proposito: los jueces de bigramas y palabras borran
 * todo lo que no es letra antes de calificar, asi que un descifrado basura como
 * "VA#?A/A#>" les parece "va a a" y saca 100% de palabras. La verosimilitud si
 * cuenta esos simbolos, y los deja fuera antes de que lleguen a los otros jueces.
 */
export const PRESELECCION = 32

/**
 * Probabilidad minima que se le asigna a un simbolo que el español no usa, para
 * que su logaritmo sea un castigo fuerte y no -Infinity.
 */
const PISO_SIMBOLO = 1e-5

/**
 * @typedef {object} Candidato
 * @property {import('./afin.js').ClaveAfin} clave Clave de cifrado supuesta.
 * @property {string} familia 'cesar', 'atbash' o 'afin'.
 * @property {number | null} desplazamiento El modulo de Cesar, si aplica.
 * @property {number} correlacion Pico de correlacion, normalizado.
 * @property {string} textoClaro El texto descifrado con esa clave.
 * @property {number} bigramas Log-probabilidad promedio de sus pares de letras.
 * @property {number} palabras Proporcion de letras en palabras reconocidas.
 * @property {number} simbolos Log-probabilidad promedio de cada simbolo descifrado.
 * @property {number} puntaje Combinacion de los tres jueces.
 */

/**
 * @typedef {object} Resultado
 * @property {boolean} atacable Si el paso 0 dio permiso de atacar.
 * @property {string} diagnostico Una linea explicando el resultado, para la interfaz.
 * @property {number} ic IC medido del criptograma.
 * @property {number} icEsperado IC del español en este alfabeto.
 * @property {number} icAleatorio IC de un texto al azar (1/N).
 * @property {number} simbolos Cuantos simbolos del texto pertenecen al alfabeto.
 * @property {Candidato | null} ganador El resultado unico, o null si no hay.
 * @property {number} confianza Probabilidad relativa del ganador, entre 0 y 1.
 * @property {Candidato[]} candidatos Los candidatos verificados, mejor primero (evidencia).
 * @property {number[]} curvaCesar R(b) para a = 1, normalizada a [0, 1]: la grafica del ataque.
 * @property {number[]} curvaReflexion R(b) para a = -1, normalizada a [0, 1].
 */

/**
 * [DT-06] Correlacion cruzada entre la referencia y el histograma observado para una
 * clave afin (a, b).
 *
 * @param {Float64Array} ref Proporciones esperadas por indice.
 * @param {Float64Array} obs Proporciones observadas por indice.
 * @param {number} a Multiplicador.
 * @param {number} b Desplazamiento.
 * @param {number} n Tamaño del alfabeto.
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
 * [DT-12] Que tan español es, simbolo por simbolo, lo que produce una clave.
 *
 * Promedio de log10 de la frecuencia esperada de cada simbolo descifrado,
 * contando TODOS los simbolos del alfabeto que trae el criptograma. Un simbolo
 * que el español no usa cuesta -5; una letra comun, cerca de -1. Es el juez
 * que no se deja engañar por un descifrado lleno de simbolos raros.
 *
 * @param {ArrayLike<number>} conteos Cuantas veces aparece cada indice en el criptograma.
 * @param {Float64Array} ref Proporciones esperadas por indice.
 * @param {import('./afin.js').ClaveAfin} clave Clave de cifrado supuesta.
 * @param {number} n Tamaño del alfabeto.
 * @returns {number} Log-probabilidad promedio por simbolo (mas alto es mejor).
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
 * [DT-13] La referencia con mayusculas y minusculas sumadas.
 *
 * En el corpus casi todo va en minuscula, asi que en un alfabeto que tiene las
 * dos, la "E" pesa mucho menos que la "e". Para el juez de simbolos eso castiga
 * a un texto correcto por venir en MAYUSCULAS. Aqui cada letra vale lo que su
 * familia completa ("e" + "E"). Solo se pliega la mayuscula, no las tildes: si
 * "é" valiera lo mismo que "e", un descifrado basura lleno de acentos pasaria.
 *
 * @param {Float64Array} ref Proporciones esperadas por indice.
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
 * [DT-07] Todos los multiplicadores validos para un alfabeto de n simbolos.
 *
 * Cesar usa a = 1 y Atbash a = n - 1 (que es -1). Los demas valores invertibles
 * son los otros cifrados afines: se incluyen para que el sistema resuelva la
 * familia completa y no solo los dos casos que pide la rubrica.
 *
 * @param {number} n
 * @param {boolean} [soloCesarYAtbash=false] Limita la busqueda a los dos casos de la rubrica.
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
 * [DT-08] Clasifica una clave dentro de la familia afin.
 *
 * @param {import('./afin.js').ClaveAfin} clave
 * @param {number} n Tamaño del alfabeto.
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
 * [DT-09] Convierte una lista de puntajes en probabilidades relativas (softmax con la
 * escala tomada de los propios datos).
 *
 * La confianza no es un numero inventado: es que tanto se despega el mejor
 * candidato de los demas, medido en desviaciones estandar. Si dos candidatos
 * empatan, la confianza baja sola.
 *
 * @param {number[]} puntajes
 * @returns {number[]} Probabilidades que suman 1.
 */
export function probabilidades(puntajes) {
  if (puntajes.length === 0) return []
  if (puntajes.length === 1) return [1]

  const media = puntajes.reduce((suma, p) => suma + p, 0) / puntajes.length
  const varianza = puntajes.reduce((suma, p) => suma + (p - media) ** 2, 0) / puntajes.length
  const escala = Math.max(Math.sqrt(varianza), 1e-9)

  const exponenciales = puntajes.map((p) => Math.exp((p - Math.max(...puntajes)) / escala))
  const total = exponenciales.reduce((suma, e) => suma + e, 0)
  return exponenciales.map((e) => e / total)
}

/**
 * Normaliza una lista de valores a [0, 1] para poder graficarla.
 *
 * @param {number[]} valores
 * @returns {number[]}
 */
function normalizar(valores) {
  const minimo = Math.min(...valores)
  const maximo = Math.max(...valores)
  const rango = maximo - minimo
  return valores.map((valor) => (rango > 0 ? (valor - minimo) / rango : 0))
}

/**
 * [DT-10] Descifra un criptograma sin intervencion humana.
 *
 * @param {string} criptograma Texto cifrado.
 * @param {import('./alfabeto.js').Alfabeto} alfabeto El alfabeto con el que se cifro.
 * @param {object} [opciones]
 * @param {boolean} [opciones.soloCesarYAtbash=true] Ataca solo los dos cifrados
 *   que pide la rubrica: Cesar con cualquier k y Atbash (a = -1, b = N - 1).
 *   Con `false` resuelve la familia afin completa, pero con textos cortos y
 *   alfabetos grandes eso da falsos positivos: entre decenas de miles de claves
 *   alguna se parece al español por casualidad.
 * @returns {Resultado}
 *
 * @example
 * const alfabeto = crearAlfabeto(ASCII_IMPRIMIBLE)
 * const resultado = detectar(cifrarCesar(frase, alfabeto, 17), alfabeto)
 * resultado.ganador.familia        // 'cesar'
 * resultado.ganador.desplazamiento // 17
 * resultado.ganador.textoClaro     // la frase original
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

  // --- Paso 0: ¿vale la pena atacar?
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

  // --- Paso 1: calcular la clave por correlacion cruzada.
  const n = alfabeto.n
  const curvaCesar = Array.from({ length: n }, (_, b) => correlacion(ref, obs, 1, b, n))
  const curvaReflexion = Array.from({ length: n }, (_, b) =>
    correlacion(ref, obs, modulo(-1, n), b, n),
  )

  // Cesar son las N claves (1, b). Atbash es UNA sola clave: (-1, N - 1). Antes
  // se probaba a = -1 con cualquier b, que no es Atbash sino un afin, y con
  // textos cortos a veces ganaba.
  const claves = []
  if (soloCesarYAtbash) {
    for (let b = 0; b < n; b += 1) claves.push({ a: 1, b })
    claves.push({ a: modulo(-1, n), b: n - 1 })
  } else {
    for (const a of multiplicadoresValidos(n)) {
      for (let b = 0; b < n; b += 1) claves.push({ a, b })
    }
  }

  // El filtro de entrada es la verosimilitud, no la correlacion: la correlacion
  // es lineal y casi no castiga un simbolo que el español no usa, asi que con
  // alfabetos de cientos de simbolos la clave correcta podia quedarse fuera de
  // las que se verificaban.
  const refPlegada = referenciaSinMayusculas(ref, alfabeto)
  const aVerificar = claves
    .map((clave) => ({ clave, simbolos: verosimilitud(conteos, refPlegada, clave, n) }))
    .sort((x, y) => y.simbolos - x.simbolos)
    .slice(0, PRESELECCION)

  // --- Paso 2: verificar las preseleccionadas con tres jueces. Bigramas y
  // palabras se corrigen por legibilidad: sin eso, un descifrado lleno de
  // simbolos raros quedaba reducido a "so s" y sacaba 100% de palabras.
  const mejores = aVerificar.map(({ clave, simbolos }) => {
    const textoClaro = aplicarAfin(criptograma, alfabeto, claveInversa(clave, n))
    const legible = Math.max(legibilidad(textoClaro), 1e-3)
    return {
      clave,
      ...clasificar(clave, n),
      correlacion: correlacion(ref, obs, clave.a, clave.b, n),
      textoClaro,
      bigramas: puntajeBigramas(textoClaro) + Math.log10(legible),
      palabras: coberturaDePalabras(textoClaro) * legible,
      simbolos,
    }
  })

  // Los dos jueces viven en escalas distintas (un logaritmo y una proporcion),
  // asi que se comparan entre candidatos y no en crudo.
  const zetas = (valores) => {
    const finitos = valores.filter(Number.isFinite)
    const media = finitos.reduce((suma, v) => suma + v, 0) / (finitos.length || 1)
    const varianza =
      finitos.reduce((suma, v) => suma + (v - media) ** 2, 0) / (finitos.length || 1)
    const desv = Math.max(Math.sqrt(varianza), 1e-9)
    return valores.map((v) => (Number.isFinite(v) ? (v - media) / desv : -5))
  }

  const zBigramas = zetas(mejores.map((candidato) => candidato.bigramas))
  const zPalabras = zetas(mejores.map((candidato) => candidato.palabras))
  const zSimbolos = zetas(mejores.map((candidato) => candidato.simbolos))

  const candidatos = mejores
    .map((candidato, indice) => ({
      ...candidato,
      puntaje:
        PESOS.bigramas * zBigramas[indice] +
        PESOS.palabras * zPalabras[indice] +
        PESOS.simbolos * zSimbolos[indice],
    }))
    .sort((x, y) => y.puntaje - x.puntaje)
    .slice(0, CANDIDATOS_A_VERIFICAR)

  const probs = probabilidades(candidatos.map((candidato) => candidato.puntaje))
  const ganador = candidatos[0]

  // --- Paso 3: una sola linea.
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
