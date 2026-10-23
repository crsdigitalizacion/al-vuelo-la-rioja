/*
 * Al Vuelo La Rioja · datos editables
 * ------------------------------------------------------------------
 * Todo lo que aquí vale null se oculta en la web. No se ha inventado
 * ningún dato: lo que falta debe facilitarlo la empresa.
 */
window.ALVUELO = {
  phone: '629309090',                 // Publicado en la web actual
  phoneDisplay: '629 30 90 90',
  email: 'info@alvuelolarioja.com',   // Publicado en la web actual

  // WhatsApp oficial: SOLO si la empresa confirma que atiende por WhatsApp
  // en ese número. Formato internacional sin "+" ni espacios, p. ej. '34629309090'.
  whatsapp: null,

  // Endpoint del formulario (Formspree, Getform, Netlify Forms, PHP propio...).
  // Mientras sea null, "Enviar solicitud" abre el correo del visitante con la
  // solicitud ya redactada para info@alvuelolarioja.com.
  formEndpoint: null,

  // Datos legales del titular (aviso legal y privacidad). Pendientes.
  legal: {
    holder: null,     // Nombre o razón social
    taxId: null,      // NIF / CIF
    address: null,    // Domicilio fiscal
    registry: null    // Datos registrales si es sociedad
  }
};
