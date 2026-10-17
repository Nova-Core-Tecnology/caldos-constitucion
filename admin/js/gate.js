/* Acceso al panel: inicio de sesión del equipo, configuración inicial del propietario e invitaciones.
   - Ninguna contraseña está en el código: cada persona crea la suya y Firebase Authentication la guarda con hash (scrypt).
   - El propietario se activa UNA vez con su correo verificado + un código de configuración secreto que solo él recibe
     (su huella SHA-256 está en system/bootstrap, creado desde la consola de Firebase). El correo por sí solo no da acceso.
   - El servidor (firestore.rules) comprueba la identidad y los permisos en cada operación. */
(function (CC) {
  "use strict";
  var AD = window.AD, G = AD.gate = {};
  var body = function () { return AD.$("#gate-body"); };
  var GOOGLE = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.8 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';

  function show(html) { AD.$("#app").hidden = true; AD.$("#boot").hidden = true; AD.$("#gate").hidden = false; body().innerHTML = html; var i = body().querySelector("input"); if (i) i.focus(); }
  function alertBox(msg, kind) { return msg ? '<div class="alert alert--' + (kind || "err") + '" role="alert">' + AD.icon(kind === "ok" ? "check" : kind === "info" ? "info" : "alert") + "<span>" + msg + "</span></div>" : ""; }
  function authMsg(e) {
    var c = (e && e.code) || "";
    if (/wrong-password|invalid-credential|user-not-found|invalid-login/.test(c)) return "Correo o contraseña incorrectos.";
    if (/too-many-requests/.test(c)) return "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.";
    if (/email-already-in-use/.test(c)) return "Ese correo ya tiene una cuenta. Inicia sesión con su contraseña (o usa «¿Olvidaste tu contraseña?»).";
    if (/weak-password/.test(c)) return "La contraseña es demasiado débil.";
    if (/invalid-email/.test(c)) return "El correo no es válido.";
    if (/network/.test(c)) return "Sin conexión. Revisa tu internet.";
    if (/popup-closed|cancelled-popup/.test(c)) return "";
    if (/operation-not-allowed/.test(c)) return "Este método de acceso no está activado en Firebase.";
    return "No se pudo completar. Inténtalo de nuevo.";
  }
  function busy(btn, on, label) { btn.disabled = on; if (label) btn.innerHTML = on ? '<span class="spin"></span>' + label : label; }
  function strength(p) {
    var s = 0; if (p.length >= 10) s++; if (p.length >= 14) s++; if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  }
  function pwOk(p) { return p.length >= 10 && /[A-Za-z]/.test(p) && /\d/.test(p); }
  function pwFields() {
    return '<div class="f"><label for="g-pw">Crea tu contraseña</label><input id="g-pw" name="pw" type="password" autocomplete="new-password" minlength="10" required>' +
      '<div class="pwm"><i id="g-pwm"></i></div><small id="g-pwl">Mínimo 10 caracteres, con letras y números. No la compartas con nadie.</small></div>' +
      '<div class="f"><label for="g-pw2">Repite la contraseña</label><input id="g-pw2" name="pw2" type="password" autocomplete="new-password" required></div>';
  }
  function wirePw() {
    var i = AD.$("#g-pw"); if (!i) return;
    i.addEventListener("input", function () {
      var s = strength(i.value), m = AD.$("#g-pwm");
      m.style.width = (s * 20) + "%"; m.style.background = s >= 4 ? "#3f8a4f" : s >= 3 ? "#E8793A" : "#CC4125";
      AD.$("#g-pwl").textContent = !i.value ? "Mínimo 10 caracteres, con letras y números." : ["Muy débil", "Muy débil", "Débil", "Aceptable", "Fuerte", "Muy fuerte"][s];
    });
  }

  /* ---------- inicio de sesión ---------- */
  G.login = function (msg, kind) {
    show('<h2>Iniciar sesión</h2><p>Acceso solo para el equipo del restaurante.</p>' + alertBox(msg, kind) +
      '<form id="g-f" novalidate><div class="f"><label for="g-email">Correo</label><input id="g-email" type="email" autocomplete="username" required></div>' +
      '<div class="f"><label for="g-pass">Contraseña</label><input id="g-pass" type="password" autocomplete="current-password" required></div>' +
      '<button class="b b--p b--lg b--block" type="submit" id="g-go">Entrar</button></form>' +
      '<div class="gate__or">o</div><button type="button" class="gbtn" id="g-google">' + GOOGLE + "Entrar con Google</button>" +
      '<div class="gate__alt"><button type="button" id="g-forgot">¿Olvidaste tu contraseña?</button><button type="button" id="g-setup">Configuración inicial</button></div>');
    AD.$("#g-f").addEventListener("submit", function (e) {
      e.preventDefault();
      var em = AD.$("#g-email").value.trim(), pw = AD.$("#g-pass").value, b = AD.$("#g-go");
      if (!em || !pw) { G.login("Escribe tu correo y tu contraseña."); return; }
      busy(b, true, "Entrando…");
      AD.auth.signInWithEmailAndPassword(em, pw).catch(function (er) { busy(b, false, "Entrar"); var m = authMsg(er); if (m) G.login(m); AD.$("#g-email").value = em; });
    });
    AD.$("#g-google").onclick = function () {
      var p = new AD.fb.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
      AD.auth.signInWithPopup(p).catch(function (er) { var m = authMsg(er); if (m) G.login(m); });
    };
    AD.$("#g-forgot").onclick = G.forgot;
    AD.$("#g-setup").onclick = function () { G.setup(); };
  };
  G.forgot = function () {
    show('<h2>Recuperar contraseña</h2><p>Te enviaremos un enlace para crear una contraseña nueva.</p>' +
      '<form id="g-f" novalidate><div class="f"><label for="g-email">Correo</label><input id="g-email" type="email" autocomplete="username" required></div>' +
      '<button class="b b--p b--lg b--block" type="submit" id="g-go">Enviar enlace</button></form><div class="gate__alt"><button type="button" id="g-back">← Volver</button></div>');
    AD.$("#g-back").onclick = function () { G.login(); };
    AD.$("#g-f").addEventListener("submit", function (e) {
      e.preventDefault();
      var em = AD.$("#g-email").value.trim(), b = AD.$("#g-go"); if (!em) return;
      busy(b, true, "Enviando…");
      AD.auth.sendPasswordResetEmail(em).then(ok, function (er) { if (/user-not-found/.test(er.code || "")) ok(); else { busy(b, false, "Enviar enlace"); AD.toast(authMsg(er), "error"); } });
      /* Mismo mensaje exista o no la cuenta (no revela qué correos están registrados) */
      function ok() { G.login("Si ese correo tiene una cuenta, recibirás un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.", "ok"); }
    });
  };

  /* ---------- configuración inicial (propietario) e invitaciones ---------- */
  G.setup = function (mode) {
    mode = mode || "owner";
    var u = AD.auth.currentUser;
    if (u && !u.isAnonymous) { G.afterAccount(mode); return; }
    show('<ol class="steps"><li class="on"></li><li></li><li></li></ol>' +
      "<h2>" + (mode === "owner" ? "Configuración inicial" : "Aceptar invitación") + "</h2>" +
      "<p>" + (mode === "owner" ? "Para el propietario del restaurante. Paso 1: crea tu acceso con tu correo y una contraseña que solo tú conozcas." : "Crea tu acceso con el correo al que te llegó la invitación.") + "</p>" +
      '<form id="g-f" novalidate><div class="f"><label for="g-email">Tu correo</label><input id="g-email" name="email" type="email" autocomplete="username" required></div>' + pwFields() +
      '<button class="b b--p b--lg b--block" type="submit" id="g-go">Crear acceso</button></form>' +
      '<div class="gate__or">o</div><button type="button" class="gbtn" id="g-google">' + GOOGLE + "Usar mi cuenta de Google</button>" +
      '<div class="gate__alt"><button type="button" id="g-back">← Ya tengo acceso</button>' + (mode === "owner" ? '<button type="button" id="g-inv">Tengo una invitación</button>' : '<button type="button" id="g-own">Soy el propietario</button>') + "</div>");
    wirePw();
    AD.$("#g-back").onclick = function () { G.login(); };
    var sw = AD.$("#g-inv") || AD.$("#g-own"); sw.onclick = function () { G.setup(mode === "owner" ? "invite" : "owner"); };
    AD.$("#g-google").onclick = function () {
      G.pending = mode;
      var p = new AD.fb.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
      AD.auth.signInWithPopup(p).catch(function (er) { var m = authMsg(er); if (m) AD.toast(m, "error"); });
    };
    AD.$("#g-f").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = AD.$("#g-f"), em = AD.$("#g-email").value.trim(), pw = AD.$("#g-pw").value, pw2 = AD.$("#g-pw2").value, ok = true;
      ok = AD.fieldErr(f, "email", /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em) ? "" : "Escribe un correo válido.") && ok;
      ok = AD.fieldErr(f, "pw", pwOk(pw) ? "" : "Usa al menos 10 caracteres, con letras y números.") && ok;
      ok = AD.fieldErr(f, "pw2", pw === pw2 ? "" : "Las contraseñas no coinciden.") && ok;
      if (!ok) return;
      var b = AD.$("#g-go"); busy(b, true, "Creando…");
      G.pending = mode;
      AD.auth.createUserWithEmailAndPassword(em, pw).then(function (c) {
        return c.user.sendEmailVerification().catch(function () {});
      }).catch(function (er) { busy(b, false, "Crear acceso"); G.pending = null; AD.toast(authMsg(er), "error"); });
    });
  };
  /* Con sesión iniciada pero sin acceso al panel todavía */
  G.afterAccount = function (mode) {
    var u = AD.auth.currentUser;
    if (!u) { G.login(); return; }
    if (!u.emailVerified) { G.verify(mode); return; }
    if (mode === "invite") { G.invite(); return; }
    G.claim();
  };
  G.verify = function (mode) {
    var u = AD.auth.currentUser;
    show('<ol class="steps"><li class="on"></li><li class="on"></li><li></li></ol><h2>Confirma tu correo</h2>' +
      "<p>Enviamos un enlace a <b>" + AD.esc(u.email) + "</b>. Ábrelo para confirmar que el correo es tuyo y luego pulsa «Ya lo confirmé».</p>" +
      '<button class="b b--p b--lg b--block" id="g-ok">Ya lo confirmé</button>' +
      '<div class="gate__alt"><button type="button" id="g-re">Reenviar el correo</button><button type="button" id="g-out">Salir</button></div>');
    AD.$("#g-ok").onclick = function () {
      var b = this; busy(b, true, "Comprobando…");
      u.reload().then(function () { return u.getIdToken(true); }).then(function () {
        if (AD.auth.currentUser.emailVerified) G.afterAccount(mode);
        else { busy(b, false, "Ya lo confirmé"); AD.toast("Todavía no aparece confirmado. Abre el enlace del correo (revisa spam).", "error"); }
      }).catch(function () { busy(b, false, "Ya lo confirmé"); AD.toast("No se pudo comprobar. Inténtalo de nuevo.", "error"); });
    };
    AD.$("#g-re").onclick = function () { u.sendEmailVerification().then(function () { AD.toast("Correo reenviado."); }, function (er) { AD.toast(authMsg(er), "error"); }); };
    AD.$("#g-out").onclick = function () { AD.auth.signOut(); };
  };
  G.claim = function () {
    var u = AD.auth.currentUser;
    show('<ol class="steps"><li class="on"></li><li class="on"></li><li class="on"></li></ol><h2>Código de configuración</h2>' +
      "<p>Escribe el código de configuración inicial que recibiste en privado. Solo funciona una vez y solo con el correo del propietario.</p>" +
      '<form id="g-f" novalidate><div class="f"><label for="g-code">Código</label><input id="g-code" name="code" autocomplete="one-time-code" spellcheck="false" autocapitalize="characters" required></div>' +
      '<div class="f"><label for="g-name">Tu nombre</label><input id="g-name" name="name" maxlength="80" value="' + AD.esc(u.displayName || "") + '" required></div>' +
      '<button class="b b--p b--lg b--block" type="submit" id="g-go">Activar cuenta de propietario</button></form>' +
      '<div class="gate__alt"><button type="button" id="g-out">Salir</button></div>');
    AD.$("#g-out").onclick = function () { AD.auth.signOut(); };
    AD.$("#g-f").addEventListener("submit", function (e) {
      e.preventDefault();
      var code = AD.$("#g-code").value.trim().toUpperCase().replace(/\s+/g, ""), name = AD.$("#g-name").value.trim(), b = AD.$("#g-go");
      if (code.length < 8 || name.length < 2) { AD.toast("Escribe el código y tu nombre.", "error"); return; }
      busy(b, true, "Activando…");
      var perms = {}; AD.PERMS.forEach(function (p) { perms[p.k] = true; });
      var batch = AD.db.batch();
      batch.set(AD.db.doc("system/owner"), { uid: u.uid, code: code, at: AD.ts() });
      batch.set(AD.db.collection("admins").doc(u.uid), { role: "owner", active: true, email: (u.email || "").toLowerCase(), name: name.slice(0, 80), perms: perms, createdAt: AD.ts(), lastLogin: AD.ts() });
      batch.commit().then(function () {
        AD.db.collection("auditLog").add({ at: AD.ts(), uid: u.uid, who: name, role: "owner", action: "owner.claim", target: "admins/" + u.uid, detail: "Configuración inicial completada" }).catch(function () {});
        AD.toast("¡Cuenta de propietario activada!");
        G.enter(u);
      }, function () {
        busy(b, false, "Activar cuenta de propietario");
        /* Mismo mensaje para cualquier fallo: no revela si el código, el correo o el estado eran el problema */
        AD.toast("No se pudo activar. Revisa el código y que estés usando el correo del propietario. Si ya se configuró antes, inicia sesión normalmente.", "error");
      });
    });
  };
  G.invite = function () {
    var u = AD.auth.currentUser, email = (u.email || "").toLowerCase();
    AD.db.collection("invites").doc(email).get().then(function (d) {
      if (!d.exists) { G.noAccess("No encontramos una invitación para " + AD.esc(email) + ". Pide al propietario que te invite con este correo."); return; }
      var inv = d.data();
      show('<ol class="steps"><li class="on"></li><li class="on"></li><li class="on"></li></ol><h2>Tienes una invitación</h2>' +
        "<p>Te invitaron como <b>" + AD.esc(AD.ROLES[inv.role] || inv.role) + "</b> con acceso a: " + AD.PERMS.filter(function (p) { return inv.perms && inv.perms[p.k]; }).map(function (p) { return p.l; }).join(", ") + ".</p>" +
        '<div class="f"><label for="g-name">Tu nombre</label><input id="g-name" maxlength="80" value="' + AD.esc(inv.name || u.displayName || "") + '"></div>' +
        '<button class="b b--p b--lg b--block" id="g-go">Aceptar invitación</button><div class="gate__alt"><button type="button" id="g-out">Salir</button></div>');
      AD.$("#g-out").onclick = function () { AD.auth.signOut(); };
      AD.$("#g-go").onclick = function () {
        var b = this, name = AD.$("#g-name").value.trim() || email.split("@")[0];
        busy(b, true, "Aceptando…");
        var batch = AD.db.batch();
        batch.set(AD.db.collection("admins").doc(u.uid), { role: inv.role, perms: inv.perms, active: true, email: email, name: name.slice(0, 80), invitedBy: inv.by || "", createdAt: AD.ts(), lastLogin: AD.ts() });
        batch.delete(AD.db.collection("invites").doc(email));
        batch.commit().then(function () {
          AD.db.collection("auditLog").add({ at: AD.ts(), uid: u.uid, who: name, role: inv.role, action: "team.join", target: "admins/" + u.uid, detail: email }).catch(function () {});
          G.enter(u);
        }, function (er) { busy(b, false, "Aceptar invitación"); AD.logError("gate.invite", er); AD.toast("No se pudo aceptar la invitación.", "error"); });
      };
    }, function () { G.noAccess("No se pudo comprobar la invitación."); });
  };
  G.noAccess = function (msg) {
    var u = AD.auth.currentUser;
    show("<h2>Sin acceso al panel</h2>" + alertBox(msg || "La cuenta <b>" + AD.esc(u && u.email) + "</b> no tiene acceso al Panel Administrativo.", "info") +
      '<div class="acts"><button class="b b--p" id="g-inv">Tengo una invitación</button><button class="b" id="g-own">Soy el propietario</button><button class="b b--ghost" id="g-out">Salir</button></div>');
    AD.$("#g-out").onclick = function () { AD.auth.signOut(); };
    AD.$("#g-inv").onclick = function () { G.afterAccount("invite"); };
    AD.$("#g-own").onclick = function () { G.afterAccount("owner"); };
  };

  /* ---------- sesión ---------- */
  G.check = function (u) {
    if (!u) { if (G.pending) return; G.login(); return; }
    AD.db.collection("admins").doc(u.uid).get().then(function (d) {
      if (d.exists && d.data().active) { G.enter(u, d.data()); return; }
      if (d.exists) { G.noAccess("Tu acceso al panel está desactivado. Habla con el propietario."); return; }
      var mode = G.pending; G.pending = null;
      if (mode) { G.afterAccount(mode); return; }
      G.noAccess();
    }, function (e) { AD.logError("gate.check", e); G.login("No se pudo comprobar tu acceso. Revisa tu conexión."); });
  };
  G.enter = function (u, data) {
    var load = data ? Promise.resolve(data) : AD.db.collection("admins").doc(u.uid).get().then(function (d) { return d.data(); });
    load.then(function (a) {
      AD.me = Object.assign({ uid: u.uid }, a);
      G.pending = null;
      AD.db.collection("admins").doc(u.uid).update({ lastLogin: AD.ts() }).catch(function () {});
      if (!G.entered) AD.audit("login", "admins/" + u.uid, "");
      G.entered = true;
      AD.start();
    });
  };
  /* Cierre automático tras 45 minutos sin actividad */
  var idle;
  G.idle = function () {
    clearTimeout(idle);
    if (!AD.me) return;
    idle = setTimeout(function () { AD.toast("Sesión cerrada por inactividad."); AD.auth.signOut(); }, 45 * 60000);
  };
  ["pointerdown", "keydown", "scroll"].forEach(function (ev) { window.addEventListener(ev, AD.debounce(G.idle, 1000), { passive: true }); });
})(window.CC = window.CC || {});
