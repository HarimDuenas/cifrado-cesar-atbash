 /**
  * @file Panel del alfabeto: define N.
  */

import { useRef } from 'react'

import { PRESETS } from '../core/alfabeto.js'

const CON_EMOJIS = `${PRESETS.espanolMayusculas.simbolos} 👍🎯`

// Arriba de esto no se listan los simbolos.
const LISTAR_HASTA = 40

 // Hace visibles el espacio, el salto de linea y el tabulador.
function visible(simbolo) {
  if (simbolo === ' ') return '␣'
  if (simbolo === '\n') return '⏎'
  if (simbolo === '\t') return '⇥'
  return simbolo
}

 /**
  * @param {object} props
  * @param {string} props.entrada Texto crudo.
  * @param {(valor: string) => void} props.onCambiar
  * @param {import('../core/alfabeto.js').Alfabeto | null} props.alfabeto
  * @param {string | null} props.error
  * @param {string[]} props.repetidos
  * @param {ReturnType<typeof import('../core/alfabeto.js').limpiarAlfabeto>} props.limpieza
  * @param {number} props.cobertura Entre 0 y 1.
  */
export function PanelAlfabeto({
  entrada,
  onCambiar,
  alfabeto,
  error,
  repetidos,
  limpieza,
  cobertura,
}) {
  const campo = useRef(null)
  const preset = Object.values(PRESETS).find((opcion) => opcion.simbolos === entrada)
  const conEmojis = entrada === CON_EMOJIS
  const personalizado = !preset && !conEmojis
  // Vacio es el punto de partida de "Personalizado", no un error.
  const vacio = limpieza.simbolos === ''

  const quitado = [
    limpieza.saltos && `${limpieza.saltos} ${limpieza.saltos === 1 ? 'salto' : 'saltos'} de línea`,
    limpieza.tabuladores &&
      `${limpieza.tabuladores} ${limpieza.tabuladores === 1 ? 'tabulador' : 'tabuladores'}`,
    limpieza.invisibles.length &&
      `${limpieza.invisibles.length} ${limpieza.invisibles.length === 1 ? 'carácter invisible' : 'caracteres invisibles'} (${[...new Set(limpieza.invisibles)].join(', ')})`,
  ].filter(Boolean)

  // El ASCII empieza con espacio: el aviso es solo para lo personalizado.
  const { inicio, fin } = limpieza.espaciosBorde
  const avisarBorde = personalizado && !vacio && (inicio > 0 || fin > 0)

  const quitarEspaciosDelBorde = () => {
    onCambiar(limpieza.simbolos.replace(/^ +/, '').replace(/ +$/, ''))
  }

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

      {!vacio && (quitado.length > 0 || limpieza.espaciosDuros > 0) && (
        <p className="estado">
          {quitado.length > 0 && (
            <>
              Del texto pegado se quitó: <strong>{quitado.join(', ')}</strong>. No forman parte
              del alfabeto; se cuelan al copiar de Word, un PDF o un chat.{' '}
            </>
          )}
          {limpieza.espaciosDuros > 0 &&
            `${limpieza.espaciosDuros === 1 ? 'Un espacio de Word se cambió' : `${limpieza.espaciosDuros} espacios de Word se cambiaron`} por un espacio normal.`}
        </p>
      )}

      {avisarBorde && (
        <p className="estado estado--aviso">
          El alfabeto tiene{' '}
          <strong>
            {[
              inicio && `${inicio} ${inicio === 1 ? 'espacio' : 'espacios'} al inicio`,
              fin && `${fin} ${fin === 1 ? 'espacio' : 'espacios'} al final`,
            ]
              .filter(Boolean)
              .join(' y ')}
          </strong>
          . Si vino así al copiar y el espacio no es parte del alfabeto, cambia N y el
          descifrado sale mal.{' '}
          <button type="button" className="boton boton--chico" onClick={quitarEspaciosDelBorde}>
            Quitar espacios del borde
          </button>
        </p>
      )}

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
