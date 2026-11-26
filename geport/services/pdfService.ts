import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';

/**
 * Generates PDF using browser's native print functionality
 * This creates a new window with the cover content and triggers print dialog
 */
export const generateCoverPDFViaPrint = (element: HTMLElement): void => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate PDF');
    return;
  }

  // Get all stylesheets from the current document
  const styles = Array.from(document.styleSheets)
    .map(styleSheet => {
      try {
        return Array.from(styleSheet.cssRules)
          .map(rule => rule.cssText)
          .join('\n');
      } catch (e) {
        // Handle cross-origin stylesheets
        if (styleSheet.href) {
          return `@import url("${styleSheet.href}");`;
        }
        return '';
      }
    })
    .join('\n');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Lab Report Cover</title>
        <style>
          ${styles}
          @media print {
            @page {
              size: A4;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-container {
              width: 210mm;
              height: 297mm;
            }
          }
          body {
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            background: white;
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          ${element.outerHTML}
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();

  // Wait for content to load then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
};

/**
 * Captures the cover element and returns it as a jsPDF object using html2canvas
 */
export const generateCoverPDF = async (element: HTMLElement): Promise<ArrayBuffer> => {
  const { default: html2canvas } = await import('html2canvas');

  // Find the parent with transform and temporarily remove it
  let transformParent: HTMLElement | null = null;
  let originalTransform = '';
  let parent = element.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    if (style.transform && style.transform !== 'none') {
      transformParent = parent;
      originalTransform = parent.style.transform;
      parent.style.transform = 'none';
      break;
    }
    parent = parent.parentElement;
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  // Restore transform
  if (transformParent) {
    transformParent.style.transform = originalTransform;
  }

  const imgData = canvas.toDataURL('image/png');

  // A4 dimensions in mm
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

  return pdf.output('arraybuffer');
};

/**
 * Merges the generated cover PDF with an uploaded PDF
 */
export const mergePdf = async (coverBuffer: ArrayBuffer, existingPdfFile: File): Promise<Uint8Array> => {
  const existingPdfBytes = await existingPdfFile.arrayBuffer();

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const coverDoc = await PDFDocument.load(coverBuffer);

  // Copy the cover page
  const [coverPage] = await pdfDoc.copyPages(coverDoc, [0]);

  // Insert cover at index 0
  pdfDoc.insertPage(0, coverPage);

  return pdfDoc.save();
};

export const downloadBlob = (data: Uint8Array | Blob, filename: string) => {
  const blob = data instanceof Uint8Array ? new Blob([data], { type: 'application/pdf' }) : data;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
