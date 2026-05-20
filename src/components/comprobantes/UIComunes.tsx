"use client";

import { X, Download, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import type { ArchivoSubido, EstadoLote } from "@/types";
import { colorEstado, labelEstado, obtenerUrlDescargaCloudinary } from "@/lib/utils";

// ── EstadoBadge ───────────────────────────────────────────────────────────────
interface EstadoBadgeProps {
  estado: EstadoLote;
  size?: "sm" | "md";
}

export function EstadoBadge({ estado, size = "sm" }: EstadoBadgeProps) {
  const paleta: Record<EstadoLote, { bg: string; text: string }> = {
    completo:   { bg: "#d1fae5", text: "#065f46" },
    incompleto: { bg: "#fef3c7", text: "#92400e" },
    vacio:      { bg: "#f1f5f9", text: "#64748b" },
  };
  const iconos: Record<EstadoLote, React.ElementType> = {
    completo:   CheckCircle,
    incompleto: AlertCircle,
    vacio:      XCircle,
  };
  const { bg, text } = paleta[estado];
  const Icono = iconos[estado];
  const dotColor = colorEstado(estado);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: bg,
        color: text,
        borderRadius: 999,
        padding: size === "sm" ? "2px 10px" : "4px 14px",
        fontSize: size === "sm" ? 10 : 12,
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      <Icono size={size === "sm" ? 10 : 12} style={{ color: dotColor }} />
      {labelEstado(estado)}
    </span>
  );
}

// ── VisorArchivo ──────────────────────────────────────────────────────────────
interface VisorArchivoProps {
  archivo: ArchivoSubido | null;
  onClose: () => void;
}

export function VisorArchivo({ archivo, onClose }: VisorArchivoProps) {
  if (!archivo) return null;
  const esPDF = archivo.tipo === "application/pdf";
  const src = archivo.url;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          overflow: "hidden",
          maxWidth: "92vw",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 40px 100px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px",
            borderBottom: "1px solid #f1f5f9",
            background: "#f8fafc",
            gap: 12,
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: 13,
              color: "#334155",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {archivo.nombre}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, overflow: "auto", minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {!src ? (
             <p style={{ color: "#94a3b8", fontWeight: 600 }}>Cargando archivo...</p>
          ) : esPDF ? (
            <iframe
              src={src}
              style={{ width: "75vw", height: "75vh", border: "none" }}
              title={archivo.nombre}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={archivo.nombre}
              style={{
                maxWidth: "80vw",
                maxHeight: "75vh",
                objectFit: "contain",
                display: "block",
              }}
            />
          )}
        </div>

        <div
          style={{
            padding: "10px 20px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          {src && (
            <a
              href={obtenerUrlDescargaCloudinary(src)}
              download={archivo.nombre}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "#10b981",
                color: "#fff",
                borderRadius: 10,
                padding: "7px 18px",
                fontWeight: 700,
                fontSize: 12,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Download size={14} /> Descargar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
