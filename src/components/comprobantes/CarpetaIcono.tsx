"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, Hash, Layers, UploadCloud, FileText } from "lucide-react";
import type { TipoDocumento, ArchivoSubido } from "@/types";
import { extraerNumeroConsecutivo } from "@/lib/utils";

interface CarpetaIconoProps {
  tipo: TipoDocumento;
  numArchivos: number;
  archivos?: ArchivoSubido[];
  alertaConsecutivo?: { faltantes: number[]; repetidos: number[]; presentes: number[] };
  onClick: () => void;
  onDropFiles?: (archivos: FileList) => void;
}

export function CarpetaIcono({
  tipo,
  numArchivos,
  archivos = [],
  alertaConsecutivo,
  onClick,
  onDropFiles,
}: CarpetaIconoProps) {
  const [dragOver, setDragOver] = useState(false);
  const minReq = tipo.minArchivos ?? 1;
  const esPorParejas = minReq >= 2;

  // Analizar parejas reales y consecutivos
  let numParejas = 0;
  let parejasIncompletas = 0;
  const numerosEnCarpeta: number[] = [];

  if (archivos.length > 0) {
    const grupos: Record<string, ArchivoSubido[]> = {};
    archivos.forEach((a) => {
      const gid = a.grupoId || "grupo_inicial";
      if (!grupos[gid]) grupos[gid] = [];
      grupos[gid].push(a);

      const n =
        extraerNumeroConsecutivo(a.grupoNombre || "", tipo.id) ??
        extraerNumeroConsecutivo(a.nombre, tipo.id);
      if (n !== null && !numerosEnCarpeta.includes(n)) {
        numerosEnCarpeta.push(n);
      }
    });
    const listaGrupos = Object.values(grupos);
    numParejas = listaGrupos.length;
    if (esPorParejas) {
      parejasIncompletas = listaGrupos.filter((g) => g.length === 1).length;
    }
  }

  numerosEnCarpeta.sort((a, b) => a - b);
  const rangoSecuencia =
    numerosEnCarpeta.length === 1
      ? `#${numerosEnCarpeta[0]}`
      : numerosEnCarpeta.length > 1
      ? `#${numerosEnCarpeta[0]} – #${numerosEnCarpeta[numerosEnCarpeta.length - 1]}`
      : null;

  const tieneSaltoConsecutivo =
    (alertaConsecutivo?.faltantes?.length ?? 0) > 0 ||
    (alertaConsecutivo?.repetidos?.length ?? 0) > 0;

  const estado: "vacio" | "completo" | "incompleto" =
    numArchivos === 0
      ? "vacio"
      : parejasIncompletas > 0 || numArchivos < minReq
      ? "incompleto"
      : "completo";

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDropFiles) setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (onDropFiles && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDropFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="pro-folder-3d"
      style={{ paddingTop: 18 }}
    >
      {/* Pestaña física superior de la carpeta (Folder Tab) */}
      <div
        style={{
          position: "absolute",
          top: 2,
          left: 12,
          height: 22,
          padding: "0 12px",
          borderRadius: "10px 10px 0 0",
          background: tipo.color,
          color: "#ffffff",
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: "0.06em",
          display: "flex",
          alignItems: "center",
          gap: 5,
          boxShadow: "0 -2px 6px rgba(0,0,0,0.08)",
          zIndex: 1,
        }}
      >
        <span>{tipo.label}</span>
        {numArchivos > 0 && (
          <span
            style={{
              background: "rgba(255,255,255,0.25)",
              borderRadius: 99,
              padding: "0 5px",
              fontSize: 9,
            }}
          >
            {numArchivos}
          </span>
        )}
      </div>

      {/* Badge de Estado flotante arriba a la derecha */}
      <div style={{ position: "absolute", top: 3, right: 10, zIndex: 4 }}>
        {estado === "completo" && (
          <span
            style={{
              background: "#10b981",
              color: "#fff",
              fontSize: 8.5,
              fontWeight: 800,
              padding: "2px 8px",
              borderRadius: 99,
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              boxShadow: "0 2px 6px rgba(16,185,129,0.35)",
            }}
          >
            <CheckCircle2 size={10} /> LISTO
          </span>
        )}
        {estado === "incompleto" && (
          <span
            style={{
              background: "#f59e0b",
              color: "#fff",
              fontSize: 8.5,
              fontWeight: 800,
              padding: "2px 8px",
              borderRadius: 99,
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              boxShadow: "0 2px 6px rgba(245,158,11,0.35)",
            }}
          >
            <AlertCircle size={10} /> {parejasIncompletas > 0 ? "FALTA PAREJA" : "INCOMPLETO"}
          </span>
        )}
        {estado === "vacio" && tipo.requerido && (
          <span
            style={{
              background: "#fef2f2",
              color: "#dc2626",
              fontSize: 8.5,
              fontWeight: 800,
              padding: "2px 7px",
              borderRadius: 99,
              border: "1px solid #fecaca",
            }}
          >
            OBLIGATORIO
          </span>
        )}
        {estado === "vacio" && !tipo.requerido && (
          <span
            style={{
              background: "#e2e8f0",
              color: "#475569",
              fontSize: 8.5,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 99,
            }}
          >
            OPCIONAL
          </span>
        )}
      </div>

      {/* Cuerpo trasero de la carpeta + Hojas asomándose */}
      <div
        style={{
          position: "relative",
          borderRadius: "14px 14px 16px 16px",
          background: `linear-gradient(145deg, ${tipo.color}30 0%, ${tipo.color}12 100%)`,
          border: dragOver
            ? "2px dashed #1a73e8"
            : estado === "incompleto"
            ? "1.5px solid #fbbf24"
            : estado === "completo"
            ? `1.5px solid ${tipo.color}66`
            : "1.5px solid #cbd5e1",
          paddingTop: 34,
          overflow: "hidden",
        }}
      >
        {/* Hojas de papel asomándose si tiene archivos */}
        {numArchivos > 0 ? (
          <>
            <div
              className="pro-folder-sheet-1"
              style={{
                position: "absolute",
                top: 8,
                left: 16,
                right: 36,
                height: 38,
                background: "#ffffff",
                borderRadius: "6px 6px 0 0",
                border: "1px solid #cbd5e1",
                boxShadow: "0 -2px 6px rgba(0,0,0,0.05)",
                padding: "5px 8px",
                display: "flex",
                alignItems: "center",
                gap: 5,
                zIndex: 1,
              }}
            >
              <FileText size={11} style={{ color: "#ea4335", flexShrink: 0 }} />
              <span
                style={{
                  fontSize: 8.5,
                  color: "#475569",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {archivos[0]?.nombre || "Soporte_1.pdf"}
              </span>
            </div>

            {numArchivos > 1 && (
              <div
                className="pro-folder-sheet-2"
                style={{
                  position: "absolute",
                  top: 12,
                  left: 34,
                  right: 14,
                  height: 36,
                  background: "#f8fafc",
                  borderRadius: "6px 6px 0 0",
                  border: "1px solid #cbd5e1",
                  boxShadow: "0 -2px 6px rgba(0,0,0,0.06)",
                  padding: "5px 8px",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  zIndex: 2,
                }}
              >
                <FileText size={11} style={{ color: tipo.color, flexShrink: 0 }} />
                <span
                  style={{
                    fontSize: 8.5,
                    color: "#334155",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {archivos[1]?.nombre || "Soporte_2.pdf"}
                </span>
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              position: "absolute",
              top: 9,
              left: 16,
              right: 16,
              height: 24,
              border: `1px dashed ${tipo.color}45`,
              borderRadius: "6px 6px 0 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 8.5,
              color: "#64748b",
              fontWeight: 600,
            }}
          >
            Arrastra archivos aquí
          </div>
        )}

        {/* Solapa frontal de la carpeta (Front Flap) */}
        <div
          className="pro-folder-flap"
          style={{
            position: "relative",
            zIndex: 3,
            background: "#ffffff",
            borderRadius: "12px 12px 14px 14px",
            borderTop: `3px solid ${tipo.color}`,
            padding: "12px 14px 11px",
            boxShadow: "0 -3px 10px rgba(15, 23, 42, 0.06)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {/* Título de la Clasificación */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
              <p
                style={{
                  margin: 0,
                  fontWeight: 800,
                  fontSize: 13,
                  color: "#0f172a",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={tipo.nombre}
              >
                {tipo.nombre}
              </p>
            </div>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 10.5,
                color: "#64748b",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={tipo.descripcion}
            >
              {tipo.descripcion}
            </p>
          </div>

          {/* Chip de Secuencia / Consecutivo */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", minHeight: 20 }}>
            {rangoSecuencia ? (
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 800,
                  fontFamily: "monospace",
                  color: tieneSaltoConsecutivo ? "#b45309" : "#0f172a",
                  background: tieneSaltoConsecutivo ? "#fef3c7" : "#f1f5f9",
                  border: `1px solid ${tieneSaltoConsecutivo ? "#fde68a" : "#e2e8f0"}`,
                  borderRadius: 6,
                  padding: "1px 6px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <Hash size={9} style={{ color: tipo.color }} /> {rangoSecuencia}
              </span>
            ) : (
              <span style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 600 }}>
                Sin numeración aún
              </span>
            )}

            {tieneSaltoConsecutivo && (
              <span
                style={{
                  fontSize: 8.5,
                  fontWeight: 800,
                  background: "#fee2e2",
                  color: "#dc2626",
                  border: "1px solid #fca5a5",
                  borderRadius: 6,
                  padding: "1px 5px",
                }}
              >
                ⚠ Salto
              </span>
            )}
          </div>

          {/* Footer con conteo de parejas/archivos */}
          <div
            style={{
              paddingTop: 7,
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 10.5,
              color: "#475569",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
              <Layers size={11} style={{ color: tipo.color }} />
              {numArchivos === 0
                ? "0 archivos"
                : esPorParejas && numParejas > 0
                ? `${numParejas} pareja${numParejas !== 1 ? "s" : ""} · ${numArchivos} arch.`
                : `${numArchivos} archivo${numArchivos !== 1 ? "s" : ""}`}
            </span>
            <span style={{ fontWeight: 800, color: tipo.color, fontSize: 11 }}>
              Abrir →
            </span>
          </div>
        </div>

        {/* Overlay de Drag & Drop */}
        {dragOver && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              background: "rgba(26, 115, 232, 0.93)",
              color: "#ffffff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.4,
            }}
          >
            <UploadCloud size={26} />
            <span>SOLTAR EN {tipo.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
