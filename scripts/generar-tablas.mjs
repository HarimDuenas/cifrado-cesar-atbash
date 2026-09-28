#!/usr/bin/env node
 /**
  * @file Genera las tablas del español desde un corpus de dominio publico y
  * guarda su URL y SHA-256 para que cualquiera pueda reproducirlas.
  *
  * Uso: node scripts/generar-tablas.mjs <corpus.txt> [dir-salida] [url-de-la-fuente]
  */

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Letras del español y espacio: base de bigramas y palabras.
const LETRAS_Y_ESPACIO = 'abcdefghijklmnñopqrstuvwxyz '

// ASCII imprimible (32-126).
const ASCII_IMPRIMIBLE = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i))

// Palabras mas usadas que se guardan.
const TOPE_PALABRAS = 5000

// Apariciones minimas para entrar a la tabla de unigramas.
const MINIMO_APARICIONES = 5

 // Quita acento agudo y dieresis; la tilde de la Ñ se queda.
function quitarTildes(texto) {
  return texto.normalize('NFD').replace(/[\u0301\u0308]/g, '').normalize('NFC')
}

 // Quita el encabezado y el pie de Project Gutenberg, si estan.
function soloElLibro(texto) {
  const inicio = texto.search(/\*\*\*\s*START OF TH(E|IS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i)
  const fin = texto.search(/\*\*\*\s*END OF TH(E|IS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i)
  if (inicio === -1 || fin === -1 || fin <= inicio) return texto
  return texto.slice(texto.indexOf('\n', inicio) + 1, fin)
}

 // IC = Σ nᵢ(nᵢ - 1) / [ n(n - 1) ]
function indiceDeCoincidencia(conteos) {
  let total = 0
  let suma = 0
  for (const cantidad of conteos.values()) {
    total += cantidad
    suma += cantidad * (cantidad - 1)
  }
  return total > 1 ? suma / (total * (total - 1)) : 0
}

function contar(elementos) {
  const conteos = new Map()
  for (const elemento of elementos) {
    conteos.set(elemento, (conteos.get(elemento) ?? 0) + 1)
  }
  return conteos
}

 // Lista y no objeto: las claves como "1" se reordenarian solas.
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

// Unigramas: tal como vienen, distinguiendo mayusculas.
const unigramas = contar(libro)

// Bigramas y palabras: sobre el texto reducido.
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

// Resumen para el documento.
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
