import type { TipoDocumento } from "@/types";

export const TIPOS_DOCUMENTO: TipoDocumento[] = [
  {
    id: "CC9",
    label: "CC-9 (Deuda)",
    nombre: "Comprobante de Causación",
    descripcion: "Registra el gasto y la deuda en el momento de recibir la cuenta.",
    requerido: true,
    color: "#10b981",
    minArchivos: 2,
    ayudaPareja: "la causación interna de Fundamiga y la factura/recibo de la empresa",
  },
  {
    id: "DS",
    label: "DS (Soporte)",
    nombre: "Documento Soporte",
    descripcion: "Obligatorio para compras a proveedores informales (sin factura).",
    requerido: true,
    color: "#3b82f6",
    minArchivos: 2,
    ayudaPareja: "el documento soporte electrónico de la DIAN y la cuenta de cobro del proveedor",
  },
  {
    id: "CC6",
    label: "CC-6 (Pago)",
    nombre: "Comprobante de Egreso",
    descripcion: "El recibo o soporte físico que demuestra que ya pagaste la deuda.",
    requerido: true,
    color: "#8b5cf6",
    minArchivos: 2,
    ayudaPareja: "el comprobante de egreso del sistema y el soporte de la transferencia bancaria",
  },
  {
    id: "CC10",
    label: "CC-10 (Aprobación)",
    nombre: "Autorización de Pago",
    descripcion: "Firma o visto bueno interno para poder desembolsar el dinero.",
    requerido: true,
    color: "#f59e0b",
    minArchivos: 2,
    ayudaPareja: "la autorización de pago firmada y la cotización/solicitud de cobro soporte",
  },
  {
    id: "FV",
    label: "FV (Factura)",
    nombre: "Factura de Venta",
    descripcion: "Factura legal electrónica. Si la subes, reemplaza al DS.",
    requerido: false,
    color: "#ec4899",
  },
  {
    id: "CC1",
    label: "CC-1 (Banco)",
    nombre: "Extracto Bancario",
    descripcion: "Auxiliar contable o copia del movimiento de la cuenta de banco.",
    requerido: false,
    color: "#06b6d4",
  },
];

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const TIPOS_PAGO = [
  { value: "servicio",    label: "Servicio (internet, TV, etc.)" },
  { value: "nomina",      label: "Nómina / Honorarios" },
  { value: "arriendo",    label: "Arriendo" },
  { value: "suministros", label: "Suministros / Papelería" },
  { value: "otro",        label: "Otro" },
];
