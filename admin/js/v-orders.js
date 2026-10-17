/* Pedidos con pago en línea y vista de cocina.
   - Pedidos (permiso «orders»): verificar pagos (transferencia con comprobante o PayPal), avanzar estados, cobrar el saldo y cancelar.
   - Cocina (permiso «kitchen»): lo que hay que preparar: pedidos pagados, platos elegidos en reservaciones y eventos próximos.
   Sin servidor ningún pago se confirma solo: siempre lo verifica una persona del equipo. */
(function (CC) {
  "use strict";
  var AD = window.AD, B = CC.booking, O = CC.orders;
  var ACTIVE = ["review", "confirmed", "preparing", "ready", "on_way"];
  var NEXT = {
    confirmed: { to: "preparing", label: "Pasar a cocina", icon: "utensils" },
    preparing: { to: "ready", label: "Marcar listo", icon: "check" },
    ready: { to: "done", label: "Entregado", icon: "check" },
    on_way: { to: "done", label: "Entregado", icon: "check" }
  };
  function ms(t) { var d = AD.tsDate(t); return d ? d.getTime() : 0; }
  function stLabel(o) { return o.status === "ready" && o.mode === "domicilio" ? "Listo para enviar" : o.status === "ready" && o.mode === "mesa" ? "Listo para servir" : (O.STATUS[o.status] || {}).label || o.status; }
  function pill(o) { var s = O.STATUS[o.status] || { tone: "gray" }; return '<span class="st st--' + s.tone + '">' + AD.esc(stLabel(o)) + "</span>"; }
  function find(id) { return (AD.live.orders || []).filter(function (o) { return o.id === id; })[0]; }
  function itemsTotal(o) { return (o.items || []).reduce(function (a, i) { return a + (Number(i.qty) || 0) * (Number(i.price) || 0); }, 0); }

  /* Precios actuales del menú para detectar pedidos con precios alterados */
  var menuP = null;
  function menuPrices() {
    if (menuP) return menuP;
    menuP = AD.db.collection("menu").get().then(function (q) { var m = {}; q.docs.forEach(function (d) { var x = d.data(); m[String(x.id != null ? x.id : d.id)] = x; }); return m; }, function () { menuP = null; return {}; });
    return menuP;
  }
  function priceIssues(o, menu) {
    var out = [];
    (o.items || []).forEach(function (i) {
      var m = menu[String(i.id)];
      if (!m) out.push(i.name + ": ya no está en el menú");
      else if (Number(m.price) !== Number(i.price) && !m.priceNote) out.push(i.name + ": RD$" + i.price + " en el pedido, RD$" + m.price + " en el menú");
    });
    if (itemsTotal(o) !== Number(o.total)) out.push("La suma de los platos (" + AD.money(itemsTotal(o)) + ") no coincide con el total (" + AD.money(o.total) + ")");
    var sp = O.split(itemsTotal(o), o.mode);
    if (Number(o.payNow) < sp.now) out.push("El pago (" + AD.money(o.payNow) + ") es menor que el " + sp.pct + " % del pedido (" + AD.money(sp.now) + ")");
    return out;
  }

  /* ---------- cambios de estado (con aviso al cliente en «Mi cuenta») ---------- */
  var MSG = {
    confirmed: ["¡Pago verificado!", "Recibimos tu pago. Tu pedido entra a cocina en breve."],
    preparing: ["Tu pedido se está preparando", "La cocina ya está preparando tu pedido."],
    ready: ["Tu pedido está listo", "Ya puedes pasar a recogerlo."],
    on_way: ["Tu pedido va en camino", "El repartidor va hacia tu dirección. Ten listo el saldo pendiente."],
    done: ["Pedido entregado", "¡Gracias por tu pedido! Buen provecho."],
    rejected: ["No pudimos verificar tu pago", "Revisa el mensaje del restaurante o escríbenos por WhatsApp."],
    cancelled: ["Tu pedido fue cancelado", "Si ya pagaste, el restaurante te contactará para la devolución."]
  };
  AD.orderSet = function (o, to, extra, note) {
    var d = Object.assign({ status: to, updatedAt: AD.ts(), statusBy: AD.me.uid }, extra || {});
    if (note) d.staffNote = String(note).slice(0, 300);
    var b = AD.db.batch();
    b.update(AD.db.collection("orders").doc(o.id), d);
    var m = MSG[to], n = m && AD.notifyDoc(o.uid, m[0] + " · #" + O.code(o.id), note || m[1], "orders/" + o.id); if (n) b.set(n[0], n[1]);
    return b.commit().then(function () { AD.audit("order." + to, "orders/" + o.id, "#" + O.code(o.id) + " · " + o.name + (note ? " · " + note : "")); });
  };

  /* ---------- detalle ---------- */
  AD.openOrder = function (id) {
    var o = find(id); if (!o) return;
    var kitchenOnly = !AD.can("orders"), wa = AD.phoneWa(o.phone), tel = String(o.phone || "").replace(/[^\d+]/g, ""), p = o.pay || {};
    var ini = String(o.name || "?").trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join("").toUpperCase();
    var html = '<div class="rd">' +
      /* la cocina solo ve el nombre de pila: no necesita los datos de contacto */
      '<header class="rd__hero"><span class="rd__av">' + AD.esc(ini) + '</span><div class="rd__who"><b>' + AD.esc(kitchenOnly ? String(o.name).split(" ")[0] : o.name) + "</b><span>" + (kitchenOnly ? AD.esc(O.MODES[o.mode] || "") : AD.esc(o.phone) + (o.email ? " · " + AD.esc(o.email) : "")) + '</span><div class="rd__tags">' + pill(o) + '<span class="tag">#' + O.code(o.id) + '</span><span class="tag">' + AD.esc(O.MODES[o.mode] || o.mode) + "</span></div></div></header>" +
      '<div id="o-warn"></div>' +
      '<div class="rd__tiles">' +
        '<div class="rd__tile">' + AD.icon("cart") + "<small>Total</small><b>" + AD.money(o.total) + "</b><span>" + (o.items || []).reduce(function (a, i) { return a + i.qty; }, 0) + " platos</span></div>" +
        '<div class="rd__tile">' + AD.icon("check") + "<small>Pagado (" + o.pct + " %)</small><b>" + AD.money(o.payNow) + "</b><span>" + AD.esc(O.METHODS[o.method] || o.method) + "</span></div>" +
        '<div class="rd__tile' + (o.balance && !o.balancePaid ? " rd__tile--warn" : "") + '">' + AD.icon("tag") + "<small>Saldo</small><b>" + (o.balance ? AD.money(o.balance) : "—") + "</b><span>" + (o.balance ? (o.balancePaid ? "cobrado" : o.mode === "mesa" ? "se cobra en el local" : "se cobra al entregar") : "pagado completo") + "</span></div>" +
        '<div class="rd__tile">' + AD.icon("clock") + "<small>Hora deseada</small><b>" + (o.time ? AD.esc(o.time) : "Lo antes posible") + "</b><span>pedido " + AD.when(o.createdAt) + "</span></div></div>" +
      (kitchenOnly ? "" : '<div class="rd__quick">' + (wa ? '<a class="rd__q" target="_blank" rel="noopener" href="' + wa + "?text=" + encodeURIComponent("Hola " + String(o.name).split(" ")[0] + ", te escribimos de Caldos Constitución sobre tu pedido #" + O.code(o.id) + ".") + '">' + AD.icon("chat") + "<span>WhatsApp</span></a>" : "") +
        (tel ? '<a class="rd__q" href="tel:' + AD.esc(tel) + '">' + AD.icon("phone") + "<span>Llamar</span></a>" : "") + (o.uid ? '<button type="button" class="rd__q" data-x="msg">' + AD.icon("bell") + "<span>Aviso web</span></button>" : "") + "</div>") +
      /* pago */
      (kitchenOnly ? "" : '<section class="rd__sec"><h3>Pago</h3><div class="paybox paybox--' + (p.status || "review") + '">' +
        '<div class="paybox__h"><b>' + AD.esc(O.METHODS[o.method] || o.method) + "</b>" + '<span class="st st--' + (p.status === "verified" ? "green" : p.status === "rejected" ? "red" : "amber") + '">' + (p.status === "verified" ? "Verificado" : p.status === "rejected" ? "Rechazado" : "Por verificar") + "</span></div>" +
        '<dl class="dl">' + (o.method === "transfer" ? "<dt>Referencia</dt><dd><code>" + AD.esc(p.ref || "—") + "</code></dd>" + (p.from ? "<dt>Banco de origen</dt><dd>" + AD.esc(p.from) + "</dd>" : "") :
          "<dt>ID de PayPal</dt><dd><code>" + AD.esc(p.ref || "—") + "</code></dd><dt>Importe</dt><dd>US$" + Number(p.usd || 0).toFixed(2) + " (tasa " + Number(p.rate || 0).toFixed(2) + ")</dd>" + (p.payer ? "<dt>Pagador</dt><dd>" + AD.esc(p.payer) + "</dd>" : "") + (p.state ? "<dt>Estado en PayPal</dt><dd>" + AD.esc(p.state) + "</dd>" : "")) +
          "<dt>Monto esperado</dt><dd><b>" + AD.money(o.payNow) + "</b></dd>" + (p.verifiedAt ? "<dt>Verificado</dt><dd>" + AD.when(p.verifiedAt) + "</dd>" : "") + "</dl>" +
        (o.method === "transfer" ? '<div id="o-proof" class="proof"><span class="muted small">' + (o.hasProof ? "Cargando comprobante…" : "Sin comprobante") + "</span></div>" :
          '<p class="small muted">Comprueba en tu cuenta de PayPal (Actividad) que existe un pago con este ID y el importe en dólares antes de verificarlo.</p>') + "</div></section>") +
      /* entrega */
      (o.mode === "domicilio" || o.note || o.staffNote ? '<section class="rd__sec"><h3>Entrega y notas</h3>' + (o.address ? '<p class="rd__p">' + AD.icon("pin") + " " + AD.esc(o.address) + "</p>" : "") +
        (o.note ? '<blockquote class="rd__note"><small>Nota del cliente</small>' + AD.esc(o.note) + "</blockquote>" : "") + (o.staffNote ? '<blockquote class="rd__note rd__note--staff"><small>Mensaje del restaurante</small>' + AD.esc(o.staffNote) + "</blockquote>" : "") + "</section>" : "") +
      /* platos */
      '<section class="rd__sec"><h3>Platos <span>' + (o.items || []).length + '</span></h3><div class="rd__bill"><ul>' + (o.items || []).map(function (i) { return "<li><span><i>" + i.qty + "×</i>" + AD.esc(i.name) + "</span><b>" + AD.money(i.qty * i.price) + "</b></li>"; }).join("") +
        '</ul><div class="rd__total"><span>Total</span><b>' + AD.money(o.total) + "</b></div></div></section>" +
      /* acciones */
      '<div class="rd__acts" id="o-acts">' + actions(o, kitchenOnly) + "</div></div>";
    var b = AD.drawer("Pedido #" + O.code(o.id), html, null, "order:" + id);
    if (!kitchenOnly) {
      menuPrices().then(function (m) {
        var w = AD.$("#o-warn"), iss = priceIssues(o, m); if (!w || !iss.length) return;
        w.innerHTML = '<div class="box box--warn"><b>Revisa los precios antes de verificar</b><ul class="o-iss">' + iss.map(function (x) { return "<li>" + AD.esc(x) + "</li>"; }).join("") + "</ul></div>";
      });
      if (o.method === "transfer" && o.hasProof) AD.db.collection("orderProofs").doc(o.id).get().then(function (d) {
        var el = AD.$("#o-proof"); if (!el) return;
        var src = d.exists && d.data().data;
        el.innerHTML = src && /^data:image\//.test(src) ? '<a href="#" data-x="proof" title="Ver en grande"><img src="' + src + '" alt="Comprobante de transferencia del pedido #' + O.code(o.id) + '"></a>' : '<span class="muted small">No se encontró el comprobante.</span>';
      }).catch(function (e) { AD.logError("order.proof", e); });
    }
    b.onclick = function (e) { var x = e.target.closest("[data-x]"); if (!x) return; e.preventDefault(); act(x.dataset.x, find(id)); };
  };
  function actions(o, kitchenOnly) {
    var h = "", nx = NEXT[o.status];
    if (kitchenOnly) {
      if (o.status === "confirmed") h += '<button class="b b--ok b--lg" data-x="preparing">' + AD.icon("utensils") + "Empezar a preparar</button>";
      if (o.status === "preparing") h += '<button class="b b--ok b--lg" data-x="ready">' + AD.icon("check") + "Listo</button>";
      return h || '<p class="rd__hint">' + AD.icon("info") + "<span>" + AD.esc((O.STATUS[o.status] || {}).hint || "") + "</span></p>";
    }
    if (o.status === "review") h += '<button class="b b--ok b--lg" data-x="verify">' + AD.icon("check") + 'Verificar pago</button><button class="b b--danger b--lg" data-x="reject">' + AD.icon("close") + "Rechazar pago</button>";
    if (o.status === "preparing" && o.mode === "domicilio") h += '<button class="b b--ok" data-x="on_way">' + AD.icon("home") + "Enviar (en camino)</button>";
    if (nx) h += '<button class="b ' + (o.status === "preparing" && o.mode === "domicilio" ? "" : "b--ok") + '" data-x="' + nx.to + '">' + AD.icon(nx.icon) + (o.status === "preparing" && o.mode !== "recoger" ? (o.mode === "domicilio" ? "Listo para enviar" : "Listo para servir") : nx.label) + "</button>";
    if (ACTIVE.indexOf(o.status) > -1) h += '<button class="b b--danger" data-x="cancel">' + AD.icon("close") + "Cancelar pedido</button>";
    return h || '<p class="rd__hint">' + AD.icon("info") + "<span>" + AD.esc((O.STATUS[o.status] || {}).hint || "") + "</span></p>";
  }
  function act(a, o) {
    if (!o) return;
    var ok = function (msg) { return function () { AD.toast(msg); AD.openOrder(o.id); }; };
    if (a === "proof") { var img = AD.$("#o-proof img"); if (img) AD.modal({ title: "Comprobante · #" + O.code(o.id), wide: true, body: '<img class="proof__big" src="' + img.src + '" alt="Comprobante">', actions: [{ label: "Cerrar", close: true }] }); return; }
    if (a === "msg") {
      AD.modal({ title: "Aviso para " + o.name, body: '<div class="f"><label for="o-msg">Mensaje</label><textarea id="o-msg" name="m" rows="3" maxlength="300"></textarea></div>',
        actions: [{ label: "Cancelar", close: true }, { label: "Enviar", cls: "b--p", onClick: function (api) { var t = AD.val(api.el, "m"); if (!t) return false; var n = AD.notifyDoc(o.uid, "Mensaje sobre tu pedido #" + O.code(o.id), t, "orders/" + o.id), bt = AD.db.batch(); bt.set(n[0], n[1]); return bt.commit().then(function () { AD.toast("Aviso enviado."); }); } }] });
      return;
    }
    if (a === "verify") {
      AD.confirm("Verificar pago", "Confirma que recibiste <b>" + AD.money(o.payNow) + "</b> " + (o.method === "paypal" ? "en PayPal (ID " + AD.esc((o.pay || {}).ref || "") + ")" : "por transferencia (ref. " + AD.esc((o.pay || {}).ref || "") + ")") + ". El cliente recibirá el aviso.", "Sí, recibí el pago").then(function (y) {
        if (y) AD.orderSet(o, "confirmed", { "pay.status": "verified", "pay.verifiedBy": AD.me.uid, "pay.verifiedAt": AD.ts() }).then(ok("Pago verificado."), function (e) { AD.fail("order.verify", e); });
      });
      return;
    }
    if (a === "reject" || a === "cancel") {
      AD.modal({
        title: a === "reject" ? "Rechazar pago" : "Cancelar pedido",
        body: '<p class="muted small">' + (a === "reject" ? "Úsalo si el pago no aparece o el monto no coincide." : "Si el cliente ya pagó, recuerda devolverle el dinero.") + '</p><div class="f"><label for="o-why">Motivo para el cliente</label><textarea id="o-why" name="why" rows="3" maxlength="300" placeholder="' + (a === "reject" ? "Ej.: No encontramos la transferencia con esa referencia." : "Ej.: Se nos agotó el plato principal; te devolvemos el pago hoy.") + '"></textarea></div>',
        actions: [{ label: "Volver", close: true }, { label: a === "reject" ? "Rechazar pago" : "Cancelar pedido", cls: "b--danger", onClick: function (api) {
          var why = AD.val(api.el, "why"); if (why.length < 4) { api.error("Escribe el motivo para el cliente."); return false; }
          return AD.orderSet(o, a === "reject" ? "rejected" : "cancelled", a === "reject" ? { "pay.status": "rejected" } : { cancelledBy: "staff", cancelledAt: AD.ts() }, why).then(ok(a === "reject" ? "Pago rechazado." : "Pedido cancelado."));
        } }]
      });
      return;
    }
    if (a === "done" && o.balance && !o.balancePaid && AD.can("orders")) {
      AD.modal({
        title: "Entregar pedido #" + O.code(o.id),
        body: '<p>Cobra el saldo de <b>' + AD.money(o.balance) + "</b> antes de entregar.</p><div class=\"radios\">" + [["cash", "Efectivo"], ["card", "Tarjeta en el local / datáfono"], ["transfer", "Transferencia"]].map(function (x, i) { return '<label class="radio"><input type="radio" name="bm" value="' + x[0] + '"' + (i ? "" : " checked") + "><span>" + x[1] + "</span></label>"; }).join("") + "</div>",
        actions: [{ label: "Volver", close: true }, { label: "Saldo cobrado · entregar", cls: "b--ok", icon: "check", onClick: function (api) {
          var bm = (AD.$('input[name="bm"]:checked', api.el) || {}).value || "cash";
          return AD.orderSet(o, "done", { balancePaid: true, balanceMethod: bm, balancePaidAt: AD.ts(), doneAt: AD.ts() }).then(ok("Pedido entregado y saldo cobrado."));
        } }]
      });
      return;
    }
    var extra = a === "done" ? { doneAt: AD.ts() } : {};
    AD.orderSet(o, a, extra).then(ok(stLabel(Object.assign({}, o, { status: a })) + "."), function (e) { AD.fail("order." + a, e); });
  }

  /* ---------- lista de pedidos ---------- */
  AD.view("pedidos", {
    title: "Pedidos", icon: "cart", group: "Operación", perm: "orders",
    render: function (host, top) {
      var st = { s: "active", q: "" };
      top.innerHTML = '<button class="b b--sm" id="o-xls">' + AD.icon("download") + "Excel</button>" + (AD.isOwner() ? '<a class="b b--sm" href="#/pagos">' + AD.icon("settings") + "Configurar pagos</a>" : "");
      host.innerHTML = '<div id="o-kpis"></div><div class="card"><div class="bar"><div class="f bar__grow search"><label for="o-q" class="vh">Buscar</label>' + AD.icon("search") + '<input id="o-q" type="search" placeholder="Buscar por cliente, teléfono, código o referencia"></div></div>' +
        '<div class="chips chips--mb" id="o-chips"></div><div id="o-t"></div></div><p class="small muted c-foot">Sin servidor de pagos, cada pago lo verifica una persona: revisa la transferencia en tu banco o el pago en tu cuenta de PayPal antes de pasar el pedido a cocina.</p>';
      var tbl = AD.table(AD.$("#o-t"), {
        sort: "at", dir: "desc", empty: "No hay pedidos con este filtro.",
        rowAttr: function (o) { return 'data-open="' + AD.esc(o.id) + '"' + (o.status === "review" ? ' class="is-new"' : ""); },
        cols: [
          { k: "at", l: "Pedido", sortVal: function (o) { return ms(o.createdAt); }, html: function (o) { var d = AD.tsDate(o.createdAt); return "<b>#" + O.code(o.id) + '</b><span class="sub">' + (d ? d.toLocaleString("es-DO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—") + "</span>"; } },
          { k: "name", l: "Cliente", html: function (o) { return "<b>" + AD.esc(o.name) + '</b><span class="sub">' + AD.esc(o.phone) + "</span>"; } },
          { k: "mode", l: "Modalidad", html: function (o) { return AD.esc(O.MODES[o.mode] || o.mode) + (o.time ? '<span class="sub">' + AD.esc(o.time) + "</span>" : ""); } },
          { k: "total", l: "Total", cls: "num", html: function (o) { return "<b>" + AD.money(o.total) + "</b>"; } },
          { k: "payNow", l: "Pagado", cls: "num", html: function (o) { return AD.money(o.payNow) + '<span class="sub">' + AD.esc(O.METHODS[o.method] || o.method) + "</span>"; } },
          { k: "balance", l: "Saldo", cls: "num", html: function (o) { return o.balance ? (o.balancePaid ? '<span class="muted">Cobrado</span>' : "<b>" + AD.money(o.balance) + "</b>") : '<span class="muted">—</span>'; } },
          { k: "status", l: "Estado", sortVal: function (o) { return ACTIVE.indexOf(o.status); }, html: pill }
        ]
      });
      function paint() {
        var list = AD.live.orders || [], t0 = new Date(AD.today() + "T00:00:00").getTime(), cnt = { active: 0, all: list.length };
        Object.keys(O.STATUS).forEach(function (k) { cnt[k] = 0; });
        list.forEach(function (o) { cnt[o.status] = (cnt[o.status] || 0) + 1; if (ACTIVE.indexOf(o.status) > -1) cnt.active++; });
        var today = list.filter(function (o) { return ms(o.createdAt) >= t0 && o.status !== "cancelled" && o.status !== "rejected"; });
        var cobr = list.filter(function (o) { return o.pay && o.pay.status === "verified" && ms(o.pay.verifiedAt) >= t0; }).reduce(function (a, o) { return a + Number(o.payNow || 0); }, 0) +
          list.filter(function (o) { return o.balancePaid && ms(o.balancePaidAt) >= t0; }).reduce(function (a, o) { return a + Number(o.balance || 0); }, 0);
        var pend = list.filter(function (o) { return ACTIVE.indexOf(o.status) > -1 && o.status !== "review" && o.balance && !o.balancePaid; }).reduce(function (a, o) { return a + Number(o.balance); }, 0);
        AD.$("#o-kpis").innerHTML = '<div class="kpis">' +
          '<a class="kpi' + (cnt.review ? " kpi--hot" : "") + '" href="#/pedidos" data-s="review"><div class="kpi__l">' + AD.icon("clock") + 'Pagos por verificar</div><div class="kpi__v">' + cnt.review + '</div><div class="kpi__s">' + (cnt.review ? "Revísalos primero" : "Todo al día") + "</div></a>" +
          '<div class="kpi"><div class="kpi__l">' + AD.icon("utensils") + 'En curso</div><div class="kpi__v">' + (cnt.confirmed + cnt.preparing + cnt.ready + cnt.on_way) + '</div><div class="kpi__s">' + cnt.preparing + " en cocina · " + cnt.on_way + " en camino</div></div>" +
          '<div class="kpi"><div class="kpi__l">' + AD.icon("cart") + 'Pedidos hoy</div><div class="kpi__v">' + today.length + '</div><div class="kpi__s">' + AD.money(today.reduce(function (a, o) { return a + Number(o.total || 0); }, 0)) + " en total</div></div>" +
          '<div class="kpi"><div class="kpi__l">' + AD.icon("check") + 'Cobrado hoy</div><div class="kpi__v kpi__v--sm">' + AD.money(cobr) + '</div><div class="kpi__s">' + (pend ? AD.money(pend) + " por cobrar al entregar" : "Sin saldos pendientes") + "</div></div></div>";
        AD.$("#o-chips").innerHTML = [["active", "En curso"], ["review", "Por verificar"], ["confirmed", "Verificados"], ["preparing", "En preparación"], ["ready", "Listos"], ["on_way", "En camino"], ["done", "Entregados"], ["rejected", "Rechazados"], ["cancelled", "Cancelados"], ["all", "Todos"]].map(function (x) {
          return '<button type="button" class="chip" data-s="' + x[0] + '" aria-pressed="' + (st.s === x[0]) + '">' + x[1] + '<span class="n">' + (cnt[x[0]] || 0) + "</span></button>";
        }).join("");
        var q = st.q.toLowerCase();
        tbl.set(list.filter(function (o) {
          if (st.s === "active" ? ACTIVE.indexOf(o.status) < 0 : st.s !== "all" && o.status !== st.s) return false;
          return !q || [o.name, o.phone, o.email, O.code(o.id), (o.pay || {}).ref].join(" ").toLowerCase().indexOf(q) > -1;
        }));
      }
      host.addEventListener("click", function (e) {
        var s = e.target.closest("[data-s]"); if (s) { e.preventDefault(); st.s = s.dataset.s; paint(); return; }
        var o = e.target.closest("[data-open]"); if (o) AD.openOrder(o.dataset.open);
      });
      AD.$("#o-q").oninput = AD.debounce(function () { st.q = AD.$("#o-q").value.trim(); paint(); }, 150);
      AD.$("#o-xls").onclick = function () {
        AD.xlsx("pedidos", [{ name: "Pedidos", rows: tbl.rows(), cols: [{ k: "code", l: "Código", v: function (o) { return O.code(o.id); } }, { k: "at", l: "Fecha", v: function (o) { var d = AD.tsDate(o.createdAt); return d ? d.toLocaleString("es-DO") : ""; }, w: 20 },
          { k: "name", l: "Cliente", w: 24 }, { k: "phone", l: "Teléfono" }, { k: "mode", l: "Modalidad", v: function (o) { return O.MODES[o.mode] || o.mode; } }, { k: "total", l: "Total (RD$)" }, { k: "payNow", l: "Pagado (RD$)" },
          { k: "method", l: "Método", v: function (o) { return O.METHODS[o.method] || o.method; } }, { k: "ref", l: "Referencia", v: function (o) { return (o.pay || {}).ref || ""; } }, { k: "balance", l: "Saldo (RD$)" },
          { k: "bp", l: "Saldo cobrado", v: function (o) { return o.balance ? (o.balancePaid ? "Sí" : "No") : ""; } }, { k: "status", l: "Estado", v: stLabel }] }]);
      };
      paint(); AD.watch(["orders"], paint);
    }
  });

  /* ---------- cocina ---------- */
  AD.view("cocina", {
    title: "Cocina", icon: "utensils", group: "Operación", perm: "kitchen",
    render: function (host) {
      function paint() {
        var t = AD.today(), tm = B.addDays(t, 1), orders = (AD.live.orders || []).filter(function (o) { return ["confirmed", "preparing", "ready"].indexOf(o.status) > -1; }).sort(function (a, b) { return ms(a.createdAt) - ms(b.createdAt); });
        var res = (AD.live.res || []).filter(function (r) { return (r.date === t || r.date === tm) && ["pending", "confirmed"].indexOf(r.status) > -1 && ((r.dishes || []).length || r.notes); }).sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
        var ev = (AD.live.ev || []).filter(function (e) { return e.date >= t && e.date <= B.addDays(t, 14) && ["confirmed", "quoted", "review"].indexOf(e.status) > -1; }).sort(function (a, b) { return a.start - b.start; });
        var totals = {};
        orders.filter(function (o) { return o.status !== "ready"; }).forEach(function (o) { (o.items || []).forEach(function (i) { totals[i.name] = (totals[i.name] || 0) + i.qty; }); });
        res.filter(function (r) { return r.date === t; }).forEach(function (r) { (r.dishes || []).forEach(function (i) { totals[i.name] = (totals[i.name] || 0) + i.qty; }); });
        var tk = Object.keys(totals).sort(function (a, b) { return totals[b] - totals[a]; });
        host.innerHTML = '<div class="kpis">' +
          '<div class="kpi' + (orders.filter(function (o) { return o.status === "confirmed"; }).length ? " kpi--hot" : "") + '"><div class="kpi__l">' + AD.icon("bell") + 'Por empezar</div><div class="kpi__v">' + orders.filter(function (o) { return o.status === "confirmed"; }).length + '</div><div class="kpi__s">pedidos pagados</div></div>' +
          '<div class="kpi"><div class="kpi__l">' + AD.icon("utensils") + 'Preparando</div><div class="kpi__v">' + orders.filter(function (o) { return o.status === "preparing"; }).length + '</div><div class="kpi__s">pedidos en cocina</div></div>' +
          '<div class="kpi"><div class="kpi__l">' + AD.icon("calendar") + 'Mesas con platos</div><div class="kpi__v">' + res.filter(function (r) { return r.date === t; }).length + '</div><div class="kpi__s">reservaciones de hoy</div></div>' +
          '<div class="kpi"><div class="kpi__l">' + AD.icon("party") + 'Eventos</div><div class="kpi__v">' + ev.length + '</div><div class="kpi__s">próximos 14 días</div></div></div>' +
          (tk.length ? '<div class="card"><div class="card__h"><div><h2>Total a preparar ahora</h2><p>Pedidos en curso y mesas de hoy</p></div></div><div class="ktot">' + tk.map(function (n) { return '<span class="ktot__i"><b>' + totals[n] + "×</b>" + AD.esc(n) + "</span>"; }).join("") + "</div></div>" : "") +
          '<div class="card"><div class="card__h"><div><h2>Pedidos</h2><p>Solo aparecen con el pago verificado</p></div></div>' + (orders.length ? '<div class="ktickets">' + orders.map(function (o) {
            return '<article class="kt kt--' + o.status + '"><header><b>#' + O.code(o.id) + "</b>" + pill(o) + "</header><small>" + AD.esc(O.MODES[o.mode] || o.mode) + " · " + (o.time ? "para las " + AD.esc(o.time) : "lo antes posible") + " · " + AD.esc(String(o.name).split(" ")[0]) + "</small>" +
              "<ul>" + (o.items || []).map(function (i) { return "<li><b>" + i.qty + "×</b> " + AD.esc(i.name) + "</li>"; }).join("") + "</ul>" + (o.note ? '<p class="kt__note">' + AD.icon("info") + AD.esc(o.note) + "</p>" : "") +
              '<footer><button class="b b--sm" data-open="' + AD.esc(o.id) + '">Ver</button>' + (o.status === "confirmed" ? '<button class="b b--sm b--ok" data-k="preparing" data-id="' + AD.esc(o.id) + '">Empezar</button>' : o.status === "preparing" ? '<button class="b b--sm b--ok" data-k="ready" data-id="' + AD.esc(o.id) + '">Listo</button>' : "") + "</footer></article>";
          }).join("") + "</div>" : '<div class="empty">' + AD.icon("check") + " No hay pedidos por preparar.</div>") + "</div>" +
          '<div class="cards"><div class="card"><div class="card__h"><div><h2>Platos de reservaciones</h2><p>Hoy y mañana · solo los que eligieron platos o dejaron notas</p></div></div>' + (res.length ? '<ul class="rows">' + res.map(function (r) {
            return '<li class="row row--top"><span class="row__t">' + (r.date === t ? "Hoy" : "Mañana") + "<br>" + B.time12(r.time) + '</span><span class="row__main"><b>' + r.party + " pers. · " + AD.esc(String(r.name).split(" ")[0]) + "</b><small>" + ((r.dishes || []).map(function (d) { return d.qty + "× " + AD.esc(d.name); }).join(", ") || "Sin platos") + "</small>" + (r.notes ? '<small class="kt__note">' + AD.icon("info") + AD.esc(r.notes) + "</small>" : "") + "</span>" + AD.pill(B.RES_STATUS, r.status) + "</li>";
          }).join("") + "</ul>" : '<div class="empty">Sin platos elegidos para hoy ni mañana.</div>') + "</div>" +
          '<div class="card"><div class="card__h"><div><h2>Eventos próximos</h2><p>Para planificar compras y preparación</p></div></div>' + (ev.length ? '<ul class="rows">' + ev.map(function (e) {
            return '<li class="row row--top"><span class="row__t">' + B.shortDate(e.date).replace(/\.$/, "") + "<br>" + B.time12(e.startTime) + '</span><span class="row__main"><b>' + AD.esc(e.type) + " · " + e.guests + " invitados</b><small>" + AD.esc(e.food || "Sin indicaciones de comida") + "</small>" + (e.notes ? '<small class="kt__note">' + AD.icon("info") + AD.esc(e.notes) + "</small>" : "") + "</span>" + AD.pill(B.EVENT_STATUS, e.status) + "</li>";
          }).join("") + "</ul>" : '<div class="empty">Sin eventos en las próximas dos semanas.</div>') + "</div></div>";
      }
      host.addEventListener("click", function (e) {
        var o = e.target.closest("[data-open]"); if (o) { AD.openOrder(o.dataset.open); return; }
        var k = e.target.closest("[data-k]"); if (!k) return;
        var x = find(k.dataset.id); if (!x) return; k.disabled = true;
        AD.orderSet(x, k.dataset.k).then(function () { AD.toast(k.dataset.k === "ready" ? "Pedido listo." : "Pedido en preparación."); }, function (er) { k.disabled = false; AD.fail("kitchen", er); });
      });
      paint(); AD.watch(["orders", "res", "ev"], paint);
      var tick = setInterval(paint, 60000); AD.onLeave(function () { clearInterval(tick); });
    }
  });
})(window.CC = window.CC || {});
