import { describe, expect, it } from 'vitest'

import {
  ASCII_IMPRIMIBLE,
  ESPANOL_MAYUSCULAS,
  crearAlfabeto,
} from '../src/core/alfabeto.js'
import { cifrarCesar } from '../src/core/cesar.js'
import { atbash } from '../src/core/atbash.js'
import { aplicarAfin } from '../src/core/afin.js'
import { detectar, clasificar, multiplicadoresValidos } from '../src/core/detector.js'
import {
  IC_REFERENCIA,
  METADATOS_REFERENCIA,
  coberturaDePalabras,
  histograma,
  indiceDeCoincidencia,
  puntajeBigramas,
  referenciaParaAlfabeto,
} from '../src/core/frecuencias.js'

const ascii = crearAlfabeto(ASCII_IMPRIMIBLE)
const espanol = crearAlfabeto(ESPANOL_MAYUSCULAS)

/** Frases de prueba: español normal, de distintos largos. */
const FRASES = [
  'El analisis de frecuencias no adivina, cuenta y compara las letras del mensaje.',
  'Al-Kindi escribio el primer tratado de criptoanalisis del que se tiene noticia.',
  'La seguridad de un cifrado no puede depender de que nadie sepa como funciona.',
  'Cada sustitucion monoalfabetica conserva la estadistica del idioma original.',
  'El espacio es el caracter mas frecuente del español escrito, mas que la letra e.',
  'Un mensaje corto es mas dificil de romper porque la muestra no alcanza.',
  'La casa de la sabiduria de Bagdad reunio a los traductores y matematicos.',
  'Aumentar el tamaño de la clave no arregla un problema de estructura.',
  'Las computadoras prueban todas las claves posibles en menos de un segundo.',
  'El indice de coincidencia mide que tan apelotonada esta una distribucion.',
  'Cifrar y descifrar con la misma operacion es lo que hace especial a Atbash.',
  'Los nombres propios suelen delatar el contenido de un mensaje interceptado.',
  'Nadie deberia guardar contraseñas cifradas con metodos del siglo primero.',
  'El programa entrega una sola linea porque la clave se calcula, no se elige.',
  'La correlacion cruzada encuentra el desplazamiento que superpone dos curvas.',
  'Shannon explico la difusion y la confusion mucho despues que al-Kindi.',
  'Un cifrado determinista revela cuando dos mensajes dicen exactamente lo mismo.',
  'La rubrica pide detectar el tipo y el modulo sin intervencion humana.',
  'Los bigramas descartan candidatos que producen combinaciones imposibles.',
  'El alfabeto define el modulo aritmetico y por lo tanto todo el resultado.',
  'Don Quijote sirve como corpus porque esta en dominio publico desde siempre.',
  'Verificar con un diccionario salva los casos donde las frecuencias fallan.',
  'La entrega incluye el enlace al programa y el enlace al codigo documentado.',
  'Firmar el resultado del build permite comprobar que el sitio corre ese codigo.',
  'Una permutacion fija no tiene clave y por eso no ofrece ninguna proteccion.',
  'El texto claro y el criptograma tienen la misma longitud en estos cifrados.',
  'Contar letras parece simple y sin embargo rompio siglos de mensajes secretos.',
  'La estadistica del idioma sobrevive al cifrado y ahi esta toda la debilidad.',
  'Escribir la documentacion desde el codigo evita que se desactualice sola.',
  'Publicar el hash del paquete deja constancia de que nada se altero despues.',
]

