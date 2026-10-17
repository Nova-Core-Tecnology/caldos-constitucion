/* Arranque común: monta encabezado y pie, el contenido de la página, la vegetación y las animaciones de aparición. Se carga al final de cada página. */
(function (CC) {
  "use strict";
  function start() {
    if (CC.jungle) CC.jungle.sprite();
    CC.mountHeader(); CC.mountFooter(); CC.reveal();
    if (typeof CC.page === "function") CC.page();
    /* La vegetación va después del contenido: algunas enredaderas miden su contenedor */
    if (CC.jungle) CC.jungle.init();
    if (CC.icons) CC.icons();
    CC.reveal();
  }
  /* Espera al menú en vivo (instantáneo si ya hay copia guardada; como máximo 2,5 s la primera vez) */
  var started = false;
  function go() {
    var once = function () { if (!started) { started = true; CC.booted = true; start(); } };
    (CC.menuReady || Promise.resolve()).then(once, once);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
})(window.CC = window.CC || {});
