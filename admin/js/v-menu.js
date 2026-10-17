/* Menú: crear, editar, ocultar y eliminar platos, con foto (se comprime a WebP en el navegador),
   categorías, precios, ingredientes, alérgenos y destacados. El sitio lo muestra al momento.
   Las reservaciones guardan una copia del nombre y precio: cambiar el menú no altera las ya hechas. */
(function (CC) {
  "use strict";
  var AD = window.AD;
  var items = null, photos = {}, off = null;
  var MAX_IN = 12 * 1024 * 1024, MAX_OUT = 700 * 1024;

  function src(img) {
    if (/^fs:/.test(img || "")) {
      var p = img.split(":"), id = p[1];
      if (photos[img]) return photos[img];
      photos[img] = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      AD.db.collection("menuPhotos").doc(id).get().then(function (d) {
        if (d.exists) { photos[img] = d.data().data; AD.$$('img[data-fs="' + img + '"]').forEach(function (i) { i.src = photos[img]; }); }
      }).catch(function () {});
      return photos[img];
    }
    return img ? CC.imgSrc(img) : "";
  }
  function imgTag(img, alt) { return img ? '<img src="' + AD.esc(src(img)) + '"' + (/^fs:/.test(img) ? ' data-fs="' + AD.esc(img) + '"' : "") + ' alt="' + AD.esc(alt || "") + '" loading="lazy">' : ""; }

  /* Comprime la foto: máx. 1000 px de lado, WebP (o JPEG si el navegador no sabe hacer WebP), menos de 700 KB */
  function compress(file) {
    return new Promise(function (ok, ko) {
      if (!file) return ko(AD.ops.userErr("Elige una foto."));
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return ko(AD.ops.userErr("La foto debe ser JPG, PNG o WebP."));
      if (file.size > MAX_IN) return ko(AD.ops.userErr("La foto pesa más de 12 MB. Usa una más ligera."));
      var url = URL.createObjectURL(file), im = new Image();
      im.onerror = function () { URL.revokeObjectURL(url); ko(AD.ops.userErr("El archivo no es una imagen válida.")); };
      im.onload = function () {
        URL.revokeObjectURL(url);
        if (im.naturalWidth < 200 || im.naturalHeight < 200) return ko(AD.ops.userErr("La foto es muy pequeña (mínimo 200 × 200 px)."));
        var side = 1000, q = 0.82, out;
        for (var i = 0; i < 8; i++) {
          var sc = Math.min(1, side / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement("canvas");
          c.width = Math.round(im.naturalWidth * sc); c.height = Math.round(im.naturalHeight * sc);
          var g = c.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(im, 0, 0, c.width, c.height);
          out = c.toDataURL("image/webp", q);
          if (out.indexOf("data:image/webp") !== 0) out = c.toDataURL("image/jpeg", q);
          if (out.length * 0.75 < MAX_OUT && out.length < 890000) return ok(out);
          if (q > 0.6) q -= 0.1; else side = Math.round(side * 0.82);
        }
        ko(AD.ops.userErr("No se pudo reducir la foto lo suficiente. Prueba con otra."));
      };
      im.src = url;
    });
  }

  function form(it) {
    it = it || {};
    var isNew = it.id == null, photo = null;
    var cats = CC.categories.map(function (c) { return '<option value="' + c.key + '"' + (c.key === it.category ? " selected" : "") + ">" + AD.esc(c.label) + "</option>"; }).join("");
    AD.modal({
      title: isNew ? "Nuevo plato" : "Editar · " + it.name, wide: true,
      body: '<div class="photo f"><div class="photo__img" id="m-prev">' + (it.image ? imgTag(it.image) : AD.icon("image")) + "</div>" +
        '<div><span class="f__l">Foto</span><input type="file" id="m-file" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG o WebP. Se optimiza automáticamente (máx. 1000 px, menos de 700 KB).</small></div></div>' +
        '<div class="grid2"><div class="f"><label for="m-name">Nombre</label><input id="m-name" name="name" maxlength="80" value="' + AD.esc(it.name || "") + '"></div>' +
        '<div class="f"><label for="m-cat">Categoría</label><select id="m-cat" name="category">' + cats + "</select></div>" +
        '<div class="f"><label for="m-price">Precio (RD$)</label><input id="m-price" name="price" type="number" min="0" step="1" value="' + (it.price != null ? it.price : "") + '"></div>' +
        '<div class="f"><label for="m-pn">Nota de precio <span class="opt">(opcional)</span></label><input id="m-pn" name="priceNote" maxlength="60" placeholder="Ej.: por persona" value="' + AD.esc(it.priceNote || "") + '"></div>' +
        '<div class="f full"><label for="m-desc">Descripción corta</label><input id="m-desc" name="description" maxlength="140" value="' + AD.esc(it.description || "") + '"></div>' +
        '<div class="f full"><label for="m-long">Descripción completa <span class="opt">(opcional)</span></label><textarea id="m-long" name="longDescription" maxlength="800" rows="3">' + AD.esc(it.longDescription || "") + "</textarea></div>" +
        '<div class="f"><label for="m-ing">Ingredientes <span class="opt">(separados por coma)</span></label><input id="m-ing" name="ingredients" maxlength="400" value="' + AD.esc((it.ingredients || []).join(", ")) + '"></div>' +
        '<div class="f"><label for="m-al">Alérgenos <span class="opt">(opcional)</span></label><input id="m-al" name="allergens" maxlength="160" placeholder="Ej.: Contiene lácteos y gluten" value="' + AD.esc(it.allergens || "") + '"></div>' +
        '<div class="f"><label for="m-ord">Orden en su categoría</label><input id="m-ord" name="order" type="number" min="0" max="999" value="' + (it.order != null ? it.order : 50) + '"></div>' +
        '<div class="f"><span class="f__l">Visibilidad</span><div class="chks"><label class="chk"><input type="checkbox" name="active"' + (it.active === false ? "" : " checked") + '> Visible en el menú</label><label class="chk"><input type="checkbox" name="featured"' + (it.featured ? " checked" : "") + "> Destacado</label></div></div></div>",
      onOpen: function (api) {
        AD.$("#m-file", api.el).onchange = function () {
          var f = this.files[0], prev = AD.$("#m-prev", api.el); api.error("");
          prev.innerHTML = '<span class="boot__spin"></span>';
          compress(f).then(function (data) { photo = data; prev.innerHTML = '<img src="' + data + '" alt="">'; }, function (e) { photo = null; prev.innerHTML = it.image ? imgTag(it.image) : AD.icon("image"); api.error(AD.errMsg(e)); });
        };
      },
      actions: [].concat(isNew ? [] : [{ label: "Eliminar", cls: "b--danger sp", icon: "trash", onClick: function () {
        return AD.confirm("Eliminar plato", "Se quitará <b>" + AD.esc(it.name) + "</b> del menú. Las reservaciones que ya lo incluyen conservan su copia. Si solo quieres ocultarlo, desmarca «Visible».", "Eliminar", true).then(function (y) {
          if (!y) return Promise.reject("keep");
          var b = AD.db.batch(); b.delete(AD.db.collection("menu").doc(String(it.id))); if (/^fs:/.test(it.image || "")) b.delete(AD.db.collection("menuPhotos").doc(String(it.id)));
          return b.commit().then(function () { AD.audit("menu.delete", "menu/" + it.id, it.name); AD.toast("Plato eliminado."); });
        });
      } }], [{ label: "Cancelar", close: true }, { label: "Guardar", cls: "b--p", icon: "check", onClick: function (api) {
        var f = api.el, ok = true, name = AD.val(f, "name"), price = Number(AD.val(f, "price"));
        ok = AD.fieldErr(f, "name", name.length >= 2 ? "" : "Escribe el nombre.") && ok;
        ok = AD.fieldErr(f, "price", AD.val(f, "price") !== "" && price >= 0 && price <= 1000000 ? "" : "Precio no válido.") && ok;
        ok = AD.fieldErr(f, "description", AD.val(f, "description").length >= 3 ? "" : "Escribe una descripción corta.") && ok;
        if (!ok) return false;
        var id = isNew ? (items || []).reduce(function (m, x) { return Math.max(m, Number(x.id) || 0); }, Math.max.apply(null, CC.menu.map(function (m) { return m.id; }).concat([0]))) + 1 : it.id;
        var d = {
          id: id, name: name, category: AD.val(f, "category"), price: Math.round(price), priceNote: AD.val(f, "priceNote") || null,
          description: AD.val(f, "description"), longDescription: AD.val(f, "longDescription"),
          ingredients: AD.val(f, "ingredients").split(",").map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 30),
          allergens: AD.val(f, "allergens") || null, order: Number(AD.val(f, "order")) || 0, active: AD.val(f, "active"), featured: AD.val(f, "featured"),
          image: it.image || "", soldOut: !!it.soldOut, updatedAt: AD.ts(), updatedBy: AD.me.uid
        };
        var b = AD.db.batch();
        if (photo) {
          var v = Date.now().toString(36);
          d.image = "fs:" + id + ":" + v;
          b.set(AD.db.collection("menuPhotos").doc(String(id)), { data: photo, v: v, updatedAt: AD.ts() });
          photos[d.image] = photo;
        }
        b.set(AD.db.collection("menu").doc(String(id)), d);
        return b.commit().then(function () {
          var ch = isNew ? "creado" : ["price", "name", "active", "category"].filter(function (k) { return it[k] !== d[k]; }).map(function (k) { return k + ": " + it[k] + " → " + d[k]; }).join(", ");
          AD.audit(isNew ? "menu.create" : "menu.update", "menu/" + id, name + (ch ? " · " + ch : "") + (photo ? " · foto nueva" : ""));
          AD.toast("Plato guardado.");
        });
      } }])
    });
  }

  /* Importa el menú actual del sitio (data.js) a la base de datos, una sola vez */
  AD.seedMenu = function () {
    var b = AD.db.batch();
    CC.menu.forEach(function (m, i) {
      b.set(AD.db.collection("menu").doc(String(m.id)), Object.assign({}, m, { active: true, featured: (CC.featuredIds || []).indexOf(m.id) > -1, order: i, updatedAt: AD.ts(), updatedBy: AD.me.uid }));
    });
    return b.commit().then(function () { AD.audit("menu.seed", "menu", CC.menu.length + " platos"); });
  };

  AD.view("menu", {
    title: "Menú", icon: "utensils", group: "Contenido", perm: ["menu", "menuStock"],
    render: function (host, top) {
      var st = { cat: "", q: "", show: "all" }, full = AD.can("menu");
      top.innerHTML = '<button class="b b--sm" id="m-csv">' + AD.icon("download") + "Exportar</button>" + (full ? '<button class="b b--p b--sm" id="m-new">' + AD.icon("plus") + "Plato</button>" : "");
      host.innerHTML = '<div id="m-seed"></div><div class="bar"><div class="f bar__grow search"><label for="m-q" class="vh">Buscar</label>' + AD.icon("search") + '<input id="m-q" type="search" placeholder="Buscar plato"></div>' +
        '<div class="f"><label for="m-show" class="vh">Mostrar</label><select id="m-show"><option value="all">Todos</option><option value="on">Visibles</option><option value="off">Ocultos</option><option value="sold">Agotados</option><option value="feat">Destacados</option></select></div></div>' +
        (full ? "" : '<div class="alert alert--info">' + AD.icon("info") + "<span>Vista de cocina: puedes marcar platos como <b>agotados</b> o volver a ponerlos disponibles. Los precios y el contenido del menú los edita la administración.</span></div>") +
        '<div class="chips" id="m-cats" style="margin-bottom:1rem"></div><div id="m-grid" class="mgrid"></div>';
      function paint() {
        var seed = AD.$("#m-seed");
        if (items && !items.length && full) {
          seed.innerHTML = '<div class="card" style="margin-bottom:1rem"><div class="card__h"><div><h2>El menú aún no está en la base de datos</h2><p>El sitio muestra el menú incluido en el código. Impórtalo para poder editarlo desde aquí (' + CC.menu.length + " platos con sus fotos).</p></div>" +
            '<button class="b b--p" id="m-seedb">' + AD.icon("upload") + "Importar menú actual</button></div></div>";
          AD.$("#m-seedb").onclick = function () { this.disabled = true; AD.seedMenu().then(function () { AD.toast("Menú importado."); }, function (e) { AD.fail("menu.seed", e); }); };
        } else seed.innerHTML = "";
        var list = items || [];
        AD.$("#m-cats").innerHTML = ['<button class="chip" data-cat="" aria-pressed="' + !st.cat + '">Todas<span class="n">' + list.length + "</span></button>"].concat(CC.categories.map(function (c) {
          return '<button class="chip" data-cat="' + c.key + '" aria-pressed="' + (st.cat === c.key) + '">' + AD.esc(c.label) + '<span class="n">' + list.filter(function (i) { return i.category === c.key; }).length + "</span></button>";
        })).join("");
        var q = st.q.toLowerCase(), rows = list.filter(function (i) {
          return (!st.cat || i.category === st.cat) && (!q || i.name.toLowerCase().indexOf(q) > -1) &&
            (st.show === "all" || (st.show === "on" && i.active !== false) || (st.show === "off" && i.active === false) || (st.show === "sold" && i.soldOut) || (st.show === "feat" && i.featured));
        });
        AD.$("#m-grid").innerHTML = items === null ? '<div class="empty">Cargando…</div>' : rows.length ? rows.map(function (i) {
          return '<article class="mi' + (i.active === false ? " off" : "") + (i.soldOut ? " mi--sold" : "") + '"><div class="mi__img">' + imgTag(i.image, i.name) + (i.soldOut ? '<span class="tag tag--sold">Agotado</span>' : "") + (i.featured ? '<span class="tag">' + AD.icon("star") + "Destacado</span>" : i.active === false ? '<span class="tag">Oculto</span>' : "") + "</div>" +
            '<div class="mi__b"><b>' + AD.esc(i.name) + "</b><small>" + AD.esc(CC.categoryLabel(i.category)) + " · " + AD.esc(i.description || "") + '</small></div><div class="mi__f"><span class="mi__p">' + AD.money(i.price) + "</span>" +
            '<span class="acts"><button class="b b--sm ' + (i.soldOut ? "b--ok" : "") + '" data-so="' + i.id + '" aria-pressed="' + !!i.soldOut + '">' + (i.soldOut ? AD.icon("check") + "Disponible" : "Agotado") + "</button>" +
            (full ? '<button class="b b--sm b--ghost" data-tg="' + i.id + '" title="' + (i.active === false ? "Mostrar" : "Ocultar") + '">' + AD.icon(i.active === false ? "eye" : "close") + '</button><button class="b b--sm" data-ed="' + i.id + '">' + AD.icon("edit") + "Editar</button>" : "") + "</span></div></article>";
        }).join("") : '<div class="empty">No hay platos con este filtro.</div>';
      }
      function find(id) { return (items || []).filter(function (i) { return String(i.id) === String(id); })[0]; }
      host.addEventListener("click", function (e) {
        var c = e.target.closest("[data-cat]"); if (c) { st.cat = c.dataset.cat; paint(); return; }
        var so = e.target.closest("[data-so]");
        if (so) {
          var x = find(so.dataset.so); so.disabled = true;
          AD.db.collection("menu").doc(String(x.id)).update({ soldOut: !x.soldOut, updatedAt: AD.ts(), updatedBy: AD.me.uid }).then(function () {
            AD.audit("menu.stock", "menu/" + x.id, x.name + (x.soldOut ? " disponible" : " agotado")); AD.toast(x.name + (x.soldOut ? " vuelve a estar disponible." : " marcado como agotado."));
          }, function (er) { so.disabled = false; AD.fail("menu.stock", er); });
          return;
        }
        if (!full) return;
        var ed = e.target.closest("[data-ed]"); if (ed) { form(find(ed.dataset.ed)); return; }
        var tg = e.target.closest("[data-tg]");
        if (tg) { var it = find(tg.dataset.tg); tg.disabled = true; AD.db.collection("menu").doc(String(it.id)).update({ active: it.active === false, updatedAt: AD.ts(), updatedBy: AD.me.uid }).then(function () { AD.audit("menu.visibility", "menu/" + it.id, it.name + (it.active === false ? " visible" : " oculto")); }, function (er) { tg.disabled = false; AD.fail("menu.toggle", er); }); }
      });
      AD.$("#m-q").oninput = AD.debounce(function () { st.q = AD.$("#m-q").value.trim(); paint(); }, 150);
      AD.$("#m-show").onchange = function () { st.show = this.value; paint(); };
      if (full) AD.$("#m-new").onclick = function () { form(); };
      AD.$("#m-csv").onclick = function () {
        AD.xlsx("menu", [{ name: "Menú", rows: (items || []).slice().sort(function (a, b) { return a.id - b.id; }), cols: [{ k: "id", l: "ID" }, { k: "name", l: "Nombre", w: 28 }, { k: "category", l: "Categoría", v: function (i) { return CC.categoryLabel(i.category); } },
          { k: "price", l: "Precio" }, { k: "description", l: "Descripción", w: 40 }, { k: "allergens", l: "Alérgenos" }, { k: "active", l: "Visible", v: function (i) { return i.active === false ? "No" : "Sí"; } }, { k: "featured", l: "Destacado", v: function (i) { return i.featured ? "Sí" : "No"; } }] }]);
      };
      off = AD.db.collection("menu").onSnapshot(function (q) {
        items = q.docs.map(function (d) { var o = d.data(); if (o.id == null) o.id = Number(d.id); return o; }).sort(function (a, b) {
          var ca = CC.categories.findIndex(function (c) { return c.key === a.category; }), cb = CC.categories.findIndex(function (c) { return c.key === b.category; });
          return ca - cb || (a.order || 0) - (b.order || 0) || a.id - b.id;
        });
        paint();
      }, function (e) { AD.fail("menu.live", e); });
      AD.onLeave(function () { if (off) off(); });
      paint();
    }
  });
})(window.CC = window.CC || {});
