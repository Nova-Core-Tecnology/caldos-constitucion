/* Pie de página compartido: se monta en <div id="site-footer"> de cada página.
   Dosel de selva que brota del borde superior · enredaderas y luciérnagas · llamada grande a reservar ·
   columnas de datos y platos más pedidos · gran rótulo de la casa. */
(function (CC) {
  "use strict";
  function copy(text) {
    var done = function () { CC.toast("Dirección copiada"); }, fail = function () { CC.toast("No se pudo copiar la dirección.", "error"); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fail); else fail();
  }
  function jp(kind, cls) {
    var sym = { mon: "v-monstera", palm: "v-palm", fern: "v-fern" }[kind];
    return '<svg class="jp jp--' + kind + " " + cls + '" aria-hidden="true" focusable="false"><use href="#' + sym + '"/></svg>';
  }

  CC.mountFooter = function () {
    var host = document.getElementById("site-footer"); if (!host) return;
    var c = CC.config, b = CC.base;
    var NEW = '<span class="visually-hidden"> (se abre en una pestaña nueva)</span>';
    var mapUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(c.mapQuery);
    var wa = CC.waLink("Hola, quisiera información.");
    var nav = function (href, icon, label) { return '<li><a href="' + b + href + '"><span class="fnav__ic">' + CC.icon(icon) + "</span><span>" + label + "</span></a></li>"; };
    var social = c.social.map(function (s) {
      return '<a class="fsoc" href="' + CC.esc(s.url) + '" target="_blank" rel="noopener noreferrer" aria-label="' + CC.esc(s.label) + ' (se abre en una pestaña nueva)">' + CC.icon(s.key) + "</a>";
    }).join("");
    var hours = c.hours && c.hours.length
      ? c.hours.map(function (h) { return CC.esc(h.days) + ": " + CC.esc(h.time); }).join("<br>")
      : "Consulta el horario por WhatsApp";
    var row = function (icon, label, inner) { return '<li class="frow"><span class="frow__ic">' + CC.icon(icon) + '</span><div><small>' + label + "</small>" + inner + "</div></li>"; };

    /* Platos más pedidos (favoritos de la casa reales de la carta) */
    var top = (CC.featuredIds || []).map(function (id) { return CC.getItem(id); }).filter(Boolean).slice(0, 3);
    var dishes = top.length ? '<ul class="fdish">' + top.map(function (it) {
      return '<li><a href="' + b + "menu/menu.html?cat=" + encodeURIComponent(it.category) + '"><span class="fdish__img"><img src="' + CC.imgSrc(it.image) + '" alt="" loading="lazy" decoding="async" data-fallback></span>' +
        "<span class=\"fdish__t\"><b>" + CC.esc(it.name) + "</b><small>" + CC.esc(CC.categoryLabel(it.category)) + '</small></span><span class="fdish__p">' + (it.priceNote ? "desde " : "") + CC.money(it.price) + "</span></a></li>";
    }).join("") + "</ul>" : "";

    /* Dosel: tres capas de plantas con la base en el borde superior del pie */
    var canopy =
      '<div class="ft-canopy jg-grow" aria-hidden="true">' +
      '<div class="ftc ftc--far">' + jp("palm", "fc-1") + jp("mon", "fc-2") + jp("palm", "fc-3") + jp("mon", "fc-4") + jp("fern", "fc-5") + jp("fern", "fc-6") + "</div>" +
      '<div class="ftc ftc--mid">' + jp("mon", "fc-7") + jp("fern", "fc-8") + jp("palm", "fc-9") + jp("mon", "fc-10") + jp("fern", "fc-11") + jp("fern", "fc-12") + jp("fern", "fc-13") + "</div>" +
      '<div class="ftc ftc--near">' + jp("fern", "fc-14") + jp("mon", "fc-15") + jp("fern", "fc-16") + jp("mon", "fc-17") + "</div>" +
      '<div class="ft-hedge"></div></div>';

    host.outerHTML =
      '<footer class="site-footer">' + canopy +
      '<div class="ft-jungle jg tone-dark" aria-hidden="true">' +
      '<span class="vine jz-v-l1" data-vine="hang" data-len="260" data-flowers="1"></span><span class="vine jz-v-l2" data-vine="hang" data-len="170"></span>' +
      '<span class="vine jz-v-r1" data-vine="hang" data-len="300" data-flowers="1"></span><span class="vine jz-v-r2" data-vine="hang" data-len="190"></span>' +
      jp("mon", "fj-1") + jp("palm", "fj-2") + jp("fern", "fj-3") +
      '<span class="ft-flies" data-flies="22"></span><span class="ft-glow"></span></div>' +
      '<div class="wrap ft-in">' +
      /* Llamada principal */
      '<section class="ft-cta" aria-labelledby="fh-cta">' +
      '<div class="ft-cta__tx"><span class="ft-k">Te esperamos en San Cristóbal</span><h2 id="fh-cta">La mesa está <em>servida.</em></h2>' +
      "<p>Reserva tu mesa, pide por WhatsApp o ven directo. Caldos calientes, mariscos y antojos para compartir.</p></div>" +
      '<div class="ft-cta__btns"><a class="btn btn--cta ft-btn" href="' + b + 'reservas/reservas.html">' + CC.icon("calendar") + "Reservar mesa</a>" +
      '<a class="btn btn--gold ft-btn" href="' + b + 'menu/menu.html">' + CC.icon("utensils") + "Ver el menú</a>" +
      '<a class="btn btn--ghost ft-btn" href="' + wa + '" target="_blank" rel="noopener noreferrer">' + CC.icon("chat") + "WhatsApp" + NEW + "</a></div></section>" +
      /* Columnas */
      '<div class="fgrid">' +
      '<section class="fcol fcol--brand" aria-label="Caldos Constitución And Restaurant"><a class="fbrand" href="' + b + 'inicio/inicio.html" aria-label="Caldos Constitución And Restaurant — Inicio">' +
      '<span class="fbrand__leaves jg-grow tone-vivid" aria-hidden="true">' + jp("palm", "fb-1") + jp("palm", "fb-2") + jp("mon", "fb-3") + "</span>" +
      '<img src="' + b + 'assets/logo/logo.png" width="640" height="592" alt="Caldos Constitución And Restaurant" loading="lazy"></a>' +
      "<p>Caldos con sazón dominicana, servidos entre el verde de San Cristóbal, la cuna de la Constitución.</p><div class=\"fsocials\">" + social + "</div></section>" +
      '<nav class="fcol" aria-labelledby="fh-ex"><h3 id="fh-ex">Explora</h3><ul class="fnav">' +
      nav("inicio/inicio.html", "home", "Inicio") + nav("nosotros/nosotros.html", "users", "Nosotros") + nav("menu/menu.html", "utensils", "Menú") +
      nav("contacto/contacto.html", "phone", "Contacto") + nav("reservas/reservas.html", "calendar", "Reservas") + nav("eventos/eventos.html", "party", "Eventos") + nav("favoritos/favoritos.html", "heart", "Favoritos") + nav("carrito/carrito.html", "cart", "Carrito") + nav("cuenta/cuenta.html", "users", "Mi cuenta") + "</ul></nav>" +
      '<section class="fcol" aria-labelledby="fh-visit"><h3 id="fh-visit">Visítanos</h3><ul class="frows">' +
      row("pin", "Dirección", '<span id="f-addr">' + CC.esc(c.address) + '</span><span class="frow__tools"><a class="fchip" href="' + mapUrl + '" target="_blank" rel="noopener noreferrer">Ver mapa' + NEW + '</a><button class="fchip" type="button" id="f-copy">Copiar</button></span>') +
      row("chat", "WhatsApp", '<a href="' + wa + '" target="_blank" rel="noopener noreferrer">' + CC.esc(c.whatsappDisplay) + NEW + "</a>") +
      (c.email ? row("mail", "Correo", '<a href="mailto:' + CC.esc(c.email) + '">' + CC.esc(c.email) + "</a>") : "") +
      row("clock", "Horario", "<span>" + hours + "</span>") + "</ul></section>" +
      (dishes ? '<section class="fcol" aria-labelledby="fh-top"><h3 id="fh-top">Lo más pedido</h3>' + dishes + '<a class="fmore" href="' + b + 'menu/menu.html">Ver toda la carta' + CC.icon("arrow") + "</a></section>" : "") +
      "</div>" +
      '<p class="ft-word" aria-hidden="true"><span>Caldos</span> <em>Constitución</em></p>' +
      '<div class="fbar"><p>© <span id="f-year"></span> Caldos Constitución And Restaurant. Todos los derechos reservados.</p>' +
      "<p>Precios en RD$, sujetos a cambio. Favoritos y carrito se guardan solo en este dispositivo.</p></div>" +
      "</div></footer>" +
      '<div class="fab"><button class="fab__top" type="button" id="f-top" aria-label="Volver arriba">' + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg></button>' +
      '<a class="fab__wa" href="' + wa + '" target="_blank" rel="noopener noreferrer" aria-label="Escribir por WhatsApp (se abre en una pestaña nueva)">' + CC.icon("chat") + "<span>WhatsApp</span></a></div>";

    /* Seto de hierbas como suelo del dosel (una imagen: barata de pintar) */
    var hedge = document.querySelector(".ft-hedge");
    if (hedge) hedge.innerHTML = '<div class="hedges hedges--foot jg-grow"><img class="hedge" src="' + b + 'assets/botanical/hedge-a.svg" alt="" loading="lazy" decoding="async" draggable="false"></div>';

    document.getElementById("f-year").textContent = new Date().getFullYear();
    document.getElementById("f-copy").addEventListener("click", function () { copy(c.address); });
    document.querySelector(".site-footer").addEventListener("error", function (e) {
      if (e.target.tagName === "IMG" && e.target.closest(".fdish__img")) e.target.closest(".fdish__img").classList.add("img-missing");
    }, true);

    // Volver arriba
    var topBtn = document.getElementById("f-top"), tick = false;
    function vis() { topBtn.classList.toggle("is-on", window.scrollY > 700); tick = false; }
    window.addEventListener("scroll", function () { if (!tick) { tick = true; requestAnimationFrame(vis); } }, { passive: true });
    topBtn.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); });
    vis();
  };
})(window.CC = window.CC || {});
