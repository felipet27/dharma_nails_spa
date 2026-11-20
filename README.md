# Dharma Nails Spa

App web para agendar citas en Dharma Nails Spa. La clienta elige especialista, servicio, día y hora, y su cita queda registrada al instante. La confirmación llega por WhatsApp. No necesita crear una cuenta: solo da su nombre y su celular.

Se puede instalar en el celular como app (PWA) y envía notificaciones.

## Cómo funciona

### Para la clienta
1. Entra al sitio y elige a su especialista.
2. Escribe su nombre y celular.
3. Elige el servicio. Ve el precio, la duración y si requiere anticipo.
4. Elige el día y una de las horas disponibles. Solo aparecen los horarios realmente libres.
5. Elige cómo pagar (Nequi, Daviplata, QR, cuenta bancaria o efectivo) y envía la solicitud. Se abre WhatsApp con el mensaje listo para la especialista. Si el servicio pide anticipo, ahí mismo envía el comprobante.
6. En **Mis citas** consulta sus citas con su número de celular y puede cancelarlas dentro del plazo permitido.
7. Si activa los recordatorios, le llega una notificación el día de la cita.

### Para la especialista
- **Calendario**: semana o mes, con cada día dividido en horas libres, citas, pausas y ausencias.
- **Hoy**: lista de citas del día para aceptar, rechazar, completar, cancelar o marcar "No asistió". Al aceptar o cancelar se abre WhatsApp con el mensaje para la clienta.
- **Manual**: agenda a clientas que llegan al spa o que escriben por otro medio.
- **Resumen**: ingresos del día, cobrado y pendiente, método de pago y servicios más pedidos.
- **Config**:
  - Horario de atención por día, cada uno con su hora de entrada y salida y sus pausas (almuerzo, descanso).
  - Cada cuánto se ofrecen horas de inicio (15, 20, 30, 45 o 60 min).
  - Plazo para que las clientas cancelen.
  - Ausencias puntuales: días completos o unas horas.
  - Foto, redes sociales y datos de pago.
- Recibe una notificación con cada cita nueva.

### Para el administrador
- Crea las cuentas de las especialistas. Cada una define su contraseña al entrar por primera vez.
- Configura los servicios de cada especialista: nombre, precio, duración, anticipo, métodos de pago y orden. Puede agregar, ocultar o eliminar servicios.
- Activa, pausa o elimina especialistas.

## Reglas de agenda
- Cada servicio ocupa su propia duración. Cuando termina una cita, la siguiente hora queda libre.
- Un servicio nunca cruza una pausa ni se sale del horario del día.
- No se puede agendar en el pasado ni en horas ya ocupadas. El servidor vuelve a verificar cada hora antes de guardar la cita.
- Las ausencias y los cambios de horario no se pueden guardar si chocan con citas ya agendadas. La app muestra esas citas para reagendarlas.

## Mensajes de WhatsApp
Los mensajes se arman solos con los datos de la cita. En el celular llevan emojis. Desde el computador se envían en texto simple, porque WhatsApp Desktop no muestra bien los emojis que llegan por enlace.

## Tecnología
Next.js 14 · React 18 · Tailwind CSS · MongoDB · Web Push · PWA.

## Desarrollo local
```bash
npm install
cp .env.example .env.local
npm run dev
```
Con `MONGODB_URI` vacío, la app usa una base de datos temporal en memoria con datos de ejemplo. Las variables necesarias están descritas en `.env.example`.
