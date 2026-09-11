import { describe, expect, it } from 'vitest'

import {
  ASCII_IMPRIMIBLE,
  ESPANOL_MAYUSCULAS,
  crearAlfabeto,
  modulo,
} from '../src/core/alfabeto.js'
import {
  aplicarAfin,
  claveInversa,
  esInvertible,
  inversoModular,
  mcd,
} from '../src/core/afin.js'
import { cifrarCesar, descifrarCesar, normalizarDesplazamiento } from '../src/core/cesar.js'
import { atbash, claveAtbash } from '../src/core/atbash.js'

const ascii = crearAlfabeto(ASCII_IMPRIMIBLE)
const espanol = crearAlfabeto(ESPANOL_MAYUSCULAS)

const FRASE = 'Al-Kindi conto las letras del mensaje, y con eso lo leyo.'

describe('alfabeto', () => {
  it('el ASCII imprimible tiene 95 simbolos y empieza en el espacio', () => {
    expect(ascii.n).toBe(95)
    expect(ascii.indiceDe(' ')).toBe(0)
    expect(ascii.simboloEn(94)).toBe('~')
  })

  it('el alfabeto español tiene 27 letras con la Ñ en su lugar', () => {
    expect(espanol.n).toBe(27)
    expect(espanol.indiceDe('Ñ')).toBe(14)
  })

  it('acepta emojis como un solo simbolo', () => {
    const conEmojis = crearAlfabeto('👍👎🎯🔒')
    expect(conEmojis.n).toBe(4)
    expect(conEmojis.indiceDe('🎯')).toBe(2)
  })

  it('devuelve -1 para un simbolo que no pertenece', () => {
    expect(ascii.indiceDe('ñ')).toBe(-1)
  })

  it('rechaza alfabetos de menos de dos simbolos', () => {
    expect(() => crearAlfabeto('A')).toThrow(/al menos 2 simbolos/)
    expect(() => crearAlfabeto('')).toThrow(/al menos 2 simbolos/)
  })

  it('rechaza alfabetos con simbolos repetidos', () => {
    expect(() => crearAlfabeto('ABCA')).toThrow(/repetidos/)
  })

  it('normaliza a NFC, asi que la ñ compuesta no duplica la letra', () => {
    const alfabeto = crearAlfabeto(`AB${'ñ'}`)
    expect(alfabeto.n).toBe(3)
    expect(alfabeto.indiceDe('ñ')).toBe(2)
  })

  it('el modulo nunca devuelve negativos', () => {
    expect(modulo(-1, 95)).toBe(94)
    expect(modulo(-96, 95)).toBe(94)
    expect(modulo(112, 95)).toBe(17)
  })
})

describe('aritmetica afin', () => {
  it('calcula el MCD', () => {
    expect(mcd(95, 19)).toBe(19)
    expect(mcd(95, 17)).toBe(1)
  })

  it('sabe que Cesar y Atbash siempre son invertibles', () => {
    for (const n of [2, 26, 27, 95, 128]) {
      expect(esInvertible(1, n)).toBe(true)
      expect(esInvertible(-1, n)).toBe(true)
    }
  })

  it('detecta multiplicadores que arruinarian el descifrado', () => {
    // 19 divide a 95, asi que 19 mandaria varios simbolos al mismo lugar.
    expect(esInvertible(19, 95)).toBe(false)
    expect(() => inversoModular(19, 95)).toThrow(/no es invertible/)
    expect(() => aplicarAfin('HOLA', ascii, { a: 19, b: 0 })).toThrow(/no es invertible/)
  })

  it('el inverso multiplicativo cumple a · a⁻¹ ≡ 1', () => {
    for (const a of [1, 3, 7, 17, 94]) {
      expect(modulo(a * inversoModular(a, 95), 95)).toBe(1)
    }
  })

  it('la clave inversa deshace cualquier clave afin valida', () => {
    const clave = { a: 7, b: 23 }
    const cifrado = aplicarAfin(FRASE, ascii, clave)
    expect(aplicarAfin(cifrado, ascii, claveInversa(clave, ascii.n))).toBe(FRASE)
  })

  it('rechaza claves que no son enteras', () => {
    expect(() => aplicarAfin('HOLA', ascii, { a: 1, b: 1.5 })).toThrow(/enteros/)
  })
})

describe('Cesar', () => {
  it('cifra corriendo el alfabeto', () => {
    expect(cifrarCesar('HOLA', espanol, 3)).toBe('KRÑD')
  })

  it('descifra lo que cifro, con cualquier desplazamiento del ASCII', () => {
    for (let k = 0; k < ascii.n; k += 1) {
      expect(descifrarCesar(cifrarCesar(FRASE, ascii, k), ascii, k)).toBe(FRASE)
    }
  })

  it('descifra lo que cifro, con cualquier desplazamiento del alfabeto español', () => {
    const texto = 'ALKINDI CONTO LAS LETRAS'
    for (let k = 0; k < espanol.n; k += 1) {
      expect(descifrarCesar(cifrarCesar(texto, espanol, k), espanol, k)).toBe(texto)
    }
  })

  it('trata igual los desplazamientos equivalentes y los negativos', () => {
    expect(normalizarDesplazamiento(112, 95)).toBe(17)
    expect(normalizarDesplazamiento(-1, 95)).toBe(94)
    expect(cifrarCesar(FRASE, ascii, 112)).toBe(cifrarCesar(FRASE, ascii, 17))
    expect(cifrarCesar(FRASE, ascii, -1)).toBe(cifrarCesar(FRASE, ascii, 94))
  })

  it('con k = 0 no cambia nada', () => {
    expect(cifrarCesar(FRASE, ascii, 0)).toBe(FRASE)
  })

  it('deja pasar sin cambio lo que no esta en el alfabeto', () => {
    // La ñ y las vocales acentuadas no pertenecen al ASCII imprimible.
    const cifrado = cifrarCesar('AÑO ÉL', ascii, 5)
    expect(cifrado).toContain('Ñ')
    expect(cifrado).toContain('É')
    expect(descifrarCesar(cifrado, ascii, 5)).toBe('AÑO ÉL')
  })

  it('no parte los emojis a la mitad', () => {
    const alfabeto = crearAlfabeto('👍👎🎯🔒')
    const cifrado = cifrarCesar('👍🎯', alfabeto, 1)
    expect(cifrado).toBe('👎🔒')
    expect(Array.from(cifrado).length).toBe(2)
  })
})

describe('Atbash', () => {
  it('voltea el alfabeto de punta a punta', () => {
    expect(atbash('ABC', espanol)).toBe('ZYX')
    expect(atbash(' ', ascii)).toBe('~')
  })

  it('es su propia inversa', () => {
    expect(atbash(atbash(FRASE, ascii), ascii)).toBe(FRASE)
    expect(atbash(atbash('HOLA', espanol), espanol)).toBe('HOLA')
  })

  it('equivale a la clave afin a = -1, b = N - 1', () => {
    expect(claveAtbash(ascii.n)).toEqual({ a: -1, b: 94 })
    expect(aplicarAfin(FRASE, ascii, claveAtbash(ascii.n))).toBe(atbash(FRASE, ascii))
  })
})
