/**
 * @file La grafica del ataque: el histograma del criptograma deslizandose
 * sobre el del español hasta encajar.
 *
 * Es la evidencia visual de que el sistema no adivino. Las barras claras son
 * la frecuencia esperada del español para este alfabeto; las oscuras, la del
 * criptograma corrida `desplazamiento` lugares. Cuando el desplazamiento es el
 * correcto, las dos series se montan una sobre otra.
 */

/**
 * Etiqueta legible de un simbolo, para el texto alternativo y los ejes.
 *
 * @param {string} simbolo
 * @returns {string}
 */
function etiquetaDe(simbolo) {
  if (simbolo === ' ') return '␣'
  if (simbolo === '\n') return '⏎'
  if (simbolo === '\t') return '⇥'
  return simbolo
}

/**
 * @param {object} props
 * @param {number[]} props.referencia Proporcion esperada por indice del alfabeto.
 * @param {number[]} props.observado Proporcion medida en el criptograma.
 * @param {string[]} props.simbolos Los simbolos del alfabeto, en orden.
 * @param {number} [props.desplazamiento=0] Cuantos lugares se corre el criptograma.
 * @param {number} [props.alto=160] Alto del area de dibujo, en unidades del viewBox.
 * @param {string} [props.titulo] Texto alternativo; si no se da, se arma solo.
 */
export function Histograma({
  referencia,
  observado,
  simbolos,
  desplazamiento = 0,
  alto = 160,
  titulo,
}) {
  const n = simbolos.length
  if (n === 0) return null

  // El criptograma se dibuja corrido: la barra del indice i muestra lo que se
  // observo en (i + desplazamiento). Asi, con la clave correcta, cada barra
  // oscura queda debajo de la barra clara que le corresponde.
  const corrido = Array.from(
    { length: n },
    (_, i) => observado[(i + desplazamiento) % n] ?? 0,
  )

  const maximo = Math.max(...referencia, ...corrido, 1e-9)
  const anchoBarra = 100 / n
  const escala = (valor) => (valor / maximo) * (alto / 2 - 6)

  const masFrecuente = corrido.indexOf(Math.max(...corrido))
  const alternativo =
    titulo ??
    `Comparacion de frecuencias: el simbolo mas frecuente del criptograma corrido ` +
      `${desplazamiento} lugares es "${etiquetaDe(simbolos[masFrecuente] ?? '')}".`

  return (
    <figure className="histograma">
      <svg
        viewBox={`0 0 100 ${alto}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={alternativo}
      >
        {/* Serie de arriba: el español esperado. */}
        {referencia.map((valor, i) => (
          <rect
            key={`ref-${i}`}
            className="histograma__referencia"
            x={i * anchoBarra + anchoBarra * 0.12}
            y={alto / 2 - escala(valor)}
            width={anchoBarra * 0.76}
            height={Math.max(escala(valor), 0.4)}
          />
        ))}

        {/* Linea base. */}
        <line className="histograma__eje" x1="0" y1={alto / 2} x2="100" y2={alto / 2} />

        {/* Serie de abajo: el criptograma, corrido. */}
        {corrido.map((valor, i) => (
          <rect
            key={`obs-${i}`}
            className="histograma__observado"
            x={i * anchoBarra + anchoBarra * 0.12}
            y={alto / 2}
            width={anchoBarra * 0.76}
            height={Math.max(escala(valor), 0.4)}
          />
        ))}
      </svg>

      <figcaption className="histograma__pie">
        <span className="histograma__clave histograma__clave--referencia">
          Frecuencia del español
        </span>
        <span className="histograma__clave histograma__clave--observado">
          Criptograma {desplazamiento > 0 ? `corrido ${desplazamiento} lugares` : 'sin correr'}
        </span>
      </figcaption>
    </figure>
  )
}

/**
 * Curva de correlacion R(b): que tan bien encaja el criptograma con el español
 * para cada desplazamiento posible. El pico marca la clave.
 *
 * @param {object} props
 * @param {number[]} props.curva Valores normalizados a [0, 1].
 * @param {number | null} props.pico Indice del desplazamiento elegido.
 * @param {string} [props.etiqueta]
 */
export function CurvaCorrelacion({ curva, pico, etiqueta = 'Correlación por desplazamiento' }) {
  if (!curva || curva.length === 0) return null

  const n = curva.length
  const puntos = curva
    .map((valor, i) => `${(i / (n - 1)) * 100},${40 - valor * 36}`)
    .join(' ')

  return (
    <figure className="curva">
      <svg
        viewBox="0 0 100 44"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${etiqueta}. El pico está en ${pico ?? 'ninguno'}.`}
      >
        <polyline className="curva__linea" points={puntos} />
        {pico !== null && pico !== undefined && (
          <line
            className="curva__pico"
            x1={(pico / (n - 1)) * 100}
            y1="0"
            x2={(pico / (n - 1)) * 100}
            y2="44"
          />
        )}
      </svg>
      <figcaption className="curva__pie">
        {etiqueta}
        {pico !== null && pico !== undefined ? ` · pico en ${pico}` : ''}
      </figcaption>
    </figure>
  )
}
