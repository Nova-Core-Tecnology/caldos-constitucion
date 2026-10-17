/* Caldos Constitución — vegetación tropical compartida.
   Inserta el sprite de hojas, monta los presets (data-jungle), dibuja las enredaderas (data-vine),
   las hace crecer al entrar en pantalla y añade hojas que caen, luciérnagas y un paralaje suave.
   boot.js llama a CC.jungle.init() después de montar encabezado, pie y contenido de cada página. */
(function (CC) {
  "use strict";
  var SVGNS = "http://www.w3.org/2000/svg";
  var mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
  var reduce = mq("(prefers-reduced-motion: reduce)");

  /* Monstera, palma, helecho, hoja de pothos, hoja suelta y cayena (generado una vez, reutilizado con <use>) */
  var SPRITE = "<svg class=\"v-sprite\" width=\"0\" height=\"0\" xmlns=\"http://www.w3.org/2000/svg\" aria-hidden=\"true\" focusable=\"false\"><defs><symbol id=\"v-monstera\" viewBox=\"-104 -222 210 236\" overflow=\"visible\"><path d=\"M0 -30 Q-3 -8 0 14\" class=\"v-stem\" fill=\"none\" stroke-width=\"5\" stroke-linecap=\"round\"/><path d=\"M0 -214L1.7 -214L8.7 -213.5L15.9 -212.3L23.4 -210.5L30.9 -208.1L38.4 -205L45.7 -201.3L52.5 -197L23.2 -179.9L58.1 -192.9L61.3 -190.2L64.3 -187.5L67.2 -184.6L70 -181.5L72.6 -178.4L75.2 -175.1L77.5 -171.7L33.4 -153.7L81.3 -165.8L83.3 -162.2L85.2 -158.5L86.9 -154.7L88.5 -150.8L89.9 -146.8L91.2 -142.8L92.3 -138.8L39.1 -120.3L93.9 -131.8L94.5 -127.7L95.1 -123.5L95.4 -119.3L95.6 -115.1L95.7 -110.8L95.5 -106.6L95.3 -102.4L39.9 -83.8L94.4 -95.3L93.7 -91.2L92.8 -87.1L91.7 -83L90.5 -79L89.2 -75L87.6 -71.1L86 -67.2L35.5 -49L82.8 -60.9L80.8 -57.3L78.6 -53.8L76.3 -50.4L73.8 -47.1L71.2 -43.9L68.5 -40.8L65.7 -37.8L26.5 -20.3L60.7 -33.1L57 -30.1L53.2 -27.2L49.3 -24.6L45.3 -22.2L41.2 -19.9L37 -17.9L32.7 -16.1L28.3 -14.6L0 -30L-27.2 -14.6L-31.4 -16.1L-35.5 -17.9L-39.6 -19.9L-43.6 -22.2L-47.4 -24.6L-51.2 -27.2L-54.8 -30.1L-58.3 -33.1L-25.5 -20.3L-63.2 -37.8L-65.9 -40.8L-68.5 -43.9L-71 -47.1L-73.3 -50.4L-75.6 -53.8L-77.7 -57.3L-79.6 -60.9L-34.1 -49L-82.7 -67.2L-84.3 -71.1L-85.7 -75L-87 -79L-88.2 -83L-89.2 -87.1L-90.1 -91.2L-90.8 -95.3L-38.3 -83.8L-91.6 -102.4L-91.9 -106.6L-92 -110.8L-92 -115.1L-91.8 -119.3L-91.4 -123.5L-90.9 -127.7L-90.2 -131.8L-37.6 -120.3L-88.8 -138.8L-87.7 -142.8L-86.5 -146.8L-85.1 -150.8L-83.6 -154.7L-81.9 -158.5L-80.1 -162.2L-78.2 -165.8L-32.1 -153.7L-74.6 -171.7L-72.3 -175.1L-69.8 -178.4L-67.3 -181.5L-64.6 -184.6L-61.8 -187.5L-58.9 -190.2L-55.9 -192.9L-22.4 -179.9L-50.5 -197L-43.9 -201.3L-36.9 -205L-29.7 -208.1L-22.5 -210.5L-15.3 -212.3L-8.4 -213.5L-1.7 -214ZM26.7 -179.2L26.2 -176.9L23.5 -174.7L19.8 -173.3L16.3 -173.4L14.4 -174.9L15 -177.2L17.6 -179.5L21.4 -180.8L24.9 -180.7ZM32.5 -148.9L31.9 -146.6L29.3 -144.3L25.5 -143L22 -143.1L20.2 -144.6L20.7 -146.9L23.4 -149.1L27.1 -150.4L30.6 -150.4ZM34.8 -113.3L34.3 -111L31.6 -108.8L27.8 -107.5L24.4 -107.6L22.5 -109L23 -111.3L25.7 -113.6L29.5 -114.9L33 -114.8ZM33.5 -77.1L33 -74.8L30.3 -72.6L26.5 -71.2L23 -71.3L21.2 -72.8L21.7 -75.1L24.4 -77.3L28.2 -78.7L31.6 -78.6ZM-25.9 -179.2L-24.1 -180.7L-20.6 -180.8L-16.8 -179.5L-14.2 -177.2L-13.7 -174.9L-15.5 -173.4L-19 -173.3L-22.8 -174.7L-25.4 -176.9ZM-31.4 -148.9L-29.6 -150.4L-26.1 -150.4L-22.3 -149.1L-19.7 -146.9L-19.2 -144.6L-21 -143.1L-24.5 -143L-28.3 -144.3L-30.9 -146.6ZM-33.7 -113.3L-31.9 -114.8L-28.4 -114.9L-24.6 -113.6L-21.9 -111.3L-21.4 -109L-23.3 -107.6L-26.7 -107.5L-30.5 -108.8L-33.2 -111ZM-32.4 -77.1L-30.6 -78.6L-27.1 -78.7L-23.3 -77.3L-20.7 -75.1L-20.2 -72.8L-22 -71.3L-25.5 -71.2L-29.3 -72.6L-31.9 -74.8Z\" fill-rule=\"evenodd\" class=\"v-leaf\"/><path d=\"M0 -32 Q2 -120 0 -208M0 -153.1Q27.4 -171.1 59 -181.1M0 -122.7Q35.1 -140.7 75.4 -150.7M0 -87.2Q38.2 -105.2 82.2 -115.2M0 -51Q36.5 -69 78.4 -79M0 -18.7Q30 -36.7 64.5 -46.7M0 -153.1Q-26.4 -171.1 -56.7 -181.1M0 -122.7Q-33.7 -140.7 -72.5 -150.7M0 -87.2Q-36.8 -105.2 -79 -115.2M0 -51Q-35.1 -69 -75.4 -79M0 -18.7Q-28.9 -36.7 -62.1 -46.7\" class=\"v-vein\" fill=\"none\" stroke-width=\"1.6\" stroke-linecap=\"round\"/></symbol><symbol id=\"v-palm\" viewBox=\"-20 -250 300 270\" overflow=\"visible\"><path d=\"M6.5 -33.3Q27.4 -26.1 48.2 -33.2Q27.4 -34.3 6.5 -33.3ZM10.4 -48.2Q-2.9 -61.3 -22.1 -69.3Q-7.6 -54 10.4 -48.2ZM19.4 -75.6Q50.8 -63.4 83.9 -67.1Q52.1 -73 19.4 -75.6ZM24.5 -88.1Q12 -107.3 -9.3 -121.5Q4.9 -100.1 24.5 -88.1ZM36.2 -110.7Q73.4 -90.6 114.4 -87.4Q76.5 -101 36.2 -110.7ZM42.7 -120.8Q36.7 -143.9 18.6 -164.2Q27 -138.4 42.7 -120.8ZM56.9 -138.5Q95.2 -108.7 140.1 -95.8Q100.5 -119 56.9 -138.5ZM64.7 -146.2Q69.1 -169.3 58.8 -194.5Q57.4 -167.8 64.7 -146.2ZM81.7 -159Q115.8 -119.9 159.4 -96.5Q123.4 -129.3 81.7 -159ZM90.8 -164.2Q105.4 -182.7 105.9 -209.9Q94 -186.5 90.8 -164.2ZM110.3 -172.3Q136.3 -127.5 173.6 -96.2Q145.4 -135.1 110.3 -172.3ZM120.7 -175.1Q142.1 -186.1 152.5 -210.9Q133.3 -193.9 120.7 -175.1ZM142.9 -178.2Q159.2 -133.7 187.6 -100.1Q168.9 -139.2 142.9 -178.2ZM154.7 -178.6Q177.6 -182.2 193.5 -201.5Q172 -191.6 154.7 -178.6ZM179.5 -176.9Q187.1 -138.6 206.5 -109.1Q196.6 -142.4 179.5 -176.9ZM192.6 -174.8Q212.1 -172.7 228 -186.2Q209.1 -182 192.6 -174.8ZM220 -168.3Q220.9 -142.3 232.5 -123.2Q229.5 -144.6 220 -168.3ZM234.4 -163.8Q245.3 -158.2 254.6 -166.9Q244 -166.5 234.4 -163.8ZM264.5 -152.3Q260.8 -145.3 266.1 -144Q268 -146.7 264.5 -152.3Z\" class=\"v-leaf\"/><path d=\"M6.5 -33.3Q-5.2 -44 -22.2 -49.8Q-9.4 -36.9 6.5 -33.3ZM14.7 -62.3Q43.2 -52.1 72.7 -57.3Q44 -61.3 14.7 -62.3ZM19.4 -75.6Q5.9 -93 -15.4 -105.1Q-0.4 -85.6 19.4 -75.6ZM30.1 -99.8Q65.9 -82.6 104.7 -82.1Q68.3 -92.8 30.1 -99.8ZM36.2 -110.7Q27.5 -132.8 7.7 -151.1Q18.6 -126.6 36.2 -110.7ZM49.6 -130.1Q88 -103.6 132.2 -94.1Q92.6 -114 49.6 -130.1ZM56.9 -138.5Q57.6 -162.1 44.3 -186Q46.4 -159.1 56.9 -138.5ZM73 -153Q109.1 -116.7 153.7 -96.7Q115.9 -126.5 73 -153ZM81.7 -159Q93.1 -179.5 89.9 -206.5Q81.3 -181.5 81.7 -159ZM100.3 -168.7Q129.4 -125.2 169.2 -96Q138 -133.4 100.3 -168.7ZM110.3 -172.3Q130 -185.9 137.4 -212Q120.2 -192.6 110.3 -172.3ZM131.6 -177Q151.1 -131.7 182.6 -98.2Q160.7 -138 131.6 -177ZM142.9 -178.2Q165.9 -184.2 180.6 -205.5Q159.3 -193.3 142.9 -178.2ZM166.9 -178.1Q177.1 -137.1 199.4 -105.6Q186.8 -141.5 166.9 -178.1ZM179.5 -176.9Q200.7 -176.4 217.2 -191.8Q196.9 -185.9 179.5 -176.9ZM206.1 -171.9Q209 -141.1 223 -117.7Q217.9 -143.9 206.1 -171.9ZM220 -168.3Q234.7 -163.6 247.1 -173.8Q232.9 -172.3 220 -168.3ZM249.2 -158.5Q245.3 -151.3 251 -150.2Q253 -153 249.2 -158.5ZM264.5 -152.3Q267.5 -146 269.7 -152.8Q266.9 -153.3 264.5 -152.3Z\" class=\"v-leaf2\"/><path d=\"M10.4 -48.2Q35.4 -39.7 60.9 -46.1Q35.8 -48.4 10.4 -48.2ZM14.7 -62.3Q0.9 -77.6 -19.7 -87.7Q-4.6 -70.2 14.7 -62.3ZM24.5 -88.1Q58.4 -73.5 94.5 -75.3Q60.2 -83.5 24.5 -88.1ZM30.1 -99.8Q19.3 -120.6 -1.6 -136.9Q11.3 -113.8 30.1 -99.8ZM42.7 -120.8Q80.7 -97.5 123.6 -91.4Q84.6 -108 42.7 -120.8ZM49.6 -130.1Q46.8 -153.6 30.8 -175.8Q36.2 -149.3 49.6 -130.1ZM64.7 -146.2Q102.2 -113 147.3 -96.6Q108.3 -123.2 64.7 -146.2ZM73 -153Q81 -175 74.1 -201.4Q69 -175.3 73 -153ZM90.8 -164.2Q122.6 -122.7 164.5 -96.2Q130.7 -131.5 90.8 -164.2ZM100.3 -168.7Q117.7 -184.8 121.8 -211.7Q107.1 -190.2 100.3 -168.7ZM120.7 -175.1Q143.5 -129.7 178 -96.9Q152.9 -136.6 120.7 -175.1ZM131.6 -177Q154.1 -185.5 166.9 -208.7Q146.4 -194.1 131.6 -177ZM154.7 -178.6Q167.8 -135.5 193.2 -102.6Q177.6 -140.4 154.7 -178.6ZM166.9 -178.1Q189.2 -179.6 205.7 -197Q184.6 -189.1 166.9 -178.1ZM192.6 -174.8Q197.7 -139.9 214.4 -113.1Q206.9 -143.2 192.6 -174.8ZM206.1 -171.9Q223.5 -168.4 238 -180.2Q221.1 -177.5 206.1 -171.9ZM234.4 -163.8Q233.4 -144 242.5 -130.8Q241.5 -146 234.4 -163.8ZM249.2 -158.5Q252.4 -151.9 254.4 -159.1Q251.5 -159.7 249.2 -158.5Z\" class=\"v-leaf3\"/><path d=\"M0 0Q40 -250 270 -150\" class=\"v-stem\" fill=\"none\" stroke-width=\"3\" stroke-linecap=\"round\"/></symbol><symbol id=\"v-fern\" viewBox=\"-10 -240 200 250\" overflow=\"visible\"><path d=\"M2 -23.2C5.8 -20.5 21.7 -22 24.8 -25.8C21 -28.8 5.1 -26.7 2 -23.2ZM3.8 -36C1.4 -40.6 -15.5 -47.9 -20.6 -46C-18.3 -41.2 -1.1 -34.5 3.8 -36ZM8.5 -60.4C13.5 -56.7 37.1 -56.3 42.1 -60.4C37.1 -64.5 13.5 -64.2 8.5 -60.4ZM11.5 -72.1C9 -78 -11.3 -89.9 -17.8 -88.7C-15.5 -82.5 5.2 -71.2 11.5 -72.1ZM18.7 -94.3C24 -89.4 51 -85.5 57.4 -89.4C52.2 -94.7 25 -97.8 18.7 -94.3ZM22.9 -104.9C21.2 -111.7 1.4 -127.6 -5.8 -127.1C-4.4 -120.1 16 -104.8 22.9 -104.9ZM32.6 -124.9C37.4 -119 64.8 -111.1 71.9 -114.2C67.3 -120.5 39.7 -127.6 32.6 -124.9ZM38.1 -134.4C37.7 -141.4 20.9 -160 13.6 -160.5C13.7 -153.2 31.2 -135.2 38.1 -134.4ZM50.3 -152.2C53.9 -145.7 79 -134.3 86.4 -136.4C82.9 -143.3 57.5 -153.9 50.3 -152.2ZM57.1 -160.6C58 -167.1 45.8 -186.5 39 -187.9C37.6 -181.1 50.6 -162.2 57.1 -160.6ZM71.8 -176.2C74 -169.8 94.5 -156.4 101.5 -157.5C99.5 -164.3 78.5 -177 71.8 -176.2ZM79.7 -183.4C81.9 -188.9 74.5 -206.7 68.7 -208.7C66.2 -203.1 74.3 -185.6 79.7 -183.4ZM96.9 -196.8C97.7 -191.2 112.3 -178.3 118.2 -178.8C117.7 -184.7 102.6 -197 96.9 -196.8ZM106.2 -203C108.9 -206.8 105.9 -220.7 101.3 -222.7C98.1 -218.8 101.9 -205.1 106.2 -203ZM125.9 -214.2C125.2 -210.2 132.7 -201.4 137 -202C137.9 -206.2 129.9 -214.5 125.9 -214.2ZM136.3 -219.2C139.2 -220.5 139.1 -225.4 135.7 -226.1C132.5 -224.8 133.3 -220 136.3 -219.2Z\" class=\"v-leaf\"/><path d=\"M2 -23.2C-0 -27.3 -14.5 -33 -18.8 -30.9C-16.9 -26.6 -2.2 -21.5 2 -23.2ZM5.9 -48.4C10.7 -45.1 32.2 -45.5 36.7 -49.6C31.9 -53.3 10.4 -52.1 5.9 -48.4ZM8.5 -60.4C5.9 -65.9 -13.7 -76.4 -19.8 -74.9C-17.4 -69.1 2.6 -59.3 8.5 -60.4ZM14.9 -83.4C20.2 -78.9 46.4 -76.3 52.4 -80.2C47.1 -85.2 20.8 -87 14.9 -83.4ZM18.7 -94.3C16.7 -100.9 -3.7 -115.5 -10.7 -114.8C-8.9 -108 11.9 -94 18.7 -94.3ZM27.6 -115.1C32.5 -109.5 60.1 -102.9 67.1 -106.3C62.3 -112.3 34.5 -118.1 27.6 -115.1ZM32.6 -124.9C31.8 -131.9 13.7 -149.8 6.4 -150C6.9 -142.7 25.6 -125.5 32.6 -124.9ZM44 -143.5C48 -137.1 74.1 -126.7 81.5 -129.2C77.7 -136 51.2 -145.5 44 -143.5ZM50.3 -152.2C50.9 -159 37 -178.3 30 -179.5C29.1 -172.4 43.7 -153.6 50.3 -152.2ZM64.2 -168.6C66.9 -162.1 89.1 -149.1 96.3 -150.5C93.8 -157.4 71.1 -169.6 64.2 -168.6ZM71.8 -176.2C73.5 -182 64.6 -200.7 58.4 -202.5C56.2 -196.5 66 -178.2 71.8 -176.2ZM88.1 -190.3C89.3 -184.4 106.1 -171 112.4 -171.7C111.4 -177.9 94.2 -190.7 88.1 -190.3ZM96.9 -196.8C99.6 -201.2 95.2 -216.7 90.2 -218.8C87.2 -214.3 92.3 -199 96.9 -196.8ZM115.8 -208.8C115.6 -204.1 125.8 -193.4 130.6 -193.8C131.1 -198.7 120.4 -208.9 115.8 -208.8ZM125.9 -214.2C128.7 -216.6 127.8 -225.9 124 -227.4C120.8 -225 122.4 -215.7 125.9 -214.2ZM147.2 -223.9C145.6 -221.4 148.2 -217.6 151.2 -218.7C153 -221.3 150 -224.8 147.2 -223.9Z\" class=\"v-leaf2\"/><path d=\"M3.8 -36C8.1 -33 27.2 -34.1 31 -38.1C26.6 -41.4 7.6 -39.6 3.8 -36ZM5.9 -48.4C3.4 -53.5 -15.2 -62.4 -20.8 -60.7C-18.4 -55.3 0.4 -47.1 5.9 -48.4ZM11.5 -72.1C16.7 -68 41.8 -66.6 47.3 -70.6C42.1 -75.1 17 -75.8 11.5 -72.1ZM14.9 -83.4C12.6 -89.6 -7.9 -103 -14.7 -102C-12.6 -95.5 8.3 -82.8 14.9 -83.4ZM22.9 -104.9C28.1 -99.6 55.6 -94.4 62.3 -98C57.2 -103.7 29.6 -108.1 22.9 -104.9ZM27.6 -115.1C26.3 -122 7.2 -139 -0.1 -138.9C0.9 -131.7 20.6 -115.3 27.6 -115.1ZM38.1 -134.4C42.5 -128.2 69.4 -119 76.7 -121.8C72.5 -128.4 45.3 -136.8 38.1 -134.4ZM44 -143.5C44.1 -150.4 28.6 -169.5 21.5 -170.4C21.1 -163.1 37.2 -144.6 44 -143.5ZM57.1 -160.6C60.2 -154 84 -141.7 91.3 -143.5C88.3 -150.4 64.2 -162 57.1 -160.6ZM64.2 -168.6C65.6 -174.8 55 -193.9 48.5 -195.6C46.7 -189.1 58.1 -170.4 64.2 -168.6ZM79.7 -183.4C81.4 -177.2 100.2 -163.7 106.8 -164.6C105.4 -171.1 86.2 -184 79.7 -183.4ZM88.1 -190.3C90.5 -195.3 84.7 -212.1 79.3 -214.1C76.5 -209.1 83.1 -192.5 88.1 -190.3ZM106.2 -203C106.4 -197.8 118.9 -185.8 124.3 -186.2C124.3 -191.6 111.3 -203.1 106.2 -203ZM115.8 -208.8C118.7 -211.9 116.7 -223.8 112.5 -225.6C109.3 -222.4 112 -210.6 115.8 -208.8ZM136.3 -219.2C134.9 -216.3 138.5 -211.5 141.8 -212.7C143.5 -215.8 139.4 -220.1 136.3 -219.2ZM147.2 -223.9C149.9 -224.8 150.1 -228.5 147 -229.2C144 -228.3 144.4 -224.6 147.2 -223.9Z\" class=\"v-leaf3\"/><path d=\"M0 0Q10 -170 150 -225\" class=\"v-stem\" fill=\"none\" stroke-width=\"3\" stroke-linecap=\"round\"/></symbol><symbol id=\"v-pothos\" viewBox=\"-30 -64 60 68\" overflow=\"visible\"><path d=\"M0 -5C-9 3 -29 -3 -27 -24C-25 -43 -9 -53 0 -62C9 -53 25 -43 27 -24C29 -3 9 3 0 -5Z\" class=\"v-leaf\"/><path d=\"M0 -5Q-2 -30 0 -55M0 -22Q-9 -30 -16 -32M0 -34Q8 -40 14 -44M0 -14Q9 -19 17 -19\" class=\"v-vein\" fill=\"none\" stroke-width=\"1.3\" stroke-linecap=\"round\"/></symbol><symbol id=\"v-leaf\" viewBox=\"-14 -44 28 46\" overflow=\"visible\"><path d=\"M0 0C12 -9 13 -30 0 -42C-13 -30 -12 -9 0 0Z\" class=\"v-leaf\"/><path d=\"M0 0Q1 -20 0 -37\" class=\"v-vein\" fill=\"none\" stroke-width=\"1.2\" stroke-linecap=\"round\"/></symbol><symbol id=\"v-flower\" viewBox=\"-32 -32 64 64\" overflow=\"visible\"><path d=\"M0 0C-15 -6 -17 -25 -2 -29C4 -31 14 -24 13 -14C12 -7 7 -2 0 0Z\" class=\"v-petal\" transform=\"rotate(8)\"/><path d=\"M0 0C-15 -6 -17 -25 -2 -29C4 -31 14 -24 13 -14C12 -7 7 -2 0 0Z\" class=\"v-petal\" transform=\"rotate(80)\"/><path d=\"M0 0C-15 -6 -17 -25 -2 -29C4 -31 14 -24 13 -14C12 -7 7 -2 0 0Z\" class=\"v-petal\" transform=\"rotate(152)\"/><path d=\"M0 0C-15 -6 -17 -25 -2 -29C4 -31 14 -24 13 -14C12 -7 7 -2 0 0Z\" class=\"v-petal\" transform=\"rotate(224)\"/><path d=\"M0 0C-15 -6 -17 -25 -2 -29C4 -31 14 -24 13 -14C12 -7 7 -2 0 0Z\" class=\"v-petal\" transform=\"rotate(296)\"/><circle r=\"6\" class=\"v-eye\"/><path d=\"M0 0Q6 -12 3 -24\" fill=\"none\" class=\"v-pistil\" stroke-width=\"2\" stroke-linecap=\"round\"/><circle cx=\"3\" cy=\"-25\" r=\"2.6\" class=\"v-pollen\"/><circle cx=\"7\" cy=\"-21\" r=\"1.8\" class=\"v-pollen\"/><circle cx=\"-1\" cy=\"-21\" r=\"1.8\" class=\"v-pollen\"/></symbol></defs></svg>";

  function sprite() {
    if (document.getElementById("v-monstera")) return;
    var d = document.createElement("div");
    d.setAttribute("aria-hidden", "true");
    d.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    d.innerHTML = SPRITE;
    document.body.insertBefore(d, document.body.firstChild);
  }

  /* ---------- utilidades ---------- */
  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function el(name, attrs) {
    var n = document.createElementNS(SVGNS, name);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    return n;
  }
  function r1(v) { return Math.round(v * 10) / 10; }
  function smooth(pts) {
    if (pts.length < 3) return "M" + pts.map(function (p) { return r1(p[0]) + " " + r1(p[1]); }).join("L");
    var d = "M" + r1(pts[0][0]) + " " + r1(pts[0][1]);
    for (var i = 1; i < pts.length - 1; i++) {
      var mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += "Q" + r1(pts[i][0]) + " " + r1(pts[i][1]) + " " + r1(mx) + " " + r1(my);
    }
    var l = pts[pts.length - 1];
    return d + "L" + r1(l[0]) + " " + r1(l[1]);
  }
  /* Remuestrea una polilínea cada `step` px: puntos con tangente y avance (0..1) */
  function walk(pts, step) {
    var segs = [], total = 0, i;
    for (i = 1; i < pts.length; i++) {
      var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], len = Math.sqrt(dx * dx + dy * dy);
      segs.push({ a: pts[i - 1], dx: dx, dy: dy, len: len, at: total }); total += len;
    }
    var out = [], si = 0;
    for (var s = step / 2; s < total; s += step) {
      while (si < segs.length - 1 && segs[si].at + segs[si].len < s) si++;
      var g = segs[si], t = g.len ? (s - g.at) / g.len : 0;
      out.push({ x: g.a[0] + g.dx * t, y: g.a[1] + g.dy * t, ang: Math.atan2(g.dy, g.dx) * 180 / Math.PI, p: s / total });
    }
    return out;
  }

  /* ---------- enredaderas: tallo que se traza solo, hojas alternas, zarcillos y cayenas ---------- */
  function grow(svgEl, pts, o) {
    var rand = rng(o.seed || 7);
    var stem = el("path", { d: smooth(pts), "class": "vs", "stroke-width": o.stroke || 2.4 });
    svgEl.appendChild(stem);
    var spots = walk(pts, o.gap || 26), frag = document.createDocumentFragment(), side = 1;
    var flowers = o.flowers || 0, flowerAt = [];
    for (var f = 0; f < flowers; f++) flowerAt.push(Math.floor((f + .6) / (flowers + .2) * spots.length));
    spots.forEach(function (q, i) {
      side = -side;
      var s = (o.size || .5) * (o.taper ? 1 - o.taper * q.p : 1) * (.8 + rand() * .4);
      var isFlower = flowerAt.indexOf(i) > -1;
      var ang = q.ang + side * (o.spread || 70) + (rand() - .5) * 30 + 90;
      if (o.droop) ang = ang * (1 - o.droop) + 180 * o.droop;
      var g = el("g", { "class": "vl " + (isFlower ? "vl--flower" : "c" + (1 + Math.floor(rand() * 5))), transform: "translate(" + r1(q.x) + " " + r1(q.y) + ") rotate(" + r1(ang) + ")" });
      var inner = el("g", {});
      if (isFlower) inner.appendChild(el("use", { href: "#v-flower", x: -32, y: -32, width: 64, height: 64, transform: "rotate(" + r1(rand() * 70) + ") scale(" + (Math.round((o.flowerSize || .5) * 100) / 100) + ")" }));
      else inner.appendChild(el("use", { href: rand() < .82 ? "#v-pothos" : "#v-leaf", x: -30, y: -64, width: 60, height: 68, transform: "translate(0 -3) scale(" + (Math.round(s * 100) / 100) + ")" }));
      g.appendChild(inner);
      frag.appendChild(g);
      if (!isFlower && rand() < (o.curls || .12)) {
        var a = (q.ang - side * 60) * Math.PI / 180, cx = q.x + Math.cos(a) * 14, cy = q.y + Math.sin(a) * 14;
        var c = el("path", { d: "M" + r1(q.x) + " " + r1(q.y) + "Q" + r1(cx) + " " + r1(cy) + " " + r1(cx + 6 * side) + " " + r1(cy + 4) + "T" + r1(cx + 2) + " " + r1(cy + 9) + "T" + r1(cx - 3 * side) + " " + r1(cy + 4), "class": "vs vs--thin" });
        svgEl.appendChild(c);
      }
    });
    svgEl.appendChild(frag);
  }
  function canvas(host, w, h) {
    host.innerHTML = "";
    var s = el("svg", { width: w, height: h, viewBox: "0 0 " + w + " " + h, "aria-hidden": "true", focusable: "false" });
    host.appendChild(s);
    return s;
  }
  function num(host, attr, def) { var v = Number(host.getAttribute(attr)); return isFinite(v) && v > 0 ? v : def; }
  function strand(s, x, y, len, seed, size, delay) {
    var r = rng(seed), pts = [];
    for (var d = 0; d <= len; d += 14) pts.push([x + Math.sin(d / 18 + r() * 2) * 5, y + d]);
    grow(s, pts, { seed: seed, gap: 18, size: size || .34, taper: .4, spread: 55, droop: .5, delay: delay || .9, dur: .8, stroke: 1.6 });
  }

  var VINES = {
    /* Cuelga desde el borde superior meciéndose */
    hang: function (host, seed) {
      var len = num(host, "data-len", 280), w = 120, rand = rng(seed), pts = [], ph = rand() * 6;
      if (mq("(max-width: 600px)")) len = Math.round(len * .6);
      for (var y = 0; y <= len; y += 22) pts.push([w / 2 + Math.sin(y / 46 + ph) * (8 + y * .03), y]);
      grow(canvas(host, w, len + 30), pts, { seed: seed, gap: 24, size: num(host, "data-size", .52), taper: .45, spread: 62, droop: .35, flowers: num(host, "data-flowers", 0), flowerSize: .45, curls: .18 });
    },
    /* Guirnalda que se tiende de lado a lado y deja caer hilos cortos */
    drape: function (host, seed) {
      var w = Math.max(200, Math.round(host.getBoundingClientRect().width || host.parentNode.clientWidth)), h = 110, rand = rng(seed), pts = [];
      host.style.height = h + "px";
      var sag = Math.min(46, w * .05);
      for (var x = -6; x <= w + 6; x += 24) { var t = x / w; pts.push([x, 10 + sag * 4 * t * (1 - t) + Math.sin(x / 38) * 3]); }
      var s = canvas(host, w, h);
      grow(s, pts, { seed: seed, gap: 22, size: .46, spread: 75, droop: .2, flowers: num(host, "data-flowers", 0), flowerSize: .5, curls: .1, dur: 1.6 });
      var n = Math.max(2, Math.round(w / 260));
      for (var i = 0; i < n; i++) {
        var hx = (i + .5) / n * w + (rand() - .5) * 40, ht = hx / w;
        strand(s, hx, 10 + sag * 4 * ht * (1 - ht), 40 + rand() * 40, seed + i * 31);
      }
    },
    /* Guirnalda del encabezado: ondulada a lo ancho, con hilos largos solo en los extremos */
    garland: function (host, seed) {
      var w = Math.max(320, Math.round(host.getBoundingClientRect().width || window.innerWidth)), rand = rng(seed), pts = [];
      var small = mq("(max-width: 960px)"), h = small ? 90 : 170;
      host.style.height = h + "px";
      for (var x = -10; x <= w + 10; x += 26) pts.push([x, 6 + Math.sin(x / 70 + 1) * 4 + Math.sin(x / 23) * 1.5]);
      var s = canvas(host, w, h);
      grow(s, pts, { seed: seed, gap: small ? 26 : 22, size: small ? .3 : .36, spread: 80, droop: .55, flowers: small ? 2 : Math.max(3, Math.round(w / 420)), flowerSize: small ? .3 : .38, curls: .14, dur: 1.4 });
      /* Hilos colgantes en el margen libre a los lados (no tapan el contenido) */
      var edge = small ? [.03, .97] : [.015, .045, .955, .985], len = small ? 34 : 110;
      edge.forEach(function (p, i) { strand(s, p * w, 7, len * (.55 + rand() * .45), seed + 7 + i * 13, small ? .3 : .38, 1); });
    },
    /* Trepa por el lateral izquierdo de un marco y recorre su borde superior */
    frame: function (host, seed) {
      var r = host.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height);
      if (w < 60 || h < 60) return;
      var pts = [], rand = rng(seed);
      for (var y = h + 10; y > 30; y -= 22) pts.push([8 + Math.sin(y / 30) * 6 + rand() * 2, y]);
      for (var x = 20; x < w * .62; x += 22) pts.push([x, 10 + Math.sin(x / 32) * 6]);
      grow(canvas(host, w, h + 20), pts, { seed: seed, gap: 25, size: .5, spread: 75, flowers: 1, flowerSize: .5, curls: .2 });
    },
    /* Rodea un arco: sube por la izquierda, cruza la cúpula y baja por la derecha */
    arch: function (host, seed) {
      var r = host.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height);
      if (w < 60 || h < 60) return;
      var m = 14, rad = (w - m * 2) / 2, cx = w / 2, cy = m + rad, pts = [], rand = rng(seed), y, a;
      for (y = h * .82; y > cy; y -= 20) pts.push([m + Math.sin(y / 26) * 4, y]);
      for (a = 180; a <= 360; a += 9) { var rr = rad + Math.sin(a / 14) * 4; pts.push([cx + Math.cos(a * Math.PI / 180) * rr, cy + Math.sin(a * Math.PI / 180) * rr]); }
      for (y = cy; y < h * .42; y += 20) pts.push([w - m + Math.sin(y / 26) * 4, y]);
      grow(canvas(host, w, h), pts, { seed: seed, gap: 24, size: .5 + rand() * .05, spread: 78, flowers: num(host, "data-flowers", 2), flowerSize: .56, curls: .16, dur: 2.2 });
    }
  };

  var built = [], seedN = 0;
  function buildVine(host) {
    var fn = VINES[host.getAttribute("data-vine")]; if (!fn) return;
    if (!host._seed) host._seed = 11 + (seedN++) * 97;
    try { fn(host, host._seed); } catch (e) { host.innerHTML = ""; }
  }
  var ro = null, widths = typeof WeakMap === "function" ? new WeakMap() : null, queue = [], qt = null;
  function sized(host) {
    if (!widths || !("ResizeObserver" in window)) return;
    if (!ro) ro = new ResizeObserver(function (entries) {
      entries.forEach(function (e) {
        var w = Math.round(e.contentRect.width), prev = widths.get(e.target);
        widths.set(e.target, w);
        if (prev !== undefined && Math.abs(prev - w) > 24 && queue.indexOf(e.target) < 0) queue.push(e.target);
      });
      if (!queue.length) return;
      clearTimeout(qt);
      qt = setTimeout(function () {
        queue.splice(0).forEach(function (h) {
          var wasIn = h.classList.contains("is-in");
          h.classList.remove("is-in"); buildVine(h);
          if (wasIn) requestAnimationFrame(function () { requestAnimationFrame(function () { h.classList.add("is-in"); }); });
        });
      }, 200);
    });
    widths.set(host, Math.round(host.getBoundingClientRect().width));
    ro.observe(host);
  }
  function vines(root) {
    (root || document).querySelectorAll(".vine[data-vine]").forEach(function (h) {
      if (h._built) return; h._built = true; built.push(h);
      buildVine(h);
      if (h.getAttribute("data-vine") !== "hang") sized(h);
    });
  }

  /* ---------- presets: <section data-jungle="nombre"> ---------- */
  function P(kind, cls, extra) { return [kind, cls, extra || {}]; }
  var PRESETS = {
    hero: { tone: "dark", fall: 10, pieces: [P("palm", "jz-palm-tl", { depth: -.06 }), P("palm", "jz-palm-tr", { depth: -.1 }), P("mon", "jz-mon-bl", { depth: .08 }), P("fern", "jz-fern-br", { depth: .05 }), P("vine", "jz-v-l1", { len: 290, flowers: 1 }), P("vine", "jz-v-l2", { len: 190 }), P("vine", "jz-v-r1", { len: 240 })] },
    page: { tone: "dark", cls: "jg--page", fall: 7, pieces: [P("palm", "jz-palm-tl", { depth: -.05 }), P("palm", "jz-palm-tr", { depth: -.08 }), P("fern", "jz-fern-br", { depth: .05 }), P("vine", "jz-v-r2", { len: 170, flowers: 1 }), P("vine", "jz-v-l1", { len: 140 })] },
    "light-a": { tone: "light", pieces: [P("corner", "jz-corner-tr"), P("mon", "jz-mon-l", { depth: .06 }), P("fern", "jz-fern-r", { depth: -.05 }), P("vine", "jz-v-l1", { len: 360, flowers: 1 }), P("vine", "jz-v-l2", { len: 220 })] },
    "light-b": { tone: "light", pieces: [P("mon", "jz-mon-tr", { depth: -.08 }), P("palm", "jz-palm-bl", { depth: .06 }), P("fern", "jz-fern-br"), P("edge", "jz-edge-t")] },
    "light-c": { tone: "light", pieces: [P("vine", "jz-v-r2", { len: 300 }), P("vine", "jz-v-r1", { len: 420, flowers: 1 }), P("fern", "jz-fern-bl", { depth: .05 }), P("mon", "jz-mon-r")] },
    "light-long": { tone: "light", pieces: [P("vine", "jz-v-l1", { len: 380, flowers: 1 }), P("vine", "jz-v-r1", { len: 300 }), P("vine", "jz-v-r2", { len: 200 }), P("palm", "jz-palm-r2", { depth: -.05 }), P("mon", "jz-mon-l2", { depth: .05 }), P("fern", "jz-fern-l3"), P("mon", "jz-mon-r3", { depth: .04 }), P("fern", "jz-fern-bl")] },
    "dark-a": { tone: "dark", pieces: [P("mon", "jz-mon-bl", { depth: .08 }), P("palm", "jz-palm-tr", { depth: -.06 }), P("fern", "jz-fern-br"), P("vine", "jz-v-l1", { len: 280, flowers: 1 })] },
    shade: { tone: "shade", pieces: [P("palm", "jz-palm-tl", { depth: -.08 }), P("palm", "jz-palm-br", { depth: .06 }), P("mon", "jz-mon-b", { depth: .1 })] }
  };
  var USE = { mon: "v-monstera", palm: "v-palm", fern: "v-fern" };
  function piece(p) {
    var kind = p[0], cls = p[1], x = p[2];
    if (kind === "vine") return '<span class="vine ' + cls + '" data-vine="hang" data-len="' + (x.len || 260) + '"' + (x.flowers ? ' data-flowers="' + x.flowers + '"' : "") + "></span>";
    if (kind === "corner") return '<span class="jimg jimg--corner ' + cls + '"></span>';
    if (kind === "edge") return '<span class="jimg jimg--edge ' + cls + '"></span>';
    return '<svg class="jp jp--' + kind + " " + cls + '"' + (x.depth ? ' data-depth="' + x.depth + '"' : "") + ' aria-hidden="true" focusable="false"><use href="#' + USE[kind] + '"/></svg>';
  }
  function presets(root) {
    (root || document).querySelectorAll("[data-jungle]").forEach(function (sec) {
      if (sec._jg) return; sec._jg = true;
      var pr = PRESETS[sec.getAttribute("data-jungle")]; if (!pr) return;
      if (getComputedStyle(sec).position === "static") sec.style.position = "relative";
      sec.classList.add("has-jg");
      var layer = document.createElement("div");
      layer.className = "jg tone-" + pr.tone + (pr.cls ? " " + pr.cls : "");
      layer.setAttribute("aria-hidden", "true");
      layer.innerHTML = pr.pieces.map(piece).join("");
      /* Va justo encima de los fondos propios de la sección (hijos iniciales con z-index negativo: foto, video, tinte) */
      var ref = sec.firstElementChild;
      while (ref && parseInt(getComputedStyle(ref).zIndex, 10) < 0 && !ref.classList.contains("jg")) ref = ref.nextElementSibling;
      sec.insertBefore(layer, ref);
      var nFall = sec.hasAttribute("data-jungle-fall") ? Number(sec.getAttribute("data-jungle-fall")) : pr.fall;
      if (nFall && !sec.querySelector(".fall")) {
        var f = document.createElement("div");
        f.className = "fall"; f.setAttribute("aria-hidden", "true"); f.setAttribute("data-fall", nFall);
        layer.insertAdjacentElement("afterend", f);
      }
      if (pr.tone === "dark" && sec === document.querySelector("main > section")) sec.classList.add("jg-pointer");
    });
  }

  /* ---------- setos de hierbas al pie de las secciones con data-hedge ----------
     Se usan como imagen: el navegador los dibuja una vez y solo mueve la capa (antes eran SVG en línea con cientos de plantas animadas) */
  function hedgeImg(name, flip) {
    return '<img class="hedge' + (flip ? " hedge--flip" : "") + '" src="' + (CC.base || "../") + "assets/botanical/" + name + '.svg" alt="" loading="lazy" decoding="async" draggable="false">';
  }
  function hedges(root) {
    (root || document).querySelectorAll("[data-hedge]").forEach(function (sec, i) {
      if (sec._hedge) return; sec._hedge = true;
      var dark = sec.getAttribute("data-hedge") === "dark";
      if (getComputedStyle(sec).position === "static") sec.style.position = "relative";
      sec.classList.add("has-hedge");
      var layer = document.createElement("div");
      layer.className = "hedges jg-grow" + (dark ? " hedges--dark" : "");
      layer.setAttribute("aria-hidden", "true");
      layer.innerHTML = hedgeImg(dark || i % 2 ? "hedge-a" : "hedge-b", i % 2);
      sec.appendChild(layer);
    });
  }

  /* ---------- hojas que caen y luciérnagas ---------- */
  function falls(root) {
    if (reduce) return;
    (root || document).querySelectorAll(".fall[data-fall]").forEach(function (box, k) {
      if (box._done) return; box._done = true;
      var n = num(box, "data-fall", 8), host = box.parentNode, rand = rng(97 + k * 31);
      if (mq("(max-width: 600px)")) n = Math.ceil(n / 2);
      var tones = ["#5a854a", "#436b3d", "#8fa65b", "#6e8a47", "#c9a15a"], html = "";
      for (var i = 0; i < n; i++) {
        var w = 16 + Math.round(rand() * 20);
        html += '<svg class="fall__leaf" style="left:' + Math.round(rand() * 96) + "%;width:" + w + "px;height:" + Math.round(w * 1.6) +
          "px;--lf:" + tones[i % tones.length] + ";--lv:rgba(255,248,240,.25);--o:" + (.45 + rand() * .4).toFixed(2) +
          ";--t:" + Math.round(13 + rand() * 12) + "s;--dl:-" + Math.round(rand() * 24) + "s;--dx:" + Math.round((rand() - .3) * 220) +
          "px;--rot:" + Math.round(200 + rand() * 340) + 'deg"><use href="#v-leaf"/></svg>';
      }
      box.innerHTML = html;
      function size() { var h = (host.offsetHeight + 140) + "px"; box.querySelectorAll(".fall__leaf").forEach(function (l) { l.style.setProperty("--fh", h); }); }
      size(); window.addEventListener("resize", size);
    });
  }
  function flies(root) {
    if (reduce) return;
    (root || document).querySelectorAll("[data-flies]").forEach(function (box, k) {
      if (box._done) return; box._done = true;
      var n = num(box, "data-flies", 12), rand = rng(53 + k * 17), html = "";
      if (mq("(max-width: 600px)")) n = Math.ceil(n / 2);
      for (var i = 0; i < n; i++) {
        html += '<span class="fly" style="left:' + (rand() * 100).toFixed(1) + "%;top:" + (rand() * 100).toFixed(1) + "%;--t:" + (6 + rand() * 8).toFixed(1) +
          "s;--dl:-" + (rand() * 10).toFixed(1) + "s;--fx:" + Math.round((rand() - .5) * 90) + "px;--fy:" + Math.round(-20 - rand() * 60) + "px;--o:" + (.5 + rand() * .5).toFixed(2) + '"></span>';
      }
      box.insertAdjacentHTML("beforeend", html);
    });
  }

  /* ---------- crecen al entrar en pantalla y se pausan fuera de ella ---------- */
  var io = null;
  function grow0(root) {
    var items = (root || document).querySelectorAll(".jg, .vine, .fall, .jg-grow, [data-flies]");
    if (reduce || !("IntersectionObserver" in window)) { items.forEach(function (n) { n.classList.add("is-in"); }); return; }
    if (!io) io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); e.target.classList.remove("is-off"); }
        else if (e.target.classList.contains("is-in")) e.target.classList.add("is-off");
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.01 });
    items.forEach(function (n) { if (!n._obs) { n._obs = true; io.observe(n); } });
  }

  /* ---------- paralaje: piezas con data-depth; en el hero también siguen al puntero ---------- */
  var plx = [], px = 0, py = 0, ticking = false, plxOn = false;
  function plxRun() {
    ticking = false;
    var vh = window.innerHeight, rects = new Map(), out = [];
    /* Primero se leen las posiciones (una por sección) y después se escribe: así no se fuerza el diseño en cada pieza */
    plx.forEach(function (it) {
      var r = rects.get(it.host); if (!r) { r = it.host.getBoundingClientRect(); rects.set(it.host, r); }
      if (r.bottom < -200 || r.top > vh + 200) return;
      var y = -(r.top + r.height / 2 - vh / 2) * it.d, x = 0;
      if (it.pointer) { x = px * it.d * 260; y += py * it.d * 200; }
      var v = Math.round(x) + "px " + Math.round(y) + "px";
      if (v !== it.v) { it.v = v; out.push(it); }
    });
    out.forEach(function (it) { it.n.style.translate = it.v; });
  }
  function plxReq() { if (!ticking) { ticking = true; requestAnimationFrame(plxRun); } }
  function parallax(root) {
    if (reduce) return;
    (root || document).querySelectorAll(".jp[data-depth]").forEach(function (n) {
      if (n._plx) return; n._plx = true;
      var host = n.closest("section, header, footer, .jg-host") || document.body;
      plx.push({ n: n, d: Number(n.getAttribute("data-depth")) || 0, host: host, pointer: host.classList.contains("jg-pointer") });
    });
    if (plxOn) { plxReq(); return; }
    plxOn = true;
    window.addEventListener("scroll", plxReq, { passive: true });
    window.addEventListener("resize", plxReq);
    if (mq("(hover: hover) and (pointer: fine)")) {
      document.addEventListener("pointermove", function (e) {
        var h = e.target.closest && e.target.closest(".jg-pointer"); if (!h) { if (px || py) { px = py = 0; plxReq(); } return; }
        var r = h.getBoundingClientRect();
        px = (e.clientX - r.left) / r.width - .5; py = (e.clientY - r.top) / r.height - .5; plxReq();
      }, { passive: true });
    }
    plxReq();
  }

  function init(root) {
    sprite();
    presets(root);
    hedges(root);
    vines(root);
    falls(root);
    flies(root);
    grow0(root);
    parallax(root);
  }

  CC.jungle = { init: init, sprite: sprite, vines: vines, rebuild: function (host) { buildVine(host); } };
})(window.CC = window.CC || {});
