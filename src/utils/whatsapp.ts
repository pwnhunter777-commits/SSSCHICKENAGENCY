import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Bill, ShopSettings } from '../types';

/**
 * Capture receipt DOM element as a high-resolution, perfectly proportioned
 * Small A4 (A5 format: 148mm x 210mm) PDF document.
 * Ensures the entire bill (header, items, calculations, big total, QR code, signatures)
 * is captured 100% completely without any clipping or blank space.
 */
export async function generateBillPdfBlob(
  bill: Bill,
  settings: ShopSettings,
  elementId = 'printable-thermal-receipt'
): Promise<Blob | null> {
  const node = document.getElementById(elementId);
  if (!node) {
    console.error('Receipt element not found for PDF generation');
    return null;
  }

  try {
    // 1. Ensure all images (shop logo, QR code) are loaded
    const images = node.querySelectorAll('img');
    await Promise.all(
      Array.from(images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );

    // 2. Clone the node into an unclipped, isolated container to ensure 100% full-height capture
    const clone = node.cloneNode(true) as HTMLElement;
    clone.style.position = 'fixed';
    clone.style.top = '-99999px';
    clone.style.left = '-99999px';
    clone.style.width = '600px'; // standard compact width
    clone.style.maxWidth = '600px';
    clone.style.height = 'auto';
    clone.style.maxHeight = 'none';
    clone.style.overflow = 'visible';
    clone.style.zIndex = '-9999';
    clone.style.background = '#ffffff';
    clone.style.margin = '0';
    clone.style.padding = '20px';
    clone.style.boxSizing = 'border-box';
    document.body.appendChild(clone);

    // Wait for clone DOM painting
    await new Promise((resolve) => setTimeout(resolve, 80));

    // 3. Capture high-resolution PNG using html-to-image
    const dataUrl = await toPng(clone, {
      quality: 0.98,
      pixelRatio: 2.5,
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipFonts: true,
      width: 600,
      height: clone.scrollHeight,
    });

    // Cleanup clone
    document.body.removeChild(clone);

    const img = new Image();
    img.src = dataUrl;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
    });

    if (!img.width || !img.height) {
      throw new Error('Captured image has invalid dimensions');
    }

    // 4. Small A4 (A5 Sheet: 148mm Width)
    const smallA4WidthMm = 148;
    const marginMm = 6;
    const printableWidthMm = smallA4WidthMm - marginMm * 2; // 136mm
    const scaledHeightMm = (img.height * printableWidthMm) / img.width;
    const pageHeightMm = scaledHeightMm + marginMm * 2;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [smallA4WidthMm, pageHeightMm],
      compress: true,
    });

    pdf.addImage(
      dataUrl,
      'PNG',
      marginMm,
      marginMm,
      printableWidthMm,
      scaledHeightMm,
      undefined,
      'FAST'
    );

    return pdf.output('blob');
  } catch (error) {
    console.error('Error generating Small A4 bill PDF blob:', error);
    return null;
  }
}

/**
 * Downloads the Bill as a Small A4 PDF document directly to phone/computer storage
 */
export async function downloadBillPdf(
  bill: Bill,
  settings: ShopSettings,
  elementId = 'printable-thermal-receipt'
): Promise<boolean> {
  const filename = `SmallA4_Bill_${bill.billNumber}_${bill.date}.pdf`;
  const blob = await generateBillPdfBlob(bill, settings, elementId);
  if (!blob) return false;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

/**
 * Shares the bill ONLY as a Small A4 PDF document to WhatsApp (without text message body)
 */
export async function shareBillAsPdfToWhatsApp(
  bill: Bill,
  settings: ShopSettings,
  phoneNumber?: string,
  elementId = 'printable-thermal-receipt'
): Promise<{ success: boolean; sharedDirectly: boolean; message: string }> {
  const filename = `SmallA4_Bill_${bill.billNumber}_${bill.date}.pdf`;

  let cleanNumber = '';
  if (phoneNumber && phoneNumber.trim().length > 0) {
    cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length === 10) {
      cleanNumber = '91' + cleanNumber;
    }
  }

  // 1. Generate Small A4 PDF blob
  const pdfBlob = await generateBillPdfBlob(bill, settings, elementId);
  if (!pdfBlob) {
    // Fallback: open WhatsApp chat
    openWhatsAppChatWithoutText(cleanNumber);
    return {
      success: false,
      sharedDirectly: false,
      message: 'Could not generate PDF. Opened WhatsApp chat.',
    };
  }

  const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

  // 2. Direct native PDF document share via Web Share API (Android, iOS WhatsApp)
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    if (navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: `Bill #${bill.billNumber} - ${bill.hotelName}`,
        });
        return {
          success: true,
          sharedDirectly: true,
          message: 'Small A4 Bill PDF shared to WhatsApp!',
        };
      } catch (shareErr: any) {
        if (shareErr?.name === 'AbortError') {
          return {
            success: true,
            sharedDirectly: true,
            message: 'Share cancelled by user.',
          };
        }
        console.log('Native PDF share skipped or failed, falling back:', shareErr);
      }
    }
  }

  // 3. Fallback for desktop / browsers without native file share:
  // Auto-download the PDF to device and launch WhatsApp to target phone number
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);

  openWhatsAppChatWithoutText(cleanNumber);

  return {
    success: true,
    sharedDirectly: false,
    message: 'Small A4 PDF saved to device and WhatsApp opened!',
  };
}

/**
 * Opens WhatsApp chat without any text message
 */
export function openWhatsAppChatWithoutText(phoneNumber?: string): void {
  let url = '';
  if (phoneNumber && phoneNumber.trim().length > 0) {
    let cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length === 10) {
      cleanNumber = '91' + cleanNumber;
    }
    url = `https://wa.me/${cleanNumber}`;
  } else {
    url = `https://api.whatsapp.com/`;
  }

  window.open(url, '_blank');
}
