/**
 * @file Panel de cifrado: elegir metodo, elegir modulo y cifrar.
 *
 * Cubre dos puntos de la rubrica: cifrar con Cesar permitiendo seleccionar el
 * modulo, y cifrar con Atbash. La palabra "modulo" es ambigua, asi que la
 * interfaz muestra los dos sentidos al mismo tiempo: el desplazamiento k y el
 * modulo aritmetico N. Con Atbash dice explicitamente que no usa ninguno.
 *
 * La k no tiene limite: se puede escribir 300 o un numero de 40 digitos, y el
 * panel muestra a que k dentro de [0, N) equivale, que es la que de verdad se
 * aplica. El slider solo recorre ese rango.
 */

/**
 * Quita el signo + y los ceros a la izquierda, para comparar la k escrita con
 * la efectiva sin que "+017" cuente como distinta de "17".
 *
 * @param {string} entrada
 * @returns {string}
 */
function kCanonica(entrada) {
  return entrada.trim().replace(/^\+/, '').replace(/^(-?)0+(?=\d)/, '$1')
}

/**
 * @param {object} props
 * @param {import('../core/alfabeto.js').Alfabeto | null} props.alfabeto
 * @param {string} props.texto Texto claro.
 * @param {(valor: string) => void} props.onTexto
 * @param {'cesar' | 'atbash'} props.metodo
 * @param {(valor: 'cesar' | 'atbash') => void} props.onMetodo
 * @param {string} props.entradaK La k tal como se escribio.
 * @param {(valor: string) => void} props.onEntradaK
 * @param {number | null} props.kEfectiva La k reducida a [0, N), o null si no es un entero.
 * @param {string} props.criptograma Resultado del cifrado.
 * @param {string | null} props.error
 * @param {() => void} props.onEnviarADescifrar
 */
export function PanelCifrado({
  alfabeto,
  texto,
  onTexto,
  metodo,
  onMetodo,
  entradaK,
  onEntradaK,
  kEfectiva,
  criptograma,
  error,
  onEnviarADescifrar,
}) {
  const n = alfabeto?.n ?? 0
  const maximo = Math.max(n - 1, 0)
  const escrita = kCanonica(entradaK)
  // "", "-" y "+" son una k a medio escribir: se pide, no se regaña.
  const incompleta = /^[+-]?$/.test(entradaK.trim())
  const kInvalida = metodo === 'cesar' && alfabeto !== null && kEfectiva === null

  return (
    <section className="panel" aria-labelledby="titulo-cifrado">
      <header className="panel__encabezado">
        <h2 id="titulo-cifrado">2 · Cifrar</h2>
        <p className="panel__ayuda">
          César corre cada símbolo <em>k</em> lugares dentro del alfabeto. Atbash lo voltea de
          punta a punta y no tiene clave: es una permutación fija.
        </p>
      </header>

      <div className="presets" role="group" aria-label="Método de cifrado">
        <button
          type="button"
          className={`chip ${metodo === 'cesar' ? 'chip--activo' : ''}`}
          aria-pressed={metodo === 'cesar'}
          onClick={() => onMetodo('cesar')}
        >
          César
        </button>
        <button
          type="button"
          className={`chip ${metodo === 'atbash' ? 'chip--activo' : ''}`}
          aria-pressed={metodo === 'atbash'}
          onClick={() => onMetodo('atbash')}
        >
          Atbash
        </button>
      </div>

      <label className="campo">
        <span className="campo__etiqueta">Texto claro</span>
        <textarea
          className="campo__control"
          value={texto}
          rows={3}
          onChange={(evento) => onTexto(evento.target.value)}
        />
      </label>

      {metodo === 'cesar' ? (
        <div className="fila">
          <label className="campo">
            <span className="campo__etiqueta">Módulo (desplazamiento k)</span>
            <input
              className="campo__control"
              type="range"
              min={0}
              max={maximo}
              value={kEfectiva ?? 0}
              onChange={(evento) => onEntradaK(evento.target.value)}
              aria-describedby="modulos"
            />
          </label>
          <label className="campo">
            <span className="campo__etiqueta">k exacta (sin límite)</span>
            {/* Texto y no type="number": un number redondea arriba de 2^53 y
                muestra 1e+21 en vez de los digitos que se escribieron. */}
            <input
              className="campo__control campo__control--mono"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              value={entradaK}
              onChange={(evento) => onEntradaK(evento.target.value)}
              aria-invalid={kInvalida && !incompleta}
              aria-describedby="modulos"
            />
          </label>
        </div>
      ) : null}

      <p
        id="modulos"
        className={`estado estado--k ${kInvalida && !incompleta ? 'estado--error' : ''}`}
      >
        {metodo === 'cesar' ? (
          kInvalida ? (
            incompleta ? (
              'Escribe k: cualquier número entero, del tamaño que sea (300, 1000, −5…).'
            ) : (
              `"${entradaK.trim()}" no es un número entero. Escribe k sin puntos, comas ni espacios (300, 1000, −5…).`
            )
          ) : escrita === String(kEfectiva) ? (
            <>
              Módulo (desplazamiento) <strong>k = {kEfectiva}</strong> · módulo aritmético{' '}
              <strong>N = {n}</strong> (tamaño del alfabeto)
            </>
          ) : (
            <>
              Módulo (desplazamiento) <strong>k = {escrita}</strong> → equivale a{' '}
              <strong>k = {kEfectiva}</strong>, porque {escrita} mod {n} = {kEfectiva} · módulo
              aritmético <strong>N = {n}</strong> (tamaño del alfabeto). Cada {n} lugares el
              alfabeto da la vuelta completa.
            </>
          )
        ) : (
          <>
            <strong>Atbash no utiliza módulo:</strong> es una permutación fija. El módulo
            aritmético sigue siendo N = {n}.
          </>
        )}
      </p>

      <label className="campo">
        <span className="campo__etiqueta">Criptograma</span>
        <pre className="salida">{error || kInvalida ? '—' : criptograma || '—'}</pre>
      </label>

      <div className="presets">
        <button
          type="button"
          className="boton boton--primario"
          onClick={onEnviarADescifrar}
          disabled={!criptograma || Boolean(error) || kInvalida}
        >
          Mandarlo a descifrar
        </button>
        <button
          type="button"
          className="boton"
          onClick={() => navigator.clipboard?.writeText(criptograma)}
          disabled={!criptograma || Boolean(error) || kInvalida}
        >
          Copiar
        </button>
      </div>
    </section>
  )
}
