/* Operaciones del panel con transacciones: apartar y liberar mesas sin conflictos ni duplicados.
   Cada reservación o evento confirmado guarda su "hold" { date, slots, tableIds, people } y crea un documento
   locks/{mesa_fecha_franja} por mesa y franja. Si otro miembro del equipo aparta la misma mesa a la vez,
   la transacción detecta el conflicto y no se guarda nada. */
(function (CC) {
  "use strict";
  var AD = window.AD, B = CC.booking;
  var ops = AD.ops = {};

  function userErr(msg) { var e = new Error(msg); e.userMsg = msg; return e; }
  ops.userErr = userErr;
  ops.slotsRes = function (date, time) { return B.covered(AD.S, time); };
  ops.slotsEvent = function (e) { return B.coveredRange(AD.S, e.startTime, e.endTime); };
  ops.tableNames = function (ids) { return ids.map(function (id) { var t = AD.tableById(id); return t ? t.name : id; }); };
  ops.seats = function (ids) { return ids.reduce(function (a, id) { var t = AD.tableById(id); return a + (t ? Number(t.seats) || 0 : 0); }, 0); };

  /* Ocupación de un día (para elegir mesas en el panel) */
  ops.dayIndex = function (date) {
    return Promise.all([AD.db.collection("locks").where("date", "==", date).get(), AD.db.collection("cap").where("date", "==", date).get()]).then(function (r) {
      var locks = r[0].docs.map(function (d) { return d.data(); }), caps = r[1].docs.map(function (d) { return d.data(); });
      return { locks: locks, caps: caps, idx: B.index(locks, caps) };
    });
  };
  /* Mesas libres para unas franjas, ignorando las que ya son de refId */
  ops.freeFor = function (idx, slots, refId) {
    return AD.live.tables.filter(function (t) {
      return t.active !== false && slots.every(function (k) { var l = idx.busy[k] && idx.busy[k][t.id]; return !l || l.refId === refId; });
    });
  };

  /* Núcleo transaccional: libera el hold anterior (si hay) y aparta el nuevo (si hay) */
  function holdTx(tx, refId, kind, oldHold, newHold, opt) {
    opt = opt || {};
    var db = AD.db, paths = {}, reads = [];
    function want(path) { if (!(path in paths)) { paths[path] = reads.length; reads.push(db.doc(path)); } }
    var oldLocks = [], newLocks = [], capKeys = {};
    if (oldHold) oldHold.slots.forEach(function (k) {
      capKeys[B.capId(oldHold.date, k)] = 1;
      oldHold.tableIds.forEach(function (t) { var p = "locks/" + B.lockId(t, oldHold.date, k); oldLocks.push(p); want(p); });
    });
    if (newHold) newHold.slots.forEach(function (k) {
      capKeys[B.capId(newHold.date, k)] = 1;
      newHold.tableIds.forEach(function (t) { var p = "locks/" + B.lockId(t, newHold.date, k); newLocks.push({ p: p, t: t, k: k }); want(p); });
    });
    Object.keys(capKeys).forEach(function (c) { want("cap/" + c); });
    return Promise.all(reads.map(function (r) { return tx.get(r); })).then(function (snaps) {
      function snap(p) { return snaps[paths[p]]; }
      /* Conflictos: una mesa ya apartada por otra reservación, evento o bloqueo */
      var clash = newLocks.filter(function (n) { var s = snap(n.p); return s.exists && s.data().refId !== refId; });
      if (clash.length) {
        var c = clash[0], who = snap(c.p).data();
        throw userErr((AD.tableById(c.t) || { name: c.t }).name + " ya está ocupada a las " + B.time12(B.hhmm(Number(c.k.slice(0, 2)) * 60 + Number(c.k.slice(2)))) +
          (who.kind === "block" ? " (bloqueada)" : who.kind === "event" ? " (evento)" : " (otra reservación)") + ". Elige otras mesas.");
      }
      /* Capacidad del local por franja */
      var people = {};
      Object.keys(capKeys).forEach(function (c) { var s = snap("cap/" + c); people[c] = s.exists ? Number(s.data().people) || 0 : 0; });
      if (oldHold && oldHold.people) oldHold.slots.forEach(function (k) { var c = B.capId(oldHold.date, k); people[c] = Math.max(0, people[c] - oldHold.people); });
      if (newHold && newHold.people) newHold.slots.forEach(function (k) { var c = B.capId(newHold.date, k); people[c] += newHold.people; });
      if (newHold && newHold.people && !opt.force) {
        var over = newHold.slots.filter(function (k) { return people[B.capId(newHold.date, k)] > AD.S.capacity; });
        if (over.length) throw userErr("Se superaría la capacidad del local (" + AD.S.capacity + " personas) a las " + B.time12(over[0].slice(0, 2) + ":" + over[0].slice(2)));
      }
      /* Escrituras */
      var keep = {}; newLocks.forEach(function (n) { keep[n.p] = 1; });
      oldLocks.forEach(function (p) { var s = snap(p); if (!keep[p] && s.exists && s.data().refId === refId) tx.delete(db.doc(p)); });
      newLocks.forEach(function (n) { tx.set(db.doc(n.p), { tableId: n.t, date: newHold.date, slot: n.k, refId: refId, kind: kind, at: AD.ts() }); });
      Object.keys(people).forEach(function (c) {
        var parts = c.split("_");
        if (people[c] > 0) tx.set(db.doc("cap/" + c), { date: parts[0], slot: parts[1], people: people[c] });
        else if (snap("cap/" + c).exists) tx.delete(db.doc("cap/" + c));
      });
    });
  }
  function logDoc(col, id, text, action) {
    return [AD.db.collection(col).doc(id).collection("log").doc(), { at: AD.ts(), by: AD.me.uid, who: "equipo", name: AD.me.name || "", action: action, text: text }];
  }

  /* ---------- reservaciones ---------- */
  ops.holdFor = function (date, time, party, tableIds) { return { date: date, slots: ops.slotsRes(date, time), tableIds: tableIds, people: party }; };

  /* Confirmar (o reasignar mesas) */
  ops.confirmRes = function (r, tableIds, staffNote, force) {
    if (!tableIds.length) return Promise.reject(userErr("Elige al menos una mesa."));
    var ref = AD.db.collection("reservations").doc(r.id), was = r.status;
    return AD.db.runTransaction(function (tx) {
      return tx.get(ref).then(function (s) {
        if (!s.exists) throw userErr("Esta reservación ya no existe.");
        var cur = s.data();
        if (["pending", "confirmed"].indexOf(cur.status) < 0) throw userErr("La reservación cambió de estado (" + (B.RES_STATUS[cur.status] || {}).label + "). Recarga.");
        var nh = ops.holdFor(cur.date, cur.time, cur.party, tableIds);
        return holdTx(tx, r.id, "res", cur.hold || null, nh, { force: force }).then(function () {
          var patch = { status: "confirmed", tableIds: tableIds, tableNames: ops.tableNames(tableIds), hold: nh, needsRelease: false, updatedAt: AD.ts(), decidedBy: AD.me.uid };
          if (cur.status !== "confirmed") patch.decidedAt = AD.ts();
          if (staffNote != null) patch.staffNote = staffNote;
          tx.update(ref, patch);
          var text = cur.status === "confirmed" ? "Mesas cambiadas a " + patch.tableNames.join(" + ") : "Confirmada · " + patch.tableNames.join(" + ");
          var l = logDoc("reservations", r.id, text, cur.status === "confirmed" ? "tables" : "confirmed"); tx.set(l[0], l[1]);
          var n = cur.status !== "confirmed" && AD.notifyDoc(cur.uid, "¡Tu reservación está confirmada!", B.shortDate(cur.date) + ", " + B.time12(cur.time) + " · " + cur.party + " pers. Te esperamos.", "reservations/" + r.id);
          if (n) tx.set(n[0], n[1]);
        });
      });
    }).then(function () { AD.audit(was === "confirmed" ? "reservation.tables" : "reservation.confirm", "reservations/" + r.id, ops.tableNames(tableIds).join(" + ")); });
  };

  /* Cambiar de estado liberando las mesas si corresponde */
  var RES_TEXT = {
    rejected: ["Rechazada", "No pudimos confirmar tu reservación", "Lo sentimos: no hay disponibilidad para ese horario."],
    cancelled: ["Cancelada por el restaurante", "Tu reservación fue cancelada", "El restaurante canceló tu reservación."],
    completed: ["Completada", "¡Gracias por visitarnos!", "Esperamos verte pronto de nuevo."],
    noshow: ["Marcada como no presentada", "Reservación no presentada", "No registramos tu llegada a la hora reservada."]
  };
  ops.setResStatus = function (r, status, note) {
    var ref = AD.db.collection("reservations").doc(r.id), tx0 = RES_TEXT[status];
    var release = status === "rejected" || status === "cancelled";
    return AD.db.runTransaction(function (tx) {
      return tx.get(ref).then(function (s) {
        var cur = s.data();
        return (release && cur.hold ? holdTx(tx, r.id, "res", cur.hold, null) : Promise.resolve()).then(function () {
          var patch = { status: status, updatedAt: AD.ts(), needsRelease: false };
          if (release) { patch.hold = AD.del(); patch.tableIds = []; patch.tableNames = []; }
          if (status === "cancelled") { patch.cancelledBy = "staff"; patch.cancelledAt = AD.ts(); }
          if (status === "completed") patch.completedAt = AD.ts();
          if (cur.change) patch.change = AD.del();
          if (note) patch.staffNote = note;
          tx.update(ref, patch);
          var l = logDoc("reservations", r.id, tx0[0] + (note ? " · " + note : ""), status); tx.set(l[0], l[1]);
          var n = status !== "completed" && AD.notifyDoc(cur.uid, tx0[1], (note || tx0[2]) + " (" + B.shortDate(cur.date) + ", " + B.time12(cur.time) + ")", "reservations/" + r.id);
          if (n) tx.set(n[0], n[1]);
        });
      });
    }).then(function () { AD.audit("reservation." + status, "reservations/" + r.id, note || ""); });
  };

  /* Aplicar el cambio que pidió el cliente (fecha, hora o personas) */
  ops.applyResChange = function (r, tableIds) {
    var ref = AD.db.collection("reservations").doc(r.id);
    return AD.db.runTransaction(function (tx) {
      return tx.get(ref).then(function (s) {
        var cur = s.data(), c = cur.change;
        if (!c || c.type !== "modify") throw userErr("Ya no hay un cambio pendiente.");
        var date = c.date || cur.date, time = c.time || cur.time, party = Number(c.party || cur.party);
        var nh = cur.status === "confirmed" ? ops.holdFor(date, time, party, tableIds) : null;
        if (cur.status === "confirmed" && !tableIds.length) throw userErr("Elige las mesas para el nuevo horario.");
        return holdTx(tx, r.id, "res", cur.hold || null, nh).then(function () {
          var patch = { date: date, time: time, party: party, start: B.startMs(date, time, AD.S.tzOffsetMin), change: AD.del(), updatedAt: AD.ts() };
          if (nh) { patch.hold = nh; patch.tableIds = tableIds; patch.tableNames = ops.tableNames(tableIds); }
          if (c.notes) patch.notes = ((cur.notes ? cur.notes + "\n" : "") + "Cambio: " + c.notes).slice(0, 500);
          tx.update(ref, patch);
          var txt = "Cambio aplicado: " + B.shortDate(date) + ", " + B.time12(time) + ", " + party + " pers.";
          var l = logDoc("reservations", r.id, txt, "change-applied"); tx.set(l[0], l[1]);
          var n = AD.notifyDoc(cur.uid, "Aceptamos tu cambio", txt.replace("Cambio aplicado: ", "Ahora: "), "reservations/" + r.id); if (n) tx.set(n[0], n[1]);
        });
      });
    }).then(function () { AD.audit("reservation.change", "reservations/" + r.id, ""); });
  };
  ops.rejectChange = function (col, r, note) {
    var b = AD.db.batch(), ref = AD.db.collection(col).doc(r.id), l = logDoc(col, r.id, "Cambio no aceptado" + (note ? " · " + note : ""), "change-rejected");
    b.update(ref, { change: AD.del(), updatedAt: AD.ts(), staffNote: note || r.staffNote || "" });
    b.set(l[0], l[1]);
    var n = AD.notifyDoc(r.uid, "No pudimos aplicar tu cambio", note || "Tu " + (col === "events" ? "evento" : "reservación") + " sigue como estaba.", col + "/" + r.id); if (n) b.set(n[0], n[1]);
    return b.commit().then(function () { AD.audit(col + ".change-rejected", col + "/" + r.id, note || ""); });
  };
  ops.message = function (col, r, note) {
    var b = AD.db.batch(), l = logDoc(col, r.id, "Mensaje al cliente: " + note, "message");
    b.update(AD.db.collection(col).doc(r.id), { staffNote: note, updatedAt: AD.ts() }); b.set(l[0], l[1]);
    var n = AD.notifyDoc(r.uid, "Mensaje del restaurante", note, col + "/" + r.id); if (n) b.set(n[0], n[1]);
    return b.commit().then(function () { AD.audit(col + ".message", col + "/" + r.id, note); });
  };
  ops.remind = function (r) {
    var b = AD.db.batch(), l = logDoc("reservations", r.id, "Recordatorio enviado", "reminder");
    b.update(AD.db.collection("reservations").doc(r.id), { remindedAt: AD.ts() }); b.set(l[0], l[1]);
    var n = AD.notifyDoc(r.uid, "Recordatorio de tu reservación", "Te esperamos el " + B.longDate(r.date) + " a las " + B.time12(r.time) + " · " + r.party + " pers. Si no puedes venir, cancélala desde Mi cuenta.", "reservations/" + r.id);
    if (n) b.set(n[0], n[1]);
    return b.commit();
  };

  /* Reservación creada por el equipo (teléfono, mostrador) */
  ops.createRes = function (d, tableIds) {
    var id = B.requestId("s"), ref = AD.db.collection("reservations").doc(id);
    var data = Object.assign({ uid: "", email: "", status: tableIds.length ? "confirmed" : "pending", tableIds: tableIds, tableNames: ops.tableNames(tableIds), dishes: [], dishesTotal: 0,
      start: B.startMs(d.date, d.time, AD.S.tzOffsetMin), createdAt: AD.ts(), updatedAt: AD.ts(), source: "staff", createdBy: AD.me.uid }, d);
    return AD.db.runTransaction(function (tx) {
      return tx.get(ref).then(function (s) {
        if (s.exists) throw userErr("Ya existe. Recarga e inténtalo de nuevo.");
        var nh = tableIds.length ? ops.holdFor(d.date, d.time, d.party, tableIds) : null;
        return holdTx(tx, id, "res", null, nh).then(function () {
          if (nh) { data.hold = nh; data.decidedAt = AD.ts(); data.decidedBy = AD.me.uid; }
          tx.set(ref, data);
          var l = logDoc("reservations", id, "Creada por el equipo" + (nh ? " y confirmada · " + data.tableNames.join(" + ") : ""), "created"); tx.set(l[0], l[1]);
        });
      });
    }).then(function () { AD.audit("reservation.create", "reservations/" + id, d.name + " · " + d.date + " " + d.time); return id; });
  };

  /* ---------- eventos ---------- */
  ops.setEventStatus = function (e, status, extra, note) {
    var ref = AD.db.collection("events").doc(e.id), release = ["rejected", "cancelled"].indexOf(status) > -1;
    var T = { review: ["En revisión", "Estamos revisando tu evento", "Revisamos la disponibilidad y los detalles."],
      quoted: ["Cotización enviada", "Tienes una cotización", "Revisa la propuesta en Mi cuenta y acéptala si te parece bien."],
      rejected: ["Rechazado", "No pudimos organizar tu evento", "Lo sentimos: no tenemos disponibilidad para esa fecha."],
      cancelled: ["Cancelado por el restaurante", "Tu evento fue cancelado", "El restaurante canceló el evento."],
      completed: ["Completado", "¡Gracias por celebrar con nosotros!", "Esperamos verte pronto."] }[status];
    return AD.db.runTransaction(function (tx) {
      return tx.get(ref).then(function (s) {
        var cur = s.data();
        return (release && cur.hold ? holdTx(tx, e.id, "event", cur.hold, null) : Promise.resolve()).then(function () {
          var patch = Object.assign({ status: status, updatedAt: AD.ts(), needsRelease: false }, extra || {});
          if (release) { patch.hold = AD.del(); patch.tableIds = []; }
          if (status === "cancelled") { patch.cancelledBy = "staff"; patch.cancelledAt = AD.ts(); }
          if (status === "quoted") patch.quoteAccepted = false;
          if (cur.change && release) patch.change = AD.del();
          if (note) patch.staffNote = note;
          tx.update(ref, patch);
          var l = logDoc("events", e.id, T[0] + (note ? " · " + note : ""), status); tx.set(l[0], l[1]);
          var n = AD.notifyDoc(cur.uid, T[1], note || T[2], "events/" + e.id); if (n) tx.set(n[0], n[1]);
        });
      });
    }).then(function () { AD.audit("event." + status, "events/" + e.id, note || ""); });
  };
  /* Confirmar evento apartando mesas (área reservada) o todo el local (exclusivo) */
  ops.confirmEvent = function (e, tableIds, note, force) {
    var ref = AD.db.collection("events").doc(e.id);
    return AD.db.runTransaction(function (tx) {
      return tx.get(ref).then(function (s) {
        var cur = s.data();
        if (["received", "review", "quoted", "confirmed"].indexOf(cur.status) < 0) throw userErr("El evento cambió de estado. Recarga.");
        var excl = cur.space === "exclusivo";
        var ids = excl ? AD.live.tables.filter(function (t) { return t.active !== false; }).map(function (t) { return t.id; }) : tableIds;
        if (!ids.length) throw userErr("Elige las mesas del evento.");
        var nh = { date: cur.date, slots: ops.slotsEvent(cur), tableIds: ids, people: excl ? AD.S.capacity : cur.guests };
        return holdTx(tx, e.id, "event", cur.hold || null, nh, { force: force }).then(function () {
          var patch = { status: "confirmed", hold: nh, tableIds: ids, tableNames: ops.tableNames(ids), updatedAt: AD.ts(), needsRelease: false, decidedBy: AD.me.uid };
          if (cur.status !== "confirmed") patch.decidedAt = AD.ts();
          if (note) patch.staffNote = note;
          tx.update(ref, patch);
          var l = logDoc("events", e.id, (cur.status === "confirmed" ? "Mesas cambiadas" : "Confirmado") + " · " + (excl ? "local exclusivo" : patch.tableNames.join(" + ")), "confirmed"); tx.set(l[0], l[1]);
          var n = cur.status !== "confirmed" && AD.notifyDoc(cur.uid, "¡Tu evento está confirmado!", cur.type + " · " + B.shortDate(cur.date) + ", " + B.time12(cur.startTime) + ". La fecha está apartada.", "events/" + e.id);
          if (n) tx.set(n[0], n[1]);
        });
      });
    }).then(function () { AD.audit("event.confirm", "events/" + e.id, ""); });
  };
  ops.applyEventChange = function (e, tableIds) {
    var ref = AD.db.collection("events").doc(e.id);
    return AD.db.runTransaction(function (tx) {
      return tx.get(ref).then(function (s) {
        var cur = s.data(), c = cur.change;
        if (!c || c.type !== "modify") throw userErr("Ya no hay un cambio pendiente.");
        var upd = { date: c.date || cur.date, startTime: c.startTime || cur.startTime, endTime: c.endTime || cur.endTime, guests: Number(c.guests || cur.guests) };
        var excl = cur.space === "exclusivo", nh = null;
        if (cur.status === "confirmed") {
          var ids = excl ? AD.live.tables.filter(function (t) { return t.active !== false; }).map(function (t) { return t.id; }) : tableIds;
          if (!ids.length) throw userErr("Elige las mesas para el nuevo horario.");
          nh = { date: upd.date, slots: B.coveredRange(AD.S, upd.startTime, upd.endTime), tableIds: ids, people: excl ? AD.S.capacity : upd.guests };
        }
        return holdTx(tx, e.id, "event", cur.hold || null, nh).then(function () {
          var patch = Object.assign({}, upd, { start: B.startMs(upd.date, upd.startTime, AD.S.tzOffsetMin), change: AD.del(), updatedAt: AD.ts() });
          if (nh) { patch.hold = nh; patch.tableIds = nh.tableIds; patch.tableNames = ops.tableNames(nh.tableIds); }
          tx.update(ref, patch);
          var txt = "Cambio aplicado: " + B.shortDate(upd.date) + ", " + B.time12(upd.startTime) + "–" + B.time12(upd.endTime) + ", " + upd.guests + " invitados";
          var l = logDoc("events", e.id, txt, "change-applied"); tx.set(l[0], l[1]);
          var n = AD.notifyDoc(cur.uid, "Aceptamos tu cambio", txt.replace("Cambio aplicado: ", "Ahora: "), "events/" + e.id); if (n) tx.set(n[0], n[1]);
        });
      });
    }).then(function () { AD.audit("event.change", "events/" + e.id, ""); });
  };

  /* ---------- bloqueos de mesas ---------- */
  ops.block = function (tableIds, date, from, to, reason) {
    var id = B.requestId("b"), ref = AD.db.collection("blocks").doc(id);
    var nh = { date: date, slots: B.coveredRange(AD.S, from, to), tableIds: tableIds, people: 0 };
    if (!nh.slots.length) return Promise.reject(userErr("El horario no es válido."));
    return AD.db.runTransaction(function (tx) {
      return holdTx(tx, id, "block", null, nh).then(function () {
        tx.set(ref, { tableIds: tableIds, tableNames: ops.tableNames(tableIds), date: date, from: from, to: to, reason: reason || "", hold: nh, by: AD.me.uid, byName: AD.me.name || "", at: AD.ts() });
      });
    }).then(function () { AD.audit("table.block", "blocks/" + id, ops.tableNames(tableIds).join(", ") + " · " + date + " " + from + "–" + to); });
  };
  ops.unblock = function (b) {
    return AD.db.runTransaction(function (tx) {
      return holdTx(tx, b.id, "block", b.hold, null).then(function () { tx.delete(AD.db.collection("blocks").doc(b.id)); });
    }).then(function () { AD.audit("table.unblock", "blocks/" + b.id, (b.tableNames || []).join(", ") + " · " + b.date); });
  };

  /* ---------- liberar lo que cancelaron los clientes ---------- */
  var releasing = {};
  ops.autoRelease = function () {
    ["reservations", "events"].forEach(function (col) {
      var list = (col === "reservations" ? AD.live.res : AD.live.ev) || [];
      if (!AD.can(col === "reservations" ? "reservations" : "events")) return;
      list.filter(function (x) { return x.needsRelease && x.status === "cancelled" && !releasing[x.id]; }).forEach(function (x) {
        releasing[x.id] = 1;
        var ref = AD.db.collection(col).doc(x.id);
        AD.db.runTransaction(function (tx) {
          return tx.get(ref).then(function (s) {
            var cur = s.data(); if (!cur.needsRelease) return;
            return (cur.hold ? holdTx(tx, x.id, col === "events" ? "event" : "res", cur.hold, null) : Promise.resolve()).then(function () {
              tx.update(ref, { needsRelease: false, hold: AD.del(), tableIds: [], tableNames: [], updatedAt: AD.ts() });
              var l = logDoc(col, x.id, "Mesas liberadas automáticamente tras la cancelación del cliente", "released"); tx.set(l[0], l[1]);
            });
          });
        }).then(function () { AD.toast("Se liberaron las mesas de una cancelación (" + (x.name || "cliente") + ")."); })
          .catch(function (e) { AD.logError("autoRelease", e); })
          .then(function () { delete releasing[x.id]; });
      });
    });
  };
})(window.CC = window.CC || {});
