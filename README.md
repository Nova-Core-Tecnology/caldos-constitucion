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
inicio/ nosotros/ menu/ contacto/ reservas/ eventos/ favoritos/ carrito/ cuenta/   (cada una: .html, .css, .js)
admin/                      Panel Administrativo (index.html, admin.css, js/)
firestore.rules             reglas de seguridad (la "API" del servidor)
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
- **Platos y precios:** desde el Panel Administrativo → Menú. `components/shared/data.js` queda como respaldo si la base de datos no responde.
- **Colores:** variables `:root` en `components/shared/base.css`.

## Cuentas de clientes (inicio de sesión con Google)

El sitio usa **Firebase** (plan gratuito Spark) para que los clientes entren con su cuenta de Google:
favoritos y carrito se sincronizan entre sus dispositivos, y los pedidos y reservas que envían quedan en **Mi cuenta** (`cuenta/cuenta.html`).
El SDK de Firebase solo se descarga cuando alguien pulsa **Entrar** o ya había iniciado sesión, así que las visitas sin cuenta no cargan nada extra.

Archivos: `components/shared/auth-config.js` (datos del proyecto), `components/shared/auth.js` (sesión, sincronización e historial),
`components/shared/auth.css`, `cuenta/` (página Mi cuenta) y `firestore.rules` (reglas de seguridad).

### Activar el inicio de sesión (ya hecho)

1. Entra en https://console.firebase.google.com y crea un proyecto (por ejemplo `caldos-constitucion`). Google Analytics no hace falta.
2. **Authentication → Comenzar → Método de acceso → Google → Habilitar** (elige el correo de soporte) y guarda.
3. **Authentication → Configuración → Dominios autorizados**: añade `nova-core-tecnology.github.io` (`localhost` ya viene).
4. **Firestore Database → Crear base de datos** (modo producción, ubicación cercana, por ejemplo `nam5`).
5. **Firestore → Reglas**: pega el contenido de `firestore.rules` y pulsa **Publicar**.
6. **Configuración del proyecto (⚙) → Tus apps → Web (`</>`)**: registra la app y copia `apiKey`, `authDomain`, `projectId` y `appId`
   en `components/shared/auth-config.js`. Estos valores no son secretos; la seguridad la dan las reglas del paso 5.
7. Sube el cambio (`git add -A`, `git commit`, `git push`). En 1–2 minutos funciona en GitHub Pages.

