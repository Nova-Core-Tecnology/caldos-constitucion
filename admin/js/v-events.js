/* Eventos: solicitudes con su flujo (recibida → en revisión → cotizada → confirmada → completada,
   o rechazada / cancelada), cotización, mesas o local exclusivo, cambios pedidos e historial. */
(function (CC) {
  "use strict";
  var AD = window.AD, B = CC.booking;
  function findEv(id) { return (AD.live.ev || []).filter(function (e) { return e.id === id; })[0]; }
  var OPEN = ["received", "review", "quoted", "confirmed"];

  AD.openEvent = function (id) {
    var off = null;
    function paint() {
      var e = findEv(id); if (!e) { AD.closeDrawer(); return; }
      var s = B.EVENT_STATUS[e.status] || {}, q = e.quote || {}, c = e.change, wa = AD.phoneWa(e.phone), future = e.start > Date.now();
      var html = '<div class="acts" style="margin-bottom:1rem">' + AD.pill(B.EVENT_STATUS, e.status) + '<span class="tag">#' + AD.code(e.id) + "</span>" +
        (e.quoteAccepted ? '<span class="tag tag--warn">' + AD.icon("check") + "Cotización aceptada</span>" : "") + "</div>" +
        (c && c.type && OPEN.indexOf(e.status) > -1 ? '<div class="box box--warn" style="margin-bottom:1rem"><b>' + (c.type === "cancel" ? "El cliente pide cancelar" : "El cliente pide un cambio") + "</b>" +
          (c.type === "modify" ? "<div>" + (c.date ? AD.cap(B.shortDate(c.date)) : "") + (c.startTime ? " · " + B.time12(c.startTime) + "–" + B.time12(c.endTime) : "") + (c.guests ? " · " + c.guests + " invitados" : "") + "</div>" : "") +
          (c.notes ? "<div>“" + AD.esc(c.notes) + "”</div>" : "") + '<div class="acts" style="margin-top:.6rem">' +
          (c.type === "modify" ? '<button class="b b--sm b--ok" data-x="apply">' + AD.icon("check") + "Aplicar cambio</button>" : '<button class="b b--sm b--danger" data-x="cancelled">' + AD.icon("close") + "Cancelar evento</button>") +
          '<button class="b b--sm" data-x="nochange">No aceptar</button></div></div>' : "") +
        '<dl class="dl"><dt>Tipo</dt><dd>' + AD.esc(e.type) + (e.title ? " · " + AD.esc(e.title) : "") + "</dd>" +
        "<dt>Cliente</dt><dd>" + AD.esc(e.name) + "</dd><dt>Teléfono</dt><dd>" + AD.esc(e.phone) + "</dd>" + (e.email ? "<dt>Correo</dt><dd>" + AD.esc(e.email) + "</dd>" : "") +
        "<dt>Día</dt><dd>" + AD.cap(B.longDate(e.date)) + "</dd><dt>Horario</dt><dd>" + B.time12(e.startTime) + " – " + B.time12(e.endTime) + "</dd>" +
        "<dt>Invitados</dt><dd>" + e.guests + "</dd><dt>Espacio</dt><dd>" + (e.space === "exclusivo" ? "Local exclusivo" : "Área reservada") + "</dd>" +
        "<dt>Mesas</dt><dd>" + (e.tableNames && e.tableNames.length ? AD.esc(e.space === "exclusivo" ? "Todo el local" : e.tableNames.join(" + ")) : '<span class="muted">Sin apartar</span>') + "</dd>" +
        (e.budget ? "<dt>Presupuesto</dt><dd>" + AD.esc(e.budget) + "</dd>" : "") + (e.food ? "<dt>Comida</dt><dd>" + AD.esc(e.food) + "</dd>" : "") +
        (e.decoration ? "<dt>Decoración</dt><dd>" + AD.esc(e.decoration) + "</dd>" : "") + (e.notes ? "<dt>Peticiones</dt><dd>" + AD.esc(e.notes) + "</dd>" : "") +
        "<dt>Solicitado</dt><dd>" + AD.when(e.createdAt) + "</dd>" + (e.staffNote ? "<dt>Mensaje enviado</dt><dd>" + AD.esc(e.staffNote) + "</dd>" : "") + "</dl>" +
        (q.amount || q.details ? '<p class="sec">Cotización</p><div class="box box--violet"><b>' + (q.amount ? AD.money(q.amount) : "") + "</b>" + (q.details ? "<div>" + AD.esc(q.details) + "</div>" : "") +
          '<div class="small muted">' + (q.deposit ? "Depósito: " + AD.money(q.deposit) + " · " : "") + (q.validUntil ? "Válida hasta " + B.shortDate(q.validUntil) : "") + "</div></div>" : "") +
        '<p class="sec">Acciones</p><div class="acts">' +
        (e.status === "received" ? '<button class="b" data-x="review">' + AD.icon("eye") + "Pasar a revisión</button>" : "") +
        (["received", "review", "quoted"].indexOf(e.status) > -1 ? '<button class="b" data-x="quote">' + AD.icon("tag") + (e.status === "quoted" ? "Editar cotización" : "Enviar cotización") + "</button>" : "") +
        (OPEN.indexOf(e.status) > -1 && future ? '<button class="b b--ok" data-x="confirm">' + AD.icon("check") + (e.status === "confirmed" ? "Cambiar mesas" : "Confirmar y apartar") + "</button>" : "") +
        (e.status === "confirmed" ? '<button class="b b--ok" data-x="completed">Completado</button>' : "") +
        (["received", "review", "quoted"].indexOf(e.status) > -1 ? '<button class="b b--danger" data-x="rejected">Rechazar</button>' : "") +
        (OPEN.indexOf(e.status) > -1 ? '<button class="b b--danger" data-x="cancelled">Cancelar</button>' : "") +
        (e.uid ? '<button class="b" data-x="msg">' + AD.icon("chat") + "Mensaje en la web</button>" : "") +
        (wa ? '<a class="b" target="_blank" rel="noopener" href="' + wa + "?text=" + encodeURIComponent("Hola " + e.name.split(" ")[0] + ", te escribimos de Caldos Constitución sobre tu evento (" + e.type + ") del " + B.longDate(e.date) + ".") + '">' + AD.icon("phone") + "WhatsApp</a>" : "") +
        (e.email ? '<a class="b" href="mailto:' + AD.esc(e.email) + "?subject=" + encodeURIComponent("Tu evento en Caldos Constitución") + '">' + AD.icon("mail") + "Correo</a>" : "") +
        "</div>" + (OPEN.indexOf(e.status) < 0 ? '<p class="small muted" style="margin-top:.6rem">' + AD.esc(s.hint || "") + "</p>" : "") +
        '<p class="sec">Historial</p><ol class="log" id="e-log"><li class="muted">Cargando…</li></ol>';
      var b = AD.drawer("Evento · " + e.name, html, function () { if (off) AD.off("ev", off); }, "ev:" + id);
      AD.db.collection("events").doc(id).collection("log").orderBy("at").get().then(function (qq) {
        var el = AD.$("#e-log"); if (!el) return;
        el.innerHTML = qq.docs.map(function (d) { var l = d.data(); return "<li>" + AD.esc(l.text || l.action) + "<small>" + AD.when(l.at) + " · " + (l.who === "cliente" ? "Cliente" : AD.esc(l.name || "Equipo")) + "</small></li>"; }).join("") || '<li class="muted">Sin movimientos.</li>';
      }).catch(function (er) { AD.logError("ev.log", er); });
      b.onclick = function (ev) { var x = ev.target.closest("[data-x]"); if (x) act(x.dataset.x, findEv(id)); };
    }
    function act(a, e) {
      var ops = AD.ops, done = function (m) { return function () { AD.toast(m || "Guardado."); }; }, bad = function (w) { return function (er) { AD.fail(w, er); }; };
      if (a === "review") ops.setEventStatus(e, "review").then(done(), bad("ev.review"));
      else if (a === "quote") quote(e);
      else if (a === "confirm" || a === "apply") {
        var c = a === "apply" ? e.change : {}, date = c.date || e.date, from = c.startTime || e.startTime, to = c.endTime || e.endTime, guests = Number(c.guests || e.guests);
        var run = function (ids) { return a === "apply" ? ops.applyEventChange(e, ids) : ops.confirmEvent(e, ids, null); };
        if (a === "apply" && e.status !== "confirmed") { run([]).then(done("Cambio aplicado."), bad("ev.apply")); return; }
        if (e.space === "exclusivo") {
          AD.confirm(a === "apply" ? "Aplicar cambio" : "Confirmar evento exclusivo", "Se apartarán <b>todas las mesas</b> del " + AD.esc(B.longDate(date)) + " de " + B.time12(from) + " a " + B.time12(to) + ". Si alguna ya está ocupada, no se guardará nada y te diremos cuál.", "Confirmar")
            .then(function (y) { if (y) run([]).then(done("Evento confirmado."), bad("ev.confirm")); });
          return;
        }
        AD.pickTables({ date: date, slots: B.coveredRange(AD.S, from, to), party: guests, refId: e.id, current: e.date === date ? e.tableIds : [], title: a === "apply" ? "Mesas para el nuevo horario" : "Mesas del evento", okLabel: "Confirmar", ownPeople: e.hold && e.hold.date === date ? e.hold.people : 0 })
          .then(function (p) { if (p) (a === "apply" ? ops.applyEventChange(e, p.ids) : ops.confirmEvent(e, p.ids, null, p.force)).then(done("Evento confirmado."), bad("ev.confirm")); }, bad("ev.pick"));
      } else if (a === "nochange") {
        AD.reason("No aceptar el cambio", "Explica al cliente por qué (opcional)", "No aceptar").then(function (n) { if (n !== null) ops.rejectChange("events", e, n).then(done(), bad("ev.nochange")); });
      } else if (a === "msg") {
        AD.reason("Mensaje al cliente", "Lo verá en «Mi cuenta» y recibirá un aviso.", "Enviar", true).then(function (n) { if (n) ops.message("events", e, n).then(done("Mensaje enviado."), bad("ev.msg")); });
      } else if (a === "completed") {
        AD.confirm("Marcar como completado", "¿El evento de " + AD.esc(e.name) + " ya se realizó?", "Sí, completado").then(function (y) { if (y) ops.setEventStatus(e, "completed").then(done(), bad("ev.done")); });
      } else if (a === "rejected" || a === "cancelled") {
        AD.reason(a === "rejected" ? "Rechazar evento" : "Cancelar evento", "Motivo para el cliente (opcional)", a === "rejected" ? "Rechazar" : "Cancelar").then(function (n) { if (n !== null) ops.setEventStatus(e, a, null, n).then(done(), bad("ev." + a)); });
      }
    }
    function quote(e) {
      var q = e.quote || {};
      AD.modal({
        title: "Cotización · " + e.type,
        body: '<div class="grid2"><div class="f"><label for="q-a">Monto total (RD$)</label><input id="q-a" name="amount" type="number" min="0" step="1" value="' + (q.amount || "") + '"></div>' +
          '<div class="f"><label for="q-d">Depósito para apartar (RD$) <span class="opt">(opcional)</span></label><input id="q-d" name="deposit" type="number" min="0" step="1" value="' + (q.deposit || "") + '"></div>' +
          '<div class="f"><label for="q-v">Válida hasta</label><input id="q-v" name="valid" type="date" min="' + AD.today() + '" max="' + e.date + '" value="' + (q.validUntil || B.addDays(AD.today(), Math.min(7, Math.max(1, Math.round((e.start - Date.now()) / 86400000) - 1)))) + '"></div>' +
          '<div class="f full"><label for="q-t">Qué incluye</label><textarea id="q-t" name="details" maxlength="1500" rows="5" placeholder="Menú, bebidas, decoración, montaje, horario…">' + AD.esc(q.details || "") + "</textarea></div></div>" +
          '<p class="small muted">El cliente la verá en «Mi cuenta» y podrá aceptarla. Recibirá un aviso.</p>',
        actions: [{ label: "Cancelar", close: true }, { label: "Enviar cotización", cls: "b--p", icon: "check", onClick: function (api) {
          var f = api.el, amount = Number(AD.val(f, "amount")), dep = Number(AD.val(f, "deposit") || 0), det = AD.val(f, "details"), valid = AD.val(f, "valid"), ok = true;
          ok = AD.fieldErr(f, "amount", amount > 0 ? "" : "Escribe el monto.") && ok;
          ok = AD.fieldErr(f, "deposit", dep >= 0 && dep <= amount ? "" : "El depósito no puede ser mayor que el total.") && ok;
          ok = AD.fieldErr(f, "details", det.length >= 5 ? "" : "Describe qué incluye.") && ok;
          if (!ok) return false;
          return AD.ops.setEventStatus(e, "quoted", { quote: { amount: Math.round(amount), deposit: Math.round(dep), details: det, validUntil: valid, by: AD.me.uid, at: AD.ts() } }).then(function () { AD.toast("Cotización enviada."); });
        } }]
      });
    }
    off = AD.debounce(function () { if (AD.drawerOpen()) paint(); }, 150);
    paint();
    AD.on("ev", off);
  };

  var COLS_X = [
    { k: "code", l: "Código", v: function (e) { return AD.code(e.id); } }, { k: "date", l: "Fecha" }, { k: "startTime", l: "Inicio" }, { k: "endTime", l: "Fin" },
    { k: "type", l: "Tipo" }, { k: "title", l: "Nombre" }, { k: "name", l: "Cliente" }, { k: "phone", l: "Teléfono" }, { k: "email", l: "Correo" }, { k: "guests", l: "Invitados" },
    { k: "space", l: "Espacio" }, { k: "status", l: "Estado", v: function (e) { return (B.EVENT_STATUS[e.status] || {}).label || e.status; } },
    { k: "quote", l: "Cotización (RD$)", v: function (e) { return e.quote ? e.quote.amount : ""; } }, { k: "budget", l: "Presupuesto" }, { k: "notes", l: "Peticiones" }
  ];
  AD.EV_EXPORT = COLS_X;

  AD.view("eventos", {
    title: "Eventos", icon: "party", group: "Operación", perm: "events",
    render: function (host, top) {
      var st = { s: "open", q: "" };
      top.innerHTML = '<button class="b b--sm" id="e-csv">' + AD.icon("download") + 'CSV</button><button class="b b--sm" id="e-xls">' + AD.icon("download") + "Excel</button>";
      host.innerHTML = '<div class="bar"><div class="f bar__grow search"><label for="e-q" class="vh">Buscar</label>' + AD.icon("search") + '<input id="e-q" type="search" placeholder="Buscar por cliente, teléfono, tipo o código"></div></div>' +
        '<div class="chips" id="e-chips" style="margin-bottom:1rem"></div><div id="e-table"></div>';
      var CH = [["open", "En curso"], ["received", "Recibidas"], ["review", "En revisión"], ["quoted", "Cotizadas"], ["confirmed", "Confirmadas"], ["completed", "Completadas"], ["closed", "Rechazadas / canceladas"], ["all", "Todas"]];
      function match(e, s) { return s === "all" || (s === "open" ? OPEN.indexOf(e.status) > -1 : s === "closed" ? ["rejected", "cancelled"].indexOf(e.status) > -1 : e.status === s); }
      var tbl = AD.table(AD.$("#e-table"), {
        sort: "start", dir: "asc", empty: "No hay eventos con este filtro.",
        rowAttr: function (e) { return 'data-open="' + AD.esc(e.id) + '"' + (e.status === "received" ? ' class="is-new"' : ""); },
        cols: [
          { k: "start", l: "Fecha", sortVal: function (e) { return e.start; }, html: function (e) { return "<b>" + AD.cap(B.shortDate(e.date)) + '</b><span class="sub">' + B.time12(e.startTime) + " – " + B.time12(e.endTime) + "</span>"; } },
          { k: "type", l: "Evento", html: function (e) { return "<b>" + AD.esc(e.type) + '</b><span class="sub">' + AD.esc(e.title || (e.space === "exclusivo" ? "Local exclusivo" : "Área reservada")) + "</span>"; } },
          { k: "name", l: "Cliente", html: function (e) { return "<b>" + AD.esc(e.name) + '</b><span class="sub">' + AD.esc(e.phone) + "</span>"; } },
          { k: "guests", l: "Invitados", cls: "num" },
          { k: "status", l: "Estado", html: function (e) { return AD.pill(B.EVENT_STATUS, e.status) + (e.quoteAccepted && e.status === "quoted" ? ' <span class="tag tag--warn">aceptó</span>' : "") + (e.change && e.change.type && OPEN.indexOf(e.status) > -1 ? ' <span class="tag tag--warn">' + (e.change.type === "cancel" ? "pide cancelar" : "pide cambio") + "</span>" : ""); } },
          { k: "quote", l: "Cotización", cls: "num", sortVal: function (e) { return e.quote ? e.quote.amount : 0; }, html: function (e) { return e.quote && e.quote.amount ? AD.money(e.quote.amount) : '<span class="muted">—</span>'; } }
        ]
      });
      function rows() {
        var q = st.q.toLowerCase(), base = (AD.live.ev || []).filter(function (e) { return !q || [e.name, e.phone, e.email, e.type, e.title, AD.code(e.id)].join(" ").toLowerCase().indexOf(q) > -1; });
        AD.$("#e-chips").innerHTML = CH.map(function (c) { return '<button class="chip" data-s="' + c[0] + '" aria-pressed="' + (st.s === c[0]) + '">' + c[1] + '<span class="n">' + base.filter(function (e) { return match(e, c[0]); }).length + "</span></button>"; }).join("");
        return base.filter(function (e) { return match(e, st.s); });
      }
      function paint() { tbl.set(rows()); }
      host.addEventListener("click", function (ev) {
        var o = ev.target.closest("[data-open]"); if (o) { AD.openEvent(o.dataset.open); return; }
        var c = ev.target.closest("[data-s]"); if (c) { st.s = c.dataset.s; paint(); }
      });
      AD.$("#e-q").oninput = AD.debounce(function () { st.q = AD.$("#e-q").value.trim(); paint(); }, 150);
      AD.$("#e-csv").onclick = function () { AD.csv("eventos", tbl.rows(), COLS_X); AD.audit("export.events", "csv", ""); };
      AD.$("#e-xls").onclick = function () { AD.xlsx("eventos", [{ name: "Eventos", rows: tbl.rows(), cols: COLS_X }]); AD.audit("export.events", "xlsx", ""); };
      paint();
      AD.watch(["ev"], paint);
      var p = AD.params(); if (p.id) AD.openEvent(p.id);
    }
  });
})(window.CC = window.CC || {});
