import { NextResponse } from "next/server";

export function ok(data = {}, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Envuelve un handler para capturar errores (incluye los de requireRole con .status)
export function handler(fn) {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      // Datos mal formados del cliente (JSON roto, id inválido, tipo
      // incorrecto): es un 400, no un error del servidor.
      if (e instanceof SyntaxError || e?.name === "CastError" || e?.name === "ValidationError") {
        return fail("Datos inválidos", 400);
      }
      const status = e.status || 500;
      if (status === 500) {
        console.error(e);
        const mensaje =
          process.env.NODE_ENV === "production"
            ? "Ha ocurrido un error inesperado. Intenta de nuevo más tarde."
            : e.message || "Error interno";
        return fail(mensaje, 500);
      }
      return fail(e.message || "Error interno", status);
    }
  };
}
