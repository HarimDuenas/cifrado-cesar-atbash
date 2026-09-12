# César y Atbash, y cómo se rompen solos

Página web que cifra y descifra con **César** y **Atbash** sobre un alfabeto que alimenta el
usuario, y que al descifrar **detecta sola** el método y el módulo con el análisis de frecuencias
que describió al-Kindī en el siglo IX. Entrega **una sola línea**: nadie elige entre candidatos.

- **Sitio:** https://harimduenas.github.io/cifrado-cesar-atbash/
- **Todo corre en el navegador.** No hay servidor, ni telemetría, ni almacenamiento.
- Trabajo escolar con fines didácticos. Ver [`SECURITY.md`](./SECURITY.md).

## Cómo correrlo

```bash
npm ci          # instala con las versiones exactas del package-lock.json
npm run dev     # servidor de desarrollo
npm test        # la suite completa (49 pruebas) y la medición de precisión
npm run build   # el mismo build que se publica
```

Node 22.12 o superior.

## Cómo descifra sin que nadie le diga la clave

Lo típico sería probar las 95 claves, calificar los 95 resultados y mostrar una lista. Aquí la
clave **se calcula**, porque César y Atbash no son dos cifrados distintos: son dos casos del
**cifrado afín** sobre el índice de cada símbolo dentro del alfabeto.

```
C(i) = (a · i + b) mod N

César  →  a = +1,  b = k        (corre el alfabeto k lugares)
Atbash →  a = −1,  b = N − 1    (lo voltea de punta a punta)
```

Si un texto en español se cifró con César `k`, el histograma del criptograma es el del español
**rotado `k` posiciones**. La correlación cruzada circular entre los dos tiene su máximo justo ahí:

```
R(a, b) = Σᵢ ref[i] · obs[(a · i + b) mod N]
```

Ese es el método de al-Kindī escrito en álgebra: él dijo "cuenta las letras de un texto normal,
cuenta las del criptograma y emparéjalas". La correlación **es** esa comparación, resuelta de una
vez en lugar de a ojo.

El ataque completo son cuatro pasos:

| Paso | Pregunta | Cómo se responde |
|---|---|---|
| 0 | ¿Es atacable? | **Índice de coincidencia.** Una sustitución monoalfabética solo cambia los símbolos de lugar, así que no lo altera. Si se desploma hacia `1/N`, el texto no es César ni Atbash y el programa **lo dice** en vez de inventar |
| 1 | ¿Cuál es la clave? | Correlación cruzada sobre la familia afín completa (72 multiplicadores válidos con N = 95). El pico da `(a, b)` |
| 2 | ¿Es correcta? | Se verifican los mejores candidatos con bigramas del español y una lista de 5 000 palabras |
| 3 | Resultado | Tipo, módulo, texto claro y confianza. Una línea |

## Arquitectura

```
src/core/     JavaScript puro, sin React y sin dependencias
src/data/     tablas del español generadas del corpus
src/ui/       componentes React
scripts/      generador de las tablas
tests/        Vitest
```

`core/` está separado de React a propósito: es lo que se prueba y lo que se documenta, y así se
lee de corrido sin JSX en medio.

| Archivo | Qué hace | Errores que lanza |
|---|---|---|
| `core/alfabeto.js` | `crearAlfabeto(entrada)` normaliza a NFC, separa por *code points*, valida e indexa. Expone `n`, `indiceDe`, `simboloEn` | Menos de 2 símbolos; símbolos repetidos (el descifrado sería ambiguo) |
| `core/afin.js` | `aplicarAfin(texto, alfabeto, {a, b})`, `claveInversa`, `inversoModular`, `esInvertible` | Clave no entera; multiplicador no invertible módulo N |
| `core/cesar.js` | `cifrarCesar` / `descifrarCesar` y `normalizarDesplazamiento` (k negativa o mayor que N cae en su equivalente) | Desplazamiento no entero |
| `core/atbash.js` | `atbash`, que es su propia inversa, y `claveAtbash(n)` | — |
| `core/frecuencias.js` | `histograma`, `indiceDeCoincidencia`, `referenciaParaAlfabeto`, `puntajeBigramas`, `coberturaDePalabras` | — |
| `core/detector.js` | `detectar(criptograma, alfabeto)`: los cuatro pasos. Devuelve ganador, confianza, candidatos y las curvas para graficar | — |
| `core/texto.js` | Reducción del texto para las estadísticas: minúsculas, sin tildes, conservando la Ñ | — |

