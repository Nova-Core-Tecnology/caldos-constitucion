(function (CC) {
  "use strict";
  var ART = { 3: "ilustracion-caldo.svg", 9: "ilustracion-plato.svg", 16: "ilustracion-olla.svg" };

  function heroVideo() {
    var hero = document.getElementById("hero"), v = document.getElementById("hero-video"), ctl = document.getElementById("hero-ctl");
    if (!hero || !v || !ctl) return;
    var userPaused = false;
    v.muted = true; v.defaultMuted = true; v.setAttribute("muted", ""); v.playsInline = true;
    function paint(paused) {
      ctl.setAttribute("aria-pressed", String(paused));
      ctl.setAttribute("aria-label", paused ? "Reproducir video de fondo" : "Pausar video de fondo");
      ctl.innerHTML = CC.icon(paused ? "play" : "pause");
    }
    function play() {
      try { var p = v.play(); if (p && p.then) p.then(function () { paint(false); }, retryOnTouch); } catch (e) { retryOnTouch(); }
    }
    // Si el navegador bloquea el autoplay (p. ej. ahorro de batería), arranca con el primer toque o scroll
    var armed = false;
    function retryOnTouch() {
      if (armed) return; armed = true;
      var go = function () { if (!userPaused) play(); ["touchstart", "pointerdown", "keydown", "scroll"].forEach(function (t) { window.removeEventListener(t, go); }); armed = false; };
      ["touchstart", "pointerdown", "keydown", "scroll"].forEach(function (t) { window.addEventListener(t, go, { passive: true, once: true }); });
    }
    function ready() { hero.classList.add("has-video"); ctl.hidden = false; if (!userPaused) { paint(false); play(); } }
    v.addEventListener("loadeddata", ready);
    v.addEventListener("canplay", function () { if (!userPaused && v.paused) play(); });
    document.addEventListener("visibilitychange", function () { if (!document.hidden && !userPaused && v.paused && hero.classList.contains("has-video")) play(); });
    ctl.addEventListener("click", function () {
      if (v.paused) { userPaused = false; play(); paint(false); } else { userPaused = true; try { v.pause(); } catch (e) { /* noop */ } paint(true); }
    });
    if (v.readyState >= 2) ready();
    play();
  }

  /* Plato giratorio: cambia solo cada 6,5 s hasta que la persona elige uno o pasa el mouse */
  function heroStage() {
    var host = document.getElementById("stage"); if (!host) return;
    var items = (CC.featuredIds || []).map(function (id) { return CC.getItem(id); }).filter(Boolean);
    if (!items.length) { host.hidden = true; return; }
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var cur = 0, timer = null, paused = false, touched = false;

    var slides = items.map(function (it, i) {
      return '<div class="plate__slide' + (i === 0 ? " is-on" : "") + '"><img src="' + CC.imgSrc(it.image) + '" alt="" decoding="async"' + (i === 0 ? ' fetchpriority="high"' : "") + "></div>";
    }).join("");
    var thumbs = items.map(function (it, i) {
      return '<button class="thumb" type="button" data-slide="' + i + '" aria-current="' + (i === 0) + '" aria-label="Ver ' + CC.esc(it.name) + '"><img src="' + CC.imgSrc(it.image) + '" alt="" loading="lazy" decoding="async"></button>';
    }).join("");
    host.innerHTML =
      '<div class="stage__art">' +
      '<div class="stage__orbit" aria-hidden="true"></div>' +
      '<div class="stage__steam" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' +
      '<div class="plate"><div class="plate__rim"><div class="plate__well">' + slides + "</div></div></div>" +
      '<div class="stage__thumbs" role="group" aria-label="Elegir plato">' + thumbs + "</div></div>" +
      '<div class="stage__card" id="stage-card" aria-live="off"></div>';

    var slideEls = host.querySelectorAll(".plate__slide"), thumbEls = host.querySelectorAll(".thumb"), card = host.querySelector("#stage-card");
    slideEls.forEach(function (s) {
      var img = s.querySelector("img");
      img.addEventListener("error", function () { s.classList.add("img-missing"); });
    });

    function paintCard(it, animate) {
      card.setAttribute("data-id", it.id);
      card.innerHTML =
        '<p class="stage__name">' + CC.esc(it.name) + "</p>" +
        '<p class="stage__desc">' + CC.esc(it.description) + "</p>" +
        '<div class="stage__foot"><span class="stage__price">' + (it.priceNote ? "desde " : "") + CC.money(it.price) + "</span>" +
        '<button class="btn btn--sm btn--ghost" type="button" data-action="details">Detalles</button>' +
        '<button class="btn btn--sm btn--gold" type="button" data-action="add">' + CC.icon("plus") + "Añadir</button></div>";
      if (animate) { card.classList.remove("is-swap"); void card.offsetWidth; card.classList.add("is-swap"); }
    }
    function go(i, animate) {
      cur = (i + items.length) % items.length;
      slideEls.forEach(function (s, j) {
        s.style.setProperty("--r", (j < cur ? "28deg" : "-28deg"));
        s.classList.toggle("is-on", j === cur);
      });
      thumbEls.forEach(function (t, j) { t.setAttribute("aria-current", String(j === cur)); });
      paintCard(items[cur], animate);
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function start() {
      if (reduce || touched || timer) return;
      timer = setInterval(function () { if (!document.hidden && !paused) go(cur + 1, true); }, 6500);
    }

    host.addEventListener("click", function (e) {
      var b = e.target.closest("[data-slide]"); if (!b) return;
      touched = true; stop(); card.setAttribute("aria-live", "polite"); go(Number(b.dataset.slide), true);
    });
    host.addEventListener("keydown", function (e) {
      var t = e.target.closest && e.target.closest(".thumb"); if (!t) return;
      var d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]; if (!d) return;
      e.preventDefault(); touched = true; stop(); card.setAttribute("aria-live", "polite");
      go(cur + d, true); thumbEls[cur].focus();
    });
    host.addEventListener("mouseenter", function () { paused = true; });
    host.addEventListener("mouseleave", function () { paused = false; });
    host.addEventListener("focusin", function () { paused = true; });
    host.addEventListener("focusout", function () { paused = false; });

    CC.bindDishes(host);
    go(0, false);
    start();
  }

  /* Platos destacados: plato protagonista + lista; las categorías cambian el protagonista */
  function featured() {
    var host = document.getElementById("featured"); if (!host) return;
    var items = (CC.featuredIds || []).map(function (id) { return CC.getItem(id); }).filter(Boolean);
    var filters = document.getElementById("feat-filters"), status = document.getElementById("feat-status"), count = document.getElementById("feat-count");
    if (!items.length) { host.closest(".feat").hidden = true; return; }

    var cats = [];
    items.forEach(function (it) { if (cats.indexOf(it.category) < 0) cats.push(it.category); });
    var cur = "all", order = [], firstId = null;

    var MAX = 4;
    function pick(cat) {
      if (cat === "all") return items.slice(0, MAX);
      var list = items.filter(function (it) { return it.category === cat; });
      (CC.menu || []).forEach(function (m) {
        if (list.length < MAX && m.category === cat && !list.some(function (x) { return x.id === m.id; })) list.push(m);
      });
      return list.slice(0, MAX);
    }
    function price(it) { return (it.priceNote ? "desde " : "") + CC.money(it.price); }
    function lead(it) {
      var tag = it.id !== firstId ? "Tu selección" : (cur === "all" ? "Favorito de la casa" : "Lo mejor en " + CC.categoryLabel(cur).toLowerCase());
      return '<article class="dlead" data-id="' + it.id + '">' +
        '<div class="dlead__plate"><div class="dlead__rim"><div class="dlead__well"><img src="' + CC.imgSrc(it.image) + '" alt="' + CC.esc(it.name) + '" decoding="async"></div></div></div>' +
        '<div class="dlead__body"><span class="dlead__tag">' + CC.esc(tag) + "</span>" +
        '<h3 class="dlead__name">' + CC.esc(it.name) + "</h3>" +
        '<p class="dlead__desc">' + CC.esc(it.description) + "</p>" +
        '<div class="dlead__foot"><span class="dlead__price">' + price(it) + "</span>" +
        '<button class="btn btn--sm btn--gold" type="button" data-action="add">' + CC.icon("plus") + "Añadir</button></div></div></article>";
    }
    function row(it, i) {
      return '<article class="dpick" data-id="' + it.id + '" style="--i:' + i + '">' +
        '<div class="dpick__img"><img src="' + CC.imgSrc(it.image) + '" alt="" loading="lazy" decoding="async"></div>' +
        '<div class="dpick__txt"><span class="dpick__cat">' + CC.esc(CC.categoryLabel(it.category)) + "</span>" +
        '<h3 class="dpick__name"><button class="dpick__link" type="button" data-select aria-label="Ver ' + CC.esc(it.name) + ' en la tarjeta">' + CC.esc(it.name) + "</button></h3>" +
        '<p class="dpick__desc">' + CC.esc(it.description) + "</p></div>" +
        '<div class="dpick__side"><span class="dpick__price">' + price(it) + "</span>" +
        '<button class="dpick__add" type="button" data-action="add" aria-label="Añadir ' + CC.esc(it.name) + '">' + CC.icon("plus") + "</button></div></article>";
    }
    function renderFilters() {
      var all = [["all", "Todos", items.length]].concat(cats.map(function (c) {
        return [c, CC.categoryLabel(c), items.filter(function (it) { return it.category === c; }).length];
      }));
      filters.innerHTML = cats.length < 2 ? "" : all.map(function (f) {
        return '<button class="dchip" type="button" data-cat="' + f[0] + '" aria-pressed="' + (f[0] === cur) + '">' + CC.esc(f[1]) + "</button>";
      }).join("");
    }
    function render(animate, swap) {
      var list = order;
      host.className = "feat__layout" + (animate ? " is-anim" : "") + (swap ? " is-swap" : "");
      host.innerHTML = lead(list[0]) + '<div class="dlist">' + list.slice(1).map(function (it, i) { return row(it, i); }).join("") + "</div>";
      var msg = list.length + (list.length === 1 ? " plato" : " platos") + (cur === "all" ? " destacados" : " de " + CC.categoryLabel(cur).toLowerCase());
      count.textContent = msg + ". La carta completa tiene " + CC.menu.length + " platos.";
      if (animate) status.textContent = "Mostrando " + msg;
      renderFilters();
    }

    // Si una foto no carga, se muestra el logo en su lugar
    host.addEventListener("error", function (e) {
      if (e.target.tagName !== "IMG") return;
      var box = e.target.closest(".dlead__well, .dpick__img"); if (box) box.classList.add("img-missing");
    }, true);
    filters.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cat]"); if (!b || b.getAttribute("data-cat") === cur) return;
      cur = b.getAttribute("data-cat"); order = pick(cur); firstId = order[0].id; render(true);
      var again = filters.querySelector('[data-cat="' + cur + '"]'); if (again) again.focus();
    });

    // Clic en una fila: el plato pasa a la tarjeta de la izquierda (sin abrir el modal) y el que estaba ahí ocupa su lugar
    host.addEventListener("click", function (e) {
      var b = e.target.closest("[data-select]"); if (!b) return;
      e.stopPropagation();
      var id = String(b.closest("[data-id]").getAttribute("data-id")), idx = -1;
      order.forEach(function (it, i) { if (String(it.id) === id) idx = i; });
      if (idx < 1) return;
      var t = order[0]; order[0] = order[idx]; order[idx] = t;
      render(true, true);
      status.textContent = "Mostrando " + order[0].name;
      var nb = host.querySelectorAll(".dpick__link")[idx - 1]; if (nb) nb.focus();
    }, true);

    CC.bindDishes(host);
    order = pick("all"); firstId = order[0].id;
    render(false);
  }

  /* Datos útiles al pie del hero */
  function strip() {
    var host = document.getElementById("strip"); if (!host) return;
    var c = CC.config, map = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(c.mapQuery);
    var item = function (href, icon, label, text, ext) {
      return '<a class="hinfo__item" href="' + href + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : "") + '><span class="hinfo__ic">' + CC.icon(icon) + "</span><span><small>" + label + "</small><b>" + CC.esc(text) +
        (ext ? '<span class="visually-hidden"> (se abre en una pestaña nueva)</span>' : "") + "</b></span></a>";
    };
    host.innerHTML =
      item(map, "pin", "Visítanos", c.addressShort || c.address, true) +
      item(CC.waLink("Hola, quisiera información."), "chat", "Pide por WhatsApp", c.whatsappDisplay, true) +
      item(CC.base + "menu/menu.html", "utensils", "Nuestra carta", CC.menu.length + " platos, de caldos a postres");
  }

  /* Nuestra cocina: una tarjeta por categoría con icono, precio inicial y platos con sus precios */
  var KITCHEN = {
    caldos: {
      rgb: "232, 121, 58", ink: "var(--cream-white)", tag: "Ollas grandes, caldos calientes y sabor de casa.",
      icon: '<path d="M3 11h18v1a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8v-1z"/><path d="M8 3.5c-1.2 1.4 1.2 2.2 0 3.8M12 3.5c-1.2 1.4 1.2 2.2 0 3.8M16 3.5c-1.2 1.4 1.2 2.2 0 3.8"/>'
    },
    mariscos: {
      rgb: "235, 190, 139", ink: "var(--brown-deep)", tag: "Del mar a la mesa, con sazón dominicana.",
      icon: '<path d="M3 12c2.5-4 6-5.5 10-4.5 2 .5 3.5 2 5 4.5-1.5 2.5-3 4-5 4.5-4 1-7.5-.5-10-4.5z"/><path d="M18 12l3.2-3.2v6.4z"/><circle cx="8.2" cy="11" r=".7" fill="currentColor"/>'
    },
    antojos: {
      rgb: "229, 83, 58", ink: "var(--cream-white)", tag: "Para picar, compartir o pedir otra ronda.",
      icon: '<path d="M12 3c1 3.2 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2.3 1.4 1 2.1 1.8 2.3C10.4 8.6 11 5.6 12 3z"/>'
    }
  };
  function kitchenIcon(key) {
    var k = KITCHEN[key];
    return k ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + k.icon + "</svg>" : CC.icon("utensils");
  }
  function kitchen() {
    var host = document.getElementById("tiles"); if (!host) return;
    var feat = CC.featuredIds || [];
    host.innerHTML = ["caldos", "mariscos", "antojos"].map(function (key) {
      var all = CC.menu.filter(function (m) { return m.category === key; });
      if (!all.length) return "";
      var top = all.filter(function (m) { return feat.indexOf(m.id) > -1; });
      var shown = top.concat(all.filter(function (m) { return feat.indexOf(m.id) < 0; })).slice(0, 4);
      var k = KITCHEN[key], label = CC.categoryLabel(key);
      var min = Math.min.apply(null, all.map(function (m) { return Number(m.price) || 0; }));
      var list = shown.map(function (m) {
        return '<li><span class="kcard__n">' + CC.esc(m.name) + '</span><i class="kcard__dots" aria-hidden="true"></i><b>' + CC.money(m.price) + "</b></li>";
      }).join("");
      return '<a class="kcard reveal" href="../menu/menu.html?cat=' + key + '" aria-labelledby="k-' + key + '" style="--kr:' + k.rgb + ";--ki:" + k.ink + '">' +
        '<span class="kcard__mark" aria-hidden="true">' + kitchenIcon(key) + "</span>" +
        '<div class="kcard__top"><span class="kcard__medal" aria-hidden="true">' + kitchenIcon(key) + "</span>" +
        '<span class="kcard__from"><small>desde</small><b>' + CC.money(min) + "</b></span></div>" +
        '<h3 id="k-' + key + '">' + CC.esc(label) + "</h3>" +
        '<p class="kcard__tag">' + CC.esc(k.tag) + "</p>" +
        '<ul class="kcard__list">' + list + "</ul>" +
        '<span class="kcard__go"><span>' + (all.length > shown.length ? "Ver los " + all.length + " platos" : "Ver categoría") + '</span><span class="kcard__arr" aria-hidden="true">' + CC.icon("arrow") + "</span></span></a>";
    }).join("");
    // Luz que sigue al cursor dentro de cada tarjeta
    host.addEventListener("pointermove", function (e) {
      var c = e.target.closest(".kcard"); if (!c) return;
      var r = c.getBoundingClientRect();
      c.style.setProperty("--mx", (e.clientX - r.left) + "px"); c.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  }

  /* Bienvenido: puntos con iconos, cifras reales de la carta y composición de platos */
  function welcome() {
    var pts = document.getElementById("wel-points"), stats = document.getElementById("wel-stats"), art = document.getElementById("collage");
    if (pts) {
      pts.innerHTML = [
        ["users", "Mesa para compartir", "Calientes, abundantes y pensados para ir al centro."],
        ["utensils", "De caldos a postres", "Caldos, antojos, mariscos, acompañantes, bebidas y postres."],
        ["calendar", "Aparta tu mesa", "Reserva desde la página y llega con tu lugar listo."]
      ].map(function (p) {
        return '<li><span class="wel__ic">' + CC.icon(p[0]) + "</span><div><b>" + p[1] + '</b><span class="t">' + p[2] + "</span></div></li>";
      }).join("");
    }
    if (stats) {
      var cats = []; CC.menu.forEach(function (m) { if (cats.indexOf(m.category) < 0) cats.push(m.category); });
      stats.innerHTML = '<div><b>' + CC.menu.length + "</b><span>platos en la carta</span></div>" +
        "<div><b>" + cats.length + "</b><span>categorías</span></div>" +
        '<div><b class="sm">San Cristóbal</b><span>te esperamos</span></div>';
    }
    if (art) {
      var cls = ["a", "b", "c"];
      art.innerHTML = [3, 9, 16].map(function (id, i) {
        var it = CC.getItem(id); if (!it) return "";
        return '<figure class="wel__ph wel__ph--' + cls[i] + '" style="--art:url(' + CC.base + "assets/images/" + ART[id] + ')"><div class="wel__img"><img src="' + CC.imgSrc(it.image) + '" alt="" loading="lazy" decoding="async" data-fallback></div><figcaption>' + CC.esc(it.name) + "</figcaption></figure>";
      }).join("") + '<div class="wel__badge" aria-hidden="true">' + CC.icon("pin") + "<span>San Cristóbal</span></div>";
      art.addEventListener("error", function (e) {
        if (e.target.tagName !== "IMG") return;
        var f = e.target.closest(".wel__ph"); if (f) f.classList.add("img-missing");
      }, true);
    }
  }

  /* Cierre: iconos en los botones y datos de contacto reales (dirección, WhatsApp, horario) */
  function visit() {
    var host = document.getElementById("visit-info"); if (!host) return;
    document.querySelectorAll(".visit [data-ic]").forEach(function (s) { s.innerHTML = CC.icon(s.getAttribute("data-ic")); });
    var c = CC.config, map = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(c.mapQuery);
    var hours = c.hours && c.hours.length
      ? c.hours.map(function (h) { return CC.esc(h.days) + ": " + CC.esc(h.time); }).join("<br>")
      : "Consulta el horario por WhatsApp";
    var NEW = '<span class="visually-hidden"> (se abre en una pestaña nueva)</span>';
    var arrow = '<span class="visit__go" aria-hidden="true">' + CC.icon("arrow") + "</span>";
    function link(href, icon, label, text) {
      return '<a class="visit__row" href="' + href + '" target="_blank" rel="noopener noreferrer"><span class="visit__ic" aria-hidden="true">' + CC.icon(icon) + "</span><span><small>" + label + "</small><b>" + text + NEW + "</b></span>" + arrow + "</a>";
    }
    host.innerHTML =
      link(map, "pin", "Dónde estamos", CC.esc(c.address)) +
      link(CC.waLink("Hola, quisiera información."), "chat", "Escríbenos por WhatsApp", CC.esc(c.whatsappDisplay)) +
      '<div class="visit__row"><span class="visit__ic" aria-hidden="true">' + CC.icon("clock") + "</span><span><small>Horario</small><b>" + hours + "</b></span><span></span></div>";
  }

  CC.page = function () {
    heroVideo();
    heroStage();
    strip();
    featured();

    kitchen();

    welcome();
    visit();
    CC.reveal();
  };
})(window.CC = window.CC || {});
