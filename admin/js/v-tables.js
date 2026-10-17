/* Mesas: plano del día (qué mesa está ocupada en cada franja), mesas y capacidad, y bloqueos. */
(function (CC) {
  "use strict";
  var AD = window.AD, B = CC.booking;

  function tableForm(t) {
    t = t || {};
    var isNew = !t.id;
    AD.modal({
      title: isNew ? "Nueva mesa" : "Editar " + t.name,
      body: '<div class="grid2"><div class="f"><label for="t-name">Nombre</label><input id="t-name" name="name" maxlength="40" value="' + AD.esc(t.name || "Mesa " + (AD.live.tables.length + 1)) + '"></div>' +
        '<div class="f"><label for="t-seats">Puestos</label><input id="t-seats" name="seats" type="number" min="1" max="60" value="' + (t.seats || 4) + '"></div>' +
        '<div class="f"><label for="t-zone">Zona</label><input id="t-zone" name="zone" maxlength="40" list="t-zones" value="' + AD.esc(t.zone || "Salón") + '"><datalist id="t-zones">' +
        AD.live.tables.map(function (x) { return x.zone; }).filter(function (z, i, a) { return z && a.indexOf(z) === i; }).map(function (z) { return '<option value="' + AD.esc(z) + '">'; }).join("") + "</datalist></div>" +
        '<div class="f"><label for="t-order">Orden</label><input id="t-order" name="order" type="number" min="0" max="999" value="' + (t.order != null ? t.order : AD.live.tables.length + 1) + '"></div>' +
        '<label class="chk full"><input type="checkbox" name="active"' + (t.active === false ? "" : " checked") + "> Disponible para reservaciones</label></div>",
      actions: [].concat(isNew ? [] : [{ label: "Eliminar", cls: "b--danger sp", icon: "trash", onClick: function () {
        return AD.db.collection("locks").where("tableId", "==", t.id).get().then(function (q) {
          if (q.docs.some(function (d) { return d.data().date >= AD.today(); })) throw AD.ops.userErr("Esta mesa tiene reservaciones, eventos o bloqueos próximos. Desactívala en lugar de eliminarla.");
          return AD.db.collection("tables").doc(t.id).delete();
        }).then(function () { AD.audit("table.delete", "tables/" + t.id, t.name); AD.toast("Mesa eliminada."); });
      } }], [{ label: "Cancelar", close: true }, { label: "Guardar", cls: "b--p", onClick: function (api) {
        var f = api.el, name = AD.val(f, "name"), seats = Math.round(Number(AD.val(f, "seats"))), ok = true;
        ok = AD.fieldErr(f, "name", name ? "" : "Escribe un nombre.") && ok;
        ok = AD.fieldErr(f, "seats", seats >= 1 && seats <= 60 ? "" : "Entre 1 y 60 puestos.") && ok;
        if (!ok) return false;
        var d = { name: name, seats: seats, zone: AD.val(f, "zone"), order: Number(AD.val(f, "order")) || 0, active: AD.val(f, "active") };
        var id = t.id || ("m" + Date.now().toString(36));
        return AD.db.collection("tables").doc(id).set(d, { merge: true }).then(function () { AD.audit(isNew ? "table.create" : "table.update", "tables/" + id, name + " · " + seats + " puestos"); AD.toast("Mesa guardada."); });
      } }])
    });
  }
  function blockForm() {
    var S = AD.S, t = AD.today();
    var opts = function (from, to, sel) { var o = ""; for (var m = B.min(from); m <= B.min(to); m += S.slotMinutes) { var x = B.hhmm(m); o += '<option value="' + x + '"' + (x === sel ? " selected" : "") + ">" + B.time12(x) + "</option>"; } return o; };
    AD.modal({
      title: "Bloquear mesas", wide: true,
      body: '<p class="muted small">Las mesas bloqueadas no se pueden reservar en ese horario (mantenimiento, clientes sin reserva, etc.). Si alguna ya está ocupada, no se guardará nada.</p>' +
        '<div class="grid3"><div class="f"><label for="b-date">Día</label><input id="b-date" name="date" type="date" min="' + t + '" value="' + t + '"></div>' +
        '<div class="f"><label for="b-from">Desde</label><select id="b-from" name="from">' + opts(S.openTime, B.hhmm(B.min(S.closeTime) - S.slotMinutes), S.openTime) + "</select></div>" +
        '<div class="f"><label for="b-to">Hasta</label><select id="b-to" name="to">' + opts(B.hhmm(B.min(S.openTime) + S.slotMinutes), S.closeTime, S.closeTime) + "</select></div></div>" +
        '<div class="f"><span class="f__l">Mesas</span><div class="tpick">' + AD.live.tables.filter(function (x) { return x.active !== false; }).map(function (x) {
          return '<label><input type="checkbox" value="' + AD.esc(x.id) + '"><b>' + AD.esc(x.name) + "</b><small>" + x.seats + " puestos · " + AD.esc(x.zone || "") + "</small></label>";
        }).join("") + '</div><button type="button" class="b b--sm" id="b-all" style="justify-self:start;margin-top:.4rem">Todas</button></div>' +
        '<div class="f"><label for="b-why">Motivo</label><input id="b-why" name="reason" maxlength="120" placeholder="Ej.: mantenimiento, grupo sin reserva"></div>',
      onOpen: function (api) { AD.$("#b-all", api.el).onclick = function () { AD.$$(".tpick input", api.el).forEach(function (i) { i.checked = true; }); }; },
      actions: [{ label: "Cancelar", close: true }, { label: "Bloquear", cls: "b--p", icon: "lock", onClick: function (api) {
        var f = api.el, ids = AD.$$(".tpick input:checked", f).map(function (i) { return i.value; }), date = AD.val(f, "date"), from = AD.val(f, "from"), to = AD.val(f, "to");
        if (!ids.length) { api.error("Elige al menos una mesa."); return false; }
        if (!date || date < t) { api.error("Elige un día desde hoy."); return false; }
        if (to <= from) { api.error("La hora final debe ser después de la inicial."); return false; }
        return AD.ops.block(ids, date, from, to, AD.val(f, "reason")).then(function () { AD.toast("Mesas bloqueadas."); });
      } }]
    });
  }

  AD.view("mesas", {
    title: "Mesas y plano", icon: "table", group: "Operación", perm: ["tables", "reservations"],
    render: function (host, top) {
      var date = AD.today(), day = null, loading = 0;
      if (AD.can("tables")) top.innerHTML = '<button class="b b--sm" id="t-block">' + AD.icon("lock") + 'Bloquear</button><button class="b b--p b--sm" id="t-new">' + AD.icon("plus") + "Mesa</button>";
      host.innerHTML = '<div class="card"><div class="card__h"><div><h2>Plano del día</h2><p>Cada casilla es una franja de ' + AD.S.slotMinutes + ' minutos. Toca una ocupada para ver el detalle.</p></div>' +
        '<div class="acts"><button class="b b--sm b--icon" data-d="-1" aria-label="Día anterior">' + AD.icon("left") + '</button><input class="in" type="date" id="t-date" value="' + date + '" style="width:auto"><button class="b b--sm b--icon" data-d="1" aria-label="Día siguiente">' + AD.icon("right") + "</button></div></div>" +
        '<div id="t-plan" class="plan"></div><ul class="legend"><li><i class="lg-free"></i>Libre</li><li><i class="lg-res"></i>Reservada</li><li><i class="lg-pend"></i>Pendiente</li><li><i class="lg-ev"></i>Evento</li><li><i class="lg-blk"></i>Bloqueada</li></ul></div>' +
        '<div class="cards"><div class="card"><div class="card__h"><div><h2>Mesas</h2><p id="t-cap"></p></div></div><div id="t-list"></div></div>' +
        '<div class="card"><div class="card__h"><div><h2>Bloqueos próximos</h2><p>Mesas fuera de servicio por horario</p></div></div><div id="t-blocks"></div></div></div>';

      function loadDay() {
        var my = ++loading;
        AD.ops.dayIndex(date).then(function (d) { if (my === loading) { day = d; plan(); } }).catch(function (e) { AD.fail("plan", e); });
      }
      function plan() {
        var S = AD.S, times = []; for (var m = B.min(S.openTime); m < B.min(S.closeTime); m += S.slotMinutes) times.push(B.hhmm(m));
        var res = AD.resOn(date), pend = {};
        res.filter(function (r) { return r.status === "pending"; }).forEach(function (r) { pend[r.id] = r; });
        var tables = AD.live.tables.filter(function (t) { return t.active !== false; });
        var h = "<table><thead><tr><th class='tn'>Mesa</th>" + times.map(function (x) { return "<th>" + (x.slice(3) === "00" ? B.time12(x).replace(":00", "") : "") + "</th>"; }).join("") + "</tr></thead><tbody>" +
          tables.map(function (t) {
            return '<tr><th class="tn">' + AD.esc(t.name) + ' <span class="muted">(' + t.seats + ")</span></th>" + times.map(function (x) {
              var k = B.key(x), l = day && day.idx.busy[k] && day.idx.busy[k][t.id];
              if (!l) return "<td></td>";
              var cls = l.kind === "block" ? "block" : l.kind === "event" ? "event" : "res";
              var r = (AD.live.res || []).filter(function (y) { return y.id === l.refId; })[0], ev = (AD.live.ev || []).filter(function (y) { return y.id === l.refId; })[0];
              var title = l.kind === "block" ? "Bloqueada" : r ? r.name + " · " + r.party + " pers." : ev ? ev.type + " · " + ev.name : "Ocupada";
              return '<td class="' + cls + '" data-ref="' + AD.esc(l.refId) + '" data-kind="' + l.kind + '" title="' + AD.esc(B.time12(x) + " · " + title) + '"></td>';
            }).join("") + "</tr>";
          }).join("") + "</tbody></table>";
        var np = Object.keys(pend).length;
        AD.$("#t-plan").innerHTML = (np ? '<div class="alert">' + AD.icon("info") + "<span>" + np + " reservación(es) pendiente(s) este día aún sin mesa. Confírmalas en Reservaciones.</span></div>" : "") + (tables.length ? h : '<div class="empty">No hay mesas activas.</div>');
      }
      function list() {
        var t = AD.live.tables, seats = t.filter(function (x) { return x.active !== false; }).reduce(function (a, x) { return a + (Number(x.seats) || 0); }, 0);
        AD.$("#t-cap").textContent = t.filter(function (x) { return x.active !== false; }).length + " mesas activas · " + seats + " puestos · capacidad del local: " + AD.S.capacity + " personas";
        AD.$("#t-list").innerHTML = t.length ? '<ul class="rows">' + t.map(function (x) {
          return '<li class="row"><span class="row__t">' + x.seats + '</span><span class="row__main"><b>' + AD.esc(x.name) + "</b><small>" + AD.esc(x.zone || "") + (x.active === false ? " · desactivada" : "") + "</small></span>" +
            (AD.can("tables") ? '<button class="b b--sm" data-edit="' + AD.esc(x.id) + '">' + AD.icon("edit") + "Editar</button>" : "") + "</li>";
        }).join("") + "</ul>" : '<div class="empty">Aún no hay mesas. Crea la configuración inicial desde el Resumen.</div>';
        var bl = (AD.live.blocks || []).filter(function (b) { return b.date >= AD.today(); }).sort(function (a, b) { return (a.date + a.from).localeCompare(b.date + b.from); });
        AD.$("#t-blocks").innerHTML = !AD.can("tables") ? '<div class="empty">Sin permiso para gestionar bloqueos.</div>' : bl.length ? '<ul class="rows">' + bl.map(function (b) {
          return '<li class="row"><span class="row__t">' + B.shortDate(b.date).replace(/\.$/, "") + '</span><span class="row__main"><b>' + AD.esc((b.tableNames || []).join(", ")) + "</b><small>" + B.time12(b.from) + "–" + B.time12(b.to) + (b.reason ? " · " + AD.esc(b.reason) : "") + "</small></span>" +
            '<button class="b b--sm" data-unblock="' + AD.esc(b.id) + '">' + AD.icon("close") + "Quitar</button></li>";
        }).join("") + "</ul>" : '<div class="empty">No hay bloqueos.</div>';
      }
      host.addEventListener("click", function (e) {
        var d = e.target.closest("[data-d]"); if (d) { date = B.addDays(date, Number(d.dataset.d)); AD.$("#t-date").value = date; loadDay(); return; }
        var c = e.target.closest("td[data-ref]");
        if (c) { var k = c.dataset.kind; if (k === "res" && AD.can("reservations")) AD.openRes(c.dataset.ref); else if (k === "event" && AD.can("events")) AD.openEvent(c.dataset.ref); return; }
        var ed = e.target.closest("[data-edit]"); if (ed) { tableForm(AD.tableById(ed.dataset.edit)); return; }
        var ub = e.target.closest("[data-unblock]");
        if (ub) { var b = (AD.live.blocks || []).filter(function (x) { return x.id === ub.dataset.unblock; })[0]; AD.confirm("Quitar bloqueo", "Las mesas volverán a estar disponibles en ese horario.", "Quitar").then(function (y) { if (y) AD.ops.unblock(b).then(function () { AD.toast("Bloqueo quitado."); loadDay(); }, function (er) { AD.fail("unblock", er); }); }); }
      });
      AD.$("#t-date").onchange = function () { if (this.value) { date = this.value; loadDay(); } };
      if (AD.$("#t-new")) { AD.$("#t-new").onclick = function () { tableForm(); }; AD.$("#t-block").onclick = blockForm; }
      list(); loadDay();
      AD.watch(["tables", "blocks", "settings"], function () { list(); loadDay(); });
      AD.watch(["res", "ev"], loadDay);
    }
  });
})(window.CC = window.CC || {});
