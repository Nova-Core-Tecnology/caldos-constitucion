/* Resumen: cifras reales del día, lo que requiere atención, recordatorios y gráficos. */
(function (CC) {
  "use strict";
  var AD = window.AD, B = CC.booking;
  var ACTIVE = ["pending", "confirmed"];

  function dayLabel(d) { return B.shortDate(d).replace(/\.$/, ""); }
  function row(r, extra) {
    return '<li><button type="button" class="row" data-res="' + AD.esc(r.id) + '"><span class="row__t">' + B.time12(r.time).replace(" ", " ") + '</span><span class="row__main"><b>' + AD.esc(r.name) + "</b><small>" +
      r.party + " pers." + (r.tableNames && r.tableNames.length ? " · " + AD.esc(r.tableNames.join(" + ")) : "") + (extra ? " · " + extra : "") + "</small></span>" + AD.pill(B.RES_STATUS, r.status) + "</button></li>";
  }

  AD.view("resumen", {
    title: "Resumen", icon: "chart", group: "General",
    render: function (host, top) {
      if (window.Notification && Notification.permission === "default") {
        top.innerHTML = '<button class="b b--sm" type="button" id="notif">' + AD.icon("bell") + "Activar alertas</button>";
        AD.$("#notif").onclick = function () { Notification.requestPermission().then(function (p) { if (p === "granted") { AD.toast("Alertas activadas en este navegador."); top.innerHTML = ""; } }); };
      }
      function paint() {
        var S = AD.S, t = AD.today(), tm = B.addDays(t, 1), res = AD.live.res || [], ev = AD.live.ev || [];
        var today = res.filter(function (r) { return r.date === t && r.status !== "rejected"; }).sort(function (a, b) { return a.time.localeCompare(b.time); });
        var todayAct = today.filter(function (r) { return ACTIVE.indexOf(r.status) > -1 || r.status === "completed"; });
        var people = todayAct.reduce(function (a, r) { return a + r.party; }, 0);
        var pending = res.filter(function (r) { return r.status === "pending" && r.start > Date.now() - 3600000; }).sort(function (a, b) { return a.start - b.start; });
        var changes = res.filter(function (r) { return ACTIVE.indexOf(r.status) > -1 && r.change && r.change.type; });
        var evAttn = ev.filter(function (e) { return e.status === "received" || (e.status === "quoted" && e.quoteAccepted) || (e.change && e.change.type && ["received", "review", "quoted", "confirmed"].indexOf(e.status) > -1); });
        var nowMin = B.nowLocal(S.tzOffsetMin).minutes;
        var inHouse = todayAct.filter(function (r) { var m = B.min(r.time); return r.status === "confirmed" && m <= nowMin && nowMin < m + S.durationMinutes; }).reduce(function (a, r) { return a + r.party; }, 0);
        var remind = res.filter(function (r) { return r.date === tm && r.status === "confirmed" && !r.remindedAt; }).sort(function (a, b) { return a.time.localeCompare(b.time); });
        var evNext = ev.filter(function (e) { return e.status === "confirmed" && e.date >= t; }).sort(function (a, b) { return a.start - b.start; }).slice(0, 4);

        var h = B.nowLocal(S.tzOffsetMin).minutes / 60, first = String(AD.me.name || "").trim().split(/\s+/)[0];
        var hi = (h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches") + (first ? ", " + first : "");
        var html = '<section class="hero"><div><p class="hero__k">' + AD.esc(AD.cap(B.longDate(t))) + "</p><h2>" + AD.esc(hi) + "</h2><p>" +
          (todayAct.length ? todayAct.length + (todayAct.length === 1 ? " reservación" : " reservaciones") + " hoy · " + people + " personas" : "Hoy no hay reservaciones todavía") +
          (pending.length ? " · " + pending.length + " por revisar" : "") + "</p></div>" +
          '<div class="hero__acts">' + (pending.length ? '<a class="b b--p" href="#/reservaciones?s=pending">' + AD.icon("clock") + "Revisar pendientes</a>" : "") +
          (AD.can("reservations") ? '<a class="b" href="#/reservaciones">' + AD.icon("calendar") + "Reservaciones</a>" : "") +
          (AD.can("tables") ? '<a class="b" href="#/mesas">' + AD.icon("table") + "Plano del día</a>" : "") +
          (AD.can("events") ? '<a class="b" href="#/eventos">' + AD.icon("party") + "Eventos</a>" : "") + "</div></section>";
        if (!AD.settingsExist) {
          html += '<div class="setup"><span class="setup__ic">' + AD.icon("calendar") + "</span><div><h2>Activa las reservaciones de mesas y eventos</h2>" +
            "<p>Las reservaciones y solicitudes de eventos del sitio web no se pueden enviar hasta crear la configuración del restaurante.</p>" +
            "<ol><li>Horario 9:00 a. m. – 11:00 p. m., todos los días</li><li>Capacidad de 100 personas</li><li>10 mesas listas para asignar</li></ol></div>" +
            (AD.can("settings") && AD.can("tables") ? '<button class="b b--p b--lg" id="init">' + AD.icon("check") + "Activar ahora</button>" : '<span class="muted small">Pide al propietario que lo active.</span>') + "</div>";
        }
        html += '<div class="kpis">' +
          kpi("calendar", "Reservaciones hoy", todayAct.length, people + " personas", "#/reservaciones?d=" + t) +
          kpi("clock", "Por revisar", pending.length, pending.length ? "La más próxima: " + dayLabel(pending[0].date) + ", " + B.time12(pending[0].time) : "Todo al día", "#/reservaciones?s=pending", pending.length ? "hot" : "") +
          kpi("users", "En el local ahora", inHouse, "de " + S.capacity + " personas (" + Math.round(inHouse * 100 / Math.max(1, S.capacity)) + "%)") +
          kpi("party", "Eventos por atender", evAttn.length, evNext.length ? "Próximo: " + dayLabel(evNext[0].date) : "Sin eventos confirmados", "#/eventos") +
          kpi("edit", "Cambios solicitados", changes.length, changes.length ? "Revisar en Reservaciones" : "Ninguno", "#/reservaciones?s=change") + "</div>";

        html += '<div class="cards cards--2"><div>' +
          '<div class="card"><div class="card__h"><div><h2>Hoy · ' + AD.cap(B.longDate(t)) + "</h2><p>" + todayAct.length + " reservaciones · " + people + ' personas</p></div><a class="b b--sm" href="#/mesas">' + AD.icon("table") + "Plano del día</a></div>" +
          (today.length ? '<ul class="rows">' + today.map(function (r) { return row(r); }).join("") + "</ul>" : '<div class="empty">No hay reservaciones para hoy.</div>') + "</div>" +
          '<div class="card"><div class="card__h"><div><h2>Próximos 14 días</h2><p>Personas con reservación por día (confirmadas y pendientes)</p></div></div>' + chartNext(res, t) + "</div>" +
          "</div><div>" +
          '<div class="card"><div class="card__h"><h2>Requieren atención</h2></div>' + attention(pending, changes, evAttn) + "</div>" +
          '<div class="card"><div class="card__h"><div><h2>Recordatorios de mañana</h2><p>Confirmadas sin recordatorio</p></div>' + (remind.length ? '<button class="b b--sm" id="rem-all">' + AD.icon("bell") + "Avisar a todos en la web</button>" : "") + "</div>" +
          (remind.length ? '<ul class="rows">' + remind.map(function (r) {
            var wa = AD.phoneWa(r.phone), txt = encodeURIComponent("Hola " + r.name.split(" ")[0] + ", te recordamos tu reservación en Caldos Constitución mañana " + B.longDate(r.date) + " a las " + B.time12(r.time) + " para " + r.party + " personas. ¡Te esperamos! Si no puedes venir, avísanos.");
            return '<li class="row"><span class="row__t">' + B.time12(r.time).replace(" ", " ") + '</span><span class="row__main"><b>' + AD.esc(r.name) + "</b><small>" + r.party + " pers. · " + AD.esc(r.phone) + '</small></span><span class="row__acts">' +
              (wa ? '<a class="b b--sm" href="' + wa + "?text=" + txt + '" target="_blank" rel="noopener" data-wa="' + AD.esc(r.id) + '">' + AD.icon("chat") + "WhatsApp</a>" : "") +
              (r.uid ? '<button class="b b--sm" data-rem="' + AD.esc(r.id) + '">' + AD.icon("bell") + "Web</button>" : "") + "</span></li>";
          }).join("") + "</ul>" : '<div class="empty">Nada pendiente.</div>') + "</div>" +
          '<div class="card"><div class="card__h"><div><h2>Estado de las reservaciones</h2><p>Últimos 30 días</p></div></div>' + statusDonut(res, t) + "</div>" +
          "</div></div>";
        host.innerHTML = html;
        var init = AD.$("#init"); if (init) init.onclick = function () { init.disabled = true; AD.initSystem().then(function () { AD.toast("¡Reservaciones activadas! Ajusta horarios y mesas cuando quieras."); }, function (e) { init.disabled = false; AD.fail("init", e); }); };
        var all = AD.$("#rem-all");
        if (all) all.onclick = function () {
          all.disabled = true;
          Promise.all(remind.filter(function (r) { return r.uid; }).map(AD.ops.remind)).then(function () { AD.toast("Recordatorios enviados."); AD.audit("reservation.remind-all", "reservations", remind.length + " recordatorios"); }, function (e) { all.disabled = false; AD.fail("remind", e); });
        };
      }
      function kpi(ic, l, v, s, href, mod) {
        var tag = href ? "a" : "div";
        return "<" + tag + ' class="kpi' + (mod ? " kpi--" + mod : "") + '"' + (href ? ' href="' + href + '"' : "") + '><div class="kpi__l">' + AD.icon(ic) + AD.esc(l) + '</div><div class="kpi__v">' + v + '</div><div class="kpi__s">' + AD.esc(s) + "</div></" + tag + ">";
      }
      function attention(pending, changes, evAttn) {
        var items = pending.slice(0, 6).map(function (r) { return row(r, dayLabel(r.date)); })
          .concat(changes.slice(0, 4).map(function (r) { return row(r, '<span class="tag tag--warn">' + (r.change.type === "cancel" ? "pide cancelar" : "pide cambio") + "</span>"); }))
          .concat(evAttn.slice(0, 4).map(function (e) {
            var why = e.status === "received" ? "nueva solicitud" : e.quoteAccepted && e.status === "quoted" ? "aceptó la cotización" : "pide cambio";
            return '<li><button type="button" class="row" data-ev="' + AD.esc(e.id) + '"><span class="row__t">' + dayLabel(e.date) + '</span><span class="row__main"><b>' + AD.esc(e.type) + " · " + AD.esc(e.name) + "</b><small>" + e.guests + ' invitados · <span class="tag tag--warn">' + why + "</span></small></span>" + AD.pill(B.EVENT_STATUS, e.status) + "</button></li>";
          }));
        return items.length ? '<ul class="rows">' + items.join("") + "</ul>" : '<div class="empty">' + AD.icon("check") + " Todo al día.</div>";
      }
      function chartNext(res, t) {
        var data = [];
        for (var i = 0; i < 14; i++) {
          var d = B.addDays(t, i), n = res.filter(function (r) { return r.date === d && ACTIVE.indexOf(r.status) > -1; }).reduce(function (a, r) { return a + r.party; }, 0);
          data.push({ l: d.slice(8) + "/" + d.slice(5, 7), t: B.shortDate(d), v: n, alt: i === 0 });
        }
        return AD.barChart(data, { label: "Personas por día" });
      }
      function statusDonut(res, t) {
        var from = B.addDays(t, -30), c = {};
        res.filter(function (r) { return r.date >= from && r.date <= t; }).forEach(function (r) { c[r.status] = (c[r.status] || 0) + 1; });
        return AD.donut(Object.keys(B.RES_STATUS).map(function (k) { return { l: B.RES_STATUS[k].label, v: c[k] || 0, c: AD.TONE[B.RES_STATUS[k].tone] }; }), { unit: "reservas" });
      }
      host.addEventListener("click", function (e) {
        var r = e.target.closest("[data-res]"); if (r) { AD.openRes(r.dataset.res); return; }
        var v = e.target.closest("[data-ev]"); if (v) { AD.openEvent(v.dataset.ev); return; }
        var m = e.target.closest("[data-rem]");
        if (m) { var x = (AD.live.res || []).filter(function (y) { return y.id === m.dataset.rem; })[0]; m.disabled = true; AD.ops.remind(x).then(function () { AD.toast("Recordatorio enviado a " + x.name + "."); }, function (er) { m.disabled = false; AD.fail("remind", er); }); return; }
        var w = e.target.closest("[data-wa]");
        if (w) { var y = (AD.live.res || []).filter(function (z) { return z.id === w.dataset.wa; })[0]; if (y) AD.db.collection("reservations").doc(y.id).update({ remindedAt: AD.ts() }).catch(function () {}); }
      });
      paint();
      AD.watch(["res", "ev", "settings", "tables"], paint);
      var tick = setInterval(paint, 60000); AD.onLeave(function () { clearInterval(tick); });
    }
  });
})(window.CC = window.CC || {});
