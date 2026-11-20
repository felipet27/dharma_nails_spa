import "./globals.css";
import { Inter, Cormorant_Garamond } from "next/font/google";
import InstallPrompt from "@/components/InstallPrompt";
import DialogProvider from "@/components/DialogProvider";
import BrandProvider from "@/components/BrandProvider";
import { BRANDS, MARCA_DEFAULT, cssDeMarcas, scriptMarcaInicial } from "@/lib/brands";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});
// Títulos: serif elegante acorde a la identidad del spa.
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

// Metadata del servidor (lo que ven buscadores y la primera carga). En el
// navegador, BrandProvider ajusta el título según la página.
const MARCA_INICIAL = BRANDS[MARCA_DEFAULT];

export const metadata = {
  title: `${MARCA_INICIAL.nombre} — ${MARCA_INICIAL.textos.hero}`,
  description: `${MARCA_INICIAL.nombre}. ${MARCA_INICIAL.textos.hero} Agenda tu cita de uñas y spa en segundos, sin llamadas.`,
  // Permite que iOS trate la web como app (pantalla completa) al agregarla a
  // la pantalla de inicio.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: MARCA_INICIAL.nombre,
  },
  icons: {
    icon: [{ url: MARCA_INICIAL.favicon, type: "image/png" }],
    apple: [{ url: MARCA_INICIAL.iconoApple, sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  themeColor: BRANDS[MARCA_DEFAULT].colores.brand,
  width: "device-width",
  initialScale: 1,
  // Necesario para que env(safe-area-inset-*) funcione en iPhone con notch.
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    // suppressHydrationWarning: el script de <head> pone data-brand antes de
    // que React hidrate, así que el atributo difiere del HTML del servidor.
    <html lang="es" data-brand={MARCA_DEFAULT} className={`${inter.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: cssDeMarcas() }} />
        <script dangerouslySetInnerHTML={{ __html: scriptMarcaInicial() }} />
      </head>
      <body>
        <BrandProvider>
          <DialogProvider>
            {children}
            <InstallPrompt />
          </DialogProvider>
        </BrandProvider>
      </body>
    </html>
  );
}
