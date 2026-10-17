/* Caldos Constitución — decoración de hierbas (solo adorno, nunca contenido).
   Necesita botanical.css. Cada mata es una imagen de assets/botanical/ (el navegador la dibuja una vez y solo mueve la capa,
   en lugar de animar cientos de plantas dentro de un SVG en línea). Inserta macizos de hierbas en las secciones de Inicio. */
(function () {
  "use strict";
  if (!document.querySelector) return;
  var BASE = (window.CC && window.CC.base) || "../";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var io = null;
  function watch(host, layer) {
    if (reduce || !("IntersectionObserver" in window)) { layer.classList.add("is-in"); return; }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var l = e.target.__botanicalLayer; if (!l) return;
          if (e.isIntersecting) { l.classList.add("is-in"); l.classList.remove("is-off"); }
          else l.classList.add("is-off");
        });
      }, { rootMargin: "0px 0px -6% 0px", threshold: 0.01 });
    }
    host.__botanicalLayer = layer;
    io.observe(host);
  }

  /* items: [pieza, posición, volteo ("x"|"y"|""), secundaria (se oculta en tablet/móvil)] */
  function build(host, theme, items, extra) {
    if (!host || host.getAttribute("data-botanical")) return;
    host.setAttribute("data-botanical", "1");
    host.classList.add("botanical-host");
    if (getComputedStyle(host).position === "static") host.classList.add("botanical-host--rel");

    var layer = document.createElement("div");
    layer.className = "botanical-layer" + (extra ? " " + extra : "");
    layer.setAttribute("data-theme", theme);
    layer.setAttribute("aria-hidden", "true");
    items.forEach(function (it) {
      var d = document.createElement("div");
      d.className = "botanical-deco botanical-deco--" + it[1] + (it[2] ? " botanical-flip-" + it[2] : "") + (it[3] ? " botanical-secondary" : "");
      d.innerHTML = '<img src="' + BASE + "assets/botanical/" + it[0] + '.svg" alt="" loading="lazy" decoding="async" draggable="false">';
      layer.appendChild(d);
    });
    host.appendChild(layer);
    watch(host, layer);
  }

  function sections() {
    var q = function (s) { return document.querySelector(s); };

    build(q("#hero"), "dark", [["hedge-a", "hedge"], ["tall-a", "hero-l", "", true], ["bush-xl", "hero-r"]], "botanical-layer--hero");
    build(q(".feat"), "light", [["hedge-b", "hedge"], ["bush-c", "c-l", "", true], ["bush-c", "c-r", "x", true]]);
    build(q(".kitchen"), "dark", [["hedge-a", "hedge"], ["bush-b", "c-l", "", true], ["bush-a", "c-r", "x", true]]);
    build(q(".wel"), "light", [["hedge-b", "hedge"], ["bush-b", "c-r", "x", true], ["tall-b", "wel-l", "", true]]);
    build(q(".visit"), "dark", [["hedge-a", "hedge"], ["bush-a", "c-l", "", true]], "botanical-layer--visit");

    /* El encabezado y el pie tienen su propia vegetación (header.js / footer.js con jungle.js) */
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", sections);
  else sections();
})();
