/* Lógica de reservaciones compartida por el sitio y el Panel Administrativo (sin dependencias).
   Horarios, franjas, disponibilidad de mesas y capacidad, políticas, estados y formatos.

   Modelo de datos (Firestore):
   - settings/restaurant  Configuración (horario, duración, capacidad, políticas). Lectura pública.
   - tables/{id}          Mesas: { name, seats, zone, active, order }. Lectura pública.
   - locks/{mesa_fecha_HHMM}  Una mesa ocupada en una franja: { tableId, date, slot, refId, kind, people }.
                              Crear uno que ya existe falla: una mesa no puede tener dos reservaciones a la vez.
   - cap/{fecha_HHMM}     Personas ocupadas en cada franja: { date, slot, people } (capacidad del local).
   - reservations/{id}, events/{id}  Solicitudes de los clientes (privadas). */
(function (CC) {
  "use strict";

  var DEFAULTS = {
    name: "Caldos Constitución And Restaurant",
    tzOffsetMin: -240,                       // República Dominicana: UTC−4 todo el año
    openDays: [1, 2, 3, 4, 5, 6, 7],         // 1 = lunes … 7 = domingo
    openTime: "09:00", closeTime: "23:00",
    lastSeating: "22:00",                    // última hora para empezar una reservación
    slotMinutes: 30,                         // intervalo entre horarios
    durationMinutes: 120,                    // tiempo que se reserva cada mesa
    graceMinutes: 15,                        // tolerancia de llegada
    minNoticeMin: 60,                        // anticipación mínima para reservar
    maxAdvanceDays: 60,                      // hasta cuántos días por adelantado
    maxParty: 20,                            // personas por reservación en línea
    capacity: 100,                           // personas a la vez en el local
    allowCombine: true,                      // unir mesas para grupos grandes
    closedDates: [],                         // días cerrados por excepción (AAAA-MM-DD)
    cancelHours: 4,                          // cancelación o cambio sin costo hasta X horas antes
    modifyHours: 4,
    policyNote: "Si llegas más de 15 minutos tarde sin avisar, la mesa puede liberarse para otros clientes.",
    eventTypes: ["Cumpleaños", "Aniversario", "Reunión familiar", "Reunión de trabajo", "Graduación", "Bautizo o comunión", "Despedida", "Otro"],
    eventMinGuests: 10,
    eventMinNoticeDays: 3,
    eventCancelHours: 72,
    eventPolicyNote: "La fecha queda apartada cuando el restaurante confirma el evento. Los detalles de menú, decoración y costo se acuerdan en la cotización."
  };

  /* Mesas iniciales: 10 mesas, 100 personas en total */
  var DEFAULT_TABLES = [
    { id: "m01", name: "Mesa 1", seats: 6, zone: "Salón", order: 1 },
    { id: "m02", name: "Mesa 2", seats: 6, zone: "Salón", order: 2 },
    { id: "m03", name: "Mesa 3", seats: 8, zone: "Salón", order: 3 },
    { id: "m04", name: "Mesa 4", seats: 8, zone: "Salón", order: 4 },
    { id: "m05", name: "Mesa 5", seats: 8, zone: "Terraza", order: 5 },
    { id: "m06", name: "Mesa 6", seats: 8, zone: "Terraza", order: 6 },
    { id: "m07", name: "Mesa 7", seats: 12, zone: "Terraza", order: 7 },
    { id: "m08", name: "Mesa 8", seats: 12, zone: "Salón", order: 8 },
    { id: "m09", name: "Mesa 9", seats: 16, zone: "Salón familiar", order: 9 },
    { id: "m10", name: "Mesa 10", seats: 16, zone: "Salón familiar", order: 10 }
  ];

  var RES_STATUS = {
    pending: { label: "Pendiente", tone: "amber", hint: "El restaurante la está revisando" },
    confirmed: { label: "Confirmada", tone: "green", hint: "Tu mesa está apartada" },
    completed: { label: "Completada", tone: "blue", hint: "¡Gracias por visitarnos!" },
    cancelled: { label: "Cancelada", tone: "gray", hint: "Esta reservación ya no está activa" },
    rejected: { label: "Rechazada", tone: "red", hint: "No hubo disponibilidad" },
    noshow: { label: "No se presentó", tone: "red", hint: "No llegó a la hora reservada" }
  };
  var EVENT_STATUS = {
    received: { label: "Solicitud recibida", tone: "amber", hint: "La recibimos y pronto la revisamos" },
    review: { label: "En revisión", tone: "amber", hint: "Estamos revisando disponibilidad y detalles" },
    quoted: { label: "Cotizada", tone: "violet", hint: "Te enviamos una propuesta" },
    confirmed: { label: "Confirmada", tone: "green", hint: "La fecha está apartada" },
    completed: { label: "Completada", tone: "blue", hint: "¡Gracias por celebrar con nosotros!" },
    rejected: { label: "Rechazada", tone: "red", hint: "No fue posible organizarla" },
    cancelled: { label: "Cancelada", tone: "gray", hint: "Esta solicitud ya no está activa" }
  };

  /* ---------- horas y fechas ---------- */
  function pad(n) { return String(n).padStart(2, "0"); }
  function min(t) { var p = String(t || "0:0").split(":"); return Number(p[0]) * 60 + Number(p[1]); }
  function hhmm(m) { return pad(Math.floor(m / 60)) + ":" + pad(m % 60); }
  function key(t) { return String(t).replace(":", ""); }
  function settings(s) { return Object.assign({}, DEFAULTS, s || {}); }
  /* Milisegundos UTC del momento local (fecha + hora en la zona del restaurante) */
  function startMs(date, time, tz) {
    var d = date.split("-").map(Number), h = time.split(":").map(Number);
    return Date.UTC(d[0], d[1] - 1, d[2], h[0], h[1]) - (tz == null ? DEFAULTS.tzOffsetMin : tz) * 60000;
  }
  /* "Ahora" en la hora local del restaurante */
  function nowLocal(tz) {
    var n = new Date(Date.now() + (tz == null ? DEFAULTS.tzOffsetMin : tz) * 60000);
    return { date: n.getUTCFullYear() + "-" + pad(n.getUTCMonth() + 1) + "-" + pad(n.getUTCDate()), minutes: n.getUTCHours() * 60 + n.getUTCMinutes(), ms: Date.now() };
  }
  function addDays(date, n) {
    var d = date.split("-").map(Number), x = new Date(Date.UTC(d[0], d[1] - 1, d[2] + n));
    return x.getUTCFullYear() + "-" + pad(x.getUTCMonth() + 1) + "-" + pad(x.getUTCDate());
  }
  function isoDow(date) { var d = date.split("-").map(Number); var w = new Date(Date.UTC(d[0], d[1] - 1, d[2])).getUTCDay(); return w === 0 ? 7 : w; }
  function isOpenDate(s, date) { s = settings(s); return s.openDays.indexOf(isoDow(date)) > -1 && s.closedDates.indexOf(date) < 0; }

  /* Horarios de inicio posibles (cada slotMinutes, de la apertura a la última hora para sentarse) */
  function times(s) {
    s = settings(s);
    var out = [], a = min(s.openTime), b = min(s.lastSeating);
    for (var m = a; m <= b; m += s.slotMinutes) out.push(hhmm(m));
    return out;
  }
  /* Franjas que ocupa una reservación: desde su inicio hasta el fin de la duración (sin pasar del cierre) */
  function covered(s, time, durationMin) {
    s = settings(s);
    var a = min(time), end = Math.min(a + (durationMin || s.durationMinutes), min(s.closeTime)), out = [];
    for (var m = a; m < end; m += s.slotMinutes) out.push(key(hhmm(m)));
    if (!out.length) out.push(key(time));
    return out;
  }
  /* Franjas de un evento (de su hora de inicio a la de fin) */
  function coveredRange(s, from, to) {
    s = settings(s);
    var out = [], a = Math.floor(min(from) / s.slotMinutes) * s.slotMinutes;
    for (var m = a; m < min(to); m += s.slotMinutes) out.push(key(hhmm(m)));
    return out;
  }

  /* ---------- disponibilidad ---------- */
  /* locks: [{tableId, slot}], caps: [{slot, people}] → mapas por franja */
  function index(locks, caps) {
    var busy = {}, used = {};
    (locks || []).forEach(function (l) { (busy[l.slot] = busy[l.slot] || {})[l.tableId] = l; });
    (caps || []).forEach(function (c) { used[c.slot] = (used[c.slot] || 0) + (Number(c.people) || 0); });
    return { busy: busy, used: used };
  }
  function freeTables(tables, idx, keys) {
    return (tables || []).filter(function (t) {
      if (t.active === false) return false;
      return keys.every(function (k) { return !(idx.busy[k] && idx.busy[k][t.id]); });
    });
  }
  /* Mejor forma de sentar a un grupo: una mesa (la más justa) o, si se permite, unir 2–3 mesas con el menor sobrante */
  function fit(tables, party, allowCombine) {
    var list = tables.slice().sort(function (a, b) { return a.seats - b.seats; });
    for (var i = 0; i < list.length; i++) if (list[i].seats >= party) return [list[i]];
    if (!allowCombine) return null;
    var best = null, bestSeats = Infinity, n = list.length, a, b, c, sum;
    for (a = 0; a < n; a++) for (b = a + 1; b < n; b++) {
      sum = list[a].seats + list[b].seats;
      if (sum >= party && sum < bestSeats) { best = [list[a], list[b]]; bestSeats = sum; }
    }
    if (best) return best;
    for (a = 0; a < n; a++) for (b = a + 1; b < n; b++) for (c = b + 1; c < n; c++) {
      sum = list[a].seats + list[b].seats + list[c].seats;
      if (sum >= party && sum < bestSeats) { best = [list[a], list[b], list[c]]; bestSeats = sum; }
    }
    return best;
  }
  /* Estado de cada horario de un día para un grupo: ok | few | full | past | closed */
  function dayAvailability(s, tables, locks, caps, date, party) {
    s = settings(s);
    var idx = index(locks, caps), now = nowLocal(s.tzOffsetMin), open = isOpenDate(s, date);
    return times(s).map(function (t) {
      var out = { time: t, state: "ok", tables: [], free: 0, left: 0 };
      if (!open) { out.state = "closed"; return out; }
      var startAt = startMs(date, t, s.tzOffsetMin);
      if (startAt < now.ms + s.minNoticeMin * 60000) { out.state = "past"; return out; }
      var keys = covered(s, t);
      var maxUsed = keys.reduce(function (m, k) { return Math.max(m, idx.used[k] || 0); }, 0);
      out.left = Math.max(0, s.capacity - maxUsed);
      var free = freeTables(tables, idx, keys);
      out.free = free.length;
      var f = party ? fit(free, party, s.allowCombine) : free.slice(0, 1);
      if (!f || !f.length || (party && out.left < party)) { out.state = "full"; return out; }
      out.tables = f;
      if (free.length <= 2 || out.left < party * 2) out.state = "few";
      return out;
    });
  }
  /* Conflictos de un conjunto de mesas en unas franjas (para el panel antes de confirmar) */
  function conflicts(idx, tableIds, keys, ignoreRef) {
    var out = [];
    keys.forEach(function (k) {
      tableIds.forEach(function (id) {
        var l = idx.busy[k] && idx.busy[k][id];
        if (l && l.refId !== ignoreRef) out.push({ slot: k, tableId: id, refId: l.refId, kind: l.kind });
      });
    });
    return out;
  }

  /* ---------- políticas ---------- */
  function hoursUntil(startAt) { return (startAt - Date.now()) / 3600000; }
  function canClientCancel(s, r) {
    s = settings(s);
    if (r.status === "pending") return { direct: true };
    if (r.status !== "confirmed") return { direct: false, none: true };
    return hoursUntil(r.start) >= s.cancelHours ? { direct: true } : { direct: false, reason: "Faltan menos de " + s.cancelHours + " horas: envía una solicitud y el restaurante te responderá." };
  }
  function canClientCancelEvent(s, e) {
    s = settings(s);
    if (["received", "review", "quoted"].indexOf(e.status) > -1) return { direct: true };
    if (e.status !== "confirmed") return { direct: false, none: true };
    return hoursUntil(e.start) >= s.eventCancelHours ? { direct: true } : { direct: false, reason: "Faltan menos de " + s.eventCancelHours + " horas: envía una solicitud y el restaurante te responderá." };
  }
  function policy(s) {
    s = settings(s);
    return [
      "Las reservaciones son solicitudes: tu mesa queda apartada cuando el restaurante la confirma. Te avisamos aquí y en «Mi cuenta».",
      "Cada reservación aparta la mesa por " + (s.durationMinutes / 60).toString().replace(".", ",") + " horas. Atendemos de " + time12(s.openTime) + " a " + time12(s.closeTime) + "; la última reservación empieza a las " + time12(s.lastSeating) + ".",
      "Puedes cancelar o modificar sin costo hasta " + s.cancelHours + " horas antes desde «Mi cuenta». Con menos tiempo, envía la solicitud y el restaurante te responderá.",
      s.policyNote
    ].filter(Boolean);
  }
  function eventPolicy(s) {
    s = settings(s);
    return [
      "Solicita tu evento con al menos " + s.eventMinNoticeDays + " días de anticipación y un mínimo de " + s.eventMinGuests + " invitados.",
      "Revisamos cada solicitud, te enviamos una cotización y la fecha queda apartada cuando la confirmamos.",
      "Puedes cancelar sin costo hasta " + s.eventCancelHours + " horas antes del evento; con menos tiempo, envía la solicitud y te responderemos.",
      s.eventPolicyNote
    ].filter(Boolean);
  }

  /* ---------- formatos ---------- */
  function time12(t) {
    var m = min(t), h = Math.floor(m / 60), mm = m % 60, h12 = h % 12 || 12;
    return h12 + ":" + pad(mm) + (h < 12 ? " a. m." : " p. m.");
  }
  function dateObj(date) { var d = date.split("-").map(Number); return new Date(Date.UTC(d[0], d[1] - 1, d[2], 12)); }
  function longDate(date) { return dateObj(date).toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }); }
  function shortDate(date) { return dateObj(date).toLocaleDateString("es-DO", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }); }
  function lockId(tableId, date, slot) { return tableId + "_" + date + "_" + slot; }
  function capId(date, slot) { return date + "_" + slot; }
  /* Identificador aleatorio para cada envío: repetir el mismo envío no crea duplicados */
  function requestId(prefix) {
    var a = new Uint8Array(10); (window.crypto || window.msCrypto).getRandomValues(a);
    return (prefix || "r") + "-" + Date.now().toString(36) + "-" + Array.prototype.map.call(a, function (x) { return x.toString(36); }).join("").slice(0, 12);
  }

  /* Calendario mensual (HTML) para elegir un día: o = { month:"AAAA-MM", selected, min, max, isOpen(fecha) } */
  var DOW = ["lu", "ma", "mi", "ju", "vi", "sá", "do"];
  function calHTML(o) {
    var y = Number(o.month.slice(0, 4)), m = Number(o.month.slice(5, 7));
    var lead = isoDow(o.month + "-01") - 1, days = new Date(Date.UTC(y, m, 0)).getUTCDate(), today = nowLocal().date;
    var label = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("es-DO", { month: "long", year: "numeric", timeZone: "UTC" });
    var ic = function (n) { return CC.icon ? CC.icon(n) : ""; };
    var h = '<div class="cal__head"><button type="button" class="cal__nav" data-mon="-1" aria-label="Mes anterior"' + (o.month <= o.min.slice(0, 7) ? " disabled" : "") + ">" + ic("left") + "</button>" +
      '<span class="cal__m" aria-live="polite">' + label.charAt(0).toUpperCase() + label.slice(1) + "</span>" +
      '<button type="button" class="cal__nav" data-mon="1" aria-label="Mes siguiente"' + (o.month >= o.max.slice(0, 7) ? " disabled" : "") + ">" + ic("right") + "</button></div>" +
      '<div class="cal__grid">' + DOW.map(function (d) { return '<span class="cal__dow" aria-hidden="true">' + d + "</span>"; }).join("");
    for (var i = 0; i < lead; i++) h += '<span class="cal__pad"></span>';
    for (var d = 1; d <= days; d++) {
      var ds = o.month + "-" + pad(d), open = o.isOpen(ds), inRange = ds >= o.min && ds <= o.max;
      h += '<button type="button" class="cal__d' + (ds === today ? " is-today" : "") + (!open ? " is-closed" : "") + '" data-date="' + ds + '" aria-pressed="' + (ds === o.selected) + '" aria-label="' + longDate(ds) + (!open ? " (cerrado)" : "") + '"' + (open && inRange ? "" : " disabled") + ">" + d + "</button>";
    }
    return h + "</div>";
  }
  function shiftMonth(month, n) {
    var x = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + n, 1));
    return x.getUTCFullYear() + "-" + pad(x.getUTCMonth() + 1);
  }

  CC.booking = {
    calHTML: calHTML, shiftMonth: shiftMonth,
    DEFAULTS: DEFAULTS, DEFAULT_TABLES: DEFAULT_TABLES, RES_STATUS: RES_STATUS, EVENT_STATUS: EVENT_STATUS,
    settings: settings, min: min, hhmm: hhmm, key: key, startMs: startMs, nowLocal: nowLocal, addDays: addDays, isoDow: isoDow,
    isOpenDate: isOpenDate, times: times, covered: covered, coveredRange: coveredRange, index: index, freeTables: freeTables, fit: fit,
    dayAvailability: dayAvailability, conflicts: conflicts, canClientCancel: canClientCancel, canClientCancelEvent: canClientCancelEvent,
    policy: policy, eventPolicy: eventPolicy, time12: time12, longDate: longDate, shortDate: shortDate, lockId: lockId, capId: capId, requestId: requestId
  };
})(window.CC = window.CC || {});
