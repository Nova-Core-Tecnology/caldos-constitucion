/* Datos del menú — fuente única para Inicio, Menú, Favoritos y Carrito.
   Origen: proyecto web original del restaurante (script.js). Pendiente: confirmar precios,
   ingredientes y alérgenos con el restaurante (ver README). Se eliminaron calorías, valoraciones,
   tiempos de preparación e insignias del sitio anterior por no tener fuente verificable. */
(function (CC) {
  "use strict";
  CC.categories = [
    { key: "caldos", label: "Caldos y sopas" },
    { key: "mariscos", label: "Mariscos" },
    { key: "antojos", label: "Antojos" },
    { key: "acompañantes", label: "Acompañantes" },
    { key: "entrantes", label: "Entrantes" },
    { key: "bebidas", label: "Bebidas" },
    { key: "postres", label: "Postres" }
  ];
  CC.menu = [
  {
    "id": 1,
    "category": "entrantes",
    "name": "Nachos con queso",
    "price": 150,
    "priceNote": null,
    "description": "Crujientes nachos con queso fundido.",
    "longDescription": "Nachos de maíz horneados y bañados en queso cheddar fundido, servidos con jalapeños frescos. Un clásico ligero para abrir el apetito.",
    "image": "nachos_con_queso.jpg",
    "ingredients": [
      "Tortilla de maíz",
      "Queso cheddar",
      "Jalapeños"
    ],
    "allergens": "Contiene lácteos y gluten"
  },
  {
    "id": 2,
    "category": "entrantes",
    "name": "Nachos picantes",
    "price": 200,
    "priceNote": null,
    "description": "Con nuestra salsa secreta.",
    "longDescription": "La versión atrevida de nuestros nachos: salsa secreta de la casa con un toque picante que se queda en la memoria.",
    "image": "nachos_picantes.png",
    "ingredients": [
      "Tortilla de maíz",
      "Queso",
      "Salsa secreta picante"
    ],
    "allergens": "Contiene lácteos y gluten"
  },
  {
    "id": 3,
    "category": "caldos",
    "name": "Sancocho Dominicano",
    "price": 350,
    "priceNote": null,
    "description": "El clásico con 7 carnes.",
    "longDescription": "Nuestra receta insignia: siete carnes cocinadas a fuego lento con víveres frescos y cilantro. El sabor que define la casa.",
    "image": "sancocho_dominicano.png",
    "ingredients": [
      "7 carnes",
      "Víveres",
      "Cebolla",
      "Cilantro",
      "Ajo"
    ],
    "allergens": "Ninguno declarado"
  },
  {
    "id": 4,
    "category": "caldos",
    "name": "Caldo de pata",
    "price": 250,
    "priceNote": null,
    "description": "Nutritivo y tradicional.",
    "longDescription": "Pata de res cocinada lentamente con víveres y especias de la casa. Reconfortante y tradicional.",
    "image": "caldo_de_pata.png",
    "ingredients": [
      "Pata de res",
      "Víveres",
      "Cebolla",
      "Especias"
    ],
    "allergens": "Ninguno declarado"
  },
  {
    "id": 5,
    "category": "caldos",
    "name": "Caldo de pollo",
    "price": 200,
    "priceNote": null,
    "description": "Sabor casero y fresco.",
    "longDescription": "Pollo fresco, zanahoria, papa y cilantro en un caldo ligero con sabor casero.",
    "image": "caldo_de_pollo.jpg",
    "ingredients": [
      "Pollo",
      "Zanahoria",
      "Papa",
      "Cebolla",
      "Cilantro"
    ],
    "allergens": "Ninguno declarado"
  },
  {
    "id": 6,
    "category": "caldos",
    "name": "Caldo de pescado",
    "price": 400,
    "priceNote": null,
    "description": "Caldo fresco de temporada.",
    "longDescription": "Pescado fresco de temporada en un caldo suave con leche de coco y cilantro.",
    "image": "caldo_de_pescado.jpg",
    "ingredients": [
      "Pescado fresco",
      "Coco",
      "Cebolla",
      "Cilantro"
    ],
    "allergens": "Contiene pescado"
  },
  {
    "id": 7,
    "category": "acompañantes",
    "name": "Tostones",
    "price": 100,
    "priceNote": null,
    "description": "Porción crujiente.",
    "longDescription": "Plátano verde frito dos veces hasta quedar crujiente por fuera y suave por dentro.",
    "image": "tostones.jpg",
    "ingredients": [
      "Plátano verde",
      "Sal",
      "Ajo"
    ],
    "allergens": "Ninguno declarado"
  },
  {
    "id": 8,
    "category": "acompañantes",
    "name": "Arroz blanco",
    "price": 100,
    "priceNote": null,
    "description": "Graneado perfecto.",
    "longDescription": "Arroz blanco graneado, el acompañante infaltable de la mesa dominicana.",
    "image": "arroz_blanco.jpg",
    "ingredients": [
      "Arroz",
      "Aceite",
      "Sal"
    ],
    "allergens": "Ninguno declarado"
  },
  {
    "id": 9,
    "category": "antojos",
    "name": "Mofongo Crunchy",
    "price": 450,
    "priceNote": null,
    "description": "Con chicharrón crujiente.",
    "longDescription": "Plátano verde machacado a mano, relleno de chicharrón dorado al punto exacto. El plato más pedido de la casa.",
    "image": "mofongo_crunchy.jpg",
    "ingredients": [
      "Plátano verde",
      "Chicharrón",
      "Ajo",
      "Caldo de la casa"
    ],
    "allergens": "Ninguno declarado"
  },
  {
    "id": 10,
    "category": "antojos",
    "name": "Chicharrón",
    "price": 350,
    "priceNote": null,
    "description": "Porción dorada.",
    "longDescription": "Chicharrón de cerdo dorado y crujiente, servido con un toque de limón.",
    "image": "chicharron.png",
    "ingredients": [
      "Cerdo",
      "Sal",
      "Limón"
    ],
    "allergens": "Ninguno declarado"
  },
  {
    "id": 11,
    "category": "bebidas",
    "name": "Limonada de coco",
    "price": 120,
    "priceNote": null,
    "description": "Refrescante y tropical.",
    "longDescription": "Limón fresco con crema de coco y un toque de azúcar de caña. Perfecta para acompañar cualquier plato.",
    "image": "limonada_coco.png",
    "ingredients": [
      "Limón",
      "Coco",
      "Azúcar de caña"
    ],
    "allergens": "Ninguno declarado"
  },
  {
    "id": 12,
    "category": "bebidas",
    "name": "Jugo de chinola",
    "price": 110,
    "priceNote": null,
    "description": "Natural, sin conservantes.",
    "longDescription": "Chinola fresca licuada al momento, sin azúcares añadidos artificiales.",
    "image": "jugo-de-chinola.jpg",
    "ingredients": [
      "Chinola",
      "Agua",
      "Azúcar"
    ],
    "allergens": "Ninguno declarado"
  },
  {
    "id": 24,
    "category": "bebidas",
    "name": "Morir Soñando",
    "price": 130,
    "priceNote": null,
    "description": "El clásico dominicano de naranja y leche.",
    "longDescription": "Jugo de naranja fresco batido con leche evaporada bien fría y un toque de azúcar de caña. Cremoso, refrescante y 100% dominicano.",
    "image": "morir-sonando.jpg",
    "ingredients": [
      "Naranja",
      "Leche evaporada",
      "Azúcar de caña",
      "Hielo"
    ],
    "allergens": "Contiene lácteos"
  },
  {
    "id": 13,
    "category": "postres",
    "name": "Tres leches",
    "price": 180,
    "priceNote": null,
    "description": "El postre favorito de la casa.",
    "longDescription": "Bizcocho húmedo bañado en tres leches con un toque de canela. El cierre perfecto para cualquier comida.",
    "image": "tres_leches.jpg",
    "ingredients": [
      "Bizcocho",
      "Tres leches",
      "Canela"
    ],
    "allergens": "Contiene lácteos, huevo y gluten"
  },
  {
    "id": 14,
    "category": "postres",
    "name": "Flan de coco",
    "price": 170,
    "priceNote": null,
    "description": "Suave y tropical.",
    "longDescription": "Flan casero con leche de coco, textura suave y un intenso sabor tropical.",
    "image": "flan-de-coco.jpg",
    "ingredients": [
      "Coco",
      "Huevo",
      "Leche condensada"
    ],
    "allergens": "Contiene lácteos y huevo"
  },
  {
    "id": 15,
    "category": "caldos",
    "name": "Mondongo",
    "price": 300,
    "priceNote": null,
    "description": "Guiso tradicional a fuego lento.",
    "longDescription": "Mondongo de res cocinado a fuego lento con vegetales frescos y el sazón criollo de la casa. Una receta de casa que reconforta en cada cucharada.",
    "image": "mondongo.jpeg",
    "ingredients": [
      "Mondongo de res",
      "Vegetales",
      "Cebolla",
      "Sazón criollo"
    ],
    "allergens": "Ninguno declarado"
  },
  {
    "id": 16,
    "category": "caldos",
    "name": "Patimongo",
    "price": 320,
    "priceNote": null,
    "description": "Pata y mondongo en una sola receta.",
    "longDescription": "La combinación perfecta de pata de res y mondongo, cocinados juntos a fuego lento hasta lograr un sabor profundo y una textura irresistible.",
    "image": "patimongo.jpg",
    "ingredients": [
      "Pata de res",
      "Mondongo",
      "Víveres",
      "Cebolla",
      "Sazón criollo"
    ],
    "allergens": "Ninguno declarado"
  },
  {
    "id": 17,
    "category": "acompañantes",
    "name": "Domplines",
    "price": 90,
    "priceNote": null,
    "description": "Suaves por dentro, el acompañante de casa.",
    "longDescription": "Domplines dominicanos hechos a mano, cocidos al punto justo para acompañar caldos y guisos con ese toque casero de siempre.",
    "image": "domplines.jpg",
    "ingredients": [
      "Harina de trigo",
      "Sal",
      "Agua"
    ],
    "allergens": "Contiene gluten"
  },
  {
    "id": 18,
    "category": "mariscos",
    "name": "Mariscos a la Criolla",
    "price": 550,
    "priceNote": null,
    "description": "Mezcla de mariscos frescos en salsa criolla.",
    "longDescription": "Camarones, calamar y pulpo salteados en una salsa criolla con pimientos y especias de la casa. Un plato del mar con todo el sabor dominicano.",
    "image": "mariscos.jpg",
    "ingredients": [
      "Camarones",
      "Calamar",
      "Pulpo",
      "Cebolla",
      "Salsa criolla"
    ],
    "allergens": "Contiene mariscos"
  },
  {
    "id": 19,
    "category": "mariscos",
    "name": "Pasta de camarones",
    "price": 750,
    "priceNote": null,
    "description": "Pasta cremosa con camarones frescos.",
    "longDescription": "Pasta al dente bañada en una salsa cremosa con camarones frescos salteados y un toque de ajo. Un clásico marino con acento italiano.",
    "image": "pasta_camarones.jpg",
    "ingredients": [
      "Pasta",
      "Camarones",
      "Crema",
      "Queso parmesano",
      "Ajo"
    ],
    "allergens": "Contiene mariscos, gluten y lácteos"
  },
  {
    "id": 20,
    "category": "mariscos",
    "name": "Rey de los 7 Mares",
    "price": 800,
    "priceNote": null,
    "description": "Pasta cargada con lo mejor del mar.",
    "longDescription": "Camarones, calamar, mejillones y pulpo sobre pasta al dente, bañados en una salsa marinera de la casa. Para los amantes del mar sin límites.",
    "image": "pasta_rey_7_mares.jpg",
    "ingredients": [
      "Pasta",
      "Camarones",
      "Calamar",
      "Mejillones",
      "Pulpo",
      "Cebolla"
    ],
    "allergens": "Contiene mariscos y gluten"
  },
  {
    "id": 21,
    "category": "mariscos",
    "name": "Caldereta de mariscos",
    "price": 1400,
    "priceNote": "Desde RD$1,400 (tamaños de RD$1,400, RD$1,800 y RD$2,200)",
    "description": "Guiso marino para compartir · desde RD$1400.",
    "longDescription": "Caldereta cargada de mariscos frescos en un guiso de la casa con vegetales y especias. Disponible en tres tamaños: RD$1400, RD$1800 y RD$2200, ideal para compartir.",
    "image": "caldereta_mariscos.jpg",
    "ingredients": [
      "Camarones",
      "Calamar",
      "Pulpo",
      "Pescado",
      "Cebolla",
      "Vegetales"
    ],
    "allergens": "Contiene mariscos"
  },
  {
    "id": 22,
    "category": "mariscos",
    "name": "Jaiba al coco",
    "price": 800,
    "priceNote": null,
    "description": "Jaiba en salsa cremosa de coco.",
    "longDescription": "Jaiba fresca cocinada en una salsa cremosa de coco con un toque de cilantro. Un plato tropical con mucho sabor a mar.",
    "image": "jaiba_coco.jpg",
    "ingredients": [
      "Jaiba",
      "Leche de coco",
      "Cebolla",
      "Cilantro"
    ],
    "allergens": "Contiene mariscos"
  },
  {
    "id": 23,
    "category": "mariscos",
    "name": "Sancocho de jaiba",
    "price": 550,
    "priceNote": null,
    "description": "Sancocho marino con jaiba fresca.",
    "longDescription": "Nuestra receta de sancocho, adaptada al mar: jaiba fresca cocinada a fuego lento con víveres y el sazón criollo de siempre.",
    "image": "sancocho_jaiba.jpg",
    "ingredients": [
      "Jaiba",
      "Víveres",
      "Cebolla",
      "Sazón criollo"
    ],
    "allergens": "Contiene mariscos"
  }
];
  CC.featuredIds = [3, 9, 4, 16];
  CC.getItem = function (id) { return CC.menu.find(function (m) { return m.id === Number(id); }); };
  CC.categoryLabel = function (key) { var c = CC.categories.find(function (x) { return x.key === key; }); return c ? c.label : key; };
})(window.CC = window.CC || {});
