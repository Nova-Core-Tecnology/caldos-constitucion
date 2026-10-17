/* Configuración de Firebase para el inicio de sesión con Google (proyecto caldos-constitucion).
   Estos valores NO son secretos: identifican el proyecto y es normal que estén en el código del sitio.
   La seguridad de los datos la dan las reglas de Firestore (archivo firestore.rules en la raíz del proyecto,
   ya publicadas en Firebase → Firestore Database → Reglas). */
(function (CC) {
  "use strict";
  CC.authConfig = {
    apiKey: "AIzaSyAUQQ3JiU9pTHKrsv9tF2SnVshEKF4t8z8",
    authDomain: "caldos-constitucion.firebaseapp.com",
    projectId: "caldos-constitucion",
    storageBucket: "caldos-constitucion.firebasestorage.app",
    messagingSenderId: "217709910128",
    appId: "1:217709910128:web:740c412e89c539b1eb7cb5"
  };
  /* Pruebas locales con los emuladores de Firebase: solo en localhost y si se activa a mano
     (en la consola del navegador: localStorage.setItem("cc_emu", "1")). Nunca afecta a la web publicada. */
  try {
    CC.useEmulator = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && localStorage.getItem("cc_emu") === "1";
  } catch (e) { CC.useEmulator = false; }
})(window.CC = window.CC || {});
