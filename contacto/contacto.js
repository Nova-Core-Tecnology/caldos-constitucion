(function (CC) {
  "use strict";
  function fieldError(id, msg) {
    var f = document.getElementById(id).closest(".field"), e = document.getElementById(id + "-e");
    f.classList.toggle("has-error", !!msg); e.textContent = msg || "";
    document.getElementById(id).setAttribute("aria-invalid", msg ? "true" : "false");
    if (msg) document.getElementById(id).setAttribute("aria-describedby", id + "-e");
    return !msg;
  }
  CC.page = function () {
    var c = CC.config, cards = [];
    document.querySelectorAll("[data-ic]").forEach(function (s) { s.innerHTML = CC.icon(s.getAttribute("data-ic")); });
    var waUrl = CC.waLink("Hola, quisiera información.");
    var wa = document.getElementById("ch-wa"); if (wa) wa.href = waUrl;

    /* Tarjeta de visita (datos de config.js) */
    function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
    setText("vc-name", c.name); setText("vc-tag", c.tagline || ""); setText("vc-addr", c.addressShort || c.address); setText("vc-wa", c.whatsappDisplay);

    /* Tarjetas de datos: sólo lo que está confirmado en config.js */
    var arrow = CC.icon("arrow");
    cards.push({ rgb: "46, 160, 100", ic: "chat", l: "WhatsApp", v: CC.esc(c.whatsappDisplay), a: '<a class="cc__a" href="' + waUrl + '" target="_blank" rel="noopener noreferrer">Escribir ahora' + arrow + '<span class="visually-hidden"> (se abre en una pestaña nueva)</span></a>' });
    cards.push({ rgb: "229, 83, 58", ic: "pin", l: "Dirección", v: CC.esc(c.addressShort || c.address), a: '<a class="cc__a" href="#mapa">Ver el mapa' + arrow + "</a>" });
    var hasHours = c.hours && c.hours.length;
    cards.push({ rgb: "230, 160, 10", ic: "clock", l: "Horario", v: hasHours ? c.hours.map(function (h) { return CC.esc(h.days + ": " + h.time); }).join("<br>") : "Escríbenos por WhatsApp para consultar el horario de atención.", muted: !hasHours, a: hasHours ? "" : '<a class="cc__a" href="' + CC.waLink("Hola, quisiera consultar el horario de atención.") + '" target="_blank" rel="noopener noreferrer">Preguntar el horario' + arrow + '<span class="visually-hidden"> (se abre en una pestaña nueva)</span></a>' });
    if (c.email) cards.push({ rgb: "196, 140, 80", ic: "mail", l: "Correo", v: '<a href="mailto:' + CC.esc(c.email) + '">' + CC.esc(c.email) + "</a>", a: "" });
    if (c.social && c.social.length) cards.push({ rgb: "214, 108, 90", ic: "heart", l: "Síguenos", v: "Mira nuestros platos y novedades en redes.", muted: true, social: c.social });
    document.getElementById("info").innerHTML = cards.map(function (k) {
      var extra = k.social
        ? '<div class="social">' + k.social.map(function (s) {
          return '<a href="' + CC.esc(s.url) + '" target="_blank" rel="noopener noreferrer" aria-label="' + CC.esc(s.label) + ' (se abre en una pestaña nueva)">' + CC.icon(s.key) + "</a>";
        }).join("") + "</div>"
        : (k.a || "");
      return '<article class="cc reveal" style="--kr:' + k.rgb + '"><span class="cc__ic" aria-hidden="true">' + CC.icon(k.ic) + '</span><span class="cc__l">' + k.l + '</span><p class="cc__v' + (k.muted ? " muted" : "") + '">' + k.v + "</p>" + extra + "</article>";
    }).join("");

    var q = encodeURIComponent(c.mapQuery);
    document.getElementById("map").src = "https://www.google.com/maps?q=" + q + "&output=embed";
    document.getElementById("gmaps").href = "https://www.google.com/maps/search/?api=1&query=" + q;
    document.getElementById("addr").textContent = c.address;
    document.getElementById("copy").addEventListener("click", function () {
      function done(ok) { CC.toast(ok ? "Dirección copiada" : "No se pudo copiar. Selecciónala y cópiala manualmente.", ok ? undefined : "error"); }
      try { navigator.clipboard.writeText(c.address).then(function () { done(true); }, function () { done(false); }); } catch (err) { done(false); }
    });

    /* Contador del mensaje */
    var msgEl = document.getElementById("msg"), cnt = document.getElementById("msg-n");
    function count() { cnt.textContent = msgEl.value.length + " / " + (msgEl.maxLength > 0 ? msgEl.maxLength : 600); }
    msgEl.addEventListener("input", count); count();

    var form = document.getElementById("form");
    ["name", "phone", "msg"].forEach(function (id) { document.getElementById(id).addEventListener("input", function () { fieldError(id, ""); }); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("name").value.trim(), phone = document.getElementById("phone").value.trim(), msg = document.getElementById("msg").value.trim();
      var ok = true;
      ok = fieldError("name", name.length < 2 ? "Escribe tu nombre (mínimo 2 letras)." : "") && ok;
      ok = fieldError("phone", phone && !/^[0-9+()\-\s]{7,20}$/.test(phone) ? "Usa un teléfono válido, por ejemplo 809 555 1234." : "") && ok;
      ok = fieldError("msg", msg.length < 10 ? "Cuéntanos un poco más (mínimo 10 caracteres)." : "") && ok;
      var res = document.getElementById("result");
      if (!ok) { res.innerHTML = '<div class="notice notice--err"><strong>Revisa el formulario</strong>Hay campos que necesitan corrección.</div>'; var bad = form.querySelector(".has-error input, .has-error textarea"); if (bad) bad.focus(); return; }
      var mo = form.querySelector('input[name="motive"]:checked');
      var text = "Hola, soy " + name + (phone ? " (tel. " + phone + ")" : "") + "." + (mo ? "\nMotivo: " + mo.value + "." : "") + "\n" + msg;
      var url = CC.waLink(text);
      window.open(url, "_blank", "noopener");
      res.innerHTML = '<div class="notice notice--ok"><strong>Mensaje listo en WhatsApp</strong>Aún no se ha enviado: pulsa enviar en WhatsApp. ' +
        '¿No se abrió? <a href="' + url + '" target="_blank" rel="noopener noreferrer"><b>Abrir WhatsApp</b></a></div>';
    });
  };
})(window.CC = window.CC || {});
