"use client";

import { Folder, CheckCircle2, AlertCircle, Minus } from "lucide-react";
import type { TipoDocumento } from "@/types";
import { motion } from "framer-motion";

interface CarpetaIconoProps {
  tipo: TipoDocumento;
  numArchivos: number;
  onClick: () => void;
}

export function CarpetaIcono({ tipo, numArchivos, onClick }: CarpetaIconoProps) {
  const minReq = tipo.minArchivos ?? 1;
  const estado =
    numArchivos === 0 ? "vacio" : numArchivos >= minReq ? "completo" : "incompleto";

  const bg = { vacio: "#f8fafc", completo: "#f0fdf4", incompleto: "#fffbeb" }[estado];
  const border = { vacio: "#e2e8f0", completo: "#bbf7d0", incompleto: "#fde68a" }[estado];

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -5, boxShadow: "0 14px 36px rgba(0,0,0,0.13)" }}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.15 }}
      style={{
        background: bg,
        border: `2px solid ${border}`,
        borderRadius: 20,
        padding: "22px 16px 18px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        textAlign: "center",
        position: "relative",
        fontFamily: "inherit",
        minHeight: 150,
        justifyContent: "center",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ position: "absolute", top: 10, right: 10 }}>
        {estado === "completo" && <CheckCircle2 size={16} style={{ color: "#10b981" }} />}
        {estado === "incompleto" && <AlertCircle size={16} style={{ color: "#f59e0b" }} />}
        {estado === "vacio" && tipo.requerido && <AlertCircle size={16} style={{ color: "#ef4444" }} />}
        {estado === "vacio" && !tipo.requerido && <Minus size={14} style={{ color: "#cbd5e1" }} />}
      </div>

      <div style={{ position: "relative" }}>
        <Folder size={56} style={{ color: tipo.color, fill: `${tipo.color}25`, strokeWidth: 1.5 }} />
        {numArchivos > 0 && (
          <div style={{
            position: "absolute", bottom: -4, right: -8,
            background: tipo.color, color: "#fff",
            borderRadius: 10, fontSize: 9, fontWeight: 900,
            padding: "2px 6px", lineHeight: 1.6,
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          }}>
            {numArchivos}
          </div>
        )}
      </div>

      <div>
        <p style={{ margin: 0, fontWeight: 900, fontSize: 13, color: "#0f172a" }}>{tipo.label}</p>
        <p style={{ margin: "3px 0 0", fontSize: 11, color: "#64748b", lineHeight: 1.3 }}>
          {numArchivos === 0 ? "Vacía" : `${numArchivos} archivo${numArchivos !== 1 ? "s" : ""}`}
        </p>
      </div>

      {tipo.requerido !== undefined && (
        <span style={{
          fontSize: 9, fontWeight: 800,
          color: tipo.requerido ? "#dc2626" : "#94a3b8",
          background: tipo.requerido ? "#fee2e2" : "#f1f5f9",
          borderRadius: 6, padding: "2px 6px",
          textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          {tipo.requerido ? "Requerido" : "Opcional"}
        </span>
      )}
    </motion.button>
  );
}
