/**
 * @file La grafica del ataque: el histograma del criptograma deslizandose
 * sobre el del español hasta encajar.
 *
 * Las dos series comparten la misma linea base y se **superponen**, no se
 * espejan. La primera version dibujaba el español hacia arriba y el
 * criptograma hacia abajo, y con el alfabeto ASCII el resultado eran dos
 * rastrillos separados por una linea: el momento en que las distribuciones
 * coinciden, que es la idea entera del metodo, no se veia por ningun lado.
 *
 * Superpuestas, el español es una silueta rellena y el criptograma son barras
 * encima. Con el desplazamiento correcto, las barras caen dentro de la
 * silueta. Eso es lo que hay que ver.
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
 * @param {number} [props.alto=100] Alto del area de dibujo, en unidades del viewBox.
 * @param {string} [props.titulo] Texto alternativo; si no se da, se arma solo.
 */
export function Histograma({
  referencia,
  observado,
  simbolos,
  desplazamiento = 0,
  alto = 100,
  titulo,
}) {
  const n = simbolos.length
  if (n === 0) return null

  // El criptograma se dibuja corrido: la barra del indice i muestra lo que se
  // observo en (i + desplazamiento). Asi, con la clave correcta, cada barra
  // queda sobre la parte de la silueta que le corresponde.
  const corrido = Array.from(
    { length: n },
    (_, i) => observado[(i + desplazamiento) % n] ?? 0,
  )

  const maximo = Math.max(...referencia, ...corrido, 1e-9)
  const base = alto - 10 // deja aire abajo para la linea base
  const paso = 100 / n
  const escala = (valor) => (valor / maximo) * (base - 4)

  // La silueta del español: un poligono que recorre la parte de arriba de sus
  // barras. Se cierra contra la linea base para poder rellenarlo.
  const silueta = [
    `0,${base}`,
    ...referencia.map((valor, i) => {
      const x = (i + 0.5) * paso
      return `${x.toFixed(2)},${(base - escala(valor)).toFixed(2)}`
    }),
    `100,${base}`,
  ].join(' ')

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
        {/* El español, como silueta de fondo. */}
        <polygon className="histograma__silueta" points={silueta} />

        {/* El criptograma, como barras encima de la misma linea base. */}
        {corrido.map((valor, i) => (
          <rect
            key={`obs-${i}`}
            className="histograma__observado"
            x={i * paso + paso * 0.2}
            y={base - escala(valor)}
            width={paso * 0.6}
            height={Math.max(escala(valor), 0.3)}
          />
        ))}

        <line className="histograma__eje" x1="0" y1={base} x2="100" y2={base} />
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
