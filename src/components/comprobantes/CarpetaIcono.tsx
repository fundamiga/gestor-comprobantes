"use client";

import { useState } from "react";
import { Folder, FolderOpen, CheckCircle2, AlertCircle, Hash, Layers, UploadCloud } from "lucide-react";
import type { TipoDocumento, ArchivoSubido } from "@/types";
import { extraerNumeroConsecutivo } from "@/lib/utils";
import { motion } from "framer-motion";

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
  const [hovered, setHovered] = useState(false);
  const minReq = tipo.minArchivos ?? 1;
  const esPorParejas = minReq >= 2;

  // Analizar parejas reales si tenemos la lista de archivos
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

  const etiquetaCategoria =
    tipo.categoria === "comprobantes"
      ? "Comprobante"
      : tipo.categoria === "bancos"
      ? "Bancos"
      : tipo.categoria === "caja"
      ? "Caja"
      : "General";

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
    <motion.div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      whileHover={{ y: -3, boxShadow: "0 10px 24px -4px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.06)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="drive-folder-card"
      style={{
        background: dragOver ? "#e8f0fe" : "#ffffff",
        border: dragOver
          ? "2px dashed #1a73e8"
          : estado === "incompleto"
          ? "1.5px solid #fbbf24"
          : estado === "completo"
          ? `1.5px solid ${tipo.color}55`
          : "1.5px solid #e2e8f0",
        borderRadius: 16,
        padding: 0,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        userSelect: "none",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      {/* Barra superior de acento de color de clasificación */}
      <div
        style={{
          height: 4,
          width: "100%",
          background:
            estado === "completo"
              ? `linear-gradient(90deg, ${tipo.color}, #10b981)`
              : estado === "incompleto"
              ? "linear-gradient(90deg, #f59e0b, #ea580c)"
              : `${tipo.color}40`,
        }}
      />

      {/* Thumbnail superior estilo Google Drive Pro */}
      <div
        style={{
          height: 88,
          background: `linear-gradient(155deg, ${tipo.color}16 0%, ${tipo.color}05 100%)`,
          borderBottom: `1px solid ${tipo.color}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* Etiqueta de clasificación esquina superior izquierda */}
        <span
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            fontSize: 8.5,
            fontWeight: 800,
            color: tipo.color,
            background: "#ffffffd9",
            border: `1px solid ${tipo.color}30`,
            padding: "2px 7px",
            borderRadius: 6,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {etiquetaCategoria}
        </span>

        {/* Ícono dinámico de carpeta */}
        {hovered ? (
          <FolderOpen
            size={42}
            style={{
              color: tipo.color,
              fill: `${tipo.color}28`,
              strokeWidth: 1.6,
              transition: "transform 0.15s ease",
              transform: "scale(1.06)",
            }}
          />
        ) : (
          <Folder
            size={42}
            style={{
              color: tipo.color,
              fill: estado === "vacio" ? `${tipo.color}12` : `${tipo.color}30`,
              strokeWidth: 1.6,
            }}
          />
        )}

        {/* Badge de estado en la esquina superior derecha */}
        <div style={{ position: "absolute", top: 8, right: 8 }}>
          {estado === "completo" && (
            <span
              style={{
                background: "#10b981",
                color: "#fff",
                fontSize: 8.5,
                fontWeight: 800,
                padding: "2px 7px",
                borderRadius: 99,
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                boxShadow: "0 2px 5px rgba(16,185,129,0.28)",
              }}
            >
              <CheckCircle2 size={10} /> COMPLETO
            </span>
          )}
          {estado === "incompleto" && (
            <span
              style={{
                background: "#f59e0b",
                color: "#fff",
                fontSize: 8.5,
                fontWeight: 800,
                padding: "2px 7px",
                borderRadius: 99,
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                boxShadow: "0 2px 5px rgba(245,158,11,0.3)",
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
                background: "#f1f5f9",
                color: "#64748b",
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

        {/* Chip de Rango de Secuencia (abajo en el thumbnail) */}
        {rangoSecuencia && (
          <div
            style={{
              position: "absolute",
              bottom: 6,
              left: 8,
              right: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 4,
            }}
          >
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 800,
                fontFamily: "monospace",
                color: tieneSaltoConsecutivo ? "#b45309" : "#334155",
                background: tieneSaltoConsecutivo ? "#fef3c7" : "rgba(255,255,255,0.92)",
                border: `1px solid ${tieneSaltoConsecutivo ? "#fde68a" : "#e2e8f0"}`,
                borderRadius: 6,
                padding: "1px 6px",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
              title="Secuencia de consecutivos en esta carpeta"
            >
              <Hash size={9} /> {rangoSecuencia}
            </span>
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
                title="Hay saltos o repetidos en la secuencia de este documento"
              >
                ⚠ Secuencia
              </span>
            )}
          </div>
        )}

        {/* Overlay de soltar archivos */}
        {dragOver && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(26,115,232,0.93)",
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.3,
            }}
          >
            <UploadCloud size={22} />
            <span>SOLTAR EN {tipo.label}</span>
          </div>
        )}
      </div>

      {/* Información inferior de la carpeta */}
      <div style={{ padding: "11px 13px 12px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 3 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  color: tipo.color,
                  background: `${tipo.color}15`,
                  padding: "1px 7px",
                  borderRadius: 6,
                  flexShrink: 0,
                }}
              >
                {tipo.label}
              </span>
              <p
                style={{
                  margin: 0,
                  fontWeight: 800,
                  fontSize: 12.5,
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
          </div>

          <p
            style={{
              margin: "2px 0 0",
              fontSize: 10.5,
              color: "#64748b",
              lineHeight: 1.35,
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
            title={tipo.descripcion}
          >
            {tipo.descripcion}
          </p>
        </div>

        <div
          style={{
            marginTop: 10,
            paddingTop: 8,
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
              ? "Vacía"
              : esPorParejas && numParejas > 0
              ? `${numParejas} pareja${numParejas !== 1 ? "s" : ""} · ${numArchivos} arch.`
              : `${numArchivos} archivo${numArchivos !== 1 ? "s" : ""}`}
          </span>
          <span style={{ fontWeight: 800, color: tipo.color, fontSize: 11 }}>
            Abrir →
          </span>
        </div>
      </div>
    </motion.div>
  );
}

