"use client";

import { useState } from "react";
import { ArrowLeft, Building2, AlertCircle, CheckCircle, CheckCircle2, Info, FileDown } from "lucide-react";
import type { Lote, Periodo, ArchivoSubido } from "@/types";
import { TIPOS_DOCUMENTO, MESES } from "@/lib/constantes";
import { calcularEstadoLote, analizarConsecutivos } from "@/lib/utils";
import { EstadoBadge, VisorArchivo } from "./UIComunes";
import { TipoDocCard } from "./TipoDocCard";
import { motion } from "framer-motion";

interface VistaLoteProps {
  lote: Lote;
  periodo: Periodo;
  onAgregarArchivo: (tipoId: string, archivo: ArchivoSubido) => void;
  onEliminarArchivo: (tipoId: string, archivoId: string) => void;
  onActualizarArchivosDoc: (tipoId: string, nuevosArchivos: ArchivoSubido[]) => void;
  onVolver: () => void;
}

export function VistaLote({
  lote,
  periodo,
  onAgregarArchivo,
  onEliminarArchivo,
  onActualizarArchivosDoc,
  onVolver,
}: VistaLoteProps) {
  const [visorArchivo, setVisorArchivo] = useState<ArchivoSubido | null>(null);
  const estado = calcularEstadoLote(lote);
  const requeridos = TIPOS_DOCUMENTO.filter((t) => t.requerido);
  const faltantes = requeridos.filter(
    (t) => !(lote.documentos[t.id] ?? []).length
  );

  const mesLabel = `${MESES[periodo.mes]} ${periodo.anio}`;

  const alertasConsecutivos = analizarConsecutivos(periodo);
  const hayDatosConsecutivos = Object.keys(alertasConsecutivos).length > 0;

  const handleDescargarLote = async () => {
    const todosArchivos = TIPOS_DOCUMENTO.flatMap(
      (tipo) => lote.documentos[tipo.id] ?? []
    );
    if (todosArchivos.length === 0) {
      alert("No hay archivos subidos en este lote para descargar.");
      return;
    }
    const { combinarYDescargarPdf } = await import("@/lib/pdfMerger");
    await combinarYDescargarPdf(
      todosArchivos,
      `${lote.proveedor.replace(/\s+/g, "_")}_Lote_Completo`
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {visorArchivo && (
        <VisorArchivo
          archivo={visorArchivo}
          onClose={() => setVisorArchivo(null)}
        />
      )}

      {/* Header sticky */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #f1f5f9",
          padding: "14px 24px",
          position: "sticky",
          top: 0,
          zIndex: 10,
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <button
          onClick={onVolver}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#64748b",
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 10,
            padding: 0,
            fontFamily: "inherit",
          }}
        >
          <ArrowLeft size={14} /> Volver a {mesLabel}
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                background: "#d1fae5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Building2 size={22} style={{ color: "#10b981" }} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2
                style={{
                  margin: 0,
                  fontWeight: 900,
                  fontSize: 18,
                  color: "#0f172a",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {lote.proveedor}
              </h2>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 3,
                  flexWrap: "wrap",
                }}
              >
                {lote.referencia && (
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>
                    Ref: {lote.referencia}
                  </span>
                )}
                <EstadoBadge estado={estado} />
              </div>
            </div>
          </div>

          {/* Botón Descargar Lote */}
          <button
            onClick={handleDescargarLote}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "9px 18px",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 12,
              fontFamily: "inherit",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
              transition: "all 0.2s",
            }}
          >
            <FileDown size={15} /> Descargar Lote (PDF)
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ padding: "20px 24px", maxWidth: 680, margin: "0 auto" }}>
        {/* Alerta faltantes */}
        {faltantes.length > 0 && (
          <div
            style={{
              background: "#fef3c7",
              border: "1.5px solid #fde68a",
              borderRadius: 14,
              padding: "14px 18px",
              marginBottom: 18,
              display: "flex",
              gap: 12,
            }}
          >
            <AlertCircle
              size={18}
              style={{ color: "#d97706", flexShrink: 0, marginTop: 1 }}
            />
            <div>
              <p
                style={{
                  margin: 0,
                  fontWeight: 800,
                  fontSize: 13,
                  color: "#92400e",
                }}
              >
                Faltan {faltantes.length} documento
                {faltantes.length > 1 ? "s" : ""} requerido
                {faltantes.length > 1 ? "s" : ""}
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: 6,
                }}
              >
                {faltantes.map((t) => (
                  <span
                    key={t.id}
                    style={{
                      background: "#fff",
                      border: "1px solid #fde68a",
                      borderRadius: 6,
                      padding: "2px 8px",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#92400e",
                    }}
                  >
                    {t.label} — {t.nombre}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Éxito */}
        {estado === "completo" && (
          <div
            style={{
              background: "#d1fae5",
              border: "1.5px solid #6ee7b7",
              borderRadius: 14,
              padding: "14px 18px",
              marginBottom: 18,
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <CheckCircle size={18} style={{ color: "#10b981" }} />
            <p
              style={{
                margin: 0,
                fontWeight: 800,
                fontSize: 13,
                color: "#065f46",
              }}
            >
              ¡Todos los documentos requeridos están cargados!
            </p>
          </div>
        )}

        {/* Nota informativa */}
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "11px 15px",
            marginBottom: 18,
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <Info size={14} style={{ color: "#64748b", marginTop: 1, flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>
            Los documentos <strong>CC-9, DS, CC-6 y CC-10</strong> son obligatorios.
            <strong> FV</strong> y <strong>CC-1</strong> son opcionales según el tipo de gasto.
          </p>
        </div>

        {/* Cards de tipos de documento */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {TIPOS_DOCUMENTO.map((tipo) => (
            <TipoDocCard
              key={tipo.id}
              tipo={tipo}
              archivos={lote.documentos[tipo.id] ?? []}
              onAgregar={(arch) => onAgregarArchivo(tipo.id, arch)}
              onEliminar={(id) => onEliminarArchivo(tipo.id, id)}
              onActualizarArchivos={(nuevosArchs) => onActualizarArchivosDoc(tipo.id, nuevosArchs)}
              onVer={setVisorArchivo}
              nombreProveedor={lote.proveedor}
              alertaConsecutivo={alertasConsecutivos[tipo.id]}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
