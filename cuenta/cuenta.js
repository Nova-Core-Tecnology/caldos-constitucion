/* Mi cuenta: datos para pedir, reservaciones y eventos en vivo (estado, detalles, cambios y cancelación según la política),
   avisos del restaurante, historial de pedidos y privacidad. */
(function (CC) {
  "use strict";
  CC.page = function () {
    var $ = function (id) { return document.getElementById(id); };
    var B = CC.booking;
    var hero = $("ah"), body = $("abody");
    var MODES = { recoger: "Para recoger", domicilio: "A domicilio", mesa: "Comer aquí" };
    var ACTIVE_R = ["pending", "confirmed"], ACTIVE_E = ["received", "review", "quoted", "confirmed"];
    var S = B.settings(), f = null, subs = [], data = { res: null, ev: null, notes: null }, orders = [];
    var view = { kind: location.hash === "#eventos" ? "ev" : "res", when: "next" };

    function initials(n) { return String(n || "?").trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join("").toUpperCase(); }
    function av(u) { return '<span class="ah__av">' + (u.photo ? '<img src="' + CC.esc(u.photo) + '" alt="" referrerpolicy="no-referrer">' : CC.esc(initials(u.name))) + "</span>"; }
    function when(d) { return d ? d.toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" }) + " · " + d.toLocaleTimeString("es-DO", { hour: "numeric", minute: "2-digit" }) : "Hace un momento"; }
    function tsDate(t) { return t && t.toDate ? t.toDate() : null; }
    function cap(s) { return String(s).replace(/^./, function (c) { return c.toUpperCase(); }); }
    function code(id) { return String(id).split("-").pop().slice(0, 6).toUpperCase(); }
    function pill(map, s) { var x = map[s] || { label: s, tone: "gray" }; return '<span class="st st--' + x.tone + '">' + CC.esc(x.label) + "</span>"; }
    function stopSubs() { subs.forEach(function (u) { try { u(); } catch (e) {} }); subs = []; }

    /* ---------- sin sesión ---------- */
    function guest() {
      stopSubs();
      var on = CC.auth && CC.auth.configured;
      hero.innerHTML =
        '<div class="ah__tx"><span class="ah__k">Tu cuenta</span><h1>Entra a <em>tu mesa</em></h1>' +
        '<p class="lead">Con tu cuenta de Google reservas mesa, solicitas eventos y sigues su estado, y tus favoritos y tu carrito te acompañan en todos tus dispositivos.</p>' +
        (on ? '<button class="ah__google" type="button" data-login><span class="acct-in__g">' + (CC.googleIcon || "") + "</span>Entrar con Google</button>"
            : '<p class="ah__off">' + CC.icon("shield") + "El inicio de sesión con Google se está activando. Mientras tanto, todo se guarda en este dispositivo.</p>") +
        "</div>";
      body.innerHTML =
        '<ul class="perks">' +
        "<li>" + CC.icon("calendar") + "<b>Reservas con confirmación</b><span>Elige día y hora con disponibilidad real y sigue el estado de tu mesa.</span></li>" +
        "<li>" + CC.icon("party") + "<b>Tus eventos</b><span>Solicita tu celebración, recibe la cotización y acéptala desde aquí.</span></li>" +
        "<li>" + CC.icon("heart") + "<b>Favoritos y carrito</b><span>Guarda un plato en el celular y encuéntralo en la computadora.</span></li>" +
        "<li>" + CC.icon("bell") + "<b>Avisos al momento</b><span>Te avisamos cuando el restaurante confirme o cambie algo.</span></li></ul>";
    }

    /* ---------- con sesión ---------- */
    function member(u) {
      var p = CC.auth.profile();
      hero.innerHTML =
        '<div class="ah__me">' + av(u) + '<div class="ah__tx"><span class="ah__k">Mi cuenta</span><h1>Hola, <em>' + CC.esc(String(u.name).split(" ")[0]) + "</em></h1>" +
        '<p class="ah__mail">' + CC.esc(u.email) + '</p><p class="ah__sync"><span></span>Cuenta de Google conectada · favoritos y carrito sincronizados</p></div></div>' +
        '<div class="ah__acts"><a class="btn btn--gold" href="../reservas/reservas.html">' + CC.icon("calendar") + 'Reservar mesa</a><a class="btn btn--ghost" href="../eventos/eventos.html">' + CC.icon("party") + 'Evento</a><button class="btn btn--ghost" type="button" data-logout>Cerrar sesión</button></div>';
      var favs = CC.store.favCount(), items = CC.store.cartCount(), total = CC.store.total();
      body.innerHTML =
        '<div class="agrid">' +
        '<section class="acard acard--stats" aria-labelledby="st-t"><h2 id="st-t">Tu mesa ahora</h2><ul class="stats">' +
        '<li><a href="#reservas" data-go="res"><span class="stats__ic">' + CC.icon("calendar") + '</span><b id="n-res">–</b><small>reservaciones próximas</small></a></li>' +
        '<li><a href="#reservas" data-go="ev"><span class="stats__ic">' + CC.icon("party") + '</span><b id="n-ev">–</b><small>eventos en curso</small></a></li>' +
        '<li><a href="../favoritos/favoritos.html"><span class="stats__ic">' + CC.icon("heart") + "</span><b>" + favs + "</b><small>" + (favs === 1 ? "favorito" : "favoritos") + "</small></a></li>" +
        '<li><a href="../carrito/carrito.html"><span class="stats__ic">' + CC.icon("cart") + "</span><b>" + items + "</b><small>" + (items ? "en el carrito · " + CC.money(total) : "en el carrito") + "</small></a></li></ul></section>" +
        '<section class="acard" aria-labelledby="pf-t"><h2 id="pf-t">Tus datos</h2><p class="acard__sub">Los usamos para rellenar pedidos, reservas y eventos. Solo tú y el restaurante los ven.</p>' +
        '<form class="form-grid pform" id="pform"><div class="field"><label>Nombre</label><input value="' + CC.esc(u.name) + '" disabled></div>' +
        '<div class="field"><label>Correo</label><input value="' + CC.esc(u.email) + '" disabled></div>' +
        '<div class="field"><label for="p-phone">Teléfono / WhatsApp</label><input id="p-phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="30" placeholder="809 555 1234" value="' + CC.esc(p.phone || "") + '"></div>' +
        '<div class="field field--full"><label for="p-addr">Dirección de entrega <span class="opt">(opcional)</span></label><input id="p-addr" autocomplete="street-address" maxlength="200" placeholder="Calle, número, sector y una referencia" value="' + CC.esc(p.address || "") + '"></div>' +
        '<div class="field--full pform__act"><button class="btn" type="submit" id="p-save">Guardar mis datos</button></div></form></section>' +
        "</div>" +
        '<section class="acard" id="reservas" aria-labelledby="r-t"><span id="eventos" class="anchor"></span><div class="hist__head"><h2 id="r-t">Mis reservaciones y eventos</h2>' +
        '<div class="htabs" role="tablist" aria-label="Tipo"><button type="button" role="tab" data-kind="res">Reservaciones</button><button type="button" role="tab" data-kind="ev">Eventos</button></div></div>' +
        '<div class="rbar"><div class="seg" role="group" aria-label="Mostrar"><button type="button" data-when="next">Próximas</button><button type="button" data-when="past">Anteriores</button></div>' +
        '<a class="btn btn--sm" id="r-new" href="../reservas/reservas.html">' + CC.icon("plus") + "Nueva</a></div>" +
        '<div id="rlist" class="rlist"><p class="hlist__loading">Cargando…</p></div></section>' +
        '<section class="acard" id="avisos" aria-labelledby="n-t"><div class="hist__head"><h2 id="n-t">Avisos <span class="nbadge" id="n-unread" hidden></span></h2>' +
        '<button class="btn btn--sm btn--outline" type="button" id="n-all" hidden>' + CC.icon("check") + "Marcar todo como leído</button></div>" +
        '<ul class="nlist" id="nlist"><li class="hlist__loading">Cargando…</li></ul></section>' +
        '<section class="acard hist" id="historial" aria-labelledby="h-t"><div class="hist__head"><h2 id="h-t">Tus pedidos</h2></div>' +
        '<div class="hlist" id="hlist"><p class="hlist__loading">Cargando…</p></div></section>' +
        '<section class="acard danger" aria-labelledby="dz-t"><div><h2 id="dz-t">Privacidad</h2><p>Puedes borrar tu cuenta y todo lo guardado en ella cuando quieras. Tu cuenta de Google no se ve afectada.</p></div>' +
        '<button class="btn btn--outline btn--sm" type="button" id="del">' + CC.icon("trash") + "Borrar mi cuenta</button></section>";

      $("pform").addEventListener("submit", function (e) {
        e.preventDefault();
        var b = $("p-save"); b.disabled = true;
        CC.auth.saveProfile({ phone: $("p-phone").value.trim(), address: $("p-addr").value.trim() })
          .then(function () { CC.toast("Datos guardados"); }, function () { CC.toast("No se pudieron guardar tus datos.", "error"); })
          .then(function () { b.disabled = false; });
      });
      $("del").addEventListener("click", function () { var d = $("del-dlg"); if (d.showModal) d.showModal(); });
      paintTabs();
      loadOrders();
      live(u);
      if (/^#(reservas|eventos|avisos|historial)$/.test(location.hash)) setTimeout(function () { var t = $(location.hash.slice(1)); if (t) t.scrollIntoView({ behavior: "smooth" }); }, 250);
    }

    /* ---------- datos en vivo ---------- */
    function live(u) {
      stopSubs(); data = { res: null, ev: null, notes: null };
      CC.auth.fire().then(function (x) {
        f = x;
        f.db.doc("settings/restaurant").get().then(function (d) { if (d.exists) { S = B.settings(d.data()); paintList(); } }).catch(function () {});
        function on(col, k) {
          subs.push(f.db.collection(col).where("uid", "==", u.uid).onSnapshot(function (q) {
            data[k] = q.docs.map(function (d) { var o = d.data(); o.id = d.id; return o; });
            paintCounts(); if (k === "notes") paintNotes(); else paintList();
          }, function (e) {
            CC.logError("cuenta." + col, e);
            data[k] = data[k] || [];
            if (k === "notes") $("nlist").innerHTML = '<li class="hlist__empty">No se pudieron cargar tus avisos ahora.</li>';
            else { var l = $("rlist"); if (l) l.innerHTML = '<p class="hlist__empty">No se pudo cargar esta lista ahora. Revisa tu conexión.</p>'; }
          }));
        }
        on("reservations", "res"); on("events", "ev"); on("notifications", "notes");
      }).catch(function (e) { CC.logError("cuenta.fire", e); var l = $("rlist"); if (l) l.innerHTML = '<p class="hlist__empty">No se pudo conectar ahora. Revisa tu conexión.</p>'; });
    }
    function upcoming(x, isEv) {
      var act = (isEv ? ACTIVE_E : ACTIVE_R).indexOf(x.status) > -1;
      var end = isEv ? B.startMs(x.date, x.endTime, S.tzOffsetMin) : x.start + S.durationMinutes * 60000;
      return act && end > Date.now();
    }
    function paintCounts() {
      var a = $("n-res"), b = $("n-ev");
      if (a && data.res) a.textContent = data.res.filter(function (r) { return upcoming(r, false); }).length;
      if (b && data.ev) b.textContent = data.ev.filter(function (e) { return upcoming(e, true); }).length;
    }
    function paintTabs() {
      document.querySelectorAll("[data-kind]").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.kind === view.kind)); });
      document.querySelectorAll("[data-when]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.when === view.when)); });
      var n = $("r-new"); if (n) n.href = view.kind === "ev" ? "../eventos/eventos.html" : "../reservas/reservas.html";
    }

    /* ---------- tarjetas ---------- */
    function changeNote(c, isEv) {
      if (!c || !c.type) return "";
      var t = c.type === "cancel" ? "Pediste cancelar" : "Pediste un cambio" + (c.date ? " a " + B.shortDate(c.date) : "") +
        (c.time || c.startTime ? ", " + B.time12(c.time || c.startTime) : "") + (c.party || c.guests ? ", " + (c.party || c.guests) + (isEv ? " invitados" : " pers.") : "");
      return '<p class="rcard__chg">' + CC.icon("clock") + "<span>" + CC.esc(t) + " · el restaurante lo está revisando.</span></p>";
    }
    function resCard(r) {
      var act = upcoming(r, false), s = B.RES_STATUS[r.status] || {};
      var tables = (r.tableNames && r.tableNames.length) ? r.tableNames.join(" + ") : (r.status === "confirmed" ? "Asignada" : "Se asigna al confirmar");
      var dishes = r.dishes || [];
      return '<li class="rcard rcard--' + (s.tone || "gray") + '" data-id="' + CC.esc(r.id) + '" data-k="res">' +
        '<div class="rcard__top">' + pill(B.RES_STATUS, r.status) + '<span class="rcard__code">#' + code(r.id) + "</span></div>" +
        '<h3 class="rcard__t">' + cap(B.longDate(r.date)) + "</h3>" +
        '<ul class="rcard__meta"><li>' + CC.icon("clock") + B.time12(r.time) + "</li><li>" + CC.icon("users") + r.party + (r.party === 1 ? " persona" : " personas") + "</li>" +
        "<li>" + CC.icon("table") + CC.esc(tables) + "</li>" + (r.occasion ? "<li>" + CC.icon("star") + CC.esc(r.occasion) + "</li>" : "") + "</ul>" +
        (s.hint ? '<p class="rcard__hint">' + CC.esc(s.hint) + "</p>" : "") +
        (r.staffNote ? '<p class="rcard__msg">' + CC.icon("chat") + "<span><b>Mensaje del restaurante:</b> " + CC.esc(r.staffNote) + "</span></p>" : "") +
        (act ? changeNote(r.change, false) : "") +
        (dishes.length ? '<details class="rcard__dish"><summary>' + CC.icon("utensils") + dishes.length + (dishes.length === 1 ? " plato" : " platos") + " para tu mesa · aprox. " + CC.money(r.dishesTotal || 0) + "</summary><ul>" +
          dishes.map(function (d) { return "<li><span>" + d.qty + "× " + CC.esc(d.name) + "</span><b>" + CC.money(d.price * d.qty) + "</b></li>"; }).join("") +
          '</ul><p class="rcard__fine">Precios del momento de la reserva. No es un pedido ni un pago.</p></details>' : "") +
        (r.notes ? '<p class="rcard__note">“' + CC.esc(r.notes) + "”</p>" : "") +
        '<div class="rcard__acts">' +
        (act && !(r.change && r.change.type) ? '<button type="button" class="btn btn--sm btn--outline" data-act="modify">' + CC.icon("edit") + "Modificar</button>" +
          '<button type="button" class="btn btn--sm btn--outline rcard__cancel" data-act="cancel">' + CC.icon("close") + "Cancelar</button>" : "") +
        '<button type="button" class="btn btn--sm btn--link" data-act="log">' + CC.icon("clock") + "Historial</button></div></li>";
    }
    function evCard(e) {
      var act = upcoming(e, true), s = B.EVENT_STATUS[e.status] || {}, q = e.quote;
      return '<li class="rcard rcard--' + (s.tone || "gray") + '" data-id="' + CC.esc(e.id) + '" data-k="ev">' +
        '<div class="rcard__top">' + pill(B.EVENT_STATUS, e.status) + '<span class="rcard__code">#' + code(e.id) + "</span></div>" +
        '<h3 class="rcard__t">' + CC.esc(e.title || e.type) + "</h3>" +
        '<ul class="rcard__meta"><li>' + CC.icon("calendar") + cap(B.shortDate(e.date)) + "</li><li>" + CC.icon("clock") + B.time12(e.startTime) + " – " + B.time12(e.endTime) + "</li>" +
        "<li>" + CC.icon("users") + e.guests + " invitados</li><li>" + CC.icon("pin") + (e.space === "exclusivo" ? "Local exclusivo" : "Área reservada") + "</li>" +
        (e.title ? "<li>" + CC.icon("party") + CC.esc(e.type) + "</li>" : "") + "</ul>" +
        (s.hint ? '<p class="rcard__hint">' + CC.esc(s.hint) + "</p>" : "") +
        (q && (q.amount || q.details) ? '<div class="rquote"><div class="rquote__h"><span>Cotización</span>' + (q.amount ? "<b>" + CC.money(q.amount) + "</b>" : "") + "</div>" +
          (q.details ? "<p>" + CC.esc(q.details) + "</p>" : "") +
          ((q.deposit || q.validUntil) ? '<p class="rquote__f">' + (q.deposit ? "Depósito para apartar: " + CC.money(q.deposit) : "") + (q.deposit && q.validUntil ? " · " : "") + (q.validUntil ? "Válida hasta " + B.shortDate(q.validUntil) : "") + "</p>" : "") +
          (e.status === "quoted" && !e.quoteAccepted ? '<button type="button" class="btn btn--sm" data-act="accept">' + CC.icon("check") + "Aceptar cotización</button>" : "") +
          (e.quoteAccepted && e.status === "quoted" ? '<p class="rquote__ok">' + CC.icon("check") + "Aceptaste la cotización. El restaurante confirmará la fecha.</p>" : "") + "</div>" : "") +
        (e.staffNote ? '<p class="rcard__msg">' + CC.icon("chat") + "<span><b>Mensaje del restaurante:</b> " + CC.esc(e.staffNote) + "</span></p>" : "") +
        (act ? changeNote(e.change, true) : "") +
        (e.notes ? '<p class="rcard__note">“' + CC.esc(e.notes) + "”</p>" : "") +
        '<div class="rcard__acts">' +
        (act && !(e.change && e.change.type) ? '<button type="button" class="btn btn--sm btn--outline" data-act="modify">' + CC.icon("edit") + "Pedir cambio</button>" +
          '<button type="button" class="btn btn--sm btn--outline rcard__cancel" data-act="cancel">' + CC.icon("close") + "Cancelar</button>" : "") +
        '<button type="button" class="btn btn--sm btn--link" data-act="log">' + CC.icon("clock") + "Historial</button></div></li>";
    }
    function paintList() {
      var box = $("rlist"); if (!box) return;
      var isEv = view.kind === "ev", list = isEv ? data.ev : data.res;
      if (!list) { box.innerHTML = '<p class="hlist__loading">Cargando…</p>'; return; }
      var next = view.when === "next";
      var rows = list.filter(function (x) { return upcoming(x, isEv) === next; })
        .sort(function (a, b) { return next ? a.start - b.start : b.start - a.start; });
      if (!rows.length) {
        box.innerHTML = '<div class="hlist__empty">' + CC.icon(isEv ? "party" : "calendar") + "<p>" +
          (next ? (isEv ? "No tienes eventos en curso." : "No tienes reservaciones próximas.") : "Aún no hay nada anterior aquí.") + "</p>" +
          (next ? '<a class="btn btn--sm" href="' + (isEv ? "../eventos/eventos.html" : "../reservas/reservas.html") + '">' + (isEv ? "Solicitar evento" : "Reservar mesa") + "</a>" : "") + "</div>";
        return;
      }
      var open = {}; box.querySelectorAll("details[open]").forEach(function (d) { var li = d.closest("[data-id]"); if (li) open[li.dataset.id] = 1; });
      box.innerHTML = '<ul class="rcards">' + rows.map(isEv ? evCard : resCard).join("") + "</ul>";
      Object.keys(open).forEach(function (id) { var d = box.querySelector('[data-id="' + id + '"] details'); if (d) d.open = true; });
    }

    /* ---------- avisos ---------- */
    function paintNotes() {
      var box = $("nlist"); if (!box || !data.notes) return;
      var list = data.notes.slice().sort(function (a, b) { return (tsDate(b.at) || new Date()) - (tsDate(a.at) || new Date()); }).slice(0, 20);
      var unread = data.notes.filter(function (n) { return !n.read; }).length, ub = $("n-unread");
      ub.hidden = !unread; ub.textContent = unread; $("n-all").hidden = !unread;
      box.innerHTML = list.length ? list.map(function (n) {
        var isEv = /^events\//.test(n.ref || "");
        return '<li class="nitem' + (n.read ? "" : " is-new") + '" data-n="' + CC.esc(n.id) + '"><span class="nitem__ic">' + CC.icon(isEv ? "party" : n.kind === "self" ? "check" : "bell") + "</span>" +
          "<div><b>" + CC.esc(n.title || "Aviso") + "</b>" + (n.body ? "<p>" + CC.esc(n.body) + "</p>" : "") + "<time>" + when(tsDate(n.at)) + "</time></div>" +
          '<button type="button" class="nitem__x" data-ndel aria-label="Borrar aviso">' + CC.icon("close") + "</button></li>";
      }).join("") : '<li class="hlist__empty">' + CC.icon("bell") + "<p>Aquí verás los avisos de tus reservaciones y eventos.</p></li>";
    }
    function markRead(ids) {
      if (!f || !ids.length) return;
      var b = f.db.batch();
      ids.forEach(function (id) { b.update(f.db.collection("notifications").doc(id), { read: true }); });
      b.commit().catch(function (e) { CC.logError("cuenta.avisos", e); });
    }

    /* ---------- pedidos ---------- */
    function loadOrders() {
      CC.auth.history("orders").then(function (r) { orders = r; paintOrders(); },
        function () { var h = $("hlist"); if (h) h.innerHTML = '<p class="hlist__empty">No se pudo cargar tu historial ahora.</p>'; });
    }
    function paintOrders() {
      var h = $("hlist"); if (!h) return;
      if (!orders.length) {
        h.innerHTML = '<div class="hlist__empty">' + CC.icon("chat") + "<p>Aún no has enviado pedidos con tu cuenta.</p>" + '<a class="btn btn--sm" href="../menu/menu.html">Ver el menú</a></div>';
        return;
      }
      h.innerHTML = '<ul class="hcards">' + orders.map(function (x, i) {
        var items = (x.items || []).map(function (it) { return it.qty + "× " + CC.esc(it.name); }).join(" · ");
        return '<li class="hcard"><div class="hcard__top"><span class="hcard__tag">' + CC.esc(MODES[x.mode] || "Pedido") + '</span><time>' + when(x.when) + "</time></div>" +
          '<p class="hcard__items">' + items + '</p><div class="hcard__foot"><b>' + CC.money(x.total || 0) + "</b>" +
          '<button class="btn btn--sm" type="button" data-again="' + i + '">' + CC.icon("cart") + "Repetir pedido</button></div></li>";
      }).join("") + "</ul>";
    }

    /* ---------- diálogo de acciones (cancelar, modificar, historial) ---------- */
    var dlg = document.createElement("dialog");
    dlg.className = "cdlg rdlg"; dlg.setAttribute("aria-labelledby", "rd-t");
    document.body.appendChild(dlg);
    dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.closest("[data-x]")) dlg.close(); });
    function find(k, id) { return ((k === "ev" ? data.ev : data.res) || []).filter(function (x) { return x.id === id; })[0]; }
    function logEntry(ref, text, action) {
      return [ref.collection("log").doc(), { at: f.fb.firestore.FieldValue.serverTimestamp(), by: CC.auth.user().uid, who: "cliente", action: action, text: text }];
    }
    function commit(k, x, patch, logText, action, okMsg) {
      var ref = f.db.collection(k === "ev" ? "events" : "reservations").doc(x.id), b = f.db.batch(), le = logEntry(ref, logText, action);
      b.update(ref, patch); b.set(le[0], le[1]);
      return b.commit().then(function () { dlg.close(); CC.toast(okMsg); }, function (e) {
        CC.logError("cuenta." + action, e);
        var m = dlg.querySelector(".rdlg__err");
        if (m) { m.textContent = e && e.code === "permission-denied" ? "No se pudo: el plazo de la política cambió o el estado ya no lo permite. Recarga la página." : "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo."; m.hidden = false; }
        dlg.querySelectorAll("button").forEach(function (bt) { bt.disabled = false; });
      });
    }
    function openCancel(k, x) {
      var isEv = k === "ev", rule = isEv ? B.canClientCancelEvent(S, x) : B.canClientCancel(S, x);
      var ts = f.fb.firestore.FieldValue.serverTimestamp();
      dlg.innerHTML = '<span class="cdlg__ic">' + CC.icon("close") + '</span><h2 id="rd-t">' + (rule.direct ? "¿Cancelar " + (isEv ? "este evento" : "esta reservación") + "?" : "Pedir la cancelación") + "</h2>" +
        "<p>" + (rule.direct ? (x.status === "confirmed" ? "Estás dentro del plazo de la política: se cancela sin costo y la mesa queda libre para otros clientes." : "Todavía no estaba confirmada: se cancela al momento.")
          : CC.esc(rule.reason || "El restaurante revisará tu solicitud.")) + "</p>" +
        (rule.direct ? "" : '<div class="field"><label for="rd-why">Motivo <span class="opt">(opcional)</span></label><textarea id="rd-why" maxlength="300" rows="2"></textarea></div>') +
        '<p class="rdlg__err bsend__err" role="alert" hidden></p>' +
        '<div class="cdlg__act"><button type="button" class="btn btn--outline btn--sm" data-x>Volver</button><button type="button" class="btn btn--sm" id="rd-ok">' + (rule.direct ? "Sí, cancelar" : "Enviar solicitud") + "</button></div>";
      CC.icons(dlg); dlg.showModal();
      $("rd-ok").onclick = function () {
        this.disabled = true;
        if (rule.direct) commit(k, x, { status: "cancelled", cancelledBy: "client", cancelledAt: ts, needsRelease: x.status === "confirmed", updatedAt: ts }, "Cancelada por el cliente", "cancelled", "Cancelada");
        else commit(k, x, { change: { type: "cancel", notes: ($("rd-why").value || "").trim().slice(0, 300), at: ts }, updatedAt: ts }, "El cliente pidió cancelar", "change-requested", "Solicitud enviada al restaurante");
      };
    }
    function openModify(k, x) {
      var isEv = k === "ev", ts = f.fb.firestore.FieldValue.serverTimestamp();
      var today = B.nowLocal(S.tzOffsetMin).date, min = isEv ? B.addDays(today, S.eventMinNoticeDays) : today, max = B.addDays(today, isEv ? 364 : S.maxAdvanceDays);
      var opts = function (list, sel) { return list.map(function (t) { return '<option value="' + t + '"' + (t === sel ? " selected" : "") + ">" + B.time12(t) + "</option>"; }).join(""); };
      var startList = isEv ? B.times(Object.assign({}, S, { lastSeating: B.hhmm(B.min(S.closeTime) - 60) })) : B.times(S);
      var endList = []; for (var m = B.min(S.openTime) + 60; m <= B.min(S.closeTime); m += S.slotMinutes) endList.push(B.hhmm(m));
      dlg.innerHTML = '<span class="cdlg__ic cdlg__ic--ok">' + CC.icon("edit") + '</span><h2 id="rd-t">' + (isEv ? "Pedir un cambio" : "Modificar reservación") + "</h2>" +
        "<p>El restaurante revisará la disponibilidad y te avisará. Mientras tanto, tu " + (isEv ? "solicitud" : "reservación") + " sigue como está.</p>" +
        '<div class="form-grid rdlg__f"><div class="field"><label for="rd-date">Día</label><input type="date" id="rd-date" min="' + min + '" max="' + max + '" value="' + x.date + '"></div>' +
        '<div class="field"><label for="rd-time">' + (isEv ? "Inicio" : "Hora") + '</label><select id="rd-time">' + opts(startList, isEv ? x.startTime : x.time) + "</select></div>" +
        (isEv ? '<div class="field"><label for="rd-end">Fin</label><select id="rd-end">' + opts(endList, x.endTime) + "</select></div>" : "") +
        '<div class="field"><label for="rd-n">' + (isEv ? "Invitados" : "Personas") + '</label><input type="number" id="rd-n" min="' + (isEv ? S.eventMinGuests : 1) + '" max="' + (isEv ? S.capacity : S.maxParty) + '" value="' + (isEv ? x.guests : x.party) + '"></div>' +
        '<div class="field field--full"><label for="rd-notes">Comentario <span class="opt">(opcional)</span></label><textarea id="rd-notes" maxlength="300" rows="2"></textarea></div></div>' +
        '<p class="rdlg__err bsend__err" role="alert" hidden></p>' +
        '<div class="cdlg__act"><button type="button" class="btn btn--outline btn--sm" data-x>Volver</button><button type="button" class="btn btn--sm" id="rd-ok">Enviar cambio</button></div>';
      CC.icons(dlg); dlg.showModal();
      $("rd-ok").onclick = function () {
        var d = $("rd-date").value, t = $("rd-time").value, n = Math.round(Number($("rd-n").value)), err = dlg.querySelector(".rdlg__err");
        var lo = isEv ? S.eventMinGuests : 1, hi = isEv ? S.capacity : S.maxParty, end = isEv ? $("rd-end").value : "";
        var msg = !d || d < min || d > max ? "Elige un día entre " + B.shortDate(min) + " y " + B.shortDate(max) + "."
          : !B.isOpenDate(S, d) ? "Ese día el restaurante está cerrado."
          : !(n >= lo && n <= hi) ? "Indica entre " + lo + " y " + hi + "."
          : isEv && end <= t ? "La hora de fin debe ser después del inicio."
          : (!isEv && B.startMs(d, t, S.tzOffsetMin) < Date.now() + S.minNoticeMin * 60000) ? "Esa hora ya pasó o está demasiado cerca." : "";
        if (msg) { err.textContent = msg; err.hidden = false; return; }
        if (d === x.date && t === (isEv ? x.startTime : x.time) && n === (isEv ? x.guests : x.party) && (!isEv || end === x.endTime)) { err.textContent = "No cambiaste nada."; err.hidden = false; return; }
        this.disabled = true;
        var c = isEv ? { type: "modify", date: d, startTime: t, endTime: end, guests: n, notes: $("rd-notes").value.trim().slice(0, 300), at: ts }
                     : { type: "modify", date: d, time: t, party: n, notes: $("rd-notes").value.trim().slice(0, 300), at: ts };
        commit(k, x, { change: c, updatedAt: ts }, "El cliente pidió un cambio", "change-requested", "Cambio enviado al restaurante");
      };
    }
    function openLog(k, x) {
      dlg.innerHTML = '<span class="cdlg__ic cdlg__ic--ok">' + CC.icon("clock") + '</span><h2 id="rd-t">Historial</h2><ol class="rlog" id="rd-log"><li>Cargando…</li></ol>' +
        '<div class="cdlg__act"><button type="button" class="btn btn--sm" data-x>Cerrar</button></div>';
      dlg.showModal();
      f.db.collection(k === "ev" ? "events" : "reservations").doc(x.id).collection("log").get().then(function (q) {
        var rows = q.docs.map(function (d) { return d.data(); }).sort(function (a, b) { return (tsDate(a.at) || 0) - (tsDate(b.at) || 0); });
        $("rd-log").innerHTML = rows.map(function (l) {
          return "<li><b>" + CC.esc(l.text || l.action) + "</b><small>" + when(tsDate(l.at)) + " · " + (l.who === "cliente" ? "Tú" : "Restaurante") + "</small></li>";
        }).join("") || "<li>Sin movimientos.</li>";
      }).catch(function (e) { CC.logError("cuenta.log", e); $("rd-log").innerHTML = "<li>No se pudo cargar el historial.</li>"; });
    }

    /* ---------- clics ---------- */
    body.addEventListener("click", function (e) {
      var go = e.target.closest("[data-go]");
      if (go) { e.preventDefault(); view.kind = go.dataset.go; view.when = "next"; paintTabs(); paintList(); $("reservas").scrollIntoView({ behavior: "smooth" }); return; }
      var k = e.target.closest("[data-kind]"); if (k) { view.kind = k.dataset.kind; paintTabs(); paintList(); return; }
      var w = e.target.closest("[data-when]"); if (w) { view.when = w.dataset.when; paintTabs(); paintList(); return; }
      var a = e.target.closest("[data-act]");
      if (a && f) {
        var li = a.closest("[data-id]"), kk = li.dataset.k, x = find(kk, li.dataset.id); if (!x) return;
        var act = a.dataset.act;
        if (act === "cancel") openCancel(kk, x);
        else if (act === "modify") openModify(kk, x);
        else if (act === "log") openLog(kk, x);
        else if (act === "accept") {
          a.disabled = true;
          commit("ev", x, { quoteAccepted: true, updatedAt: f.fb.firestore.FieldValue.serverTimestamp() }, "El cliente aceptó la cotización", "quote-accepted", "¡Cotización aceptada!")
            .then(function () { a.disabled = false; });
        }
        return;
      }
      if (e.target.closest("#n-all")) { markRead((data.notes || []).filter(function (n) { return !n.read; }).map(function (n) { return n.id; })); return; }
      var nd = e.target.closest("[data-ndel]");
      if (nd && f) { f.db.collection("notifications").doc(nd.closest("[data-n]").dataset.n).delete().catch(function (er) { CC.logError("cuenta.avisos.borrar", er); }); return; }
      var ni = e.target.closest(".nitem.is-new"); if (ni) { markRead([ni.dataset.n]); return; }
      var ag = e.target.closest("[data-again]");
      if (ag) {
        var o = orders[Number(ag.dataset.again)], n = 0;
        (o.items || []).forEach(function (it) { if (CC.getItem(it.id)) { CC.store.add(it.id, it.qty); n += it.qty; } });
        if (n) { CC.toast("Pedido añadido a tu carrito"); setTimeout(function () { location.href = "../carrito/carrito.html"; }, 600); }
        else CC.toast("Esos platos ya no están en la carta.", "error");
      }
    });
    $("del-dlg").addEventListener("close", function () {
      if (this.returnValue !== "ok") return;
      stopSubs();
      CC.auth.deleteData().then(function () { CC.toast("Tu cuenta y tus datos se borraron."); render(); }, function () { CC.toast("No se pudo borrar ahora. Inténtalo de nuevo.", "error"); });
      this.returnValue = "";
    });
    /* Cada minuto: lo que ya pasó se mueve a "Anteriores" */
    setInterval(function () { if (data.res || data.ev) { paintCounts(); paintList(); } }, 60000);

    function render() {
      var u = CC.auth && CC.auth.user();
      if (!CC.auth || (!u && !CC.auth.ready())) {
        hero.innerHTML = '<div class="ah__tx"><span class="ah__k">Tu cuenta</span><h1>Cargando tu mesa…</h1></div>'; body.innerHTML = ""; return;
      }
      if (u) member(u); else guest();
      CC.icons(document);
    }
    if (CC.auth) {
      var last = null;
      CC.auth.onChange(function (u) {
        var k = u ? u.uid : "-";
        if (k !== last || !u) { last = k; render(); return; }
        var p = CC.auth.profile();
        [["p-phone", p.phone], ["p-addr", p.address]].forEach(function (fl) { var i = $(fl[0]); if (i && !i.value && fl[1] && document.activeElement !== i) i.value = fl[1]; });
      });
    }
    CC.store.onChange(function () {
      var l = document.querySelectorAll(".stats li"); if (l.length < 4) return;
      var fv = CC.store.favCount(), n = CC.store.cartCount();
      l[2].querySelector("b").textContent = fv; l[2].querySelector("small").textContent = fv === 1 ? "favorito" : "favoritos";
      l[3].querySelector("b").textContent = n; l[3].querySelector("small").textContent = n ? "en el carrito · " + CC.money(CC.store.total()) : "en el carrito";
    });
    render();
  };
})(window.CC = window.CC || {});
