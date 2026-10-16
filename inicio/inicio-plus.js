/* Inicio+ : efectos de impacto para la página de inicio (se carga al final, después de boot.js y botanical.js).
   No toca la lógica de inicio.js: solo añade elementos decorativos y efectos sobre lo que ya existe. */
(function () {
  "use strict";
  var CC = window.CC || {};
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---- Cinta con los platos de la carta, entre el hero y las secciones ---- */
  function band() {
    var hero = $("#hero"); if (!hero || $(".plus-band")) return;
    var names = [], seen = {};
    (CC.menu || []).forEach(function (m) {
      if (m && m.name && !seen[m.name] && names.length < 16) { seen[m.name] = 1; names.push(m.name); }
    });
    if (names.length < 4) names = ["Sancocho de siete carnes", "Caldo de pata", "Mofongo", "Mariscos", "Antojos dominicanos", "Para compartir"];
    var leaves = ["cil0", "ore1", "bas1", "par0"];
    function grp() {
      return '<div class="plus-band__grp">' + names.map(function (n, i) {
        return '<span class="plus-band__it">' + esc(n) +
          '<svg viewBox="-14 -26 28 30" aria-hidden="true" focusable="false"><use href="#' + leaves[i % leaves.length] + '" class="g5" transform="rotate(' + ((i * 37) % 60 - 30) + ') scale(24)"/></svg></span>';
      }).join("") + "</div>";
    }
    var el = document.createElement("div");
    el.className = "plus-band";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = '<div class="plus-band__track">' + grp() + grp() + "</div>";
    hero.insertAdjacentElement("afterend", el);
  }

  /* ---- Hojas que caen despacio por el hero ---- */
  function leaves() {
    var hero = $("#hero"); if (!hero || reduce || $(".plus-leaves")) return;
    var box = document.createElement("div");
    box.className = "plus-leaves"; box.setAttribute("aria-hidden", "true");
    var shapes = ["cil0", "cil1", "ore0", "bas0", "men1", "par1", "lau0", "cil3"], cols = ["g4", "g5", "g6", "g3"];
    for (var i = 0; i < 9; i++) {
      var w = 22 + Math.round(Math.random() * 28);
      var d = document.createElement("div");
      d.className = "plus-leaf";
      d.style.cssText = "left:" + (4 + i * 10.5 + Math.random() * 6).toFixed(1) + "%;--w:" + w + "px;--t:" + (20 + Math.random() * 16).toFixed(1) + "s;--dl:-" + (Math.random() * 30).toFixed(1) +
        "s;--dx:" + (Math.round(Math.random() * 120) - 40) + "px;--r0:" + (Math.round(Math.random() * 90) - 45) + "deg";
      d.innerHTML = '<svg viewBox="-1.2 -1.3 2.4 1.6" aria-hidden="true"><use href="#' + shapes[i % shapes.length] + '" class="' + cols[i % cols.length] + '" transform="translate(0 0) rotate(' + (i * 41 % 90 - 45) + ')"/></svg>';
      box.appendChild(d);
    }
    hero.appendChild(box);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) { box.classList.toggle("is-off", !e[0].isIntersecting); }, { threshold: 0 }).observe(hero);
    }
  }

  /* ---- Foco de luz que sigue al mouse en el hero ---- */
  function spotlight() {
    var hero = $("#hero"); if (!hero || !fine || reduce) return;
    var tick = false, px = 0, py = 0;
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top;
      if (tick) return; tick = true;
      requestAnimationFrame(function () { hero.style.setProperty("--px", px + "px"); hero.style.setProperty("--py", py + "px"); tick = false; });
    }, { passive: true });
  }

  /* ---- Inclinación 3D de las tarjetas de cocina ---- */
  function tilt() {
    var host = $("#tiles"); if (!host || !fine || reduce) return;
    host.addEventListener("pointermove", function (e) {
      var c = e.target.closest(".kcard"); if (!c) return;
      var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      c.style.setProperty("--ry", (x * 7).toFixed(2) + "deg"); c.style.setProperty("--rx", (-y * 6).toFixed(2) + "deg");
    });
    host.addEventListener("pointerout", function (e) {
      var c = e.target.closest(".kcard"); if (!c || c.contains(e.relatedTarget)) return;
      c.style.setProperty("--ry", "0deg"); c.style.setProperty("--rx", "0deg");
    });
  }

  /* ---- Cifras que cuentan hasta su valor al aparecer ---- */
  function counters() {
    var host = $("#wel-stats"); if (!host || reduce || !("IntersectionObserver" in window)) return;
    var nums = [].slice.call(host.querySelectorAll("b")).filter(function (b) { return /^\d+$/.test(b.textContent.trim()); });
    if (!nums.length) return;
    var vals = nums.map(function (b) { return parseInt(b.textContent, 10); });
    nums.forEach(function (b) { b.textContent = "0"; });
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      var t0 = performance.now(), dur = 1400;
      (function step(t) {
        var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        nums.forEach(function (b, i) { b.textContent = String(Math.round(vals[i] * e)); });
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    }, { threshold: .6 });
    io.observe(host);
  }

  /* ---- Paralaje suave de las matas de hierbas al desplazarse (solo bajan unos píxeles; nunca dejan hueco) ---- */
  function parallax() {
    if (reduce) return;
    var decos = [].slice.call(document.querySelectorAll(".botanical-layer .botanical-deco--hero-r, .botanical-layer .botanical-deco--c-l, .botanical-layer .botanical-deco--c-r, .botanical-layer .botanical-deco--ft-up-l, .botanical-layer .botanical-deco--ft-up-r"));
    if (!decos.length) return;
    var ticking = false;
    function run() {
      var vh = window.innerHeight;
      decos.forEach(function (d) {
        var host = d.closest(".botanical-host"); if (!host) return;
        var r = host.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        var p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
        var svg = d.firstElementChild; if (svg) svg.style.transform = "translate3d(0," + (p * 26).toFixed(1) + "px,0)";
      });
      ticking = false;
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
    run();
  }

  function init() {
    band(); leaves(); spotlight(); tilt(); counters();
    setTimeout(parallax, 600);   /* las capas de botanical.js se crean en DOMContentLoaded */
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
