#!/usr/bin/env node
/**
 * @file Genera las tablas de referencia del español que usa el criptoanalisis.
 *
 * Las tablas NO se escriben a mano ni se copian de una pagina: se cuentan sobre
 * un corpus de dominio publico, y el JSON resultante guarda la URL de ese
 * corpus y su SHA-256. Cualquiera puede bajar el mismo archivo, comprobar el
 * hash, volver a correr este script y obtener las mismas tablas. Esa es la
 * parte de "documentar de manera segura" que le toca a los datos.
 *
 * Uso:
 *   node scripts/generar-tablas.mjs <corpus.txt> [dir-salida] [url-de-la-fuente]
 *
 * Salidas:
 *   <dir-salida>/frecuencias-es.json  unigramas, bigramas e indice de coincidencia
 *   <dir-salida>/palabras-es.json     las palabras mas usadas, para la verificacion
 */

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Letras del español en minusculas, mas el espacio, para bigramas y palabras. */
const LETRAS_Y_ESPACIO = 'abcdefghijklmnñopqrstuvwxyz '

/** Rango imprimible de ASCII (32-126), el alfabeto por defecto del programa. */
const ASCII_IMPRIMIBLE = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i))

/** Cuantas palabras distintas se guardan, de mas usada a menos. */
const TOPE_PALABRAS = 5000

/** Un caracter se guarda en la tabla de unigramas si aparece al menos esto. */
const MINIMO_APARICIONES = 5

/**
 * Quita tildes y dieresis pero conserva la Ñ.
 *
 * Se descompone el texto (NFD) y se borran solo el acento agudo (U+0301) y la
 * dieresis (U+0308). La virgulilla de la Ñ es U+0303 y no se toca: si se
 * borraran todas las marcas, "ñ" se volveria "n" y el español perderia una
 * letra que sí cuenta para las estadisticas.
 *
 * @param {string} texto
 * @returns {string}
 */
function quitarTildes(texto) {
  return texto.normalize('NFD').replace(/[́̈]/g, '').normalize('NFC')
}

/**
 * Recorta el encabezado y el pie que Project Gutenberg agrega en ingles.
 * Si no encuentra los marcadores, devuelve el texto completo.
 *
 * @param {string} texto
 * @returns {string}
 */
