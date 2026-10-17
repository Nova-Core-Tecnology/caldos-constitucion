(function (CC) {
  "use strict";
  CC.page = function () {
    var $ = function (id) { return document.getElementById(id); };
    var wrap = $("cart"), list = $("clist"), empty = $("cempty"), note = $("note"), noteC = $("note-c"),
        mbar = $("mbar"), sum = $("sum"), undo = $("undo"), dlg = $("cdlg"), more = $("more"), moreRow = $("more-row");
    var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var NOTE_KEY = "cc_cart_note", DET_KEY = "cc_cart_details", MAX_QTY = 99;
    var MODES = { recoger: "Para recoger", domicilio: "A domicilio", mesa: "Comer aquí" };
    var CAT_RGB = { caldos: "232, 121, 58", mariscos: "196, 140, 80", antojos: "229, 83, 58", bebidas: "230, 160, 10", postres: "214, 108, 90", "acompañantes": "176, 130, 70", entrantes: "200, 110, 60" };
    var shown = { total: 0, count: 0 }, firstRender = true, interacted = false;
    var undoTimer = null, emptyTimer = null, lastRemoved = null, sumVisible = true;

    document.querySelectorAll("[data-ic]").forEach(function (s) { s.innerHTML = CC.icon(s.getAttribute("data-ic")); });

    /* ---------- utilidades ---------- */
    function pop(el, cls) { if (reduce || !el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
    function tween(el, from, to, fmt) {
      if (el._raf) cancelAnimationFrame(el._raf);
      if (reduce || from === to) { el.textContent = fmt(to); return; }
      var t0 = performance.now(), dur = 450, ints = Number.isInteger(from) && Number.isInteger(to);
      (function step(t) {
        var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3), v = from + (to - from) * e;
        if (ints) v = Math.round(v);
        el.textContent = fmt(p === 1 ? to : v);
        if (p < 1) el._raf = requestAnimationFrame(step);
      })(t0);
    }
    function plural(n) { return n + (n === 1 ? " plato" : " platos"); }
    function rgb(cat) { return CAT_RGB[cat] || "232, 121, 58"; }
    function price(it) { return (it.priceNote ? "desde " : "") + CC.money(it.price); }
    function load(key, fb) { try { var v = localStorage.getItem(key); return v ? (key === NOTE_KEY ? v : JSON.parse(v)) : fb; } catch (e) { return fb; } }
    function save(key, v) { try { if (v && (typeof v === "string" ? v : Object.keys(v).length)) localStorage.setItem(key, typeof v === "string" ? v : JSON.stringify(v)); else localStorage.removeItem(key); } catch (e) {} }

    /* ---------- detalles del pedido (modalidad, nombre, hora, dirección y nota) ---------- */
    var det = load(DET_KEY, {}) || {};
    var nameIn = $("o-name"), timeIn = $("o-time"), addrIn = $("o-addr"), addrF = $("addr-f");
    function mode() { var r = document.querySelector('input[name="mode"]:checked'); return r ? r.value : "recoger"; }
    function readDetails() {
      det = { mode: mode(), name: nameIn.value.trim(), time: timeIn.value, addr: addrIn.value.trim() };
      save(DET_KEY, det);
    }
    function paintDetails() {
      addrF.hidden = mode() !== "domicilio";
      $("r-meta").textContent = MODES[mode()] + " · " + (timeIn.value ? "a las " + timeIn.value : "lo antes posible");
    }
    (function restore() {
      var r = document.querySelector('input[name="mode"][value="' + (det.mode || "recoger") + '"]'); if (r) r.checked = true;
      nameIn.value = det.name || ""; timeIn.value = det.time || ""; addrIn.value = det.addr || "";
      note.value = load(NOTE_KEY, "") || "";
    })();
    function onDetail() { readDetails(); paintDetails(); updateLinks(); }
    document.querySelectorAll('input[name="mode"]').forEach(function (r) { r.addEventListener("change", onDetail); });
    [nameIn, timeIn, addrIn].forEach(function (i) { i.addEventListener("input", onDetail); });
    function counter() { noteC.textContent = note.value.length + "/200"; }
    note.addEventListener("input", function () { counter(); save(NOTE_KEY, note.value.trim()); updateLinks(); });

    /* ---------- mensaje de WhatsApp ---------- */
    function orderText() {
      var cart = CC.store.cart();
      var lines = Object.keys(cart).filter(function (id) { return CC.getItem(id); }).map(function (id) {
        var it = CC.getItem(id); return "• " + cart[id] + " x " + it.name + " — " + CC.money(it.price * cart[id]) + (it.priceNote ? " (desde)" : "");
      });
      var out = ["Hola, quisiera hacer este pedido en Caldos Constitución:", ""].concat(lines);
      out.push("", "Total estimado: " + CC.money(CC.store.total()), "Modalidad: " + MODES[mode()]);
      if (nameIn.value.trim()) out.push("A nombre de: " + nameIn.value.trim());
      out.push("Hora: " + (timeIn.value ? timeIn.value : "lo antes posible"));
      if (mode() === "domicilio" && addrIn.value.trim()) out.push("Dirección: " + addrIn.value.trim());
      if (note.value.trim()) out.push("Nota: " + note.value.trim());
      out.push("", "Por favor confirmen disponibilidad, precio final y entrega. ¡Gracias!");
      return out.join("\n");
    }
    function updateLinks() {
      $("wa").href = CC.waLink(orderText());
      /* reparto del pago según la modalidad: 100 % para recoger, 50 % a domicilio o para comer aquí */
      if (CC.orders) { var sp = CC.orders.split(CC.store.total(), mode()); $("r-split").innerHTML = "Pagas ahora <b>" + CC.money(sp.now) + "</b>" + (sp.later ? " · " + (mode() === "mesa" ? "en el local" : "al recibir") + " " + CC.money(sp.later) : " (100 %)"); }
    }

    /* ---------- líneas ---------- */
    function lineHTML(it, q) {
      var n = CC.esc(it.name), fav = CC.store.isFav(it.id);
      return '<div class="line__img"><img src="' + CC.imgSrc(it.image) + '" alt="' + n + '" loading="lazy" data-fallback></div>' +
        '<div class="line__info"><span class="line__cat">' + CC.esc(CC.categoryLabel(it.category)) + "</span>" +
        "<h3>" + n + "</h3>" + (it.description ? '<p class="line__desc">' + CC.esc(it.description) + "</p>" : "") +
        '<span class="line__unit">' + (it.priceNote ? "Desde " : "") + CC.money(it.price) + " c/u</span>" +
        '<div class="line__acts"><button type="button" class="line__fav" data-a="fav" aria-pressed="' + fav + '" aria-label="' + (fav ? "Quitar " + n + " de favoritos" : "Guardar " + n + " en favoritos") + '">' + CC.icon("heart") + '<span>' + (fav ? "En favoritos" : "Favorito") + "</span></button>" +
        '<button type="button" class="line__rm" data-a="rm" aria-label="Eliminar ' + n + ' del carrito">' + CC.icon("trash") + "<span>Eliminar</span></button></div></div>" +
        '<div class="line__end"><div class="stepper" role="group" aria-label="Cantidad de ' + n + '">' +
        '<button type="button" data-a="dec" aria-label="Quitar una unidad de ' + n + '">' + CC.icon("minus") + "</button>" +
        '<output class="stepper__n" aria-live="polite">' + q + "</output>" +
        '<button type="button" data-a="inc" aria-label="Añadir una unidad de ' + n + '">' + CC.icon("plus") + "</button></div>" +
        '<span class="line__sub">' + CC.money(it.price * q) + "</span></div>";
    }
    function buildLine(it, q) {
      var li = document.createElement("li");
      li.className = "line" + (firstRender ? "" : " is-new");
      li.dataset.id = it.id; li.style.setProperty("--kr", rgb(it.category));
      li.innerHTML = lineHTML(it, q); li._q = q;
      return li;
    }
    function updateLine(li, it, q) {
      var fav = CC.store.isFav(it.id), fb = li.querySelector(".line__fav");
      if (fb && fb.getAttribute("aria-pressed") !== String(fav)) {
        fb.setAttribute("aria-pressed", fav);
        fb.setAttribute("aria-label", (fav ? "Quitar " : "Guardar ") + it.name + (fav ? " de favoritos" : " en favoritos"));
        fb.querySelector("span").textContent = fav ? "En favoritos" : "Favorito";
      }
      if (li._q === q) return;
      li._q = q;
      var o = li.querySelector("output"); o.textContent = q; pop(o, "is-bump");
      var sub = li.querySelector(".line__sub"); sub.textContent = CC.money(it.price * q); pop(sub, "is-bump");
    }
    function leaveLine(li) {
      li.classList.add("is-leaving");
      setTimeout(function () { if (li.parentNode) li.parentNode.removeChild(li); }, reduce ? 0 : 340);
    }

    /* ---------- comanda ---------- */
    function receipt(cart, ids) {
      $("r-lines").innerHTML = ids.map(function (id) {
        var it = CC.getItem(id);
        return '<li><span class="rq">' + cart[id] + "×</span><span class=\"rn\">" + CC.esc(it.name) + '</span><i aria-hidden="true"></i><span class="ra">' + CC.money(it.price * cart[id]) + "</span></li>";
      }).join("");
    }

    /* ---------- sugerencias: lo que combina con lo que llevas ---------- */
    var PAIR = { caldos: ["acompañantes", "bebidas"], mariscos: ["acompañantes", "bebidas"], antojos: ["bebidas", "acompañantes"], entrantes: ["bebidas"], "acompañantes": ["bebidas"], bebidas: ["postres", "antojos"], postres: ["bebidas"] };
    function suggestions(ids) {
      var cats = [];
      ids.forEach(function (id) { (PAIR[CC.getItem(id).category] || []).forEach(function (c) { if (cats.indexOf(c) < 0) cats.push(c); }); });
      ["bebidas", "acompañantes", "postres"].forEach(function (c) { if (cats.indexOf(c) < 0) cats.push(c); });
      var feat = CC.featuredIds || [], out = [];
      cats.forEach(function (c) {
        CC.menu.filter(function (m) { return m.category === c && ids.indexOf(String(m.id)) < 0; })
          .sort(function (a, b) { return (feat.indexOf(b.id) > -1) - (feat.indexOf(a.id) > -1); })
          .forEach(function (m) { if (out.length < 10 && out.indexOf(m) < 0) out.push(m); });
      });
      return out;
    }
    function paintMore(ids) {
      var list = suggestions(ids);
      more.hidden = !list.length;
      var key = list.map(function (m) { return m.id; }).join(",");
      if (moreRow._key === key) return;
      moreRow._key = key;
      moreRow.innerHTML = list.map(function (m) {
        var n = CC.esc(m.name);
        return '<li class="sug" style="--kr:' + rgb(m.category) + '"><button type="button" class="sug__img" data-sug="details" data-id="' + m.id + '" aria-label="Ver detalles de ' + n + '"><img src="' + CC.imgSrc(m.image) + '" alt="" loading="lazy" decoding="async" data-fallback></button>' +
          '<span class="sug__cat">' + CC.esc(CC.categoryLabel(m.category)) + '</span><b class="sug__n">' + n + '</b><span class="sug__row"><span class="sug__p">' + price(m) + "</span>" +
          '<button type="button" class="sug__add" data-sug="add" data-id="' + m.id + '" aria-label="Añadir ' + n + ' al pedido">' + CC.icon("plus") + "</button></span></li>";
      }).join("");
    }
    moreRow.addEventListener("click", function (e) {
      var b = e.target.closest("[data-sug]"); if (!b) return;
      var id = Number(b.dataset.id), it = CC.getItem(id); if (!it) return;
      interacted = true;
      if (b.dataset.sug === "details") { CC.openDish(id, b); return; }
      CC.flyToCart(b); CC.store.add(id, 1); CC.toast(it.name + " añadido a tu mesa");
    });
    moreRow.addEventListener("error", function (e) { if (e.target.tagName === "IMG") e.target.parentNode.classList.add("img-missing"); }, true);
    function scrollMore(dir) { moreRow.scrollBy({ left: dir * Math.max(220, moreRow.clientWidth * .8), behavior: reduce ? "auto" : "smooth" }); }
    $("more-prev").addEventListener("click", function () { scrollMore(-1); });
    $("more-next").addEventListener("click", function () { scrollMore(1); });

    /* ---------- pasos del hero ---------- */
    function flow(count) {
      document.querySelectorAll(".flow__i").forEach(function (li) {
        var s = Number(li.dataset.step), done = count > 0 && s === 1, now = count > 0 ? s === 2 : s === 1;
        li.classList.toggle("is-done", done); li.classList.toggle("is-now", now);
        if (now) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
      });
      var ks = $("kh-sum");
      ks.hidden = !count;
      if (count) ks.innerHTML = CC.icon("cart") + "<span><b>" + plural(count) + "</b> en tu mesa · " + CC.money(CC.store.total()) + "</span>";
    }

    /* ---------- vacío: favoritos de la casa para empezar ---------- */
    var emptyGrid = $("cempty-grid"), emptyBuilt = false;
    function paintEmpty() {
      var favs = CC.store.favs(), fb = $("cempty-fav");
      fb.hidden = !favs.length;
      if (favs.length) fb.innerHTML = CC.icon("heart") + "Añadir mis " + favs.length + (favs.length === 1 ? " favorito" : " favoritos");
      if (emptyBuilt) return;
      emptyBuilt = true;
      var ids = (CC.featuredIds || []).slice(0, 3);
      emptyGrid.innerHTML = ids.map(function (id) { var it = CC.getItem(id); return it ? CC.dishCard(it) : ""; }).join("");
      CC.reveal(emptyGrid);
    }
    CC.bindDishes(emptyGrid);
    $("cempty-fav").addEventListener("click", function () {
      var favs = CC.store.favs(); interacted = true;
      favs.forEach(function (id) { CC.store.add(id, 1); });
      CC.toast(plural(favs.length) + " añadidos a tu mesa");
    });

    /* ---------- render ---------- */
    function render() {
      var cart = CC.store.cart();
      var ids = Object.keys(cart).filter(function (id) { return !!CC.getItem(id); });
      flow(ids.length ? CC.store.cartCount() : 0);

      if (!ids.length) {
        clearTimeout(emptyTimer);
        var hadLines = list.children.length > 0;
        Array.prototype.forEach.call(list.children, function (li) { if (!li.classList.contains("is-leaving")) leaveLine(li); });
        emptyTimer = setTimeout(function () {
          if (Object.keys(CC.store.cart()).length) return;
          wrap.hidden = true; empty.hidden = false; list.innerHTML = "";
          mbar.classList.remove("is-on"); paintEmpty();
          if (interacted) $("cempty-t").focus({ preventScroll: true });
        }, hadLines && !reduce ? 320 : 0);
        return;
      }

      clearTimeout(emptyTimer);
      wrap.hidden = false; empty.hidden = true;

      var nodes = {};
      Array.prototype.forEach.call(list.children, function (li) { if (!li.classList.contains("is-leaving")) nodes[li.dataset.id] = li; });
      Object.keys(nodes).forEach(function (id) { if (ids.indexOf(id) < 0) leaveLine(nodes[id]); });
      ids.forEach(function (id) {
        var it = CC.getItem(id), q = cart[id];
        if (nodes[id]) updateLine(nodes[id], it, q); else list.appendChild(buildLine(it, q));
      });

      var count = CC.store.cartCount(), total = CC.store.total();
      tween($("s-count"), shown.count, count, String);
      tween($("s-total"), shown.total, total, CC.money);
      tween($("m-total"), shown.total, total, CC.money);
      $("m-count").textContent = plural(count);
      if (shown.count !== count) pop($("h-count"), "is-pop");
      $("h-count").textContent = count;
      shown.count = count; shown.total = total;
      $("s-hint").hidden = !ids.some(function (id) { return CC.getItem(id).priceNote; });
      receipt(cart, ids); paintMore(ids); paintDetails(); updateLinks(); syncBar();
      firstRender = false;
    }

    /* ---------- barra móvil: aparece cuando la comanda sale de vista ---------- */
    function syncBar() { mbar.classList.toggle("is-on", !wrap.hidden && !sumVisible && window.matchMedia("(max-width: 960px)").matches); }
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { sumVisible = en[0].isIntersecting; syncBar(); }, { threshold: 0.12 }).observe(sum);
    window.addEventListener("resize", syncBar);

    /* ---------- deshacer ---------- */
    function showUndo(msg, items) {
      lastRemoved = items;
      $("undo-t").textContent = msg;
      undo.hidden = false;
      requestAnimationFrame(function () { undo.classList.add("is-in"); });
      clearTimeout(undoTimer); undoTimer = setTimeout(hideUndo, 7000);
    }
    function hideUndo() { undo.classList.remove("is-in"); setTimeout(function () { if (!undo.classList.contains("is-in")) undo.hidden = true; }, 300); }
    $("undo-b").addEventListener("click", function () {
      var items = lastRemoved; lastRemoved = null;
      clearTimeout(undoTimer); hideUndo();
      if (!items) return;
      items.forEach(function (r) { CC.store.setQty(r.id, r.q); });
      CC.toast("Pedido restaurado");
    });

    /* ---------- acciones en la lista ---------- */
    list.addEventListener("click", function (e) {
      var b = e.target.closest("[data-a]"); if (!b) return;
      var li = b.closest("[data-id]"), id = li.dataset.id, q = CC.store.qty(id), it = CC.getItem(id), a = b.dataset.a;
      interacted = true;
      if (a === "inc") {
        if (q >= MAX_QTY) { CC.toast("Máximo " + MAX_QTY + " por plato"); return; }
        CC.store.setQty(id, q + 1);
      } else if (a === "dec" && q > 1) {
        CC.store.setQty(id, q - 1);
      } else if (a === "fav") {
        var on = CC.store.toggleFav(id);
        CC.toast(on ? it.name + " guardado en favoritos" : it.name + " quitado de favoritos");
      } else {
        var sib = li.nextElementSibling; while (sib && sib.classList.contains("is-leaving")) sib = sib.nextElementSibling;
        if (!sib) { sib = li.previousElementSibling; while (sib && sib.classList.contains("is-leaving")) sib = sib.previousElementSibling; }
        CC.store.remove(id);
        showUndo(it.name + " eliminado del pedido", [{ id: id, q: q }]);
        if (sib) { var f = sib.querySelector('[data-a="rm"]'); if (f) f.focus({ preventScroll: true }); }
      }
    });
    list.addEventListener("error", function (e) { if (e.target.tagName === "IMG") e.target.parentNode.classList.add("img-missing"); }, true);

    /* ---------- vaciar ---------- */
    function clearAll() {
      var cart = CC.store.cart();
      var items = Object.keys(cart).map(function (id) { return { id: id, q: cart[id] }; });
      CC.store.clear();
      showUndo("Tu mesa quedó vacía", items);
    }
    $("clear").addEventListener("click", function () {
      interacted = true;
      if (dlg && typeof dlg.showModal === "function") dlg.showModal();
      else if (window.confirm("¿Vaciar todo el carrito?")) clearAll();
    });
    if (dlg) dlg.addEventListener("close", function () { if (dlg.returnValue === "ok") clearAll(); dlg.returnValue = ""; });

    /* ---------- copiar pedido ---------- */
    function copyFallback(text) {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta); return ok;
    }
    $("copy").addEventListener("click", function () {
      var text = orderText(), done = function (ok) { CC.toast(ok ? "Pedido copiado" : "No se pudo copiar el pedido", ok ? "" : "error"); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(copyFallback(text)); });
      else done(copyFallback(text));
    });

    /* ---------- cuenta: datos rellenos y el pedido queda en el historial ---------- */
    function prefill() {
      var u = CC.auth && CC.auth.user(); if (!u) return;
      var p = CC.auth.profile(), changed = false;
      if (!nameIn.value && u.name) { nameIn.value = u.name; changed = true; }
      if (!addrIn.value && p.address) { addrIn.value = p.address; changed = true; }
      if (changed) onDetail();
    }
    if (CC.auth) CC.auth.onChange(prefill);
    prefill();

    counter(); paintDetails();
    CC.store.onChange(render); render();
  };
})(window.CC = window.CC || {});
