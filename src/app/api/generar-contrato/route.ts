import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import JSZip from "jszip";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      tipoContrato = "auxiliar", // "auxiliar" | "supervisor"
      nombreContratista,
      cedulaContratista,
      expedidaEn,
      domicilioContratista = "Yumbo",
      direccionContratista = "",
      telefonoContratista = "",
      emailContratista = "",
      formaPago = "QUINCENAL",
      duracionTexto = "tres (3) meses",
      fechaInicioTexto,
      fechaFinTexto,
      valorMensualLetras,
      valorMensualNumero,
      valorQuincenalLetras,
      valorQuincenalNumero,
    } = body;

    if (!nombreContratista || !cedulaContratista) {
      return NextResponse.json(
        { error: "El nombre y la cédula del contratista son requeridos" },
        { status: 400 }
      );
    }

    // 1. Determinar el archivo de plantilla con membrete y portada
    const filename =
      tipoContrato === "supervisor"
        ? "Contratos_Supervisores_Reforzado_9_88.docx"
        : "Contratos_Auxiliar_Parqueadero_con_membrete (1).docx";

    const templatePath = path.join(
      process.cwd(),
      "contratos",
      filename
    );

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: `No se encontró la plantilla de contrato (${filename})` },
        { status: 404 }
      );
    }

    const templateBuffer = fs.readFileSync(templatePath);

    // 2. Descomprimir el .docx con JSZip
    const zip = await JSZip.loadAsync(templateBuffer);
    const docXmlFile = zip.file("word/document.xml");

    if (!docXmlFile) {
      return NextResponse.json(
        { error: "Archivo de documento XML no válido en el .docx" },
        { status: 500 }
      );
    }

    let xml = await docXmlFile.async("string");

    // 2a. Eliminar etiquetas de corrección ortográfica/gramatical de Word que fragmentan las etiquetas <w:t>
    xml = xml.replace(/<w:proofErr\b[^>]*\/>/g, "");

    // 2b. Recortar el XML para conservar ÚNICAMENTE LA PORTADA Y EL PRIMER (1) CONTRATO
    const contractHeaders: number[] = [];
    const headerRegex = /CONTRATO DE PRESTACI/gi;
    let match: RegExpExecArray | null;
    while ((match = headerRegex.exec(xml)) !== null) {
      contractHeaders.push(match.index);
    }

    if (contractHeaders.length >= 4) {
      const cutPos = contractHeaders[3]; // Inicio del 2do contrato completo
      let paraStart = xml.lastIndexOf("<w:p ", cutPos);
      if (paraStart === -1) {
        paraStart = xml.lastIndexOf("<w:p>", cutPos);
      }
      const sectStart = xml.lastIndexOf("<w:sectPr");
      if (paraStart !== -1 && sectStart !== -1) {
        xml = xml.substring(0, paraStart) + xml.substring(sectStart);
      }
    }

    // Helper para reemplazar texto dentro de XML evitando romper etiquetas Word
    const replaceInXml = (oldText: string, newText: string) => {
      if (!oldText) return;
      if (xml.includes(oldText)) {
        xml = xml.replaceAll(oldText, newText);
      }
    };

    // 3. REEMPLAZOS EN PORTADA Y CUERPO PRESERVANDO CENTRADO Y ALINEACIÓN
    const nomUpper = nombreContratista.toUpperCase();
    const expUpper = (expedidaEn || domicilioContratista || "YUMBO").toUpperCase();

    // Portada: Reemplazo completo del bloque de Nombre + Cédula para mantener una sola línea limpia
    xml = xml.replace(
      /MARILIN VALDEZ GUTIERREZ.*?(?:208\s+DE\s+YUMBO|YUMBO)/g,
      `${nomUpper} CC. ${cedulaContratista} DE ${expUpper}`
    );

    // Reemplazos de nombres en el cuerpo
    replaceInXml("MARILIN VALDEZ GUTIERREZ", nomUpper);
    replaceInXml("NOE CONTRERAS", nomUpper);

    // Cédula en cuerpo y portada
    replaceInXml("CC.1.118.305. 208 DE YUMBO", `CC. ${cedulaContratista} DE ${expUpper}`);
    replaceInXml("CC.1.118.305. 208", `CC. ${cedulaContratista}`);
    replaceInXml("1.118.305.208", cedulaContratista);
    replaceInXml("88.270.810", cedulaContratista);

    // Dirección, Teléfono, Correo y Forma de Pago en la Portada
    if (direccionContratista) {
      replaceInXml("CALLE 2 O # 6 - 26 NUEVO HORIZONTE", direccionContratista.toUpperCase());
    }
    if (telefonoContratista) {
      replaceInXml("3224016048", telefonoContratista);
    }
    if (emailContratista) {
      replaceInXml("MARILINVA@GMAIL.COM", emailContratista.toUpperCase());
    }
    if (formaPago) {
      replaceInXml("QUINCENAL", formaPago.toUpperCase());
    }

    // Expedición de cédula y Domicilio en el cuerpo
    if (expedidaEn) {
      replaceInXml("expedida en Cúcuta", `expedida en ${expedidaEn}`);
      replaceInXml("expedida en CÚCUTA", `expedida en ${expUpper}`);
      replaceInXml("Cúcuta", expedidaEn);
    }

    if (domicilioContratista) {
      replaceInXml("con domicilio principal en la ciudad de Yumbo", `con domicilio principal en la ciudad de ${domicilioContratista}`);
    }

    // Duración y Fechas (Tanto en Portada como en Cuerpo)
    if (duracionTexto) {
      replaceInXml("3 MESES", duracionTexto.toUpperCase());
      replaceInXml("duración de tres (3) meses", `duración de ${duracionTexto}`);
    }

    if (fechaInicioTexto) {
      replaceInXml("01 DE JULIO DE 2025", fechaInicioTexto.toUpperCase());
      replaceInXml("01 DE JULIO DE 2024", fechaInicioTexto.toUpperCase());
      replaceInXml("primero (01) de julio de 2024", fechaInicioTexto);
      replaceInXml("primero (01) de julio de 2025", fechaInicioTexto);
    }

    if (fechaFinTexto) {
      replaceInXml("30 DE SEPTIEMBRE DE 2025", fechaFinTexto.toUpperCase());
      replaceInXml("30 DE SEPTIEMBRE DE 2024", fechaFinTexto.toUpperCase());
      replaceInXml("treinta (30) de septiembre de 2024", fechaFinTexto);
      replaceInXml("treinta (30) de septiembre de 2025", fechaFinTexto);
    }

    // Valores económicos
    if (valorMensualLetras && valorMensualNumero) {
      const newMensualStr = `${valorMensualLetras.toUpperCase()} PESOS ($${valorMensualNumero})`;
      replaceInXml("TRES MILLONES SETECIENTOS OCHENTA Y SEIS MIL PESOS ($3.786.000)", newMensualStr);
      replaceInXml("DOS MILLONES DOSCIENTOS OCHENTA Y SEIS MIL PESOS ($2.286.000)", newMensualStr);
      replaceInXml("3.786.000", valorMensualNumero);
      replaceInXml("2.286.000", valorMensualNumero);
    }

    if (valorQuincenalLetras && valorQuincenalNumero) {
      const newQuincenalStr = `${valorQuincenalLetras.toUpperCase()} PESOS ($${valorQuincenalNumero})`;
      replaceInXml("SEISCIENTOS MIL PESOS ($600.000)", newQuincenalStr);
      replaceInXml("TRESCIENTOS CINCUENTA MIL PESOS ($350.000)", newQuincenalStr);
      replaceInXml("600.000", valorQuincenalNumero);
      replaceInXml("350.000", valorQuincenalNumero);
    }

    // 4. Guardar el XML modificado y reempaquetar
    zip.file("word/document.xml", xml);
    const outputBuffer = await zip.generateAsync({ type: "nodebuffer" });

    // 5. Nombre sugerido para la descarga
    const cleanNombre = nombreContratista.replace(/[^a-zA-Z0-9]/g, "_");
    const downloadFilename = `Contrato_${tipoContrato === "supervisor" ? "Supervisor" : "Auxiliar"}_${cleanNombre}.docx`;

    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${downloadFilename}"`,
      },
    });
  } catch (error: any) {
    console.error("Error al generar el contrato:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar el contrato" },
      { status: 500 }
    );
  }
}
