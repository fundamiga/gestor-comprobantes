# Gestor de Comprobantes — Fundamiga

Aplicación web para organizar comprobantes contables por período mensual y proveedor.

## Requisitos

- Node.js 18 o superior
- npm o yarn

## Cómo ejecutar

1. Abre la carpeta en Visual Studio Code

2. Abre la terminal integrada (Ctrl + ñ o Terminal → New Terminal)

3. Instala las dependencias:
```bash
npm install
```

4. Inicia el servidor de desarrollo:
```bash
npm run dev
```

5. Abre el navegador en: **http://localhost:3000**

---

## Cómo funciona

### Estructura de datos

```
Período (Mes/Año)
  └── Lote (un proveedor/gasto)
        ├── CC-9  → Comprobante de Causación (REQUERIDO)
        ├── DS    → Documento Soporte / Factura electrónica (REQUERIDO)
        ├── CC-6  → Comprobante de Egreso (REQUERIDO)
        ├── CC-10 → Autorización de Pago (REQUERIDO)
        ├── FV    → Factura de Venta (opcional)
        └── CC-1  → Extracto Bancario (opcional)
```

### Flujo de uso

1. **Crear un período** → ej: Abril 2025
2. **Crear un lote** dentro del período → ej: Legon Telecomunicaciones
3. **Subir los documentos** de cada tipo (foto o PDF)
4. El sistema indica automáticamente si el lote está **completo**, **incompleto** o **sin documentos**

### Persistencia

Los datos se guardan automáticamente en el `localStorage` del navegador.
No se pierden al recargar la página, pero sí si se limpia el caché del navegador.

---

## Estructura del proyecto

```
src/
├── app/
│   ├── layout.tsx          # Layout raíz
│   ├── page.tsx            # Página principal (lista de períodos)
│   └── globals.css         # Estilos globales
├── components/
│   └── comprobantes/
│       ├── UIComunes.tsx   # EstadoBadge, VisorArchivo
│       ├── ZonaUpload.tsx  # Drag & drop de archivos
│       ├── TipoDocCard.tsx # Card por tipo de documento
│       ├── ModalCrearLote.tsx
│       ├── VistaMes.tsx    # Vista de lotes en un mes
│       └── VistaLote.tsx   # Vista de documentos de un lote
├── hooks/
│   └── useComprobantes.ts  # Estado global + localStorage
├── lib/
│   ├── constantes.ts       # Tipos de documento, meses
│   └── utils.ts            # Funciones auxiliares
└── types/
    └── index.ts            # Tipos TypeScript
```
