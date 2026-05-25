import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // Extraer datos del formulario
    const nombre = (formData.get("nombre") as string) || "Proveedor";
    const nit = (formData.get("nit") as string) || "Por definir";
    const concepto = (formData.get("concepto") as string) || "Honorarios / Servicios";
    const valorStr = formData.get("valor") as string;
    const valor = parseFloat(valorStr) || 0;
    const fecha = formData.get("fecha") as string;
    
    const firmaFile = formData.get("firma") as File | null;
    const firmaUrl = formData.get("firmaUrl") as string | null;

    // 1. Generar el PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // Tamaño A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const drawText = (t: string, x: number, y: number, size = 11, isBold = false) => {
      page.drawText(t, {
        x,
        y,
        size,
        font: isBold ? fontBold : font,
        color: rgb(0, 0, 0),
      });
    };

    const drawTextCentered = (t: string, y: number, size = 11, isBold = false) => {
      const textWidth = (isBold ? fontBold : font).widthOfTextAtSize(t, size);
      const x = (page.getWidth() - textWidth) / 2;
      drawText(t, x, y, size, isBold);
    };

    const marginX = 50;
    const valueStartX = 180; // Para alinear los valores
    let currentY = 750;

    // Fecha
    let fechaDate = new Date();
    if (fecha) {
        fechaDate = new Date(`${fecha}T12:00:00`); 
    }
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const fechaTexto = `Yumbo, ${fechaDate.getDate()} de ${meses[fechaDate.getMonth()]} de ${fechaDate.getFullYear()}`;
    
    drawText(fechaTexto, marginX, currentY, 11, true);
    
    // Titulo a la derecha
    const tituloTexto = "Cuenta de Cobro";
    const tituloWidth = fontBold.widthOfTextAtSize(tituloTexto, 12);
    drawText(tituloTexto, page.getWidth() - marginX - tituloWidth, currentY, 12, true);
    
    currentY -= 40;
    
    // Proveedor
    drawText("Yo", marginX, currentY, 11, true);
    drawText(nombre, valueStartX, currentY, 11, true);
    
    currentY -= 20;
    drawText("Con C.C", marginX, currentY, 11, true);
    drawText(nit, valueStartX, currentY, 11, true);

    currentY -= 40;
    drawTextCentered("Manifiesto que:", currentY, 11, true);
    currentY -= 20;
    drawTextCentered("FUNDACION UNA MANO AMIGA A TIEMPO", currentY, 12, true);
    currentY -= 20;
    drawTextCentered("NIT: 901.369.891-9", currentY, 11, true);

    currentY -= 50;
    drawText("ME DEBE LA SUMA DE:", marginX, currentY, 11, true);
    // Formatear valor como moneda
    const valorFormateado = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor).replace(/\s/g, ' ');
    drawText(valorFormateado, valueStartX, currentY, 11);

    currentY -= 20;
    drawText("VALOR EN PESOS:", marginX, currentY, 11, true);
    const valorEnLetras = numeroALetras(valor) + " PESOS M/CTE";
    drawText(valorEnLetras.toUpperCase(), valueStartX, currentY, 11);

    currentY -= 20;
    drawText("POR CONCEPTO DE:", marginX, currentY, 11, true);
    
    // Dividir concepto largo en múltiples líneas si es necesario
    const maxChars = 60;
    let descY = currentY;
    if (concepto.length > maxChars) {
      drawText(concepto.substring(0, maxChars).toUpperCase(), valueStartX, descY, 11);
      descY -= 15;
      drawText(concepto.substring(maxChars, maxChars * 2).toUpperCase(), valueStartX, descY, 11);
      currentY = descY;
    } else {
      drawText(concepto.toUpperCase(), valueStartX, descY, 11);
    }

    currentY -= 60;
    const textoLegal = "Declaro voluntariamente y bajo la gravedad de juramento, que no soy responsable del impuesto\n" +
                       "del IVA.\n" +
                       "Declaro que mis ingresos mensuales provienen de la compensación por servicios personales y que\n" +
                       "para obtenerlos no he contratado ni vinculado dos (2) o más trabajadores asociados a la actividad.\n" +
                       "Lo anterior con el propósito de ser beneficiario en el cálculo de la retención en la fuente por\n" +
                       "concepto de honorarios, según lo dispuesto en el art 383 del estatuto tributario.";
    
    page.drawText(textoLegal, {
      x: marginX,
      y: currentY,
      size: 10,
      font: font,
      lineHeight: 14,
      color: rgb(0, 0, 0),
    });

    currentY -= 120;
    
    // Primero dibujamos la palabra "FIRMA"
    drawText("FIRMA", marginX, currentY, 11, true);
    
    // Firma (Imagen)
    let imageBuffer: ArrayBuffer | null = null;
    let imageType = "";

    if (firmaFile) {
      imageBuffer = await firmaFile.arrayBuffer();
      imageType = firmaFile.type;
    } else if (firmaUrl) {
      try {
        const res = await fetch(firmaUrl);
        if (res.ok) {
          imageBuffer = await res.arrayBuffer();
          // Intentar inferir el tipo
          const contentType = res.headers.get("content-type");
          if (contentType) {
             imageType = contentType;
          } else {
             // Fallback basado en extensión si es posible
             if (firmaUrl.toLowerCase().includes(".png")) imageType = "image/png";
             else imageType = "image/jpeg";
          }
        }
      } catch (error) {
        console.error("Error descargando firma de URL:", error);
      }
    }

    if (imageBuffer) {
      let imagePdf;
      if (imageType.includes("png")) {
        imagePdf = await pdfDoc.embedPng(imageBuffer);
      } else if (imageType.includes("jpeg") || imageType.includes("jpg")) {
        imagePdf = await pdfDoc.embedJpg(imageBuffer);
      }
      
      if (imagePdf) {
        // Escalar la imagen si es muy grande
        const { width, height } = imagePdf.scale(1);
        const ratio = height / width;
        const targetWidth = 150; // Ancho máximo
        const targetHeight = targetWidth * ratio;

        // Ajustar currentY para que la imagen quede debajo de la palabra "FIRMA"
        // PDF-lib dibuja desde la esquina inferior izquierda hacia arriba
        currentY -= (targetHeight + 5); 

        page.drawImage(imagePdf, {
          x: marginX,
          y: currentY,
          width: targetWidth,
          height: targetHeight,
        });
      }
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    // 4. Devolver como descarga PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Cuenta_Cobro_${nombre.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error("Error generando cuenta de cobro manual:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper: Conversión simple de números a letras
function numeroALetras(num: number): string {
  if (num === 0) return "CERO";
  
  const unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const especiales = { 11: "ONCE", 12: "DOCE", 13: "TRECE", 14: "CATORCE", 15: "QUINCE", 16: "DIECISEIS", 17: "DIECISIETE", 18: "DIECIOCHO", 19: "DIECINUEVE", 21: "VEINTIUN", 22: "VEINTIDOS", 23: "VEINTITRES", 24: "VEINTICUATRO", 25: "VEINTICINCO", 26: "VEINTISEIS", 27: "VEINTISIETE", 28: "VEINTIOCHO", 29: "VEINTINUEVE" };
  const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

  function convertirGrupo(n: number): string {
    if (n === 100) return "CIEN";
    let res = "";
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;
    
    res += centenas[c] + (c > 0 ? " " : "");
    if (d === 1 && u > 0) {
      res += (especiales[(d * 10 + u) as keyof typeof especiales] || "") + " ";
      return res.trim();
    } else if (d === 2 && u > 0) {
      res += (especiales[(d * 10 + u) as keyof typeof especiales] || "") + " ";
      return res.trim();
    } else {
      res += decenas[d] + (d > 0 && u > 0 ? " Y " : (d > 0 ? " " : ""));
      res += unidades[u];
    }
    return res.trim();
  }

  let letras = "";
  if (num >= 1000000) {
    const millones = Math.floor(num / 1000000);
    letras += (millones === 1 ? "UN MILLON" : convertirGrupo(millones) + " MILLONES") + " ";
    num = num % 1000000;
  }
  if (num >= 1000) {
    const miles = Math.floor(num / 1000);
    letras += (miles === 1 ? "MIL" : convertirGrupo(miles) + " MIL") + " ";
    num = num % 1000;
  }
  if (num > 0) {
    letras += convertirGrupo(num);
  }
  
  return letras.trim();
}
