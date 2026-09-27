/**
 * @file Panel del alfabeto: donde el usuario alimenta el conjunto de
 * caracteres con el que se va a cifrar y descifrar.
 *
 * Es el primer punto de la rubrica y la pauta de los demas: el alfabeto define
 * N, y N define el modulo aritmetico, las claves posibles y la referencia
 * estadistica con la que se ataca.
 */

import { useRef } from 'react'

import { PRESETS } from '../core/alfabeto.js'

/** Ejemplo de alfabeto fuera de ASCII: las 27 letras mas un espacio y dos emojis. */
const CON_EMOJIS = `${PRESETS.espanolMayusculas.simbolos} 👍🎯`

/** Hasta cuantos simbolos se listan junto al estado; mas que eso es ruido. */
const LISTAR_HASTA = 40

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
 * @param {string[]} props.repetidos Simbolos que se quitaron por aparecer mas de una vez.
 * @param {number} props.cobertura Que parte del corpus del español cubre (0 a 1).
 */
export function PanelAlfabeto({ entrada, onCambiar, alfabeto, error, repetidos, cobertura }) {
  const campo = useRef(null)
  const preset = Object.values(PRESETS).find((opcion) => opcion.simbolos === entrada)
  const conEmojis = entrada === CON_EMOJIS
  const personalizado = !preset && !conEmojis
  // Vacio no es un error: es el punto de partida de "Personalizado".
  const vacio = entrada === ''

  const empezarPersonalizado = () => {
    onCambiar('')
    campo.current?.focus()
  }

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
          className={`chip ${conEmojis ? 'chip--activo' : ''}`}
          onClick={() => onCambiar(CON_EMOJIS)}
          aria-pressed={conEmojis}
        >
          Con emojis
        </button>
        <button
          type="button"
          className={`chip ${personalizado ? 'chip--activo' : ''}`}
          onClick={empezarPersonalizado}
          aria-pressed={personalizado}
        >
          Personalizado
        </button>
      </div>

      <label className="campo">
        <span className="campo__etiqueta">Símbolos del alfabeto</span>
        <textarea
          ref={campo}
          className="campo__control campo__control--mono"
          value={entrada}
          spellCheck={false}
          rows={3}
          placeholder="Escribe los símbolos de tu alfabeto, en orden. Ejemplo: MURCIELAGO"
          onChange={(evento) => onCambiar(evento.target.value)}
          aria-describedby="estado-alfabeto"
        />
      </label>

      <p
        id="estado-alfabeto"
        className={`estado ${error && !vacio ? 'estado--error' : ''}`}
        role="status"
      >
        {vacio ? (
          'Escribe los símbolos de tu alfabeto: cualquier cadena sirve, con al menos 2 símbolos distintos.'
        ) : error ? (
          error
        ) : (
          <>
            <strong>N = {alfabeto?.n ?? 0}</strong> símbolos
            {alfabeto && alfabeto.n <= LISTAR_HASTA && `: ${alfabeto.simbolos.map(visible).join(' ')}`}
            {' · '}módulo aritmético del cifrado · cobertura del español:{' '}
            <strong>{(cobertura * 100).toFixed(0)}%</strong>
            {cobertura < 0.2 &&
              '. Con tan pocas letras del español el cifrado funciona igual, pero la detección automática no tiene contra qué comparar y no aplica.'}
          </>
        )}
      </p>

      {!vacio && repetidos.length > 0 && (
        <p className="estado">
          {repetidos.length === 1 ? 'Se quitó 1 repetido: ' : `Se quitaron ${repetidos.length} repetidos: `}
          <strong>{repetidos.map((simbolo) => `"${visible(simbolo)}"`).join(', ')}</strong>
          {' '}(cada símbolo cuenta solo la primera vez que aparece).
        </p>
      )}

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
