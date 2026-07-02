/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export type DocumentType = 'holerite' | 'ponto' | 'ferias';

export interface DocumentLabels {
  type: DocumentType;
  title: string;
  shortTitle: string;
  lowerTitle: string;
  receiptSubject: string;
  legalObject: string;
  headerTitle: string;
  badgeClass: string;
}

export function normalizeDocumentType(type?: string): DocumentType {
  return type === 'ponto' || type === 'ferias' ? type : 'holerite';
}

export function getDocumentLabels(type?: string): DocumentLabels {
  const normalized = normalizeDocumentType(type);

  if (normalized === 'ponto') {
    return {
      type: 'ponto',
      title: 'Folha de Ponto',
      shortTitle: 'Ponto',
      lowerTitle: 'folha de ponto',
      receiptSubject: 'a folha de ponto',
      legalObject: 'esta folha de ponto',
      headerTitle: 'FOLHA DE PONTO',
      badgeClass: 'border-purple-200 bg-purple-50 text-purple-700',
    };
  }

  if (normalized === 'ferias') {
    return {
      type: 'ferias',
      title: 'Recibo de Férias',
      shortTitle: 'Férias',
      lowerTitle: 'recibo de férias',
      receiptSubject: 'o recibo de férias',
      legalObject: 'este recibo de férias',
      headerTitle: 'RECIBO DE FERIAS',
      badgeClass: 'border-teal-200 bg-teal-50 text-teal-700',
    };
  }

  return {
    type: 'holerite',
    title: 'Holerite',
    shortTitle: 'Holerite',
    lowerTitle: 'holerite',
    receiptSubject: 'o holerite de pagamento',
    legalObject: 'este holerite',
    headerTitle: 'HOLERITE',
    badgeClass: 'border-blue-100 bg-blue-50 text-blue-700',
  };
}

// Helper to format CPF as XXX.XXX.XXX-XX
export function formatCPF(value: string): string {
  const clean = value.replace(/\D/g, '');
  if (clean.length === 0) return '';
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
}

// Unmask CPF to raw numbers
export function cleanCPF(value: string): string {
  return value.replace(/\D/g, '');
}

// Simple email check
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Brazilian date and time formatter
export function formatDate(isoString: string | undefined): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR', {
      timeZone: 'UTC', // Ensure consistent UTC rendering from database
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (e) {
    return isoString;
  }
}

// Convert YYYY-MM to Portuguese Month representation
export function formatCompetence(comp: string): string {
  if (!comp || !comp.includes('-')) return comp;
  const [year, month] = comp.split('-');
  const monthsBR: Record<string, string> = {
    '01': 'Janeiro',
    '02': 'Fevereiro',
    '03': 'Março',
    '04': 'Abril',
    '05': 'Maio',
    '06': 'Junho',
    '07': 'Julho',
    '08': 'Agosto',
    '09': 'Setembro',
    '10': 'Outubro',
    '11': 'Novembro',
    '12': 'Dezembro'
  };
  const monthName = monthsBR[month] || month;
  return `${monthName} / ${year}`;
}

// Read raw file as Base64 helper
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      let encoded = reader.result as string;
      // Strip browser prefix (e.g. data:application/pdf;base64,) if we want raw content or leave for image tags
      // We will keep full dataURL representation for standard viewing
      resolve(encoded);
    };
    reader.onerror = error => reject(error);
  });
}

// Generates lists of competence selection options (last 12 months)
export function getCompetenceOptions(): { value: string; label: string }[] {
  const current = new Date();
  const options = [];
  
  for (let i = 0; i < 12; i++) {
    const tempDate = new Date(current.getFullYear(), current.getMonth() - i, 1);
    const yr = tempDate.getFullYear();
    const mt = String(tempDate.getMonth() + 1).padStart(2, '0');
    const val = `${yr}-${mt}`;
    options.push({
      value: val,
      label: formatCompetence(val)
    });
  }
  return options;
}

// Helper to remove Portuguese accents for standard PDF Helvetica font safety
export function cleanAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ªº]/g, '')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C');
}

