# Clave de funciones

Este archivo es la **llave de lectura del código**. En `src/core/` cada función y cada constante
exportada lleva un marcador opaco entre corchetes, por ejemplo `[AL-05]`, y el código no explica en
ese punto qué hace: la explicación vive aquí, fuera del programa.

Así se documenta sin que el código sea auto-revelador para quien solo lo hojea. Quien tiene esta
clave lee el programa completo; quien no la tiene ve identificadores y aritmética modular.

**Cómo se usa:** se busca el marcador en el código (`grep -rn "AL-05" src/core/`) y se lee su fila
en la tabla que le corresponde. El prefijo dice en qué archivo está.

| Prefijo | Archivo | De qué se encarga |
|---|---|---|
| `AL` | `src/core/alfabeto.js` | El conjunto de símbolos con el que se cifra. Define N |
| `AF` | `src/core/afin.js` | El cifrado afín y su aritmética inversa |
| `CS` | `src/core/cesar.js` | César, el caso afín con `a = 1` |
| `AT` | `src/core/atbash.js` | Atbash, el caso afín con `a = −1` |
| `TX` | `src/core/texto.js` | Reducción del texto para medir el idioma |
| `FR` | `src/core/frecuencias.js` | Histogramas, índice de coincidencia y tabla de referencia |
| `DT` | `src/core/detector.js` | El ataque: los cuatro pasos del descifrado automático |

## AL · El alfabeto

| Marcador | Símbolo | Qué hace |
|---|---|---|
| `[AL-01]` | `ASCII_IMPRIMIBLE` | Genera el alfabeto de los 95 caracteres imprimibles del código ASCII, del 32 (espacio) al 126 (virgulilla). Es el alfabeto que el programa usa por omisión |
| `[AL-02]` | `ESPANOL_MAYUSCULAS` | El alfabeto clásico del castellano en mayúsculas, con Ñ y sin espacios: 27 símbolos |
| `[AL-03]` | `PRESETS` | Los dos alfabetos anteriores, listos para elegir en la interfaz con su nombre visible |
| `[AL-04]` | `modulo` | Operación de módulo que siempre devuelve un valor entre 0 y N−1. Existe porque el residuo de JavaScript conserva el signo del dividendo, así que una clave negativa se saldría del alfabeto |
| `[AL-05]` | `crearAlfabeto` | Construye el alfabeto validado: normaliza a NFC, separa por *code points* (para no partir emojis), rechaza alfabetos de menos de dos símbolos y los que tienen repetidos, e indexa cada símbolo para buscarlo en tiempo constante |

## AF · El cifrado afín

| Marcador | Símbolo | Qué hace |
|---|---|---|
| `[AF-01]` | `mcd` | Máximo común divisor por el algoritmo de Euclides |
| `[AF-02]` | `esInvertible` | Dice si un multiplicador sirve para cifrar con ese alfabeto: solo si no comparte divisores con N. Si los compartiera, dos símbolos distintos caerían en el mismo y el mensaje no podría descifrarse |
| `[AF-03]` | `inversoModular` | Calcula el inverso multiplicativo con el algoritmo extendido de Euclides: el número que deshace la multiplicación al descifrar |
| `[AF-04]` | `claveInversa` | Dada una clave de cifrado, devuelve la que la revierte |
| `[AF-05]` | `aplicarAfin` | Aplica `C(i) = (a·i + b) mod N` símbolo por símbolo. Los caracteres que no pertenecen al alfabeto pasan sin cambio. Es la operación de la que César y Atbash son casos particulares |

## CS · César

| Marcador | Símbolo | Qué hace |
|---|---|---|
| `[CS-01]` | `A_CESAR` | El multiplicador que define a César dentro de la familia afín: `a = 1` |
| `[CS-02]` | `normalizarDesplazamiento` | Lleva cualquier clave a su equivalente dentro del alfabeto: con 95 símbolos, 112 se trata como 17 y −1 como 94 |
| `[CS-03]` | `cifrarCesar` | Cifra corriendo cada símbolo k lugares dentro del alfabeto |
| `[CS-04]` | `descifrarCesar` | Descifra un César del que ya se conoce la clave: la misma operación con el desplazamiento en negativo |

## AT · Atbash

| Marcador | Símbolo | Qué hace |
|---|---|---|
| `[AT-01]` | `A_ATBASH` | El multiplicador que define a Atbash: `a = −1` |
| `[AT-02]` | `claveAtbash` | La clave afín equivalente a Atbash para un alfabeto de N símbolos: `{ a: −1, b: N−1 }` |
| `[AT-03]` | `atbash` | Voltea el alfabeto de punta a punta: el primer símbolo por el último. Es su propia inversa, así que cifra y descifra con la misma operación, y **no usa módulo**: es una permutación fija |
| `[AT-04]` | `cifrarAtbash` | Alias de `[AT-03]`, para que la interfaz se lea sin ambigüedad |
| `[AT-05]` | `descifrarAtbash` | Alias de `[AT-03]`: es la misma operación que cifrar |

## TX · Reducción de texto

