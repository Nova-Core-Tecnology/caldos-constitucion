/* Menú en vivo: el sitio muestra los platos guardados en la base de datos (colección "menu"),
   que el equipo edita desde el Panel Administrativo. No necesita iniciar sesión ni descargar el SDK:
   lee por la API REST pública de Firestore (lectura permitida por las reglas).

   - Usa al instante la última copia guardada en este navegador y la actualiza en segundo plano.
   - Si la base de datos no responde o aún está vacía, se usa el menú de data.js (respaldo).
   - Fotos subidas desde el panel: el plato guarda image = "fs:<id>:<versión>" y la foto vive en menuPhotos/<id>.
     Se descargan una vez y quedan guardadas en el navegador; mientras tanto se ve el fondo de marca. */
(function (CC) {
  "use strict";
  var cfg = CC.authConfig || {};
  var MENU_KEY = "cc_menu_v1", PHOTO_KEY = "cc_ph_";
  var BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  var CAT_ORDER = ["caldos", "mariscos", "antojos", "acompañantes", "entrantes", "bebidas", "postres"];

  function read(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function base() {
    return (CC.useEmulator ? "http://127.0.0.1:8080/v1/" : "https://firestore.googleapis.com/v1/") +
      "projects/" + (CC.useEmulator ? "demo-caldos" : cfg.projectId) + "/databases/(default)/documents/";
  }
  function keyParam(sep) { return CC.useEmulator ? "" : sep + "key=" + encodeURIComponent(cfg.apiKey); }

  /* Convierte los valores tipados de la API REST de Firestore en JSON normal */
  function val(v) {
    if (!v) return null;
    if ("stringValue" in v) return v.stringValue;
    if ("integerValue" in v) return Number(v.integerValue);
    if ("doubleValue" in v) return Number(v.doubleValue);
    if ("booleanValue" in v) return v.booleanValue;
    if ("nullValue" in v) return null;
    if ("timestampValue" in v) return v.timestampValue;
    if ("arrayValue" in v) return (v.arrayValue.values || []).map(val);
    if ("mapValue" in v) return obj(v.mapValue.fields || {});
    return null;
  }
  function obj(f) { var o = {}; Object.keys(f || {}).forEach(function (k) { o[k] = val(f[k]); }); return o; }
  CC.restValue = val; CC.restDoc = obj;

  function sortItems(a, b) {
    var ca = CAT_ORDER.indexOf(a.category), cb = CAT_ORDER.indexOf(b.category);
    if (ca !== cb) return (ca < 0 ? 99 : ca) - (cb < 0 ? 99 : cb);
    return (a.order || 0) - (b.order || 0) || a.id - b.id;
  }
  function apply(items) {
    if (!items || !items.length) return false;
    var clean = items.filter(function (i) { return i && typeof i.id === "number" && i.name && i.category; });
    if (!clean.length) return false;
    var active = clean.filter(function (i) { return i.active !== false; }).sort(sortItems);
    CC.menu = active;
    CC.menuAll = clean.slice().sort(sortItems);
    var feat = active.filter(function (i) { return i.featured; }).map(function (i) { return i.id; });
    if (feat.length) CC.featuredIds = feat;
    CC.menuSource = "db";
    return true;
  }

  /* ---------- fotos subidas desde el panel ---------- */
  var pending = {};
  function photoKey(id, v) { return PHOTO_KEY + id + "_" + v; }
  function swap(id, v, data) {
    var tag = "#fs-" + id + "-" + v;
    document.querySelectorAll('img[src$="' + tag + '"]').forEach(function (img) { img.src = data; });
  }
  function fetchPhoto(id, v) {
    var k = id + "_" + v; if (pending[k]) return pending[k];
    pending[k] = fetch(base() + "menuPhotos/" + encodeURIComponent(id) + keyParam("?"))
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (j) {
        var data = val(j.fields && j.fields.data);
        if (!data || data.indexOf("data:image/") !== 0) return null;
        if (!write(photoKey(id, v), data)) {
          /* Sin espacio: se liberan las fotos guardadas de versiones viejas y se reintenta */
          Object.keys(localStorage).forEach(function (x) { if (x.indexOf(PHOTO_KEY + id + "_") === 0 || x.indexOf(PHOTO_KEY) === 0) localStorage.removeItem(x); });
          write(photoKey(id, v), data);
        }
        swap(id, v, data);
        return data;
      })
      .catch(function () { return null; });
    return pending[k];
  }
  CC.photoSrc = function (spec) {
    var p = String(spec).split(":"), id = p[1], v = p[2] || "1";
    var cached = null; try { cached = localStorage.getItem(photoKey(id, v)); } catch (e) {}
    if (cached) return cached;
    fetchPhoto(id, v);
    return BLANK + "#fs-" + id + "-" + v;
  };
  function prefetch() {
    (CC.menu || []).forEach(function (it) {
      if (/^fs:/.test(it.image || "")) { var p = it.image.split(":"); try { if (!localStorage.getItem(photoKey(p[1], p[2] || "1"))) fetchPhoto(p[1], p[2] || "1"); } catch (e) {} }
    });
  }

  if (!cfg.projectId) { CC.menuReady = Promise.resolve(); return; }

  var cached = read(MENU_KEY);
  var hadCache = !!(cached && cached.items && apply(cached.items));
  var fresh = fetch(base() + "menu?pageSize=300" + keyParam("&"))
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (j) {
      var items = (j.documents || []).map(function (d) { var o = obj(d.fields); if (o.id == null) o.id = Number(d.name.split("/").pop()); return o; });
      if (items.length) {
        write(MENU_KEY, { at: Date.now(), items: items });
        /* Si la página aún no se ha pintado, usa la versión recién llegada (cambios del panel al momento) */
        if (!hadCache || !CC.booted) apply(items);
      } else if (hadCache) {
        /* La base de datos aún no tiene menú: vuelve al de data.js en la próxima carga */
        try { localStorage.removeItem(MENU_KEY); } catch (e) {}
      }
      return items;
    })
    .catch(function () { return null; });

  /* Con copia guardada se espera a la versión nueva como máximo 0,7 s; sin ella, 2,5 s */
  CC.menuReady = Promise.race([fresh, new Promise(function (r) { setTimeout(r, hadCache ? 700 : 2500); })]);
  CC.menuFresh = fresh;
  setTimeout(function () { CC.menuReady.then(prefetch); }, 1500);
})(window.CC = window.CC || {});
