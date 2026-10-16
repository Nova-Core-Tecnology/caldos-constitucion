/* Encabezado compartido: se monta en <div id="site-header"> de cada página.
   Franja de datos (escritorio) · barra con selva propia, hojas tras el logo, navegación con indicador que brota ·
   guirnalda colgando del borde inferior · menú móvil a pantalla completa con su propia selva. */
(function (CC) {
  "use strict";
  var NAV = [
    { key: "inicio", label: "Inicio", icon: "home", href: "inicio/inicio.html", hint: "Platos de la casa" },
    { key: "nosotros", label: "Nosotros", icon: "users", href: "nosotros/nosotros.html", hint: "Nuestra historia" },
    { key: "menu", label: "Menú", icon: "utensils", href: "menu/menu.html", hint: "La carta completa" },
    { key: "contacto", label: "Contacto", icon: "phone", href: "contacto/contacto.html", hint: "Escríbenos y visítanos" }
  ];
  var lastCart = null;
  function cur(key) { return document.body.dataset.page === key ? ' aria-current="page"' : ""; }
  function thumb(it) { return '<span class="mini__img"><img src="' + CC.imgSrc(it.image) + '" alt="" loading="lazy" data-fallback></span>'; }
  function leaf(sym, cls, extra) { return '<svg class="' + cls + '" aria-hidden="true" focusable="false"' + (extra || "") + '><use href="#' + sym + '"/></svg>'; }

  function mount() {
    var host = document.getElementById("site-header"); if (!host) return;
    var c = CC.config, b = CC.base;
    var NEW = '<span class="visually-hidden"> (se abre en una pestaña nueva)</span>';
    var soc = c.social.map(function (s) { return '<a href="' + CC.esc(s.url) + '" target="_blank" rel="noopener noreferrer" aria-label="' + CC.esc(s.label) + ' (se abre en una pestaña nueva)">' + CC.icon(s.key) + "</a>"; }).join("");
    var mapUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(c.mapQuery);
    var wa = CC.waLink("Hola, quisiera información.");
    var desk = NAV.map(function (n) { return '<li><a href="' + b + n.href + '"' + cur(n.key) + '><span class="nav__ic">' + CC.icon(n.icon) + "</span><span>" + n.label + "</span></a></li>"; }).join("");
    var links = NAV.map(function (n, i) {
      return '<li style="--i:' + i + '"><a class="mlink" href="' + b + n.href + '"' + cur(n.key) + '><span class="mlink__n">0' + (i + 1) + '</span>' +
        '<span class="mlink__t"><b>' + n.label + "</b><small>" + n.hint + '</small></span><span class="mlink__go">' + CC.icon("arrow") + "</span></a></li>";
    }).join("");

    host.outerHTML =
      '<header class="site-header" id="site-header-el">' +
      /* Franja superior con dirección, WhatsApp y redes (se recoge al bajar) */
      '<div class="hd-strip"><div class="wrap hd-strip__in">' +
      '<a class="hd-strip__addr" href="' + mapUrl + '" target="_blank" rel="noopener noreferrer">' + leaf("v-leaf", "hd-strip__leaf") + "<span>Cocina dominicana · " + CC.esc(c.addressShort || c.address) + "</span>" + NEW + "</a>" +
      '<span class="hd-strip__r"><a class="hd-strip__wa" href="' + wa + '" target="_blank" rel="noopener noreferrer">' + CC.icon("chat") + CC.esc(c.whatsappDisplay) + NEW + '</a><span class="hd-strip__soc">' + soc + "</span></span>" +
      "</div></div>" +
      /* Barra principal */
      '<div class="hd-bar">' +
      '<div class="hd-jungle jg-grow tone-dark" aria-hidden="true">' +
      leaf("v-palm", "jp jp--palm hj-1") + leaf("v-monstera", "jp jp--mon hj-2") + leaf("v-fern", "jp jp--fern hj-3") +
      leaf("v-palm", "jp jp--palm hj-4") + leaf("v-monstera", "jp jp--mon hj-5") + leaf("v-fern", "jp jp--fern hj-6") +
      '<span class="hd-glow"></span></div>' +
      '<div class="wrap site-header__in">' +
      '<a class="brand" href="' + b + 'inicio/inicio.html" aria-label="Caldos Constitución And Restaurant — Inicio">' +
      '<span class="brand__leaves jg-grow tone-vivid" aria-hidden="true">' + leaf("v-palm", "jp jp--palm bl-1") + leaf("v-palm", "jp jp--palm bl-2") + leaf("v-monstera", "jp jp--mon bl-3") + leaf("v-flower", "bl-4") + "</span>" +
      '<img src="' + b + 'assets/logo/logo.png" width="640" height="592" alt="Caldos Constitución And Restaurant — Una experiencia única"></a>' +
      '<nav class="main-nav" aria-label="Principal"><ul class="nav" id="nav">' + desk + '</ul><span class="nav__pill" aria-hidden="true">' +
      leaf("v-leaf", "nav__sprout nav__sprout--a") + leaf("v-leaf", "nav__sprout nav__sprout--b") + "</span></nav>" +
      '<div class="header-actions">' +
      '<div class="hx"><a class="icon-btn" href="' + b + 'favoritos/favoritos.html" aria-label="Favoritos" data-badge="fav"' + cur("favoritos") + ">" + CC.icon("heart") + '<span class="badge" hidden>0</span></a><div class="pop" id="pop-fav"></div></div>' +
      '<div class="hx"><a class="icon-btn" href="' + b + 'carrito/carrito.html" aria-label="Carrito de compras" data-badge="cart"' + cur("carrito") + ">" + CC.icon("cart") + '<span class="badge" hidden>0</span></a><div class="pop" id="pop-cart"></div></div>' +
      '<a class="btn btn--sm btn--reserve" href="' + b + 'reservas/reservas.html"' + cur("reservas") + ">" + CC.icon("calendar") + "<span>Reservar</span></a>" +
      '<button class="icon-btn nav-toggle" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="drawer"><span class="burger" aria-hidden="true"><i></i><i></i><i></i></span></button>' +
      "</div></div>" +
      '<div class="scroll-progress" aria-hidden="true"><span></span></div>' +
      "</div>" +
      /* Guirnalda que cuelga del borde inferior */
      '<span class="vine hd-garland" data-vine="garland" aria-hidden="true"></span>' +
      "</header>" +
      /* Menú móvil a pantalla completa */
      '<div class="mdrawer" id="drawer" role="dialog" aria-modal="true" aria-label="Menú" aria-hidden="true">' +
      '<div class="jg tone-dark mdrawer__jg" aria-hidden="true">' +
      leaf("v-palm", "jp jp--palm md-1") + leaf("v-monstera", "jp jp--mon md-2") + leaf("v-fern", "jp jp--fern md-3") + leaf("v-palm", "jp jp--palm md-4") +
      '<span class="vine md-v1" data-vine="hang" data-len="210" data-flowers="1"></span><span class="vine md-v2" data-vine="hang" data-len="140"></span>' +
      '<span class="md-flies" data-flies="10"></span></div>' +
      '<div class="mdrawer__in">' +
      '<p class="mdrawer__k">Explora</p>' +
      '<ul class="mlinks">' + links + "</ul>" +
      '<div class="mdrawer__row">' +
      '<a class="mpill" href="' + b + 'favoritos/favoritos.html"' + cur("favoritos") + ">" + CC.icon("heart") + 'Favoritos<span class="mpill__n" data-mcount="fav">0</span></a>' +
      '<a class="mpill" href="' + b + 'carrito/carrito.html"' + cur("carrito") + ">" + CC.icon("cart") + 'Carrito<span class="mpill__n" data-mcount="cart">0</span></a></div>' +
      '<a class="btn btn--block btn--cta" href="' + b + 'reservas/reservas.html"' + cur("reservas") + ">" + CC.icon("calendar") + "Reservar mesa</a>" +
      '<div class="mquick"><a href="' + wa + '" target="_blank" rel="noopener noreferrer">' + CC.icon("chat") + "WhatsApp" + NEW + '</a><a href="' + mapUrl + '" target="_blank" rel="noopener noreferrer">' + CC.icon("pin") + "Cómo llegar" + NEW + "</a></div>" +
      '<p class="mdrawer__addr">' + CC.icon("pin") + "<span>" + CC.esc(c.address) + "</span></p>" +
      '<div class="msoc">' + soc + "</div></div></div>" +
      '<div class="drawer-backdrop" id="drawer-backdrop"></div>';
    wire(); navPill(); counters(); popovers(); scrollFx();
    CC.store.onChange(function () { counters(); popovers(); });
  }

  /* Animación del contador sin depender de CSS */
  function bump(el, wiggle) {
    if (!el || !el.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.animate(wiggle
      ? [{ transform: "rotate(0)" }, { transform: "rotate(-14deg)" }, { transform: "rotate(12deg)" }, { transform: "rotate(-6deg)" }, { transform: "rotate(0)" }]
      : [{ transform: "scale(1)" }, { transform: "scale(1.55)" }, { transform: "scale(1)" }],
    { duration: 420, easing: "ease-out" });
  }

  function counters() {
    [["fav", CC.store.favCount()], ["cart", CC.store.cartCount()]].forEach(function (p) {
      var txt = p[1] > 99 ? "99+" : String(p[1]);
      var m = document.querySelector('[data-mcount="' + p[0] + '"]'); if (m) { m.textContent = txt; m.hidden = p[1] === 0; }
      var a = document.querySelector('[data-badge="' + p[0] + '"]'); if (!a) return;
      var b = a.querySelector(".badge"), prev = b.textContent;
      b.textContent = txt; b.hidden = p[1] === 0;
      a.setAttribute("aria-label", (p[0] === "fav" ? "Favoritos" : "Carrito de compras") + (p[1] ? " (" + p[1] + ")" : ""));
      if (prev !== txt && p[1] > 0) { bump(b); bump(a.querySelector("svg"), true); }
      if (p[0] === "cart") {
        // El encabezado se oculta al bajar: lo mostramos al añadir para que se vea el contador
        if (lastCart !== null && p[1] > lastCart) { var h = document.getElementById("site-header-el"); if (h) h.classList.remove("is-hidden"); }
        lastCart = p[1];
      }
    });
  }

  function popovers() {
    var f = document.getElementById("pop-fav"), c = document.getElementById("pop-cart"); if (!f || !c) return;
    var favs = CC.store.favs(), b = CC.base, deco = leaf("v-monstera", "pop__leaf");
    f.innerHTML = deco + '<h3>Tus favoritos</h3>' + (favs.length
      ? "<ul>" + favs.slice(0, 4).map(function (id) { var it = CC.getItem(id); return "<li>" + thumb(it) + "<div><b>" + CC.esc(it.name) + "</b><small>" + CC.esc(CC.categoryLabel(it.category)) + '</small></div><span class="amt">' + CC.money(it.price) + "</span></li>"; }).join("") + "</ul>" +
        (favs.length > 4 ? '<p class="more">y ' + (favs.length - 4) + " más…</p>" : "") + '<div class="acts"><a class="btn btn--outline" href="' + b + 'favoritos/favoritos.html">Ver mis favoritos</a></div>'
      : '<div class="none">' + CC.icon("heart") + 'Aún no tienes favoritos.<br>Toca el corazón en un plato del menú.</div><div class="acts"><a class="btn btn--outline" href="' + b + 'menu/menu.html">Explorar el menú</a></div>');
    var cart = CC.store.cart(), ids = Object.keys(cart);
    c.innerHTML = deco + "<h3>Tu pedido</h3>" + (ids.length
      ? "<ul>" + ids.slice(0, 4).map(function (id) { var it = CC.getItem(id); return "<li>" + thumb(it) + "<div><b>" + CC.esc(it.name) + "</b><small>" + cart[id] + " × " + CC.money(it.price) + '</small></div><span class="amt">' + CC.money(it.price * cart[id]) + "</span></li>"; }).join("") + "</ul>" +
        (ids.length > 4 ? '<p class="more">y ' + (ids.length - 4) + " platos más…</p>" : "") +
        '<div class="tot"><span>Total estimado</span><span>' + CC.money(CC.store.total()) + '</span></div><div class="acts"><a class="btn" href="' + b + 'carrito/carrito.html">Ver carrito</a>' +
        '<a class="btn btn--outline" href="' + CC.waLink(CC.orderMessage()) + '" target="_blank" rel="noopener noreferrer">Pedir por WhatsApp</a></div>'
      : '<div class="none">' + CC.icon("cart") + 'Tu carrito está vacío.</div><div class="acts"><a class="btn btn--outline" href="' + b + 'menu/menu.html">Ver el menú</a></div>');
  }

  /* Encogimiento, franja que se recoge, barra de progreso y ocultar al bajar / mostrar al subir (todas las pantallas) */
  function scrollFx() {
    var h = document.getElementById("site-header-el"), bar = h.querySelector(".scroll-progress span"), last = window.scrollY, ticking = false;
    function update() {
      var y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
      h.classList.toggle("is-scrolled", y > 24);
      bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
      var open = document.getElementById("drawer").classList.contains("is-open");
      var popOpen = !!h.querySelector(".hx:hover"); // no ocultar mientras se ve el popover de favoritos/carrito
      if (!open && !popOpen && !h.contains(document.activeElement)) {
        if (y > last + 8 && y > 240) h.classList.add("is-hidden"); else if (y < last - 8 || y <= 240) h.classList.remove("is-hidden");
      } else h.classList.remove("is-hidden");
      last = y; ticking = false;
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    h.addEventListener("focusin", function () { h.classList.remove("is-hidden"); });
    update();
  }

  /* Indicador que se desliza hacia el enlace activo o bajo el cursor/teclado; lleva dos hojitas que brotan */
  function navPill() {
    var nav = document.querySelector("nav.main-nav"); if (!nav) return;
    var pill = nav.querySelector(".nav__pill"), links = Array.prototype.slice.call(nav.querySelectorAll(".nav a"));
    var active = nav.querySelector('.nav a[aria-current="page"]');
    function put(a) {
      if (!a || !a.offsetWidth) { pill.style.opacity = "0"; return; }
      pill.style.width = a.offsetWidth + "px"; pill.style.height = a.offsetHeight + "px";
      pill.style.transform = "translate(" + a.offsetLeft + "px," + a.offsetTop + "px)"; pill.style.opacity = "1";
      pill.classList.toggle("is-home", a === active);
      pill.classList.remove("is-sprout"); void pill.offsetWidth; pill.classList.add("is-sprout");
    }
    function rest() { put(active); }
    links.forEach(function (a) {
      a.addEventListener("mouseenter", function () { put(a); });
      a.addEventListener("focus", function () { put(a); });
      a.addEventListener("blur", rest);
    });
    nav.addEventListener("mouseleave", rest);
    window.addEventListener("resize", rest);
    window.addEventListener("load", rest);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(rest);
    pill.style.transition = "none"; rest();
    requestAnimationFrame(function () { requestAnimationFrame(function () { pill.style.transition = ""; }); });
  }

  function wire() {
    var panel = document.getElementById("drawer"), back = document.getElementById("drawer-backdrop");
    var toggle = document.querySelector(".nav-toggle"), main = document.getElementById("main"), foot = document.querySelector(".site-footer");
    function setInert(on) { [main, foot].forEach(function (el) { if (!el) return; if (on) el.setAttribute("inert", ""); else el.removeAttribute("inert"); }); }
    function open() {
      panel.classList.add("is-open"); back.classList.add("is-open"); panel.setAttribute("aria-hidden", "false");
      document.documentElement.classList.add("drawer-open");
      toggle.setAttribute("aria-expanded", "true"); toggle.setAttribute("aria-label", "Cerrar menú"); document.body.style.overflow = "hidden"; setInert(true);
      panel.querySelectorAll(".jg, .vine, [data-flies]").forEach(function (n) { n.classList.add("is-in"); n.classList.remove("is-off"); });
      var first = panel.querySelector("a"); if (first) first.focus({ preventScroll: true });
    }
    function close(refocus) {
      panel.classList.remove("is-open"); back.classList.remove("is-open"); panel.setAttribute("aria-hidden", "true");
      document.documentElement.classList.remove("drawer-open");
      toggle.setAttribute("aria-expanded", "false"); toggle.setAttribute("aria-label", "Abrir menú"); document.body.style.overflow = ""; setInert(false);
      if (refocus !== false) toggle.focus();
    }
    toggle.addEventListener("click", function () { if (panel.classList.contains("is-open")) close(); else open(); });
    back.addEventListener("click", function () { close(); });
    panel.addEventListener("click", function (e) { if (e.target.closest("a[href]")) close(false); });
    document.addEventListener("keydown", function (e) {
      if (!panel.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        var f = [toggle].concat(Array.prototype.slice.call(panel.querySelectorAll("a[href]"))), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.matchMedia("(min-width: 961px)").addEventListener("change", function (m) { if (m.matches && panel.classList.contains("is-open")) close(false); });
  }
  CC.mountHeader = mount;
})(window.CC = window.CC || {});
