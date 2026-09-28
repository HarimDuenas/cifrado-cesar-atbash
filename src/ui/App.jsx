/**
 * @file Estado de la aplicacion y conexion de los tres paneles.
 * La logica de cifrado vive en src/core/.
 */

import { useEffect, useMemo, useState } from 'react'

import {
  ASCII_IMPRIMIBLE,
  crearAlfabeto,
  limpiarAlfabeto,
  quitarRepetidos,
} from '../core/alfabeto.js'
import { cifrarCesar, reducirDesplazamiento } from '../core/cesar.js'
import { atbash } from '../core/atbash.js'
import { detectar } from '../core/detector.js'
import { histograma, referenciaParaAlfabeto } from '../core/frecuencias.js'
import { PanelAlfabeto } from './PanelAlfabeto.jsx'
import { PanelCifrado } from './PanelCifrado.jsx'
import { PanelDescifrado } from './PanelDescifrado.jsx'

const FRASE_DE_EJEMPLO =
  'El analisis de frecuencias no adivina: cuenta las letras y las compara con el idioma.'

const TITULO = 'César y Atbash, y cómo se rompen solos'

// Alfabeto fijo para la animacion del titulo.
const ALFABETO_TITULO = crearAlfabeto(ASCII_IMPRIMIBLE)

// Respeta "reducir movimiento" del sistema.
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
  // La k se guarda como texto, sin limite; con ella se cifra y se muestra.
  const [entradaK, setEntradaK] = useState('17')
  const [criptograma, setCriptograma] = useState('')

  // El titulo se descifra solo al cargar, con el mismo motor. Va directo al
  // DOM para no re-renderizar la aplicacion en cada paso.
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

  // Halo donde toca el puntero: guarda la posicion en --x y --y.
  useEffect(() => {
    const alTocar = (evento) => {
      const objetivo = evento.target.closest?.('.boton, .chip, .panel, .resultado')
      if (!objetivo) return
      const caja = objetivo.getBoundingClientRect()
      objetivo.style.setProperty('--x', `${evento.clientX - caja.left}px`)
      objetivo.style.setProperty('--y', `${evento.clientY - caja.top}px`)
      objetivo.classList.remove('encendido')
      // Reinicia la animacion para que dos clics seguidos la repitan.
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

  // Limpia el pegado, quita repetidos y construye; puede fallar mientras escribe.
  const { alfabeto, error, repetidos, limpieza } = useMemo(() => {
    const limpieza = limpiarAlfabeto(entradaAlfabeto)
    const { simbolos, repetidos } = quitarRepetidos(limpieza.simbolos)
    try {
      return { alfabeto: crearAlfabeto(simbolos), error: null, repetidos, limpieza }
    } catch (falla) {
      return { alfabeto: null, error: falla.message, repetidos, limpieza }
    }
  }, [entradaAlfabeto])

  const referencia = useMemo(
    () => (alfabeto ? referenciaParaAlfabeto(alfabeto) : null),
    [alfabeto],
  )

  // null si la k no es un entero.
  const kEfectiva = useMemo(() => {
    if (!alfabeto) return null
    try {
      return reducirDesplazamiento(entradaK, alfabeto.n)
    } catch {
      return null
    }
  }, [alfabeto, entradaK])

  const cifrado = useMemo(() => {
    if (!alfabeto) return ''
    if (metodo === 'atbash') return atbash(textoClaro, alfabeto)
    return kEfectiva === null ? '' : cifrarCesar(textoClaro, alfabeto, kEfectiva)
  }, [alfabeto, textoClaro, metodo, kEfectiva])

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
        repetidos={repetidos}
        limpieza={limpieza}
        cobertura={referencia?.cobertura ?? 0}
      />

      <PanelCifrado
        alfabeto={alfabeto}
        texto={textoClaro}
        onTexto={setTextoClaro}
        metodo={metodo}
        onMetodo={setMetodo}
        entradaK={entradaK}
        onEntradaK={setEntradaK}
        kEfectiva={kEfectiva}
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
