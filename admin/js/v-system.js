/* Historial administrativo (auditoría), registro de errores y copias de seguridad con verificación y restauración. */
(function (CC) {
  "use strict";
  var AD = window.AD;
  var ACTIONS = {
    login: "Inicio de sesión", logout: "Cierre de sesión", "owner.claim": "Configuración del propietario", "team.join": "Se unió al equipo", "team.invite": "Invitación", "team.revoke": "Invitación revocada",
    "team.update": "Permisos cambiados", "team.remove": "Miembro quitado", "settings.init": "Configuración inicial", "settings.update": "Ajustes cambiados",
    "reservation.confirm": "Reservación confirmada", "reservation.tables": "Mesas cambiadas", "reservation.rejected": "Reservación rechazada", "reservation.cancelled": "Reservación cancelada",
    "reservation.completed": "Reservación completada", "reservation.noshow": "No se presentó", "reservation.change": "Cambio aplicado", "reservation.create": "Reservación creada", "reservation.remind-all": "Recordatorios",
    "event.confirm": "Evento confirmado", "event.quoted": "Cotización enviada", "event.review": "Evento en revisión", "event.rejected": "Evento rechazado", "event.cancelled": "Evento cancelado", "event.completed": "Evento completado", "event.change": "Cambio de evento",
    "table.create": "Mesa creada", "table.update": "Mesa editada", "table.delete": "Mesa eliminada", "table.block": "Mesas bloqueadas", "table.unblock": "Bloqueo quitado",
    "menu.create": "Plato creado", "menu.update": "Plato editado", "menu.delete": "Plato eliminado", "menu.visibility": "Visibilidad de plato", "menu.seed": "Menú importado",
    "backup.export": "Copia descargada", "backup.restore": "Copia restaurada",
    "audit.clear": "Historial borrado", "customer.gift": "Beneficio a cliente", "export.customers": "Clientes exportados", "event.create": "Evento creado",
    "team.create": "Cuenta creada", "customer.vip": "Cliente destacado", "menu.stock": "Disponibilidad de plato", "payments.update": "Pagos configurados",
    "order.confirmed": "Pago verificado", "order.preparing": "Pedido a cocina", "order.ready": "Pedido listo", "order.on_way": "Pedido en camino", "order.done": "Pedido entregado",
    "order.rejected": "Pago rechazado", "order.cancelled": "Pedido cancelado"
  };
  function label(a) { return ACTIONS[a] || a; }

  /* Categoría de cada acción (para filtrar y dar color) */
  var CATS = {
    reservation: { l: "Reservaciones", ic: "calendar", tone: "amber" }, order: { l: "Pedidos", ic: "cart", tone: "green" }, event: { l: "Eventos", ic: "party", tone: "violet" },
    table: { l: "Mesas", ic: "table", tone: "green" }, menu: { l: "Menú", ic: "star", tone: "red" },
    team: { l: "Equipo", ic: "shield", tone: "blue" }, customer: { l: "Clientes", ic: "users", tone: "blue" },
    session: { l: "Sesiones", ic: "logout", tone: "gray" }, system: { l: "Sistema", ic: "settings", tone: "gray" }
  };
  function cat(a) {
    a = String(a || "");
    if (a === "login" || a === "logout") return "session";
    var p = a.split(".")[0];
    if (p === "owner" || p === "team") return "team";
    if (p === "export" && a.indexOf("customers") > -1) return "customer";
    return CATS[p] ? p : "system";
  }
  var RANGES = { all: { l: "Todo", d: 0 }, today: { l: "Hoy", d: 1 }, d7: { l: "7 días", d: 7 }, d30: { l: "30 días", d: 30 } };

  AD.view("historial", {
    title: "Historial y errores", icon: "clock", group: "Sistema", perm: "audit",
    render: function (host, top) {
      var tab = "audit", rows = { audit: null, errors: null }, q = "", fc = "all", fr = "all", owner = AD.isOwner();
      top.innerHTML = '<button class="b b--sm" id="h-xls">' + AD.icon("download") + "Excel</button>" + (owner ? '<button class="b b--sm b--danger" id="h-clear">' + AD.icon("trash") + '<span id="h-clear-l">Borrar historial</span></button>' : "");
      host.innerHTML = '<div class="tabs" role="tablist"><button class="tab" role="tab" data-t="audit">' + AD.icon("clock") + 'Historial del equipo<span class="n" id="h-n-audit"></span></button><button class="tab" role="tab" data-t="errors">' + AD.icon("alert") + 'Errores registrados<span class="n" id="h-n-errors"></span></button></div>' +
        '<div id="h-kpis"></div><div class="card"><div class="bar"><div class="f bar__grow search"><label for="h-q" class="vh">Buscar</label>' + AD.icon("search") + '<input id="h-q" type="search" placeholder="Buscar por persona, acción o detalle"></div>' +
        '<div class="chips" id="h-range"></div></div><div class="chips chips--mb" id="h-cats"></div><div id="h-t"></div></div>' +
        '<p class="small muted c-foot" id="h-foot"></p>';
      var COLS_A = [
        { k: "at", l: "Fecha", sortVal: function (r) { return ms(r.at); }, html: function (r) { var d = AD.tsDate(r.at); return d ? "<b>" + d.toLocaleDateString("es-DO", { day: "numeric", month: "short" }) + '</b><span class="sub">' + d.toLocaleTimeString("es-DO", { hour: "numeric", minute: "2-digit" }) + "</span>" : "—"; } },
        { k: "action", l: "Acción", html: function (r) { var c = CATS[cat(r.action)]; return '<span class="act-i act-i--' + c.tone + '">' + AD.icon(c.ic) + "<span><b>" + AD.esc(label(r.action)) + '</b><span class="sub">' + c.l + "</span></span></span>"; } },
        { k: "who", l: "Quién", html: function (r) { return "<b>" + AD.esc(r.who || "") + '</b><span class="sub">' + AD.esc(AD.ROLES[r.role] || r.role || "") + "</span>"; } },
        { k: "detail", l: "Detalle", html: function (r) { return '<span class="small">' + AD.esc(r.detail || "") + '</span><span class="sub">' + AD.esc(r.target || "") + "</span>"; } }
      ];
      var COLS_E = [
        { k: "at", l: "Fecha", sortVal: function (r) { return ms(r.at); }, html: function (r) { return AD.when(r.at); } },
        { k: "where", l: "Dónde", html: function (r) { return '<span class="act-i act-i--red">' + AD.icon("alert") + "<span><b>" + AD.esc(r.where) + '</b><span class="sub">' + AD.esc(r.page || "") + "</span></span></span>"; } },
        { k: "code", l: "Código", html: function (r) { return r.code ? '<span class="tag">' + AD.esc(r.code) + "</span>" : '<span class="muted">—</span>'; } },
        { k: "message", l: "Mensaje", html: function (r) { return '<span class="small">' + AD.esc(r.message) + "</span>"; } }
      ];
      function ms(t) { var d = AD.tsDate(t); return d ? d.getTime() : 0; }
      var tbl = null, tblTab = null;
      function filtered() {
        var list = rows[tab] || [], s = q.toLowerCase(), d = RANGES[fr].d, from = d ? new Date(AD.today() + "T00:00:00").getTime() - (d - 1) * 86400000 : 0;
        return list.filter(function (r) {
          if (from && ms(r.at) < from) return false;
          if (tab === "audit" && fc !== "all" && cat(r.action) !== fc) return false;
          return !s || JSON.stringify([r.who, r.action, label(r.action), r.detail, r.target, r.where, r.message, r.code]).toLowerCase().indexOf(s) > -1;
        });
      }
      function paint() {
        AD.$$("[data-t]").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.t === tab)); });
        ["audit", "errors"].forEach(function (t) { AD.$("#h-n-" + t).textContent = rows[t] ? rows[t].length : ""; });
        var cl = AD.$("#h-clear-l"); if (cl) cl.textContent = tab === "audit" ? "Borrar historial" : "Borrar errores";
        AD.$("#h-range").innerHTML = Object.keys(RANGES).map(function (k) { return '<button type="button" class="chip" data-r="' + k + '" aria-pressed="' + (fr === k) + '">' + RANGES[k].l + "</button>"; }).join("");
        AD.$("#h-foot").textContent = tab === "audit" ? "Se muestran los 500 registros más recientes. Solo el propietario puede borrar el historial; el borrado queda anotado." : "Los errores se guardan sin datos personales. Se muestran los 500 más recientes.";
        var list = rows[tab];
        if (!list) { tbl = null; AD.$("#h-kpis").innerHTML = ""; AD.$("#h-cats").innerHTML = ""; AD.$("#h-t").innerHTML = '<div class="empty">Cargando…</div>'; return; }
        var now = Date.now(), t0 = new Date(AD.today() + "T00:00:00").getTime();
        if (tab === "audit") {
          var cnt = { all: list.length }; Object.keys(CATS).forEach(function (k) { cnt[k] = 0; }); list.forEach(function (r) { cnt[cat(r.action)]++; });
          var people = {}; list.filter(function (r) { return ms(r.at) > now - 7 * 86400000; }).forEach(function (r) { people[r.who || "?"] = 1; });
          AD.$("#h-kpis").innerHTML = '<div class="kpis">' +
            k("clock", "Registros", list.length, "en el historial cargado") + k("calendar", "Hoy", list.filter(function (r) { return ms(r.at) >= t0; }).length, "acciones del equipo") +
            k("users", "Personas activas", Object.keys(people).length, "en los últimos 7 días") + k("check", "Reservaciones", cnt.reservation, "acciones sobre reservaciones") + "</div>";
          AD.$("#h-cats").innerHTML = [["all", "Todas"]].concat(Object.keys(CATS).filter(function (c) { return cnt[c]; }).map(function (c) { return [c, CATS[c].l]; })).map(function (x) {
            return '<button type="button" class="chip" data-c="' + x[0] + '" aria-pressed="' + (fc === x[0]) + '">' + x[1] + '<span class="n">' + cnt[x[0]] + "</span></button>";
          }).join("");
        } else {
          AD.$("#h-kpis").innerHTML = '<div class="kpis">' + k("alert", "Errores", list.length, "registrados") + k("calendar", "Hoy", list.filter(function (r) { return ms(r.at) >= t0; }).length, "errores de hoy") +
            k("clock", "Últimos 7 días", list.filter(function (r) { return ms(r.at) > now - 7 * 86400000; }).length, "errores recientes") + "</div>";
          AD.$("#h-cats").innerHTML = "";
        }
        if (!tbl || tblTab !== tab) {
          var box = AD.$("#h-t"); box.innerHTML = ""; var inner = document.createElement("div"); box.appendChild(inner);
          tbl = AD.table(inner, { sort: "at", dir: "desc", empty: tab === "audit" ? "Sin registros con estos filtros." : "No hay errores registrados. ¡Todo bien!", cols: tab === "audit" ? COLS_A : COLS_E }); tblTab = tab;
        }
        tbl.set(filtered());
      }
      function k(ic, l, v, sub) { return '<div class="kpi"><div class="kpi__l">' + AD.icon(ic) + AD.esc(l) + '</div><div class="kpi__v">' + v + '</div><div class="kpi__s">' + AD.esc(sub) + "</div></div>"; }
      function load(t) {
        var col = t === "audit" ? "auditLog" : "errorLog";
        return AD.db.collection(col).orderBy("at", "desc").limit(500).get().then(function (s) { rows[t] = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); paint(); }, function (e) { AD.fail("history", e); });
      }
      host.addEventListener("click", function (e) {
        var b = e.target.closest("[data-t]"); if (b) { tab = b.dataset.t; fc = "all"; if (!rows[tab]) load(tab); paint(); return; }
        var r = e.target.closest("[data-r]"); if (r) { fr = r.dataset.r; paint(); return; }
        var c = e.target.closest("[data-c]"); if (c) { fc = c.dataset.c; paint(); }
      });
      AD.$("#h-q").oninput = AD.debounce(function () { q = AD.$("#h-q").value.trim(); paint(); }, 150);

      /* ---------- borrar (solo propietario; las reglas del servidor lo comprueban) ---------- */
      function wipe(col, cutoff, done) {
        /* Borra por tandas hasta que no quede nada anterior a cutoff (0 = todo) */
        var qy = AD.db.collection(col); if (cutoff) qy = qy.where("at", "<", new Date(cutoff));
        return qy.limit(400).get().then(function (s) {
          if (!s.size) return done;
          var b = AD.db.batch(); s.docs.forEach(function (d) { b.delete(d.ref); });
          return b.commit().then(function () { return wipe(col, cutoff, done + s.size); });
        });
      }
      var clr = AD.$("#h-clear");
      if (clr) clr.onclick = function () {
        var audit = tab === "audit", col = audit ? "auditLog" : "errorLog", what = audit ? "historial del equipo" : "registro de errores";
        AD.modal({
          title: audit ? "Borrar historial" : "Borrar errores",
          body: '<p>Elige qué parte del ' + what + " quieres borrar. <b>No se puede deshacer.</b></p>" +
            '<div class="radios">' + [["d90", "Más antiguo de 90 días"], ["d30", "Más antiguo de 30 días"], ["d7", "Más antiguo de 7 días"], ["all", "Todo el " + what]].map(function (o, i) {
              return '<label class="radio"><input type="radio" name="span" value="' + o[0] + '"' + (i === 1 ? " checked" : "") + "><span>" + o[1] + "</span></label>";
            }).join("") + "</div>" +
            (audit ? '<p class="small muted">Por seguridad, después de borrar queda una única entrada que indica quién borró y cuándo.</p>' : "") +
            '<div class="f"><label for="h-ok">Escribe <b>BORRAR</b> para confirmar</label><input id="h-ok" name="ok" autocomplete="off" spellcheck="false"></div>',
          actions: [{ label: "Cancelar", close: true }, { label: "Borrar", cls: "b--danger", icon: "trash", onClick: function (api) {
            if (AD.val(api.el, "ok").toUpperCase() !== "BORRAR") { api.error("Escribe BORRAR para confirmar."); return false; }
            var span = (AD.$('input[name="span"]:checked', api.el) || {}).value || "d30";
            var days = { d90: 90, d30: 30, d7: 7, all: 0 }[span], cutoff = days ? Date.now() - days * 86400000 : 0;
            return wipe(col, cutoff, 0).then(function (n) {
              var after = audit ? AD.audit("audit.clear", "auditLog", n + " registros borrados (" + (days ? "más de " + days + " días" : "todo") + ")") : null;
              return Promise.resolve(after).then(function () { AD.toast(n ? n + " registros borrados." : "No había registros en ese rango."); rows[tab] = null; tbl = null; paint(); return load(tab); });
            });
          } }]
        });
      };
      AD.$("#h-xls").onclick = function () {
        var list = filtered();
        AD.xlsx(tab === "audit" ? "historial" : "errores", [{ name: tab === "audit" ? "Historial" : "Errores", rows: list, cols: tab === "audit"
          ? [{ k: "at", l: "Fecha", v: function (r) { var d = AD.tsDate(r.at); return d ? d.toLocaleString("es-DO") : ""; }, w: 22 }, { k: "who", l: "Quién", w: 22 }, { k: "role", l: "Rol" }, { k: "cat", l: "Categoría", v: function (r) { return CATS[cat(r.action)].l; } }, { k: "action", l: "Acción", v: function (r) { return label(r.action); }, w: 26 }, { k: "target", l: "Registro", w: 30 }, { k: "detail", l: "Detalle", w: 60 }]
          : [{ k: "at", l: "Fecha", v: function (r) { var d = AD.tsDate(r.at); return d ? d.toLocaleString("es-DO") : ""; }, w: 22 }, { k: "where", l: "Dónde", w: 24 }, { k: "code", l: "Código" }, { k: "message", l: "Mensaje", w: 60 }, { k: "page", l: "Página" }] }]);
      };
      load("audit"); paint();
    }
  });

  /* ---------- copias de seguridad ---------- */
  var FORMAT = "caldos-constitucion-backup", VERSION = 1;
  /* Colecciones incluidas. restore: se pueden volver a escribir desde el panel (las demás quedan como registro). */
  var COLS = [
    { k: "settings", l: "Horarios y políticas", restore: true }, { k: "tables", l: "Mesas", restore: true }, { k: "menu", l: "Menú", restore: true },
    { k: "menuPhotos", l: "Fotos del menú", restore: true, heavy: true }, { k: "reservations", l: "Reservaciones", restore: true, sub: "log" }, { k: "events", l: "Eventos", restore: true, sub: "log" },
    { k: "blocks", l: "Bloqueos", restore: true }, { k: "locks", l: "Mesas ocupadas por franja", restore: true }, { k: "cap", l: "Ocupación por franja", restore: true },
    { k: "users", l: "Cuentas de clientes", restore: false }, { k: "notifications", l: "Avisos a clientes", restore: false }, { k: "admins", l: "Equipo", restore: false }, { k: "orders", l: "Pedidos", restore: false },
    { k: "invites", l: "Invitaciones", restore: false }, { k: "auditLog", l: "Historial del equipo", restore: false }
  ];
  /* Fechas de Firestore ↔ JSON */
  function enc(v) {
    if (v && typeof v.toMillis === "function") return { __ts: v.toMillis() };
    if (Array.isArray(v)) return v.map(enc);
    if (v && typeof v === "object") { var o = {}; Object.keys(v).forEach(function (k) { o[k] = enc(v[k]); }); return o; }
    return v;
  }
  function dec(v) {
    if (v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 1 && typeof v.__ts === "number") return AD.fb.firestore.Timestamp.fromMillis(v.__ts);
    if (Array.isArray(v)) return v.map(dec);
    if (v && typeof v === "object") { var o = {}; Object.keys(v).forEach(function (k) { o[k] = dec(v[k]); }); return o; }
    return v;
  }
  function sha256(text) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, "0"); }).join(""); });
  }
  AD.backup = {
    COLS: COLS,
    /* Descarga todo en un archivo JSON con huella SHA-256 para comprobar que no se dañó */
    export: function (opts, progress) {
      var out = {}, cols = COLS.filter(function (c) { return opts.photos || !c.heavy; });
      return cols.reduce(function (p, c) {
        return p.then(function () {
          if (progress) progress("Leyendo " + c.l + "…");
          return AD.db.collection(c.k).get().then(function (s) {
            out[c.k] = [];
            return Promise.all(s.docs.map(function (d) {
              var row = { id: d.id, data: enc(d.data()) };
              out[c.k].push(row);
              if (!c.sub) return null;
              return d.ref.collection(c.sub).get().then(function (ss) { row.sub = {}; row.sub[c.sub] = ss.docs.map(function (x) { return { id: x.id, data: enc(x.data()) }; }); });
            }));
          });
        });
      }, Promise.resolve()).then(function () {
        var body = JSON.stringify(out);
        return sha256(body).then(function (h) {
          return { format: FORMAT, version: VERSION, project: AD.fb.app().options.projectId, createdAt: new Date().toISOString(), by: AD.me.email || AD.me.uid, checksum: h, counts: Object.keys(out).reduce(function (o, k) { o[k] = out[k].length; return o; }, {}), collections: out };
        });
      });
    },
    /* Comprueba formato, huella y contenido antes de restaurar */
    verify: function (text) {
      var j; try { j = JSON.parse(text); } catch (e) { return Promise.reject(AD.ops.userErr("El archivo no es una copia válida (JSON dañado).")); }
      if (!j || j.format !== FORMAT || !j.collections) return Promise.reject(AD.ops.userErr("El archivo no es una copia de seguridad de Caldos Constitución."));
      if (j.version > VERSION) return Promise.reject(AD.ops.userErr("La copia es de una versión más nueva del panel."));
      return sha256(JSON.stringify(j.collections)).then(function (h) {
        if (h !== j.checksum) throw AD.ops.userErr("La huella no coincide: el archivo fue modificado o está dañado. No se restaurará.");
        var problems = [];
        Object.keys(j.collections).forEach(function (k) {
          if (!COLS.some(function (c) { return c.k === k; })) problems.push("Colección desconocida: " + k);
          (j.collections[k] || []).forEach(function (r) { if (!r || typeof r.id !== "string" || !r.id || r.id.indexOf("/") > -1 || typeof r.data !== "object") problems.push("Registro inválido en " + k); });
        });
        (j.collections.reservations || []).forEach(function (r) { var d = r.data; if (!d.date || !d.time || !d.status) problems.push("Reservación incompleta: " + r.id); });
        if (problems.length) throw AD.ops.userErr(problems.slice(0, 3).join(" · "));
        return j;
      });
    },
    /* Escribe (sobrescribe) los documentos de las colecciones elegidas. No borra lo que no está en la copia. */
    restore: function (j, keys, progress) {
      var writes = [];
      keys.forEach(function (k) {
        (j.collections[k] || []).forEach(function (r) {
          writes.push([AD.db.collection(k).doc(r.id), dec(r.data)]);
          if (r.sub && r.sub.log) r.sub.log.forEach(function (l) {
            var d = dec(l.data), when = d.at && d.at.toDate ? d.at.toDate().toLocaleString("es-DO") : "";
            /* El historial solo admite entradas nuevas a nombre de quien restaura: se conserva el texto original con su fecha */
            writes.push([AD.db.collection(k).doc(r.id).collection("log").doc("r_" + l.id), { at: AD.ts(), by: AD.me.uid, who: "equipo", name: AD.me.name || "", action: "restored", text: "[Restaurado] " + (d.text || d.action || "") + (when ? " (" + when + ")" : "") }]);
          });
        });
      });
      var done = 0, chunks = [];
      for (var i = 0; i < writes.length; i += 400) chunks.push(writes.slice(i, i + 400));
      return chunks.reduce(function (p, ch) {
        return p.then(function () {
          var b = AD.db.batch(); ch.forEach(function (w) { b.set(w[0], w[1]); });
          return b.commit().then(function () { done += ch.length; if (progress) progress("Restaurando… " + done + " de " + writes.length); });
        });
      }, Promise.resolve()).then(function () { return writes.length; });
    }
  };

  AD.view("copias", {
    title: "Copias de seguridad", icon: "download", group: "Sistema", perm: "owner",
    render: function (host) {
      var loaded = null;
      host.innerHTML = '<div class="alert alert--info">' + AD.icon("info") + "<span>En el plan gratuito de Firebase no hay copias automáticas: descarga una copia al menos una vez por semana y guárdala en un lugar seguro (por ejemplo, Google Drive privado). Contiene datos personales de clientes: no la compartas.</span></div>" +
        '<div class="cards"><div class="card"><div class="card__h"><div><h2>Descargar copia</h2><p>Todo el sistema en un archivo JSON con huella de integridad.</p></div></div>' +
        '<label class="chk"><input type="checkbox" id="bk-ph"> Incluir fotos del menú (archivo más pesado)</label><p class="small muted" id="bk-msg"></p>' +
        '<button class="b b--p" id="bk-go">' + AD.icon("download") + "Descargar copia ahora</button></div>" +
        '<div class="card"><div class="card__h"><div><h2>Verificar y restaurar</h2><p>Primero se comprueba el archivo; luego eliges qué restaurar.</p></div></div>' +
        '<div class="f"><label for="bk-file">Archivo de copia (.json)</label><input type="file" id="bk-file" accept="application/json,.json"></div><div id="bk-res"></div></div></div>';
      var msg = function (t) { AD.$("#bk-msg").textContent = t; };
      AD.$("#bk-go").onclick = function () {
        var b = this; b.disabled = true;
        AD.backup.export({ photos: AD.$("#bk-ph").checked }, msg).then(function (j) {
          var name = "copia_caldos_" + new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-") + ".json";
          AD.download(name, "application/json", JSON.stringify(j));
          var total = Object.keys(j.counts).reduce(function (a, k) { return a + j.counts[k]; }, 0);
          msg("Copia descargada: " + total + " registros. Huella " + j.checksum.slice(0, 12) + "…");
          AD.audit("backup.export", "backup", total + " registros · " + j.checksum.slice(0, 16));
        }, function (e) { msg(""); AD.fail("backup.export", e); }).then(function () { b.disabled = false; });
      };
      AD.$("#bk-file").onchange = function () {
        var f = this.files[0], box = AD.$("#bk-res"); loaded = null;
        if (!f) { box.innerHTML = ""; return; }
        if (f.size > 60 * 1024 * 1024) { box.innerHTML = '<div class="alert alert--err">' + AD.icon("alert") + "<span>El archivo es demasiado grande.</span></div>"; return; }
        box.innerHTML = '<div class="empty">Verificando…</div>';
        f.text().then(AD.backup.verify).then(function (j) {
          loaded = j;
          box.innerHTML = '<div class="alert alert--ok">' + AD.icon("check") + "<span>Copia válida e intacta · creada el " + AD.esc(new Date(j.createdAt).toLocaleString("es-DO")) + " por " + AD.esc(j.by) + (j.project !== AD.fb.app().options.projectId ? " · <b>de otro proyecto (" + AD.esc(j.project) + ")</b>" : "") + "</span></div>" +
            '<div class="f"><span class="f__l">Qué restaurar</span><div class="chks" style="flex-direction:column">' + COLS.map(function (c) {
              var n = (j.collections[c.k] || []).length;
              return '<label class="chk"><input type="checkbox" value="' + c.k + '"' + (c.restore && n ? "" : " disabled") + "> " + AD.esc(c.l) + " <span class='muted'>(" + n + ")" + (c.restore ? "" : " · solo registro") + "</span></label>";
            }).join("") + "</div></div>" +
            '<div class="alert">' + AD.icon("alert") + "<span>Restaurar sobrescribe los registros con el mismo identificador. No borra los que no estén en la copia. Para mesas ocupadas y ocupación, restaura también reservaciones y eventos.</span></div>" +
            '<button class="b b--danger" id="bk-do">' + AD.icon("upload") + 'Restaurar selección</button><p class="small muted" id="bk-p"></p>';
          AD.$("#bk-do").onclick = function () {
            var keys = AD.$$("#bk-res input:checked").map(function (i) { return i.value; });
            if (!keys.length) { AD.toast("Elige qué restaurar.", "error"); return; }
            AD.confirm("Restaurar copia", "Se escribirán " + keys.reduce(function (a, k) { return a + (loaded.collections[k] || []).length; }, 0) + " registros de: " + keys.map(function (k) { return AD.esc(COLS.filter(function (c) { return c.k === k; })[0].l); }).join(", ") + ". ¿Continuar?", "Restaurar", true).then(function (y) {
              if (!y) return;
              var btn = AD.$("#bk-do"); btn.disabled = true;
              AD.backup.restore(loaded, keys, function (t) { AD.$("#bk-p").textContent = t; }).then(function (n) {
                AD.$("#bk-p").textContent = "Restauración completa: " + n + " escrituras.";
                AD.audit("backup.restore", "backup", keys.join(", ") + " · " + n + " escrituras · " + loaded.checksum.slice(0, 16));
                AD.toast("Copia restaurada.");
              }, function (e) { btn.disabled = false; AD.fail("backup.restore", e); });
            });
          };
        }, function (e) { box.innerHTML = '<div class="alert alert--err">' + AD.icon("alert") + "<span>" + AD.esc(AD.errMsg(e)) + "</span></div>"; });
      };
    }
  });
})(window.CC = window.CC || {});
