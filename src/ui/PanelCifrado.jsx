 /**
  * @file Panel de cifrado. Muestra k y N porque "modulo" tiene los dos sentidos.
  */

 // "+017" y "17" son la misma k.
function kCanonica(entrada) {
  return entrada.trim().replace(/^\+/, '').replace(/^(-?)0+(?=\d)/, '$1')
}

 /**
  * @param {object} props
  * @param {import('../core/alfabeto.js').Alfabeto | null} props.alfabeto
  * @param {string} props.texto
  * @param {(valor: string) => void} props.onTexto
  * @param {'cesar' | 'atbash'} props.metodo
  * @param {(valor: 'cesar' | 'atbash') => void} props.onMetodo
  * @param {string} props.entradaK Tal como se escribio.
  * @param {(valor: string) => void} props.onEntradaK
  * @param {number | null} props.kEfectiva En [0, N), o null si no es entero.
  * @param {string} props.criptograma
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
  // "", "-" y "+": la k aun se esta escribiendo.
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
            {/* type="number" redondea arriba de 2^53. */}
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
