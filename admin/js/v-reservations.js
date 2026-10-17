/* Reservaciones: lista con filtros, búsqueda, orden y exportación; detalle con acciones,
   asignación de mesas sin conflictos, cambios pedidos por el cliente, mensajes e historial. */
(function (CC) {
  "use strict";
  var AD = window.AD, B = CC.booking;

  AD.params = function () {
    var q = (location.hash.split("?")[1] || ""), o = {};
    q.split("&").forEach(function (p) { var kv = p.split("="); if (kv[0]) o[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ""); });
    return o;
  };
  function findRes(id) { return (AD.live.res || []).filter(function (r) { return r.id === id; })[0]; }
  function endTime(r) { return B.time12(B.hhmm(Math.min(B.min(r.time) + AD.S.durationMinutes, B.min(AD.S.closeTime)))); }

  /* ---------- selector de mesas ---------- */
  AD.pickTables = function (o) {
    /* o: { date, slots, party, refId, current: [ids], title } */
    return AD.ops.dayIndex(o.date).then(function (day) {
      var all = AD.live.tables.filter(function (t) { return t.active !== false; });
      var free = AD.ops.freeFor(day.idx, o.slots, o.refId);
      var freeIds = free.map(function (t) { return t.id; });
      var sug = (o.current && o.current.length && o.current.every(function (id) { return freeIds.indexOf(id) > -1; })) ? o.current : ((B.fit(free, o.party, AD.S.allowCombine) || []).map(function (t) { return t.id; }));
      var maxUsed = o.slots.reduce(function (m, k) { return Math.max(m, day.idx.used[k] || 0); }, 0);
      var ownPeople = (o.ownPeople || 0), left = AD.S.capacity - maxUsed + ownPeople;
      return new Promise(function (ok) {
        var chosen = false;
        var m = AD.modal({
          title: o.title || "Asignar mesas", wide: true,
          body: '<p class="muted small">' + AD.cap(B.longDate(o.date)) + " · franjas " + o.slots.map(function (k) { return k.slice(0, 2) + ":" + k.slice(2); }).join(", ") + " · <b>" + o.party + " personas</b> · capacidad libre del local: " + left + "</p>" +
            (free.length ? "" : '<div class="alert alert--err">' + AD.icon("alert") + "<span>No hay mesas libres en ese horario.</span></div>") +
            '<div class="tpick">' + all.map(function (t) {
              var busy = freeIds.indexOf(t.id) < 0, who = "";
              if (busy) { o.slots.some(function (k) { var l = day.idx.busy[k] && day.idx.busy[k][t.id]; if (l && l.refId !== o.refId) { who = l.kind === "block" ? "Bloqueada" : l.kind === "event" ? "Evento" : "Reservada"; return true; } return false; }); }
              return '<label class="' + (busy ? "busy" : "") + '"><input type="checkbox" value="' + AD.esc(t.id) + '"' + (busy ? " disabled" : "") + (sug.indexOf(t.id) > -1 ? " checked" : "") + "><b>" + AD.esc(t.name) + "</b><small>" + t.seats + " puestos · " + AD.esc(who || t.zone || "") + "</small></label>";
            }).join("") + '</div><div class="seatbar" id="seatbar"></div>' +
            (o.note ? '<div class="f" style="margin-top:1rem"><label for="pk-note">Mensaje para el cliente <span class="opt">(opcional)</span></label><textarea id="pk-note" name="note" maxlength="400" rows="2" placeholder="Ej.: Te esperamos en la terraza."></textarea></div>' : ""),
          actions: [{ label: "Cancelar", close: true }, { label: o.okLabel || "Confirmar", cls: "b--ok", icon: "check", onClick: function (api) {
            var ids = AD.$$(".tpick input:checked", api.el).map(function (i) { return i.value; });
            if (!ids.length) { api.error("Elige al menos una mesa."); return false; }
            chosen = true; ok({ ids: ids, note: o.note ? AD.$("#pk-note", api.el).value.trim() : null, force: left < o.party });
          } }],
          onClose: function () { if (!chosen) ok(null); },
          noFocus: true
        });
        function seats() {
          var ids = AD.$$(".tpick input:checked", m.el).map(function (i) { return i.value; }), s = AD.ops.seats(ids);
          AD.$("#seatbar", m.el).innerHTML = '<span class="' + (s >= o.party ? "ok" : "no") + '">' + s + " puestos para " + o.party + " personas</span>" +
            (s < o.party ? '<span class="muted">· faltan ' + (o.party - s) + "</span>" : "") + (left < o.party ? '<span class="no">· supera la capacidad libre del local</span>' : "");
        }
        m.el.addEventListener("change", seats); seats();
      });
    });
  };

  /* ---------- detalle ---------- */
  AD.openRes = function (id) {
    var off = null;
    function paint() {
      var r = findRes(id); if (!r) { AD.closeDrawer(); return; }
      var s = B.RES_STATUS[r.status] || {}, act = ["pending", "confirmed"].indexOf(r.status) > -1, future = r.start + AD.S.durationMinutes * 60000 > Date.now();
      var wa = AD.phoneWa(r.phone), c = r.change;
      var ini = String(r.name || "?").trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join("").toUpperCase();
      var tel = String(r.phone || "").replace(/[^\d+]/g, ""), dl = B.longDate(r.date).split(",");
      var html = '<div class="rd">' +
        '<header class="rd__hero"><span class="rd__av">' + AD.esc(ini) + '</span><div class="rd__who"><b>' + AD.esc(r.name) + "</b><span>" + AD.esc(r.phone) + (r.email ? " · " + AD.esc(r.email) : "") + "</span>" +
        '<div class="rd__tags">' + AD.pill(B.RES_STATUS, r.status) + '<span class="tag">#' + AD.code(r.id) + "</span>" + (r.source === "staff" ? '<span class="tag">Creada por el equipo</span>' : "") + (r.remindedAt ? '<span class="tag">' + AD.icon("bell") + "Recordada</span>" : "") + "</div></div></header>" +
        '<div class="rd__tiles">' +
          '<div class="rd__tile">' + AD.icon("calendar") + "<small>Día</small><b>" + AD.esc(AD.cap(dl.length > 1 ? dl.slice(1).join(",").trim() : dl[0])) + "</b><span>" + AD.esc(AD.cap(dl.length > 1 ? dl[0] : "")) + "</span></div>" +
          '<div class="rd__tile">' + AD.icon("clock") + "<small>Hora</small><b>" + B.time12(r.time) + "</b><span>hasta " + endTime(r) + "</span></div>" +
          '<div class="rd__tile">' + AD.icon("users") + "<small>Personas</small><b>" + r.party + "</b><span>" + (r.party === 1 ? "persona" : "personas") + "</span></div>" +
          '<div class="rd__tile' + (r.tableNames && r.tableNames.length ? "" : " rd__tile--warn") + '">' + AD.icon("table") + "<small>Mesas</small><b>" + (r.tableNames && r.tableNames.length ? AD.esc(r.tableNames.join(" + ")) : "Sin asignar") + "</b><span>" + (r.tableNames && r.tableNames.length ? AD.ops.seats(r.tableIds || []) + " puestos" : "se asignan al confirmar") + "</span></div>" +
        "</div>" +
        '<div class="rd__quick">' +
          (wa ? '<a class="rd__q" target="_blank" rel="noopener" href="' + wa + "?text=" + encodeURIComponent(waText(r)) + '">' + AD.icon("chat") + "<span>WhatsApp</span></a>" : "") +
          (tel ? '<a class="rd__q" href="tel:' + AD.esc(tel) + '">' + AD.icon("phone") + "<span>Llamar</span></a>" : "") +
          (r.email ? '<a class="rd__q" href="mailto:' + AD.esc(r.email) + "?subject=" + encodeURIComponent("Tu reservación en Caldos Constitución") + "&body=" + encodeURIComponent(waText(r)) + '">' + AD.icon("mail") + "<span>Correo</span></a>" : "") +
          (r.uid ? '<button type="button" class="rd__q" data-x="msg">' + AD.icon("bell") + "<span>Aviso web</span></button>" : "") +
        "</div>" +
        (c && c.type && act ? '<div class="box box--warn rd__change"><b>' + (c.type === "cancel" ? "El cliente pide cancelar" : "El cliente pide un cambio") + "</b>" +
          (c.type === "modify" ? "<div>" + (c.date ? AD.cap(B.shortDate(c.date)) : "") + (c.time ? " · " + B.time12(c.time) : "") + (c.party ? " · " + c.party + " pers." : "") + "</div>" : "") +
          (c.notes ? "<div>“" + AD.esc(c.notes) + "”</div>" : "") + '<div class="acts" style="margin-top:.6rem">' +
          (c.type === "modify" ? '<button class="b b--sm b--ok" data-x="apply">' + AD.icon("check") + "Aplicar cambio</button>" : '<button class="b b--sm b--danger" data-x="cancel">' + AD.icon("close") + "Cancelar reservación</button>") +
          '<button class="b b--sm" data-x="nochange">No aceptar</button></div></div>' : "") +
        /* acciones principales según el estado */
        (r.status === "pending" || r.status === "confirmed" ? '<div class="rd__acts">' +
          (r.status === "pending" ? '<button class="b b--ok b--lg" data-x="confirm">' + AD.icon("check") + 'Confirmar y asignar mesas</button><button class="b b--danger b--lg" data-x="reject">' + AD.icon("close") + "Rechazar</button>" : "") +
          (r.status === "confirmed" ? '<button class="b b--ok" data-x="completed">' + AD.icon("check") + "Completada</button>" + (future ? '<button class="b" data-x="tables">' + AD.icon("table") + "Cambiar mesas</button>" : "") +
            '<button class="b" data-x="noshow">No se presentó</button>' + (future ? '<button class="b b--danger" data-x="cancel">' + AD.icon("close") + "Cancelar</button>" : "") : "") +
          "</div>" : '<p class="rd__hint">' + AD.icon("info") + "<span>" + AD.esc(s.hint || "Esta reservación ya está cerrada.") + "</span></p>") +
        '<section class="rd__sec"><h3>Detalles</h3><dl class="dl">' +
          (r.occasion ? "<dt>Ocasión</dt><dd>" + AD.esc(r.occasion) + "</dd>" : "") +
          "<dt>Solicitada</dt><dd>" + AD.when(r.createdAt) + "</dd>" +
          "<dt>Origen</dt><dd>" + (r.source === "staff" ? "Panel (equipo)" : "Sitio web") + "</dd></dl>" +
          (r.notes ? '<blockquote class="rd__note"><small>Comentario del cliente</small>' + AD.esc(r.notes) + "</blockquote>" : "") +
          (r.staffNote ? '<blockquote class="rd__note rd__note--staff"><small>Mensaje enviado al cliente</small>' + AD.esc(r.staffNote) + "</blockquote>" : "") +
        "</section>" +
        ((r.dishes || []).length ? '<section class="rd__sec"><h3>Platos elegidos <span>referencia, no es un pedido</span></h3><div class="rd__bill"><ul>' + r.dishes.map(function (d) { return "<li><span><i>" + d.qty + "×</i>" + AD.esc(d.name) + "</span><b>" + AD.money(d.price * d.qty) + "</b></li>"; }).join("") +
          '</ul><div class="rd__total"><span>Total aproximado</span><b>' + AD.money(r.dishesTotal || 0) + "</b></div><small>Precios del momento de la reserva</small></div></section>" : "") +
        '<section class="rd__sec"><h3>Historial</h3><ol class="log" id="r-log"><li class="muted">Cargando…</li></ol></section></div>';
      var b = AD.drawer("Reservación #" + AD.code(r.id), html, function () { if (off) AD.off("res", off); }, "res:" + id);
      AD.db.collection("reservations").doc(id).collection("log").orderBy("at").get().then(function (q) {
        var el = AD.$("#r-log"); if (!el) return;
        el.innerHTML = q.docs.map(function (d) { var l = d.data(); return "<li>" + AD.esc(l.text || l.action) + "<small>" + AD.when(l.at) + " · " + (l.who === "cliente" ? "Cliente" : AD.esc(l.name || "Equipo")) + "</small></li>"; }).join("") || '<li class="muted">Sin movimientos.</li>';
      }).catch(function (e) { AD.logError("res.log", e); });
      b.onclick = function (e) {
        var x = e.target.closest("[data-x]"); if (!x) return;
        act_(x.dataset.x, findRes(id));
      };
    }
    function waText(r) {
      var st = (B.RES_STATUS[r.status] || {}).label || "";
      return "Hola " + r.name.split(" ")[0] + ", te escribimos de Caldos Constitución sobre tu reservación del " + B.longDate(r.date) + " a las " + B.time12(r.time) + " para " + r.party + " personas (estado: " + st.toLowerCase() + ").";
    }
    function act_(a, r) {
      var ops = AD.ops;
      if (a === "confirm" || a === "tables") {
        AD.pickTables({ date: r.date, slots: ops.slotsRes(r.date, r.time), party: r.party, refId: r.id, current: r.tableIds, note: a === "confirm" && !!r.uid, ownPeople: r.hold ? r.hold.people : 0,
          title: a === "confirm" ? "Confirmar reservación" : "Cambiar mesas", okLabel: a === "confirm" ? "Confirmar" : "Guardar mesas" }).then(function (p) {
          if (!p) return;
          ops.confirmRes(r, p.ids, p.note || null, p.force).then(function () { AD.toast(a === "confirm" ? "Reservación confirmada." : "Mesas actualizadas."); }, function (e) { AD.fail("res.confirm", e); });
        }).catch(function (e) { AD.fail("res.pick", e); });
      } else if (a === "apply") {
        var c = r.change, date = c.date || r.date, time = c.time || r.time, party = Number(c.party || r.party);
        var go = function (ids) { ops.applyResChange(r, ids).then(function () { AD.toast("Cambio aplicado."); }, function (e) { AD.fail("res.change", e); }); };
        if (r.status !== "confirmed") { go([]); return; }
        AD.pickTables({ date: date, slots: ops.slotsRes(date, time), party: party, refId: r.id, current: r.date === date ? r.tableIds : [], title: "Mesas para el nuevo horario", okLabel: "Aplicar cambio", ownPeople: r.hold && r.hold.date === date ? r.hold.people : 0 })
          .then(function (p) { if (p) go(p.ids); });
      } else if (a === "nochange") {
        reason("No aceptar el cambio", "Explica al cliente por qué (opcional)", "No aceptar").then(function (n) { if (n === null) return; ops.rejectChange("reservations", r, n).then(function () { AD.toast("Listo."); }, function (e) { AD.fail("res.nochange", e); }); });
      } else if (a === "msg") {
        reason("Mensaje al cliente", "Lo verá en «Mi cuenta» y recibirá un aviso.", "Enviar", true).then(function (n) { if (!n) return; ops.message("reservations", r, n).then(function () { AD.toast("Mensaje enviado."); }, function (e) { AD.fail("res.msg", e); }); });
      } else {
        var labels = { reject: ["Rechazar reservación", "rejected", "Motivo para el cliente (opcional)"], cancel: ["Cancelar reservación", "cancelled", "Motivo para el cliente (opcional)"], completed: ["Marcar como completada", "completed", ""], noshow: ["Marcar como no presentada", "noshow", "Nota interna (opcional)"] }[a];
        if (!labels) return;
        (labels[2] ? reason(labels[0], labels[2], labels[0].split(" ")[0]) : AD.confirm(labels[0], "¿Confirmas que " + AD.esc(r.name) + " ya fue atendido?", "Sí, completada").then(function (y) { return y ? "" : null; }))
          .then(function (n) { if (n === null) return; ops.setResStatus(r, labels[1], n).then(function () { AD.toast("Guardado."); }, function (e) { AD.fail("res.status", e); }); });
      }
    }
    off = AD.debounce(function () { if (AD.drawerOpen()) paint(); }, 150);
    paint();
    AD.on("res", off);
  };
  function reason(title, label, ok, required) {
    return new Promise(function (done) {
      var sent = false;
      AD.modal({ title: title, body: '<div class="f"><label for="rs-t">' + AD.esc(label) + '</label><textarea id="rs-t" name="t" maxlength="400" rows="3"></textarea></div>',
        onClose: function () { if (!sent) done(null); },
        actions: [{ label: "Volver", close: true }, { label: ok, cls: "b--p", onClick: function (api) {
          var v = AD.$("#rs-t", api.el).value.trim();
          if (required && !v) { api.error("Escribe el mensaje."); return false; }
          sent = true; done(v);
        } }] });
    });
  }
  AD.reason = reason;

  /* ---------- nueva reservación (teléfono o mostrador) ---------- */
  function newRes() {
    var S = AD.S, t = AD.today();
    AD.modal({
      title: "Nueva reservación", wide: true,
      body: '<div class="grid2"><div class="f"><label for="n-name">Nombre</label><input id="n-name" name="name" maxlength="80"></div>' +
        '<div class="f"><label for="n-phone">Teléfono</label><input id="n-phone" name="phone" type="tel" maxlength="30"></div>' +
        '<div class="f"><label for="n-date">Día</label><input id="n-date" name="date" type="date" min="' + t + '" value="' + t + '"></div>' +
        '<div class="f"><label for="n-time">Hora</label><select id="n-time" name="time">' + B.times(S).map(function (x) { return '<option value="' + x + '">' + B.time12(x) + "</option>"; }).join("") + "</select></div>" +
        '<div class="f"><label for="n-party">Personas</label><input id="n-party" name="party" type="number" min="1" max="' + S.capacity + '" value="2"></div>' +
        '<div class="f"><label for="n-occ">Ocasión <span class="opt">(opcional)</span></label><input id="n-occ" name="occasion" maxlength="60"></div>' +
        '<div class="f full"><label for="n-notes">Comentarios <span class="opt">(opcional)</span></label><textarea id="n-notes" name="notes" maxlength="500" rows="2"></textarea></div>' +
        '<label class="chk full"><input type="checkbox" name="assign" checked> Confirmar ya y asignar mesas</label></div>',
      actions: [{ label: "Cancelar", close: true }, { label: "Crear", cls: "b--p", icon: "plus", onClick: function (api) {
        var f = api.el, ok = true, name = AD.val(f, "name"), phone = AD.val(f, "phone"), date = AD.val(f, "date"), time = AD.val(f, "time"), party = Math.round(Number(AD.val(f, "party")));
        ok = AD.fieldErr(f, "name", name.length >= 2 ? "" : "Escribe el nombre.") && ok;
        ok = AD.fieldErr(f, "phone", phone.replace(/\D/g, "").length >= 7 ? "" : "Teléfono no válido.") && ok;
        ok = AD.fieldErr(f, "date", date && date >= t ? (B.isOpenDate(S, date) ? "" : "Ese día está cerrado.") : "Elige un día desde hoy.") && ok;
        ok = AD.fieldErr(f, "party", party >= 1 && party <= S.capacity ? "" : "Personas no válidas.") && ok;
        if (!ok) return false;
        var d = { name: name, phone: phone, date: date, time: time, party: party, occasion: AD.val(f, "occasion"), notes: AD.val(f, "notes") };
        if (!AD.val(f, "assign")) return AD.ops.createRes(d, []).then(function (id) { AD.toast("Reservación creada."); AD.openRes(id); });
        return AD.pickTables({ date: date, slots: AD.ops.slotsRes(date, time), party: party, refId: "", okLabel: "Crear y confirmar" }).then(function (p) {
          if (!p) return Promise.reject("keep");
          return AD.ops.createRes(d, p.ids).then(function (id) { AD.toast("Reservación creada y confirmada."); setTimeout(function () { AD.openRes(id); }, 300); });
        });
      } }]
    });
  }
  AD.newRes = newRes;

  /* ---------- lista ---------- */
  var COLS_X = [
    { k: "code", l: "Código", v: function (r) { return AD.code(r.id); } }, { k: "date", l: "Fecha" }, { k: "time", l: "Hora" }, { k: "name", l: "Cliente" }, { k: "phone", l: "Teléfono" }, { k: "email", l: "Correo" },
    { k: "party", l: "Personas" }, { k: "status", l: "Estado", v: function (r) { return (B.RES_STATUS[r.status] || {}).label || r.status; } },
    { k: "tables", l: "Mesas", v: function (r) { return (r.tableNames || []).join(" + "); } }, { k: "occasion", l: "Ocasión" }, { k: "notes", l: "Comentarios" },
    { k: "dishes", l: "Platos", v: function (r) { return (r.dishes || []).map(function (d) { return d.qty + "x " + d.name; }).join(", "); } },
    { k: "dishesTotal", l: "Total platos (aprox.)" }, { k: "source", l: "Origen", v: function (r) { return r.source === "staff" ? "Equipo" : "Web"; } },
    { k: "created", l: "Solicitada", v: function (r) { var d = AD.tsDate(r.createdAt); return d ? d.toISOString().replace("T", " ").slice(0, 16) : ""; } }
  ];
  AD.RES_EXPORT = COLS_X;

  AD.view("reservaciones", {
    title: "Reservaciones", icon: "calendar", group: "Operación", perm: "reservations",
    render: function (host, top) {
      var p = AD.params(), t = AD.today(), rg = AD.range();
      var st = { from: p.d || t, to: p.d || B.addDays(t, 30), s: p.s || "all", q: "" };
      top.innerHTML = '<button class="b b--p b--sm" id="r-new">' + AD.icon("plus") + 'Nueva</button><button class="b b--sm" id="r-csv">' + AD.icon("download") + 'CSV</button><button class="b b--sm" id="r-xls">' + AD.icon("download") + "Excel</button>";
      host.innerHTML = '<div class="bar"><div class="f"><label for="r-from">Desde</label><input id="r-from" type="date" min="' + rg.from + '" max="' + rg.to + '" value="' + st.from + '"></div>' +
        '<div class="f"><label for="r-to">Hasta</label><input id="r-to" type="date" min="' + rg.from + '" max="' + rg.to + '" value="' + st.to + '"></div>' +
        '<div class="acts"><button class="b b--sm" data-q="today">Hoy</button><button class="b b--sm" data-q="tomorrow">Mañana</button><button class="b b--sm" data-q="week">7 días</button><button class="b b--sm" data-q="past">Últimos 30</button></div>' +
        '<div class="f bar__grow search"><label for="r-q" class="vh">Buscar</label>' + AD.icon("search") + '<input id="r-q" type="search" placeholder="Buscar por nombre, teléfono, correo o código"></div></div>' +
        '<div class="chips" id="r-chips" style="margin-bottom:1rem"></div><div id="r-table"></div>' +
        '<p class="small muted" style="margin-top:.8rem">Se muestran reservaciones del ' + B.shortDate(rg.from) + " al " + B.shortDate(rg.to) + ". Para fechas anteriores usa Reportes.</p>";
      var tbl = AD.table(AD.$("#r-table"), {
        sort: "start", dir: "asc", empty: "No hay reservaciones con estos filtros.",
        rowAttr: function (r) { return 'data-open="' + AD.esc(r.id) + '"' + (r.status === "pending" ? ' class="is-new"' : ""); },
        cols: [
          { k: "start", l: "Fecha y hora", sortVal: function (r) { return r.start; }, html: function (r) { return "<b>" + AD.cap(B.shortDate(r.date)) + '</b><span class="sub">' + B.time12(r.time) + "</span>"; } },
          { k: "name", l: "Cliente", html: function (r) { return "<b>" + AD.esc(r.name) + '</b><span class="sub">' + AD.esc(r.phone) + "</span>"; } },
          { k: "party", l: "Pers.", cls: "num" },
          { k: "tables", l: "Mesas", sortVal: function (r) { return (r.tableNames || []).join(); }, html: function (r) { return r.tableNames && r.tableNames.length ? AD.esc(r.tableNames.join(" + ")) : '<span class="muted">—</span>'; } },
          { k: "status", l: "Estado", html: function (r) { return AD.pill(B.RES_STATUS, r.status) + (r.change && r.change.type && ["pending", "confirmed"].indexOf(r.status) > -1 ? ' <span class="tag tag--warn">' + (r.change.type === "cancel" ? "pide cancelar" : "pide cambio") + "</span>" : "") + ((r.dishes || []).length ? ' <span class="tag">' + AD.icon("utensils") + r.dishes.length + "</span>" : ""); } },
          { k: "code", l: "Código", sortVal: function (r) { return r.id; }, html: function (r) { return '<span class="muted">#' + AD.code(r.id) + "</span>"; } }
        ]
      });
      var CH = [["all", "Todas"], ["pending", "Pendientes"], ["confirmed", "Confirmadas"], ["change", "Con cambios"], ["completed", "Completadas"], ["closed", "Canceladas / rechazadas / no-show"]];
      function match(r, s) {
        if (s === "all") return true;
        if (s === "change") return !!(r.change && r.change.type) && ["pending", "confirmed"].indexOf(r.status) > -1;
        if (s === "closed") return ["cancelled", "rejected", "noshow"].indexOf(r.status) > -1;
        return r.status === s;
      }
      function rows() {
        var q = st.q.toLowerCase();
        var base = (AD.live.res || []).filter(function (r) { return r.date >= st.from && r.date <= st.to; })
          .filter(function (r) { return !q || [r.name, r.phone, r.email, AD.code(r.id), r.id].join(" ").toLowerCase().indexOf(q) > -1; });
        AD.$("#r-chips").innerHTML = CH.map(function (c) { return '<button class="chip" data-s="' + c[0] + '" aria-pressed="' + (st.s === c[0]) + '">' + c[1] + '<span class="n">' + base.filter(function (r) { return match(r, c[0]); }).length + "</span></button>"; }).join("");
        return base.filter(function (r) { return match(r, st.s); });
      }
      function paint() { tbl.set(rows()); }
      host.addEventListener("click", function (e) {
        var o = e.target.closest("[data-open]"); if (o) { AD.openRes(o.dataset.open); return; }
        var c = e.target.closest("[data-s]"); if (c) { st.s = c.dataset.s; paint(); return; }
        var q = e.target.closest("[data-q]");
        if (q) {
          var k = q.dataset.q;
          st.from = k === "past" ? B.addDays(t, -30) : k === "tomorrow" ? B.addDays(t, 1) : t;
          st.to = k === "past" ? t : k === "tomorrow" ? B.addDays(t, 1) : k === "week" ? B.addDays(t, 6) : t;
          AD.$("#r-from").value = st.from; AD.$("#r-to").value = st.to; paint();
        }
      });
      AD.$("#r-from").onchange = function () { st.from = this.value || t; if (st.to < st.from) { st.to = st.from; AD.$("#r-to").value = st.to; } paint(); };
      AD.$("#r-to").onchange = function () { st.to = this.value || st.from; paint(); };
      AD.$("#r-q").oninput = AD.debounce(function () { st.q = AD.$("#r-q").value.trim(); paint(); }, 150);
      AD.$("#r-new").onclick = newRes;
      function exportRows() { return tbl.rows().slice().sort(function (a, b) { return a.start - b.start; }); }
      AD.$("#r-csv").onclick = function () { AD.csv("reservaciones_" + st.from + "_" + st.to, exportRows(), COLS_X); AD.audit("export.reservations", "csv", st.from + "–" + st.to); };
      AD.$("#r-xls").onclick = function () { AD.xlsx("reservaciones_" + st.from + "_" + st.to, [{ name: "Reservaciones", rows: exportRows(), cols: COLS_X }]); AD.audit("export.reservations", "xlsx", st.from + "–" + st.to); };
      paint();
      AD.watch(["res", "tables"], paint);
      if (p.id) AD.openRes(p.id);
    }
  });
})(window.CC = window.CC || {});
