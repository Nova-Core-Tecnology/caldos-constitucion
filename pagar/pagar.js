/* Pagar pedido: modalidad y datos de entrega, cobro del 100 % (recoger) o 50 % (domicilio / comer aquí)
   por transferencia con comprobante o por PayPal, y envío del pedido al restaurante.
   Sin servidor no se confirma ningún pago de forma automática: el pedido llega como «Pago por verificar»
   y el equipo lo revisa en el Panel Administrativo (Pedidos). */
(function (CC) {
  "use strict";
  var O = CC.orders, DET_KEY = "cc_cart_details", NOTE_KEY = "cc_cart_note", OID = "cc_order_id";
  var $ = function (id) { return document.getElementById(id); };
  var S = O.settings(null), f = null, method = "", proof = null, sending = false, ppLoaded = null;

  function load(k) { try { var v = localStorage.getItem(k); return v ? (k === NOTE_KEY ? v : JSON.parse(v)) : null; } catch (e) { return null; } }
  function mode() { var r = document.querySelector('input[name="mode"]:checked'); return r ? r.value : "recoger"; }
  function err(id, msg) {
    var el = $(id), fl = el.closest(".field"), e = $(id + "-e");
    if (fl) fl.classList.toggle("has-error", !!msg); if (e) e.textContent = msg || "";
    el.setAttribute("aria-invalid", msg ? "true" : "false"); return !msg;
  }
  function formError(msg) { var b = $("py-err"); b.textContent = msg || ""; b.hidden = !msg; if (msg) b.scrollIntoView({ behavior: "smooth", block: "center" }); }

  /* ---------- carrito ---------- */
  function lines() {
    var cart = CC.store.cart();
    return Object.keys(cart).map(function (id) { var it = CC.getItem(id); return it ? { it: it, q: cart[id] } : null; }).filter(Boolean);
  }
  function total() { return lines().reduce(function (a, x) { return a + x.q * x.it.price; }, 0); }

  function paint() {
    var ls = lines(), sp = O.split(total(), mode()), m = mode();
    $("lines").innerHTML = ls.map(function (x) {
      return '<li class="' + (x.it.soldOut ? "is-sold" : "") + '"><img src="' + CC.imgSrc(x.it.image) + '" alt="" width="48" height="48" loading="lazy"><span><b>' + x.q + "× " + CC.esc(x.it.name) + "</b>" + (x.it.soldOut ? "<small>Agotado: quítalo del carrito</small>" : x.it.priceNote ? "<small>Precio desde</small>" : "") + "</span><em>" + CC.money(x.q * x.it.price) + "</em></li>";
    }).join("");
    $("s-total").textContent = CC.money(sp.total);
    $("s-pct").textContent = sp.pct; $("s-now").textContent = CC.money(sp.now);
    $("s-later-r").hidden = !sp.later; $("s-later").textContent = CC.money(sp.later);
    $("s-later-l").textContent = m === "mesa" ? "Pagas en el local" : "Pagas al recibir";
    $("pay-pct").textContent = "el " + sp.pct + " %"; $("pay-now").textContent = CC.money(sp.now);
    $("pay-sub").textContent = sp.pct === 100 ? "Para recoger se paga el pedido completo por adelantado." : "Pagas la mitad ahora para apartar tu pedido y el resto (" + CC.money(sp.later) + ") " + (m === "mesa" ? "en el local." : "cuando te llegue.");
    $("t-amt").textContent = CC.money(sp.now);
    $("pp-usd").textContent = "US$" + O.usd(sp.now, S.paypal.rate).toFixed(2);
    $("pp-rate").textContent = "RD$" + Number(S.paypal.rate || 0).toFixed(2) + " por US$1";
    var hint = ls.some(function (x) { return x.it.priceNote; });
    $("s-note").hidden = !hint; $("s-note").textContent = "Algunos platos tienen precio «desde»: si el precio final cambia, el restaurante te contacta.";
    $("p-addr-f").hidden = m !== "domicilio";
    $("wa-help").href = CC.waLink("Hola, tengo una duda sobre mi pedido en la web.");
  }

  /* ---------- métodos de pago ---------- */
  function paintTabs() {
    var on = O.enabledMethods(S), all = ["transfer", "paypal", "azul"];
    var ic = { transfer: "home", paypal: "shield", azul: "tag" };
    if (on.indexOf(method) < 0) method = on[0] || "azul";
    $("tabs").innerHTML = all.map(function (k) {
      var dis = on.indexOf(k) < 0 && k !== "azul", soon = k === "azul";
      if (dis) return "";
      return '<button type="button" role="tab" class="py-tab" data-m="' + k + '" aria-selected="' + (k === method) + '">' + CC.icon(ic[k]) + "<span>" + O.METHODS[k] + "</span>" + (soon ? "<small>Pronto</small>" : "") + "</button>";
    }).join("");
    all.forEach(function (k) { $("pane-" + k).hidden = k !== method; });
    if (method === "paypal") loadPayPal();
  }
  function paintBanks() {
    var b = S.transfer.banks || [];
    $("banks").innerHTML = b.map(function (x, i) {
      return '<li class="py-bank"><div><b>' + CC.esc(x.bank) + "</b><small>" + CC.esc(x.type || "Cuenta") + " · " + CC.esc(x.holder || "") + (x.doc ? " · " + CC.esc(x.doc) : "") + '</small><code>' + CC.esc(x.number) + '</code></div><button type="button" class="btn btn--sm btn--outline" data-copy="' + i + '">' + CC.icon("check") + "Copiar</button></li>";
    }).join("");
    $("t-note").hidden = !S.transfer.note; $("t-note").textContent = S.transfer.note || "";
  }

  /* ---------- comprobante: se reduce en el navegador (sin servidor de archivos) ---------- */
  function shrink(file) {
    return new Promise(function (ok, ko) {
      if (!/^image\//.test(file.type)) { ko(new Error("tipo")); return; }
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var max = 1400, w = img.width, h = img.height, r = Math.min(1, max / Math.max(w, h));
        var c = document.createElement("canvas"); c.width = Math.round(w * r); c.height = Math.round(h * r);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        var q = .78, out = c.toDataURL("image/jpeg", q);
        while (out.length > 850000 && q > .3) { q -= .12; out = c.toDataURL("image/jpeg", q); }
        if (out.length > 880000) ko(new Error("grande")); else ok(out);
      };
      img.onerror = function () { URL.revokeObjectURL(url); ko(new Error("img")); };
      img.src = url;
    });
  }

  /* ---------- validación ---------- */
  function validate() {
    var ok = true, name = $("p-name").value.trim(), phone = $("p-phone").value.trim();
    ok = err("p-name", name.length < 2 ? "Escribe tu nombre." : "") && ok;
    ok = err("p-phone", !/^[0-9+()\-\s.]{7,30}$/.test(phone) || phone.replace(/\D/g, "").length < 7 ? "Escribe un teléfono válido." : "") && ok;
    if (mode() === "domicilio") ok = err("p-addr", $("p-addr").value.trim().length < 8 ? "Escribe la dirección con sector y referencia." : "") && ok;
    if (!ok) { formError("Revisa tus datos de entrega."); return false; }
    var ls = lines();
    if (!ls.length) { formError("Tu carrito está vacío."); return false; }
    if (ls.some(function (x) { return x.it.soldOut; })) { formError("Hay platos agotados en tu pedido. Vuelve al carrito y quítalos."); return false; }
    formError(""); return true;
  }
  function needLogin() {
    if (CC.auth.user()) return false;
    formError("Inicia sesión con Google para hacer el pedido. Así podrás seguir su estado en «Mi cuenta».");
    CC.auth.openLogin(); return true;
  }

  /* ---------- envío ---------- */
  function orderId() {
    var id = null; try { id = sessionStorage.getItem(OID); } catch (e) {}
    if (!id) { id = "o-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8); try { sessionStorage.setItem(OID, id); } catch (e) {} }
    return id;
  }
  function build(pay) {
    var u = CC.auth.user(), ls = lines(), sp = O.split(total(), mode()), ts = f.fb.firestore.FieldValue.serverTimestamp();
    return {
      uid: u.uid, email: (u.email || "").slice(0, 120), name: $("p-name").value.trim().slice(0, 80), phone: $("p-phone").value.trim().slice(0, 30),
      mode: mode(), address: mode() === "domicilio" ? $("p-addr").value.trim().slice(0, 200) : "", time: $("p-time").value || "", note: $("p-note").value.trim().slice(0, 200),
      items: ls.map(function (x) { return { id: x.it.id, name: x.it.name, qty: x.q, price: x.it.price }; }),
      total: sp.total, pct: sp.pct, payNow: sp.now, balance: sp.later,
      method: pay.method, pay: pay.data, hasProof: !!pay.proof,
      status: "review", createdAt: ts, updatedAt: ts, source: "web"
    };
  }
  function send(pay) {
    var id = orderId(), data = build(pay), ref = f.db.collection("orders").doc(id), b = f.db.batch(), u = CC.auth.user();
    b.set(ref, data);
    if (pay.proof) b.set(f.db.collection("orderProofs").doc(id), { uid: u.uid, data: pay.proof, at: data.createdAt });
    b.set(f.db.collection("notifications").doc(), { uid: u.uid, kind: "self", at: data.createdAt, read: false, ref: "orders/" + id,
      title: "Recibimos tu pedido #" + O.code(id), body: "Pagaste " + CC.money(data.payNow) + " por " + O.METHODS[data.method].toLowerCase() + ". Te avisaremos cuando el restaurante verifique el pago." });
    return b.commit().catch(function (x) {
      /* ¿Se guardó en un intento anterior? Entonces no se duplica */
      return ref.get().then(function (d) { if (d.exists && d.data().uid === u.uid) return; throw x; }, function () { throw x; });
    }).then(function () {
      /* historial del cliente (Mi cuenta y estadísticas de clientes) */
      CC.auth.addOrder({ orderId: id, items: data.items, total: data.total, payNow: data.payNow, mode: data.mode, method: data.method, time: data.time, note: data.note });
      try { sessionStorage.removeItem(OID); } catch (e) {}
      done(id, data);
    });
  }
  function sendTransfer() {
    if (sending || !validate() || needLogin()) return;
    var refNo = $("t-ref").value.trim(), ok = err("t-ref", refNo.length < 4 ? "Escribe el número de referencia de la transferencia." : "");
    ok = (proof ? true : (($("t-file-e").textContent = "Sube la foto del comprobante."), false)) && ok;
    if (!ok) { formError("Faltan datos de la transferencia."); return; }
    busy(true);
    send({ method: "transfer", proof: proof, data: { status: "review", ref: refNo.slice(0, 60), from: $("t-from").value.trim().slice(0, 60) } }).catch(fail).then(function () { busy(false); });
  }
  function fail(x) {
    CC.logError("pagar.enviar", x);
    var c = x && x.code;
    formError(c === "unavailable" || !navigator.onLine ? "Sin conexión. Revisa tu internet y vuelve a intentarlo: no se enviará dos veces."
      : c === "permission-denied" ? "No se pudo guardar el pedido. Revisa los datos o recarga la página; si el problema sigue, escríbenos por WhatsApp."
      : "No pudimos enviar tu pedido. Vuelve a intentarlo en un momento.");
  }
  function busy(on) { sending = on; var b = $("t-send"); b.disabled = on; b.querySelector(".spin").hidden = !on; $("t-send-t").textContent = on ? "Enviando…" : "Enviar pedido y comprobante"; }

  /* ---------- PayPal (botones oficiales; el cobro ocurre en PayPal) ---------- */
  function loadPayPal() {
    if (ppLoaded) return ppLoaded;
    var box = $("pp-btns"); box.innerHTML = '<div class="py-load">Cargando PayPal…</div>';
    ppLoaded = new Promise(function (ok, ko) {
      var s = document.createElement("script");
      s.src = "https://www.paypal.com/sdk/js?client-id=" + encodeURIComponent(S.paypal.clientId) + "&currency=USD&intent=capture&components=buttons&locale=es_DO";
      s.onload = ok; s.onerror = function () { ko(new Error("paypal")); }; document.head.appendChild(s);
    }).then(function () {
      box.innerHTML = "";
      return window.paypal.Buttons({
        style: { layout: "vertical", shape: "rect", label: "pay" },
        onClick: function (d, actions) { if (!validate() || needLogin()) return actions.reject(); return actions.resolve(); },
        createOrder: function (d, actions) {
          var sp = O.split(total(), mode()), id = orderId();
          return actions.order.create({ purchase_units: [{ reference_id: O.code(id), custom_id: id, description: "Pedido " + O.code(id) + " · Caldos Constitución (" + sp.pct + " %)", amount: { currency_code: "USD", value: O.usd(sp.now, S.paypal.rate).toFixed(2) } }] });
        },
        onApprove: function (d, actions) {
          return actions.order.capture().then(function (det) {
            var cap = det && det.purchase_units && det.purchase_units[0] && det.purchase_units[0].payments && det.purchase_units[0].payments.captures && det.purchase_units[0].payments.captures[0];
            var sp = O.split(total(), mode()), pid = String((cap && cap.id) || det.id || "").slice(0, 60);
            return send({ method: "paypal", data: { status: "review", ref: pid, order: String(det.id || "").slice(0, 60), state: String((cap && cap.status) || det.status || "").slice(0, 30),
              payer: String((det.payer && det.payer.email_address) || "").slice(0, 120), usd: O.usd(sp.now, S.paypal.rate), rate: Number(S.paypal.rate) } }).catch(function (x) {
              /* El cobro ya ocurrió en PayPal: se le da al cliente el ID para resolverlo sin perder su pago */
              CC.logError("pagar.paypal.registro", x);
              formError("Tu pago en PayPal se completó (ID " + pid + "), pero no pudimos registrar el pedido. Escríbenos por WhatsApp con ese ID y lo resolvemos al momento.");
            });
          }, fail);
        },
        onError: function (e) { CC.logError("pagar.paypal", e); formError("PayPal no pudo completar el pago. No se te cobró nada; vuelve a intentarlo o paga por transferencia."); }
      }).render(box);
    }).catch(function (e) { ppLoaded = null; CC.logError("pagar.paypal.sdk", e); box.innerHTML = '<p class="py-help">No se pudo cargar PayPal. Revisa tu conexión o paga por transferencia.</p>'; });
    return ppLoaded;
  }

  /* ---------- hecho ---------- */
  function done(id, d) {
    CC.store.clear();
    $("py").hidden = true; $("ps2").classList.add("is-on"); $("ps3").classList.add("is-on");
    var code = O.code(id), wa = CC.waLink("Hola, hice el pedido #" + code + " en la web (" + O.MODES[d.mode] + ", total " + CC.money(d.total) + "). Pagué " + CC.money(d.payNow) + " por " + O.METHODS[d.method] + ".");
    $("done").innerHTML = '<div class="py-done__ic">' + CC.icon("check") + "</div><h2>¡Pedido enviado!</h2>" +
      "<p>Tu pedido <b>#" + code + "</b> está <b>pendiente de verificación del pago</b>. Cuando el restaurante lo confirme, empezará a prepararlo y te avisaremos en «Mi cuenta».</p>" +
      '<dl class="py-done__dl"><div><dt>Total</dt><dd>' + CC.money(d.total) + "</dd></div><div><dt>Pagaste</dt><dd>" + CC.money(d.payNow) + "</dd></div>" +
      (d.balance ? "<div><dt>" + (d.mode === "mesa" ? "En el local" : "Al recibir") + "</dt><dd>" + CC.money(d.balance) + "</dd></div>" : "") + "<div><dt>Modalidad</dt><dd>" + O.MODES[d.mode] + "</dd></div></dl>" +
      '<div class="py-done__acts"><a class="btn" href="../cuenta/cuenta.html">' + CC.icon("users") + "Ir a Mi cuenta</a>" +
      '<a class="btn btn--outline" href="' + wa + '" target="_blank" rel="noopener noreferrer">' + CC.icon("chat") + "Avisar por WhatsApp</a></div>";
    $("done").hidden = false; window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function off(msg) {
    $("py").hidden = true;
    $("py-off").innerHTML = "<p>" + CC.icon("info") + "<span>" + msg + '</span></p><div class="py-off__acts"><a class="btn btn--sm btn--outline" href="../carrito/carrito.html">Volver al carrito</a><a class="btn btn--sm" href="' + CC.waLink("Hola, quisiera hacer un pedido en Caldos Constitución.") + '" target="_blank" rel="noopener noreferrer">' + CC.icon("chat") + "Pedir por WhatsApp</a></div>";
    $("py-off").hidden = false;
  }

  /* ---------- arranque ---------- */
  CC.page = function () {
    var det = load(DET_KEY) || {};
    var r = document.querySelector('input[name="mode"][value="' + (det.mode || "recoger") + '"]'); (r || document.querySelector('input[name="mode"]')).checked = true;
    $("p-name").value = det.name || ""; $("p-addr").value = det.addr || ""; $("p-time").value = det.time || ""; $("p-note").value = load(NOTE_KEY) || "";
    if (!lines().length) { off("Tu carrito está vacío. Elige tus platos en el menú y vuelve aquí para pagar."); return; }
    paint();
    if (!CC.auth || !CC.auth.configured) { off("Los pagos en línea no están disponibles en este momento."); return; }
    CC.auth.fire().then(function (x) { f = x; return f.db.doc("settings/payments").get(); }).then(function (d) {
      S = O.settings(d.exists ? d.data() : null);
      if (!O.enabledMethods(S).length) { off("Muy pronto podrás pagar en línea. Mientras tanto, haz tu pedido por WhatsApp."); return; }
      paintBanks(); paintTabs(); paint();
    }).catch(function (e) { CC.logError("pagar.cargar", e); off("No pudimos conectar con el sistema de pagos. Revisa tu conexión o pide por WhatsApp."); });

    function prefill() {
      var u = CC.auth.user(); if (!u) return;
      if (!$("p-name").value && u.name) $("p-name").value = u.name;
      var p = CC.auth.profile(); if (!$("p-phone").value && p.phone) $("p-phone").value = p.phone; if (!$("p-addr").value && p.address) $("p-addr").value = p.address;
      if (/Inicia sesión/.test($("py-err").textContent)) formError("");
    }
    CC.auth.onChange(prefill); prefill();

    document.querySelectorAll('input[name="mode"]').forEach(function (x) { x.addEventListener("change", paint); });
    ["p-name", "p-phone", "p-addr", "t-ref"].forEach(function (id) { $(id).addEventListener("input", function () { err(id, ""); }); });
    $("tabs").addEventListener("click", function (e) { var t = e.target.closest("[data-m]"); if (!t) return; method = t.dataset.m; paintTabs(); formError(""); });
    $("banks").addEventListener("click", function (e) {
      var c = e.target.closest("[data-copy]"); if (!c) return; var n = S.transfer.banks[Number(c.dataset.copy)].number;
      (navigator.clipboard ? navigator.clipboard.writeText(n) : Promise.reject()).then(function () { CC.toast("Número de cuenta copiado"); }, function () { CC.toast("Cuenta: " + n); });
    });
    $("t-file").addEventListener("change", function () {
      var file = this.files && this.files[0]; $("t-file-e").textContent = ""; if (!file) return;
      $("t-file-t").textContent = "Procesando…";
      shrink(file).then(function (data) { proof = data; $("t-prev").src = data; $("t-prev").hidden = false; $("t-file-t").textContent = "Comprobante listo · toca para cambiarlo"; $("t-drop").classList.add("is-ok"); },
        function () { proof = null; $("t-prev").hidden = true; $("t-file-t").textContent = "Sube la captura del comprobante"; $("t-file-e").textContent = "No pudimos leer esa imagen. Prueba con una captura en JPG o PNG."; });
    });
    $("t-send").addEventListener("click", sendTransfer);
    CC.store.onChange(paint);
  };
})(window.CC = window.CC || {});
