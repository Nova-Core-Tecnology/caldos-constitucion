/* Reportes con datos reales de la base de datos para cualquier rango de fechas, con exportación a Excel y CSV. */
(function (CC) {
  "use strict";
  var AD = window.AD, B = CC.booking;
  var DOWS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  AD.view("reportes", {
    title: "Reportes", icon: "chart", group: "General", perm: "reports",
    render: function (host, top) {
      var t = AD.today(), st = { from: B.addDays(t, -29), to: t }, data = null, req = 0;
      top.innerHTML = '<button class="b b--sm" id="rp-csv">' + AD.icon("download") + 'CSV</button><button class="b b--p b--sm" id="rp-xls">' + AD.icon("download") + "Excel</button>";
      host.innerHTML = '<div class="bar"><div class="f"><label for="rp-from">Desde</label><input id="rp-from" type="date" value="' + st.from + '"></div><div class="f"><label for="rp-to">Hasta</label><input id="rp-to" type="date" value="' + st.to + '"></div>' +
        '<div class="acts"><button class="b b--sm" data-p="7">7 días</button><button class="b b--sm" data-p="30">30 días</button><button class="b b--sm" data-p="90">90 días</button><button class="b b--sm" data-p="month">Este mes</button><button class="b b--sm" data-p="year">Este año</button></div></div><div id="rp"></div>';

      function load() {
        var my = ++req;
        AD.$("#rp").innerHTML = '<div class="empty">Calculando…</div>';
        var qs = [];
        qs.push(AD.can("reservations") ? AD.db.collection("reservations").where("date", ">=", st.from).where("date", "<=", st.to).get() : Promise.resolve(null));
        qs.push(AD.can("events") ? AD.db.collection("events").where("date", ">=", st.from).where("date", "<=", st.to).get() : Promise.resolve(null));
        Promise.all(qs).then(function (r) {
          if (my !== req) return;
          data = { res: r[0] ? r[0].docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }) : [], ev: r[1] ? r[1].docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }) : [], canR: !!r[0], canE: !!r[1] };
          paint();
        }).catch(function (e) { AD.fail("reports", e); AD.$("#rp").innerHTML = '<div class="empty">No se pudo calcular el reporte.</div>'; });
      }
      function calc() {
        var res = data.res, ev = data.ev, served = res.filter(function (r) { return r.status === "confirmed" || r.status === "completed"; });
        var by = function (list, f) { var o = {}; list.forEach(function (x) { var k = f(x); o[k] = (o[k] || 0) + 1; }); return o; };
        var days = [], d = st.from, n = 0;
        while (d <= st.to && n++ < 400) { days.push(d); d = B.addDays(d, 1); }
        var perDay = days.map(function (x) { var l = served.filter(function (r) { return r.date === x; }); return { date: x, res: l.length, people: l.reduce(function (a, r) { return a + r.party; }, 0) }; });
        var dow = [0, 0, 0, 0, 0, 0, 0]; served.forEach(function (r) { dow[B.isoDow(r.date) - 1] += r.party; });
        var hours = {}; served.forEach(function (r) { var h = r.time.slice(0, 2); hours[h] = (hours[h] || 0) + 1; });
        var dishes = {}; res.forEach(function (r) { (r.dishes || []).forEach(function (x) { dishes[x.name] = (dishes[x.name] || 0) + (x.qty || 1); }); });
        var st0 = by(res, function (r) { return r.status; }), closed = (st0.cancelled || 0) + (st0.rejected || 0);
        var finished = (st0.completed || 0) + (st0.noshow || 0);
        return {
          res: res, ev: ev, served: served, perDay: perDay, dow: dow, hours: hours, dishes: dishes, st: st0,
          people: served.reduce(function (a, r) { return a + r.party; }, 0),
          avgParty: served.length ? (served.reduce(function (a, r) { return a + r.party; }, 0) / served.length) : 0,
          cancelRate: res.length ? closed * 100 / res.length : 0, noshowRate: finished ? (st0.noshow || 0) * 100 / finished : 0,
          web: res.filter(function (r) { return r.source !== "staff"; }).length,
          evSt: by(ev, function (e) { return e.status; }), evType: by(ev, function (e) { return e.type; }),
          evIncome: ev.filter(function (e) { return (e.status === "confirmed" || e.status === "completed") && e.quote; }).reduce(function (a, e) { return a + (Number(e.quote.amount) || 0); }, 0),
          occ: by(res.filter(function (r) { return r.occasion; }), function (r) { return r.occasion; })
        };
      }
      function paint() {
        var c = calc(), fmt = function (n) { return (Math.round(n * 10) / 10).toLocaleString("es-DO"); };
        var top5 = function (o, n) { return Object.keys(o).map(function (k) { return { l: k, v: o[k] }; }).sort(function (a, b) { return b.v - a.v; }).slice(0, n || 8); };
        var html = '<div class="kpis">' +
          k("calendar", "Reservaciones", c.res.length, c.web + " desde la web") + k("users", "Personas atendidas", c.people, "confirmadas y completadas") +
          k("users", "Promedio por mesa", fmt(c.avgParty), "personas por reservación") + k("close", "Canceladas o rechazadas", fmt(c.cancelRate) + "%", (c.st.cancelled || 0) + " canceladas · " + (c.st.rejected || 0) + " rechazadas") +
          k("alert", "No se presentaron", fmt(c.noshowRate) + "%", (c.st.noshow || 0) + " de " + ((c.st.completed || 0) + (c.st.noshow || 0)) + " finalizadas") +
          k("party", "Eventos", c.ev.length, (c.evSt.confirmed || 0) + (c.evSt.completed || 0) + " confirmados · " + AD.money(c.evIncome) + " cotizado") + "</div>";
        if (!data.canR) html += '<div class="alert">' + AD.icon("info") + "<span>No tienes permiso de Reservaciones: las cifras de mesas no se incluyen.</span></div>";
        html += '<div class="card"><div class="card__h"><div><h2>Personas por día</h2><p>Reservaciones confirmadas y completadas</p></div></div>' +
          AD.barChart(c.perDay.map(function (x) { return { l: x.date.slice(8) + "/" + x.date.slice(5, 7), t: B.shortDate(x.date) + " · " + x.res + " reservas", v: x.people }; }), { label: "Personas por día", bw: c.perDay.length > 60 ? 10 : 28 }) + "</div>" +
          '<div class="cards"><div class="card"><div class="card__h"><h2>Por día de la semana</h2></div>' + AD.barChart(c.dow.map(function (v, i) { return { l: DOWS[i], v: v }; }), { label: "Personas por día de la semana", bw: 46 }) + "</div>" +
          '<div class="card"><div class="card__h"><h2>Horas más pedidas</h2></div>' + AD.barChart(Object.keys(c.hours).sort().map(function (h) { return { l: B.time12(h + ":00").replace(":00", "").replace(" ", ""), v: c.hours[h] }; }), { label: "Reservaciones por hora", bw: 34 }) + "</div></div>" +
          '<div class="cards"><div class="card"><div class="card__h"><h2>Estados de las reservaciones</h2></div>' + AD.donut(Object.keys(B.RES_STATUS).map(function (s) { return { l: B.RES_STATUS[s].label, v: c.st[s] || 0, c: AD.TONE[B.RES_STATUS[s].tone] }; }), { unit: "reservas" }) + "</div>" +
          '<div class="card"><div class="card__h"><h2>Eventos por estado</h2></div>' + AD.donut(Object.keys(B.EVENT_STATUS).map(function (s) { return { l: B.EVENT_STATUS[s].label, v: c.evSt[s] || 0, c: AD.TONE[B.EVENT_STATUS[s].tone] }; }), { unit: "eventos" }) + "</div></div>" +
          '<div class="cards"><div class="card"><div class="card__h"><div><h2>Platos más elegidos al reservar</h2><p>Unidades preseleccionadas (no son ventas)</p></div></div>' + AD.hbars(top5(c.dishes, 10)) + "</div>" +
          '<div class="card"><div class="card__h"><h2>Tipos de evento</h2></div>' + AD.hbars(top5(c.evType)) + '<p class="sec">Ocasiones en reservaciones</p>' + AD.hbars(top5(c.occ)) + "</div></div>";
        AD.$("#rp").innerHTML = html;
        st.calc = c;
      }
      function k(ic, l, v, s) { return '<div class="kpi"><div class="kpi__l">' + AD.icon(ic) + AD.esc(l) + '</div><div class="kpi__v">' + v + '</div><div class="kpi__s">' + AD.esc(s) + "</div></div>"; }

      host.addEventListener("click", function (e) {
        var p = e.target.closest("[data-p]"); if (!p) return;
        var v = p.dataset.p;
        if (v === "month") { st.from = t.slice(0, 8) + "01"; st.to = t; }
        else if (v === "year") { st.from = t.slice(0, 5) + "01-01"; st.to = t; }
        else { st.from = B.addDays(t, -(Number(v) - 1)); st.to = t; }
        AD.$("#rp-from").value = st.from; AD.$("#rp-to").value = st.to; load();
      });
      AD.$("#rp-from").onchange = function () { if (this.value) { st.from = this.value; if (st.to < st.from) { st.to = st.from; AD.$("#rp-to").value = st.to; } load(); } };
      AD.$("#rp-to").onchange = function () { if (this.value) { st.to = this.value; if (st.to < st.from) { st.from = st.to; AD.$("#rp-from").value = st.from; } load(); } };
      AD.$("#rp-xls").onclick = function () {
        if (!st.calc) return;
        var c = st.calc, name = "reporte_" + st.from + "_" + st.to;
        var summary = [
          { k: "Reservaciones", v: c.res.length }, { k: "Desde la web", v: c.web }, { k: "Personas atendidas", v: c.people }, { k: "Promedio de personas", v: Math.round(c.avgParty * 10) / 10 },
          { k: "Canceladas", v: c.st.cancelled || 0 }, { k: "Rechazadas", v: c.st.rejected || 0 }, { k: "No se presentaron", v: c.st.noshow || 0 }, { k: "Completadas", v: c.st.completed || 0 },
          { k: "Eventos", v: c.ev.length }, { k: "Eventos confirmados o completados", v: (c.evSt.confirmed || 0) + (c.evSt.completed || 0) }, { k: "Total cotizado en eventos confirmados (RD$)", v: c.evIncome }
        ];
        AD.xlsx(name, [
          { name: "Resumen", rows: [{ k: "Periodo", v: st.from + " a " + st.to }].concat(summary), cols: [{ k: "k", l: "Indicador", w: 40 }, { k: "v", l: "Valor", w: 20 }] },
          { name: "Por día", rows: c.perDay, cols: [{ k: "date", l: "Fecha" }, { k: "res", l: "Reservaciones" }, { k: "people", l: "Personas" }] },
          { name: "Reservaciones", rows: c.res.slice().sort(function (a, b) { return a.start - b.start; }), cols: AD.RES_EXPORT },
          { name: "Eventos", rows: c.ev.slice().sort(function (a, b) { return a.start - b.start; }), cols: AD.EV_EXPORT }
        ]);
        AD.audit("export.report", "xlsx", st.from + "–" + st.to);
      };
      AD.$("#rp-csv").onclick = function () { if (st.calc) { AD.csv("reservaciones_" + st.from + "_" + st.to, st.calc.res.slice().sort(function (a, b) { return a.start - b.start; }), AD.RES_EXPORT); AD.audit("export.report", "csv", st.from + "–" + st.to); } };
      load();
    }
  });
})(window.CC = window.CC || {});
