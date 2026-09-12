/**
 * @file Ensamblado de la aplicacion.
 *
 * Toda la logica de cifrado vive en `src/core/`, que es JS puro y sin React.
 * Este archivo solo mantiene el estado de los campos y conecta los tres
 * paneles. Por eso el enlace al "codigo documentado" apunta a `core/`: se lee
 * de corrido, sin JSX en medio.
 */

import { useEffect, useMemo, useState } from 'react'

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

const TITULO = 'César y Atbash, y cómo se rompen solos'

/** Alfabeto fijo para la animacion del titulo, independiente del que elija el usuario. */
const ALFABETO_TITULO = crearAlfabeto(ASCII_IMPRIMIBLE)

/** ¿El usuario pidio menos movimiento? Entonces no se anima nada. */
function prefiereQuietud() {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  )
}

export default function App() {
  const [entradaAlfabeto, setEntradaAlfabeto] = useState(ASCII_IMPRIMIBLE)
  const [textoClaro, setTextoClaro] = useState(FRASE_DE_EJEMPLO)
  const [metodo, setMetodo] = useState('cesar')
  const [k, setK] = useState(17)
  const [criptograma, setCriptograma] = useState('')

  /*
   * El titulo se descifra solo al cargar, usando el MISMO motor del programa:
   * empieza cifrado con Cesar y el desplazamiento baja hasta cero. La pagina se
   * presenta haciendo lo que el programa hace.
   *
   * Se escribe directo en el DOM en vez de pasar por el estado de React porque
   * es una animacion de una sola vez y puramente decorativa: no vale la pena
   * re-renderizar toda la aplicacion treinta veces por ella.
   */
  useEffect(() => {
    const encabezado = document.querySelector('.app__titulo')
    if (!encabezado) return undefined
    if (prefiereQuietud()) {
      encabezado.textContent = TITULO
      return undefined
    }

    let desplazamiento = 47
    encabezado.textContent = cifrarCesar(TITULO, ALFABETO_TITULO, desplazamiento)

    const temporizador = setInterval(() => {
      desplazamiento -= 3
      if (desplazamiento <= 0) {
        encabezado.textContent = TITULO
        clearInterval(temporizador)
        return
      }
      encabezado.textContent = cifrarCesar(TITULO, ALFABETO_TITULO, desplazamiento)
    }, 45)

    return () => clearInterval(temporizador)
  }, [])

  /*
   * Iluminacion que nace donde el usuario toca: se guardan las coordenadas del
   * puntero como variables CSS sobre el elemento, y la hoja de estilos dibuja
   * ahi un halo dorado. Un solo escucha delegado en el documento, en vez de uno
   * por boton.
   */
  useEffect(() => {
    const alTocar = (evento) => {
      const objetivo = evento.target.closest?.('.boton, .chip, .panel, .resultado')
      if (!objetivo) return
      const caja = objetivo.getBoundingClientRect()
      objetivo.style.setProperty('--x', `${evento.clientX - caja.left}px`)
      objetivo.style.setProperty('--y', `${evento.clientY - caja.top}px`)
      objetivo.classList.remove('encendido')
      // Reiniciar la animacion: sin esto, dos clics seguidos no vuelven a encender.
      void objetivo.offsetWidth
      objetivo.classList.add('encendido')
    }

    document.addEventListener('pointerdown', alTocar)
    document.addEventListener('pointermove', alTocar)
    return () => {
      document.removeEventListener('pointerdown', alTocar)
      document.removeEventListener('pointermove', alTocar)
    }
  }, [])

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
        <p>
          <strong>El texto nunca sale de tu navegador.</strong> No hay servidor, no hay
          telemetría y no se guarda nada: todo el cifrado y el análisis corren en esta página.
        </p>
        <p>
          Cifrado didáctico: César y Atbash no protegen datos reales, y este mismo programa
          demuestra por qué.
        </p>
      </footer>
    </div>
  )
}
