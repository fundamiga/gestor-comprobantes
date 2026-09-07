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

export interface ContextoAsistente {
  periodos: Periodo[];
  periodoActivoId: string | null;
  alertasConsecutivos: AlertaConsecutivoIA[];
  /** Navega al lote + tipo indicados */
  navegarA: (loteId: string, tipoId?: string) => void;
}

const defaultCtx: ContextoAsistente = {
  periodos: [],
  periodoActivoId: null,
  alertasConsecutivos: [],
  navegarA: () => {},
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
  onNavegar: (loteId: string, tipoId?: string) => void;
}

export function AsistenteProvider({
  children,
  periodos,
  periodoActivoId,
  alertasConsecutivos,
  onNavegar,
}: Props) {
  return (
    <AsistenteCtx.Provider
      value={{
        periodos,
        periodoActivoId,
        alertasConsecutivos,
        navegarA: onNavegar,
      }}
    >
      {children}
    </AsistenteCtx.Provider>
  );
}