Los caracteres que **no** pertenecen al alfabeto pasan sin cambio. Con el ASCII imprimible por
defecto eso significa que las vocales acentuadas y la ñ quedan visibles en el criptograma.

## Las tablas del español no están escritas a mano

Se cuentan sobre un corpus de dominio público, y el JSON guarda la URL y el **SHA-256** de ese
corpus. Cualquiera puede bajar el mismo archivo, comprobar el hash y regenerar las tablas:

```bash
node scripts/generar-tablas.mjs corpus.txt src/data <url-del-corpus>
```

| Dato medido sobre el corpus | Valor |
|---|---|
| Corpus | *Don Quijote* (Project Gutenberg), 2 148 418 caracteres |
| Símbolo más frecuente | el **espacio**, 16.51% (la `e` va después con 10.33%) |
| IC del español (ASCII imprimible) | 0.0772 |
| IC de un texto al azar (1/95) | 0.0105 |

## Resultados medidos

`npm test` escribe `tests/salida/precision.json`. Estos números salen de ahí, no de una captura:

| Prueba | Resultado |
|---|---|
| César sobre ASCII imprimible (30 frases × 4 claves) | **120/120 — 100%** |
| Atbash sobre ASCII imprimible (30 frases) | **30/30 — 100%** |
| César sobre A–Z con Ñ (30 frases × 3 claves) | **90/90 — 100%** |
| Longitud mínima de texto confiable | **15 caracteres** |

Con 10 caracteres el sistema **se niega a responder** en vez de arriesgar una línea equivocada.
Esa es la respuesta correcta, no un fallo: con esa muestra el análisis de frecuencias no tiene de
dónde agarrarse.

## Cómo está documentado, y por qué así

La entrega pide documentar el programa "de manera segura", sin impresiones. Lo que se hizo, con
su fuente:

| Práctica | Dónde |
|---|---|
| Documentación junto al código, versionada con él | este archivo y `SECURITY.md` |
| Diagramas y fórmulas como texto, cero capturas de pantalla | aquí y en el documento |
| Referencia generada desde el código | comentarios JSDoc en todo `src/core/` |
| Modelo de amenazas con las cuatro preguntas | [`SECURITY.md`](./SECURITY.md) |
| Datos reproducibles con su hash | corpus fijado por SHA-256 en `src/data/*.json` |
| Resultados verificables, no afirmados | `npm test` → `tests/salida/precision.json` |
| Publicación con permisos mínimos | `.github/workflows/deploy.yml`: solo lectura por defecto |
| Acciones fijadas por hash de commit, no por etiqueta | mismo archivo |
| Sin secretos: la publicación usa OIDC | mismo archivo |

### Verificar que el sitio publicado corre este código

```bash
# Hash del paquete que sirve el sitio
curl -s https://harimduenas.github.io/cifrado-cesar-atbash/assets/index-TZzFLUQ4.js | sha256sum

# Hash del mismo paquete construido desde este repositorio
npm ci && npm run build && sha256sum dist/assets/index-*.js
```

Los dos deben dar:

```
eb64a59b1f6dcfc37cd8631ae922965327e05cd3d5206619a4d96caac7d78772
```

Comprobado el 2026-09-11 contra el sitio en línea: **coinciden**, así que lo publicado es
exactamente este código y nada se alteró después de construirse. Si algún día dejan de coincidir,
o el sitio fue modificado por fuera del repositorio, o el paquete se reconstruyó desde otro
commit.

Además, cada despliegue genera una **prueba firmada de procedencia** (GitHub la firma con
Sigstore), que se comprueba sin confiar en este archivo:

```bash
gh attestation verify dist/assets/index-TZzFLUQ4.js -R HarimDuenas/cifrado-cesar-atbash
```

Eso liga el paquete con el commit y el workflow exactos que lo construyeron.

## Dónde está cada punto de la rúbrica

| Punto | Peso | Dónde |
|---|---|---|
| Alimentar el sistema con el conjunto de caracteres | 5% | `core/alfabeto.js`, panel 1 |
| Seleccionar el módulo y cifrar | 10% | `core/cesar.js`, `core/atbash.js`, panel 2 |
| Detectar automáticamente el tipo y el módulo | 30% | `core/detector.js`, panel 3 |
| Una sola línea con al-Kindī, sin factor humano | 15% | pasos 1 a 3 de `detectar` |
| Publicación del sitio | 10% | `.github/workflows/deploy.yml` |
| Documentación segura | 10% | este archivo, `SECURITY.md`, los tests |
