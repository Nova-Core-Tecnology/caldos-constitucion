/* Configuración del sitio. Todo dato de contacto vive aquí (un solo lugar).
   Los valores null se omiten en la interfaz hasta que el restaurante los confirme. */
(function (CC) {
  "use strict";
  CC.config = {
    name: "Caldos Constitución And Restaurant",
    tagline: "Una experiencia única",
    city: "San Cristóbal, República Dominicana",
    // Ubicación actualizada: Dios Batidas, junto al Parque Piedras Vivas.
    venue: "Dios Batidas",
    address: "Dios Batidas, frente al Parque Piedras Vivas, San Cristóbal, República Dominicana",
    addressShort: "Dios Batidas, frente al Parque Piedras Vivas",
    mapQuery: "Dios Batidas, Parque Piedras Vivas, San Cristóbal, República Dominicana",
    // Número de WhatsApp del proyecto original (formato internacional, sin +). PENDIENTE de confirmar.
    whatsapp: "18098616185",
    whatsappDisplay: "+1 (809) 861-6185",
    email: null,        // sin correo verificado
    hours: null,        // sin horario verificado; ej.: [{ days: "Lunes a sábado", time: "9:00 a. m. – 10:00 p. m." }]
    currency: "RD$",
    social: [
      { key: "instagram", label: "Instagram", url: "https://www.instagram.com/caldosconstitucionrd/" },
      { key: "facebook", label: "Facebook", url: "https://web.facebook.com/CaldosConstitucionRD/" },
      { key: "tiktok", label: "TikTok", url: "https://www.tiktok.com/@caldosconstitucionrd" }
    ]
  };
})(window.CC = window.CC || {});
