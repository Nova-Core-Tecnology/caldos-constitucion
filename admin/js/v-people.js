/* Clientes (cuentas del sitio con su actividad) y Equipo (miembros, permisos e invitaciones; solo el propietario). */
(function (CC) {
  "use strict";
  var AD = window.AD, B = CC.booking;

  /* ---------- clientes ----------
     Une las cuentas del sitio con su actividad real (reservaciones, eventos y pedidos enviados por WhatsApp)
     para ver quiénes son los clientes más fieles y activos, y ofrecerles beneficios. */
  var DAY = 86400000;
  var SEG = {
    vip: { l: "VIP", tone: "violet", hint: "5+ visitas o 8+ pedidos" },
    frecuente: { l: "Frecuente", tone: "blue", hint: "3+ visitas o pedidos" },
    activo: { l: "Activo", tone: "green", hint: "Actividad en los últimos 60 días" },
    nuevo: { l: "Nuevo", tone: "amber", hint: "Cuenta de menos de 30 días" },
    inactivo: { l: "Inactivo", tone: "gray", hint: "Sin actividad en 90 días" }
  };
  var SORTS = {
    score: { l: "Más activos", f: function (a, b) { return b.st.score - a.st.score || b.st.lastMs - a.st.lastMs; } },
    visits: { l: "Más visitas", f: function (a, b) { return b.st.visits - a.st.visits || b.st.score - a.st.score; } },
    orders: { l: "Más pedidos", f: function (a, b) { return (b.st.orders || 0) - (a.st.orders || 0) || (b.st.spent || 0) - (a.st.spent || 0); } },
    spent: { l: "Mayor gasto en pedidos", f: function (a, b) { return (b.st.spent || 0) - (a.st.spent || 0); } },
    recent: { l: "Actividad más reciente", f: function (a, b) { return b.st.lastMs - a.st.lastMs; } },
    name: { l: "Nombre (A–Z)", f: function (a, b) { return String(a.name).localeCompare(String(b.name), "es"); } }
  };
  function ms(t) { var d = AD.tsDate(t); return d ? d.getTime() : 0; }
  function initials(s) { return String(s || "?").trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join("").toUpperCase(); }

  AD.view("clientes", {
    title: "Clientes", icon: "users", group: "Personas", perm: "customers",
    render: function (host, top) {
      var users = null, allRes = null, allEv = null, orders = {}, ordersOk = true, q = "", seg = "all", sort = "score", canVip = AD.isOwner() || AD.isAdmin();
      top.innerHTML = '<button class="b b--sm" id="c-xls">' + AD.icon("download") + "Excel</button>";
      host.innerHTML = '<div id="c-kpis"></div><div id="c-top"></div>' +
        '<div class="card"><div class="card__h"><div><h2>Todos los clientes</h2><p id="c-cnt">Cargando…</p></div></div>' +
        '<div class="bar"><div class="f bar__grow search"><label for="c-q" class="vh">Buscar</label>' + AD.icon("search") + '<input id="c-q" type="search" placeholder="Buscar por nombre, correo o teléfono"></div>' +
        '<div class="f"><label for="c-sort" class="vh">Ordenar</label><select id="c-sort">' + Object.keys(SORTS).map(function (k) { return '<option value="' + k + '">' + SORTS[k].l + "</option>"; }).join("") + "</select></div></div>" +
        '<div class="chips chips--mb" id="c-seg"></div><div id="c-t"></div></div>' +
        '<p class="small muted c-foot">Solo se muestran los datos que cada cliente guardó en su cuenta. Úsalos únicamente para atender sus reservaciones, pedidos y beneficios.</p>';

      function stats(u) {
        var now = Date.now(), r = (allRes || AD.live.res || []).filter(function (x) { return x.uid === u.uid; }), e = (allEv || AD.live.ev || []).filter(function (x) { return x.uid === u.uid; });
        var o = orders[u.uid], done = r.filter(function (x) { return x.status === "completed"; }).length, evDone = e.filter(function (x) { return x.status === "completed"; }).length;
        var upcoming = r.filter(function (x) { return (x.status === "pending" || x.status === "confirmed") && x.start > now; }).length;
        var noshow = r.filter(function (x) { return x.status === "noshow"; }).length;
        var visits = done + evDone + r.filter(function (x) { return x.status === "confirmed" && x.start < now; }).length;
        var times = r.map(function (x) { return Math.min(x.start || 0, now); }).concat(e.map(function (x) { return Math.min(x.start || 0, now); }), (o || []).map(function (x) { return ms(x.createdAt); }), [ms(u.createdAt)]).filter(Boolean);
        var lastMs = times.length ? Math.max.apply(null, times) : 0;
        var nOrders = o ? o.length : 0, spent = (o || []).reduce(function (a, x) { return a + (Number(x.total) || 0); }, 0);
        var score = visits * 3 + upcoming * 2 + e.length * 4 + nOrders * 2 + Math.round(spent / 1000) - noshow * 3;
        if (lastMs && now - lastMs < 30 * DAY) score += 3;
        var s = visits >= 5 || nOrders >= 8 || score >= 25 ? "vip" : visits + nOrders >= 3 ? "frecuente" : ms(u.createdAt) && now - ms(u.createdAt) < 30 * DAY ? "nuevo" : lastMs && now - lastMs < 60 * DAY && (r.length || e.length || nOrders) ? "activo" : "inactivo";
        return { res: r.length, ev: e.length, visits: visits, upcoming: upcoming, noshow: noshow, orders: o ? nOrders : null, spent: o ? spent : null, lastMs: lastMs, score: Math.max(0, score), seg: s, risk: noshow >= 2, list: { r: r, e: e, o: o || [] } };
      }
      function segPill(u) { var x = SEG[u.st.seg]; return (u.vip ? '<span class="st st--gold" title="' + AD.esc(u.vipNote || "Marcado por el restaurante") + '">★ Destacado</span> ' : "") + '<span class="st st--' + x.tone + '" title="' + AD.esc(x.hint) + '">' + x.l + "</span>" + (u.st.risk ? ' <span class="tag tag--warn">' + u.st.noshow + " no-show</span>" : ""); }
      function lastTxt(u) { if (!u.st.lastMs) return '<span class="muted">—</span>'; var d = Math.floor((Date.now() - u.st.lastMs) / DAY); return d <= 0 ? "Hoy" : d === 1 ? "Ayer" : d < 30 ? "Hace " + d + " días" : new Date(u.st.lastMs).toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" }); }
      var maxScore = 1;
      var tbl = AD.table(AD.$("#c-t"), {
        empty: "No hay clientes que coincidan con los filtros.",
        rowAttr: function (u) { return 'data-open="' + AD.esc(u.uid) + '"'; },
        cols: [
          { k: "vip", l: "", sort: false, html: function (u) { return canVip ? '<button type="button" class="star' + (u.vip ? " is-on" : "") + '" data-vip="' + AD.esc(u.uid) + '" aria-pressed="' + u.vip + '" aria-label="' + (u.vip ? "Quitar de destacados a " : "Marcar como destacado a ") + AD.esc(u.name || u.email) + '">' + (u.vip ? "★" : "☆") + "</button>" : u.vip ? '<span class="star is-on" aria-label="Destacado">★</span>' : ""; } },
          { k: "name", l: "Cliente", html: function (u) { return '<span class="cust"><span class="cust__av">' + (u.photo ? '<img src="' + AD.esc(u.photo) + '" alt="" referrerpolicy="no-referrer">' : AD.esc(initials(u.name || u.email))) + '</span><span><b>' + AD.esc(u.name || "—") + '</b><span class="sub">' + AD.esc(u.email || u.phone || "") + "</span></span></span>"; } },
          { k: "seg", l: "Segmento", sortVal: function (u) { return Object.keys(SEG).indexOf(u.st.seg); }, html: segPill },
          { k: "visits", l: "Visitas", cls: "num", sortVal: function (u) { return u.st.visits; }, html: function (u) { return "<b>" + u.st.visits + "</b>" + (u.st.upcoming ? '<span class="sub">' + u.st.upcoming + " próxima" + (u.st.upcoming > 1 ? "s" : "") + "</span>" : ""); } },
          { k: "ev", l: "Eventos", cls: "num", sortVal: function (u) { return u.st.ev; }, html: function (u) { return u.st.ev; } },
          { k: "orders", l: "Pedidos", cls: "num", sortVal: function (u) { return u.st.orders || 0; }, html: function (u) { return u.st.orders == null ? '<span class="muted">—</span>' : "<b>" + u.st.orders + "</b>" + (u.st.spent ? '<span class="sub">' + AD.money(u.st.spent) + "</span>" : ""); } },
          { k: "last", l: "Última actividad", sortVal: function (u) { return u.st.lastMs; }, html: lastTxt },
          { k: "score", l: "Actividad", sortVal: function (u) { return u.st.score; }, html: function (u) { return '<span class="meter" title="' + u.st.score + ' puntos"><i style="width:' + Math.round(u.st.score * 100 / maxScore) + '%"></i></span>'; } }
        ]
      });
      function paint() {
        if (!users) { AD.$("#c-t").innerHTML = '<div class="empty">Cargando clientes…</div>'; return; }
        users.forEach(function (u) { u.st = stats(u); });
        maxScore = Math.max.apply(null, users.map(function (u) { return u.st.score; }).concat([1]));
        var now = Date.now(), cnt = { all: users.length, risk: 0, star: users.filter(function (u) { return u.vip; }).length }; Object.keys(SEG).forEach(function (k) { cnt[k] = 0; });
        users.forEach(function (u) { cnt[u.st.seg]++; if (u.st.risk) cnt.risk++; });
        var active = users.filter(function (u) { return u.st.lastMs && now - u.st.lastMs < 60 * DAY && (u.st.res || u.st.ev || u.st.orders); }).length;
        AD.$("#c-kpis").innerHTML = '<div class="kpis">' +
          kpi("users", "Clientes registrados", users.length, users.filter(function (u) { return ms(u.createdAt) > now - 30 * DAY; }).length + " nuevos este mes") +
          kpi("chart", "Activos (60 días)", active, Math.round(active * 100 / Math.max(1, users.length)) + "% del total") +
          kpi("star", "VIP y frecuentes", cnt.vip + cnt.frecuente, cnt.vip + " VIP · " + cnt.frecuente + " frecuentes") +
          kpi("alert", "Con no-show", cnt.risk, cnt.risk ? "2 o más inasistencias" : "Ninguno") + "</div>";
        /* destacados: los 3 con más actividad */
        var star = users.filter(function (u) { return u.vip; }).sort(SORTS.score.f);
        var best = star.concat(users.filter(function (u) { return !u.vip && u.st.score > 0; }).sort(SORTS.score.f)).slice(0, Math.max(3, Math.min(6, star.length)));
        AD.$("#c-top").innerHTML = best.length ? '<div class="card"><div class="card__h"><div><h2>' + AD.icon("star") + " Clientes destacados</h2><p>" + (star.length ? "Los marcados por el restaurante aparecen primero; después, los más activos por visitas, eventos y pedidos." : "Sugeridos por su actividad. " + (canVip ? "Márcalos con ★ para fijarlos aquí." : "")) + "</p></div></div>" +
          '<div class="podium">' + best.map(function (u, i) {
            return '<article class="pod pod--' + (i + 1) + '"><span class="pod__rank">' + (i + 1) + '</span><span class="cust__av cust__av--lg">' + (u.photo ? '<img src="' + AD.esc(u.photo) + '" alt="" referrerpolicy="no-referrer">' : AD.esc(initials(u.name || u.email))) + "</span>" +
              "<b>" + AD.esc(u.name || u.email) + "</b>" + segPill(u) +
              '<dl class="pod__st"><div><dt>Visitas</dt><dd>' + u.st.visits + "</dd></div><div><dt>Eventos</dt><dd>" + u.st.ev + "</dd></div><div><dt>Pedidos</dt><dd>" + (u.st.orders == null ? "—" : u.st.orders) + "</dd></div></dl>" +
              '<div class="acts acts--c"><button type="button" class="b b--sm b--p" data-gift="' + AD.esc(u.uid) + '">' + AD.icon("tag") + "Beneficio</button>" + (canVip ? '<button type="button" class="b b--sm" data-vip="' + AD.esc(u.uid) + '" title="' + (u.vip ? "Quitar de destacados" : "Marcar como destacado") + '">' + (u.vip ? "★ Quitar" : "☆ Destacar") + "</button>" : "") + "</div></article>";
          }).join("") + "</div>" + (ordersOk ? "" : '<p class="small muted">Los pedidos aún no se cuentan: falta publicar las reglas nuevas de Firestore.</p>') + "</div>" : "";
        AD.$("#c-seg").innerHTML = [["all", "Todos"], ["star", "★ Destacados"]].concat(Object.keys(SEG).map(function (k) { return [k, SEG[k].l]; }), [["risk", "Con no-show"]]).map(function (x) {
          return '<button type="button" class="chip" data-seg="' + x[0] + '" aria-pressed="' + (seg === x[0]) + '">' + x[1] + '<span class="n">' + cnt[x[0]] + "</span></button>";
        }).join("");
        var s = q.toLowerCase();
        var list = users.filter(function (u) {
          if (seg === "risk" ? !u.st.risk : seg === "star" ? !u.vip : seg !== "all" && u.st.seg !== seg) return false;
          return !s || [u.name, u.email, u.phone].join(" ").toLowerCase().indexOf(s) > -1;
        }).sort(SORTS[sort].f);
        AD.$("#c-cnt").textContent = list.length + (list.length === 1 ? " cliente" : " clientes") + (seg !== "all" || s ? " con estos filtros" : "") + " · ordenados por " + SORTS[sort].l.toLowerCase();
        tbl.set(list);
      }
      function kpi(ic, l, v, sub) { return '<div class="kpi"><div class="kpi__l">' + AD.icon(ic) + AD.esc(l) + '</div><div class="kpi__v">' + v + '</div><div class="kpi__s">' + AD.esc(sub) + "</div></div>"; }

      /* carga: cuentas + historial completo (no solo el rango en vivo) + pedidos de cada cuenta */
      var db = AD.db;
      Promise.all([
        db.collection("users").get(),
        AD.can("reservations") ? db.collection("reservations").get().then(function (s) { return s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); }, function () { return null; }) : null,
        AD.can("events") ? db.collection("events").get().then(function (s) { return s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); }, function () { return null; }) : null
      ]).then(function (out) {
        users = out[0].docs.map(function (d) { var x = d.data(), p = x.profile || {}; return { uid: d.id, name: x.name || "", email: x.email || "", phone: p.phone || x.phone || "", address: p.address || x.address || "", photo: x.photo || "", createdAt: x.createdAt || null, vip: x.vip === true, vipNote: x.vipNote || "", vipAt: x.vipAt || null }; });
        allRes = out[1]; allEv = out[2];
        paint();
        return Promise.all(users.map(function (u) {
          return db.collection("users").doc(u.uid).collection("orders").get().then(function (s) { orders[u.uid] = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); }, function () { ordersOk = false; });
        })).then(paint);
      }).catch(function (e) { AD.fail("customers", e); });

      /* ---------- detalle del cliente ---------- */
      function open(uid) {
        var u = users.filter(function (x) { return x.uid === uid; })[0]; if (!u) return;
        var st = u.st, r = st.list.r.slice().sort(function (a, b) { return b.start - a.start; }), ev = st.list.e.slice().sort(function (a, b) { return b.start - a.start; });
        var od = st.list.o.slice().sort(function (a, b) { return ms(b.createdAt) - ms(a.createdAt); });
        var wa = AD.phoneWa(u.phone), tel = String(u.phone || "").replace(/[^\d+]/g, "");
        var html = '<div class="rd"><header class="rd__hero"><span class="rd__av">' + (u.photo ? '<img src="' + AD.esc(u.photo) + '" alt="" referrerpolicy="no-referrer">' : AD.esc(initials(u.name || u.email))) + '</span><div class="rd__who"><b>' + AD.esc(u.name || u.email) + "</b><span>" + AD.esc(u.email) + (u.phone ? " · " + AD.esc(u.phone) : "") + '</span><div class="rd__tags">' + segPill(u) + (ms(u.createdAt) ? '<span class="tag">Cliente desde ' + new Date(ms(u.createdAt)).toLocaleDateString("es-DO", { month: "short", year: "numeric" }) + "</span>" : "") + "</div></div></header>" +
          '<div class="rd__tiles">' +
            '<div class="rd__tile">' + AD.icon("check") + "<small>Visitas</small><b>" + st.visits + "</b><span>" + st.upcoming + " próximas</span></div>" +
            '<div class="rd__tile">' + AD.icon("calendar") + "<small>Reservaciones</small><b>" + st.res + "</b><span>" + st.noshow + " no-show</span></div>" +
            '<div class="rd__tile">' + AD.icon("party") + "<small>Eventos</small><b>" + st.ev + "</b><span>solicitados</span></div>" +
            '<div class="rd__tile">' + AD.icon("cart") + "<small>Pedidos</small><b>" + (st.orders == null ? "—" : st.orders) + "</b><span>" + (st.spent ? AD.money(st.spent) : "sin gasto registrado") + "</span></div></div>" +
          '<div class="rd__quick">' + (wa ? '<a class="rd__q" href="' + wa + '" target="_blank" rel="noopener">' + AD.icon("chat") + "<span>WhatsApp</span></a>" : "") + (tel ? '<a class="rd__q" href="tel:' + AD.esc(tel) + '">' + AD.icon("phone") + "<span>Llamar</span></a>" : "") +
            (u.email ? '<a class="rd__q" href="mailto:' + AD.esc(u.email) + '">' + AD.icon("mail") + "<span>Correo</span></a>" : "") + '<button type="button" class="rd__q rd__q--hot" data-gift="' + AD.esc(u.uid) + '">' + AD.icon("tag") + "<span>Beneficio</span></button>" +
            (canVip ? '<button type="button" class="rd__q' + (u.vip ? " rd__q--gold" : "") + '" data-vip="' + AD.esc(u.uid) + '">' + AD.icon("star") + "<span>" + (u.vip ? "Quitar destacado" : "Destacar") + "</span></button>" : "") + "</div>" +
          (u.vip ? '<blockquote class="rd__note rd__note--gold"><small>Cliente destacado' + (u.vipAt ? " desde " + AD.when(u.vipAt) : "") + "</small>" + AD.esc(u.vipNote || "Marcado por el restaurante.") + "</blockquote>" : "") +
          (u.address ? '<section class="rd__sec"><h3>Dirección</h3><p class="rd__p">' + AD.esc(u.address) + "</p></section>" : "") +
          '<section class="rd__sec"><h3>Reservaciones <span>' + r.length + "</span></h3>" + (r.length ? '<ul class="rows">' + r.slice(0, 20).map(function (x) {
            return '<li><button class="row" data-r="' + AD.esc(x.id) + '"><span class="row__t">' + B.shortDate(x.date).replace(/\.$/, "") + '</span><span class="row__main"><b>' + B.time12(x.time) + " · " + x.party + " pers.</b>" + (x.occasion ? "<small>" + AD.esc(x.occasion) + "</small>" : "") + "</span>" + AD.pill(B.RES_STATUS, x.status) + "</button></li>";
          }).join("") + "</ul>" : '<div class="empty">Sin reservaciones.</div>') + "</section>" +
          '<section class="rd__sec"><h3>Eventos <span>' + ev.length + "</span></h3>" + (ev.length ? '<ul class="rows">' + ev.map(function (x) {
            return '<li><button class="row" data-e="' + AD.esc(x.id) + '"><span class="row__t">' + B.shortDate(x.date).replace(/\.$/, "") + '</span><span class="row__main"><b>' + AD.esc(x.type) + "</b><small>" + x.guests + " invitados</small></span>" + AD.pill(B.EVENT_STATUS, x.status) + "</button></li>";
          }).join("") + "</ul>" : '<div class="empty">Sin eventos.</div>') + "</section>" +
          '<section class="rd__sec"><h3>Pedidos por WhatsApp <span>' + (st.orders == null ? "—" : od.length) + "</span></h3>" + (st.orders == null ? '<div class="empty">Publica las reglas nuevas de Firestore para ver los pedidos.</div>' : od.length ? '<ul class="rows">' + od.slice(0, 15).map(function (x) {
            var n = (x.items || []).reduce(function (a, i) { return a + (i.qty || 0); }, 0);
            return '<li class="row"><span class="row__t">' + (ms(x.createdAt) ? new Date(ms(x.createdAt)).toLocaleDateString("es-DO", { day: "numeric", month: "short" }) : "—") + '</span><span class="row__main"><b>' + n + (n === 1 ? " plato" : " platos") + (x.mode ? " · " + AD.esc(x.mode) : "") + "</b><small>" + AD.esc((x.items || []).map(function (i) { return i.qty + "× " + i.name; }).join(", ")) + "</small></span><b>" + AD.money(x.total || 0) + "</b></li>";
          }).join("") + "</ul>" : '<div class="empty">Sin pedidos.</div>') + "</section></div>";
        var b = AD.drawer("Cliente", html, null, "user:" + u.uid);
        b.onclick = function (e) {
          var rr = e.target.closest("[data-r]"); if (rr && AD.can("reservations")) { AD.openRes(rr.dataset.r); return; }
          var ee = e.target.closest("[data-e]"); if (ee && AD.can("events")) { AD.openEvent(ee.dataset.e); return; }
          var g = e.target.closest("[data-gift]"); if (g) { gift(g.dataset.gift); return; }
          var vv = e.target.closest("[data-vip]"); if (vv) toggleVip(vv.dataset.vip, function () { open(uid); });
        };
      }

      /* ---------- destacados manuales (propietario y administrador) ---------- */
      function toggleVip(uid, after) {
        var u = users.filter(function (x) { return x.uid === uid; })[0]; if (!u || !canVip) return;
        var done = function (on, note) { u.vip = on; u.vipNote = on ? note : ""; u.vipAt = on ? new Date() : null; paint(); if (after) after(); };
        if (u.vip) {
          AD.confirm("Quitar de destacados", "<b>" + AD.esc(u.name || u.email) + "</b> dejará de aparecer como cliente destacado.", "Quitar").then(function (y) {
            if (!y) return;
            AD.db.collection("users").doc(uid).update({ vip: false, vipNote: "", vipBy: AD.me.uid, vipAt: AD.ts() }).then(function () { AD.audit("customer.vip", "users/" + uid, "Quitado: " + (u.name || u.email)); done(false); AD.toast("Quitado de destacados."); }, function (er) { AD.fail("customer.vip", er); });
          });
          return;
        }
        AD.modal({
          title: "Destacar a " + (u.name || u.email),
          body: '<p class="muted small">Aparecerá primero en «Clientes destacados» para darle descuentos y atenciones especiales.</p><div class="f"><label for="v-note">Motivo o beneficio <span class="opt">(opcional)</span></label><input id="v-note" name="note" maxlength="120" placeholder="Ej.: 10 % en cada visita · cliente desde 2020"></div>',
          actions: [{ label: "Cancelar", close: true }, { label: "★ Destacar", cls: "b--p", onClick: function (api) {
            var note = AD.val(api.el, "note");
            return AD.db.collection("users").doc(uid).update({ vip: true, vipNote: note, vipBy: AD.me.uid, vipAt: AD.ts() }).then(function () { AD.audit("customer.vip", "users/" + uid, "Destacado: " + (u.name || u.email)); done(true, note); AD.toast("Cliente destacado."); });
          } }]
        });
      }

      /* ---------- beneficio: descuento por WhatsApp o aviso dentro de la web ---------- */
      function gift(uid) {
        var u = users.filter(function (x) { return x.uid === uid; })[0]; if (!u) return;
        var wa = AD.phoneWa(u.phone), first = String(u.name || "").split(" ")[0] || "";
        function text(f) { return "¡Hola " + first + "! En Caldos Constitución queremos agradecerte por ser un cliente " + (u.st.seg === "vip" ? "VIP" : "especial") + ". Tienes " + AD.val(f, "pct") + "% de descuento" + (AD.val(f, "until") ? " hasta el " + B.longDate(AD.val(f, "until")) : "") + " en tu próxima visita o pedido." + (AD.val(f, "note") ? " " + AD.val(f, "note") : "") + " Solo menciónalo al llegar. ¡Te esperamos!"; }
        AD.modal({
          title: "Beneficio para " + (u.name || u.email),
          body: '<p class="muted small">' + AD.esc(SEG[u.st.seg].l) + " · " + u.st.visits + " visitas · " + u.st.ev + " eventos · " + (u.st.orders == null ? "pedidos sin datos" : u.st.orders + " pedidos") + "</p>" +
            '<div class="grid2"><div class="f"><label for="g-pct">Descuento</label><select id="g-pct" name="pct">' + [5, 10, 15, 20, 25].map(function (p) { return '<option value="' + p + '"' + (p === (u.st.seg === "vip" ? 15 : 10) ? " selected" : "") + ">" + p + " %</option>"; }).join("") + "</select></div>" +
            '<div class="f"><label for="g-until">Válido hasta <span class="opt">(opcional)</span></label><input id="g-until" name="until" type="date" min="' + AD.today() + '" value="' + B.addDays(AD.today(), 30) + '"></div></div>' +
            '<div class="f"><label for="g-note">Mensaje adicional <span class="opt">(opcional)</span></label><textarea id="g-note" name="note" rows="2" maxlength="200" placeholder="Ej.: Válido para mesas de hasta 6 personas."></textarea></div>' +
            '<div class="box"><small class="muted">Vista previa</small><p id="g-prev" class="g-prev"></p></div>',
          onOpen: function (api) { var f = api.el, up = function () { AD.$("#g-prev", f).textContent = text(f); }; f.addEventListener("input", up); f.addEventListener("change", up); up(); },
          actions: [{ label: "Cancelar", close: true },
            { label: "Aviso en la web", icon: "bell", onClick: function (api) {
              var n = AD.notifyDoc(u.uid, "Tienes un beneficio de " + AD.val(api.el, "pct") + "% 🎁", text(api.el), "users/" + u.uid); if (!n) return false;
              var bt = AD.db.batch(); bt.set(n[0], n[1]);
              return bt.commit().then(function () { AD.audit("customer.gift", "users/" + u.uid, AD.val(api.el, "pct") + "% · aviso web"); AD.toast("Beneficio enviado a «Mi cuenta» de " + (first || "el cliente") + "."); });
            } }].concat(wa ? [{ label: "Enviar por WhatsApp", cls: "b--ok", icon: "chat", onClick: function (api) {
              window.open(wa + "?text=" + encodeURIComponent(text(api.el)), "_blank", "noopener");
              AD.audit("customer.gift", "users/" + u.uid, AD.val(api.el, "pct") + "% · WhatsApp");
            } }] : [])
        });
      }

      host.addEventListener("click", function (e) {
        var g = e.target.closest("[data-gift]"); if (g) { gift(g.dataset.gift); return; }
        var vv = e.target.closest("[data-vip]"); if (vv) { e.stopPropagation(); toggleVip(vv.dataset.vip); return; }
        var sg = e.target.closest("[data-seg]"); if (sg) { seg = sg.dataset.seg; paint(); return; }
        var o = e.target.closest("[data-open]"); if (o) open(o.dataset.open);
      });
      AD.$("#c-q").oninput = AD.debounce(function () { q = AD.$("#c-q").value.trim(); paint(); }, 150);
      AD.$("#c-sort").onchange = function () { sort = this.value; paint(); };
      AD.$("#c-xls").onclick = function () {
        AD.xlsx("clientes", [{ name: "Clientes", rows: tbl.rows(), cols: [{ k: "name", l: "Nombre", w: 26 }, { k: "email", l: "Correo", w: 30 }, { k: "phone", l: "Teléfono" },
          { k: "seg", l: "Segmento", v: function (u) { return SEG[u.st.seg].l; } }, { k: "visits", l: "Visitas", v: function (u) { return u.st.visits; } }, { k: "res", l: "Reservaciones", v: function (u) { return u.st.res; } },
          { k: "ev", l: "Eventos", v: function (u) { return u.st.ev; } }, { k: "orders", l: "Pedidos", v: function (u) { return u.st.orders == null ? "" : u.st.orders; } }, { k: "spent", l: "Gasto en pedidos (RD$)", v: function (u) { return u.st.spent || 0; } },
          { k: "noshow", l: "No-show", v: function (u) { return u.st.noshow; } }, { k: "last", l: "Última actividad", v: function (u) { return u.st.lastMs ? new Date(u.st.lastMs).toLocaleDateString("es-DO") : ""; } }, { k: "score", l: "Puntos de actividad", v: function (u) { return u.st.score; } }] }]);
        AD.audit("export.customers", "xlsx", "");
      };
      AD.watch(["res", "ev"], function () { if (!allRes) paint(); });
      paint();
    }
  });

  /* ---------- equipo ----------
     Roles: Propietario (único), Administrador, Recepcionista y Encargado de cocina.
     El propietario gestiona a todos; el administrador solo crea y edita recepcionistas y cocina.
     Las reglas del servidor aplican exactamente lo mismo, aunque alguien manipule la página. */
  var TONE = { owner: "violet", admin: "blue", reception: "green", staff: "green", kitchen: "amber" };
  var ROLE_IC = { admin: "shield", reception: "calendar", kitchen: "utensils" };
  function permsHTML(perms, disabled) {
    return '<div class="chks">' + AD.PERMS.map(function (p) {
      return '<label class="chk"><input type="checkbox" name="p_' + p.k + '"' + (perms && perms[p.k] ? " checked" : "") + (disabled ? " disabled" : "") + "> " + AD.esc(p.l) + "</label>";
    }).join("") + "</div>";
  }
  function readPerms(root) { var o = {}; AD.PERMS.forEach(function (p) { o[p.k] = !!AD.val(root, "p_" + p.k); }); return o; }
  function rolePick(cur) {
    return '<div class="rolepick">' + AD.assignable().map(function (r) {
      return '<label class="rolepick__o"><input type="radio" name="role" value="' + r + '"' + (r === cur ? " checked" : "") + '><span><i class="member__av member__av--' + TONE[r] + '">' + AD.icon(ROLE_IC[r]) + "</i><b>" + AD.esc(AD.ROLES[r]) + "</b><small>" + AD.esc(AD.ROLE_INFO[r]) + "</small></span></label>";
    }).join("") + "</div>";
  }
  /* Al cambiar de rol se cargan sus permisos; el propietario puede ajustarlos después */
  function wireRole(api) {
    api.el.addEventListener("change", function (e) {
      if (e.target.name !== "role") return;
      var p = AD.ROLE_PERMS[e.target.value] || {};
      AD.PERMS.forEach(function (x) { var i = api.el.querySelector('[name="p_' + x.k + '"]'); if (i) i.checked = !!p[x.k]; });
    });
  }
  function tempPass() {
    var c = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789", a = new Uint32Array(12), s = "";
    (window.crypto || window.msCrypto).getRandomValues(a);
    for (var i = 0; i < a.length; i++) s += c[a[i] % c.length];
    return s.slice(0, 4) + "-" + s.slice(4, 8) + "-" + s.slice(8) + "7";
  }

  AD.view("equipo", {
    title: "Equipo y permisos", icon: "shield", group: "Personas", perm: "team",
    render: function (host, top) {
      var admins = [], invites = [], subs = [], owner = AD.isOwner();
      top.innerHTML = '<button class="b b--sm" id="tm-inv">' + AD.icon("mail") + 'Invitar</button><button class="b b--p b--sm" id="tm-new">' + AD.icon("plus") + "Crear cuenta</button>";
      host.innerHTML = '<div class="alert alert--info">' + AD.icon("shield") + "<span>" + (owner ? "Eres el propietario: puedes crear cuentas de Administrador, Recepcionista y Encargado de cocina. Nadie puede quitarte privilegios ni convertirse en propietario."
          : "Como administrador puedes crear y editar cuentas de Recepcionista y Encargado de cocina. Las cuentas de administrador y del propietario solo las gestiona el propietario.") + " Los permisos se comprueban en el servidor.</span></div>" +
        '<div id="tm-sum"></div>' +
        '<div class="card"><div class="card__h"><div><h2>Roles del restaurante</h2><p>Qué puede hacer cada uno en el panel.</p></div></div><div class="roles">' +
          ["admin", "reception", "kitchen"].map(function (r) { return '<article class="role"><span class="member__av member__av--' + TONE[r] + '">' + AD.icon(ROLE_IC[r]) + "</span><div><b>" + AD.ROLES[r] + "</b><p>" + AD.esc(AD.ROLE_INFO[r]) + "</p></div></article>"; }).join("") + "</div></div>" +
        '<div class="card"><div class="card__h"><div><h2>Miembros</h2><p>Toca «Editar» para cambiar el rol, los permisos o desactivar el acceso.</p></div></div><div id="tm-list"><div class="empty">Cargando…</div></div></div>' +
        '<div class="card"><div class="card__h"><div><h2>Invitaciones pendientes</h2><p>La persona entra al panel → «Configuración inicial» → «Tengo una invitación» con ese correo.</p></div></div><div id="tm-inv-list"></div></div>';
      function paint() {
        var n = function (r) { return admins.filter(function (a) { return a.role === r || (r === "reception" && a.role === "staff"); }).length; };
        AD.$("#tm-sum").innerHTML = '<div class="kpis">' +
          '<div class="kpi"><div class="kpi__l">' + AD.icon("users") + 'Miembros</div><div class="kpi__v">' + admins.length + '</div><div class="kpi__s">' + admins.filter(function (a) { return a.active; }).length + " con acceso activo</div></div>" +
          '<div class="kpi"><div class="kpi__l">' + AD.icon("shield") + 'Administradores</div><div class="kpi__v">' + n("admin") + '</div><div class="kpi__s">Operación diaria</div></div>' +
          '<div class="kpi"><div class="kpi__l">' + AD.icon("calendar") + 'Recepcionistas</div><div class="kpi__v">' + n("reception") + '</div><div class="kpi__s">Mesas y reservaciones</div></div>' +
          '<div class="kpi"><div class="kpi__l">' + AD.icon("utensils") + 'Cocina</div><div class="kpi__v">' + n("kitchen") + '</div><div class="kpi__s">Platos y disponibilidad</div></div></div>';
        AD.$("#tm-list").innerHTML = '<div class="members">' + admins.map(function (a) {
          var on = a.role === "owner" ? AD.PERMS : AD.PERMS.filter(function (p) { return a.perms && a.perms[p.k]; });
          var ini = String(a.name || a.email || "?").trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join("").toUpperCase();
          return '<article class="member' + (a.active ? "" : " member--off") + '"><header><span class="member__av member__av--' + (TONE[a.role] || "gray") + '">' + AD.esc(ini) + '</span><div class="member__who"><b>' + AD.esc(a.name || a.email) + (a.uid === AD.me.uid ? ' <span class="tag">tú</span>' : "") + "</b><small>" + AD.esc(a.email || "") + "</small></div>" +
            '<span class="st st--' + (TONE[a.role] || "gray") + '">' + AD.esc(AD.ROLES[a.role] || a.role) + "</span></header>" +
            '<div class="member__perms">' + (a.role === "owner" ? '<span class="perm perm--all">' + AD.icon("check") + "Todos los permisos</span>" : on.length ? on.map(function (p) { return '<span class="perm">' + AD.esc(p.l) + "</span>"; }).join("") : '<span class="muted small">Sin permisos</span>') + "</div>" +
            '<footer><span class="small muted">' + (a.active ? (a.lastLogin ? "Último acceso " + AD.when(a.lastLogin) : "Aún no ha entrado") : "Acceso desactivado") + (a.createdByName ? " · creada por " + AD.esc(a.createdByName) : "") + "</span>" +
            (a.uid !== AD.me.uid && AD.canManage(a.role) ? '<button class="b b--sm" data-ed="' + AD.esc(a.uid) + '">' + AD.icon("edit") + "Editar</button>" : "") + "</footer></article>";
        }).join("") + "</div>";
        AD.$("#tm-inv-list").innerHTML = invites.length ? '<ul class="rows">' + invites.map(function (i) {
          return '<li class="row"><span class="member__av member__av--gray">' + AD.icon("mail") + '</span><span class="row__main"><b>' + AD.esc(i.email) + "</b><small>" + AD.esc(AD.ROLES[i.role] || i.role) + " · enviada " + AD.when(i.at) + "</small></span>" +
            (AD.canManage(i.role) ? '<button class="b b--sm b--danger" data-rv="' + AD.esc(i.email) + '">Revocar</button>' : "") + "</li>";
        }).join("") + "</ul>" : '<div class="empty">No hay invitaciones pendientes.</div>';
      }
      subs.push(AD.db.collection("admins").onSnapshot(function (q) {
        var order = { owner: 0, admin: 1, reception: 2, staff: 2, kitchen: 3 };
        admins = q.docs.map(function (d) { return Object.assign({ uid: d.id }, d.data()); }).sort(function (a, b) { return (order[a.role] || 9) - (order[b.role] || 9) || String(a.name).localeCompare(String(b.name)); }); paint();
      }, function (e) { AD.fail("team", e); }));
      subs.push(AD.db.collection("invites").onSnapshot(function (q) { invites = q.docs.map(function (d) { return Object.assign({ email: d.id }, d.data()); }); paint(); }, function (e) { AD.fail("invites", e); }));
      AD.onLeave(function () { subs.forEach(function (u) { u(); }); });

      function emailOk(f, email) {
        if (!AD.fieldErr(f, "email", /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? "" : "Correo no válido.")) return false;
        if (admins.some(function (a) { return (a.email || "").toLowerCase() === email; })) { AD.fieldErr(f, "email", "Esa persona ya es parte del equipo."); return false; }
        return true;
      }
      function rolePermsOf(f) {
        var role = (AD.$('input[name="role"]:checked', f) || {}).value;
        if (AD.assignable().indexOf(role) < 0) return null;
        var perms = owner ? readPerms(f) : Object.assign({}, AD.ROLE_PERMS[role]);
        if (!owner) AD.PERMS.forEach(function (p) { perms[p.k] = !!perms[p.k]; });
        return { role: role, perms: perms };
      }

      /* ---------- crear cuenta ---------- */
      AD.$("#tm-new").onclick = function () {
        var pass = tempPass(), first = AD.assignable()[AD.assignable().length > 2 ? 1 : 0];
        AD.modal({
          title: "Crear cuenta del equipo", wide: true,
          body: '<div class="grid2"><div class="f"><label for="tc-name">Nombre</label><input id="tc-name" name="name" maxlength="80" autocomplete="off"></div>' +
            '<div class="f"><label for="tc-email">Correo</label><input id="tc-email" name="email" type="email" maxlength="120" autocomplete="off"></div></div>' +
            '<div class="f"><span class="f__l">Rol</span>' + rolePick(first) + "</div>" +
            (owner ? '<details class="f"><summary class="f__l">Ajustar permisos (opcional)</summary>' + permsHTML(AD.ROLE_PERMS[first]) + "</details>" : "") +
            '<div class="box"><b>Contraseña temporal</b><div class="pw-temp"><code id="tc-pass">' + pass + '</code><button type="button" class="b b--sm" id="tc-copy">' + AD.icon("check") + "Copiar</button></div>" +
            '<small class="muted">Entrégasela en persona. Además le enviaremos un correo para que cree su propia contraseña. Nunca la envíes por chats públicos.</small></div>',
          onOpen: function (api) {
            wireRole(api);
            AD.$("#tc-copy", api.el).onclick = function () { (navigator.clipboard ? navigator.clipboard.writeText(pass) : Promise.reject()).then(function () { AD.toast("Contraseña copiada."); }, function () { AD.toast("Cópiala a mano: " + pass); }); };
          },
          actions: [{ label: "Cancelar", close: true }, { label: "Crear cuenta", cls: "b--p", icon: "check", onClick: function (api) {
            var f = api.el, email = AD.val(f, "email").toLowerCase(), name = AD.val(f, "name"), rp = rolePermsOf(f);
            var ok = AD.fieldErr(f, "name", name.length >= 2 ? "" : "Escribe su nombre."); ok = emailOk(f, email) && ok;
            if (!ok) return false;
            if (!rp) { api.error("Elige un rol."); return false; }
            return AD.createAccount(email, pass).then(function (uid) {
              return AD.db.collection("admins").doc(uid).set({ role: rp.role, perms: rp.perms, active: true, email: email, name: name.slice(0, 80), createdBy: AD.me.uid, createdByName: AD.me.name || AD.me.email, createdAt: AD.ts() }).then(function () {
                AD.audit("team.create", "admins/" + uid, AD.ROLES[rp.role] + " · " + email);
                return AD.auth.sendPasswordResetEmail(email).catch(function () {});
              });
            }).then(function () { AD.toast("Cuenta creada. " + name.split(" ")[0] + " ya puede entrar al panel con su correo."); }, function (e) {
              var c = (e && e.code) || "";
              if (/email-already-in-use/.test(c)) throw { userMsg: "Ese correo ya tiene una cuenta. Usa «Invitar» para darle acceso al panel." };
              if (/invalid-email/.test(c)) throw { userMsg: "El correo no es válido." };
              if (/operation-not-allowed/.test(c)) throw { userMsg: "Activa «Correo electrónico/contraseña» en Firebase → Authentication." };
              throw e;
            });
          } }]
        });
      };

      /* ---------- invitar (la persona crea su propia cuenta) ---------- */
      AD.$("#tm-inv").onclick = function () {
        var first = AD.assignable()[AD.assignable().length > 2 ? 1 : 0];
        AD.modal({
          title: "Invitar al equipo", wide: true,
          body: '<div class="grid2"><div class="f"><label for="tm-email">Correo de la persona</label><input id="tm-email" name="email" type="email" maxlength="120"></div>' +
            '<div class="f"><label for="tm-name">Nombre <span class="opt">(opcional)</span></label><input id="tm-name" name="name" maxlength="80"></div></div>' +
            '<div class="f"><span class="f__l">Rol</span>' + rolePick(first) + "</div>" +
            (owner ? '<details class="f"><summary class="f__l">Ajustar permisos (opcional)</summary>' + permsHTML(AD.ROLE_PERMS[first]) + "</details>" : ""),
          onOpen: wireRole,
          actions: [{ label: "Cancelar", close: true }, { label: "Crear invitación", cls: "b--p", onClick: function (api) {
            var f = api.el, email = AD.val(f, "email").toLowerCase(), rp = rolePermsOf(f);
            if (!emailOk(f, email)) return false;
            if (!rp) { api.error("Elige un rol."); return false; }
            return AD.db.collection("invites").doc(email).set({ role: rp.role, perms: rp.perms, name: AD.val(f, "name"), by: AD.me.uid, at: AD.ts() }).then(function () {
              AD.audit("team.invite", "invites/" + email, AD.ROLES[rp.role]);
              AD.toast("Invitación creada. Avísale que entre al panel con ese correo.");
            });
          } }]
        });
      };

      host.addEventListener("click", function (e) {
        var rv = e.target.closest("[data-rv]");
        if (rv) { AD.confirm("Revocar invitación", "La invitación para <b>" + AD.esc(rv.dataset.rv) + "</b> dejará de funcionar.", "Revocar", true).then(function (y) { if (y) AD.db.collection("invites").doc(rv.dataset.rv).delete().then(function () { AD.audit("team.revoke", "invites/" + rv.dataset.rv, ""); }, function (er) { AD.fail("revoke", er); }); }); return; }
        var ed = e.target.closest("[data-ed]"); if (!ed) return;
        var a = admins.filter(function (x) { return x.uid === ed.dataset.ed; })[0]; if (!a || !AD.canManage(a.role)) return;
        var cur = a.role === "staff" ? "reception" : a.role;
        AD.modal({
          title: "Editar · " + (a.name || a.email), wide: true,
          body: '<div class="f"><span class="f__l">Rol</span>' + rolePick(cur) + "</div>" +
            '<div class="f"><span class="f__l">Acceso</span><label class="chk"><input type="checkbox" name="active"' + (a.active ? " checked" : "") + "> Puede entrar al panel</label></div>" +
            (owner ? '<div class="f"><span class="f__l">Permisos</span>' + permsHTML(a.perms) + "</div>" : '<p class="small muted">Los permisos se asignan según el rol.</p>'),
          onOpen: wireRole,
          actions: [{ label: "Quitar del equipo", cls: "b--danger sp", icon: "trash", onClick: function () {
            return AD.confirm("Quitar del equipo", "<b>" + AD.esc(a.name || a.email) + "</b> perderá el acceso al panel de inmediato.", "Quitar", true).then(function (y) {
              if (!y) return Promise.reject("keep");
              return AD.db.collection("admins").doc(a.uid).delete().then(function () { AD.audit("team.remove", "admins/" + a.uid, a.email); AD.toast("Miembro quitado."); });
            });
          } }, { label: "Cancelar", close: true }, { label: "Guardar", cls: "b--p", onClick: function (api) {
            var rp = rolePermsOf(api.el); if (!rp) { api.error("Elige un rol."); return false; }
            var d = { role: rp.role, perms: rp.perms, active: AD.val(api.el, "active"), updatedAt: AD.ts() };
            return AD.db.collection("admins").doc(a.uid).update(d).then(function () { AD.audit("team.update", "admins/" + a.uid, AD.ROLES[d.role] + (d.active ? "" : " · desactivado")); AD.toast("Cambios guardados."); });
          } }]
        });
      });
    }
  });
})(window.CC = window.CC || {});
