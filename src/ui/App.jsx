/**
 * @file Ensamblado de la aplicacion.
 *
 * Toda la logica de cifrado vive en `src/core/`, que es JS puro y sin React.
 * Este archivo solo mantiene el estado de los campos y conecta los tres
 * paneles. Por eso el enlace al "codigo documentado" apunta a `core/`: se lee
 * de corrido, sin JSX en medio.
 */

import { useMemo, useState } from 'react'

import { ASCII_IMPRIMIBLE, crearAlfabeto } from '../core/alfabeto.js'
import { cifrarCesar } from '../core/cesar.js'
import { atbash } from '../core/atbash.js'
import { detectar } from '../core/detector.js'
import { histograma, referenciaParaAlfabeto } from '../core/frecuencias.js'
import { PanelAlfabeto } from './PanelAlfabeto.jsx'
import { PanelCifrado } from './PanelCifrado.jsx'
import { PanelDescifrado } from './PanelDescifrado.jsx'

const FRASE_DE_EJEMPLO =
  'El analisis de frecuencias no adivina: cuenta las letras y las compara con el idioma.'

export default function App() {
  const [entradaAlfabeto, setEntradaAlfabeto] = useState(ASCII_IMPRIMIBLE)
  const [textoClaro, setTextoClaro] = useState(FRASE_DE_EJEMPLO)
  const [metodo, setMetodo] = useState('cesar')
  const [k, setK] = useState(17)
  const [criptograma, setCriptograma] = useState('')

  // El alfabeto puede ser invalido mientras el usuario escribe (un simbolo
  // repetido, por ejemplo), asi que se construye dentro de un try.
  const { alfabeto, error } = useMemo(() => {
    try {
      return { alfabeto: crearAlfabeto(entradaAlfabeto), error: null }
    } catch (falla) {
      return { alfabeto: null, error: falla.message }
    }
  }, [entradaAlfabeto])

  const referencia = useMemo(
    () => (alfabeto ? referenciaParaAlfabeto(alfabeto) : null),
    [alfabeto],
  )

  const cifrado = useMemo(() => {
    if (!alfabeto) return ''
    return metodo === 'cesar'
      ? cifrarCesar(textoClaro, alfabeto, k)
      : atbash(textoClaro, alfabeto)
  }, [alfabeto, textoClaro, metodo, k])

  const deteccion = useMemo(() => {
    if (!alfabeto || criptograma.trim() === '') return null
    return detectar(criptograma, alfabeto)
  }, [alfabeto, criptograma])

  const observado = useMemo(() => {
    if (!alfabeto || criptograma.trim() === '') return []
    return Array.from(histograma(criptograma, alfabeto).proporciones)
  }, [alfabeto, criptograma])

  return (
    <div className="app">
      <header className="app__encabezado">
        <h1 className="app__titulo">César y Atbash, y cómo se rompen solos</h1>
        <p className="app__bajada">
          Cifra y descifra con un alfabeto que tú alimentas. Al descifrar no hay que decirle qué
          método ni qué módulo se usó: el sistema lo resuelve con el análisis de frecuencias que
          describió al-Kindī en el siglo IX, y entrega una sola línea.
        </p>
      </header>

      <PanelAlfabeto
        entrada={entradaAlfabeto}
        onCambiar={setEntradaAlfabeto}
        alfabeto={alfabeto}
        error={error}
        cobertura={referencia?.cobertura ?? 0}
      />

      <PanelCifrado
        alfabeto={alfabeto}
        texto={textoClaro}
        onTexto={setTextoClaro}
        metodo={metodo}
        onMetodo={setMetodo}
        k={k}
        onK={setK}
        criptograma={cifrado}
        error={error}
        onEnviarADescifrar={() => setCriptograma(cifrado)}
      />

      <PanelDescifrado
        alfabeto={alfabeto}
        criptograma={criptograma}
        onCriptograma={setCriptograma}
        resultado={deteccion}
        referencia={referencia ? Array.from(referencia.proporciones) : []}
        observado={observado}
      />

      <footer className="app__pie">
        <p>
          <strong>Realizado por:</strong> Harim Jesús Enrique Dueñas Dávila
        </p>
      </footer>
    </div>
  )
}