describe('tablas de referencia', () => {
  it('vienen del corpus, con su fuente y su hash', () => {
    expect(METADATOS_REFERENCIA.fuente).toMatch(/^https?:\/\//)
    expect(METADATOS_REFERENCIA.sha256Corpus).toMatch(/^[0-9a-f]{64}$/)
    expect(METADATOS_REFERENCIA.caracteresContados).toBeGreaterThan(1_000_000)
  })

  it('el español esta muy por encima del azar en indice de coincidencia', () => {
    expect(IC_REFERENCIA.asciiImprimible).toBeGreaterThan(5 * IC_REFERENCIA.aleatorioAscii)
  })

  it('el espacio es el simbolo mas frecuente del ASCII imprimible', () => {
    const { proporciones } = referenciaParaAlfabeto(ascii)
    const maximo = Math.max(...proporciones)
    expect(proporciones[ascii.indiceDe(' ')]).toBe(maximo)
  })

  it('la referencia suma 1 y cubre buena parte del corpus', () => {
    const { proporciones, cobertura } = referenciaParaAlfabeto(ascii)
    const suma = proporciones.reduce((total, p) => total + p, 0)
    expect(suma).toBeCloseTo(1, 6)
    expect(cobertura).toBeGreaterThan(0.5)
  })

  it('avisa cuando el alfabeto no tiene nada que ver con el corpus', () => {
    const emojis = crearAlfabeto('👍👎🎯🔒🧩🗝️'.normalize('NFC'))
    expect(referenciaParaAlfabeto(emojis).cobertura).toBe(0)
  })
})

describe('jueces del paso 2', () => {
  it('el español puntua mejor que el texto revuelto en bigramas', () => {
    const claro = FRASES[0]
    const revuelto = cifrarCesar(claro, ascii, 40)
    expect(puntajeBigramas(claro)).toBeGreaterThan(puntajeBigramas(revuelto))
  })

  it('reconoce palabras del español y no las de un texto cifrado', () => {
    // El corpus es una novela de 1605, asi que las palabras tecnicas modernas
    // ("cifrado", "seguridad") no entran en sus 5000 mas usadas: medido, el
    // texto claro da 0.63 y no 0.9. Lo que le sirve al detector no es el valor
    // absoluto sino la distancia contra el texto cifrado, y eso es lo que se
    // prueba aqui. Queda como limitacion documentada del corpus elegido.
    const claro = coberturaDePalabras(FRASES[2])
    const cifrado = coberturaDePalabras(cifrarCesar(FRASES[2], ascii, 13))

    expect(claro).toBeGreaterThan(0.55)
    expect(cifrado).toBeLessThan(0.2)
    expect(claro).toBeGreaterThan(5 * cifrado)
  })

  it('el histograma solo cuenta simbolos del alfabeto', () => {
    const { total } = histograma('AB ñé', ascii)
    expect(total).toBe(3)
  })

  it('el IC de un texto sin repeticiones es cero', () => {
    const { conteos, total } = histograma('abc', ascii)
    expect(indiceDeCoincidencia(conteos, total)).toBe(0)
  })
})

describe('clasificacion de la clave', () => {
  it('reconoce Cesar y reporta su modulo', () => {
    expect(clasificar({ a: 1, b: 17 }, 95)).toMatchObject({ familia: 'cesar', desplazamiento: 17 })
  })

  it('reconoce Atbash y aclara que no usa modulo', () => {
    const resultado = clasificar({ a: -1, b: 94 }, 95)
    expect(resultado.familia).toBe('atbash')
    expect(resultado.desplazamiento).toBeNull()
    expect(resultado.etiqueta).toMatch(/permutación fija/)
  })

  it('llama afin a cualquier otro caso', () => {
    expect(clasificar({ a: 7, b: 3 }, 95).familia).toBe('afin')
  })

  it('con 95 simbolos hay 72 multiplicadores validos', () => {
    expect(multiplicadoresValidos(95)).toHaveLength(72)
    expect(multiplicadoresValidos(95, true)).toEqual([1, 94])
  })
})

describe('deteccion automatica', () => {
  it('descifra un Cesar sin que nadie le diga el modulo', () => {
    const k = 17
    const resultado = detectar(cifrarCesar(FRASES[0], ascii, k), ascii)

    expect(resultado.atacable).toBe(true)
    expect(resultado.ganador.familia).toBe('cesar')
    expect(resultado.ganador.desplazamiento).toBe(k)
    expect(resultado.ganador.textoClaro).toBe(FRASES[0])
    expect(resultado.diagnostico).toBe('César, módulo 17')
  })

  it('descifra Atbash y lo distingue de Cesar', () => {
    const resultado = detectar(atbash(FRASES[1], ascii), ascii)

    expect(resultado.ganador.familia).toBe('atbash')
    expect(resultado.ganador.textoClaro).toBe(FRASES[1])
    expect(resultado.ganador.desplazamiento).toBeNull()
  })

  it('resuelve tambien un afin generico, que no es ninguno de los dos', () => {
    const clave = { a: 7, b: 23 }
    const resultado = detectar(aplicarAfin(FRASES[3], ascii, clave), ascii)

    expect(resultado.ganador.familia).toBe('afin')
    expect(resultado.ganador.textoClaro).toBe(FRASES[3])
  })

  it('funciona igual con el alfabeto de 27 letras', () => {
    const texto = 'EL ANALISIS DE FRECUENCIAS CUENTA LAS LETRAS DEL MENSAJE SECRETO'
    const resultado = detectar(cifrarCesar(texto, espanol, 9), espanol)

    expect(resultado.ganador.desplazamiento).toBe(9)
    expect(resultado.ganador.textoClaro).toBe(texto)
  })

  it('entrega un solo resultado, con su confianza', () => {
    const resultado = detectar(cifrarCesar(FRASES[4], ascii, 42), ascii)

    expect(resultado.ganador).not.toBeNull()
    expect(resultado.confianza).toBeGreaterThan(0.5)
    expect(resultado.candidatos.length).toBeGreaterThan(1) // evidencia, no opciones
  })

  it('devuelve las curvas del ataque para graficarlas', () => {
    const resultado = detectar(cifrarCesar(FRASES[5], ascii, 30), ascii)

    expect(resultado.curvaCesar).toHaveLength(ascii.n)
    expect(Math.max(...resultado.curvaCesar)).toBe(1)
    expect(resultado.curvaCesar[30]).toBeGreaterThan(0.9)
  })

  it('se niega a inventar con un texto demasiado corto', () => {
    const resultado = detectar('hola', ascii)

    expect(resultado.atacable).toBe(false)
    expect(resultado.ganador).toBeNull()
    expect(resultado.diagnostico).toMatch(/al menos 12/)
  })

  it('detecta que un texto aleatorio no es monoalfabetico', () => {
    // Sustitucion polialfabetica casera: cada posicion usa un desplazamiento
    // distinto, asi que el IC se desploma.
    const claro = FRASES.slice(0, 4).join(' ')
    const revuelto = Array.from(claro)
      .map((simbolo, i) => cifrarCesar(simbolo, ascii, (i * 37) % 95))
      .join('')

    const resultado = detectar(revuelto, ascii)
    expect(resultado.atacable).toBe(false)
    expect(resultado.diagnostico).toMatch(/no es César ni Atbash/)
  })

  it('avisa, sin reventar, que un alfabeto de emojis no es atacable', () => {
    const emojis = crearAlfabeto('👍👎🎯🔒')
    const resultado = detectar('👍👎🎯🔒👍👎🎯🔒👍👎🎯🔒', emojis)

    expect(resultado.atacable).toBe(false)
    expect(resultado.diagnostico).toMatch(/no hay tabla de referencia/)
  })
})

describe('precision medida (los numeros que van a la Conclusion)', () => {
  /**
   * Corre el ataque sobre las 30 frases con varias claves y cuenta aciertos.
   * Un acierto es que el texto descifrado salga identico al original: no se
   * acepta "casi", porque el programa entrega una sola linea.
   *
   * @param {import('../src/core/alfabeto.js').Alfabeto} alfabeto
   * @param {string[]} frases
   * @param {number[]} claves
   * @param {(texto: string) => string} cifrar
   */
  function medir(alfabeto, frases, claves, cifrar = cifrarCesar) {
    let aciertos = 0
    let total = 0
    const fallos = []

    for (const frase of frases) {
      for (const k of claves) {
        total += 1
        const resultado = detectar(cifrar(frase, alfabeto, k), alfabeto)
        if (resultado.atacable && resultado.ganador.textoClaro === frase) aciertos += 1
        else fallos.push({ frase: frase.slice(0, 40), clave: k })
      }
    }

    return { aciertos, total, precision: Number((aciertos / total).toFixed(4)), fallos }
  }

  it('mide la precision y guarda los numeros en tests/salida/precision.json', async () => {
    const { mkdirSync, writeFileSync } = await import('node:fs')

    const cesarAscii = medir(ascii, FRASES, [1, 17, 42, 94])
    const atbashAscii = medir(ascii, FRASES, [0], (texto, alfabeto) => atbash(texto, alfabeto))
    const cesarEspanol = medir(
      espanol,
      FRASES.map((frase) => frase.toUpperCase()),
      [3, 9, 26],
    )

    // ¿Desde que largo de texto es confiable? Es un hallazgo experimental, no
    // un parametro: se mide recortando el mismo texto a distintas longitudes.
    const base = FRASES.join(' ')
    const porLongitud = [10, 15, 20, 30, 40, 60, 80, 120].map((largo) => {
      const fragmento = base.slice(0, largo)
      const resultado = detectar(cifrarCesar(fragmento, ascii, 17), ascii)
      return {
        largo,
        atacable: resultado.atacable,
        acierto: resultado.atacable && resultado.ganador.textoClaro === fragmento,
        ic: Number(resultado.ic.toFixed(4)),
        confianza: Number(resultado.confianza.toFixed(3)),
      }
    })

    // La minima longitud a partir de la cual acierta y ya no vuelve a fallar.
    const minimaConfiable =
      porLongitud.find((medicion, indice, todas) =>
        todas.slice(indice).every((siguiente) => siguiente.acierto),
      )?.largo ?? null

    const resumen = {
      generado: new Date().toISOString(),
      frasesDePrueba: FRASES.length,
      corpus: METADATOS_REFERENCIA,
      indiceDeCoincidencia: IC_REFERENCIA,
      cesarAscii,
      atbashAscii,
      cesarEspanol,
      porLongitud,
      minimaConfiable,
    }

    mkdirSync(new URL('./salida/', import.meta.url), { recursive: true })
    writeFileSync(
      new URL('./salida/precision.json', import.meta.url),
      `${JSON.stringify(resumen, null, 2)}\n`,
    )

    expect(cesarAscii.precision).toBeGreaterThanOrEqual(0.9)
    expect(atbashAscii.precision).toBeGreaterThanOrEqual(0.9)
    expect(cesarEspanol.precision).toBeGreaterThanOrEqual(0.9)
    expect(minimaConfiable).not.toBeNull()
  })
})
