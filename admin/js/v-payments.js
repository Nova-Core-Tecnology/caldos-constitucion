/* Configuración de cobros (solo el propietario): cuentas para transferencias, PayPal y estado de Azul.
   Se guarda en settings/payments, que el sitio lee para mostrar los métodos de pago. Aquí no se guarda
   ningún secreto: el «Client ID» de PayPal es público por diseño; las claves secretas nunca van en la web. */
(function (CC) {
  "use strict";
  var AD = window.AD, O = CC.orders;
  var TYPES = ["Cuenta de ahorros", "Cuenta corriente"];
  var BANKS = ["Banco Popular", "Banreservas", "BHD", "Scotiabank", "Banco Santa Cruz", "Asociación Popular (APAP)", "Asociación Cibao", "Banco Caribe", "Banco Promerica", "Banco López de Haro", "Banesco", "Otro"];

  AD.view("pagos", {
    title: "Pagos", icon: "tag", group: "Sistema", perm: "owner",
    render: function (host) {
      var S = O.settings(null), banks = [], loaded = false;
      function bankRow(b, i) {
        return '<div class="bankrow" data-i="' + i + '"><div class="grid3">' +
          '<div class="f"><label>Banco</label><select name="bank">' + BANKS.map(function (x) { return "<option" + (x === b.bank ? " selected" : "") + ">" + x + "</option>"; }).join("") + (BANKS.indexOf(b.bank) < 0 && b.bank ? "<option selected>" + AD.esc(b.bank) + "</option>" : "") + "</select></div>" +
          '<div class="f"><label>Tipo</label><select name="type">' + TYPES.map(function (x) { return "<option" + (x === b.type ? " selected" : "") + ">" + x + "</option>"; }).join("") + "</select></div>" +
          '<div class="f"><label>Número de cuenta</label><input name="number" maxlength="30" inputmode="numeric" value="' + AD.esc(b.number || "") + '"></div>' +
          '<div class="f"><label>Titular</label><input name="holder" maxlength="80" value="' + AD.esc(b.holder || "") + '"></div>' +
          '<div class="f"><label>Cédula o RNC <span class="opt">(opcional)</span></label><input name="doc" maxlength="20" value="' + AD.esc(b.doc || "") + '"></div>' +
          '<div class="f bankrow__x"><button type="button" class="b b--danger b--sm" data-rm="' + i + '">' + AD.icon("trash") + "Quitar</button></div></div></div>";
      }
      function paint() {
        if (!loaded) { host.innerHTML = '<div class="empty">Cargando…</div>'; return; }
        var on = O.enabledMethods(S);
        host.innerHTML = '<div class="sums">' +
          '<div class="sum"><span class="sum__ic">' + AD.icon("pin") + "</span><div><small>Para recoger</small><b>100 % al pedir</b><span>Pago completo por adelantado</span></div></div>" +
          '<div class="sum"><span class="sum__ic">' + AD.icon("home") + "</span><div><small>A domicilio y comer aquí</small><b>50 % + 50 %</b><span>Mitad al pedir y mitad al recibir</span></div></div>" +
          '<div class="sum"><span class="sum__ic">' + AD.icon("check") + "</span><div><small>Métodos activos en la web</small><b>" + (on.length ? on.map(function (k) { return O.METHODS[k]; }).join(" · ") : "Ninguno") + "</b><span>" + (on.length ? "Los clientes ya pueden pagar" : "Activa al menos uno para cobrar") + "</span></div></div></div>" +
          '<form id="pg-f" novalidate>' +
          /* transferencia */
          '<div class="card"><div class="card__h"><div class="card__ttl"><span class="card__ic card__ic--green">' + AD.icon("home") + "</span><div><h2>Transferencia bancaria</h2><p>El cliente transfiere y sube el comprobante. Tú verificas el pago en tu banco.</p></div></div>" +
            '<label class="switch"><input type="checkbox" name="t_on"' + (S.transfer.enabled ? " checked" : "") + '><span></span>Activo</label></div>' +
            '<div id="pg-banks">' + (banks.length ? banks.map(bankRow).join("") : '<p class="muted small">Añade al menos una cuenta.</p>') + "</div>" +
            '<button type="button" class="b b--sm" id="pg-add">' + AD.icon("plus") + "Añadir cuenta</button>" +
            '<div class="f" style="margin-top:1rem"><label for="pg-tn">Instrucciones para el cliente <span class="opt">(opcional)</span></label><input id="pg-tn" name="t_note" maxlength="200" value="' + AD.esc(S.transfer.note || "") + '" placeholder="Ej.: Pon tu nombre en el concepto de la transferencia."></div></div>' +
          /* PayPal */
          '<div class="card"><div class="card__h"><div class="card__ttl"><span class="card__ic card__ic--blue">' + AD.icon("shield") + "</span><div><h2>PayPal</h2><p>Tarjetas y cuentas PayPal. Cobra en dólares; tú fijas la tasa.</p></div></div>" +
            '<label class="switch"><input type="checkbox" name="p_on"' + (S.paypal.enabled ? " checked" : "") + '><span></span>Activo</label></div>' +
            '<div class="grid2"><div class="f"><label for="pg-pid">Client ID (de tu cuenta PayPal Business)</label><input id="pg-pid" name="p_id" maxlength="120" autocomplete="off" spellcheck="false" value="' + AD.esc(S.paypal.clientId || "") + '"><small>PayPal Developer → Apps &amp; Credentials → tu app (modo Live). Solo el Client ID: <b>nunca pegues aquí el «Secret»</b>.</small></div>' +
            '<div class="f"><label for="pg-rate">Tasa: pesos por cada US$1</label><input id="pg-rate" name="p_rate" type="number" min="1" max="500" step="0.01" value="' + AD.esc(String(S.paypal.rate || "")) + '"><small>Ej.: 60 significa que RD$600 se cobran como US$10.00. Actualízala cuando cambie el dólar.</small></div></div>' +
            '<div class="box">' + AD.icon("info") + " Sin servidor, el pedido llega como «Pago por verificar» con el ID de PayPal. Confírmalo en tu cuenta de PayPal antes de prepararlo.</div></div>" +
          /* Azul */
          '<div class="card card--off"><div class="card__h"><div class="card__ttl"><span class="card__ic card__ic--violet">' + AD.icon("tag") + "</span><div><h2>Tarjeta con Azul</h2><p>Banco Popular · tarjetas locales e internacionales en pesos.</p></div></div><span class=\"st st--gray\">Requiere servidor</span></div>" +
            '<p class="small">Azul exige firmar cada pago con una clave secreta que no puede estar en una página web. Para activarlo hace falta el plan <b>Blaze</b> de Firebase (Cloud Functions). Cuando lo actives, se conecta aquí con tu Merchant ID de Azul.</p>' +
            '<div class="f"><label for="pg-az">Merchant ID de Azul <span class="opt">(para más adelante)</span></label><input id="pg-az" name="a_id" maxlength="40" autocomplete="off" value="' + AD.esc(S.azul.merchantId || "") + '"></div></div>' +
          '<div class="savebar"><span class="muted small">Los cambios se aplican al momento en la página de pago.</span><button class="b b--p b--lg" type="submit" id="pg-save">' + AD.icon("check") + "Guardar pagos</button></div></form>";
      }
      function readBanks() {
        return AD.$$(".bankrow", host).map(function (r) {
          var v = function (n) { return String(r.querySelector('[name="' + n + '"]').value || "").trim(); };
          return { bank: v("bank"), type: v("type"), number: v("number").replace(/[^\d\-]/g, ""), holder: v("holder"), doc: v("doc") };
        });
      }
      host.addEventListener("click", function (e) {
        if (e.target.closest("#pg-add")) { banks = readBanks(); if (banks.length >= 6) { AD.toast("Máximo 6 cuentas.", "error"); return; } banks.push({ bank: "Banco Popular", type: TYPES[0] }); keep(); return; }
        var rm = e.target.closest("[data-rm]"); if (rm) { banks = readBanks(); banks.splice(Number(rm.dataset.rm), 1); keep(); }
      });
      /* repinta conservando lo que ya se escribió */
      function keep() {
        var f = AD.$("#pg-f"), tmp = { t_on: AD.val(f, "t_on"), p_on: AD.val(f, "p_on"), t_note: AD.val(f, "t_note"), p_id: AD.val(f, "p_id"), p_rate: AD.val(f, "p_rate"), a_id: AD.val(f, "a_id") };
        S = O.settings({ transfer: { enabled: tmp.t_on, note: tmp.t_note, banks: banks }, paypal: { enabled: tmp.p_on, clientId: tmp.p_id, rate: Number(tmp.p_rate) || "" }, azul: { merchantId: tmp.a_id } });
        paint();
      }
      host.addEventListener("submit", function (e) {
        e.preventDefault();
        var f = AD.$("#pg-f"), list = readBanks().filter(function (b) { return b.number || b.holder; });
        var bad = list.filter(function (b) { return b.number.replace(/\D/g, "").length < 6 || b.holder.length < 3; });
        if (bad.length) { AD.toast("Revisa las cuentas: cada una necesita número (6+ dígitos) y titular.", "error"); return; }
        var tOn = AD.val(f, "t_on"), pOn = AD.val(f, "p_on"), pid = AD.val(f, "p_id"), rate = Math.round(Number(AD.val(f, "p_rate")) * 100) / 100;
        if (tOn && !list.length) { AD.toast("Para activar transferencias añade al menos una cuenta.", "error"); return; }
        if (pOn && (!/^[A-Za-z0-9_\-]{20,120}$/.test(pid))) { AD.fieldErr(f, "p_id", "Pega el Client ID completo de PayPal."); return; }
        if (pOn && !(rate >= 1 && rate <= 500)) { AD.fieldErr(f, "p_rate", "Escribe la tasa (por ejemplo 60)."); return; }
        if (/secret|^E[A-Za-z0-9_\-]{60,}$/i.test(AD.val(f, "a_id"))) { AD.fieldErr(f, "a_id", "Aquí solo va el Merchant ID, nunca claves secretas."); return; }
        var d = { transfer: { enabled: !!tOn, banks: list.slice(0, 6), note: AD.val(f, "t_note").slice(0, 200) }, paypal: { enabled: !!pOn, clientId: pid, rate: rate || 0 }, azul: { enabled: false, merchantId: AD.val(f, "a_id").slice(0, 40) }, updatedAt: AD.ts(), updatedBy: AD.me.uid };
        var b = AD.$("#pg-save"); b.disabled = true;
        AD.db.doc("settings/payments").set(d).then(function () {
          AD.audit("payments.update", "settings/payments", "Transferencia " + (d.transfer.enabled ? "activa (" + list.length + " cuentas)" : "inactiva") + " · PayPal " + (d.paypal.enabled ? "activo, tasa " + rate : "inactivo"));
          S = O.settings(d); banks = d.transfer.banks.slice(); paint(); AD.toast("Pagos guardados.");
        }, function (er) { b.disabled = false; AD.fail("payments", er); });
      });
      AD.db.doc("settings/payments").get().then(function (d) { S = O.settings(d.exists ? d.data() : null); banks = (S.transfer.banks || []).slice(); loaded = true; paint(); }, function (e) { loaded = true; paint(); AD.fail("payments.load", e); });
      paint();
    }
  });
})(window.CC = window.CC || {});
