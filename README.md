# Al Vuelo La Rioja · nueva web

Web estática (HTML, CSS y JavaScript sin dependencias ni proceso de compilación). Se publica subiendo la carpeta completa al hosting de `www.alvuelolarioja.com`.

```
index.html                     Portada: hero con vídeo, «Ven, siéntate y vuela», experiencia,
                               reserva, piloto y confianza, pasos, contacto
que-es-un-paratrike.html       Paratrike, equipo, piloto y condiciones del vuelo
regalo-parapente-la-rioja.html Vale regalo (mantiene la URL de la web anterior)
vuelos.html                    Vuelos y precios: tarjetas 3D, extra de vídeo y condiciones
preguntas-frecuentes.html      Preguntas frecuentes (12)
galeria.html                   Galería: 22 fotos con visor ampliado y 12 vídeos de YouTube
aviso-legal.html, privacidad.html, cookies.html, 404.html
*.html (8 pequeñas)            Redirecciones desde las URLs de la web anterior (también en .htaccess)
assets/css/styles.css          Estilos (tokens de color, tipografía y espaciado al principio)
assets/js/config.js            DATOS EDITABLES: WhatsApp (34629309090) y su mensaje preparado, endpoint del formulario, datos legales
assets/js/chat.js              Asistente de preguntas (círculo abajo a la derecha): respuestas en la lista INTENTS
assets/js/main.js              Interacción (menú, vídeo, parallax, tarjetas 3D, reserva, galería)
assets/img/                    Imágenes WebP en varios tamaños, logotipos e iconos
assets/video/                  Vídeo del hero (720p)
assets/docs/                   Vale regalo imprimible (el PDF original de la empresa)
assets/fonts/                  Instrument Serif y Manrope, autoalojadas
.htaccess, robots.txt, sitemap.xml, site.webmanifest, favicon.svg
```

## Portada en 3D (rama `rediseno-3d`)

La portada (`index.html`) es un vuelo continuo de amanecer a ocaso. Archivos nuevos:

```
assets/css/vuelo.css   Estilos de la portada (tokens de color al principio). Las demás páginas siguen con styles.css
assets/js/sky3d.js     Cielo 3D en WebGL puro, sin librerías: sierras, mar de nubes y la vela amarilla y carmesí.
                       La luz, la altitud y la posición de la vela de cada sección están en SCENES
                       (cada sección lleva data-scene="...")
assets/js/vuelo.js     Efectos de scroll: título letra a letra, vídeo que se abre, «Ven, siéntate y vuela»,
                       lugares en 3D, ruta de los pasos, aterrizaje y altímetro lateral
```

`main.js`, `config.js` y `chat.js` se reutilizan sin cambios (menú, reserva, WhatsApp y asistente).
Sin WebGL se ve un degradado de cielo; con «reducir movimiento» activado no hay animaciones de desplazamiento.

## Vista previa online

La web se puede ver en GitHub Pages: https://crsdigitalizacion.github.io/al-vuelo-la-rioja/
Se actualiza sola en uno o dos minutos cada vez que se suben cambios a la rama `main`. En esa dirección la web lleva `noindex` (no aparece en Google) para no competir con el dominio real; en alvuelolarioja.com no se aplica.

Tras cambiar CSS o JS, sube el número `?v=` de los enlaces en todos los HTML para que los navegadores no usen la versión en caché.

## Datos utilizados (todos publicados en la web actual alvuelolarioja.com)

- Teléfono 629 30 90 90 (Miguel Ángel), info@alvuelolarioja.com, horario de reservas de lunes a domingo de 9:00 a 20:00.
- Registro en Turismo La Rioja: TA-LR-32.
- Piloto Miguel Ángel Ordóñez Molina: primer vuelo en 1994, 7 años de vuelo libre en parapente, piloto PL2 (trike biplaza con motor), más de 1.500 horas de vuelo, ruta Ferrol–Bilbao.
- Equipo: trike Airfer C2, motor Rotax de 500 cc, equipo homologado (trike, parapente, paracaídas de emergencia, cascos con intercomunicador), titulaciones y seguro de responsabilidad civil y de accidentes. Autonomía de unas 2 h 30 min a unos 50 km/h.
- Tarifas: vuelo de 20 min 85 €, vuelo de 40 min 130 €, vídeo y fotos +15 €; vuelos a la carta con presupuesto. Zona de vuelo: inmediaciones de Logroño.
- Vale regalo: una persona, sin caducidad, válido una vez abonado, sujeto a meteorología, 20 o 40 minutos.
- Condiciones: ropa, prohibido llevar cámaras y móviles, horas habituales de vuelo, la empresa puede modificar la ruta o cancelar.
- Fotografías reales y los 12 vídeos de YouTube de la web anterior; Facebook y YouTube.

## Pendiente de confirmar con la empresa (no se ha inventado nada)

| Dato | Dónde se cambia | Estado actual en la web |
|---|---|---|
| **Precios vigentes** | `vuelos.html` (tarjetas), `index.html` (`data-price` del formulario, JSON-LD), `preguntas-frecuentes.html` y `regalo-parapente-la-rioja.html` | Los publicados en la web actual (85 € / 130 € / +15 €). Esa página parece antigua (contiene una oferta de septiembre de 2014): **confirmar antes de publicar**. La web indica «el precio final se confirma al cerrar la reserva». |
| Datos legales (titular, NIF, domicilio) | `config.js` → `legal` | Las páginas legales muestran «pendiente de publicación». **Obligatorio antes de publicar.** |
| Endpoint del formulario | `config.js` → `formEndpoint` | Sin servidor: «Enviar solicitud» abre el correo del visitante con la solicitud ya redactada para info@alvuelolarioja.com. Con un endpoint (Formspree, Getform, PHP propio…) se envía directamente. |
| Límites de edad / menores, peso | Preguntas frecuentes | Se indica lo que publica la empresa («cualquier edad o condición física») y se pide consultar los casos particulares al reservar. |
| Lugar exacto de despegue | Preguntas frecuentes y contacto | «Lugar de salida habitual en las inmediaciones de Logroño, te lo indicamos al confirmar la reserva». |
| Instagram u otras redes | Pie de página | Solo Facebook y YouTube (los enlazados en la web actual). Comprobar que la página de Facebook sigue activa. |

## Créditos

- Fotografías, logotipos, vídeos y vale regalo: Al Vuelo La Rioja (web actual y canal de YouTube).
- Vídeo del hero: tramo de 15 s del vídeo «Noja 2» del canal de YouTube de Miguel Ángel Ordóñez (vuelo en paratrike sobre la playa de Noja, Cantabria), recortado, sin sonido y comprimido a 720p. Si tienen el archivo original, se puede regenerar con más calidad, o sustituir por un vuelo en La Rioja.
- Iconos: dibujados al estilo de Lucide (licencia ISC).
- Tipografías: Instrument Serif y Manrope (SIL Open Font License).