| Marcador | Símbolo | Qué hace |
|---|---|---|
| `[TX-01]` | `LETRAS_Y_ESPACIO` | Las letras del español en minúsculas más el espacio: el conjunto sobre el que se miden bigramas y palabras |
| `[TX-02]` | `quitarTildes` | Quita acentos y diéresis pero **conserva la Ñ**: borrar todas las marcas convertiría "ñ" en "n" y el idioma perdería una letra que sí cuenta |
| `[TX-03]` | `reducir` | Deja el texto en minúsculas, sin tildes y con solo letras y espacios simples |
| `[TX-04]` | `bigramasDe` | Extrae los pares de caracteres consecutivos del texto reducido |
| `[TX-05]` | `palabrasDe` | Extrae las palabras de 2 a 20 caracteres del texto reducido |

## FR · Frecuencias

| Marcador | Símbolo | Qué hace |
|---|---|---|
| `[FR-01]` | `METADATOS_REFERENCIA` | De dónde salieron las tablas: la dirección del corpus, su SHA-256 y la fecha |
| `[FR-02]` | `IC_REFERENCIA` | El índice de coincidencia del español medido sobre el corpus, y el de un texto al azar |
| `[FR-03]` | `PALABRAS` | Las 5 000 palabras más usadas del corpus, para el juez léxico |
| `[FR-04]` | `SUAVIZADO` | Valor mínimo que se suma a cada símbolo de la referencia, para que ninguno quede en cero y un emoji no vuelva imposible un texto |
| `[FR-05]` | `histograma` | Cuenta cuántas veces aparece cada símbolo del alfabeto en un texto, y lo convierte a proporciones. Lo que no pertenece al alfabeto se ignora, porque no fue cifrado |
| `[FR-06]` | `indiceDeCoincidencia` | Calcula `IC = Σ nᵢ(nᵢ−1) / [n(n−1)]`: la probabilidad de que dos símbolos tomados al azar sean el mismo. Una sustitución monoalfabética no lo altera, y por eso delata si el texto es atacable |
| `[FR-07]` | `referenciaParaAlfabeto` | Proyecta la tabla del español sobre el alfabeto elegido, doblando minúsculas y acentuadas sobre el símbolo correspondiente. Informa además qué proporción del idioma cubre ese alfabeto |
| `[FR-08]` | `puntajeBigramas` | Promedia el logaritmo de la probabilidad de cada par de letras: descarta candidatos con combinaciones imposibles en español |
| `[FR-09]` | `coberturaDePalabras` | Mide qué proporción de las letras forman palabras que existen, pesada por la longitud de cada palabra |

## DT · El ataque

| Marcador | Símbolo | Qué hace |
|---|---|---|
| `[DT-01]` | `MINIMO_SIMBOLOS` | Cuántos símbolos hacen falta para intentar el ataque (12). Con menos, la muestra estadística no alcanza y el sistema se abstiene |
| `[DT-02]` | `UMBRAL_IC` | Qué tan arriba del azar debe estar el índice de coincidencia para dar por bueno que el texto es monoalfabético (0.35 del camino entre el azar y el español) |
| `[DT-03]` | `CANDIDATOS_A_VERIFICAR` | Cuántos candidatos del paso 1 pasan a la verificación del paso 2 (8) |
| `[DT-04]` | `PESOS` | Cuánto pesa cada juez al combinarlos: 0.6 los bigramas y 0.4 las palabras |
| `[DT-05]` | `MINIMA_COBERTURA` | Cobertura mínima del alfabeto en el corpus para que haya referencia utilizable (0.2). Por debajo, el programa avisa que no puede atacar |
| `[DT-06]` | `correlacion` | Calcula `R(a,b) = Σᵢ ref[i] · obs[(a·i + b) mod N]`: la correlación cruzada entre la frecuencia esperada del español y la observada en el criptograma. **Es el método de al-Kindī escrito en álgebra** |
| `[DT-07]` | `multiplicadoresValidos` | Lista los multiplicadores que sirven para el alfabeto: con 95 símbolos son 72 |
| `[DT-08]` | `clasificar` | Dada la clave encontrada, decide si es César (y con qué módulo), Atbash o un afín genérico, y arma la etiqueta que ve el usuario |
| `[DT-09]` | `probabilidades` | Convierte los puntajes de los candidatos en probabilidades relativas: de ahí sale la confianza que muestra la interfaz. Si dos candidatos empatan, la confianza baja sola |
| `[DT-10]` | `detectar` | **El ataque completo, en cuatro pasos:** paso 0, decide si el texto es atacable con el índice de coincidencia; paso 1, calcula la clave por correlación cruzada; paso 2, verifica los mejores candidatos con bigramas y palabras; paso 3, devuelve una sola línea con tipo, módulo, texto claro y confianza |

## Por qué esta forma de documentar

Un comentario dentro del código explica la función a cualquiera que abra el archivo. Separar el
significado del marcador tiene tres consecuencias:

1. **El código no revela su intención a quien solo lo hojea.** Los nombres siguen siendo
   descriptivos porque el programa debe ser mantenible, pero la explicación del *por qué* y de las
   decisiones vive en un documento aparte, que se entrega junto con el trabajo.
2. **La documentación se puede versionar y firmar por separado** del código que describe.
3. **Obliga a que la explicación exista.** Un marcador sin fila en esta tabla es una función
   indocumentada, y eso se detecta con un `grep`, no con una revisión a ojo.

Los comentarios JSDoc del código **se conservan**: describen entradas, salidas y errores para quien
mantiene el programa. Esta clave es la capa de lectura del trabajo entregado.
