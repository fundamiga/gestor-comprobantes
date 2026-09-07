"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Periodo } from "@/types";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface AlertaConsecutivoIA {
  tipoId: string;
  tipoLabel: string;
  tipoNombre: string;
  faltantes: number[];
  repetidos: number[];
  presentes: number[];
}

/** Info para resaltar visualmente un elemento con un tooltip de la IA */
export interface HighlightInfo {
  tipoId?: string;         // qué tipo de doc resaltar (ej: "DS")
  loteId?: string;         // qué lote resaltar
  grupoNombre?: string;    // nombre del proveedor/grupo para destacar la pareja exacta
  mensaje: string;         // texto del tooltip
  tipo: "pareja_incompleta" | "consecutivo" | "tipo_faltante" | "general";
}

export interface ContextoAsistente {
  periodos: Periodo[];
  periodoActivoId: string | null;
  alertasConsecutivos: AlertaConsecutivoIA[];
  highlightInfo: HighlightInfo | null;
  /** Navega al período, lote y/o tipo de documento indicados */
  navegarA: (loteId?: string | null, tipoId?: string | null, periodoId?: string | null) => void;
  /** Resalta un elemento con un tooltip de la IA (se borra solo después de 8 segundos) */
  setHighlight: (info: HighlightInfo | null) => void;
}

const defaultCtx: ContextoAsistente = {
  periodos: [],
  periodoActivoId: null,
  alertasConsecutivos: [],
  highlightInfo: null,
  navegarA: () => {},
  setHighlight: () => {},
};

const AsistenteCtx = createContext<ContextoAsistente>(defaultCtx);

export function useAsistenteContext() {
  return useContext(AsistenteCtx);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface Props {
  children: ReactNode;
  periodos: Periodo[];
  periodoActivoId: string | null;
  alertasConsecutivos: AlertaConsecutivoIA[];
  highlightInfo: HighlightInfo | null;
  onNavegar: (loteId?: string | null, tipoId?: string | null, periodoId?: string | null) => void;
  onSetHighlight: (info: HighlightInfo | null) => void;
}

export function AsistenteProvider({
  children,
  periodos,
  periodoActivoId,
  alertasConsecutivos,
  highlightInfo,
  onNavegar,
  onSetHighlight,
}: Props) {
  return (
    <AsistenteCtx.Provider
      value={{
        periodos,
        periodoActivoId,
        alertasConsecutivos,
        highlightInfo,
        navegarA: onNavegar,
        setHighlight: onSetHighlight,
      }}
    >
      {children}
    </AsistenteCtx.Provider>
  );
}
