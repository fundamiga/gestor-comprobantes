"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { MESES, TIPOS_PAGO } from "@/lib/constantes";
import type { Lote } from "@/types";

type DatosLote = Pick<Lote, "proveedor" | "referencia" | "tipoPago">;

interface ModalCrearLoteProps {
  mes: number;
  anio: number;
  onCrear: (datos: DatosLote) => void;
  onCerrar: () => void;
}

export function ModalCrearLote({
  mes,
  anio,
  onCrear,
  onCerrar,
}: ModalCrearLoteProps) {
  const [proveedor, setProveedor] = useState("");
  const [referencia, setReferencia] = useState("");
  const [tipoPago, setTipoPago] = useState("servicio");

  const handleCrear = () => {
    if (!proveedor.trim()) return;
    onCrear({ proveedor: proveedor.trim(), referencia: referencia.trim(), tipoPago });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onCerrar}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          padding: 28,
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 30px 80px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 22,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              background: "#d1fae5",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus size={20} style={{ color: "#10b981" }} />
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontWeight: 900,
                fontSize: 16,
                color: "#0f172a",
              }}
            >
              Nuevo Lote
            </h3>
            <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>
              {MESES[mes]} {anio}
            </p>
          </div>
        </div>

        {/* Campos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Proveedor / Nombre del lote */}
          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#475569",
                display: "block",
                marginBottom: 5,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Nombre de lote *
            </label>
            <input
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCrear()}
              placeholder="ej: Lote Papelería"
              autoFocus
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1.5px solid #e2e8f0",
                borderRadius: 12,
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#10b981")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>

          {/* Referencia / Número */}
          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#475569",
                display: "block",
                marginBottom: 5,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Número
            </label>
            <input
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="ej: 001"
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1.5px solid #e2e8f0",
                borderRadius: 12,
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#10b981")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>


        </div>

        {/* Botones */}
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button
            onClick={onCerrar}
            style={{
              flex: 1,
              padding: "11px 0",
              border: "1.5px solid #e2e8f0",
              borderRadius: 12,
              background: "#fff",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13,
              color: "#64748b",
              fontFamily: "inherit",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleCrear}
            disabled={!proveedor.trim()}
            style={{
              flex: 2,
              padding: "11px 0",
              border: "none",
              borderRadius: 12,
              background: proveedor.trim() ? "#10b981" : "#d1fae5",
              cursor: proveedor.trim() ? "pointer" : "default",
              fontWeight: 800,
              fontSize: 13,
              color: "#fff",
              fontFamily: "inherit",
              transition: "background 0.2s",
            }}
          >
            Crear Lote
          </button>
        </div>
      </div>
    </div>
  );
}
