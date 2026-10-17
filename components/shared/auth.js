/* Inicio de sesión con Google (Firebase Authentication) y cuenta del cliente en Firestore.
   - El SDK de Firebase solo se descarga cuando hace falta (alguien pulsa "Entrar" o ya había iniciado sesión antes),
     así las visitas sin cuenta siguen igual de ligeras.
   - Favoritos y carrito se guardan en users/{uid} y se sincronizan entre dispositivos en vivo.
   - Pedidos y reservas enviados quedan en users/{uid}/orders y users/{uid}/reservations (historial en "Mi cuenta").
   API pública: CC.auth.{configured, ready(), user(), profile(), onChange(fn), openLogin(), signIn(), signOut(),
   saveProfile(data), addOrder(o), addReservation(r), history(kind), deleteData()} */
(function (CC) {
  "use strict";
  var cfg = CC.authConfig || {};
  var configured = !!(cfg.apiKey && cfg.projectId);
  var SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  var HINT = "cc_auth_hint";
  var fb = null, auth = null, db = null, sdkPromise = null;
  var state = { ready: false, user: null, profile: {} }, listeners = [];
  var ref = null, unsub = null, applying = false, pushTimer = null, lastRemote = "";
  var readyResolve, readyPromise = new Promise(function (r) { readyResolve = r; });

  function emit() { if (state.ready) readyResolve(state.user); listeners.forEach(function (fn) { try { fn(state.user); } catch (e) {} }); }
  function hint(on) { try { if (on) localStorage.setItem(HINT, "1"); else localStorage.removeItem(HINT); } catch (e) {} }
  function hadSession() { try { return localStorage.getItem(HINT) === "1"; } catch (e) { return false; } }
  function served() { return /^https?:$/.test(location.protocol); }

  /* ---------- carga perezosa del SDK ---------- */
  function script(src) {
    return new Promise(function (ok, ko) {
      var s = document.createElement("script"); s.src = src; s.async = false;
      s.onload = ok; s.onerror = function () { ko(new Error("No se pudo cargar " + src)); };
      document.head.appendChild(s);
    });
  }
  function loadSdk() {
    if (sdkPromise) return sdkPromise;
    sdkPromise = script(SDK + "firebase-app-compat.js")
      .then(function () { return Promise.all([script(SDK + "firebase-auth-compat.js"), script(SDK + "firebase-firestore-compat.js")]); })
      .then(function () {
        fb = window.firebase;
        if (!fb.apps.length) fb.initializeApp(CC.useEmulator ? Object.assign({}, cfg, { projectId: "demo-caldos" }) : cfg);
        auth = fb.auth(); db = fb.firestore();
        /* Solo en pruebas locales (localStorage cc_emu = "1" en localhost): usa los emuladores de Firebase */
        if (CC.useEmulator) { auth.useEmulator("http://127.0.0.1:9099", { disableWarnings: true }); db.useEmulator("127.0.0.1", 8080); }
        auth.languageCode = "es";
        auth.getRedirectResult().catch(handleError);
        auth.onAuthStateChanged(onUser);
      });
    sdkPromise.catch(function () { sdkPromise = null; state.ready = true; emit(); readyResolve(null); });
    return sdkPromise;
  }

  /* ---------- sesión ---------- */
  function onUser(u) {
    stopSync();
    if (u) {
      state.user = { uid: u.uid, name: u.displayName || (u.email || "").split("@")[0], email: u.email || "", photo: u.photoURL || "" };
      hint(true); startSync();
    } else {
      state.user = null; state.profile = {}; hint(false);
    }
    state.ready = true; emit();
  }
  function handleError(e) {
    var c = e && e.code || "";
    if (/popup-closed-by-user|cancelled-popup-request/.test(c)) return;
    var msg = "No se pudo iniciar sesión. Inténtalo de nuevo.";
    if (/unauthorized-domain/.test(c)) msg = "Este dominio aún no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados).";
    else if (/network-request-failed/.test(c)) msg = "Sin conexión. Revisa tu internet e inténtalo de nuevo.";
    else if (/operation-not-allowed|configuration-not-found/.test(c)) msg = "El acceso con Google no está activado en Firebase (Authentication → Método de acceso → Google).";
    CC.toast && CC.toast(msg, "error");
    if (window.console) console.warn("[auth]", c, e && e.message);
  }

  function signIn() {
    if (!configured) { openLogin(); return Promise.resolve(); }
    if (!served()) { CC.toast("El inicio de sesión funciona en la web publicada o con un servidor local, no abriendo el archivo directamente.", "error"); return Promise.resolve(); }
    return loadSdk().then(function () {
      var p = new fb.auth.GoogleAuthProvider();
      p.setCustomParameters({ prompt: "select_account" });
      return auth.setPersistence(fb.auth.Auth.Persistence.LOCAL).then(function () {
        return auth.signInWithPopup(p).then(function (r) {
          closeLogin(); CC.toast("¡Hola, " + ((r.user && r.user.displayName) || "bienvenido") + "! Tu mesa ya está sincronizada.");
        }, function (e) {
          if (/popup-blocked|operation-not-supported-in-this-environment/.test(e && e.code || "")) return auth.signInWithRedirect(p);
          handleError(e);
        });
      });
    }).catch(handleError);
  }
  function signOut() {
    if (!auth) return Promise.resolve();
    return pushNow().catch(function () {}).then(function () { return auth.signOut(); }).then(function () {
      /* En un dispositivo compartido no queda nada de la cuenta: favoritos y carrito siguen guardados en la nube */
      CC.store.replaceAll([], {}, "remote");
      CC.toast("Cerraste sesión. Tu mesa queda guardada en tu cuenta.");
    });
  }

  /* ---------- sincronización de favoritos y carrito ---------- */
  function snapshotLocal() { return { favs: CC.store.favs(), cart: CC.store.cart() }; }
  function key(d) { return JSON.stringify([(d.favs || []).slice().sort(), Object.keys(d.cart || {}).sort().map(function (k) { return k + ":" + d.cart[k]; })]); }
  function merge(local, remote) {
    var favs = (remote.favs || []).slice();
    (local.favs || []).forEach(function (id) { if (favs.indexOf(id) < 0) favs.push(id); });
    var cart = Object.assign({}, remote.cart || {});
    Object.keys(local.cart || {}).forEach(function (k) { cart[k] = Math.max(cart[k] || 0, local.cart[k]); });
    return { favs: favs, cart: cart };
  }
  function startSync() {
    ref = db.collection("users").doc(state.user.uid);
    ref.get().then(function (doc) {
      var remote = doc.exists ? doc.data() : {};
      state.profile = remote.profile || {};
      var merged = merge(snapshotLocal(), remote);
      applying = true; CC.store.replaceAll(merged.favs, merged.cart, "remote"); applying = false;
      lastRemote = key(merged);
      var base = { name: state.user.name, email: state.user.email, photo: state.user.photo, favs: merged.favs, cart: merged.cart, updatedAt: fb.firestore.FieldValue.serverTimestamp() };
      if (!doc.exists) base.createdAt = fb.firestore.FieldValue.serverTimestamp();
      return ref.set(base, { merge: true });
    }).then(function () {
      emit();
      unsub = ref.onSnapshot(function (snap) {
        if (!snap.exists || snap.metadata.hasPendingWrites) return;
        var d = snap.data(); state.profile = d.profile || {};
        var k = key(d);
        if (k !== lastRemote && k !== key(snapshotLocal())) { lastRemote = k; applying = true; CC.store.replaceAll(d.favs, d.cart, "remote"); applying = false; }
        emit();
      }, function (e) { if (window.console) console.warn("[auth] sync", e && e.code); });
    }).catch(function (e) {
      if (window.console) console.warn("[auth] sync", e && e.code, e && e.message);
      if (/permission-denied/.test(e && e.code || "")) CC.toast("No se pudo sincronizar tu cuenta (revisa las reglas de Firestore).", "error");
    });
  }
  function stopSync() { if (unsub) { unsub(); unsub = null; } ref = null; clearTimeout(pushTimer); }
  function pushNow() {
    if (!ref) return Promise.resolve();
    var d = snapshotLocal(); lastRemote = key(d);
    return ref.set({ favs: d.favs, cart: d.cart, updatedAt: fb.firestore.FieldValue.serverTimestamp() }, { merge: true });
  }
  CC.store.onChange(function (source) {
    if (source === "remote" || applying || !ref) return;
    clearTimeout(pushTimer); pushTimer = setTimeout(function () { pushNow().catch(function () {}); }, 700);
  });

  /* ---------- perfil, historial y borrado ---------- */
  function saveProfile(data) {
    if (!ref) return Promise.reject(new Error("sin sesión"));
    var p = { phone: String(data.phone || "").slice(0, 30), address: String(data.address || "").slice(0, 200) };
    state.profile = p;
    return ref.set({ profile: p, updatedAt: fb.firestore.FieldValue.serverTimestamp() }, { merge: true });
  }
  function add(kind, data) {
    if (!ref) return Promise.resolve(null);
    data = Object.assign({}, data, { createdAt: fb.firestore.FieldValue.serverTimestamp() });
    return ref.collection(kind).add(data).catch(function (e) { if (window.console) console.warn("[auth] " + kind, e && e.code); });
  }
  function history(kind) {
    if (!ref) return Promise.resolve([]);
    return ref.collection(kind).orderBy("createdAt", "desc").limit(30).get().then(function (q) {
      return q.docs.map(function (d) { var x = d.data(); x.id = d.id; x.when = x.createdAt && x.createdAt.toDate ? x.createdAt.toDate() : null; return x; });
    });
  }
  function deleteData() {
    if (!ref) return Promise.resolve();
    var r = ref;
    return Promise.all(["orders", "reservations"].map(function (k) {
      return r.collection(k).get().then(function (q) { return Promise.all(q.docs.map(function (d) { return d.ref.delete(); })); });
    })).then(function () {
      /* Avisos dentro de la web */
      return db.collection("notifications").where("uid", "==", state.user.uid).get().then(function (q) { return Promise.all(q.docs.map(function (d) { return d.ref.delete(); })); }).catch(function () {});
    }).then(function () { return r.delete(); }).then(function () { stopSync(); return auth.signOut(); }).then(function () {
      CC.store.replaceAll([], {}, "remote");
    });
  }

  /* ---------- ventana de inicio de sesión ---------- */
  var G = '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>';
  CC.googleIcon = G;
  function leaf(sym, cls) { return '<svg class="jp jp--' + cls + '" aria-hidden="true" focusable="false"><use href="#' + sym + '"/></svg>'; }
  function ensureDialog() {
    var d = document.getElementById("lgn"); if (d) return d;
    d = document.createElement("dialog");
    d.id = "lgn"; d.className = "lgn"; d.setAttribute("aria-labelledby", "lgn-t");
    d.innerHTML =
      '<div class="lgn__jg jg-grow tone-vivid" aria-hidden="true">' + leaf("v-monstera", "mon lg-1") + leaf("v-palm", "palm lg-2") + leaf("v-fern", "fern lg-3") + leaf("v-palm", "palm lg-4") + "</div>" +
      '<button class="lgn__x" type="button" data-lgn="close" aria-label="Cerrar">' + CC.icon("close") + "</button>" +
      '<img class="lgn__logo" src="' + CC.base + 'assets/logo/logo.png" width="640" height="592" alt="">' +
      '<h2 id="lgn-t">Entra a <em>tu mesa</em></h2>' +
      '<p class="lgn__sub">Inicia sesión con tu cuenta de Google y lleva tus platos contigo.</p>' +
      '<ul class="lgn__list">' +
      "<li>" + CC.icon("heart") + "<span><b>Favoritos y carrito en todos tus dispositivos</b>Empieza en el celular y termina en la computadora.</span></li>" +
      "<li>" + CC.icon("clock") + "<span><b>Historial de pedidos y reservas</b>Repite tu pedido de siempre en un toque.</span></li>" +
      "<li>" + CC.icon("check") + "<span><b>Formularios ya rellenos</b>Tu nombre, teléfono y dirección listos para pedir.</span></li></ul>" +
      '<div class="lgn__act" id="lgn-act"></div>' +
      '<button class="lgn__guest" type="button" data-lgn="close">Seguir como invitado</button>' +
      '<p class="lgn__legal">Solo usamos tu nombre, correo y foto de Google para tu cuenta. No publicamos nada ni compartimos tus datos. Puedes borrar tu cuenta cuando quieras desde «Mi cuenta».</p>';
    document.body.appendChild(d);
    d.addEventListener("click", function (e) {
      if (e.target === d || e.target.closest("[data-lgn=close]")) { closeLogin(); return; }
      if (e.target.closest("[data-lgn=google]")) {
        var b = e.target.closest("[data-lgn=google]"); b.disabled = true; b.classList.add("is-busy");
        signIn().then(function () { b.disabled = false; b.classList.remove("is-busy"); });
      }
    });
    return d;
  }
  function openLogin() {
    var d = ensureDialog(), act = d.querySelector("#lgn-act");
    act.innerHTML = configured
      ? '<button class="lgn__google" type="button" data-lgn="google">' + G + "<span>Continuar con Google</span></button>"
      : '<div class="lgn__off">' + CC.icon("shield") + "<span><b>Muy pronto</b>El inicio de sesión con Google se está activando en este sitio. Mientras tanto, tus favoritos y tu carrito se guardan en este dispositivo.</span></div>";
    if (typeof d.showModal === "function") { if (!d.open) d.showModal(); } else d.setAttribute("open", "");
    requestAnimationFrame(function () { d.classList.add("is-open"); d.querySelector(".lgn__jg").classList.add("is-in"); });
    if (configured && served()) loadSdk().catch(function () {});
  }
  function closeLogin() {
    var d = document.getElementById("lgn"); if (!d || !d.open) return;
    d.classList.remove("is-open");
    setTimeout(function () { if (typeof d.close === "function") d.close(); else d.removeAttribute("open"); }, 200);
  }

  /* ---------- arranque ---------- */
  if (configured && served() && hadSession()) loadSdk().catch(function () {});
  else { state.ready = true; readyResolve(null); }

  CC.auth = {
    configured: configured,
    ready: function () { return state.ready; },
    user: function () { return state.user; },
    profile: function () { return state.profile || {}; },
    onChange: function (fn) { listeners.push(fn); },
    /* Promesa que se cumple cuando ya se sabe si hay sesión (con el usuario o null) */
    whenReady: function () { return readyPromise; },
    /* Acceso a Firebase para las páginas que leen o escriben datos (reservas, eventos, Mi cuenta) */
    fire: function () { return loadSdk().then(function () { return { fb: fb, auth: auth, db: db }; }); },
    refresh: emit,
    openLogin: openLogin, closeLogin: closeLogin, signIn: signIn, signOut: signOut,
    saveProfile: saveProfile,
    addOrder: function (o) { return add("orders", o); },
    addReservation: function (r) { return add("reservations", r); },
    history: history, deleteData: deleteData
  };
})(window.CC = window.CC || {});
