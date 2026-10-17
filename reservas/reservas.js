/* Reservar mesa: personas, día, hora con disponibilidad real (mesas libres y capacidad del local),
   platos opcionales (copia fija del nombre y precio al momento de reservar), datos y envío con sesión iniciada.
   La reservación llega como "Pendiente" y el restaurante la confirma desde el Panel Administrativo. */
(function (CC) {
  "use strict";
  var B = CC.booking, DRAFT = "cc_res_draft", RID = "cc_res_rid";
  var $ = function (id) { return document.getElementById(id); };
  var GROUPS = [{ n: "Mañana", to: 720 }, { n: "Tarde", to: 1080 }, { n: "Noche", to: 1440 }];
  var DAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábados", "domingos"];

  var OCC = ["Cumpleaños", "Aniversario", "Reunión familiar", "Negocios", "Cita", "Otra"];
  var st = { party: 2, date: "", time: "", dishes: {}, month: "", step: 1 };
  var S = B.settings(), tables = [], live = null, avail = [], f = null, unsub = [], sending = false;

  function readJSON(k, store) { try { return JSON.parse((store || sessionStorage).getItem(k) || "null"); } catch (e) { return null; } }
  function saveDraft() {
    try {
      sessionStorage.setItem(DRAFT, JSON.stringify({ party: st.party, date: st.date, time: st.time, dishes: st.dishes,
        name: $("r-name").value, phone: $("r-phone").value, occ: $("r-occ").value, notes: $("r-notes").value }));
    } catch (e) {}
  }
  function err(id, msg) {
    var el = $(id), fl = el.closest(".field"), e = $(id + "-e");
    fl.classList.toggle("has-error", !!msg); if (e) e.textContent = msg || "";
    el.setAttribute("aria-invalid", msg ? "true" : "false");
    return !msg;
  }
  function formError(msg) { var b = $("r-error"); b.textContent = msg || ""; b.hidden = !msg; }

  /* ---------- personas ---------- */
  function paintParty() {
    $("party").textContent = st.party;
    $("party-l").textContent = st.party === 1 ? "persona" : "personas";
    document.querySelector('[data-party="-1"]').disabled = st.party <= 1;
    document.querySelector('[data-party="1"]').disabled = st.party >= S.maxParty;
    var top = Math.min(8, S.maxParty);
    $("pp").innerHTML = Array.apply(null, Array(top)).map(function (x, i) {
      var n = i + 1;
      return '<button type="button" class="rv-pp__b" data-pp="' + n + '" aria-pressed="' + (st.party === n) + '" aria-label="' + n + (n === 1 ? " persona" : " personas") + '">' + n + "</button>";
    }).join("") + (S.maxParty > top ? '<button type="button" class="rv-pp__b rv-pp__more" data-pp="' + (top + 1) + '" aria-pressed="' + (st.party > top) + '">' + (st.party > top ? st.party : top + 1 + "+") + "</button>" : "");
    var note = $("party-note");
    note.hidden = st.party < S.maxParty;
    note.innerHTML = CC.icon("info") + "<span>¿Son más de " + S.maxParty + '? <a href="../eventos/eventos.html">Solicita un evento</a> y organizamos el espacio para tu grupo.</span>';
  }

  /* ---------- calendario ---------- */
  function today() { return B.nowLocal(S.tzOffsetMin).date; }
  function lastDay() { return B.addDays(today(), S.maxAdvanceDays); }
  function paintCal() {
    if (!st.month) st.month = (st.date || today()).slice(0, 7);
    $("cal").innerHTML = B.calHTML({ month: st.month, selected: st.date, min: today(), max: lastDay(), isOpen: function (d) { return B.isOpenDate(S, d); } });
  }
  function moveMonth(n) { st.month = B.shiftMonth(st.month, n); paintCal(); }

  /* ---------- horarios (en vivo para el día elegido) ---------- */
  function stopLive() { unsub.forEach(function (u) { try { u(); } catch (e) {} }); unsub = []; }
  function watchDay(date) {
    stopLive(); live = null; avail = [];
    if (!date) { paintSlots(); return; }
    $("slots").innerHTML = '<div class="slots__load" aria-label="Cargando horarios">' + new Array(9).join("<i></i>") + "</div>";
    var got = { locks: null, caps: null };
    function done() {
      if (!got.locks || !got.caps || st.date !== date) return;
      live = { locks: got.locks, caps: got.caps };
      computeAvail(); paintSlots(); paintSummary();
    }
    function fail(e) { CC.logError("reservas.disponibilidad", e); $("slots").innerHTML = '<p class="slots__empty">No pudimos cargar los horarios. Revisa tu conexión y vuelve a elegir el día.</p>'; }
    unsub.push(f.db.collection("locks").where("date", "==", date).onSnapshot(function (q) { got.locks = q.docs.map(function (d) { return d.data(); }); done(); }, fail));
    unsub.push(f.db.collection("cap").where("date", "==", date).onSnapshot(function (q) { got.caps = q.docs.map(function (d) { return d.data(); }); done(); }, fail));
  }
  function computeAvail() {
    avail = live ? B.dayAvailability(S, tables, live.locks, live.caps, st.date, st.party) : [];
    if (st.time) {
      var cur = avail.filter(function (a) { return a.time === st.time; })[0];
      if (!cur || cur.state === "full" || cur.state === "past" || cur.state === "closed") {
        if (cur && cur.state === "full") CC.toast("La hora elegida ya no tiene mesa para " + st.party + ". Elige otra.", "error");
        st.time = "";
      }
    }
  }
  function paintSlots() {
    var box = $("slots"), dl = $("day-l");
    if (!st.date) { dl.textContent = "Elige un día para ver los horarios."; box.innerHTML = '<p class="slots__empty">Primero elige el día en el calendario.</p>'; return; }
    dl.textContent = B.longDate(st.date).replace(/^./, function (c) { return c.toUpperCase(); }) + " · para " + st.party + (st.party === 1 ? " persona" : " personas");
    if (!live) return;
    var shown = avail.filter(function (a) { return a.state !== "past" && a.state !== "closed"; });
    if (!shown.length) { box.innerHTML = '<p class="slots__empty">Ya no quedan horarios para este día. Elige otro día.</p>'; return; }
    if (!shown.some(function (a) { return a.state !== "full"; })) {
      box.innerHTML = '<p class="slots__empty">Este día está completo para ' + st.party + ' personas. Prueba otro día o menos personas.</p>'; return;
    }
    var from = 0;
    box.innerHTML = GROUPS.map(function (g) {
      var list = shown.filter(function (a) { var m = B.min(a.time); return m >= from && m < g.to; });
      from = g.to;
      if (!list.length) return "";
      return '<div class="slots__g"><h3>' + g.n + '</h3><div class="slots__row">' + list.map(function (a) {
        var lab = B.time12(a.time) + (a.state === "full" ? " (completo)" : a.state === "few" ? " (pocas mesas)" : "");
        return '<button type="button" role="radio" class="slot' + (a.state === "few" ? " slot--few" : "") + '" data-time="' + a.time + '" aria-checked="' + (a.time === st.time) + '" aria-label="' + lab + '"' + (a.state === "full" ? " disabled" : "") + ">" + B.time12(a.time).replace(" ", " ") + "</button>";
      }).join("") + "</div></div>";
    }).join("");
  }

  /* ---------- platos ---------- */
  function dishList() {
    return Object.keys(st.dishes).map(function (id) { var it = CC.getItem(id); return it ? { it: it, q: st.dishes[id] } : null; }).filter(Boolean);
  }
  function paintDishes() {
    var list = dishList();
    $("dsel").innerHTML = list.map(function (x) {
      return '<li data-id="' + x.it.id + '"><img src="' + CC.imgSrc(x.it.image) + '" alt="" loading="lazy" width="52" height="52">' +
        '<div class="dsel__n"><b>' + CC.esc(x.it.name) + "</b><small>" + CC.money(x.it.price) + " c/u</small></div>" +
        '<div class="qty"><button type="button" data-dq="-1" aria-label="Uno menos de ' + CC.esc(x.it.name) + '">' + CC.icon("minus") + "</button><output>" + x.q + "</output>" +
        '<button type="button" data-dq="1" aria-label="Uno más de ' + CC.esc(x.it.name) + '">' + CC.icon("plus") + "</button></div>" +
        '<button type="button" class="dsel__x" data-drm aria-label="Quitar ' + CC.esc(x.it.name) + '">' + CC.icon("trash") + "</button></li>";
    }).join("");
    $("dempty").hidden = !!list.length;
    $("add-dish").lastChild.textContent = list.length ? "Añadir más platos" : "Elegir del menú";
    var n = CC.store.cartCount(), fc = $("from-cart");
    fc.hidden = !n;
    $("from-cart-t").textContent = "Traer mi carrito (" + n + ")";
    paintSummary();
  }
  function setDish(id, q) {
    q = Math.max(0, Math.min(20, q));
    if (q) st.dishes[id] = q; else delete st.dishes[id];
    if (Object.keys(st.dishes).length > 40) { delete st.dishes[id]; CC.toast("Puedes añadir hasta 40 platos distintos.", "error"); }
    paintDishes(); saveDraft();
  }
  var pickCat = "";
  function paintPicker() {
    var q = $("dpick-q").value.trim().toLowerCase();
    var cats = [];
    CC.menu.forEach(function (i) { if (cats.indexOf(i.category) < 0) cats.push(i.category); });
    $("dpick-cats").innerHTML = ['<button type="button" data-cat="" aria-pressed="' + !pickCat + '">Todo</button>'].concat(cats.map(function (c) {
      return '<button type="button" data-cat="' + CC.esc(c) + '" aria-pressed="' + (c === pickCat) + '">' + CC.esc(c) + "</button>";
    })).join("");
    var items = CC.menu.filter(function (i) { return (!pickCat || i.category === pickCat) && (!q || i.name.toLowerCase().indexOf(q) > -1); });
    $("dpick-list").innerHTML = items.length ? items.map(function (i) {
      var n = st.dishes[i.id] || 0;
      return '<li><img src="' + CC.imgSrc(i.image) + '" alt="" loading="lazy" width="56" height="56"><div><b>' + CC.esc(i.name) + "</b><small>" + CC.money(i.price) + (n ? " · " + n + " en tu mesa" : "") + "</small></div>" +
        '<button type="button" class="dpick__add" data-pick="' + i.id + '">' + (n ? "+1" : "Añadir") + "</button></li>";
    }).join("") : '<li class="dpick__empty">No hay platos con ese nombre.</li>';
  }

  /* ---------- resumen ---------- */
  function paintSummary() {
    function put(id, v) { var el = $(id); el.textContent = v || "Sin elegir"; el.classList.toggle("is-empty", !v); }
    put("sum-party", st.party + (st.party === 1 ? " persona" : " personas"));
    put("sum-date", st.date ? B.shortDate(st.date) : "");
    put("sum-time", st.time ? B.time12(st.time) : "");
    var list = dishList(), n = list.reduce(function (a, x) { return a + x.q; }, 0), tot = list.reduce(function (a, x) { return a + x.q * x.it.price; }, 0);
    var sd = $("sum-dish"); sd.textContent = n ? n + " · aprox. " + CC.money(tot) : "Ninguno"; sd.classList.toggle("is-empty", !n);
    var tb = $("sum-table"), a = st.time && avail.filter(function (x) { return x.time === st.time; })[0];
    if (a && a.tables.length) {
      var seats = a.tables.reduce(function (s, t) { return s + t.seats; }, 0);
      tb.innerHTML = CC.icon("check") + "<span>Hay mesa para tu grupo" + (a.tables.length > 1 ? " (uniendo " + a.tables.length + " mesas, " + seats + " puestos)" : " (" + CC.esc(a.tables[0].zone || "salón") + ", " + seats + " puestos)") + ". El restaurante asigna la mesa al confirmar.</span>";
      tb.hidden = false;
    } else tb.hidden = true;
    /* resumen corto junto al botón (útil en el móvil, donde el ticket queda oculto) */
    $("mini").innerHTML = "<b>" + st.party + (st.party === 1 ? " pers." : " pers.") + "</b>" + (st.date ? " · " + CC.esc(B.shortDate(st.date)) : "") + (st.time ? " · " + B.time12(st.time) : "") + (n ? " · " + n + (n === 1 ? " plato" : " platos") : "");
    if (st.step === 4) paintReview();
    if (st.step === 2 && !sending) $("r-send-t").textContent = n ? LABELS[2] : "Saltar este paso";
  }
  function paintAll() { paintParty(); paintCal(); computeAvail(); paintSlots(); paintDishes(); }

  /* ---------- pasos ---------- */
  var LABELS = { 1: "Continuar", 2: "Continuar", 3: "Revisar reservación", 4: "Confirmar reservación" };
  function stepOk(n, show) {
    if (n === 1) {
      if (!st.date) { if (show) formError("Elige el día de tu reservación."); return false; }
      if (!st.time) { if (show) { formError("Elige la hora de tu reservación."); $("slots").scrollIntoView({ behavior: "smooth", block: "center" }); } return false; }
      return true;
    }
    if (n === 3) {
      var name = $("r-name").value.trim(), phone = $("r-phone").value.trim(), ok = true;
      if (!show) return name.length >= 2 && /^[0-9+()\-\s.]{7,30}$/.test(phone) && phone.replace(/\D/g, "").length >= 7;
      ok = err("r-name", name.length < 2 ? "Escribe tu nombre (mínimo 2 letras)." : "") && ok;
      ok = err("r-phone", !/^[0-9+()\-\s.]{7,30}$/.test(phone) || phone.replace(/\D/g, "").length < 7 ? "Escribe un teléfono válido, por ejemplo 809 555 1234." : "") && ok;
      if (!ok) { formError("Revisa tus datos: hay campos por corregir."); var bad = document.querySelector(".has-error input"); if (bad) bad.focus(); }
      return ok;
    }
    return true;
  }
  function goStep(n, noScroll) {
    /* Para avanzar hay que completar los pasos anteriores; hacia atrás siempre se puede */
    for (var i = 1; i < n; i++) if (!stepOk(i, false)) { n = i; break; }
    st.step = n; formError("");
    document.querySelectorAll(".rv-step").forEach(function (s) { s.hidden = Number(s.getAttribute("data-step")) !== n; });
    document.querySelectorAll(".rv-prog [data-go]").forEach(function (b) {
      var k = Number(b.getAttribute("data-go"));
      b.classList.toggle("is-done", k < n);
      if (k === n) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    });
    $("prog-bar").style.width = ((n - 1) * 100 / 3) + "%";
    $("r-back").hidden = n === 1;
    $("r-send-t").textContent = n === 2 && !dishList().length ? "Saltar este paso" : LABELS[n];
    $("fine").hidden = n !== 4;
    document.querySelector(".rv-next").classList.toggle("rv-next--final", n === 4);
    if (n === 4) paintReview();
    if (!noScroll) { var top = document.querySelector(".rv-prog"); if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ behavior: "smooth", block: "start" }); }
    var h = document.querySelector('.rv-step[data-step="' + n + '"] h2'); if (h && !noScroll) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }
  function next() {
    if (!stepOk(st.step, true)) return;
    goStep(st.step + 1);
  }
  function paintReview() {
    var list = dishList(), tot = list.reduce(function (a, x) { return a + x.q * x.it.price; }, 0), occ = $("r-occ").value, notes = $("r-notes").value.trim();
    function row(ic, l, v, go) { return '<div class="rv-rev"><span class="rv-rev__ic">' + CC.icon(ic) + "</span><div><small>" + l + "</small><b>" + v + '</b></div><button type="button" class="rv-rev__ed" data-go="' + go + '">Cambiar</button></div>'; }
    $("review").innerHTML =
      '<div class="rv-rev__big"><span>' + CC.esc(B.longDate(st.date).replace(/^./, function (c) { return c.toUpperCase(); })) + "</span><b>" + B.time12(st.time) + "</b><small>Mesa para " + st.party + (st.party === 1 ? " persona" : " personas") + " · duración aprox. " + S.durationMinutes + " min</small></div>" +
      row("users", "Personas", st.party + (st.party === 1 ? " persona" : " personas"), 1) +
      row("utensils", "Platos", list.length ? list.map(function (x) { return x.q + "× " + CC.esc(x.it.name); }).join(", ") + " · aprox. " + CC.money(tot) : "Ninguno", 2) +
      row("phone", "A nombre de", CC.esc($("r-name").value.trim()) + " · " + CC.esc($("r-phone").value.trim()), 3) +
      (occ || notes ? row("star", "Detalles", CC.esc([occ, notes].filter(Boolean).join(" · ")), 3) : "");
  }
  function paintOcc() {
    var v = $("r-occ").value;
    $("occ").innerHTML = OCC.map(function (o) { return '<button type="button" class="rv-chip" data-occ="' + CC.esc(o) + '" aria-pressed="' + (v === o) + '">' + CC.esc(o) + "</button>"; }).join("");
  }

  /* ---------- reservaciones propias (aviso superior) ---------- */
  function paintMine() {
    var box = $("mine"), u = CC.auth.user();
    if (!u || !f) { box.hidden = true; return; }
    f.db.collection("reservations").where("uid", "==", u.uid).get().then(function (q) {
      var now = Date.now();
      var act = q.docs.map(function (d) { return d.data(); }).filter(function (r) { return (r.status === "pending" || r.status === "confirmed") && r.start > now; })
        .sort(function (a, b) { return a.start - b.start; });
      if (!act.length) { box.hidden = true; return; }
      var r = act[0], s = B.RES_STATUS[r.status];
      box.innerHTML = "<p>" + CC.icon("calendar") + "<span>" + (act.length > 1 ? "Tienes " + act.length + " reservaciones próximas. La siguiente: " : "Tu próxima reservación: ") +
        "<b>" + B.shortDate(r.date) + ", " + B.time12(r.time) + "</b> · " + r.party + " pers. " + '<span class="st st--' + s.tone + '">' + s.label + "</span></span></p>" +
        '<a class="btn btn--sm btn--outline" href="../cuenta/cuenta.html#reservas">Ver en Mi cuenta</a>';
      box.hidden = false;
    }).catch(function (e) { box.hidden = true; CC.logError("reservas.mias", e); });
  }

  /* ---------- envío ---------- */
  function validate() {
    if (!stepOk(1, false)) { goStep(1); stepOk(1, true); return false; }
    if (!stepOk(3, false)) { goStep(3); stepOk(3, true); return false; }
    formError(""); return true;
  }
  function busy(on, label) {
    var b = $("r-send"); sending = on; b.disabled = on; b.querySelector(".spin").hidden = !on;
    $("r-send-t").textContent = label || LABELS[4];
  }
  /* Vuelve a mirar la disponibilidad en el servidor justo antes de enviar */
  function recheck() {
    return Promise.all([
      f.db.collection("locks").where("date", "==", st.date).get({ source: "server" }),
      f.db.collection("cap").where("date", "==", st.date).get({ source: "server" })
    ]).then(function (r) {
      var a = B.dayAvailability(S, tables, r[0].docs.map(function (d) { return d.data(); }), r[1].docs.map(function (d) { return d.data(); }), st.date, st.party);
      var cur = a.filter(function (x) { return x.time === st.time; })[0];
      return cur && (cur.state === "ok" || cur.state === "few");
    });
  }
  function overlapsMine(uid) {
    return f.db.collection("reservations").where("uid", "==", uid).where("date", "==", st.date).get().then(function (q) {
      var a = B.min(st.time), dur = S.durationMinutes;
      return q.docs.map(function (d) { return d.data(); }).filter(function (r) {
        return (r.status === "pending" || r.status === "confirmed") && Math.abs(B.min(r.time) - a) < dur;
      })[0] || null;
    });
  }
  function submit(e) {
    e.preventDefault();
    if (sending) return;
    if (st.step < 4) { next(); return; }
    if (!validate()) return;
    var u = CC.auth.user();
    if (!u) { saveDraft(); formError("Inicia sesión con Google para enviar tu reservación. Tus datos se quedan aquí."); CC.auth.openLogin(); return; }
    busy(true, "Comprobando disponibilidad…");
    var id, data;
    overlapsMine(u.uid).then(function (dup) {
      if (dup) throw { mine: dup };
      return recheck();
    }).then(function (free) {
      if (!free) throw { full: true };
      busy(true, "Enviando…");
      try { id = sessionStorage.getItem(RID); } catch (x) {}
      if (!id) { id = B.requestId("r"); try { sessionStorage.setItem(RID, id); } catch (x) {} }
      var ts = f.fb.firestore.FieldValue.serverTimestamp(), list = dishList();
      data = {
        uid: u.uid, name: $("r-name").value.trim().slice(0, 80), email: (u.email || "").slice(0, 120), phone: $("r-phone").value.trim().slice(0, 30),
        date: st.date, time: st.time, start: B.startMs(st.date, st.time, S.tzOffsetMin), party: st.party,
        status: "pending", tableIds: [],
        dishes: list.map(function (x) { return { id: x.it.id, name: x.it.name, price: x.it.price, qty: x.q }; }),
        dishesTotal: list.reduce(function (a, x) { return a + x.q * x.it.price; }, 0),
        notes: $("r-notes").value.trim().slice(0, 500), occasion: $("r-occ").value.slice(0, 60),
        createdAt: ts, updatedAt: ts, source: "web"
      };
      var ref = f.db.collection("reservations").doc(id), batch = f.db.batch();
      batch.set(ref, data);
      batch.set(ref.collection("log").doc(), { at: ts, by: u.uid, who: "cliente", action: "created", text: "Solicitud enviada desde la web" });
      batch.set(f.db.collection("notifications").doc(), { uid: u.uid, kind: "self", at: ts, read: false, ref: "reservations/" + id,
        title: "Recibimos tu reservación", body: B.shortDate(st.date) + ", " + B.time12(st.time) + " · " + st.party + " pers. Te avisaremos cuando el restaurante la confirme." });
      return batch.commit().catch(function (x) {
        /* ¿Ya se había guardado en un intento anterior? Entonces no se duplica: se toma como enviada */
        return ref.get().then(function (d) { if (d.exists && d.data().uid === u.uid) return; throw x; }, function () { throw x; });
      });
    }).then(function () {
      try { sessionStorage.removeItem(RID); sessionStorage.removeItem(DRAFT); } catch (x) {}
      done(id, data);
    }).catch(function (x) {
      busy(false);
      if (x && x.mine) { formError("Ya tienes una reservación ese día (" + B.time12(x.mine.time) + "). Puedes modificarla desde «Mi cuenta»."); return; }
      if (x && x.full) { st.time = ""; computeAvail(); paintSlots(); paintSummary(); goStep(1); formError("Esa hora se acaba de llenar. Elige otra hora."); return; }
      CC.logError("reservas.enviar", x);
      var code = x && x.code;
      formError(code === "unavailable" || !navigator.onLine ? "Sin conexión. Revisa tu internet y vuelve a intentarlo: no se enviará dos veces."
        : code === "permission-denied" ? "No se pudo guardar: el horario ya no está disponible o algún dato no es válido. Revisa la hora y vuelve a intentarlo."
        : "No pudimos enviar tu reservación. Vuelve a intentarlo en un momento.");
    });
  }
  function done(id, d) {
    stopLive();
    $("plan").hidden = true; $("mine").hidden = true;
    var box = $("done"), code = id.split("-").pop().slice(0, 6).toUpperCase();
    var wa = CC.waLink("Hola, envié una solicitud de reservación en la web (código " + code + "): " + B.longDate(d.date) + " a las " + B.time12(d.time) + ", " + d.party + " personas, a nombre de " + d.name + ".");
    box.innerHTML = '<div class="bdone__ic">' + CC.icon("check") + "</div><h2>¡Solicitud enviada!</h2>" +
      "<p>Tu reservación está <b>pendiente de confirmación</b>. Te avisaremos en «Mi cuenta» en cuanto el restaurante la confirme.</p>" +
      '<dl class="bdone__dl"><div><dt>Día</dt><dd>' + B.shortDate(d.date) + "</dd></div><div><dt>Hora</dt><dd>" + B.time12(d.time) + "</dd></div>" +
      "<div><dt>Personas</dt><dd>" + d.party + "</dd></div><div><dt>Código</dt><dd>" + code + "</dd></div></dl>" +
      (d.dishes.length ? '<p class="bnote">' + CC.icon("utensils") + "<span>Incluiste " + d.dishes.length + " plato(s) como referencia para la cocina. No es un pedido ni un pago.</span></p><p></p>" : "") +
      '<div class="bdone__acts"><a class="btn" href="../cuenta/cuenta.html#reservas">' + CC.icon("calendar") + "Ver mis reservaciones</a>" +
      '<a class="btn btn--outline" href="' + wa + '" target="_blank" rel="noopener noreferrer">' + CC.icon("chat") + "Avisar por WhatsApp</a>" +
      '<a class="btn btn--outline" href="reservas.html">Hacer otra</a></div>';
    box.hidden = false;
    box.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- fuera de línea / sin configurar ---------- */
  function showOff(msg, retry) {
    var box = $("off");
    box.innerHTML = "<p>" + CC.icon("info") + "<span>" + msg + "</span></p>" +
      '<div class="dsel__acts">' + (retry ? '<button type="button" class="btn btn--sm btn--outline" id="off-retry">' + CC.icon("refresh") + "Reintentar</button>" : "") +
      '<a class="btn btn--sm" href="' + CC.waLink("Hola, quisiera reservar una mesa en Caldos Constitución.") + '" target="_blank" rel="noopener noreferrer">' + CC.icon("chat") + "Reservar por WhatsApp</a></div>";
    box.hidden = false; $("plan").hidden = true;
    var r = $("off-retry"); if (r) r.onclick = function () { location.reload(); };
  }

  function hoursText() {
    var d = S.openDays.slice().sort();
    var days = d.length === 7 ? "todos los días" : d.length === 6 && d.indexOf(7) < 0 ? "de lunes a sábado" : "los " + d.map(function (x) { return DAYS[x - 1]; }).join(", ");
    return "Abrimos " + days + " de " + B.time12(S.openTime) + " a " + B.time12(S.closeTime);
  }

  /* ---------- arranque ---------- */
  CC.page = function () {
    var dr = readJSON(DRAFT);
    if (dr) {
      st.party = Number(dr.party) || 2; st.date = dr.date || ""; st.time = dr.time || ""; st.dishes = dr.dishes || {};
      $("r-name").value = dr.name || ""; $("r-phone").value = dr.phone || ""; $("r-occ").value = dr.occ || ""; $("r-notes").value = dr.notes || "";
    }
    Object.keys(st.dishes).forEach(function (k) { if (!CC.getItem(k)) delete st.dishes[k]; });
    if (window.matchMedia("(max-width: 960px)").matches) document.querySelector(".bpol").removeAttribute("open");

    if (!CC.auth || !CC.auth.configured) { showOff("Las reservaciones en línea no están disponibles en este momento."); return; }
    $("slots").innerHTML = '<div class="slots__load">' + new Array(9).join("<i></i>") + "</div>";
    CC.auth.fire().then(function (x) {
      f = x;
      return Promise.all([f.db.doc("settings/restaurant").get(), f.db.collection("tables").get()]);
    }).then(function (r) {
      if (!r[0].exists) { showOff("Muy pronto podrás reservar en línea. Mientras tanto, reserva por WhatsApp y te confirmamos al momento."); return; }
      S = B.settings(r[0].data());
      tables = r[1].docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).filter(function (t) { return t.active !== false; });
      st.party = Math.min(Math.max(1, st.party), S.maxParty);
      if (st.date && (st.date < today() || st.date > lastDay() || !B.isOpenDate(S, st.date))) { st.date = ""; st.time = ""; }
      $("hours-l").textContent = hoursText();
      $("policy").innerHTML = $("policy2").innerHTML = B.policy(S).map(function (p) { return "<li>" + CC.esc(p) + "</li>"; }).join("");
      paintAll(); goStep(1, true);
      if (st.date) watchDay(st.date);
      paintMine();
    }).catch(function (e) {
      CC.logError("reservas.cargar", e);
      showOff("No pudimos conectar con el sistema de reservaciones. Revisa tu conexión o reserva por WhatsApp.", true);
    });

    /* prellenado con la cuenta */
    function prefill() {
      var u = CC.auth.user(); if (!u) return;
      if (!$("r-name").value && u.name) $("r-name").value = u.name;
      var p = CC.auth.profile(); if (!$("r-phone").value && p.phone) $("r-phone").value = p.phone;
      if (f) paintMine();
      if (!$("r-error").hidden && /Inicia sesión/.test($("r-error").textContent)) formError("");
    }
    CC.auth.onChange(prefill); prefill();

    /* eventos */
    document.querySelectorAll(".rv-prog [data-go]").forEach(function (b) {
      b.addEventListener("click", function () { var n = Number(b.getAttribute("data-go")); if (n > st.step && !stepOk(st.step, true)) return; goStep(n); });
    });
    $("review").addEventListener("click", function (e) { var g = e.target.closest("[data-go]"); if (g) goStep(Number(g.getAttribute("data-go"))); });
    $("r-back").addEventListener("click", function () { goStep(Math.max(1, st.step - 1)); });
    $("pp").addEventListener("click", function (e) {
      var b = e.target.closest("[data-pp]"); if (!b) return;
      st.party = Math.min(S.maxParty, Number(b.getAttribute("data-pp")));
      paintParty(); computeAvail(); paintSlots(); paintSummary(); saveDraft();
    });
    $("occ").addEventListener("click", function (e) {
      var b = e.target.closest("[data-occ]"); if (!b) return;
      var v = b.getAttribute("data-occ"); $("r-occ").value = $("r-occ").value === v ? "" : v;
      paintOcc(); saveDraft();
    });
    paintOcc();
    document.querySelectorAll("[data-party]").forEach(function (b) {
      b.addEventListener("click", function () {
        st.party = Math.min(S.maxParty, Math.max(1, st.party + Number(b.getAttribute("data-party"))));
        paintParty(); computeAvail(); paintSlots(); paintSummary(); saveDraft();
      });
    });
    $("cal").addEventListener("click", function (e) {
      var nav = e.target.closest("[data-mon]"); if (nav) { moveMonth(Number(nav.getAttribute("data-mon"))); return; }
      var d = e.target.closest("[data-date]"); if (!d || d.disabled) return;
      if (st.date === d.getAttribute("data-date")) return;
      st.date = d.getAttribute("data-date"); st.time = ""; formError("");
      paintCal(); paintSummary(); saveDraft();
      watchDay(st.date); paintSlots();
    });
    $("slots").addEventListener("click", function (e) {
      var b = e.target.closest("[data-time]"); if (!b || b.disabled) return;
      st.time = b.getAttribute("data-time"); formError("");
      document.querySelectorAll(".slot").forEach(function (x) { x.setAttribute("aria-checked", String(x === b)); });
      paintSummary(); saveDraft();
    });
    $("slots").addEventListener("keydown", function (e) {
      if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].indexOf(e.key) < 0) return;
      var all = Array.prototype.slice.call(document.querySelectorAll(".slot:not(:disabled)")), i = all.indexOf(document.activeElement);
      if (i < 0) return; e.preventDefault();
      var n = all[(i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length]; n.focus(); n.click();
    });
    $("dsel").addEventListener("click", function (e) {
      var li = e.target.closest("li[data-id]"); if (!li) return;
      var id = li.getAttribute("data-id"), q = e.target.closest("[data-dq]");
      if (q) setDish(id, (st.dishes[id] || 0) + Number(q.getAttribute("data-dq")));
      else if (e.target.closest("[data-drm]")) setDish(id, 0);
    });
    $("from-cart").addEventListener("click", function () {
      var c = CC.store.cart();
      Object.keys(c).forEach(function (id) { st.dishes[id] = Math.min(20, Math.max(st.dishes[id] || 0, c[id])); });
      paintDishes(); saveDraft(); CC.toast("Añadimos los platos de tu carrito.");
    });
    var dlg = $("dpick");
    $("add-dish").addEventListener("click", function () { pickCat = ""; $("dpick-q").value = ""; paintPicker(); dlg.showModal(); });
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg || e.target.closest("[data-close]")) { dlg.close(); return; }
      var c = e.target.closest("[data-cat]"); if (c) { pickCat = c.getAttribute("data-cat"); paintPicker(); return; }
      var p = e.target.closest("[data-pick]"); if (p) { var id = p.getAttribute("data-pick"); setDish(id, (st.dishes[id] || 0) + 1); paintPicker(); }
    });
    $("dpick-q").addEventListener("input", paintPicker);
    ["r-name", "r-phone"].forEach(function (id) { $(id).addEventListener("input", function () { err(id, ""); saveDraft(); }); });
    ["r-occ", "r-notes"].forEach(function (id) { $(id).addEventListener("change", saveDraft); });
    CC.store.onChange(function () { paintDishes(); });
    $("rform").addEventListener("submit", submit);
    paintParty(); paintCal(); paintDishes(); paintSlots(); goStep(1, true);
  };
})(window.CC = window.CC || {});
