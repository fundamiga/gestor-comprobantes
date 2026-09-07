import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { ChatAsistente } from "@/components/Asistente/ChatAsistente";

export const metadata: Metadata = {
  title: "Gestor de Comprobantes — Fundamiga",
  description: "Organización de comprobantes contables por período y proveedor",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {children}
        <ChatAsistente />
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}
