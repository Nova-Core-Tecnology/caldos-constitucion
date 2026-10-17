/* Arranque: conexión, sesión, datos en vivo (reservaciones, eventos, mesas, bloqueos) y navegación. */
(function (CC) {
  "use strict";
  var AD = window.AD, B = CC.booking;
  var subs = [], started = false;
  AD.S = B.settings();
  AD.settingsExist = false;
  AD.tableById = function (id) { return AD.live.tables.filter(function (t) { return t.id === id; })[0]; };
  /* Rango de datos en vivo: 60 días atrás y 120 hacia delante (los reportes consultan otros rangos aparte) */
  AD.range = function () { var t = AD.today(); return { from: B.addDays(t, -60), to: B.addDays(t, 120) }; };

  function stop() { subs.forEach(function (u) { try { u(); } catch (e) {} }); subs = []; }
  function listen(q, cb, where) {
    subs.push(q.onSnapshot(cb, function (e) {
      AD.logError("live." + where, e);
      AD.$("#live").classList.add("off");
      if (e && e.code === "permission-denied") return;
      AD.toast("Se perdió la conexión en vivo. Recarga la página.", "error");
    }));
  }
  var seen = null;
  function alertNew(list) {
    var pend = list.filter(function (r) { return r.status === "pending"; }).map(function (r) { return r.id; });
    if (seen) {
      var fresh = pend.filter(function (id) { return seen.indexOf(id) < 0; });
      if (fresh.length) {
        AD.toast(fresh.length === 1 ? "Nueva solicitud de reservación" : fresh.length + " nuevas solicitudes de reservación");
        try { if (window.Notification && Notification.permission === "granted" && document.hidden) new Notification("Caldos · Nueva reservación", { body: "Hay " + pend.length + " pendiente(s) por revisar.", icon: "../assets/icons/favicon-192.png" }); } catch (e) {}
      }
    }
    seen = pend;
  }

  AD.start = function () {
    if (started) { AD.go(); return; }
    started = true;
    AD.$("#gate").hidden = true; AD.$("#boot").hidden = true; AD.$("#app").hidden = false;
    var me = AD.me, ini = String(me.name || me.email || "?").trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join("").toUpperCase();
    AD.$("#me").innerHTML = '<div class="me"><span class="me__av">' + AD.esc(ini) + "</span><div><b>" + AD.esc(me.name || me.email) + "</b><small>" + AD.esc(AD.ROLES[me.role] || me.role) + "</small></div></div>" +
      '<div class="me__acts"><a class="b b--sm" href="../inicio/inicio.html" target="_blank" rel="noopener">' + AD.icon("home") + 'Sitio</a><button class="b b--sm" type="button" id="logout">' + AD.icon("logout") + "Salir</button></div>";
    AD.$("#logout").onclick = function () { AD.audit("logout", "admins/" + me.uid, "").then(function () { AD.auth.signOut(); }); };
    AD.$("#menu-btn").onclick = function () { var o = !AD.$("#side").classList.contains("open"); AD.$("#side").classList.toggle("open", o); AD.$("#side-scrim").classList.toggle("open", o); this.setAttribute("aria-expanded", String(o)); };
    AD.$("#side-scrim").onclick = function () { AD.$("#side").classList.remove("open"); this.classList.remove("open"); };
    AD.nav();
    AD.gate.idle();

    var db = AD.db, r = AD.range();
    listen(db.doc("settings/restaurant"), function (d) {
      AD.settingsExist = d.exists; AD.S = B.settings(d.exists ? d.data() : null); AD.emit("settings", AD.S);
    }, "settings");
    listen(db.collection("tables"), function (q) {
      AD.live.tables = q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return (a.order || 0) - (b.order || 0) || a.id.localeCompare(b.id); });
      AD.emit("tables", AD.live.tables);
    }, "tables");
    /* La cocina ve reservaciones y eventos solo para preparar platos (sin acciones) */
    var resOps = AD.can("reservations"), evOps = AD.can("events");
    if (resOps || AD.can("kitchen")) listen(db.collection("reservations").where("date", ">=", r.from).where("date", "<=", r.to), function (q) {
      AD.live.res = q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      if (resOps) { alertNew(AD.live.res); AD.ops.autoRelease(); }
      AD.badges(); AD.emit("res", AD.live.res);
    }, "reservations"); else AD.live.res = [];
    if (evOps || AD.can("kitchen")) listen(db.collection("events").where("date", ">=", B.addDays(AD.today(), -365)), function (q) {
      AD.live.ev = q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      if (evOps && resOps) AD.ops.autoRelease();
      AD.badges(); AD.emit("ev", AD.live.ev);
    }, "events"); else AD.live.ev = [];
    /* Pedidos con pago en línea (últimos 45 días) */
    var seenOrders = null;
    if (AD.can("orders") || AD.can("kitchen")) listen(db.collection("orders").where("createdAt", ">=", new Date(Date.now() - 45 * 86400000)), function (q) {
      AD.live.orders = q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      var rev = AD.live.orders.filter(function (o) { return o.status === "review"; }).map(function (o) { return o.id; });
      if (seenOrders && AD.can("orders")) {
        var fresh = rev.filter(function (id) { return seenOrders.indexOf(id) < 0; });
        if (fresh.length) {
          AD.toast(fresh.length === 1 ? "Nuevo pedido con pago por verificar" : fresh.length + " pedidos nuevos por verificar");
          try { if (window.Notification && Notification.permission === "granted" && document.hidden) new Notification("Caldos · Nuevo pedido", { body: "Hay " + rev.length + " pago(s) por verificar.", icon: "../assets/icons/favicon-192.png" }); } catch (e) {}
        }
      }
      seenOrders = rev;
      AD.badges(); AD.emit("orders", AD.live.orders);
    }, "orders"); else AD.live.orders = [];
    if (AD.can("tables")) listen(db.collection("blocks").where("date", ">=", B.addDays(AD.today(), -7)), function (q) {
      AD.live.blocks = q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      AD.emit("blocks", AD.live.blocks);
    }, "blocks");
    /* Si cambian los permisos o se desactiva la cuenta, el panel se actualiza al momento.
       Firestore no conserva el orden de las claves de un mapa, así que se comparan los permisos activos ordenados. */
    function access(x) { var p = x.perms || {}; return x.role + "|" + Object.keys(p).filter(function (k) { return p[k] === true; }).sort().join(","); }
    listen(db.collection("admins").doc(me.uid), function (d) {
      if (!d.exists || !d.data().active) { AD.toast("Tu acceso fue desactivado.", "error"); AD.auth.signOut(); return; }
      var a = d.data(), before = access(AD.me);
      AD.me = Object.assign({ uid: me.uid }, a);
      if (access(a) !== before) location.reload();
    }, "me");

    window.addEventListener("hashchange", AD.go);
    AD.go();
  };

  /* ---------- inicio ---------- */
  function boot() {
    AD.mountTheme();
    if (!CC.authConfig || !CC.authConfig.projectId) { AD.$("#boot").innerHTML = "<p>Falta la configuración de Firebase.</p>"; return; }
    AD.init().then(function () {
      AD.auth.onAuthStateChanged(function (u) {
        if (!u && started) { stop(); location.reload(); return; }
        if (u && started) return;
        AD.gate.check(u);
      });
    }).catch(function (e) {
      AD.$("#boot").innerHTML = '<p>No se pudo conectar con el servidor. Revisa tu conexión y <a href="">recarga</a>.</p>';
      console.error(e);
    });
  }
  window.addEventListener("online", function () { AD.$("#live").classList.remove("off"); });
  window.addEventListener("offline", function () { AD.$("#live").classList.add("off"); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})(window.CC = window.CC || {});
