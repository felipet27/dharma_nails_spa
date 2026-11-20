import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Dharma Nails Spa — Agenda tu cita en línea";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Imagen para compartir en redes / WhatsApp. Colores tomados del logo.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#13241d",
          backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(200,149,74,0.28) 0%, transparent 60%)",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", fontSize: 96, letterSpacing: 2 }}>
          <span style={{ color: "#d4a55e" }}>Dharma</span>
          <span style={{ color: "#faf7f2", marginLeft: 28 }}>Nails Spa</span>
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 40, color: "rgba(250,247,242,0.85)", fontFamily: "sans-serif" }}>
          Tu momento de calma, sin filas ni esperas.
        </div>
        <div style={{ display: "flex", marginTop: 16, fontSize: 30, color: "#8fae9a", fontFamily: "sans-serif" }}>
          Agenda en línea · Confirmación por WhatsApp
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 14,
            display: "flex",
            backgroundImage: "linear-gradient(90deg,#1f4a3a 0%,#8fae9a 35%,#c8954a 70%,#9a6332 100%)",
          }}
        />
      </div>
    ),
    size
  );
}
