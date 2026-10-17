/* Horarios, capacidad y políticas. Estos valores también los usan las reglas del servidor para validar
   cada reservación y evento (horario, anticipación, personas, días cerrados, plazos de cancelación). */
(function (CC) {
  "use strict";
  var AD = window.AD, B = CC.booking;
  var DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  /* Configuración inicial: horario de 9:00 a. m. a 11:00 p. m. todos los días, 100 personas, 10 mesas */
  AD.initSystem = function () {
    var b = AD.db.batch();
    b.set(AD.db.doc("settings/restaurant"), Object.assign({}, B.DEFAULTS, { updatedAt: AD.ts(), updatedBy: AD.me.uid }));
    if (!AD.live.tables.length) B.DEFAULT_TABLES.forEach(function (t) { b.set(AD.db.collection("tables").doc(t.id), { name: t.name, seats: t.seats, zone: t.zone, order: t.order, active: true }); });
    return b.commit().then(function () { AD.audit("settings.init", "settings/restaurant", "Configuración inicial y " + B.DEFAULT_TABLES.length + " mesas"); });
  };

  function timeOpts(sel, from, to) {
    var o = ""; for (var m = B.min(from || "00:00"); m <= B.min(to || "23:30"); m += 30) { var x = B.hhmm(m); o += '<option value="' + x + '"' + (x === sel ? " selected" : "") + ">" + B.time12(x) + "</option>"; }
    return o;
  }
  function num(name, label, val, min, max, hint) {
    return '<div class="f"><label for="s-' + name + '">' + label + '</label><input id="s-' + name + '" name="' + name + '" type="number" min="' + min + '" max="' + max + '" value="' + val + '">' + (hint ? "<small>" + hint + "</small>" : "") + "</div>";
  }

  /* Franja superior: cómo quedan hoy horario, días y capacidad */
  function summary(S) {
    var days = S.openDays.length === 7 ? "Todos los días" : DAYS.filter(function (d, i) { return S.openDays.indexOf(i + 1) > -1; }).map(function (d) { return d.slice(0, 3); }).join(" · ") || "Ninguno";
    var st = function (ic, l, v, sub) { return '<div class="sum"><span class="sum__ic">' + AD.icon(ic) + "</span><div><small>" + l + "</small><b>" + v + "</b>" + (sub ? "<span>" + sub + "</span>" : "") + "</div></div>"; };
    return '<div class="sums">' + st("calendar", "Días abiertos", AD.esc(days), (S.closedDates || []).length ? S.closedDates.length + " días cerrados programados" : "Sin cierres programados") +
      st("clock", "Horario", B.time12(S.openTime) + " – " + B.time12(S.closeTime), "Última reservación " + B.time12(S.lastSeating)) +
      st("users", "Capacidad", S.capacity + " personas", "Hasta " + S.maxParty + " por reservación") +
      st("shield", "Cancelación", S.cancelHours + " h antes", "Cada reservación dura " + S.durationMinutes + " min") + "</div>";
  }

  AD.view("ajustes", {
    title: "Horarios y políticas", icon: "settings", group: "Contenido", perm: "settings",
    render: function (host) {
      var closed = [], mine = 0;
      function paint() {
        var S = AD.S;
        closed = (S.closedDates || []).slice().sort();
        host.innerHTML = (AD.settingsExist ? "" : '<div class="alert">' + AD.icon("info") + "<span>Aún no hay configuración guardada: se muestran los valores iniciales. Al guardar se activan las reservaciones en línea.</span></div>") +
          summary(S) + '<form id="s-f" novalidate><div class="cards">' +
          '<div class="card"><div class="card__h"><div class="card__ttl"><span class="card__ic card__ic--amber">' + AD.icon("clock") + '</span><div><h2>Horario</h2><p>Hora del restaurante (República Dominicana)</p></div></div></div>' +
          '<div class="f"><span class="f__l">Días abiertos</span><div class="days">' + DAYS.map(function (d, i) { return '<label class="day"><input type="checkbox" name="d' + (i + 1) + '"' + (S.openDays.indexOf(i + 1) > -1 ? " checked" : "") + "><span>" + d.slice(0, 3) + "</span></label>"; }).join("") + "</div></div>" +
          '<div class="grid3"><div class="f"><label for="s-open">Abre</label><select id="s-open" name="openTime">' + timeOpts(S.openTime) + '</select></div>' +
          '<div class="f"><label for="s-close">Cierra</label><select id="s-close" name="closeTime">' + timeOpts(S.closeTime, "00:30", "23:30") + '</select></div>' +
          '<div class="f"><label for="s-last">Última reservación</label><select id="s-last" name="lastSeating">' + timeOpts(S.lastSeating) + "</select></div></div>" +
          '<div class="f"><span class="f__l">Días cerrados (feriados, vacaciones)</span><div class="acts"><input class="in in--auto" type="date" id="s-cd"><button type="button" class="b b--sm" id="s-cd-add">' + AD.icon("plus") + 'Añadir</button></div><div class="chips chips--mt" id="s-cds"></div></div></div>' +
          '<div class="card"><div class="card__h"><div class="card__ttl"><span class="card__ic card__ic--green">' + AD.icon("users") + '</span><div><h2>Capacidad y reservaciones</h2><p>Mesas: se gestionan en «Mesas y plano»</p></div></div></div><div class="grid2">' +
          num("capacity", "Capacidad del local (personas)", S.capacity, 1, 2000) +
          num("maxParty", "Máximo de personas por reservación en línea", S.maxParty, 1, 200, "Grupos mayores se dirigen a Eventos") +
          '<div class="f"><label for="s-slot">Intervalo entre horarios</label><select id="s-slot" name="slotMinutes">' + [15, 30, 60].map(function (v) { return '<option value="' + v + '"' + (v === S.slotMinutes ? " selected" : "") + ">" + v + " minutos</option>"; }).join("") + "</select></div>" +
          num("durationMinutes", "Duración de cada reservación (min)", S.durationMinutes, 30, 360) +
          num("graceMinutes", "Tolerancia de llegada (min)", S.graceMinutes, 0, 120) +
          num("minNoticeMin", "Anticipación mínima (min)", S.minNoticeMin, 0, 2880) +
          num("maxAdvanceDays", "Reservar hasta (días por adelantado)", S.maxAdvanceDays, 1, 365) +
          '<label class="chk"><input type="checkbox" name="allowCombine"' + (S.allowCombine ? " checked" : "") + "> Unir mesas para grupos grandes</label></div></div>" +
          '<div class="card"><div class="card__h"><div class="card__ttl"><span class="card__ic card__ic--blue">' + AD.icon("shield") + '</span><div><h2>Política de reservaciones</h2><p>La ven los clientes antes de reservar</p></div></div></div><div class="grid2">' +
          num("cancelHours", "Cancelar sin costo hasta (horas antes)", S.cancelHours, 0, 168) + num("modifyHours", "Modificar hasta (horas antes)", S.modifyHours, 0, 168) +
          '<div class="f full"><label for="s-pn">Nota adicional</label><textarea id="s-pn" name="policyNote" maxlength="400" rows="2">' + AD.esc(S.policyNote || "") + "</textarea></div></div></div>" +
          '<div class="card"><div class="card__h"><div class="card__ttl"><span class="card__ic card__ic--violet">' + AD.icon("party") + '</span><div><h2>Eventos</h2><p>Reglas para las solicitudes de eventos</p></div></div></div><div class="grid2">' +
          num("eventMinGuests", "Mínimo de invitados", S.eventMinGuests, 1, 500) + num("eventMinNoticeDays", "Anticipación mínima (días)", S.eventMinNoticeDays, 0, 90) +
          num("eventCancelHours", "Cancelar sin costo hasta (horas antes)", S.eventCancelHours, 0, 720) +
          '<div class="f full"><label for="s-et">Tipos de evento <span class="opt">(uno por línea)</span></label><textarea id="s-et" name="eventTypes" rows="5">' + AD.esc((S.eventTypes || []).join("\n")) + "</textarea></div>" +
          '<div class="f full"><label for="s-epn">Nota de la política de eventos</label><textarea id="s-epn" name="eventPolicyNote" maxlength="400" rows="2">' + AD.esc(S.eventPolicyNote || "") + "</textarea></div></div></div>" +
          '</div><div class="savebar"><span class="muted small" id="s-msg">Los cambios se aplican al momento en el sitio y en las reglas del servidor.</span><button class="b b--p b--lg" type="submit" id="s-save">' + AD.icon("check") + "Guardar cambios</button></div></form>";
        chips();
        AD.$("#s-cd-add").onclick = function () { var v = AD.$("#s-cd").value; if (v && closed.indexOf(v) < 0) { closed.push(v); closed.sort(); chips(); } };
        AD.$("#s-f").addEventListener("submit", save);
      }
      function chips() {
        AD.$("#s-cds").innerHTML = closed.length ? closed.map(function (d) { return '<button type="button" class="chip" data-rm="' + d + '" title="Quitar">' + B.shortDate(d) + " ✕</button>"; }).join("") : '<span class="muted small">Ninguno</span>';
      }
      host.addEventListener("click", function (e) { var r = e.target.closest("[data-rm]"); if (r) { closed = closed.filter(function (x) { return x !== r.dataset.rm; }); chips(); } });
      function save(e) {
        e.preventDefault();
        var f = AD.$("#s-f"), S = AD.S, n = function (k) { return Math.round(Number(AD.val(f, k))); };
        var d = {
          openDays: [1, 2, 3, 4, 5, 6, 7].filter(function (i) { return AD.val(f, "d" + i); }),
          openTime: AD.val(f, "openTime"), closeTime: AD.val(f, "closeTime"), lastSeating: AD.val(f, "lastSeating"),
          capacity: n("capacity"), maxParty: n("maxParty"), slotMinutes: n("slotMinutes"), durationMinutes: n("durationMinutes"), graceMinutes: n("graceMinutes"),
          minNoticeMin: n("minNoticeMin"), maxAdvanceDays: n("maxAdvanceDays"), allowCombine: AD.val(f, "allowCombine"),
          cancelHours: n("cancelHours"), modifyHours: n("modifyHours"), policyNote: AD.val(f, "policyNote"),
          eventMinGuests: n("eventMinGuests"), eventMinNoticeDays: n("eventMinNoticeDays"), eventCancelHours: n("eventCancelHours"),
          eventTypes: AD.val(f, "eventTypes").split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 20), eventPolicyNote: AD.val(f, "eventPolicyNote"),
          closedDates: closed.filter(function (x) { return x >= B.addDays(AD.today(), -1); }).slice(0, 200)
        };
        var errs = [];
        if (!d.openDays.length) errs.push("Elige al menos un día abierto.");
        if (!(d.openTime < d.lastSeating && d.lastSeating < d.closeTime)) errs.push("La última reservación debe ser después de abrir y antes de cerrar.");
        [["capacity", 1, 2000], ["maxParty", 1, 200], ["durationMinutes", 30, 360], ["graceMinutes", 0, 120], ["minNoticeMin", 0, 2880], ["maxAdvanceDays", 1, 365], ["cancelHours", 0, 168], ["modifyHours", 0, 168], ["eventMinGuests", 1, 500], ["eventMinNoticeDays", 0, 90], ["eventCancelHours", 0, 720]].forEach(function (r) {
          var ok = d[r[0]] >= r[1] && d[r[0]] <= r[2]; AD.fieldErr(f, r[0], ok ? "" : "Entre " + r[1] + " y " + r[2] + "."); if (!ok) errs.push("Revisa los valores marcados.");
        });
        if (d.maxParty > d.capacity) errs.push("El máximo por reservación no puede superar la capacidad.");
        if (d.eventMinGuests > d.capacity) errs.push("El mínimo de invitados no puede superar la capacidad.");
        if (!d.eventTypes.length) errs.push("Escribe al menos un tipo de evento.");
        if (errs.length) { AD.toast(errs[0], "error"); return; }
        var changes = Object.keys(d).filter(function (k) { return JSON.stringify(d[k]) !== JSON.stringify(S[k]); });
        if (!changes.length && AD.settingsExist) { AD.toast("No hay cambios."); return; }
        var btn = AD.$("#s-save"); btn.disabled = true; mine = Date.now();
        var data = Object.assign({}, B.DEFAULTS, S, d, { updatedAt: AD.ts(), updatedBy: AD.me.uid });
        AD.db.doc("settings/restaurant").set(data).then(function () {
          AD.audit("settings.update", "settings/restaurant", changes.map(function (k) { return k + ": " + JSON.stringify(S[k]) + " → " + JSON.stringify(d[k]); }).join("; ").slice(0, 500));
          if (!AD.live.tables.length && AD.can("tables")) return AD.initSystem();
        }).then(function () { AD.toast("Ajustes guardados."); }, function (er) { AD.fail("settings", er); }).then(function () { btn.disabled = false; });
      }
      paint();
      /* Si otro miembro guarda cambios mientras estás aquí, se avisa en lugar de pisar lo que escribes */
      var first = true;
      AD.watch(["settings"], function () { if (Date.now() - mine < 8000) return; AD.$("#s-msg").textContent = "Otro miembro del equipo cambió los ajustes. Recarga esta sección para ver la versión nueva."; });
    }
  });
})(window.CC = window.CC || {});
