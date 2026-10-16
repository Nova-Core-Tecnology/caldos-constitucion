(function (CC) {
  "use strict";
  function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function err(id, msg) {
    var el = document.getElementById(id), f = el.closest(".field"), e = document.getElementById(id + "-e");
    f.classList.toggle("has-error", !!msg); if (e) e.textContent = msg || "";
    el.setAttribute("aria-invalid", msg ? "true" : "false");
    if (msg && e) el.setAttribute("aria-describedby", id + "-e");
    return !msg;
  }
  function longDate(v) {
    var p = v.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  function time12(v) {
    var p = v.split(":").map(Number), h = p[0] % 12 || 12;
    return h + ":" + String(p[1]).padStart(2, "0") + (p[0] < 12 ? " a. m." : " p. m.");
  }
  CC.page = function () {
    var form = document.getElementById("rform"), via = document.getElementById("r-via"), contact = document.getElementById("r-contact");
    var date = document.getElementById("r-date"), today = new Date(), max = new Date(); max.setMonth(max.getMonth() + 3);
    date.min = ymd(today); date.max = ymd(max);

    function syncVia() {
      var v = via.value, label = document.getElementById("r-contact-l");
      if (v === "Correo") { label.textContent = "Correo electrónico"; contact.type = "email"; contact.inputMode = "email"; contact.autocomplete = "email"; }
      else { label.textContent = v === "WhatsApp" ? "Número de WhatsApp" : "Número de teléfono"; contact.type = "tel"; contact.inputMode = "tel"; contact.autocomplete = "tel"; }
      err("r-contact", "");
    }
    via.addEventListener("change", syncVia); syncVia();
    ["r-name", "r-contact", "r-date", "r-time", "r-people"].forEach(function (id) { document.getElementById(id).addEventListener("input", function () { err(id, ""); }); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("r-name").value.trim(), c = contact.value.trim();
      var d = date.value, t = document.getElementById("r-time").value, n = Number(document.getElementById("r-people").value);
      var notes = document.getElementById("r-notes").value.trim(), ok = true;
      ok = err("r-name", name.length < 2 ? "Escribe tu nombre (mínimo 2 letras)." : "") && ok;
      var cMsg = "";
      if (via.value === "Correo") { if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c)) cMsg = "Escribe un correo válido, por ejemplo nombre@correo.com."; }
      else if (!/^[0-9+()\-\s]{7,20}$/.test(c) || c.replace(/\D/g, "").length < 7) cMsg = "Escribe un teléfono válido, por ejemplo 809 555 1234.";
      ok = err("r-contact", cMsg) && ok;
      var dMsg = "";
      if (!d) dMsg = "Elige la fecha."; else if (d < date.min) dMsg = "La fecha no puede ser anterior a hoy."; else if (d > date.max) dMsg = "Solo se reciben solicitudes hasta 3 meses por adelantado.";
      ok = err("r-date", dMsg) && ok;
      var tMsg = "";
      if (!t) tMsg = "Elige la hora.";
      else if (d === date.min) { var now = new Date(); if (t <= String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0")) tMsg = "Esa hora ya pasó. Elige una hora posterior."; }
      ok = err("r-time", tMsg) && ok;
      ok = err("r-people", !Number.isInteger(n) || n < 1 || n > 30 ? "Indica entre 1 y 30 personas." : "") && ok;

      var out = document.getElementById("r-result");
      if (!ok) {
        out.innerHTML = '<div class="notice notice--err"><strong>Revisa el formulario</strong>Hay campos que necesitan corrección.</div>';
        var bad = form.querySelector(".has-error input"); if (bad) bad.focus(); return;
      }
      var btn = document.getElementById("r-send"), spin = btn.querySelector(".spin"), txt = document.getElementById("r-send-t");
      btn.disabled = true; spin.hidden = false; txt.textContent = "Preparando…"; out.innerHTML = "";
      setTimeout(function () {
        var text = "Hola, quisiera solicitar una reserva en Caldos Constitución:\n" +
          "• Nombre: " + name + "\n• Contacto (" + via.value + "): " + c + "\n• Fecha: " + longDate(d) + "\n• Hora: " + time12(t) + "\n• Personas: " + n +
          (notes ? "\n• Solicitudes especiales: " + notes : "") + "\nQuedo atento a su confirmación. Gracias.";
        var url = CC.waLink(text);
        out.innerHTML = '<div class="card-form"><div class="notice notice--ok"><strong>Solicitud lista — todavía NO es una reserva confirmada</strong>El restaurante debe aceptarla y confirmarte la disponibilidad.</div>' +
          '<dl class="summary"><dt>Nombre</dt><dd>' + CC.esc(name) + "</dd><dt>Contacto</dt><dd>" + CC.esc(c) + " (" + CC.esc(via.value) + ")</dd><dt>Fecha</dt><dd>" + CC.esc(longDate(d)) +
          "</dd><dt>Hora</dt><dd>" + CC.esc(time12(t)) + "</dd><dt>Personas</dt><dd>" + n + "</dd>" + (notes ? "<dt>Notas</dt><dd>" + CC.esc(notes) + "</dd>" : "") + "</dl>" +
          '<div class="r-actions"><a class="btn" href="' + url + '" target="_blank" rel="noopener noreferrer">' + CC.icon("chat") + 'Enviar por WhatsApp</a>' +
          '<button class="btn btn--outline" type="button" id="r-copy">Copiar texto</button></div></div>';
        document.getElementById("r-copy").addEventListener("click", function () {
          (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { CC.toast("Texto copiado"); }, function () { CC.toast("No se pudo copiar. Usa el botón de WhatsApp.", "error"); });
        });
        btn.disabled = false; spin.hidden = true; txt.textContent = "Preparar solicitud";
        out.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      }, 600);
    });
  };
})(window.CC = window.CC || {});
