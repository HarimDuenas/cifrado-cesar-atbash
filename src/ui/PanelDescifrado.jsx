 /**
  * @file Panel de descifrado: una sola linea; los candidatos quedan como evidencia.
  */

import { useEffect, useState } from 'react'

import { CurvaCorrelacion, Histograma } from './Histograma.jsx'

 // Desliza el histograma de 0 a la k detectada. Respeta "reducir movimiento".
function useDeslizamiento(objetivo) {
  const [avance, setAvance] = useState({ objetivo: null, paso: 0 })

  const reduce =
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    if (objetivo === null || objetivo === undefined || objetivo === 0 || reduce) {
      return undefined
    }

    // ~700 ms en total, sin importar la k.
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
  * @param {number[]} props.referencia
  * @param {number[]} props.observado
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
  // Cesar se desliza; Atbash se dibuja ya reflejado.
  const esCesar = ganador?.familia === 'cesar'
  const deslizado = useDeslizamiento(esCesar ? ganador.desplazamiento : null)
  const desplazamiento = esCesar ? deslizado : (ganador?.clave.b ?? 0)
  const multiplicador = esCesar ? 1 : (ganador?.clave.a ?? 1)

   // Enciende el bloque una vez por cada resultado nuevo.
  const firma = ganador
    ? `${ganador.clave.a}:${ganador.clave.b}:${ganador.textoClaro.length}`
    : null

  useEffect(() => {
    if (!firma) return undefined
    const bloque = document.querySelector('.resultado')
    if (!bloque) return undefined

    bloque.classList.remove('encendido')
    // Reinicia la animacion.
    void bloque.offsetWidth
    bloque.classList.add('encendido')

    const temporizador = setTimeout(() => bloque.classList.remove('encendido'), 950)
    return () => clearTimeout(temporizador)
  }, [firma])

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
          {/* k y k + N·m dan el mismo criptograma. */}
          {ganador.desplazamiento !== null && alfabeto ? (
            <p className="resultado__meta">
              Cualquier k que deje residuo {ganador.desplazamiento} al dividir entre {alfabeto.n}{' '}
              produce este mismo criptograma:{' '}
              {[0, 1, 2, 3].map((vueltas) => ganador.desplazamiento + vueltas * alfabeto.n).join(', ')}
              … en general, <strong>k = {ganador.desplazamiento} + {alfabeto.n}·m</strong> para
              cualquier entero m. Por eso una k grande aparece aquí como su equivalente dentro del
              alfabeto.
            </p>
          ) : null}
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
            multiplicador={multiplicador}
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
