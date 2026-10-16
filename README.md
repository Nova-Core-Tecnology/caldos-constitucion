# Caldos Constitución And Restaurant — sitio web

Sitio estático (HTML + CSS + JavaScript sin dependencias ni paso de compilación). Tecnología conservada del proyecto original: HTML/CSS/JS vanilla.

## Ejecutar

```bash
# Opción 1: abrir index.html directamente en el navegador (funciona con file://)
# Opción 2: servidor local
cd caldos-constitucion
python3 -m http.server 8080      # luego visitar http://localhost:8080
```

Para producción basta subir la carpeta tal cual a cualquier hosting estático (Netlify, GitHub Pages, cPanel, etc.).

## Estructura

```
index.html                  redirige a inicio/inicio.html
inicio/ nosotros/ menu/ contacto/ reservas/ favoritos/ carrito/   (cada una: .html, .css, .js)
components/header/          encabezado compartido (header.js, header.css)
components/footer/          pie compartido (footer.js, footer.css)
components/shared/          base.css, config.js, data.js (menú), store.js (carrito/favoritos), ui.js, boot.js
assets/logo/  assets/icons/ logotipo optimizado y favicon
assets/images/menu/         FOTOS DE PLATOS (ver "Pendiente")
assets/images/ilustracion-*.svg  ilustraciones originales de respaldo
assets/video/               hero.mp4: video de fondo del hero (ver LEEME.txt)
```

El encabezado y el pie se inyectan desde JavaScript (`CC.mountHeader()` / `CC.mountFooter()`), así que existe una sola copia y funcionan también abriendo los archivos sin servidor. Los scripts son módulos IIFE sobre el espacio de nombres `window.CC` (no se usan módulos ES porque el navegador los bloquea en `file://`).

## Dónde editar

- **Contacto, WhatsApp, horario, redes:** `components/shared/config.js` (los valores `null` se ocultan en la interfaz).
- **Platos y precios:** `components/shared/data.js` (única fuente para Inicio, Menú, Favoritos y Carrito).
- **Colores:** variables `:root` en `components/shared/base.css`.

## Cómo funcionan las partes con "backend"

No existe servidor, sistema de pagos ni plataforma de reservas verificada. Por eso:

- **Reservas, Contacto y Carrito** validan los datos y abren **WhatsApp con el mensaje ya redactado**. Nada se envía hasta que el cliente pulsa enviar. La página indica claramente que la reserva/pedido **no está confirmado** hasta que el restaurante responda.
- **Favoritos y carrito** se guardan en `localStorage` (por dispositivo/navegador).
- Para integrar un sistema real (API de reservas, pasarela de pago, correo), reemplazar el envío en `reservas/reservas.js`, `contacto/contacto.js` y `carrito/carrito.js`; la validación del navegador no sustituye la del servidor.

## Fuentes e investigación (Fase 2)

Búsquedas realizadas el 10/10/2026. **No se pudo verificar la información del restaurante con fuentes independientes**: las búsquedas web no devolvieron perfiles propios del negocio (Instagram, Facebook, TikTok, Google Maps ni plataformas de pedidos), y el acceso directo a Instagram no fue posible desde esta herramienta. No se revisó ninguna publicación del restaurante.

Datos usados y su origen:

| Dato | Origen | Estado |
|---|---|---|
| Logotipo | Archivo entregado por el cliente | Oficial |
| Menú, precios, descripciones, ingredientes, alérgenos | Código del sitio anterior (`script.js`) | **Por confirmar con el restaurante** |
| Dirección (Calle Duarte, frente al Parque Piedras Vivas) | Sitio anterior | **Por confirmar.** Un listado de Uber Eats muestra esa misma dirección asociada a otro negocio ("Martin Food"); verificar |
| WhatsApp +1 809 861 6185 | Sitio anterior | **Por confirmar** |
| Instagram `@caldosconstitucionrd`, Facebook `CaldosConstitucionRD`, TikTok `@caldosconstitucionrd` | Sitio anterior | **Por confirmar** que son las cuentas oficiales |
| San Cristóbal: primera Constitución dominicana firmada el 6/11/1844 | Wikipedia (San Cristóbal, República Dominicana); Conéctate (conectate.com.do) | Dato histórico de la ciudad |

**Eliminado por no tener respaldo verificable:** calificación 4.9/5, "+12,000 / 50,000 clientes", "120+ platillos", "15 años", testimonios, equipo (nombres y cargos), promociones y códigos, historia familiar, misión/visión, correo `hola@caldosconstitucion.do`, teléfono `(809) 000-0000`, horario 9:00–23:30 con domingo cerrado, métodos de pago, newsletter, disponibilidad simulada de mesas, flujo de pago con tarjeta, calorías, valoraciones y tiempos de preparación por plato.

## Pendiente (requiere al restaurante)

0. **Video del hero:** copiar `hero.mp4` a `assets/video/` (instrucciones en `assets/video/LEEME.txt`). Arranca solo al entrar, en silencio y en bucle, y el visitante puede pausarlo con el botón del hero. Si el navegador bloquea el autoplay, arranca con el primer toque o scroll. Hasta entonces se muestra una ilustración y el navegador registrará un aviso 404 por el archivo ausente.

1. **Fotos de platos:** copiar a `assets/images/menu/` los archivos del sitio anterior con estos nombres (los mismos de la carpeta `img/` original): ver `image` en `data.js` (p. ej. `sancocho_dominicano.png`, `mofongo_crunchy.jpg`). Mientras no existan, las tarjetas muestran el logotipo como marcador y el collage de *Bienvenido* muestra ilustraciones originales (`assets/images/ilustracion-*.svg`). Usar solo fotos propias o autorizadas.
2. Confirmar precios, ingredientes y alérgenos; horario; dirección; WhatsApp; cuentas sociales; correo.
3. Fotos reales del local y texto de historia/valores si se desean en *Nosotros*.
4. Fuentes tipográficas: se cargan desde Google Fonts (Fraunces y Nunito Sans) con alternativas del sistema si no hay conexión.
