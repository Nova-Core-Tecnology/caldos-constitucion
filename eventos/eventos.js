/* Solicitar un evento: tipo, día, horario de inicio y fin, invitados, espacio y detalles.
   Llega como "Solicitud recibida"; el restaurante la revisa, la cotiza y la confirma desde el Panel Administrativo. */
(function (CC) {
  "use strict";
  var B = CC.booking, DRAFT = "cc_ev_draft", RID = "cc_ev_rid";
  var $ = function (id) { return document.getElementById(id); };
  var EMOJI = { "Cumpleaños": "🎂", "Aniversario": "💞", "Reunión familiar": "👨‍👩‍👧", "Reunión de trabajo": "💼", "Graduación": "🎓", "Bautizo o comunión": "🕊️", "Despedida": "👋", "Otro": "✨" };

  var st = { type: "", date: "", start: "", end: "", guests: 20, month: "" };
  var S = B.settings(), f = null, sending = false;

  function saveDraft() {
    try {
      sessionStorage.setItem(DRAFT, JSON.stringify({ type: st.type, date: st.date, start: st.start, end: st.end, guests: st.guests,
        title: $("e-title").value, space: spaceVal(), budget: $("e-budget").value, food: $("e-food").value, deco: $("e-deco").value,
        notes: $("e-notes").value, name: $("e-name").value, phone: $("e-phone").value }));
    } catch (e) {}
  }
  function spaceVal() { var c = document.querySelector('input[name="space"]:checked'); return c ? c.value : "compartido"; }
  function err(id, msg) {
    var el = $(id), fl = el.closest(".field"), e = $(id + "-e");
    fl.classList.toggle("has-error", !!msg); if (e) e.textContent = msg || "";
    el.setAttribute("aria-invalid", msg ? "true" : "false");
    return !msg;
  }
  function formError(msg) { var b = $("e-error"); b.textContent = msg || ""; b.hidden = !msg; }
  function minDate() { return B.addDays(B.nowLocal(S.tzOffsetMin).date, S.eventMinNoticeDays); }
  function maxDate() { return B.addDays(B.nowLocal(S.tzOffsetMin).date, 364); }

  /* ---------- pintado ---------- */
  function paintTypes() {
    $("types").innerHTML = S.eventTypes.map(function (t) {
      return '<button type="button" role="radio" class="evtype" data-type="' + CC.esc(t) + '" aria-checked="' + (t === st.type) + '"><span class="evtype__e" aria-hidden="true">' + (EMOJI[t] || "🎉") + "</span>" + CC.esc(t) + "</button>";
    }).join("");
  }
  function paintCal() {
    if (!st.month) st.month = (st.date || minDate()).slice(0, 7);
    $("cal").innerHTML = B.calHTML({ month: st.month, selected: st.date, min: minDate(), max: maxDate(), isOpen: function (d) { return B.isOpenDate(S, d); } });
  }
  function timeOpts(from, to, sel) {
    var out = [];
    for (var m = B.min(from); m <= B.min(to); m += S.slotMinutes) out.push(B.hhmm(m));
    return out.map(function (t) { return '<option value="' + t + '"' + (t === sel ? " selected" : "") + ">" + B.time12(t) + "</option>"; }).join("");
  }
  function paintTimes() {
    var lastStart = B.hhmm(B.min(S.closeTime) - 60);
    if (!st.start || st.start < S.openTime || st.start > lastStart) st.start = "18:00" >= S.openTime && "18:00" <= lastStart ? "18:00" : S.openTime;
    $("e-start").innerHTML = timeOpts(S.openTime, lastStart, st.start);
    var minEnd = B.hhmm(B.min(st.start) + 60);
    if (!st.end || st.end < minEnd || st.end > S.closeTime) st.end = B.hhmm(Math.min(B.min(st.start) + 180, B.min(S.closeTime)));
    $("e-end").innerHTML = timeOpts(minEnd, S.closeTime, st.end);
    var h = (B.min(st.end) - B.min(st.start)) / 60;
    $("e-dur").textContent = "Duración: " + String(h).replace(".", ",") + (h === 1 ? " hora" : " horas");
  }
  function paintGuests() {
    var g = $("e-guests"); g.min = S.eventMinGuests; g.max = S.capacity;
    if (document.activeElement !== g) g.value = st.guests;
    document.querySelector('[data-g="-5"]').disabled = st.guests <= S.eventMinGuests;
    document.querySelector('[data-g="5"]').disabled = st.guests >= S.capacity;
  }
  function paintSummary() {
    function put(id, v) { var el = $(id); el.textContent = v || "Sin elegir"; el.classList.toggle("is-empty", !v); }
    put("sum-type", st.type);
    put("sum-date", st.date ? B.shortDate(st.date) : "");
    put("sum-time", st.start ? B.time12(st.start) + " – " + B.time12(st.end) : "");
    put("sum-guests", st.guests + " invitados");
  }
  /* Aviso orientativo de ocupación (el restaurante confirma la disponibilidad al revisar) */
  var availReq = 0;
  function paintAvail() {
    var box = $("e-avail");
    if (!st.date || !f) { box.hidden = true; return; }
    var my = ++availReq;
    Promise.all([f.db.collection("cap").where("date", "==", st.date).get(), f.db.collection("locks").where("date", "==", st.date).get()]).then(function (r) {
      if (my !== availReq) return;
      var keys = B.coveredRange(S, st.start, st.end), used = {}, ev = false;
      r[0].docs.forEach(function (d) { var c = d.data(); used[c.slot] = (used[c.slot] || 0) + (Number(c.people) || 0); });
      r[1].docs.forEach(function (d) { var l = d.data(); if (l.kind === "event" && keys.indexOf(l.slot) > -1) ev = true; });
      var max = keys.reduce(function (m, k) { return Math.max(m, used[k] || 0); }, 0), left = S.capacity - max;
      if (ev || left < st.guests || (spaceVal() === "exclusivo" && max > 0)) {
        box.innerHTML = CC.icon("alert") + "<span>Ese horario ya tiene " + (ev ? "otro evento" : "bastantes reservaciones") + ". Puedes enviar la solicitud igualmente y te propondremos alternativas, o elegir otro día u horario.</span>";
        box.hidden = false;
      } else box.hidden = true;
    }).catch(function () { box.hidden = true; });
  }
  function paintAll() { paintTypes(); paintCal(); paintTimes(); paintGuests(); paintSummary(); }

  function paintMine() {
    var box = $("mine"), u = CC.auth.user();
    if (!u || !f) { box.hidden = true; return; }
    f.db.collection("events").where("uid", "==", u.uid).get().then(function (q) {
      var act = q.docs.map(function (d) { return d.data(); }).filter(function (e) { return ["received", "review", "quoted", "confirmed"].indexOf(e.status) > -1 && e.start > Date.now(); })
        .sort(function (a, b) { return a.start - b.start; });
      if (!act.length) { box.hidden = true; return; }
      var e = act[0], s = B.EVENT_STATUS[e.status];
      box.innerHTML = "<p>" + CC.icon("party") + "<span>" + (act.length > 1 ? "Tienes " + act.length + " eventos en curso. El próximo: " : "Tu evento: ") +
        "<b>" + CC.esc(e.type) + " · " + B.shortDate(e.date) + "</b> " + '<span class="st st--' + s.tone + '">' + s.label + "</span></span></p>" +
        '<a class="btn btn--sm btn--outline" href="../cuenta/cuenta.html#eventos">Ver en Mi cuenta</a>';
      box.hidden = false;
    }).catch(function (e) { box.hidden = true; CC.logError("eventos.mios", e); });
  }

  /* ---------- envío ---------- */
  function validate() {
    var ok = true, name = $("e-name").value.trim(), phone = $("e-phone").value.trim();
    ok = err("e-name", name.length < 2 ? "Escribe tu nombre (mínimo 2 letras)." : "") && ok;
    ok = err("e-phone", !/^[0-9+()\-\s.]{7,30}$/.test(phone) || phone.replace(/\D/g, "").length < 7 ? "Escribe un teléfono válido, por ejemplo 809 555 1234." : "") && ok;
    if (!st.type) { formError("Elige qué vas a celebrar."); $("types").scrollIntoView({ behavior: "smooth", block: "center" }); return false; }
    if (!st.date) { formError("Elige el día del evento."); $("cal").scrollIntoView({ behavior: "smooth", block: "center" }); return false; }
    if (B.startMs(st.date, st.start, S.tzOffsetMin) < Date.now() + S.eventMinNoticeDays * 86400000) { formError("El evento debe empezar al menos " + S.eventMinNoticeDays + " días después de hoy: elige una hora más tarde u otro día."); return false; }
    if (!(st.guests >= S.eventMinGuests && st.guests <= S.capacity)) { formError("Los invitados deben ser entre " + S.eventMinGuests + " y " + S.capacity + "."); return false; }
    if (!ok) { formError("Revisa tus datos: hay campos por corregir."); var bad = document.querySelector(".has-error input"); if (bad) bad.focus(); return false; }
    formError(""); return true;
  }
  function busy(on, label) {
    var b = $("e-send"); sending = on; b.disabled = on; b.querySelector(".spin").hidden = !on;
    $("e-send-t").textContent = label || "Enviar solicitud de evento";
  }
  function submit(e) {
    e.preventDefault();
    if (sending || !validate()) return;
    var u = CC.auth.user();
    if (!u) { saveDraft(); formError("Inicia sesión con Google para enviar tu solicitud. Tus datos se quedan aquí."); CC.auth.openLogin(); return; }
    busy(true, "Enviando…");
    var id, data;
    f.db.collection("events").where("uid", "==", u.uid).where("date", "==", st.date).get().then(function (q) {
      var dup = q.docs.map(function (d) { return d.data(); }).filter(function (x) { return ["received", "review", "quoted", "confirmed"].indexOf(x.status) > -1; })[0];
      if (dup) throw { mine: dup };
      try { id = sessionStorage.getItem(RID); } catch (x) {}
      if (!id) { id = B.requestId("e"); try { sessionStorage.setItem(RID, id); } catch (x) {} }
      var ts = f.fb.firestore.FieldValue.serverTimestamp();
      data = {
        uid: u.uid, name: $("e-name").value.trim().slice(0, 80), email: (u.email || "").slice(0, 120), phone: $("e-phone").value.trim().slice(0, 30),
        type: st.type, title: $("e-title").value.trim().slice(0, 100), date: st.date, startTime: st.start, endTime: st.end,
        start: B.startMs(st.date, st.start, S.tzOffsetMin), guests: st.guests, space: spaceVal(),
        budget: $("e-budget").value.slice(0, 60), food: $("e-food").value.trim().slice(0, 500), decoration: $("e-deco").value.trim().slice(0, 500),
        notes: $("e-notes").value.trim().slice(0, 1500), status: "received", createdAt: ts, updatedAt: ts, source: "web"
      };
      var ref = f.db.collection("events").doc(id), batch = f.db.batch();
      batch.set(ref, data);
      batch.set(ref.collection("log").doc(), { at: ts, by: u.uid, who: "cliente", action: "created", text: "Solicitud enviada desde la web" });
      batch.set(f.db.collection("notifications").doc(), { uid: u.uid, kind: "self", at: ts, read: false, ref: "events/" + id,
        title: "Recibimos tu solicitud de evento", body: st.type + " · " + B.shortDate(st.date) + ", " + st.guests + " invitados. Te enviaremos la cotización." });
      return batch.commit().catch(function (x) {
        return ref.get().then(function (d) { if (d.exists && d.data().uid === u.uid) return; throw x; }, function () { throw x; });
      });
    }).then(function () {
      try { sessionStorage.removeItem(RID); sessionStorage.removeItem(DRAFT); } catch (x) {}
      done(id, data);
    }).catch(function (x) {
      busy(false);
      if (x && x.mine) { formError("Ya tienes una solicitud de evento para ese día (" + x.mine.type + "). Puedes verla o cambiarla desde «Mi cuenta»."); return; }
      CC.logError("eventos.enviar", x);
      var code = x && x.code;
      formError(code === "unavailable" || !navigator.onLine ? "Sin conexión. Revisa tu internet y vuelve a intentarlo: no se enviará dos veces."
        : code === "permission-denied" ? "No se pudo guardar: revisa la fecha (mínimo " + S.eventMinNoticeDays + " días de anticipación), el horario y los invitados."
        : "No pudimos enviar tu solicitud. Vuelve a intentarlo en un momento.");
    });
  }
  function done(id, d) {
    $("plan").hidden = true; $("mine").hidden = true;
    var code = id.split("-").pop().slice(0, 6).toUpperCase();
    var wa = CC.waLink("Hola, envié una solicitud de evento en la web (código " + code + "): " + d.type + ", " + B.longDate(d.date) + " de " + B.time12(d.startTime) + " a " + B.time12(d.endTime) + ", " + d.guests + " invitados, a nombre de " + d.name + ".");
    var box = $("done");
    box.innerHTML = '<div class="bdone__ic">' + CC.icon("check") + "</div><h2>¡Solicitud recibida!</h2>" +
      "<p>Revisaremos la disponibilidad y te enviaremos una <b>cotización</b>. Sigue el estado de tu evento en «Mi cuenta».</p>" +
      '<dl class="bdone__dl"><div><dt>Evento</dt><dd>' + CC.esc(d.type) + "</dd></div><div><dt>Día</dt><dd>" + B.shortDate(d.date) + "</dd></div>" +
      "<div><dt>Horario</dt><dd>" + B.time12(d.startTime) + " – " + B.time12(d.endTime) + "</dd></div><div><dt>Código</dt><dd>" + code + "</dd></div></dl>" +
      '<div class="bdone__acts"><a class="btn" href="../cuenta/cuenta.html#eventos">' + CC.icon("party") + "Ver mis eventos</a>" +
      '<a class="btn btn--outline" href="' + wa + '" target="_blank" rel="noopener noreferrer">' + CC.icon("chat") + "Avisar por WhatsApp</a></div>";
    box.hidden = false;
    box.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function showOff(msg, retry) {
    var box = $("off");
    box.innerHTML = "<p>" + CC.icon("info") + "<span>" + msg + "</span></p>" +
      '<div class="dsel__acts">' + (retry ? '<button type="button" class="btn btn--sm btn--outline" id="off-retry">' + CC.icon("refresh") + "Reintentar</button>" : "") +
      '<a class="btn btn--sm" href="' + CC.waLink("Hola, quisiera organizar un evento en Caldos Constitución.") + '" target="_blank" rel="noopener noreferrer">' + CC.icon("chat") + "Escribir por WhatsApp</a></div>";
    box.hidden = false; $("plan").hidden = true;
    var r = $("off-retry"); if (r) r.onclick = function () { location.reload(); };
  }

  /* ---------- arranque ---------- */
  CC.page = function () {
    var dr = null; try { dr = JSON.parse(sessionStorage.getItem(DRAFT) || "null"); } catch (e) {}
    if (dr) {
      st.type = dr.type || ""; st.date = dr.date || ""; st.start = dr.start || ""; st.end = dr.end || ""; st.guests = Number(dr.guests) || 20;
      $("e-title").value = dr.title || ""; $("e-budget").value = dr.budget || ""; $("e-food").value = dr.food || ""; $("e-deco").value = dr.deco || "";
      $("e-notes").value = dr.notes || ""; $("e-name").value = dr.name || ""; $("e-phone").value = dr.phone || "";
      var sp = document.querySelector('input[name="space"][value="' + (dr.space === "exclusivo" ? "exclusivo" : "compartido") + '"]'); if (sp) sp.checked = true;
    }
    if (window.matchMedia("(max-width: 960px)").matches) document.querySelector(".bpol").removeAttribute("open");
    if (!CC.auth || !CC.auth.configured) { showOff("Las solicitudes de eventos en línea no están disponibles en este momento."); return; }

    paintAll();
    CC.auth.fire().then(function (x) {
      f = x;
      return f.db.doc("settings/restaurant").get();
    }).then(function (d) {
      if (!d.exists) { showOff("Muy pronto podrás solicitar eventos en línea. Mientras tanto, escríbenos por WhatsApp y lo organizamos contigo."); return; }
      S = B.settings(d.data());
      if (S.eventTypes.indexOf(st.type) < 0) st.type = "";
      st.guests = Math.min(Math.max(st.guests, S.eventMinGuests), S.capacity);
      if (st.date && (st.date < minDate() || st.date > maxDate() || !B.isOpenDate(S, st.date))) st.date = "";
      $("ev-min").textContent = "Con al menos " + S.eventMinNoticeDays + " días de anticipación · de " + B.time12(S.openTime) + " a " + B.time12(S.closeTime);
      $("ev-guests-l").textContent = "Entre " + S.eventMinGuests + " y " + S.capacity + " invitados.";
      $("policy").innerHTML = B.eventPolicy(S).map(function (p) { return "<li>" + CC.esc(p) + "</li>"; }).join("");
      st.month = "";
      paintAll(); paintAvail(); paintMine();
    }).catch(function (e) {
      CC.logError("eventos.cargar", e);
      showOff("No pudimos conectar con el sistema de eventos. Revisa tu conexión o escríbenos por WhatsApp.", true);
    });

    function prefill() {
      var u = CC.auth.user(); if (!u) return;
      if (!$("e-name").value && u.name) $("e-name").value = u.name;
      var p = CC.auth.profile(); if (!$("e-phone").value && p.phone) $("e-phone").value = p.phone;
      if (f) paintMine();
      if (!$("e-error").hidden && /Inicia sesión/.test($("e-error").textContent)) formError("");
    }
    CC.auth.onChange(prefill); prefill();

    $("types").addEventListener("click", function (e) {
      var b = e.target.closest("[data-type]"); if (!b) return;
      st.type = b.getAttribute("data-type"); formError("");
      document.querySelectorAll(".evtype").forEach(function (x) { x.setAttribute("aria-checked", String(x === b)); });
      paintSummary(); saveDraft();
    });
    $("cal").addEventListener("click", function (e) {
      var nav = e.target.closest("[data-mon]"); if (nav) { st.month = B.shiftMonth(st.month, Number(nav.getAttribute("data-mon"))); paintCal(); return; }
      var d = e.target.closest("[data-date]"); if (!d || d.disabled) return;
      st.date = d.getAttribute("data-date"); formError("");
      paintCal(); paintSummary(); paintAvail(); saveDraft();
    });
    $("e-start").addEventListener("change", function () {
      var dur = B.min(st.end) - B.min(st.start);
      st.start = this.value; st.end = B.hhmm(Math.min(B.min(st.start) + Math.max(60, dur), B.min(S.closeTime)));
      paintTimes(); paintSummary(); paintAvail(); saveDraft();
    });
    $("e-end").addEventListener("change", function () { st.end = this.value; paintTimes(); paintSummary(); paintAvail(); saveDraft(); });
    document.querySelectorAll("[data-g]").forEach(function (b) {
      b.addEventListener("click", function () {
        st.guests = Math.min(S.capacity, Math.max(S.eventMinGuests, st.guests + Number(b.getAttribute("data-g"))));
        paintGuests(); paintSummary(); paintAvail(); saveDraft();
      });
    });
    $("e-guests").addEventListener("change", function () {
      var n = Math.round(Number(this.value)) || S.eventMinGuests;
      st.guests = Math.min(S.capacity, Math.max(S.eventMinGuests, n));
      this.value = st.guests; paintGuests(); paintSummary(); paintAvail(); saveDraft();
    });
    document.querySelectorAll('input[name="space"]').forEach(function (r) { r.addEventListener("change", function () { paintAvail(); saveDraft(); }); });
    ["e-name", "e-phone"].forEach(function (id) { $(id).addEventListener("input", function () { err(id, ""); saveDraft(); }); });
    ["e-title", "e-budget", "e-food", "e-deco", "e-notes"].forEach(function (id) { $(id).addEventListener("change", saveDraft); });
    $("eform").addEventListener("submit", submit);
  };
})(window.CC = window.CC || {});
