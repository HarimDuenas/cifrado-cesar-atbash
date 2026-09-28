 /**
  * @file Histograma del criptograma superpuesto al del español, y curva de correlacion.
  */

 // Hace visibles el espacio, el salto de linea y el tabulador.
function etiquetaDe(simbolo) {
  if (simbolo === ' ') return '␣'
  if (simbolo === '\n') return '⏎'
  if (simbolo === '\t') return '⇥'
  return simbolo
}

 /**
  * @param {object} props
  * @param {number[]} props.referencia Esperada por indice.
  * @param {number[]} props.observado Medida en el criptograma.
  * @param {string[]} props.simbolos
  * @param {number} [props.desplazamiento=0] b de la clave afin.
  * @param {number} [props.multiplicador=1] a de la clave afin: 1 en Cesar, -1 en Atbash.
  * @param {number} [props.alto=100]
  * @param {string} [props.titulo] Texto alternativo.
  */
export function Histograma({
  referencia,
  observado,
  simbolos,
  desplazamiento = 0,
  multiplicador = 1,
  alto = 100,
  titulo,
}) {
  const n = simbolos.length
  if (n === 0) return null

  // Barra i = observado en (a·i + b) mod N: con la clave correcta cae sobre la silueta.
  const reflejado = ((multiplicador % n) + n) % n !== 1
  const corrido = Array.from(
    { length: n },
    (_, i) => observado[(((multiplicador * i + desplazamiento) % n) + n) % n] ?? 0,
  )
  const descripcion = reflejado
    ? 'reflejado'
    : desplazamiento > 0
      ? `corrido ${desplazamiento} lugares`
      : 'sin correr'

  const maximo = Math.max(...referencia, ...corrido, 1e-9)
  const base = alto - 10 // deja aire abajo para la linea base
  const paso = 100 / n
  const escala = (valor) => (valor / maximo) * (base - 4)

  // Silueta del español, cerrada contra la linea base.
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
    `Comparacion de frecuencias: el simbolo mas frecuente del criptograma ${descripcion} ` +
      `es "${etiquetaDe(simbolos[masFrecuente] ?? '')}".`

  return (
    <figure className="histograma">
      <svg
        viewBox={`0 0 100 ${alto}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={alternativo}
      >
        <polygon className="histograma__silueta" points={silueta} />

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
          Criptograma {descripcion}
        </span>
      </figcaption>
    </figure>
  )
}

 /**
  * @param {object} props
  * @param {number[]} props.curva En [0, 1].
  * @param {number | null} props.pico
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
