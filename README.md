# Dharma Nails Spa

App de citas en línea de **Dharma Nails Spa**. La clienta escoge su especialista, el servicio, el día y la hora, y recibe la confirmación por WhatsApp. No necesita crear cuenta: basta con su nombre y su celular.

- Instagram: [@dharma.nails.spa](https://www.instagram.com/dharma.nails.spa/)
- WhatsApp: 311 391 2426

---

## Para la clienta

- Agenda con su especialista favorita sin crear cuenta.
- Ve la disponibilidad en tiempo real.
- Recibe confirmación por WhatsApp y puede consultar o cancelar en **Mis citas**.
- Puede pagar anticipos por Nequi, Daviplata, QR o cuenta bancaria.

## Para la especialista

- Panel con calendario semanal, lista del día y resumen de ingresos.
- Acepta, rechaza o completa citas; la clienta recibe aviso por WhatsApp.
- Agenda citas manuales y configura su horario, almuerzo y ausencias.
- Recibe notificaciones push con cada cita nueva.

## Para el administrador

- Crea y gestiona especialistas, sus servicios (planes) y precios.
- Controla el estado de cada cuenta.

---

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # y completar los valores
npm run dev
```

Si `MONGODB_URI` queda vacío, la app arranca un MongoDB en memoria con datos de ejemplo.
Con la base real de Atlas usa `ALLOW_SEED=false`.

Crear o cambiar la contraseña del administrador:

```bash
MONGODB_URI="..." ADMIN_EMAIL="..." ADMIN_PASSWORD="..." node scripts/crear-admin.mjs
```

## Despliegue (Vercel)

1. Importar el repo `felipet27/dharma_nails_spa` en Vercel.
2. Copiar las variables de `.env.local` a *Settings → Environment Variables*, cambiando
   `NEXT_PUBLIC_BASE_URL` por la URL pública.
3. En MongoDB Atlas → *Network Access*, permitir `0.0.0.0/0` (Vercel no tiene IP fija).

## Tecnología

Next.js 14 · React 18 · Tailwind CSS · MongoDB Atlas · WhatsApp (`wa.me`) · Web Push (VAPID) · PWA instalable · Vercel.

Basado en la plataforma CitasApp.
