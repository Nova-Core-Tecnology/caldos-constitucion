/* Caldos Constitución — decoración de hierbas (solo adorno, nunca contenido).
   Necesita botanical-art.js (window.BOTANICAL_SPRITE y window.BOTANICAL_ART) y botanical.css.
   Inserta macizos de hierbas detrás del contenido de las secciones de Inicio. */
(function () {
  "use strict";
  var ART = window.BOTANICAL_ART;
  if (!ART || !document.querySelector) return;

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Las hojas se dibujan una vez (sprite) y todas las piezas las reutilizan */
  function sprite() {
    if (document.getElementById("botanical-sprite-host") || !window.BOTANICAL_SPRITE) return;
    var d = document.createElement("div");
    d.id = "botanical-sprite-host";
    d.setAttribute("aria-hidden", "true");
    d.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    d.innerHTML = window.BOTANICAL_SPRITE;
    document.body.insertBefore(d, document.body.firstChild);
  }

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
      if (!ART[it[0]]) return;
      var d = document.createElement("div");
      d.className = "botanical-deco botanical-deco--" + it[1] + (it[2] ? " botanical-flip-" + it[2] : "") + (it[3] ? " botanical-secondary" : "");
      d.innerHTML = ART[it[0]];
      layer.appendChild(d);
    });
    host.appendChild(layer);
    watch(host, layer);
  }

  function sections() {
    sprite();
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
