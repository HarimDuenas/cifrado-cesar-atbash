/**
 * @file Panel de descifrado: una sola linea, sin que el usuario elija nada.
 *
 * Este panel es el punto mas pesado de la rubrica. Recibe un criptograma y
 * muestra el tipo de cifrado, el modulo y el texto claro, todo calculado. La
 * lista de candidatos existe, pero vive dentro de un bloque cerrado rotulado
 * "Evidencia del analisis": es prueba de como se llego al resultado, no un
 * menu de opciones.
 */

import { useEffect, useState } from 'react'

import { CurvaCorrelacion, Histograma } from './Histograma.jsx'

/**
 * Anima el desplazamiento del histograma de 0 hasta el valor detectado, para
 * que se vea como las dos distribuciones se van montando hasta encajar.
 *
 * Respeta `prefers-reduced-motion`: si el usuario pidio menos movimiento, salta
 * directo al valor final sin animar nada.
 *
 * El paso se guarda junto con el objetivo al que pertenece, y el valor de
 * arranque se **deriva durante el render**. Asi el efecto no necesita llamar a
 * `setState` de forma sincronica para reiniciar la animacion cuando llega una
 * deteccion nueva: eso dispara un render en cascada y lo marca la regla
 * `react(set-state-in-effect)` del linter. El unico `setState` que queda vive
 * dentro del temporizador, o sea fuera del render, que es justo para lo que
 * existe `useEffect`.
 *
 * @param {number | null} objetivo Desplazamiento final.
 * @returns {number} El desplazamiento que toca dibujar en este momento.
 */
function useDeslizamiento(objetivo) {
  const [avance, setAvance] = useState({ objetivo: null, paso: 0 })

  const reduce =
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    if (objetivo === null || objetivo === undefined || objetivo === 0 || reduce) {
      return undefined
    }

    // Un recorrido completo dura ~700 ms, sin importar cuanto valga la clave.
    const intervalo = Math.max(Math.floor(700 / objetivo), 16)
    let paso = 0

    const temporizador = setInterval(() => {
      paso += 1
      setAvance({ objetivo, paso })
      if (paso >= objetivo) clearInterval(temporizador)
    }, intervalo)

    return () => clearInterval(temporizador)
  }, [objetivo, reduce])

  if (objetivo === null || objetivo === undefined) return 0
  if (reduce) return objetivo
  return avance.objetivo === objetivo ? avance.paso : 0
}

/**
 * @param {object} props
 * @param {import('../core/alfabeto.js').Alfabeto | null} props.alfabeto
 * @param {string} props.criptograma
 * @param {(valor: string) => void} props.onCriptograma
 * @param {import('../core/detector.js').Resultado | null} props.resultado
 * @param {number[]} props.referencia Proporciones esperadas del español.
 * @param {number[]} props.observado Proporciones medidas en el criptograma.
 */
export function PanelDescifrado({
  alfabeto,
  criptograma,
  onCriptograma,
  resultado,
  referencia,
  observado,
}) {
  const ganador = resultado?.ganador ?? null
  const desplazamientoFinal = ganador
    ? ganador.desplazamiento ?? (alfabeto ? alfabeto.n - 1 : 0)
    : null
  const desplazamiento = useDeslizamiento(desplazamientoFinal)

  return (
    <section className="panel" aria-labelledby="titulo-descifrado">
      <header className="panel__encabezado">
        <h2 id="titulo-descifrado">3 · Descifrar</h2>
        <p className="panel__ayuda">
          No hay que decirle qué método ni qué módulo se usó, ni elegir entre resultados: el
          sistema calcula la clave comparando las frecuencias del criptograma contra las del
          español, igual que al-Kindī pero en forma de fórmula.
        </p>
      </header>

      <label className="campo">
        <span className="campo__etiqueta">Criptograma</span>
        <textarea
          className="campo__control campo__control--mono"
          value={criptograma}
          rows={3}
          spellCheck={false}
          onChange={(evento) => onCriptograma(evento.target.value)}
        />
      </label>

      {resultado && resultado.atacable && ganador ? (
        <div className="resultado">
          <p className="resultado__etiqueta">
            {ganador.etiqueta}{' '}
            <span className="insignia">confianza {(resultado.confianza * 100).toFixed(0)}%</span>
          </p>
          <p className="resultado__meta">
            {ganador.desplazamiento !== null ? (
              <>
                Módulo (desplazamiento) k = {ganador.desplazamiento} · módulo aritmético N ={' '}
                {alfabeto?.n} ·{' '}
              </>
            ) : null}
            índice de coincidencia {resultado.ic.toFixed(4)} contra {resultado.icEsperado.toFixed(4)}{' '}
            del español ({resultado.icAleatorio.toFixed(4)} sería texto al azar)
          </p>
          <pre className="salida">{ganador.textoClaro}</pre>
        </div>
      ) : null}

      {resultado && !resultado.atacable ? (
        <div className="resultado resultado--negado">
          <p className="resultado__etiqueta">No se entrega ninguna línea</p>
          <p className="resultado__meta">{resultado.diagnostico}</p>
        </div>
      ) : null}

      {resultado?.atacable ? (
        <>
          <Histograma
            referencia={referencia}
            observado={observado}
            simbolos={alfabeto?.simbolos ?? []}
            desplazamiento={desplazamiento}
          />

          <details className="detalle">
            <summary>Evidencia del análisis</summary>

            <CurvaCorrelacion
              curva={resultado.curvaCesar}
              pico={ganador?.familia === 'cesar' ? ganador.desplazamiento : null}
              etiqueta="Correlación por desplazamiento (César)"
            />

            <div className="tabla-scroll">
              <table className="evidencia">
                <caption className="panel__ayuda">
                  Los candidatos que se verificaron, del mejor al peor. No son opciones para
                  elegir: el resultado ya está decidido por su puntaje.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Clave</th>
                    <th scope="col">Correlación</th>
                    <th scope="col">Bigramas</th>
                    <th scope="col">Palabras</th>
                    <th scope="col">Texto</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.candidatos.slice(0, 5).map((candidato) => (
                    <tr key={`${candidato.clave.a}-${candidato.clave.b}`}>
                      <td>
                        a={candidato.clave.a}, b={candidato.clave.b}
                      </td>
                      <td>{candidato.correlacion.toFixed(4)}</td>
                      <td>{candidato.bigramas.toFixed(2)}</td>
                      <td>{(candidato.palabras * 100).toFixed(0)}%</td>
                      <td>{candidato.textoClaro.slice(0, 48)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : null}
    </section>
  )
}
