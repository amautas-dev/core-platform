# Despliegue en producción – Problemas frecuentes

## 1. `runtime.js`: MIME type "text/html" y fallo al cargar

**Síntoma:** En consola:
```text
Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "text/html".
```

**Causa habitual:** La app pide `runtime.xxxxx.js` (y otros `.js`) pero el servidor devuelve **HTML** (p. ej. `index.html` o una 404 en HTML) en lugar del archivo JavaScript. Eso suele pasar por:

1. **`base href` y ruta de despliegue no coinciden**  
   La app se sirve en un **subdirectorio** (p. ej. `https://tudominio.com/admin/`) pero se construyó con `<base href="/">`.  
   Entonces el navegador pide `https://tudominio.com/runtime.xxxxx.js` en vez de `https://tudominio.com/admin/runtime.xxxxx.js`.  
   Esa ruta no existe → 404 → el servidor devuelve HTML (fallback SPA o página de error) → el navegador espera JS y aparece el error de MIME.

2. **Fallback SPA mal configurado**  
   El servidor redirige *todo* (incluidos los `.js`) a `index.html`. Los chunks deben servirse como archivos estáticos, no como HTML.

**Qué hacer:**

- **Si desplegás en la raíz** (`https://tudominio.com/`):  
  - Dejá `<base href="/">` en `index.html`.  
  - Build: `ng build --configuration=production` (sin tocar `--base-href`).

- **Si desplegás en un subdirectorio** (p. ej. `/admin/`):  
  - Build con `base-href` y `deploy-url`:
    ```bash
    ng build --configuration=production --base-href /admin/ --deploy-url /admin/
    ```
  - El contenido de `dist/distali-admin/` debe estar en ese subdirectorio (p. ej. `/admin/`).  
  - Verificá que los `.js` se pidan a `https://tudominio.com/admin/runtime.xxxxx.js`, etc.

- **Servidor (Apache con `.htaccess`):**  
  - Solo enviar a `index.html` lo que **no** sea archivo ni directorio existente:
    ```apache
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ index.html [L]
    ```
  - Así, `runtime.xxxxx.js` y el resto de estáticos se sirven como archivos, no como HTML.

- **Caché:**  
  - No cachear `index.html` (o usar duración muy corta).  
  - Si se cachea un `index.html` viejo, puede seguir pidiendo `runtime.xxx.js` de un build anterior que ya no existe → 404 → HTML → mismo error de MIME.

**Scripts de build:**

```bash
# Producción en raíz (/)
npm run build:prod

# Producción en subdirectorio concreto (ej. /admin/)
ng build --configuration=production --base-href /admin/ --deploy-url /admin/
```

---

## 2. Google Maps: "loaded directly without loading=async"

**Síntoma:** Aviso en consola sobre cargar la API de Maps “sin loading=async”.

**Qué hicimos:**  
En `index.html` la API de Maps se carga con `callback=onMapsLoaded` y el `<script>` tiene `async`. Los componentes de mapa comprueban si Maps está listo antes de usarlo y muestran un mensaje si no carga (p. ej. por bloqueador).

---

## 3. `ERR_BLOCKED_BY_CLIENT` (maps.googleapis.com)

**Síntoma:**  
```text
Failed to load resource: net::ERR_BLOCKED_BY_CLIENT
```
en requests a `maps.googleapis.com`.

**Causa habitual:** Una **extensión del navegador** (bloqueador de anuncios, privacidad, etc.) bloquea las peticiones a Google Maps.

**Qué hacer:**

- Desactivar el bloqueador para tu sitio, o  
- Probar en ventana de incógnito sin extensiones.

**En la app:**  
Si Maps no carga (p. ej. por bloqueo), en las pantallas de mapas se muestra *“Mapas no disponibles”* y un mensaje que sugiere desactivar el bloqueador para este sitio. El resto de la app sigue funcionando.

---

## 4. Resumen de chequeos antes de subir a producción

1. **`base-href` y ruta de despliegue**  
   - Raíz: `--base-href /` (o por defecto).  
   - Subdirectorio: `--base-href /ruta/` y `--deploy-url /ruta/`.

2. **Estáticos (`*.js`, `*.css`)**  
   - Servidos como archivos, con `Content-Type` correcto (`application/javascript`, etc.), no como HTML.

3. **Fallback SPA**  
   - Solo para rutas que no son archivos ni directorios existentes.

4. **Caché de `index.html`**  
   - Evitar o limitar para no usar un `index.html` que apunte a chunks viejos.

5. **Mapas**  
   - Si hay bloqueadores, los mapas pueden no cargar; la app lo indica y sigue operativa.
