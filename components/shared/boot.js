/* Arranque común: monta encabezado y pie, el contenido de la página, la vegetación y las animaciones de aparición. Se carga al final de cada página. */
(function (CC) {
  "use strict";
  function start() {
    if (CC.jungle) CC.jungle.sprite();
    CC.mountHeader(); CC.mountFooter(); CC.reveal();
    if (typeof CC.page === "function") CC.page();
    /* La vegetación va después del contenido: algunas enredaderas miden su contenedor */
    if (CC.jungle) CC.jungle.init();
    CC.reveal();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})(window.CC = window.CC || {});
