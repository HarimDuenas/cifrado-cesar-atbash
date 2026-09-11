import { describe, expect, it } from 'vitest'

/**
 * Estos dos tests no prueban el programa: fijan los supuestos del lenguaje
 * sobre los que se construye el motor de cifrado. Si alguno fallara, el motor
 * estaria partiendo caracteres a la mitad sin avisar.
 */
describe('supuestos del entorno', () => {
  it('recorre el texto por code points, no por unidades UTF-16', () => {
    // Array.from separa bien los caracteres fuera del BMP (emojis);
    // split('') los parte en dos mitades invalidas.
    expect(Array.from('👍').length).toBe(1)
    expect('👍'.split('').length).toBe(2)
  })

  it('puede normalizar a NFC los caracteres compuestos', () => {
    // "ñ" se puede escribir como un solo caracter o como n + tilde combinable.
    // Sin normalizar, el mismo alfabeto tendria dos entradas distintas para
    // lo que el usuario ve como una sola letra.
    const compuesta = 'ñ'
    expect(compuesta.length).toBe(2)
    expect(compuesta.normalize('NFC')).toBe('ñ')
    expect(compuesta.normalize('NFC').length).toBe(1)
  })
})
