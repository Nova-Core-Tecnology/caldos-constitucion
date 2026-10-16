(function (CC) {
  "use strict";

  /* Categorías: color, frase corta e icono (mismos tonos que Inicio) */
  var CATS = {
    caldos: {
      rgb: "232, 121, 58", tag: "Ollas grandes, caldos calientes y sabor de casa.",
      icon: '<path d="M3 11h18v1a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8v-1z"/><path d="M8 3.5c-1.2 1.4 1.2 2.2 0 3.8M12 3.5c-1.2 1.4 1.2 2.2 0 3.8M16 3.5c-1.2 1.4 1.2 2.2 0 3.8"/>'
    },
    mariscos: {
      rgb: "196, 140, 80", tag: "Del mar a la mesa, con sazón dominicana.",
      icon: '<path d="M3 12c2.5-4 6-5.5 10-4.5 2 .5 3.5 2 5 4.5-1.5 2.5-3 4-5 4.5-4 1-7.5-.5-10-4.5z"/><path d="M18 12l3.2-3.2v6.4z"/><circle cx="8.2" cy="11" r=".7" fill="currentColor"/>'
    },
    antojos: {
      rgb: "229, 83, 58", tag: "Para picar, compartir o pedir otra ronda.",
      icon: '<path d="M12 3c1 3.2 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2.3 1.4 1 2.1 1.8 2.3C10.4 8.6 11 5.6 12 3z"/>'
    },
    bebidas: {
      rgb: "230, 160, 10", tag: "Bebidas dominicanas para acompañar la mesa.",
      icon: '<path d="M6 4h12l-1.4 15a2 2 0 0 1-2 1.8H9.4a2 2 0 0 1-2-1.8L6 4z"/><path d="M6.6 9.5h10.8"/><path d="M13 4l1.5-2.2"/>'
    },
    postres: {
      rgb: "214, 108, 90", tag: "Postres caseros para cerrar con dulzura.",
      icon: '<path d="M4 20h16"/><path d="M5 20v-5a7 7 0 0 1 14 0v5"/><path d="M12 8V4.5"/><circle cx="12" cy="3.5" r="1.1"/><path d="M5 15.5c2 1.4 4 1.4 7 0s5-1.4 7 0"/>'
    },
    "acompañantes": {
      rgb: "176, 130, 70", tag: "Para completar cada plato.",
      icon: '<ellipse cx="12" cy="15" rx="8.5" ry="4"/><path d="M5 14.2C5.6 8.8 8.4 6 12 6s6.4 2.8 7 8.2"/><path d="M9.5 11.2l.8 1.6M13.5 10.2l.5 1.9M16 12l-.3 1.5"/>'
    }
  };
  var ORDER = ["caldos", "mariscos", "antojos", "bebidas", "postres", "acompañantes"];
  var mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
  var reduce = mq("(prefers-reduced-motion: reduce)");

  function svg(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + inner + "</svg>";
  }
  function leafIcon(sym) { return '<svg aria-hidden="true" focusable="false"><use href="#' + (sym || "v-leaf") + '"/></svg>'; }
  function catIcon(key) { return CATS[key] ? svg(CATS[key].icon) : CC.icon("utensils"); }
  function price(it) { return (it.priceNote ? "desde " : "") + CC.money(it.price); }
  function mapUrl() { return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(CC.config.mapQuery); }

  var catCache = null;
  function categories() {
    if (catCache) return catCache;
    var out = [];
    ORDER.forEach(function (k) { if (CC.menu.some(function (m) { return m.category === k; })) out.push(k); });
    CC.menu.forEach(function (m) { if (out.indexOf(m.category) < 0) out.push(m.category); });
    return (catCache = out);
  }
  function countIn(k) { return CC.menu.filter(function (m) { return m.category === k; }).length; }

  /* Platos destacados reales de la carta; si faltan, completa con platos que tengan foto */
  function dishes(n) {
    var out = [], seen = {};
    (CC.featuredIds || []).forEach(function (id) {
      var it = CC.getItem(id);
      if (it && it.image && !seen[it.id] && out.length < n) { seen[it.id] = 1; out.push(it); }
    });
    (CC.menu || []).forEach(function (m) {
      if (out.length < n && !seen[m.id] && m.image) { seen[m.id] = 1; out.push(m); }
    });
    return out;
  }

  function icons() {
    document.querySelectorAll("[data-ic]").forEach(function (s) { s.innerHTML = CC.icon(s.getAttribute("data-ic")); });
  }

  /* ======================================================================
     Contenido
     ====================================================================== */

  /* Hero: plato protagonista, dos platos en órbita y datos rápidos */
  function hero() {
    var facts = document.getElementById("hero-facts"), art = document.getElementById("hero-art"), bg = document.getElementById("hero-bg");
    var list = dishes(3);
    if (facts) {
      facts.innerHTML =
        "<li><b>" + CC.menu.length + "</b><span>platos en la carta</span></li>" +
        "<li><b>" + categories().length + "</b><span>categorías</span></li>" +
        '<li><b class="sm">San Cristóbal</b><span>te esperamos</span></li>';
    }
    if (bg && list[0]) bg.style.backgroundImage = 'url("' + CC.imgSrc(list[0].image) + '")';
    if (art) {
      var html = "";
      if (list[0]) html += '<figure class="plate"><div class="plate__img"><img src="' + CC.imgSrc(list[0].image) + '" alt="" fetchpriority="high" decoding="async"></div><figcaption>' + CC.esc(list[0].name) + "</figcaption></figure>";
      if (list[1]) html += '<figure class="bub bub--a"><img src="' + CC.imgSrc(list[1].image) + '" alt="" loading="lazy" decoding="async"></figure>';
      if (list[2]) html += '<figure class="bub bub--b"><img src="' + CC.imgSrc(list[2].image) + '" alt="" loading="lazy" decoding="async"></figure>';
      art.insertAdjacentHTML("afterbegin", html);
      if (!list.length) art.classList.add("nh__art--solo");
      art.addEventListener("error", function (e) {
        if (e.target.tagName !== "IMG") return;
        var f = e.target.closest(".plate, .bub"); if (f) f.classList.add("img-missing");
      }, true);
    }
  }

  /* Cinta con los nombres de los platos, separados por hojitas */
  function ribbon() {
    var host = document.getElementById("ribbon"); if (!host) return;
    var names = [], seen = {};
    CC.menu.forEach(function (m) { if (!seen[m.name] && names.length < 14) { seen[m.name] = 1; names.push(m.name); } });
    if (!names.length) { host.hidden = true; return; }
    var run = names.map(function (n) { return "<span>" + CC.esc(n) + "</span><i>" + leafIcon() + "</i>"; }).join("");
    host.innerHTML = '<div class="ribbon__track">' + run + run + "</div>";
  }

  /* Quiénes somos: pilares numerados con una hoja en la esquina y banda de cifras reales */
  function story() {
    var pil = document.getElementById("pillars"), band = document.getElementById("band");
    if (pil) {
      pil.innerHTML = [
        ["utensils", "Caldos y sopas", "El centro de nuestra carta, con acompañantes para cada plato.", "v-monstera", ""],
        ["users", "Antojos y mariscos", "Para picar, compartir y probar de todo un poco.", "v-palm", " pillar__leaf--palm"],
        ["calendar", "Bebidas y postres", "Bebidas dominicanas y postres caseros para cerrar.", "v-monstera", ""]
      ].map(function (p, i) {
        return '<li class="pillar reveal" style="--d:' + (i * 90) + 'ms">' +
          '<svg class="pillar__leaf' + p[4] + '" aria-hidden="true" focusable="false"><use href="#' + p[3] + '"/></svg>' +
          '<span class="pillar__n" aria-hidden="true">0' + (i + 1) + '</span><span class="pillar__ic">' + CC.icon(p[0]) + "</span><h3>" + p[1] + "</h3><p>" + p[2] + "</p></li>";
      }).join("");
    }
    if (band) {
      var nc = categories().length;
      band.innerHTML =
        '<div><b data-count="' + CC.menu.length + '">' + CC.menu.length + "</b><span>platos en la carta</span></div>" +
        '<div><b data-count="' + nc + '">' + nc + "</b><span>categorías</span></div>" +
        '<div><b class="sm">San Cristóbal</b><span>te esperamos</span></div>';
    }
  }

  /* Contadores que suben al entrar en pantalla */
  function counters() {
    var els = document.querySelectorAll("[data-count]"); if (!els.length || reduce || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var node = en.target, to = Number(node.getAttribute("data-count")), t0 = null;
        function step(t) {
          if (t0 === null) t0 = t;
          var p = Math.min((t - t0) / 1100, 1), e = 1 - Math.pow(1 - p, 3);
          node.textContent = Math.round(to * e);
          if (p < 1) requestAnimationFrame(step);
        }
        node.textContent = "0"; requestAnimationFrame(step);
      });
    }, { threshold: .6 });
    els.forEach(function (n) { io.observe(n); });
  }

  /* La carta: pestañas por categoría y tarjeta de papel con precios reales, bajo una guirnalda */
  function carta() {
    var host = document.getElementById("carta"); if (!host) return;
    var keys = categories(); if (!keys.length) { host.closest("section").hidden = true; return; }
    var feat = CC.featuredIds || [], cur = keys[0];

    host.innerHTML =
      '<div class="tabs" role="tablist" aria-label="Categorías de la carta" aria-orientation="vertical">' +
      keys.map(function (k) {
        var n = countIn(k), c = CATS[k] || CATS.caldos;
        return '<button class="tab" type="button" role="tab" id="tab-' + k + '" data-key="' + k + '" aria-controls="carta-panel" style="--kr:' + c.rgb + '">' +
          '<span class="tab__ic" aria-hidden="true">' + catIcon(k) + "</span>" +
          '<span class="tab__t"><b>' + CC.esc(CC.categoryLabel(k)) + "</b><small>" + n + (n === 1 ? " plato" : " platos") + "</small></span>" +
          '<span class="tab__arr" aria-hidden="true">' + CC.icon("arrow") + "</span></button>";
      }).join("") + "</div>" +
      '<div class="paper-wrap"><span class="vine vine--drape tone-light" data-vine="drape" data-flowers="1" aria-hidden="true"></span>' +
      '<div class="paper" id="carta-panel" role="tabpanel" tabindex="0"></div></div>';

    var tabs = host.querySelectorAll(".tab"), panel = host.querySelector("#carta-panel");

    function paint(animate) {
      var c = CATS[cur] || CATS.caldos, label = CC.categoryLabel(cur);
      var all = CC.menu.filter(function (m) { return m.category === cur; });
      var ord = all.filter(function (m) { return feat.indexOf(m.id) > -1; }).concat(all.filter(function (m) { return feat.indexOf(m.id) < 0; }));
      var shown = ord.slice(0, 7);
      var pic = ord.filter(function (m) { return m.image; })[0];
      var rows = shown.map(function (m) {
        return "<li><div><span class=\"row__n\">" + CC.esc(m.name) + "</span>" +
          (m.description ? '<span class="row__d">' + CC.esc(m.description) + "</span>" : "") + "</div>" +
          '<i class="row__dots" aria-hidden="true"></i><b>' + price(m) + "</b></li>";
      }).join("");
      var more = all.length > shown.length ? '<p class="paper__more">y ' + (all.length - shown.length) + " más en la carta</p>" : "";
      panel.style.setProperty("--kr", c.rgb);
      panel.setAttribute("aria-labelledby", "tab-" + cur);
      panel.className = "paper";
      if (animate && !reduce) { void panel.offsetWidth; panel.className = "paper is-anim"; }
      panel.innerHTML =
        '<div class="paper__head"><div><span class="paper__k">Categoría</span><h3>' + CC.esc(label) + '</h3><p>' + CC.esc(c.tag) + "</p></div>" +
        (pic ? '<div class="paper__pic"><img src="' + CC.imgSrc(pic.image) + '" alt="" loading="lazy" decoding="async"></div>' : '<div class="paper__pic paper__pic--ic" aria-hidden="true">' + catIcon(cur) + "</div>") + "</div>" +
        '<ul class="paper__list">' + rows + "</ul>" + more +
        '<a class="btn btn--gold paper__go" href="../menu/menu.html?cat=' + encodeURIComponent(cur) + '"><span>Ver ' + CC.esc(label.toLowerCase()) + ' en la carta</span><span class="arr" aria-hidden="true">' + CC.icon("arrow") + "</span></a>";
      tabs.forEach(function (t) {
        var on = t.getAttribute("data-key") === cur;
        t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1;
      });
    }
    function select(k, focus) {
      cur = k; paint(true);
      var t = host.querySelector('[data-key="' + k + '"]');
      if (focus && t) t.focus();
      if (t && t.scrollIntoView && mq("(max-width: 960px)")) t.scrollIntoView({ block: "nearest", inline: "center", behavior: reduce ? "auto" : "smooth" });
    }
    host.addEventListener("click", function (e) {
      var t = e.target.closest(".tab"); if (t && t.getAttribute("data-key") !== cur) select(t.getAttribute("data-key"));
    });
    host.addEventListener("keydown", function (e) {
      var t = e.target.closest && e.target.closest(".tab"); if (!t) return;
      var i = keys.indexOf(cur), n = keys.length, ni = -1;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") ni = (i + 1) % n;
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") ni = (i - 1 + n) % n;
      else if (e.key === "Home") ni = 0;
      else if (e.key === "End") ni = n - 1;
      if (ni < 0) return;
      e.preventDefault(); select(keys[ni], true);
    });
    panel.addEventListener("error", function (e) {
      if (e.target.tagName !== "IMG") return;
      var p = e.target.closest(".paper__pic"); if (p) p.classList.add("img-missing");
    }, true);
    paint(false);
  }

  /* Favoritos: mosaico con un plato grande y tarjetas con foto a sangre; una palma asoma al pasar */
  function favs() {
    var host = document.getElementById("favs"); if (!host) return;
    var list = dishes(5);
    if (!list.length) { host.closest("section").hidden = true; return; }
    host.setAttribute("data-n", String(list.length));
    host.innerHTML = list.map(function (it, i) {
      var c = CATS[it.category] || CATS.caldos;
      return '<a class="fav reveal" style="--d:' + (i * 80) + "ms;--kr:" + c.rgb + '" href="../menu/menu.html?cat=' + encodeURIComponent(it.category) + '">' +
        '<span class="fav__img"><img src="' + CC.imgSrc(it.image) + '" alt="" loading="lazy" decoding="async"></span>' +
        '<svg class="fav__sprig" aria-hidden="true" focusable="false"><use href="#v-palm"/></svg>' +
        '<span class="fav__top"><span class="fav__no" aria-hidden="true">0' + (i + 1) + '</span><span class="fav__cat">' + CC.esc(CC.categoryLabel(it.category)) + "</span></span>" +
        '<span class="fav__body"><h3 class="fav__name">' + CC.esc(it.name) + "</h3>" +
        (i === 0 && it.description ? '<span class="fav__desc">' + CC.esc(it.description) + "</span>" : "") +
        '<span class="fav__row"><span class="fav__price">' + price(it) + '</span><span class="fav__go" aria-hidden="true">' + CC.icon("arrow") + "</span></span></span></a>";
    }).join("");
    host.addEventListener("error", function (e) {
      if (e.target.tagName !== "IMG") return;
      var w = e.target.closest(".fav__img"); if (w) w.classList.add("img-missing");
    }, true);
  }

  /* Familia y chef: si la foto aún no existe, se muestra el marcador con el logo */
  function team() {
    function miss(img) { var f = img.closest(".pframe"); if (f) f.classList.add("is-missing"); }
    document.querySelectorAll(".pimg").forEach(function (img) { if (img.complete && img.naturalWidth === 0) miss(img); });
    document.addEventListener("error", function (e) {
      if (e.target && e.target.classList && e.target.classList.contains("pimg")) miss(e.target);
    }, true);
  }

  /* Cierre: dirección, WhatsApp y horario reales de la configuración */
  function visit() {
    var host = document.getElementById("visit-info"); if (!host) return;
    var c = CC.config;
    var hours = c.hours && c.hours.length
      ? c.hours.map(function (h) { return CC.esc(h.days) + ": " + CC.esc(h.time); }).join("<br>")
      : "Consulta el horario por WhatsApp";
    var NEW = '<span class="visually-hidden"> (se abre en una pestaña nueva)</span>';
    var arrow = '<span class="trow__go" aria-hidden="true">' + CC.icon("arrow") + "</span>";
    function link(href, icon, label, text) {
      return '<a class="trow" href="' + href + '" target="_blank" rel="noopener noreferrer"><span class="trow__ic" aria-hidden="true">' + CC.icon(icon) + "</span><span><small>" + label + "</small><b>" + text + NEW + "</b></span>" + arrow + "</a>";
    }
    host.innerHTML =
      link(mapUrl(), "pin", "Dónde estamos", CC.esc(c.address)) +
      link(CC.waLink("Hola, quisiera información."), "chat", "Escríbenos por WhatsApp", CC.esc(c.whatsappDisplay)) +
      '<div class="trow"><span class="trow__ic" aria-hidden="true">' + CC.icon("clock") + "</span><span><small>Horario</small><b>" + hours + "</b></span><span></span></div>";
  }

  CC.page = function () {
    icons();
    hero();
    ribbon();
    story();
    carta();
    favs();
    team();
    visit();
    counters();
    CC.reveal();   /* la vegetación la monta CC.jungle (boot.js) después de este contenido */
  };
})(window.CC = window.CC || {});
