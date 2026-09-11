# Política de seguridad

## Qué es este proyecto

Una página web que cifra y descifra con **César** y **Atbash**, y que al descifrar detecta sola
el método y el módulo usando análisis de frecuencias. Es un trabajo **didáctico**: sirve para
entender por qué estos cifrados no protegen nada, y el propio programa lo demuestra rompiéndolos
en menos de un segundo.

> **No cifres con esto información que te importe.** No es una advertencia de trámite: César tiene
> 94 claves posibles con el alfabeto por defecto y Atbash no tiene ninguna. Cualquiera con este
> mismo programa lee tu mensaje sin saber la clave.

## Modelo de amenazas

Se sigue el marco de las cuatro preguntas del [Threat Modeling
Manifesto](https://www.threatmodelingmanifesto.org/), el mismo que documenta MDN y la hoja de
OWASP. No tiene que ser complejo: describir qué hace el sistema, en qué confía y cómo se puede
abusar de él ya cubre lo importante.

### 1. ¿En qué estamos trabajando?

Una aplicación de una sola página, **sin servidor propio**. Todo el cifrado y todo el análisis
corren en el navegador de quien la visita.

| Pieza | Dónde corre | En qué confía |
|---|---|---|
| Motor de cifrado (`src/core/`) | Navegador | Nada externo: es JavaScript puro sin dependencias |
| Interfaz (`src/ui/`) | Navegador | React y el navegador |
| Tablas del español (`src/data/`) | Navegador | El corpus de dominio público, fijado por su SHA-256 |
| Publicación | GitHub Actions → GitHub Pages | GitHub, y las acciones fijadas por hash de commit |

**Qué datos se manejan:** el texto que el usuario escribe. No se envía a ningún lado, no se
guarda en el navegador y no hay telemetría, analítica ni cookies. Cerrar la pestaña lo borra.

### 2. ¿Qué puede salir mal?

| Riesgo | Qué tan real es |
|---|---|
| Que alguien crea que el cifrado protege sus datos | **Es el riesgo principal.** Es un malentendido, no una falla técnica |
| Que el texto del usuario se filtre | No hay a dónde: sin servidor, sin red, sin almacenamiento |
| Que el sitio publicado no sea el código del repositorio | Mitigado: ver *Integridad verificable* |
| Que una dependencia traiga código malicioso | Superficie mínima: el motor no usa ninguna, y el resto queda fijo en el `package-lock.json` |
| Que el proceso de publicación haga algo de más | El workflow arranca con permisos de solo lectura y declara la escritura únicamente donde hace falta |
| Que un texto pegado rompa la página | El motor valida el alfabeto y deja pasar sin cambio lo que no pertenece a él; hay tests de casos borde |

### 3. ¿Qué hacemos al respecto?

- **Se dice claramente que es didáctico**, aquí y en la propia página.
- **El texto nunca sale del navegador.** No hay backend que lo pueda registrar.
- **Integridad verificable** del sitio publicado (abajo).
- **Mínimo privilegio** en la publicación, y acciones fijadas por hash y no por etiqueta móvil:
  una etiqueta se puede reapuntar a otro código, un hash no.
- **Sin secretos en el repositorio.** No hay ninguno que guardar: la publicación se autentica
  con OIDC, sin tokens almacenados. GitHub además escanea los repositorios públicos en busca de
  credenciales filtradas.
- **Tests antes de publicar.** Si la suite falla, el sitio no se actualiza.

### 4. ¿Lo hicimos bien?

Lo que se puede comprobar, sin creerle a nadie:

```bash
npm ci && npm test    # la suite completa, incluida la medición de precisión
npm run build         # el mismo build que se publica
```

`npm test` escribe `tests/salida/precision.json` con los aciertos medidos y la longitud mínima de
texto desde la que el ataque es confiable. Los números del documento salen de ahí, no de una
captura de pantalla.

## Integridad verificable

El enlace al código apunta a una **versión fija** (un tag), no a la rama: así lo que se documenta
es exactamente lo que se publicó, aunque el repositorio siga cambiando después.

Para comprobar que el sitio en línea corre ese código, se compara el SHA-256 del paquete
publicado con el del build local:

```bash
# Hash del archivo servido por el sitio publicado
curl -s <URL-del-bundle> | sha256sum

# Hash del mismo archivo construido en tu máquina desde el tag
npm ci && npm run build && sha256sum dist/assets/index-*.js
```

Si los dos coinciden, el sitio no fue alterado después de construirse.

## Cómo reportar un problema

Usa **Security → Report a vulnerability** en este repositorio (el reporte privado de GitHub), o
abre un *issue* si no es algo sensible.

Cuenta como vulnerabilidad, por ejemplo: que el motor devuelva un texto distinto al original al
descifrar con la clave correcta, que la página ejecute contenido pegado por el usuario, o que el
proceso de publicación exponga permisos que no necesita.

**No** cuenta como vulnerabilidad que César y Atbash sean fáciles de romper: eso es el tema del
trabajo.
