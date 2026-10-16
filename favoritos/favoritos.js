(function (CC) {
  "use strict";
  CC.page = function () {
    var $ = function (id) { return document.getElementById(id); };
    var grid = $("fgrid"), rgrid = $("rgrid"), coll = $("coll"), empty = $("fempty"), chips = $("fchips"), sortSel = $("fsort"), undo = $("undo");
    var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var cat = "all", sort = "saved", prev = CC.store.favs(), undoTimer = null, lastRemoved = null, silent = false, first = true;

    document.querySelectorAll("[data-ic]").forEach(function (s) { s.innerHTML = CC.icon(s.getAttribute("data-ic")); });
    CC.bindDishes(grid); CC.bindDishes(rgrid);

    function items() { return CC.store.favs().map(function (id) { return CC.getItem(id); }).filter(Boolean); }
    function plural(n) { return n + (n === 1 ? " plato" : " platos"); }

    /* ---------- cifras del hero ---------- */
    function stats(list) {
      var box = $("fstats"); box.hidden = !list.length; if (!list.length) return;
      var cats = {}, total = 0, any = false;
      list.forEach(function (it) { cats[it.category] = 1; total += it.price; if (it.priceNote) any = true; });
      var nc = Object.keys(cats).length;
      box.innerHTML =
        "<li><b>" + list.length + "</b><span>" + (list.length === 1 ? "plato guardado" : "platos guardados") + "</span></li>" +
        "<li><b>" + nc + "</b><span>" + (nc === 1 ? "categoría" : "categorías") + "</span></li>" +
        "<li><b>" + (any ? '<small>desde </small>' : "") + CC.money(total) + "</b><span>si pides uno de cada</span></li>";
    }

    /* ---------- filtros por categoría (solo las que tienes) ---------- */
    function paintChips(list) {
      var counts = {};
      list.forEach(function (it) { counts[it.category] = (counts[it.category] || 0) + 1; });
      if (cat !== "all" && !counts[cat]) cat = "all";
      var keys = CC.categories.map(function (c) { return c.key; }).filter(function (k) { return counts[k]; });
      chips.innerHTML = '<button type="button" class="chip" data-cat="all" aria-pressed="' + (cat === "all") + '">Todos <span>' + list.length + "</span></button>" +
        keys.map(function (k) { return '<button type="button" class="chip" data-cat="' + k + '" aria-pressed="' + (cat === k) + '">' + CC.esc(CC.categoryLabel(k)) + " <span>" + counts[k] + "</span></button>"; }).join("");
      chips.hidden = keys.length < 2;
    }
    chips.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cat]"); if (!b || b.dataset.cat === cat) return;
      cat = b.dataset.cat; render(true);
    });
    sortSel.addEventListener("change", function () { sort = sortSel.value; render(true); });

    function visible(list) {
      var out = list.filter(function (it) { return cat === "all" || it.category === cat; });
      if (sort === "asc") out.sort(function (a, b) { return a.price - b.price; });
      else if (sort === "desc") out.sort(function (a, b) { return b.price - a.price; });
      else if (sort === "az") out.sort(function (a, b) { return a.name.localeCompare(b.name, "es"); });
      return out;
    }

    /* ---------- compartir y añadir ---------- */
    function shareText(list) {
      return "Mira mis platos favoritos de Caldos Constitución (San Cristóbal):\n" +
        list.map(function (it) { return "• " + it.name + " — " + (it.priceNote ? "desde " : "") + CC.money(it.price); }).join("\n");
    }
    function paintActions(list, shown) {
      $("share").href = "https://wa.me/?text=" + encodeURIComponent(shareText(list));
      $("addall-t").textContent = cat === "all" ? "Añadir todos al pedido" : "Añadir estos " + shown.length + " al pedido";
      $("fcount").textContent = cat === "all" ? plural(list.length) + " en tu colección" : shown.length + " de " + plural(list.length);
    }
    $("addall").addEventListener("click", function () {
      var shown = visible(items());
      shown.forEach(function (it) { CC.store.add(it.id, 1); });
      CC.flyToCart(this);
      CC.toast(plural(shown.length) + " añadidos a tu pedido");
    });

    /* ---------- recomendaciones: favoritos de la casa y lo que combina con tus categorías ---------- */
    var PAIR = { caldos: ["acompañantes", "bebidas", "mariscos"], mariscos: ["caldos", "acompañantes"], antojos: ["bebidas", "entrantes"], entrantes: ["antojos", "bebidas"], "acompañantes": ["caldos"], bebidas: ["postres"], postres: ["bebidas"] };
    function recs(list) {
      var favIds = list.map(function (it) { return it.id; }), feat = CC.featuredIds || [], wanted = [];
      list.forEach(function (it) { (PAIR[it.category] || []).forEach(function (c) { if (wanted.indexOf(c) < 0) wanted.push(c); }); });
      var pool = CC.menu.filter(function (m) { return favIds.indexOf(m.id) < 0; });
      pool.sort(function (a, b) {
        var sa = (feat.indexOf(a.id) > -1 ? 2 : 0) + (wanted.indexOf(a.category) > -1 ? 1 : 0);
        var sb = (feat.indexOf(b.id) > -1 ? 2 : 0) + (wanted.indexOf(b.category) > -1 ? 1 : 0);
        return sb - sa;
      });
      return pool.slice(0, list.length ? 3 : 6);
    }

    /* ---------- render ---------- */
    function paintGrid(el, list) {
      el.innerHTML = list.map(function (it) { return CC.dishCard(it); }).join("");
      if (first || reduce) CC.reveal(el);
      else el.querySelectorAll(".reveal").forEach(function (c, i) { c.style.transitionDelay = (i * 40) + "ms"; requestAnimationFrame(function () { c.classList.add("is-visible"); }); });
    }
    function render() {
      var list = items(), shown = visible(list);
      coll.hidden = !list.length; empty.hidden = !!list.length;
      stats(list); paintChips(list); paintActions(list, shown);
      paintGrid(grid, shown);
      var r = recs(list);
      $("recs").hidden = !r.length;
      $("recs-k").textContent = list.length ? "Te puede gustar" : "Para empezar";
      $("recs-t").innerHTML = list.length ? "Más platos para <em>tu colección</em>" : "Los favoritos <em>de la casa</em>";
      $("recs-p").textContent = list.length ? "Combinan con lo que guardaste. Toca el corazón para sumarlos." : "Toca el corazón en los que te gusten y empieza tu colección.";
      paintGrid(rgrid, r);
      first = false;
    }

    /* ---------- deshacer al quitar favoritos ---------- */
    function showUndo(msg, ids) {
      lastRemoved = ids; $("undo-t").textContent = msg; undo.hidden = false;
      requestAnimationFrame(function () { undo.classList.add("is-in"); });
      clearTimeout(undoTimer); undoTimer = setTimeout(hideUndo, 7000);
    }
    function hideUndo() { undo.classList.remove("is-in"); setTimeout(function () { if (!undo.classList.contains("is-in")) undo.hidden = true; }, 300); }
    $("undo-b").addEventListener("click", function () {
      var ids = lastRemoved; lastRemoved = null; clearTimeout(undoTimer); hideUndo();
      if (!ids) return;
      silent = true;
      ids.forEach(function (id) { if (!CC.store.isFav(id)) CC.store.toggleFav(id); });
      silent = false; CC.toast("Favoritos restaurados");
    });
    $("clearfav").addEventListener("click", function () {
      var ids = CC.store.favs(); if (!ids.length) return;
      silent = true;
      ids.forEach(function (id) { CC.store.toggleFav(id); });
      silent = false;
      showUndo("Quitaste " + plural(ids.length) + " de favoritos", ids);
    });

    /* Al cambiar los favoritos: la tarjeta quitada sale con animación y se ofrece deshacer */
    CC.store.onChange(function () {
      var now = CC.store.favs();
      var removed = prev.filter(function (id) { return now.indexOf(id) < 0; });
      var added = now.filter(function (id) { return prev.indexOf(id) < 0; });
      prev = now;
      if (!removed.length && !added.length) return;
      if (removed.length && !silent && removed.length === 1) {
        var it = CC.getItem(removed[0]);
        showUndo((it ? it.name : "Plato") + " quitado de favoritos", removed);
      }
      var leaving = removed.map(function (id) { return grid.querySelector('.dish[data-id="' + id + '"]'); }).filter(Boolean);
      if (leaving.length && !reduce) {
        leaving.forEach(function (c) { c.classList.add("is-leaving"); });
        setTimeout(render, 320);
      } else render();
    });

    sortSel.value = sort;
    render();
  };
})(window.CC = window.CC || {});
