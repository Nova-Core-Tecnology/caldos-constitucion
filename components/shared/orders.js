/* Pedidos con pago en línea (compartido por el sitio y el Panel Administrativo).

   Regla de cobro (República Dominicana, en pesos):
   - Para recoger: se paga el 100 % al hacer el pedido.
   - A domicilio o para comer aquí: se paga el 50 % al hacer el pedido y el otro 50 % al recibirlo.

   Métodos:
   - Transferencia bancaria + comprobante: el equipo verifica el pago en el panel.
   - PayPal (cobra en dólares con la tasa que fija el propietario): el equipo confirma la transacción en su cuenta de PayPal.
   - Tarjeta con Azul: requiere un servidor (plan Blaze de Firebase) para firmar el pago; queda desactivada hasta entonces.

   Sin servidor, ningún pago se da por bueno automáticamente: todo pedido llega como «Pago por verificar».

   Datos en Firestore:
   - settings/payments      Configuración de cobro (lectura pública, solo la edita el propietario).
   - orders/{id}            Pedido del cliente.
   - orderProofs/{id}       Foto del comprobante de transferencia (privada: el cliente y el equipo de pedidos). */
(function (CC) {
  "use strict";

  var STATUS = {
    review: { label: "Pago por verificar", tone: "amber", hint: "Revisa el pago antes de preparar el pedido." },
    confirmed: { label: "Pago verificado", tone: "blue", hint: "Pago confirmado. Pasa el pedido a cocina." },
    preparing: { label: "En preparación", tone: "violet", hint: "La cocina está preparando el pedido." },
    ready: { label: "Listo para recoger", tone: "green", hint: "Avisa al cliente que puede pasar." },
    on_way: { label: "En camino", tone: "green", hint: "El pedido va hacia el cliente. Cobra el saldo al entregar." },
    done: { label: "Entregado", tone: "gray", hint: "Pedido completado." },
    rejected: { label: "Pago rechazado", tone: "red", hint: "El pago no se pudo verificar." },
    cancelled: { label: "Cancelado", tone: "red", hint: "Pedido cancelado." }
  };
  var MODES = { recoger: "Para recoger", domicilio: "A domicilio", mesa: "Para comer aquí" };
  var METHODS = { transfer: "Transferencia bancaria", paypal: "PayPal", azul: "Tarjeta (Azul)" };

  var DEFAULTS = {
    transfer: { enabled: false, banks: [], note: "" },
    paypal: { enabled: false, clientId: "", rate: 60 },
    azul: { enabled: false, merchantId: "" }
  };

  function settings(d) {
    d = d || {};
    return {
      transfer: Object.assign({}, DEFAULTS.transfer, d.transfer || {}),
      paypal: Object.assign({}, DEFAULTS.paypal, d.paypal || {}),
      /* Azul no se puede activar sin servidor, aunque alguien lo marque en la base de datos */
      azul: Object.assign({}, DEFAULTS.azul, d.azul || {}, { enabled: false })
    };
  }
  /* Porcentaje que se paga ahora según la modalidad */
  function pct(mode) { return mode === "recoger" ? 100 : 50; }
  /* Reparto del total en pesos enteros: lo que se paga ahora (redondeado hacia arriba) y el saldo al recibir */
  function split(total, mode) {
    total = Math.max(0, Math.round(Number(total) || 0));
    var p = pct(mode), now = Math.ceil(total * p / 100);
    return { pct: p, now: now, later: total - now, total: total };
  }
  /* Importe en dólares para PayPal (dos decimales, hacia arriba para no cobrar de menos) */
  function usd(dop, rate) { rate = Number(rate) || 0; return rate > 0 ? Math.ceil(dop / rate * 100) / 100 : 0; }
  function code(id) { return String(id || "").split("-").pop().slice(0, 6).toUpperCase(); }
  function enabledMethods(s) {
    return ["transfer", "paypal"].filter(function (k) {
      return s[k].enabled && (k !== "paypal" || (s.paypal.clientId && Number(s.paypal.rate) > 0)) && (k !== "transfer" || s.transfer.banks.length);
    });
  }

  CC.orders = { STATUS: STATUS, MODES: MODES, METHODS: METHODS, DEFAULTS: DEFAULTS, settings: settings, pct: pct, split: split, usd: usd, code: code, enabledMethods: enabledMethods };
})(window.CC = window.CC || {});
