import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { FreightInvoice } from '../types/invoice';

/**
 * Generates and downloads a high-fidelity vector/raster PDF from a DOM invoice element.
 * html2canvas-pro provides native support for Tailwind CSS v4's modern 'oklch' and 'color()' color functions.
 */
export async function downloadInvoicePdfFromElement(
  element: HTMLElement,
  fileName: string,
  onProgress?: (status: string) => void
): Promise<boolean> {
  try {
    if (onProgress) onProgress('Capturing invoice layout...');

    // Render high-resolution canvas with oklch and modern CSS color support
    const canvas = await html2canvas(element, {
      scale: 2, // 2x scale for ultra-sharp typography, company logos, and QR codes
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1200,
      onclone: (_clonedDoc, clonedElement) => {
        // Ensure background is solid white and margins are clean
        clonedElement.style.backgroundColor = '#ffffff';
        clonedElement.style.margin = '0 auto';
      },
    });

    if (onProgress) onProgress('Compiling PDF pages...');

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

    const imgWidth = pdfWidth - 10; // 5mm margin on left and right
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 5; // Top margin 5mm

    // First Page
    pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= (pdfHeight - 10);

    // Multi-page pagination if invoice exceeds single page height
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= (pdfHeight - 10);
    }

    if (onProgress) onProgress('Saving PDF...');
    const safeName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    pdf.save(safeName);

    return true;
  } catch (err) {
    console.error('Failed to generate invoice PDF:', err);
    throw err;
  }
}

/**
 * Creates a formatted filename for an invoice
 */
export function getInvoicePdfFileName(invoice: FreightInvoice): string {
  const cleanNum = (invoice.invoiceNumber || 'INV')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
  const party = (invoice.billedTo?.partyName || 'Party')
    .slice(0, 20)
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  return `LogiTrack_Invoice_${cleanNum}_${party}.pdf`;
}
