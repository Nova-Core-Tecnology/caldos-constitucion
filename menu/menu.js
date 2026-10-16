(function (CC) {
  "use strict";

  /* Iconos y frase corta por categoría (mismos tonos que Nosotros e Inicio) */
  var META = {
    caldos: { rgb: "232, 121, 58", tag: "Ollas grandes, caldos calientes y sabor de casa.", icon: '<path d="M3 11h18v1a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8v-1z"/><path d="M8 3.5c-1.2 1.4 1.2 2.2 0 3.8M12 3.5c-1.2 1.4 1.2 2.2 0 3.8M16 3.5c-1.2 1.4 1.2 2.2 0 3.8"/>' },
    mariscos: { rgb: "196, 140, 80", tag: "Del mar a la mesa, con sazón dominicana.", icon: '<path d="M3 12c2.5-4 6-5.5 10-4.5 2 .5 3.5 2 5 4.5-1.5 2.5-3 4-5 4.5-4 1-7.5-.5-10-4.5z"/><path d="M18 12l3.2-3.2v6.4z"/><circle cx="8.2" cy="11" r=".7" fill="currentColor"/>' },
    antojos: { rgb: "229, 83, 58", tag: "Para picar, compartir o pedir otra ronda.", icon: '<path d="M12 3c1 3.2 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2.3 1.4 1 2.1 1.8 2.3C10.4 8.6 11 5.6 12 3z"/>' },
    bebidas: { rgb: "230, 160, 10", tag: "Bebidas dominicanas para acompañar la mesa.", icon: '<path d="M6 4h12l-1.4 15a2 2 0 0 1-2 1.8H9.4a2 2 0 0 1-2-1.8L6 4z"/><path d="M6.6 9.5h10.8"/><path d="M13 4l1.5-2.2"/>' },
    postres: { rgb: "214, 108, 90", tag: "Postres caseros para cerrar con dulzura.", icon: '<path d="M4 20h16"/><path d="M5 20v-5a7 7 0 0 1 14 0v5"/><path d="M12 8V4.5"/><circle cx="12" cy="3.5" r="1.1"/><path d="M5 15.5c2 1.4 4 1.4 7 0s5-1.4 7 0"/>' },
    "acompañantes": { rgb: "176, 130, 70", tag: "Para completar cada plato.", icon: '<ellipse cx="12" cy="15" rx="8.5" ry="4"/><path d="M5 14.2C5.6 8.8 8.4 6 12 6s6.4 2.8 7 8.2"/><path d="M9.5 11.2l.8 1.6M13.5 10.2l.5 1.9M16 12l-.3 1.5"/>' },
    todos: { rgb: "74, 38, 22", icon: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/>' },
    favoritos: { rgb: "196, 40, 28", icon: '<path d="M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.7c0 5.4-7.5 10-7.5 10z"/>' }
  };
  var FALLBACK = META.caldos;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function svg(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + inner + "</svg>";
  }
  function meta(k) { return META[k] || FALLBACK; }
  function norm(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function plural(n) { return n + (n === 1 ? " plato" : " platos"); }

  CC.page = function () {
    var grid = document.getElementById("grid"), chips = document.getElementById("chips"), q = document.getElementById("q");
    var count = document.getElementById("count"), none = document.getElementById("none"), noneMsg = document.getElementById("none-msg");
    var clear = document.getElementById("clear"), sortEl = document.getElementById("sort"), bar = document.getElementById("bar");
    document.getElementById("none-ic").innerHTML = CC.icon("pot");

    var cats = [{ key: "todos", label: "Todos" }].concat(CC.categories, [{ key: "favoritos", label: "Mis favoritos" }]);
    var params = new URLSearchParams(window.location.search), start = params.get("cat");
    var active = cats.some(function (c) { return c.key === start; }) ? start : "todos";
    var sort = "menu";

    /* Lleva la vista a la barra de filtros */
    function scrollToList() {
      var sec = document.querySelector(".menu");
      var y = bar.getBoundingClientRect().top + window.scrollY - 12;
      window.scrollTo({ top: Math.max(y, 0), behavior: reduce ? "auto" : "smooth" });
    }

    /* Hero tipo carta impresa: índice de categorías con puntos guía y ventana en arco con platos en movimiento */
    function hero() {
      document.querySelectorAll("#mh [data-ic]").forEach(function (s) { s.innerHTML = CC.icon(s.getAttribute("data-ic")); });
      var wa = document.getElementById("mh-wa"); if (wa) wa.href = CC.waLink("Hola, quisiera hacer un pedido del menú.");
      var go = document.getElementById("mh-go"); if (go) go.addEventListener("click", function (e) { e.preventDefault(); scrollToList(); });

      /* Accesos directos: cada categoría con su cantidad real de platos */
      var idx = document.getElementById("mh-cats"), live = CC.categories.filter(function (c) { return countFor(c.key) > 0; });
      if (idx) {
        idx.innerHTML = live.map(function (c) {
          var n = countFor(c.key), mt = meta(c.key);
          return '<li><button type="button" class="mh__row" data-k="' + CC.esc(c.key) + '" style="--kr:' + mt.rgb + '">' +
            '<span class="mh__n" aria-hidden="true">' + svg(mt.icon) + '</span>' +
            '<span class="mh__tx"><span class="mh__t">' + CC.esc(c.label) + '</span><span class="mh__c">' + plural(n) + "</span></span></button></li>";
        }).join("");
        idx.addEventListener("click", function (e) {
          var b = e.target.closest(".mh__row"); if (!b) return;
          setActive(b.dataset.k); scrollToList();
        });
      }

      /* Línea de resumen con datos reales */
      var prices = CC.menu.map(function (m) { return Number(m.price); }).filter(function (n) { return n > 0; });
      var metaEl = document.getElementById("mh-meta");
      if (metaEl && prices.length) {
        metaEl.innerHTML = "<b>" + CC.menu.length + "</b> platos<i></i><b>" + live.length + "</b> categorías<i></i>desde <b>" + CC.money(Math.min.apply(null, prices)) + "</b>";
        metaEl.hidden = false;
      }

      /* Cinta con las categorías */
      var tick = document.getElementById("mh-tick");
      if (tick && live.length) {
        var one = live.map(function (c) { return "<span>" + CC.esc(c.label) + "</span><em>✦</em>"; }).join("");
        tick.innerHTML = '<div class="mh__tick-g">' + one + one + '</div><div class="mh__tick-g">' + one + one + "</div>";
      }

      /* Ventana en arco: tres columnas de platos que suben y bajan sin parar */
      var reel = document.getElementById("mh-reel"); if (!reel) return;
      var dishes = CC.menu.filter(function (m) { return m.image; });
      var feat = CC.featuredIds || [];
      dishes.sort(function (a, b) { return (feat.indexOf(b.id) > -1 ? 1 : 0) - (feat.indexOf(a.id) > -1 ? 1 : 0); });
      if (dishes.length < 3) { reel.closest(".mh__win").hidden = true; return; }
      var cols = [[], [], []];
      dishes.forEach(function (d, i) { cols[i % 3].push(d); });
      function tile(d, dup) {
        var c = meta(d.category).rgb, nm = CC.esc(d.name);
        return '<button type="button" class="tile" data-id="' + d.id + '" style="--kr:' + c + '"' + (dup ? ' tabindex="-1" aria-hidden="true"' : ' aria-label="Ver ficha de ' + nm + '"') + ">" +
          '<img src="' + CC.imgSrc(d.image) + '" alt="" decoding="async"' + (dup ? ' loading="lazy"' : "") + '>' +
          '<span class="tile__cap"><b>' + nm + "</b><small>" + (d.priceNote ? "desde " : "") + CC.money(d.price) + "</small></span></button>";
      }
      reel.innerHTML = cols.map(function (list, i) {
        var one = list.map(function (d) { return tile(d, false); }).join(""), two = list.map(function (d) { return tile(d, true); }).join("");
        return '<div class="col col--' + (i + 1) + '"><div class="track">' + one + two + "</div></div>";
      }).join("");
      reel.addEventListener("click", function (e) {
        var t = e.target.closest(".tile"); if (t) CC.openDish(Number(t.dataset.id), t);
      });
      reel.addEventListener("error", function (e) {
        if (e.target.tagName !== "IMG") return;
        var t = e.target.closest(".tile"); if (t) t.classList.add("img-missing");
      }, true);
    }

    function inCat(m, key) {
      if (key === "favoritos") return CC.store.isFav(m.id);
      return key === "todos" || m.category === key;
    }
    function countFor(key) { return CC.menu.filter(function (m) { return inCat(m, key); }).length; }

    function drawChips() {
      chips.innerHTML = cats.map(function (c) {
        var m = meta(c.key), on = c.key === active;
        return '<button type="button" class="chip" data-k="' + CC.esc(c.key) + '" aria-pressed="' + on + '" style="--kr:' + m.rgb + '">' +
          '<span class="chip__ic">' + svg(m.icon) + "</span>" +
          '<span class="chip__t">' + CC.esc(c.label) + "</span>" +
          '<span class="chip__n">' + countFor(c.key) + "</span></button>";
      }).join("");
    }

    function filtered() {
      var term = norm(q.value.trim());
      var list = CC.menu.filter(function (m) {
        if (!inCat(m, active)) return false;
        return !term || norm(m.name + " " + (m.description || "") + " " + CC.categoryLabel(m.category)).indexOf(term) !== -1;
      });
      if (sort === "asc") list = list.slice().sort(function (a, b) { return a.price - b.price; });
      else if (sort === "desc") list = list.slice().sort(function (a, b) { return b.price - a.price; });
      else if (sort === "az") list = list.slice().sort(function (a, b) { return a.name.localeCompare(b.name, "es"); });
      return list;
    }

    function section(key, items) {
      var m = meta(key), label = CC.categoryLabel(key);
      return '<section class="msec reveal" style="--kr:' + m.rgb + '" aria-labelledby="sec-' + CC.esc(key) + '">' +
        '<header class="msec__head"><span class="msec__ic">' + svg(m.icon) + "</span>" +
        '<div class="msec__tx"><h2 id="sec-' + CC.esc(key) + '">' + CC.esc(label) + "</h2>" + (m.tag ? "<p>" + CC.esc(m.tag) + "</p>" : "") + "</div>" +
        '<span class="msec__n">' + plural(items.length) + "</span></header>" +
        '<div class="dish-grid">' + items.map(CC.dishCard).join("") + "</div></section>";
    }

    function render() {
      var list = filtered(), term = q.value.trim();
      clear.hidden = !term;

      /* Vista agrupada por categoría sólo cuando se ve toda la carta en su orden */
      var grouped = active === "todos" && !term && sort === "menu";
      if (grouped) {
        var order = CC.categories.map(function (c) { return c.key; });
        grid.innerHTML = order.map(function (k) {
          var items = list.filter(function (m) { return m.category === k; });
          return items.length ? section(k, items) : "";
        }).join("");
        /* Platos de categorías no listadas */
        var rest = list.filter(function (m) { return order.indexOf(m.category) < 0; });
        if (rest.length) grid.insertAdjacentHTML("beforeend", '<div class="dish-grid">' + rest.map(CC.dishCard).join("") + "</div>");
      } else {
        grid.innerHTML = '<div class="dish-grid">' + list.map(CC.dishCard).join("") + "</div>";
      }

      none.hidden = list.length > 0; grid.hidden = list.length === 0;
      if (!list.length) {
        noneMsg.textContent = active === "favoritos" && !term
          ? "Aún no tienes favoritos. Toca el corazón de un plato para guardarlo aquí."
          : "Prueba con otra palabra o elige otra categoría.";
      }

      var txt = plural(list.length);
      if (active !== "todos") txt += " en " + (active === "favoritos" ? "tus favoritos" : CC.categoryLabel(active));
      if (term) txt += " para “" + term + "”";
      count.textContent = txt;
      CC.reveal(grid);
    }

    function setActive(k) {
      active = k; drawChips(); render();
      var u = new URL(window.location.href);
      if (active === "todos") u.searchParams.delete("cat"); else u.searchParams.set("cat", active);
      try { history.replaceState(null, "", u); } catch (err) { /* file:// */ }
    }

    chips.addEventListener("click", function (e) {
      var b = e.target.closest(".chip"); if (!b) return;
      setActive(b.dataset.k);
      /* Si la barra quedó fuera de vista, súbela para ver la lista */
      var top = bar.getBoundingClientRect().top + window.scrollY - 12;
      if (window.scrollY > top) window.scrollTo({ top: Math.max(top, 0), behavior: reduce ? "auto" : "smooth" });
    });
    var t; q.addEventListener("input", function () { clear.hidden = !q.value; clearTimeout(t); t = setTimeout(render, 150); });
    clear.addEventListener("click", function () { q.value = ""; render(); q.focus(); });
    sortEl.addEventListener("change", function () { sort = sortEl.value; render(); });
    document.getElementById("reset").addEventListener("click", function () {
      q.value = ""; sort = "menu"; sortEl.value = "menu"; setActive("todos"); q.focus();
    });

    /* Mostrar u ocultar la barra de filtros (se recuerda la elección) */
    var tog = document.getElementById("bar-toggle"), togT = document.getElementById("bar-toggle-t");
    function collapse(on, save) {
      bar.classList.toggle("is-collapsed", on);
      tog.setAttribute("aria-expanded", String(!on));
      togT.textContent = on ? "Mostrar filtros" : "Ocultar filtros";
      if (save) { try { localStorage.setItem("cc-menu-bar", on ? "0" : "1"); } catch (err) { /* sin almacenamiento */ } }
    }
    tog.addEventListener("click", function () { collapse(!bar.classList.contains("is-collapsed"), true); });
    try { if (localStorage.getItem("cc-menu-bar") === "0") collapse(true, false); } catch (err) { /* sin almacenamiento */ }

    CC.bindDishes(grid);
    CC.store.onChange(function () { drawChips(); if (active === "favoritos") render(); });
    drawChips(); render(); hero();
  };
})(window.CC = window.CC || {});
