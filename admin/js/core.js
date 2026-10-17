/* Núcleo del Panel Administrativo: Firebase, sesión del equipo, permisos, navegación, datos en vivo
   y utilidades de interfaz (diálogos, panel lateral, tablas, exportar, gráficos).
   La seguridad real está en firestore.rules: aunque alguien manipule esta página, el servidor rechaza
   cualquier lectura o escritura para la que su cuenta no tenga permiso. */
(function (CC) {
  "use strict";
  var AD = window.AD = { views: {}, order: [], live: { res: null, ev: null, tables: [], blocks: [] }, bus: {} };
  var SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  var B = CC.booking;

  AD.PERMS = [
    { k: "reservations", l: "Reservaciones" }, { k: "events", l: "Eventos" }, { k: "tables", l: "Mesas y bloqueos" },
    { k: "menu", l: "Menú (platos y precios)" }, { k: "menuStock", l: "Platos agotados" }, { k: "orders", l: "Pedidos y pagos" },
    { k: "kitchen", l: "Vista de cocina" }, { k: "customers", l: "Clientes" }, { k: "reports", l: "Reportes" },
    { k: "settings", l: "Horarios y políticas" }, { k: "audit", l: "Historial y errores" }
  ];
  /* "staff" es el rol antiguo «Personal»: se muestra como Recepcionista */
  AD.ROLES = { owner: "Propietario", admin: "Administrador", reception: "Recepcionista", kitchen: "Encargado de cocina", staff: "Recepcionista" };
  AD.ROLE_INFO = {
    admin: "Operación diaria: reservaciones, eventos, mesas, menú completo, pedidos, clientes y reportes.",
    reception: "Mesas y reservaciones: acepta, modifica o cancela reservaciones, revisa eventos y consulta clientes.",
    kitchen: "Platos y disponibilidad: marca platos agotados y ve lo que hay que preparar (reservaciones, pedidos y eventos)."
  };
  /* Permisos de cada rol (tabla de funciones acordada con el propietario) */
  AD.ROLE_PERMS = {
    admin: { reservations: true, events: true, tables: true, menu: true, menuStock: true, orders: true, kitchen: true, customers: true, reports: true, settings: true, audit: true },
    reception: { reservations: true, events: true, tables: true, customers: true, kitchen: false },
    kitchen: { menuStock: true, kitchen: true }
  };
  AD.isAdmin = function () { return !!AD.me && AD.me.role === "admin"; };
  /* Quién puede gestionar a quién: el propietario a todos (menos a sí mismo); el administrador solo a recepción y cocina */
  AD.canManage = function (role) { return AD.isOwner() ? role !== "owner" : AD.isAdmin() && ["reception", "kitchen", "staff"].indexOf(role) > -1; };
  AD.assignable = function () { return AD.isOwner() ? ["admin", "reception", "kitchen"] : AD.isAdmin() ? ["reception", "kitchen"] : []; };

  /* ---------- utilidades ---------- */
  AD.$ = function (s, r) { return (r || document).querySelector(s); };
  AD.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  AD.esc = CC.esc; AD.icon = CC.icon; AD.money = CC.money;
  AD.toast = function (m, t) { CC.toast(m, t); };
  AD.on = function (k, fn) { (AD.bus[k] = AD.bus[k] || []).push(fn); };
  AD.emit = function (k, v) { (AD.bus[k] || []).slice().forEach(function (fn) { try { fn(v); } catch (e) { console.error(e); } }); };
  AD.off = function (k, fn) { AD.bus[k] = (AD.bus[k] || []).filter(function (x) { return x !== fn; }); };
  AD.today = function () { return B.nowLocal(AD.S.tzOffsetMin).date; };
  AD.tsDate = function (t) { return t && t.toDate ? t.toDate() : (t instanceof Date ? t : null); };
  AD.when = function (t) { var d = AD.tsDate(t); return d ? d.toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" }) + ", " + d.toLocaleTimeString("es-DO", { hour: "numeric", minute: "2-digit" }) : "—"; };
  AD.code = function (id) { return String(id || "").split("-").pop().slice(0, 6).toUpperCase(); };
  AD.pill = function (map, s) { var x = map[s] || { label: s, tone: "gray" }; return '<span class="st st--' + x.tone + '">' + AD.esc(x.label) + "</span>"; };
  AD.ts = function () { return AD.fb.firestore.FieldValue.serverTimestamp(); };
  AD.del = function () { return AD.fb.firestore.FieldValue.delete(); };
  AD.cap = function (s) { return String(s || "").replace(/^./, function (c) { return c.toUpperCase(); }); };
  AD.phoneWa = function (p) {
    var d = String(p || "").replace(/\D/g, "");
    if (d.length === 10 && /^(809|829|849)/.test(d)) d = "1" + d;
    return d.length >= 10 ? "https://wa.me/" + d : "";
  };
  AD.can = function (perm) { return !!AD.me && AD.me.active && (AD.me.role === "owner" || !!(AD.me.perms && AD.me.perms[perm])); };
  AD.isOwner = function () { return !!AD.me && AD.me.role === "owner"; };
  AD.debounce = function (fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms || 200); }; };
  /* Mensaje claro sin detalles técnicos */
  AD.errMsg = function (e) {
    var c = e && e.code;
    if (c === "permission-denied") return "No tienes permiso para esta acción o los datos no son válidos.";
    if (c === "unavailable" || !navigator.onLine) return "Sin conexión. Revisa tu internet e inténtalo de nuevo.";
    if (c === "aborted" || c === "failed-precondition") return "Otro cambio se guardó al mismo tiempo. Vuelve a intentarlo.";
    if (e && e.userMsg) return e.userMsg;
    return "No se pudo completar. Inténtalo de nuevo; si continúa, revisa el registro de errores.";
  };
  AD.fail = function (where, e) {
    if (!(e && e.userMsg)) AD.logError(where, e);
    AD.toast(AD.errMsg(e), "error");
  };
  AD.logError = function (where, e) {
    try {
      if (!AD.db) return;
      AD.db.collection("errorLog").add({
        at: AD.ts(), where: String(where).slice(0, 80), code: String((e && (e.code || e.name)) || "").slice(0, 80),
        message: String((e && e.message) || e || "").replace(/\S+@\S+/g, "[correo]").slice(0, 500), page: "admin", uid: AD.me ? AD.me.uid : ""
      }).catch(function () {});
    } catch (x) {}
  };
  /* Historial administrativo (quién hizo qué y cuándo). Solo se añade; nadie puede editarlo. */
  AD.audit = function (action, target, detail) {
    if (!AD.me) return Promise.resolve();
    return AD.db.collection("auditLog").add({
      at: AD.ts(), uid: AD.me.uid, who: AD.me.name || AD.me.email, role: AD.me.role, action: String(action).slice(0, 60),
      target: String(target || "").slice(0, 120), detail: String(detail || "").slice(0, 500)
    }).catch(function (e) { AD.logError("audit", e); });
  };
  /* Aviso al cliente dentro de la web (lo ve en "Mi cuenta") */
  AD.notifyDoc = function (uid, title, body, ref) {
    if (!uid) return null;
    return [AD.db.collection("notifications").doc(), { uid: uid, kind: "status", at: AD.ts(), read: false, ref: ref || "", title: String(title).slice(0, 120), body: String(body || "").slice(0, 400) }];
  };

  /* ---------- Firebase ---------- */
  function script(src) {
    return new Promise(function (ok, ko) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = function () { ko(new Error("No se pudo cargar " + src)); }; document.head.appendChild(s); });
  }
  AD.init = function () {
    return script(SDK + "firebase-app-compat.js").then(function () {
      return Promise.all([script(SDK + "firebase-auth-compat.js"), script(SDK + "firebase-firestore-compat.js")]);
    }).then(function () {
      var fb = window.firebase, cfg = CC.authConfig;
      var app = fb.initializeApp(CC.useEmulator ? Object.assign({}, cfg, { projectId: "demo-caldos" }) : cfg);
      AD.fb = fb; AD.auth = app.auth(); AD.db = app.firestore();
      if (CC.useEmulator) { AD.auth.useEmulator("http://127.0.0.1:9099"); AD.db.useEmulator("127.0.0.1", 8080); }
      AD.auth.languageCode = "es";
      return AD.auth.setPersistence(fb.auth.Auth.Persistence.SESSION).catch(function () {});
    });
  };
  /* Crea la cuenta de acceso de un miembro del equipo sin cerrar la sesión actual:
     se usa una segunda instancia de Firebase solo en memoria y se descarta al terminar. */
  AD.createAccount = function (email, pass) {
    var fb = AD.fb, cfg = CC.useEmulator ? Object.assign({}, CC.authConfig, { projectId: "demo-caldos" }) : CC.authConfig;
    var app2 = fb.initializeApp(cfg, "alta-" + Date.now()), a2 = app2.auth();
    if (CC.useEmulator) a2.useEmulator("http://127.0.0.1:9099");
    var uid = null;
    return a2.setPersistence(fb.auth.Auth.Persistence.NONE).then(function () { return a2.createUserWithEmailAndPassword(email, pass); })
      .then(function (c) { uid = c.user.uid; return a2.signOut(); })
      .then(function () { return app2.delete(); }, function (e) { return app2.delete().then(function () { throw e; }, function () { throw e; }); })
      .then(function () { return uid; });
  };

  /* ---------- diálogos ---------- */
  AD.modal = function (o) {
    var d = document.createElement("dialog");
    d.className = "dlg" + (o.wide ? " dlg--wide" : "");
    d.innerHTML = '<div class="dlg__h"><h2>' + AD.esc(o.title) + '</h2><button type="button" class="b b--ghost b--icon" data-close aria-label="Cerrar">' + AD.icon("close") + "</button></div>" +
      '<div class="dlg__b">' + (o.body || "") + "</div>" +
      (o.actions && o.actions.length ? '<div class="dlg__f">' + o.actions.map(function (a, i) {
        return '<button type="button" class="b ' + (a.cls || "") + '" data-a="' + i + '">' + (a.icon ? AD.icon(a.icon) : "") + AD.esc(a.label) + "</button>";
      }).join("") + "</div>" : "");
    document.body.appendChild(d);
    var api = {
      el: d, body: d.querySelector(".dlg__b"),
      close: function () { if (d.open) d.close(); },
      busy: function (on) { AD.$$("button", d).forEach(function (b) { b.disabled = on; }); },
      error: function (msg) {
        var e = d.querySelector(".dlg__err");
        if (!e) { e = document.createElement("div"); e.className = "alert alert--err dlg__err"; e.setAttribute("role", "alert"); api.body.insertBefore(e, api.body.firstChild); }
        e.innerHTML = AD.icon("alert") + "<span>" + AD.esc(msg) + "</span>"; e.hidden = !msg;
        if (msg) api.body.scrollTop = 0;
      }
    };
    d.addEventListener("click", function (e) {
      if (e.target === d || e.target.closest("[data-close]")) { api.close(); return; }
      var b = e.target.closest("[data-a]"); if (!b) return;
      var a = o.actions[Number(b.dataset.a)];
      if (a.close) { api.close(); return; }
      if (a.onClick) {
        var r = a.onClick(api);
        if (r && r.then) { api.busy(true); r.then(function (keep) { api.busy(false); if (keep !== true) api.close(); }, function (err) { api.busy(false); if (err !== "keep") api.error(AD.errMsg(err)); if (err && err !== "keep" && !err.userMsg) AD.logError("modal." + o.title, err); }); }
        else if (r !== false) api.close();
      }
    });
    d.addEventListener("close", function () { setTimeout(function () { d.remove(); }, 50); if (o.onClose) o.onClose(); });
    d.showModal();
    if (o.onOpen) o.onOpen(api);
    var first = d.querySelector(".dlg__b input, .dlg__b select, .dlg__b textarea"); if (first && !o.noFocus) first.focus();
    return api;
  };
  AD.confirm = function (title, text, okLabel, danger) {
    return new Promise(function (ok) {
      var done = false;
      AD.modal({ title: title, body: "<p>" + text + "</p>", onClose: function () { if (!done) ok(false); },
        actions: [{ label: "Volver", close: true }, { label: okLabel || "Confirmar", cls: danger ? "b--danger" : "b--p", onClick: function () { done = true; ok(true); } }] });
    });
  };
  /* Panel lateral con el detalle de un registro */
  var drawer, scrim;
  AD.drawer = function (title, html, onClose, key) {
    if (!drawer) {
      drawer = document.createElement("aside"); drawer.className = "drawer"; drawer.setAttribute("role", "dialog"); drawer.setAttribute("aria-modal", "true");
      scrim = document.createElement("div"); scrim.className = "drawer-scrim";
      document.body.appendChild(scrim); document.body.appendChild(drawer);
      scrim.addEventListener("click", AD.closeDrawer);
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && drawer.classList.contains("open") && !document.querySelector("dialog[open]")) AD.closeDrawer(); });
    }
    var keepScroll = drawer.classList.contains("open") && key && drawer._key === key && drawer.querySelector(".dlg__b") ? drawer.querySelector(".dlg__b").scrollTop : 0;
    /* Otro registro: se suelta el anterior (sus escuchas en vivo) */
    if (drawer._onClose && drawer._key !== key) { var prev = drawer._onClose; drawer._onClose = null; prev(); }
    drawer._onClose = onClose; drawer._key = key;
    drawer.innerHTML = '<div class="dlg__h"><h2>' + AD.esc(title) + '</h2><button type="button" class="b b--ghost b--icon" data-dclose aria-label="Cerrar">' + AD.icon("close") + '</button></div><div class="dlg__b"></div>';
    drawer.querySelector(".dlg__b").innerHTML = html;
    drawer.querySelector("[data-dclose]").onclick = AD.closeDrawer;
    var wasOpen = drawer.classList.contains("open");
    drawer.classList.add("open"); scrim.classList.add("open");
    if (keepScroll) drawer.querySelector(".dlg__b").scrollTop = keepScroll;
    if (!wasOpen) drawer.querySelector("[data-dclose]").focus();
    return drawer.querySelector(".dlg__b");
  };
  AD.closeDrawer = function () {
    if (!drawer || !drawer.classList.contains("open")) return;
    drawer.classList.remove("open"); scrim.classList.remove("open"); drawer._key = null;
    if (drawer._onClose) { var f = drawer._onClose; drawer._onClose = null; f(); }
  };
  AD.drawerOpen = function () { return !!drawer && drawer.classList.contains("open"); };

  /* ---------- formularios ---------- */
  AD.val = function (root, name) { var el = root.querySelector('[name="' + name + '"]'); if (!el) return ""; return el.type === "checkbox" ? el.checked : String(el.value).trim(); };
  AD.fieldErr = function (root, name, msg) {
    var el = root.querySelector('[name="' + name + '"]'); if (!el) return !msg;
    var f = el.closest(".f"); if (!f) return !msg;
    f.classList.toggle("err", !!msg);
    var e = f.querySelector(".f__e"); if (!e) { e = document.createElement("span"); e.className = "f__e"; f.appendChild(e); }
    e.textContent = msg || ""; return !msg;
  };

  /* ---------- tablas ordenables con paginación ---------- */
  AD.table = function (host, o) {
    var st = { sort: o.sort || null, dir: o.dir || "asc", page: 0 }, size = o.pageSize || 50, rows = [];
    function cmp(a, b) {
      var col = o.cols.filter(function (c) { return c.k === st.sort; })[0]; if (!col) return 0;
      var va = col.sortVal ? col.sortVal(a) : a[col.k], vb = col.sortVal ? col.sortVal(b) : b[col.k];
      if (va == null) va = ""; if (vb == null) vb = "";
      var r = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "es", { numeric: true });
      return st.dir === "asc" ? r : -r;
    }
    function paint() {
      var list = rows.slice(); if (st.sort) list.sort(cmp);
      var pages = Math.max(1, Math.ceil(list.length / size)); if (st.page >= pages) st.page = pages - 1;
      var view = list.slice(st.page * size, st.page * size + size);
      host.innerHTML = '<div class="tw"><table class="t stack"><thead><tr>' + o.cols.map(function (c) {
        return '<th class="' + (c.cls || "") + '">' + (c.sort === false || !c.l ? AD.esc(c.l || "") : '<button type="button" data-sort="' + c.k + '"' + (st.sort === c.k ? ' data-dir="' + st.dir + '"' : "") + ">" + AD.esc(c.l) + "</button>") + "</th>";
      }).join("") + "</tr></thead><tbody>" + (view.length ? view.map(function (r) {
        return "<tr" + (o.rowAttr ? " " + o.rowAttr(r) : "") + ">" + o.cols.map(function (c) { return '<td class="' + (c.cls || "") + '" data-l="' + AD.esc(c.l || "") + '"><span class="cv">' + (c.html ? c.html(r) : AD.esc(r[c.k] == null ? "" : r[c.k])) + "</span></td>"; }).join("") + "</tr>";
      }).join("") : '<tr><td colspan="' + o.cols.length + '"><div class="empty">' + (o.empty || "Sin resultados.") + "</div></td></tr>") + "</tbody></table></div>" +
        (list.length > size ? '<div class="pager"><span>' + (st.page * size + 1) + "–" + Math.min(list.length, (st.page + 1) * size) + " de " + list.length + '</span><span class="acts"><button type="button" class="b b--sm" data-pg="-1"' + (st.page ? "" : " disabled") + ">Anterior</button>" +
          '<button type="button" class="b b--sm" data-pg="1"' + (st.page < pages - 1 ? "" : " disabled") + ">Siguiente</button></span></div>" : "");
    }
    host.addEventListener("click", function (e) {
      var s = e.target.closest("[data-sort]");
      if (s) { var k = s.dataset.sort; st.dir = st.sort === k && st.dir === "asc" ? "desc" : "asc"; st.sort = k; paint(); return; }
      var p = e.target.closest("[data-pg]"); if (p) { st.page += Number(p.dataset.pg); paint(); host.scrollIntoView({ block: "start" }); }
    });
    return { set: function (r) { rows = r || []; paint(); }, rows: function () { return rows; } };
  };

  /* ---------- exportar ---------- */
  AD.download = function (name, mime, content) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  /* rows: [{...}], cols: [{k, l, v?}] */
  AD.csv = function (name, rows, cols) {
    function cell(v) { v = v == null ? "" : String(v); if (/^[=+\-@]/.test(v)) v = "'" + v; return /[",;\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    var out = [cols.map(function (c) { return cell(c.l); }).join(";")].concat(rows.map(function (r) { return cols.map(function (c) { return cell(c.v ? c.v(r) : r[c.k]); }).join(";"); }));
    AD.download(name + ".csv", "text/csv;charset=utf-8", "﻿" + out.join("\r\n"));
  };
  var xlsxLoad = null;
  AD.xlsx = function (name, sheets) {
    xlsxLoad = xlsxLoad || script("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
    return xlsxLoad.then(function () {
      var X = window.XLSX, wb = X.utils.book_new();
      sheets.forEach(function (s) {
        var data = [s.cols.map(function (c) { return c.l; })].concat(s.rows.map(function (r) {
          return s.cols.map(function (c) { var v = c.v ? c.v(r) : r[c.k]; if (typeof v === "string" && /^[=+\-@]/.test(v)) v = "'" + v; return v == null ? "" : v; });
        }));
        var ws = X.utils.aoa_to_sheet(data);
        ws["!cols"] = s.cols.map(function (c) { return { wch: c.w || Math.max(10, c.l.length + 2) }; });
        X.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
      });
      X.writeFile(wb, name + ".xlsx");
    }).catch(function (e) { xlsxLoad = null; AD.fail("xlsx", e); });
  };

  /* ---------- gráficos (SVG sin dependencias) ---------- */
  AD.barChart = function (data, o) {
    o = o || {};
    if (!data.length || !data.some(function (d) { return d.v; })) return '<div class="empty">Sin datos en este periodo.</div>';
    var W = Math.max(320, data.length * (o.bw || 28)), H = o.h || 180, pad = 26, max = Math.max.apply(null, data.map(function (d) { return d.v; }).concat([1]));
    max = Math.max(4, Math.ceil(max / 4) * 4);
    var step = (W - pad) / data.length, bw = Math.max(6, step * .62), every = Math.ceil(data.length / (o.labels || 8));
    var g = "";
    for (var i = 0; i <= 4; i++) { var y = 10 + (H - 40) * i / 4; g += '<line class="grid-l" x1="' + pad + '" x2="' + W + '" y1="' + y + '" y2="' + y + '"/><text x="0" y="' + (y + 4) + '">' + Math.round(max * (4 - i) / 4) + "</text>"; }
    data.forEach(function (d, i) {
      var h = (H - 40) * d.v / max, x = pad + i * step + (step - bw) / 2, y = 10 + (H - 40) - h;
      g += '<rect class="bar-v' + (d.alt ? " alt" : "") + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, h).toFixed(1) + '" rx="3"><title>' + AD.esc(d.t || d.l) + ": " + d.v + "</title></rect>";
      if (i % every === 0) g += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle">' + AD.esc(d.l) + "</text>";
    });
    return '<div class="chart"><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + AD.esc(o.label || "Gráfico") + '">' + g + "</svg></div>";
  };
  AD.donut = function (parts, o) {
    var tot = parts.reduce(function (a, p) { return a + p.v; }, 0);
    if (!tot) return '<div class="empty">Sin datos en este periodo.</div>';
    var a0 = -Math.PI / 2, r = 54, c = 70, g = "";
    parts.forEach(function (p) {
      if (!p.v) return;
      var a1 = a0 + 2 * Math.PI * p.v / tot, big = a1 - a0 > Math.PI ? 1 : 0;
      if (p.v === tot) g += '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="' + p.c + '" stroke-width="22"/>';
      else g += '<path d="M' + (c + r * Math.cos(a0)) + " " + (c + r * Math.sin(a0)) + " A" + r + " " + r + " 0 " + big + " 1 " + (c + r * Math.cos(a1)) + " " + (c + r * Math.sin(a1)) + '" fill="none" stroke="' + p.c + '" stroke-width="22"><title>' + AD.esc(p.l) + ": " + p.v + "</title></path>";
      a0 = a1;
    });
    g += '<text x="' + c + '" y="' + (c + 2) + '" text-anchor="middle" class="donut-n">' + tot + '</text><text x="' + c + '" y="' + (c + 18) + '" text-anchor="middle">' + AD.esc((o && o.unit) || "total") + "</text>";
    return '<div class="donut"><div class="chart"><svg viewBox="0 0 140 140" role="img" aria-label="' + AD.esc((o && o.label) || "Distribución") + '">' + g + '</svg></div><ul class="legend">' +
      parts.filter(function (p) { return p.v; }).map(function (p) { return '<li><i style="background:' + p.c + '"></i>' + AD.esc(p.l) + " · <b>" + p.v + "</b> (" + Math.round(p.v * 100 / tot) + "%)</li>"; }).join("") + "</ul></div>";
  };
  AD.hbars = function (list) {
    if (!list.length) return '<div class="empty">Sin datos en este periodo.</div>';
    var max = Math.max.apply(null, list.map(function (x) { return x.v; }).concat([1]));
    return '<div class="hbars">' + list.map(function (x) { return '<div class="hbar"><span title="' + AD.esc(x.l) + '">' + AD.esc(x.l) + '</span><i style="width:' + Math.max(2, x.v * 100 / max) + '%"></i><b>' + x.v + "</b></div>"; }).join("") + "</div>";
  };
  AD.TONE = { amber: "#e8a33a", green: "#4f9a5c", blue: "#4a7fd0", gray: "#b3a597", red: "#cc4125", violet: "#8a5bd0" };

  /* ---------- tema claro / oscuro ----------
     Sin elección guardada sigue al sistema; el botón fija claro u oscuro y lo recuerda en este navegador. */
  var THEME_KEY = "cc_admin_theme", sysDark = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  AD.isDark = function () {
    var t = document.documentElement.getAttribute("data-theme");
    return t ? t === "dark" : !!(sysDark && sysDark.matches);
  };
  function paintThemeBtns() {
    var dark = AD.isDark(), label = dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
    AD.$$(".theme-btn").forEach(function (b) { b.setAttribute("aria-label", label); b.title = label; b.setAttribute("aria-pressed", String(dark)); });
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = dark ? "#120a06" : "#2E170E";
  }
  AD.setTheme = function (t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    paintThemeBtns();
  };
  AD.mountTheme = function () {
    var svg = function (cls, d) { return '<svg class="' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>"; };
    var html = '<button type="button" class="theme-btn">' +
      svg("ic-moon", '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>') +
      svg("ic-sun", '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>') + "</button>";
    AD.$$("[data-theme-slot]").forEach(function (s) { s.innerHTML = html; s.firstChild.onclick = function () { AD.setTheme(AD.isDark() ? "light" : "dark"); }; });
    if (sysDark && sysDark.addEventListener) sysDark.addEventListener("change", paintThemeBtns);
    paintThemeBtns();
  };

  /* ---------- navegación ---------- */
  AD.view = function (name, def) { def.name = name; AD.views[name] = def; AD.order.push(name); };
  var current = null, cleanup = [];
  AD.onLeave = function (fn) { cleanup.push(fn); };
  AD.visible = function (v) { return !v.perm || (v.perm === "owner" ? AD.isOwner() : v.perm === "team" ? AD.isOwner() || AD.isAdmin() : [].concat(v.perm).some(AD.can)); };
  AD.nav = function () {
    var groups = {}, html = "";
    AD.order.forEach(function (n) { var v = AD.views[n]; if (!AD.visible(v)) return; (groups[v.group] = groups[v.group] || []).push(v); });
    Object.keys(groups).forEach(function (g) {
      html += '<p class="side__g">' + AD.esc(g) + "</p>" + groups[g].map(function (v) {
        return '<a href="#/' + v.name + '" data-v="' + v.name + '">' + AD.icon(v.icon) + "<span>" + AD.esc(v.title) + '</span><span class="cnt" data-cnt="' + v.name + '" hidden></span></a>';
      }).join("");
    });
    AD.$("#nav").innerHTML = html;
    AD.badges();
  };
  AD.badges = function () {
    var set = function (k, n) { var el = AD.$('[data-cnt="' + k + '"]'); if (el) { el.textContent = n > 99 ? "99+" : n; el.hidden = !n; } };
    var res = AD.live.res || [], ev = AD.live.ev || [];
    set("reservaciones", res.filter(function (r) { return r.status === "pending" || ((r.status === "confirmed" || r.status === "pending") && r.change && r.change.type); }).length);
    set("pedidos", (AD.live.orders || []).filter(function (o) { return o.status === "review"; }).length);
    set("cocina", (AD.live.orders || []).filter(function (o) { return o.status === "confirmed"; }).length);
    set("eventos", ev.filter(function (e) { return e.status === "received" || (e.change && e.change.type && ["received", "review", "quoted", "confirmed"].indexOf(e.status) > -1) || (e.status === "quoted" && e.quoteAccepted); }).length);
  };
  AD.go = function () {
    var name = (location.hash.match(/^#\/([a-z-]+)/) || [])[1];
    var v = AD.views[name];
    if (!v || !AD.visible(v)) { v = AD.views[AD.order.filter(function (n) { return AD.visible(AD.views[n]); })[0]]; if (!v) return; history.replaceState(null, "", "#/" + v.name); }
    cleanup.forEach(function (f) { try { f(); } catch (e) {} }); cleanup = [];
    AD.closeDrawer();
    current = v.name;
    AD.$$("#nav a").forEach(function (a) { if (a.dataset.v === v.name) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    AD.$("#view-title").textContent = v.title;
    document.title = v.title + " | Panel · Caldos Constitución";
    AD.$("#top-acts").innerHTML = "";
    var host = AD.$("#view"); host.innerHTML = ""; host.scrollTop = 0; window.scrollTo(0, 0);
    try { v.render(host, AD.$("#top-acts")); } catch (e) { AD.logError("view." + v.name, e); host.innerHTML = '<div class="alert alert--err">' + AD.icon("alert") + "<span>Esta sección no se pudo mostrar. El error quedó registrado.</span></div>"; }
    document.body.classList.remove("nav-open"); AD.$("#side").classList.remove("open"); AD.$("#side-scrim").classList.remove("open");
  };
  AD.current = function () { return current; };
  /* Vuelve a pintar la vista cuando cambian datos en vivo (y deja de escuchar al salir de ella) */
  AD.watch = function (keys, fn) {
    var deb = AD.debounce(fn, 120);
    keys.forEach(function (k) { AD.on(k, deb); });
    AD.onLeave(function () { keys.forEach(function (k) { AD.off(k, deb); }); });
  };
  /* Lista de reservaciones de la vista actual, con filtro de fecha "AAAA-MM-DD" */
  AD.resOn = function (date) { return (AD.live.res || []).filter(function (r) { return r.date === date; }); };
  AD.icons = function (root) { CC.icons(root); };
})(window.CC = window.CC || {});
