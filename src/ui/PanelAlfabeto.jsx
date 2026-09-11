/**
 * @file Panel del alfabeto: donde el usuario alimenta el conjunto de
 * caracteres con el que se va a cifrar y descifrar.
 *
 * Es el primer punto de la rubrica y la pauta de los demas: el alfabeto define
 * N, y N define el modulo aritmetico, las claves posibles y la referencia
 * estadistica con la que se ataca.
 */

import { PRESETS } from '../core/alfabeto.js'

/**
 * Vuelve visible un simbolo que de otro modo no se ve.
 *
 * @param {string} simbolo
 * @returns {string}
 */
function visible(simbolo) {
  if (simbolo === ' ') return '␣'
  if (simbolo === '\n') return '⏎'
  if (simbolo === '\t') return '⇥'
  return simbolo
}

/**
 * @param {object} props
 * @param {string} props.entrada Texto crudo del alfabeto.
 * @param {(valor: string) => void} props.onCambiar Se llama con el texto nuevo.
 * @param {import('../core/alfabeto.js').Alfabeto | null} props.alfabeto Alfabeto valido, o null.
 * @param {string | null} props.error Mensaje de validacion, si hay.
 * @param {number} props.cobertura Que parte del corpus del español cubre (0 a 1).
 */
export function PanelAlfabeto({ entrada, onCambiar, alfabeto, error, cobertura }) {
  const preset = Object.values(PRESETS).find((opcion) => opcion.simbolos === entrada)

  return (
    <section className="panel" aria-labelledby="titulo-alfabeto">
      <header className="panel__encabezado">
        <h2 id="titulo-alfabeto">1 · El alfabeto</h2>
        <p className="panel__ayuda">
          Los símbolos con los que se cifra, en orden. Puede ser cualquier conjunto, esté o no
          en el código ASCII. Lo que no pertenezca al alfabeto pasa sin cambio.
        </p>
      </header>

      <div className="presets" role="group" aria-label="Alfabetos listos">
        {Object.values(PRESETS).map((opcion) => (
          <button
            key={opcion.id}
            type="button"
            className={`chip ${preset?.id === opcion.id ? 'chip--activo' : ''}`}
            onClick={() => onCambiar(opcion.simbolos)}
            aria-pressed={preset?.id === opcion.id}
          >
            {opcion.nombre}
          </button>
        ))}
        <button
          type="button"
          className="chip"
          onClick={() => onCambiar(`${PRESETS.espanolMayusculas.simbolos} 👍🎯`)}
        >
          Con emojis
        </button>
      </div>

      <label className="campo">
        <span className="campo__etiqueta">Símbolos del alfabeto</span>
        <textarea
          className="campo__control campo__control--mono"
          value={entrada}
          spellCheck={false}
          rows={3}
          onChange={(evento) => onCambiar(evento.target.value)}
          aria-describedby="estado-alfabeto"
        />
      </label>

      <p id="estado-alfabeto" className={`estado ${error ? 'estado--error' : ''}`} role="status">
        {error ? (
          error
        ) : (
          <>
            <strong>N = {alfabeto?.n ?? 0}</strong> símbolos · módulo aritmético del cifrado ·
            cobertura del español: <strong>{(cobertura * 100).toFixed(0)}%</strong>
            {cobertura < 0.2 && ' — sin referencia estadística, la detección automática no aplica'}
          </>
        )}
      </p>

      {alfabeto && (
        <details className="detalle">
          <summary>Ver la tabla de índices</summary>
          <ol className="tabla-alfabeto">
            {alfabeto.simbolos.map((simbolo, indice) => (
              <li key={`${indice}-${simbolo}`}>
                <span className="tabla-alfabeto__indice">{indice}</span>
                <span className="tabla-alfabeto__simbolo">{visible(simbolo)}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  )
}