function soloElLibro(texto) {
  const inicio = texto.search(/\*\*\*\s*START OF TH(E|IS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i)
  const fin = texto.search(/\*\*\*\s*END OF TH(E|IS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i)
  if (inicio === -1 || fin === -1 || fin <= inicio) return texto
  return texto.slice(texto.indexOf('\n', inicio) + 1, fin)
}

/**
 * Indice de coincidencia: la probabilidad de que dos simbolos tomados al azar
 * del texto sean el mismo.
 *
 *     IC = Σ nᵢ(nᵢ - 1) / [ n(n - 1) ]
 *
 * Es la medida que permite saber, antes de atacar, si un criptograma pudo
 * haberse hecho con una sustitucion monoalfabetica: Cesar y Atbash solo
 * cambian los simbolos de lugar, asi que no alteran este numero.
 *
 * @param {Map<string, number>} conteos Conteo por simbolo.
 * @returns {number} El IC, entre 0 y 1.
 */
function indiceDeCoincidencia(conteos) {
  let total = 0
  let suma = 0
  for (const cantidad of conteos.values()) {
    total += cantidad
    suma += cantidad * (cantidad - 1)
  }
  return total > 1 ? suma / (total * (total - 1)) : 0
}

/**
 * Cuenta cuantas veces aparece cada elemento de una secuencia.
 *
 * @param {Iterable<string>} elementos
 * @returns {Map<string, number>}
 */
function contar(elementos) {
  const conteos = new Map()
  for (const elemento of elementos) {
    conteos.set(elemento, (conteos.get(elemento) ?? 0) + 1)
  }
  return conteos
}

/**
 * Convierte conteos a una lista de pares [simbolo, proporcion], ordenada de
 * mayor a menor.
 *
 * Devuelve una lista y no un objeto a proposito: en JavaScript (y por lo tanto
 * en el JSON que se vuelve a leer) las claves que parecen enteros, como "1",
 * se reordenan solas al principio del objeto. Con los digitos del ASCII eso
 * desordenaba la tabla y hacia mentir al resumen que se transcribe al
 * documento. Una lista conserva el orden tal cual.
 *
 * @param {Map<string, number>} conteos
 * @param {number} [minimo=0] Descarta las claves con menos apariciones.
 * @returns {Array<[string, number]>}
 */
function aParesOrdenados(conteos, minimo = 0) {
  const filtrados = [...conteos].filter(([, cantidad]) => cantidad >= minimo)
  const total = filtrados.reduce((suma, [, cantidad]) => suma + cantidad, 0)
  return filtrados
    .sort((a, b) => b[1] - a[1])
    .map(([clave, cantidad]) => [clave, Number((cantidad / total).toFixed(8))])
}

const [entrada, dirSalida = 'src/data', urlFuente = '(sin especificar)'] = process.argv.slice(2)

if (!entrada) {
  console.error('uso: node scripts/generar-tablas.mjs <corpus.txt> [dir-salida] [url-de-la-fuente]')
  process.exit(1)
}

const bytes = readFileSync(resolve(entrada))
const sha256 = createHash('sha256').update(bytes).digest('hex')
const completo = bytes.toString('utf8').normalize('NFC')
const libro = soloElLibro(completo)

// --- Unigramas: todos los caracteres tal como vienen, sin bajar a minusculas.
// El alfabeto por defecto distingue mayusculas de minusculas, asi que la tabla
// tambien tiene que distinguirlas.
const unigramas = contar(libro)

// --- Texto reducido para bigramas y palabras: minusculas, sin tildes, y todo
// lo que no sea letra o espacio se vuelve un espacio.
const permitidas = new Set(Array.from(LETRAS_Y_ESPACIO))
const reducido = Array.from(quitarTildes(libro.toLowerCase()))
  .map((caracter) => (permitidas.has(caracter) ? caracter : ' '))
  .join('')
  .replace(/ {2,}/g, ' ')

const bigramas = contar(
  Array.from({ length: Math.max(0, reducido.length - 1) }, (_, i) => reducido.slice(i, i + 2)),
)

const palabras = contar(
  reducido.split(' ').filter((palabra) => palabra.length >= 2 && palabra.length <= 20),
)

const conteosAscii = new Map(
  [...unigramas].filter(([caracter]) => ASCII_IMPRIMIBLE.includes(caracter)),
)
const conteosLetras = new Map([...contar(reducido)].filter(([c]) => permitidas.has(c)))

const frecuencias = {
  metadatos: {
    fuente: urlFuente,
    sha256Corpus: sha256,
    generado: new Date().toISOString().slice(0, 10),
    caracteresContados: libro.length,
    nota:
      'Generado por scripts/generar-tablas.mjs. `unigramas` y `bigramas` son listas ' +
      '[simbolo, proporcion] ordenadas de mayor a menor; se usan listas y no objetos ' +
      'porque las claves que parecen enteros se reordenarian solas. Las proporciones se ' +
      'renormalizan en tiempo de ejecucion sobre los simbolos del alfabeto que elija el usuario.',
  },
  indiceDeCoincidencia: {
    asciiImprimible: Number(indiceDeCoincidencia(conteosAscii).toFixed(6)),
    letrasYEspacio: Number(indiceDeCoincidencia(conteosLetras).toFixed(6)),
    aleatorioAscii: Number((1 / 95).toFixed(6)),
  },
  unigramas: aParesOrdenados(unigramas, MINIMO_APARICIONES),
  bigramas: aParesOrdenados(bigramas, MINIMO_APARICIONES),
}

const listaPalabras = [...palabras]
  .sort((a, b) => b[1] - a[1])
  .slice(0, TOPE_PALABRAS)
  .map(([palabra]) => palabra)

mkdirSync(resolve(dirSalida), { recursive: true })
writeFileSync(
  resolve(dirSalida, 'frecuencias-es.json'),
  `${JSON.stringify(frecuencias, null, 2)}\n`,
)
writeFileSync(
  resolve(dirSalida, 'palabras-es.json'),
  `${JSON.stringify({ metadatos: frecuencias.metadatos, palabras: listaPalabras }, null, 2)}\n`,
)

// --- Resumen en consola: estos numeros se transcriben al documento.
console.log(`corpus: ${entrada}`)
console.log(`sha256: ${sha256}`)
console.log(`caracteres del libro: ${libro.length.toLocaleString('es-MX')}`)
console.log(`IC (ASCII imprimible): ${frecuencias.indiceDeCoincidencia.asciiImprimible}`)
console.log(`IC (letras y espacio): ${frecuencias.indiceDeCoincidencia.letrasYEspacio}`)
console.log(`IC de un texto al azar (1/95): ${frecuencias.indiceDeCoincidencia.aleatorioAscii}`)
console.log(`unigramas: ${frecuencias.unigramas.length} · bigramas: ${frecuencias.bigramas.length}`)
console.log(`palabras guardadas: ${listaPalabras.length}`)
console.log('\nlos 10 simbolos mas frecuentes:')
for (const [simbolo, proporcion] of frecuencias.unigramas.slice(0, 10)) {
  const etiqueta = simbolo === ' ' ? '(espacio)' : simbolo === '\n' ? '(salto)' : simbolo
  console.log(`  ${etiqueta.padEnd(10)} ${(proporcion * 100).toFixed(2)}%`)
}
