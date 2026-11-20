import { dbConnect } from "@/lib/db";
import PushSubscription from "@/models/PushSubscription";
import { ok, fail, handler } from "@/lib/api";
import { esTexto } from "@/lib/validaciones";

// POST /api/push/cliente/unsubscribe -> elimina la suscripción de este dispositivo.
export const POST = handler(async (req) => {
  await dbConnect();
  const { endpoint } = await req.json();
  if (!esTexto(endpoint)) return fail("Falta el endpoint", 400);

  await PushSubscription.deleteOne({ endpoint, ownerRole: "cliente" });
  return ok({ ok: true });
});
