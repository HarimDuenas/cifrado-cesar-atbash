/**
 * @file Panel de cifrado: elegir metodo, elegir modulo y cifrar.
 *
 * Cubre dos puntos de la rubrica: cifrar con Cesar permitiendo seleccionar el
 * modulo, y cifrar con Atbash. La palabra "modulo" es ambigua, asi que la
 * interfaz muestra los dos sentidos al mismo tiempo: el desplazamiento k y el
 * modulo aritmetico N. Con Atbash dice explicitamente que no usa ninguno.
 */

/**
 * @param {object} props
 * @param {import('../core/alfabeto.js').Alfabeto | null} props.alfabeto
 * @param {string} props.texto Texto claro.
 * @param {(valor: string) => void} props.onTexto
 * @param {'cesar' | 'atbash'} props.metodo
 * @param {(valor: 'cesar' | 'atbash') => void} props.onMetodo
 * @param {number} props.k Desplazamiento de Cesar.
 * @param {(valor: number) => void} props.onK
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
  k,
  onK,
  criptograma,
  error,
  onEnviarADescifrar,
}) {
  const n = alfabeto?.n ?? 0
  const maximo = Math.max(n - 1, 0)

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
              value={Math.min(k, maximo)}
              onChange={(evento) => onK(Number(evento.target.value))}
              aria-describedby="modulos"
            />
          </label>
          <label className="campo">
            <span className="campo__etiqueta">k exacta</span>
            <input
              className="campo__control campo__control--mono"
              type="number"
              min={0}
              max={maximo}
              value={Math.min(k, maximo)}
              onChange={(evento) => onK(Number(evento.target.value))}
            />
          </label>
        </div>
      ) : null}

      <p id="modulos" className="estado">
        {metodo === 'cesar' ? (
          <>
            Módulo (desplazamiento) <strong>k = {Math.min(k, maximo)}</strong> · módulo aritmético{' '}
            <strong>N = {n}</strong> (tamaño del alfabeto)
          </>
        ) : (
          <>
            <strong>Atbash no utiliza módulo:</strong> es una permutación fija. El módulo
            aritmético sigue siendo N = {n}.
          </>
        )}
      </p>

      <label className="campo">
        <span className="campo__etiqueta">Criptograma</span>
        <pre className="salida">{error ? '—' : criptograma || '—'}</pre>
      </label>

      <div className="presets">
        <button
          type="button"
          className="boton boton--primario"
          onClick={onEnviarADescifrar}
          disabled={!criptograma || Boolean(error)}
        >
          Mandarlo a descifrar
        </button>
        <button
          type="button"
          className="boton"
          onClick={() => navigator.clipboard?.writeText(criptograma)}
          disabled={!criptograma || Boolean(error)}
        >
          Copiar
        </button>
      </div>
    </section>
  )
}
