/* Utilidades de interfaz compartidas: formato, iconos, toasts, reveal, WhatsApp, tarjetas y modal de plato. */
(function (CC) {
  "use strict";
  var ICONS = {
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
    cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
    menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    home: '<path d="M3 11.5L12 4l9 7.5"/><path d="M5.5 10v9.5a.5.5 0 0 0 .5.5h4v-5.5h4V20h4a.5.5 0 0 0 .5-.5V10"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    play: '<path d="M7 4.5v15l12-7.5z"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17.5 14c2.7 0 4 1.8 4 4.5"/>',
    utensils: '<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10"/><path d="M17.5 21V3c-2.4 1.4-3.6 4-3.6 7 0 2.7 1.2 4 3.6 4"/>',
    pin: '<path d="M12 21s7-6.3 7-12a7 7 0 0 0-14 0c0 5.7 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    phone: '<path d="M5 4h4l1.5 5-2 1.5a11 11 0 0 0 5 5l1.5-2 5 1.5v4a2 2 0 0 1-2 2C10.6 21 3 13.4 3 6a2 2 0 0 1 2-2z"/>',
    mail: '<path d="M3 6h18v12H3z"/><path d="M3 6l9 7 9-7"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.7 7.1L3 21l1.9-6.3A8 8 0 1 1 21 12z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 3v3M16 3v3"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".8" fill="currentColor"/>',
    facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8.5A.5.5 0 0 1 14 8z"/>',
    tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.3 2.6 2 4.4 5 4.6"/>',
    pot: '<path d="M4 10h16v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M2 10h2M20 10h2M9 6c0-1.5 1.5-1.5 1.5-3M14 6c0-1.5 1.5-1.5 1.5-3"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8L3.5 9.7l5.9-.9z" fill="currentColor"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="M9 5l7 7-7 7"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    alert: '<path d="M12 3.5L2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.3"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5M4 20h16"/>',
    upload: '<path d="M12 16V5M7 9.5l5-5 5 5M4 20h16"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
    table: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M9 10v9M15 10v9"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4"/>',
    filter: '<path d="M3 5h18l-7 8.5V19l-4 2v-7.5z"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    party: '<path d="M4 20l5-13 8 8z"/><path d="M14 4c.5 1.5 0 3-1.5 3.5M19 8c-1.5 0-2.5 1-2.5 2.5M17 3l.5 1.5M21 5l-1.5.5"/>'
  };
  CC.icon = function (name, label) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
      (label ? 'role="img" aria-label="' + label + '"' : 'aria-hidden="true" focusable="false"') + '>' + (ICONS[name] || "") + '</svg>';
  };
  /* Pinta los íconos declarados en el HTML con data-ic="nombre" */
  CC.icons = function (root) {
    (root || document).querySelectorAll("[data-ic]:empty").forEach(function (el) { el.innerHTML = CC.icon(el.getAttribute("data-ic")); });
  };
  /* Registra un error sin datos sensibles (colección errorLog, visible en el panel). Nunca rompe la página. */
  CC.logError = function (where, e) {
    try {
      if (!CC.auth || !CC.auth.configured) return;
      var code = String((e && (e.code || e.name)) || "").slice(0, 80), msg = String((e && e.message) || e || "").replace(/\S+@\S+/g, "[correo]").slice(0, 500);
      CC.auth.fire().then(function (f) {
        var u = f.auth.currentUser;
        return f.db.collection("errorLog").add({ at: f.fb.firestore.FieldValue.serverTimestamp(), where: String(where).slice(0, 80), code: code, message: msg, page: location.pathname.slice(-200), uid: u ? u.uid : "" });
      }).catch(function () {});
    } catch (x) {}
  };
  CC.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  CC.money = function (n) { return CC.config.currency + Number(n).toLocaleString("es-DO"); };
  CC.base = (function () {
    // Todas las páginas viven a un nivel de profundidad (carpeta/pagina.html)
    return "../";
  })();
  /* Se sirve la versión ligera .webp (máx. 1000 px) generada a partir de la foto original con el mismo nombre */
  CC.imgSrc = function (file) {
    /* Foto subida desde el Panel Administrativo (guardada en la base de datos) */
    if (/^fs:/.test(file || "") && CC.photoSrc) return CC.photoSrc(file);
    return CC.base + "assets/images/menu/" + encodeURIComponent(String(file || "").replace(/\.(jpe?g|png|jfif)$/i, ".webp"));
  };

  CC.toast = function (msg, type) {
    var host = document.getElementById("toast-host");
    if (!host) {
      host = document.createElement("div"); host.id = "toast-host"; host.className = "toast-host";
      host.setAttribute("role", "status"); host.setAttribute("aria-live", "polite"); document.body.appendChild(host);
    }
    while (host.children.length >= 3) host.removeChild(host.firstChild);
    var t = document.createElement("div"); t.className = "toast" + (type === "error" ? " toast--error" : ""); t.textContent = msg;
    host.appendChild(t); setTimeout(function () { t.remove(); }, 3200);
  };

  /* Texto del pedido para WhatsApp (carrito y minicarrito del encabezado) */
  CC.orderMessage = function () {
    var cart = CC.store.cart();
    var lines = Object.keys(cart).map(function (id) { var it = CC.getItem(id); return "• " + cart[id] + " x " + it.name + " — " + CC.money(it.price * cart[id]); });
    return "Hola, quisiera hacer este pedido en Caldos Constitución:\n" + lines.join("\n") + "\nTotal estimado: " + CC.money(CC.store.total()) + "\nPor favor confirmen disponibilidad, precio final y entrega. Gracias.";
  };

  CC.waLink = function (text) {
    return "https://wa.me/" + CC.config.whatsapp + "?text=" + encodeURIComponent(text);
  };

  CC.reveal = function (root) {
    var items = (root || document).querySelectorAll(".reveal:not(.is-visible)");
    if (typeof window.IntersectionObserver !== "function") { items.forEach(function (i) { i.classList.add("is-visible"); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    items.forEach(function (i) { io.observe(i); });
  };

  /* Imagen con respaldo de marca si el archivo aún no existe en assets/images/menu */
  document.addEventListener("error", function (e) {
    var t = e.target;
    if (t && t.tagName === "IMG" && t.closest && t.dataset.fallback !== undefined) {
      var box = t.closest(".dish__media, .modal__media, .line__img, .mini__img, .collage__item"); if (box) box.classList.add("img-missing");
    }
  }, true);

  /* Punto animado desde el botón pulsado hasta el icono del carrito */
  CC.flyToCart = function (from) {
    try {
      if (!from || !from.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      var r = from.getBoundingClientRect(); if (!r.width) return;
      var tg = document.querySelector('[data-badge="cart"]'), t = tg ? tg.getBoundingClientRect() : null, x1, y1;
      if (t && t.width && t.bottom > 0) { x1 = t.left + t.width / 2; y1 = t.top + t.height / 2; }
      else { x1 = window.innerWidth - 40; y1 = 24; }
      var x0 = r.left + r.width / 2, y0 = r.top + r.height / 2, mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 80;
      var dot = document.createElement("span"); dot.className = "fly-dot"; document.body.appendChild(dot);
      var a = dot.animate([
        { transform: "translate(" + (x0 - 9) + "px," + (y0 - 9) + "px) scale(1)", opacity: 1 },
        { transform: "translate(" + (mx - 9) + "px," + (my - 9) + "px) scale(1.15)", opacity: 1, offset: 0.5 },
        { transform: "translate(" + (x1 - 9) + "px," + (y1 - 9) + "px) scale(.3)", opacity: 0.5 }
      ], { duration: 650, easing: "cubic-bezier(.45,.05,.55,.95)" });
      a.onfinish = function () { dot.remove(); };
    } catch (e) { /* noop */ }
  };

  /* Zona de compra de la tarjeta: botón "Añadir" o selector de cantidad si ya está en el carrito */
  function buyHTML(it) {
    var q = CC.store.qty(it.id), n = CC.esc(it.name);
    if (it.soldOut) return '<span class="btn btn--sm btn--sold" aria-label="' + n + ' está agotado por hoy">Agotado</span>';
    if (q > 0) {
      return '<div class="stepper" role="group" aria-label="Cantidad de ' + n + ' en el carrito">' +
        '<button type="button" data-action="dec" aria-label="Quitar una unidad de ' + n + '">' + CC.icon("minus") + "</button>" +
        '<span class="stepper__n">' + q + "</span>" +
        '<button type="button" data-action="inc" aria-label="Añadir una unidad más de ' + n + '">' + CC.icon("plus") + "</button></div>";
    }
    return '<button class="btn btn--sm btn--add" type="button" data-action="add">' + CC.icon("plus") + "Añadir</button>";
  }

  /* Color por categoría (mismo tono que en Inicio, Nosotros y Menú) */
  var CAT_RGB = { caldos: "232, 121, 58", mariscos: "196, 140, 80", antojos: "229, 83, 58", bebidas: "230, 160, 10", postres: "214, 108, 90", "acompañantes": "176, 130, 70", entrantes: "200, 110, 60" };
  function rgb(cat) { return CAT_RGB[cat] || "232, 121, 58"; }
  function isFeatured(id) { return (CC.featuredIds || []).indexOf(Number(id)) !== -1; }
  function ingTeaser(it) {
    var a = it.ingredients || []; if (!a.length) return "";
    return '<p class="dish__ings">' + a.slice(0, 3).map(CC.esc).join(" · ") + (a.length > 3 ? ' <b>+' + (a.length - 3) + "</b>" : "") + "</p>";
  }

  /* Tarjeta de plato (Inicio, Menú, Favoritos) */
  CC.dishCard = function (it) {
    var fav = CC.store.isFav(it.id), q = CC.store.qty(it.id), n = CC.esc(it.name);
    var price = it.priceNote ? '<span class="price"><small>desde</small>' + CC.money(it.price) + "</span>" : '<span class="price">' + CC.money(it.price) + "</span>";
    return '<article class="dish reveal' + (q > 0 ? " in-cart" : "") + (it.soldOut ? " is-sold" : "") + '" data-id="' + it.id + '" style="--kr:' + rgb(it.category) + '">' +
      '<div class="dish__top">' +
      '<button class="dish__media" type="button" data-action="details" aria-label="Ver detalles de ' + n + '">' +
      '<img class="dish__img" src="' + CC.imgSrc(it.image) + '" alt="' + n + '" loading="lazy" decoding="async" data-fallback></button>' +
      (isFeatured(it.id) ? '<span class="dish__star">' + CC.icon("star") + "Favorito de la casa</span>" : "") +
      '<span class="dish__incart" title="En tu carrito" aria-hidden="true">' + CC.icon("check") + "</span>" +
      '<button class="dish__fav" type="button" data-action="fav" aria-pressed="' + fav + '" aria-label="' + (fav ? "Quitar " : "Añadir ") + n + (fav ? " de favoritos" : " a favoritos") + '">' + CC.icon("heart") + "</button></div>" +
      '<div class="dish__body">' +
      '<span class="dish__cat">' + CC.esc(CC.categoryLabel(it.category)) + "</span>" +
      '<h3 class="dish__name"><button type="button" data-action="details">' + n + "</button></h3>" +
      '<p class="dish__desc">' + CC.esc(it.description) + "</p>" + ingTeaser(it) +
      '<div class="dish__foot">' + price + '<div class="dish__buy" data-q="' + q + '">' + buyHTML(it) + "</div></div></div></article>";
  };

  /* Delegación de eventos para cualquier contenedor con tarjetas */
  CC.bindDishes = function (container) {
    container.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action]"); if (!btn) return;
      var card = btn.closest("[data-id]"); if (!card) return;
      var id = Number(card.dataset.id), it = CC.getItem(id); if (!it) return;
      var a = btn.dataset.action;
      if (a === "fav") {
        var on = CC.store.toggleFav(id);
        CC.toast(on ? it.name + " añadido a favoritos" : it.name + " quitado de favoritos");
      } else if ((a === "add" || a === "inc") && it.soldOut) {
        CC.toast(it.name + " está agotado por hoy.", "error");
      } else if (a === "add" || a === "inc") {
        CC.flyToCart(btn); CC.store.add(id, 1);
        CC.toast(it.name + " añadido · " + CC.store.qty(id) + " en tu carrito");
      } else if (a === "dec") {
        CC.store.setQty(id, CC.store.qty(id) - 1);
      } else if (a === "details") { CC.openDish(id, btn); }
    });
  };

  /* Modal de ficha de plato */
  var lastFocus = null, modalId = null, modalQty = 1;
  var PAIR = { caldos: ["acompañantes", "bebidas"], mariscos: ["acompañantes", "bebidas"], antojos: ["bebidas", "acompañantes"], entrantes: ["bebidas"], "acompañantes": ["caldos", "bebidas"], bebidas: ["antojos", "postres"], postres: ["bebidas"] };

  /* Platos que combinan: de las categorías complementarias, primero los favoritos de la casa */
  function pairs(it) {
    var lists = (PAIR[it.category] || []).map(function (cat) {
      return CC.menu.filter(function (m) { return m.category === cat && m.id !== it.id; })
        .sort(function (a, b) { return (isFeatured(b.id) ? 1 : 0) - (isFeatured(a.id) ? 1 : 0); });
    });
    var out = [], i = 0, guard = 0;
    while (out.length < 3 && guard++ < 12) {
      var l = lists[i % (lists.length || 1)]; if (l && l.length) out.push(l.shift()); i++;
    }
    return out;
  }
  function allergenList(s) {
    if (!s || /^ninguno/i.test(s)) return [];
    return s.replace(/^contiene\s+/i, "").split(/,\s*|\s+y\s+/).map(function (x) { x = x.trim(); return x.charAt(0).toUpperCase() + x.slice(1); }).filter(Boolean);
  }
  function siblings(it) { return CC.menu.filter(function (m) { return m.category === it.category; }); }

  function ensureModal() {
    var m = document.getElementById("dish-modal"); if (m) return m;
    m = document.createElement("div"); m.id = "dish-modal"; m.className = "modal";
    m.innerHTML = '<div class="modal__card" role="dialog" aria-modal="true" aria-labelledby="dm-title">' +
      '<button class="modal__close" type="button" aria-label="Cerrar">' + CC.icon("close") + "</button>" +
      '<div class="modal__media" id="dm-media"></div><div class="modal__body" id="dm-body"></div></div>';
    document.body.appendChild(m);
    m.addEventListener("click", function (e) {
      if (e.target === m || e.target.closest(".modal__close")) { CC.closeDish(); return; }
      var nav = e.target.closest("[data-nav]"); if (nav) { CC.openDish(Number(nav.dataset.go), null, nav.dataset.nav); return; }
      var go = e.target.closest("[data-go]"); if (go) CC.openDish(Number(go.dataset.go), null, "pair");
    });
    var sx = null;
    m.addEventListener("touchstart", function (e) { sx = e.target.closest(".modal__media") ? e.touches[0].clientX : null; }, { passive: true });
    m.addEventListener("touchend", function (e) {
      if (sx == null) return;
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) < 60) return;
      var nb = m.querySelector('[data-nav="' + (dx < 0 ? "next" : "prev") + '"]'); if (nb) nb.click();
    }, { passive: true });
    document.addEventListener("keydown", function (e) {
      if (!m.classList.contains("is-open")) return;
      if (e.key === "Escape") CC.closeDish();
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        var b = m.querySelector('[data-nav="' + (e.key === "ArrowRight" ? "next" : "prev") + '"]'); if (b) { e.preventDefault(); b.click(); }
      }
      if (e.key === "Tab") {
        var f = m.querySelectorAll("button, a[href]"); if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    return m;
  }
  function paintModalBuy() {
    var m = document.getElementById("dish-modal"), it = CC.getItem(modalId);
    if (!m || !it || !m.classList.contains("is-open")) return;
    var q = CC.store.qty(modalId), fav = CC.store.isFav(modalId);
    m.querySelector("#dm-q").textContent = modalQty;
    m.querySelector("#dm-add-label").textContent = "Añadir · " + CC.money(it.price * modalQty);
    m.querySelector("#dm-incart").innerHTML = q > 0 ? CC.icon("check") + "Ya tienes " + q + (q === 1 ? " unidad" : " unidades") + " en tu carrito" : "";
    var f = m.querySelector("#dm-fav");
    f.setAttribute("aria-pressed", fav);
    f.setAttribute("aria-label", fav ? "Quitar " + it.name + " de favoritos" : "Añadir " + it.name + " a favoritos");
  }

  /* how: undefined = apertura nueva; "prev" | "next" | "pair" = cambio de plato con el modal ya abierto */
  CC.openDish = function (id, trigger, how) {
    var it = CC.getItem(id); if (!it) return;
    var m = ensureModal(), swap = !!how && m.classList.contains("is-open");
    if (!swap) lastFocus = trigger || document.activeElement;
    modalId = it.id; modalQty = 1;
    var n = CC.esc(it.name), label = CC.esc(CC.categoryLabel(it.category));
    var card = m.querySelector(".modal__card"); card.style.setProperty("--kr", rgb(it.category));

    /* Lado de la foto: insignias y navegación entre platos de la misma categoría */
    var sib = siblings(it), idx = sib.indexOf(it), prev = sib[(idx - 1 + sib.length) % sib.length], next = sib[(idx + 1) % sib.length];
    var media = m.querySelector("#dm-media"); media.classList.remove("img-missing");
    media.innerHTML = '<div class="modal__arch"><img src="' + CC.imgSrc(it.image) + '" alt="' + n + '" data-fallback></div>' +
      (isFeatured(it.id) ? '<div class="modal__badges"><span class="dish__star">' + CC.icon("star") + "Favorito de la casa</span></div>" : "") +
      '<div class="modal__seal" aria-hidden="true">' + (it.priceNote ? "<small>desde</small>" : "") + "<b>" + CC.money(it.price) + "</b></div>" +
      (sib.length > 1
        ? '<div class="modal__nav"><button type="button" data-nav="prev" data-go="' + prev.id + '" aria-label="Plato anterior: ' + CC.esc(prev.name) + '">' + CC.icon("left") + "</button>" +
          '<span class="modal__pos"><b>' + (idx + 1) + "</b> de " + sib.length + " · " + label + "</span>" +
          '<button type="button" data-nav="next" data-go="' + next.id + '" aria-label="Plato siguiente: ' + CC.esc(next.name) + '">' + CC.icon("right") + "</button></div>"
        : "");

    /* Alérgenos como etiquetas; si no hay ninguno declarado se dice con claridad */
    var al = allergenList(it.allergens);
    var allergen = it.allergens
      ? (al.length
        ? '<div class="modal__allergen">' + CC.icon("shield") + '<div><strong>Alérgenos</strong><ul class="modal__tags">' + al.map(function (x) { return "<li>" + CC.esc(x) + "</li>"; }).join("") + '</ul><span>Consulta al personal antes de pedir.</span></div></div>'
        : '<div class="modal__allergen is-clear">' + CC.icon("check") + "<div><strong>Sin alérgenos declarados</strong><span>Si tienes alguna alergia, consulta al personal antes de pedir.</span></div></div>")
      : "";

    var pr = pairs(it);
    var pairHTML = pr.length
      ? '<h3 class="modal__h">Va muy bien con</h3><div class="modal__pair">' + pr.map(function (p) {
        return '<button type="button" class="pair" data-go="' + p.id + '" style="--kr:' + rgb(p.category) + '" aria-label="Ver ' + CC.esc(p.name) + '">' +
          '<span class="pair__img"><img src="' + CC.imgSrc(p.image) + '" alt="" loading="lazy" decoding="async" data-fallback></span>' +
          '<span class="pair__t"><b>' + CC.esc(p.name) + "</b><small>" + (p.priceNote ? "desde " : "") + CC.money(p.price) + "</small></span></button>";
      }).join("") + "</div>"
      : "";

    var wa = CC.waLink("Hola, quisiera preguntar por «" + it.name + "» (" + CC.money(it.price) + ").");
    var body = m.querySelector("#dm-body");
    body.innerHTML =
      '<span class="modal__eyebrow">' + label + "</span>" +
      '<h2 id="dm-title" class="modal__title" tabindex="-1">' + n + "</h2>" +
      '<p class="visually-hidden">Precio: ' + (it.priceNote ? "desde " : "") + CC.money(it.price) + "</p>" +
      (it.priceNote ? '<p class="modal__note">' + CC.icon("tag") + "<span>" + CC.esc(it.priceNote) + "</span></p>" : "") +
      '<p class="modal__desc">' + CC.esc(it.longDescription || it.description) + "</p>" +
      (it.ingredients && it.ingredients.length ? '<h3 class="modal__h">Ingredientes</h3><ul class="modal__chips">' + it.ingredients.map(function (x) { return "<li>" + CC.esc(x) + "</li>"; }).join("") + "</ul>" : "") +
      allergen + pairHTML +
      '<div class="modal__buy">' +
      '<div class="modal__buyrow"><div class="stepper stepper--lg" role="group" aria-label="Cantidad a añadir">' +
      '<button type="button" id="dm-minus" aria-label="Menos">' + CC.icon("minus") + "</button>" +
      '<span class="stepper__n" id="dm-q" aria-live="polite">1</span>' +
      '<button type="button" id="dm-plus" aria-label="Más">' + CC.icon("plus") + "</button></div>" +
      '<button class="btn" type="button" id="dm-add">' + CC.icon("cart") + '<span id="dm-add-label"></span></button>' +
      '<button class="modal__fav" type="button" id="dm-fav" aria-pressed="false">' + CC.icon("heart") + "</button></div>" +
      '<div class="modal__sub"><p class="modal__incart" id="dm-incart" aria-live="polite"></p>' +
      '<a class="modal__wa" href="' + wa + '" target="_blank" rel="noopener noreferrer">' + CC.icon("chat") + "Preguntar por este plato<span class=\"visually-hidden\"> (se abre en una pestaña nueva)</span></a></div></div>";

    m.querySelector("#dm-minus").onclick = function () { if (modalQty > 1) { modalQty--; paintModalBuy(); } };
    m.querySelector("#dm-plus").onclick = function () { if (modalQty < 99) { modalQty++; paintModalBuy(); } };
    m.querySelector("#dm-add").onclick = function () {
      CC.flyToCart(this); CC.store.add(id, modalQty);
      CC.toast(modalQty + " × " + it.name + " añadido · " + CC.store.qty(id) + " en tu carrito");
      modalQty = 1; paintModalBuy();
    };
    m.querySelector("#dm-fav").onclick = function () { CC.store.toggleFav(id); };

    m.classList.add("is-open"); document.body.style.overflow = "hidden";
    body.scrollTop = 0; card.scrollTop = 0;
    /* Pequeña animación al cambiar de plato sin cerrar */
    card.classList.remove("is-swap"); if (swap) { void card.offsetWidth; card.classList.add("is-swap"); }
    paintModalBuy();
    if (!swap) m.querySelector(".modal__close").focus();
    else {
      var again = how === "pair" ? null : m.querySelector('[data-nav="' + how + '"]');
      (again || m.querySelector("#dm-title")).focus({ preventScroll: true });
    }
  };
  CC.closeDish = function () {
    var m = document.getElementById("dish-modal"); if (!m) return;
    m.classList.remove("is-open"); document.body.style.overflow = ""; modalId = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };

  /* Mantiene favoritos y cantidades de las tarjetas ya pintadas (y del modal abierto) */
  CC.store.onChange(function () {
    document.querySelectorAll(".dish[data-id]").forEach(function (c) {
      var it = CC.getItem(c.dataset.id); if (!it) return;
      var b = c.querySelector(".dish__fav");
      if (b) {
        var on = CC.store.isFav(it.id);
        b.setAttribute("aria-pressed", on);
        b.setAttribute("aria-label", (on ? "Quitar " : "Añadir ") + it.name + (on ? " de favoritos" : " a favoritos"));
      }
      var host = c.querySelector(".dish__buy"); if (!host) return;
      var q = CC.store.qty(it.id), had = Number(host.dataset.q);
      c.classList.toggle("in-cart", q > 0);
      if (had === q) return;
      var act = host.contains(document.activeElement) ? document.activeElement.dataset.action : null;
      host.innerHTML = buyHTML(it); host.dataset.q = q;
      var num = host.querySelector(".stepper__n"); if (num) num.classList.add("is-bump");
      if (act) {
        var next = q > 0 ? (act === "add" ? "inc" : act) : "add", nb = host.querySelector('[data-action="' + next + '"]');
        if (nb) nb.focus();
      }
    });
    paintModalBuy();
  });
})(window.CC = window.CC || {});