// Append a Signature Receipt page directly to the PDF bytes
export async function addSignatureToPdf(
  base64Pdf: string, 
  signatureBase64: string,
  employeeName: string,
  employeeCPF: string,
  employeeCargo: string,
  employeeDepto: string,
  competence: string,
  hash: string,
  timestamp: string,
  companyName: string = 'ALFA LIX SERVIÇOS E TRANSPORTE',
  documentType: DocumentType = 'holerite'
): Promise<string> {
  try {
    const documentLabels = getDocumentLabels(documentType);
    // Decode external PDF content
    const cleanBase64 = base64Pdf.startsWith('data:') ? base64Pdf.split(',')[1] : base64Pdf;
    const pdfBytes = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0));
    
    // Load and edit document
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.addPage([595, 842]); // A4 Size standard pixels
    const { width, height } = page.getSize();
    
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);
    
    // 1. Structural Border Background
    page.drawRectangle({
      x: 20,
      y: 20,
      width: width - 40,
      height: height - 40,
      borderWidth: 1.5,
      borderColor: rgb(0.8, 0.82, 0.86), // slate-300
      color: rgb(0.98, 0.98, 0.99), // neutral slate 50
    });
    
    // 2. Banner Header
    page.drawRectangle({
      x: 35,
      y: height - 120,
      width: width - 70,
      height: 80,
      color: rgb(0.08, 0.18, 0.36), // Custom elegant professional dark corporate blue
    });
    
    page.drawText(cleanAccents(companyName).toUpperCase(), {
      x: 55,
      y: height - 80,
      size: 16,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });
    
    page.drawText(`COMPROVANTE DE ENTREGA E ASSINATURA ELETRONICA DE ${documentLabels.headerTitle}`, {
      x: 55,
      y: height - 102,
      size: 8.5,
      font: helveticaFont,
      color: rgb(0.8, 0.9, 1),
    });
    
    // 3. Section: Employee Details Layout
    page.drawText('DADOS DO COLABORADOR (PROPRIETARIO DO DOCUMENTO)', {
      x: 45,
      y: height - 160,
      size: 10,
      font: helveticaBold,
      color: rgb(0.18, 0.24, 0.35),
    });
    
    page.drawLine({
      start: { x: 45, y: height - 166 },
      end: { x: width - 45, y: height - 166 },
      thickness: 1,
      color: rgb(0.86, 0.88, 0.9),
    });
    
    const drawMeta = (label: string, value: string, x: number, y: number) => {
      page.drawText(cleanAccents(label), { x, y, size: 7.5, font: helveticaBold, color: rgb(0.5, 0.55, 0.6) });
      page.drawText(cleanAccents(value), { x, y: y - 13, size: 9.5, font: helveticaFont, color: rgb(0.1, 0.12, 0.16) });
    };
    
    drawMeta('NOME COMPLETO:', employeeName, 50, height - 195);
    drawMeta('DOCUMENTO CPF:', employeeCPF, 360, height - 195);
    drawMeta('CARGO / FUNCAO:', employeeCargo, 50, height - 235);
    drawMeta('DEPARTAMENTO:', employeeDepto, 360, height - 235);
    drawMeta(`COMPETENCIA DO ${documentLabels.headerTitle}:`, competence, 50, height - 275);
    
    // 4. Section: Legal confirmation
    page.drawText('DECLARACAO E ACEITE DE RECEBIMENTO', {
      x: 45,
      y: height - 325,
      size: 10,
      font: helveticaBold,
      color: rgb(0.18, 0.24, 0.35),
    });
    
    page.drawLine({
      start: { x: 45, y: height - 331 },
      end: { x: width - 45, y: height - 331 },
      thickness: 1,
      color: rgb(0.86, 0.88, 0.9),
    });
    
    const disclaimer = [
      `Declaro e confirmo que recebi ${documentLabels.receiptSubject} referente a competencia de ${competence},`,
      `disponibilizado de forma integra e confidencial pelo portal eletronico de ${companyName}.`,
      `Para todos os fins de direito e efeitos legais, valido e ratifico ${documentLabels.legalObject} atraves de assinatura`,
      `eletronica em ambiente seguro provido de autenticacao, nos termos do art. 10 da MP n. 2.200-2/2001`,
      `e amparado pela Lei Federal n. 14.063/20.`
    ];
    
    disclaimer.forEach((line, idx) => {
      page.drawText(cleanAccents(line), {
        x: 50,
        y: height - 355 - (idx * 16),
        size: 9,
        font: helveticaFont,
        color: rgb(0.3, 0.33, 0.4),
      });
    });
    
    // 5. Section: Visual Audit Badge
    page.drawRectangle({
      x: 45,
      y: 150,
      width: width - 90,
      height: 145,
      borderWidth: 1,
      borderColor: rgb(0.68, 0.88, 0.76), // emerald-250
      color: rgb(0.96, 0.99, 0.97), // emerald-50
    });
    
    page.drawText('RECIBO ASSINADO DIGITALMENTE', {
      x: 65,
      y: 265,
      size: 11,
      font: helveticaBold,
      color: rgb(0.04, 0.45, 0.25), // emerald-800
    });
    
    page.drawText('Status:', { x: 65, y: 247, size: 8, font: helveticaBold, color: rgb(0.5, 0.55, 0.6) });
    page.drawText('ASSINADO & CONFIRMADO POR SENHA', { x: 105, y: 247, size: 8, font: helveticaBold, color: rgb(0.04, 0.45, 0.25) });
    
    page.drawText('Data/Hora:', { x: 65, y: 232, size: 8, font: helveticaBold, color: rgb(0.5, 0.55, 0.6) });
    page.drawText(timestamp, { x: 115, y: 232, size: 8, font: helveticaFont, color: rgb(0.1, 0.12, 0.16) });
    
    page.drawText('Chave SHA256 de Validacao:', { x: 65, y: 217, size: 8, font: helveticaBold, color: rgb(0.5, 0.55, 0.6) });
    page.drawText(hash, { x: 65, y: 204, size: 8, font: courierFont, color: rgb(0.2, 0.2, 0.2) });
    
    page.drawText('Seguranca:', { x: 65, y: 185, size: 8, font: helveticaBold, color: rgb(0.5, 0.55, 0.6) });
    page.drawText('Assinatura eletronica amparada em canais criptografados de barramento SSL.', { x: 120, y: 185, size: 8, font: helveticaFont, color: rgb(0.3, 0.35, 0.4) });
    
    // Draw Holographic signature image inside visual frame
    if (signatureBase64) {
      try {
        const sigCleanB64 = signatureBase64.split(',')[1] || signatureBase64;
        const sigBytes = Uint8Array.from(atob(sigCleanB64), c => c.charCodeAt(0));
        const embedSigImg = await pdfDoc.embedPng(sigBytes);
        
        // White capsule background for signature
        page.drawRectangle({
          x: width - 235,
          y: 190,
          width: 170,
          height: 65,
          borderWidth: 1,
          borderColor: rgb(0.84, 0.86, 0.88),
          color: rgb(1, 1, 1),
        });
        
        page.drawImage(embedSigImg, {
          x: width - 225,
          y: 195,
          width: 150,
          height: 55,
        });
        
        page.drawText('ASSINATURA IDENTIFICADA', {
          x: width - 235,
          y: 260,
          size: 7,
          font: helveticaBold,
          color: rgb(0.5, 0.55, 0.6),
        });
      } catch (err) {
        console.error('Failed to draw signature image inside PDF:', err);
      }
    }
    
    // 6. Security Footer text
    page.drawText(`${cleanAccents(companyName).toUpperCase()} - PORTAL DE DOCUMENTOS AUTENTICADOS - COMPLEMENTO DE ASSINATURA`, {
      x: 75,
      y: 40,
      size: 7.5,
      font: helveticaFont,
      color: rgb(0.6, 0.65, 0.7),
    });
    
    const modifiedPdfBytes = await pdfDoc.save();
    const binaryString = Array.from(modifiedPdfBytes, byte => String.fromCharCode(byte)).join('');
    return 'data:application/pdf;base64,' + btoa(binaryString);
  } catch (error) {
    console.error('Error generating signed PDF, using original', error);
    return base64Pdf;
  }
}
