"use client";

import { useState } from "react";
import { Folder, CheckCircle2, AlertCircle } from "lucide-react";
import type { TipoDocumento } from "@/types";
import { motion } from "framer-motion";

interface CarpetaIconoProps {
  tipo: TipoDocumento;
  numArchivos: number;
  onClick: () => void;
  onDropFiles?: (archivos: FileList) => void;
}

export function CarpetaIcono({ tipo, numArchivos, onClick, onDropFiles }: CarpetaIconoProps) {
  const [dragOver, setDragOver] = useState(false);
  const minReq = tipo.minArchivos ?? 1;
  const estado =
    numArchivos === 0 ? "vacio" : numArchivos >= minReq ? "completo" : "incompleto";

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
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      whileHover={{ y: -2, boxShadow: "0 6px 18px rgba(60,64,67,0.15)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.12 }}
      className="drive-folder-card"
      style={{
        background: dragOver ? "#e8f0fe" : "#ffffff",
        border: dragOver
          ? "2px dashed #1a73e8"
          : estado === "incompleto"
          ? "1px solid #fde68a"
          : estado === "completo"
          ? "1px solid #bbf7d0"
          : "1px solid #dadce0",
        borderRadius: 14,
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
      {/* Thumbnail superior estilo Drive */}
      <div
        style={{
          height: 84,
          background: `linear-gradient(150deg, ${tipo.color}18, ${tipo.color}05)`,
          borderBottom: `1px solid ${tipo.color}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <Folder
          size={42}
          style={{
            color: tipo.color,
            fill: `${tipo.color}25`,
            strokeWidth: 1.5,
          }}
        />

        {/* Badge de estado en la esquina superior derecha */}
        <div style={{ position: "absolute", top: 8, right: 8 }}>
          {estado === "completo" && (
            <span
              style={{
                background: "#1e8e3e",
                color: "#fff",
                fontSize: 9,
                fontWeight: 800,
                padding: "2px 6px",
                borderRadius: 99,
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
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
                fontSize: 9,
                fontWeight: 800,
                padding: "2px 6px",
                borderRadius: 99,
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
              }}
            >
              <AlertCircle size={10} /> INCOMPLETO
            </span>
          )}
          {estado === "vacio" && tipo.requerido && (
            <span
              style={{
                background: "#fee2e2",
                color: "#dc2626",
                fontSize: 9,
                fontWeight: 800,
                padding: "2px 6px",
                borderRadius: 99,
                border: "1px solid #fecaca",
              }}
            >
              REQUERIDO
            </span>
          )}
          {estado === "vacio" && !tipo.requerido && (
            <span
              style={{
                background: "#f1f3f4",
                color: "#747775",
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 99,
              }}
            >
              OPCIONAL
            </span>
          )}
        </div>

        {/* Indicador de soltar archivos */}
        {dragOver && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(26,115,232,0.92)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.3,
            }}
          >
            SOLTAR ARCHIVOS AQUÍ
          </div>
        )}
      </div>

      {/* Información inferior */}
      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: tipo.color,
              flexShrink: 0,
            }}
          />
          <p
            style={{
              margin: 0,
              fontWeight: 700,
              fontSize: 12.5,
              color: "#1f1f1f",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {tipo.label}
          </p>
        </div>
        <p
          style={{
            margin: "0 0 0 13px",
            fontSize: 11,
            color: "#5f6368",
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={tipo.nombre}
        >
          {tipo.nombre}
        </p>

        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: "1px solid #f1f3f4",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 10.5,
            color: "#747775",
          }}
        >
          <span>
            {numArchivos === 0
              ? "0 archivos"
              : `${numArchivos} archivo${numArchivos !== 1 ? "s" : ""}`}
          </span>
          <span style={{ fontWeight: 600, color: tipo.color }}>Abrir →</span>
        </div>
      </div>
    </motion.div>
  );
}