Para probar en tu computadora usa un servidor local (`python -m http.server 8080` → http://localhost:8080); abriendo los archivos con doble clic el inicio de sesión no funciona.


## Reservaciones, eventos y Panel Administrativo

Todo funciona en el plan gratuito de Firebase (Spark), sin servidor propio: **las reglas de `firestore.rules` son la API segura**.
Google las evalúa en cada lectura y escritura, así que la identidad, los permisos y la validación de los datos se comprueban en el servidor, no solo en la página.

| Página | Qué hace |
| --- | --- |
| `reservas/` | El cliente (con sesión de Google) elige personas, día y hora con **disponibilidad real** (mesas libres y capacidad del local), añade platos opcionales y envía. Llega como *Pendiente*. |
| `eventos/` | Solicitud de evento (tipo, fecha, horario, invitados, espacio, detalles). Flujo: recibida → en revisión → cotizada → confirmada → completada (o rechazada / cancelada). |
| `cuenta/` | El cliente ve sus reservaciones y eventos en vivo, pide cambios, cancela según la política, acepta cotizaciones y lee sus avisos. |
| `admin/` | **Panel Administrativo**: resumen con cifras reales, reservaciones, eventos, mesas y plano del día, bloqueos, menú con fotos, clientes, reportes, horarios y políticas, equipo y permisos, historial, errores y copias de seguridad. |

Piezas compartidas: `components/shared/booking.js` (horarios, disponibilidad, políticas y estados), `booking.css`, `menu-live.js` (el sitio muestra el menú editado en el panel).

**Sin conflictos ni duplicados.** Al confirmar, el panel aparta cada mesa por franja en `locks/{mesa_fecha_franja}` y suma personas en `cap/{fecha_franja}` dentro de una transacción: si otra persona del equipo aparta la misma mesa al mismo tiempo, no se guarda nada y se avisa qué mesa está ocupada. Cada envío del cliente usa un identificador único, así que reintentar no crea duplicados, y no se permite otra reservación activa del mismo cliente en ese horario. Cuando un cliente cancela dentro del plazo, el panel libera sus mesas automáticamente.

**Platos elegidos.** La reservación guarda una copia del nombre y precio de cada plato: cambiar el menú después no altera las reservaciones ya hechas. Se indica siempre que **no es un pedido ni un pago**.

**Avisos.** Cada cambio de estado crea un aviso en «Mi cuenta» (con punto rojo en el encabezado). El panel muestra alertas de solicitudes nuevas y del navegador (botón «Activar alertas»), y tiene botones de WhatsApp y correo con el mensaje ya escrito, más recordatorios del día siguiente. El plan gratuito no permite enviar correos automáticos desde un servidor; si en el futuro se activa el plan Blaze se puede añadir con Cloud Functions sin cambiar lo demás.

**Seguridad.** Contraseñas: las guarda Firebase Authentication con hash (scrypt), nunca en texto. El correo por sí solo no da privilegios: el acceso al panel exige un documento `admins/{uid}` activo, que un cliente no puede crearse. Los permisos por módulo (reservaciones, eventos, mesas, menú, clientes, reportes, horarios, historial) se aplican en el servidor. El historial (`auditLog`) solo admite entradas nuevas. Los errores se registran en `errorLog` sin datos personales y al usuario se le muestran mensajes claros sin detalles técnicos. La sesión del panel se cierra al cerrar la pestaña o tras 45 minutos sin actividad.

### Cuenta del propietario (configuración inicial segura)

No hay ninguna contraseña en el código. El propietario (Harold De Los Santos, `harolddelossantos60@gmail.com`) activa su cuenta una sola vez:

1. En la consola de Firebase se crea a mano el documento `system/bootstrap` con `ownerEmail` y `codeHash` = SHA-256 (hex) de un **código de configuración** secreto que se le entrega en privado. Las reglas impiden leer o modificar ese documento desde la web.
2. Harold abre `admin/` → **Configuración inicial**, crea su acceso con su correo y **una contraseña que elige él**, confirma su correo con el enlace que recibe y escribe el código.
3. El servidor comprueba correo verificado + correo del propietario + código correcto, y crea su cuenta de propietario con todos los permisos. Después de eso el código ya no sirve: no puede existir otro propietario.

Desde **Equipo y permisos** el propietario invita a otras personas por correo (rol Administrador o Personal y permisos por módulo); ellas entran por **Configuración inicial → Tengo una invitación**.

### Puesta en marcha en Firebase (una vez)

1. **Authentication → Método de acceso**: habilitar **Correo electrónico/contraseña** (Google ya está activo).
2. **Firestore → Reglas**: pegar `firestore.rules` y **Publicar**.
3. Crear `system/bootstrap` (paso 1 de arriba).
4. Harold completa la configuración inicial y en el Resumen pulsa **Crear configuración inicial** (horario 9:00 a. m.–11:00 p. m. todos los días, 100 personas, 10 mesas) y en Menú **Importar menú actual**. Todo se ajusta después desde el panel.

### Copias de seguridad

El plan gratuito no hace copias automáticas. En **Copias de seguridad** (solo propietario) se descarga todo en un JSON con huella SHA-256; al restaurar, el panel verifica la huella y el formato antes de escribir nada y deja elegir qué restaurar. Recomendación: una copia por semana guardada en un lugar privado (contiene datos de clientes). El ciclo exportar → borrar → restaurar se probó en el emulador.

### Pruebas locales con el emulador

Con Java 21 y `firebase-tools`: `firebase emulators:start --only auth,firestore --project demo-caldos`, servir la carpeta en `http://localhost:…` y en la consola del navegador `localStorage.setItem("cc_emu", "1")`. Solo afecta a `localhost`; la web publicada siempre usa el proyecto real.

### Datos que se guardan

`users/{uid}` (perfil, favoritos, carrito, teléfono y dirección si el cliente los guarda) y `users/{uid}/orders`; `reservations` y `events` (con su historial `log`); `notifications` (avisos); `settings`, `tables`, `locks`, `cap`, `blocks`, `menu`, `menuPhotos`; `admins`, `invites`, `auditLog`, `errorLog`. Cada cliente solo ve lo suyo y puede borrar su cuenta desde **Mi cuenta**.

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
