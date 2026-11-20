// Enlace "¿Quieres esta app?" hacia el Instagram de CitasApp, la plataforma con
// la que está hecha la app del spa.
export const INSTAGRAM_CITASAPP = "https://www.instagram.com/citasapp.co/";

export default function ContactoAdmin({ className = "hover:text-white", label = "¿Quieres esta app para tu negocio?" }) {
  return (
    <a href={INSTAGRAM_CITASAPP} target="_blank" rel="noopener noreferrer" className={className}>
      {label} <span className="font-semibold">@citasapp.co</span>
    </a>
  );
}
