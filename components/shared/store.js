/* Estado compartido: favoritos y carrito en localStorage, con manejo de errores. */
(function (CC) {
  "use strict";
  var KEYS = { fav: "cc_favorites", cart: "cc_cart" };
  var listeners = [];

  function read(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { CC.toast && CC.toast("No se pudo guardar en este navegador.", "error"); return false; }
  }
  function valid(id) { return !!CC.getItem(id); }

  var favs = (read(KEYS.fav, []) || []).map(Number).filter(valid);
  var cartRaw = read(KEYS.cart, {}) || {};
  var cart = {};
  Object.keys(cartRaw).forEach(function (k) {
    var q = Math.floor(Number(cartRaw[k]));
    if (valid(k) && q > 0) cart[k] = Math.min(q, 99);
  });

  /* source: "local" (lo hizo el usuario aquí) o "remote" (llegó de su cuenta en la nube); la sincronización solo sube lo local */
  function emit(source) { listeners.forEach(function (fn) { fn(source || "local"); }); }

  CC.store = {
    onChange: function (fn) { listeners.push(fn); },
    isFav: function (id) { return favs.indexOf(Number(id)) !== -1; },
    favs: function () { return favs.slice(); },
    favCount: function () { return favs.length; },
    toggleFav: function (id) {
      id = Number(id);
      var i = favs.indexOf(id);
      if (i === -1) favs.push(id); else favs.splice(i, 1);
      write(KEYS.fav, favs); emit();
      return i === -1;
    },
    cart: function () { return Object.assign({}, cart); },
    qty: function (id) { return cart[id] || 0; },
    cartCount: function () { return Object.keys(cart).reduce(function (a, k) { return a + cart[k]; }, 0); },
    add: function (id, n) {
      if (!valid(id)) return;
      cart[id] = Math.min((cart[id] || 0) + (n || 1), 99);
      write(KEYS.cart, cart); emit();
    },
    setQty: function (id, q) {
      q = Math.floor(Number(q));
      if (!(q > 0)) delete cart[id]; else cart[id] = Math.min(q, 99);
      write(KEYS.cart, cart); emit();
    },
    remove: function (id) { delete cart[id]; write(KEYS.cart, cart); emit(); },
    clear: function () { cart = {}; write(KEYS.cart, cart); emit(); },
    /* Reemplaza favoritos y carrito de una vez (al iniciar o cerrar sesión, o cuando cambian en otro dispositivo) */
    replaceAll: function (f, c, source) {
      favs = (f || []).map(Number).filter(valid).filter(function (id, i, a) { return a.indexOf(id) === i; });
      cart = {};
      Object.keys(c || {}).forEach(function (k) { var q = Math.floor(Number(c[k])); if (valid(k) && q > 0) cart[k] = Math.min(q, 99); });
      write(KEYS.fav, favs); write(KEYS.cart, cart); emit(source || "remote");
    },
    total: function () {
      return Object.keys(cart).reduce(function (a, k) { return a + CC.getItem(k).price * cart[k]; }, 0);
    }
  };
  // Sincroniza entre pestañas
  window.addEventListener("storage", function (e) {
    if (e.key === KEYS.fav) { favs = (read(KEYS.fav, []) || []).map(Number).filter(valid); emit("tab"); }
    if (e.key === KEYS.cart) { cart = read(KEYS.cart, {}) || {}; emit("tab"); }
  });
})(window.CC = window.CC || {});
