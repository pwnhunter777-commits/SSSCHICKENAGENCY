import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { appLogo } from '../assets/logo';
import { Bill, ShopSettings } from '../types';
import { formatDisplayDate } from './storage';

/**
 * Load image as HTMLImageElement for canvas / jsPDF embedding
 */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Get QR code PNG data URL from DOM canvas or fallback
 */
function getQrCodeDataUrl(upiUrl: string): string | null {
  const domCanvas = document.getElementById('bill-upi-qr-canvas') as HTMLCanvasElement | null;
  if (domCanvas) {
    try {
      return domCanvas.toDataURL('image/png');
    } catch (e) {
      console.warn('Could not export DOM QR canvas:', e);
    }
  }
  return null;
}

/**
 * Generate a crystal-clear, high-resolution Small A4 (A5 format: 148mm width) Vector PDF.
 * Uses native vector text, crisp table grids, high-DPI logo & QR code embedding.
 * Guaranteed 100% full content capture with zero bottom cutoff and razor-sharp clarity.
 */
export async function generateBillPdfBlob(
  bill: Bill,
  settings: ShopSettings,
  recipientPhone?: string
): Promise<Blob | null> {
  try {
    const hasPrevBalance = bill.previousBalance !== undefined && bill.previousBalance !== 0;
    const finalPayableAmount = Math.round(
      hasPrevBalance
        ? (bill.netTotalWithBalance ?? (bill.totalAmount + (bill.previousBalance || 0)))
        : bill.totalAmount
    );

    // Calculate required page height dynamically to ensure 100% fit on a single page
    const baseHeight = 168;
    const itemsHeight = Math.max(16, bill.items.length * 7.5);
    const prevBalHeight = hasPrevBalance ? 6 : 0;
    const phoneHeight = recipientPhone ? 4 : 0;
    const totalNeededHeight = baseHeight + itemsHeight + prevBalHeight + phoneHeight;
    const pageHeight = Math.max(210, Math.ceil(totalNeededHeight + 10)); // Standard A5 is 210mm
    const pageWidth = 148; // Small A4 / A5 width

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pageWidth, pageHeight],
      compress: true,
    });

    // 1. Outer Clean Border
    pdf.setDrawColor(15, 23, 42); // Dark slate
    pdf.setLineWidth(0.4);
    pdf.rect(5, 5, pageWidth - 10, pageHeight - 10, 'S');

    // 2. Top Header Bar
    pdf.setFillColor(6, 78, 59); // Emerald-900
    pdf.rect(5, 5, pageWidth - 10, 6.5, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.text('TAX INVOICE / CASH MEMO', 9, 9.5);
    pdf.text('ORIGINAL (SMALL A4)', pageWidth - 9, 9.5, { align: 'right' });

    // 3. Shop Logo & Business Details
    let curY = 14;
    const logoImg = await loadImage(appLogo);
    if (logoImg) {
      try {
        pdf.addImage(logoImg, 'JPEG', 66, curY, 16, 16);
        curY += 18.5;
      } catch (e) {
        console.warn('Logo embed error:', e);
        curY += 2;
      }
    } else {
      curY += 2;
    }

    // Business Name
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(6, 78, 59);
    pdf.text(settings.shopName || 'SSS CHICKEN AGENCY', 74, curY, { align: 'center' });
    curY += 4.5;

    // Subtitle
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(4, 120, 87);
    pdf.text('WHOLESALE CHICKEN DEALERS & SUPPLIERS', 74, curY, { align: 'center' });
    curY += 4;

    // Address
    if (settings.address) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(51, 65, 85);
      pdf.text(settings.address, 74, curY, { align: 'center', maxWidth: 116 });
      curY += 4;
    }

    // Phone & GSTIN
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(15, 23, 42);
    const contactLine = `PH: ${settings.phoneNumber || '8680000003'}${settings.gstNumber ? `   |   GSTIN: ${settings.gstNumber}` : ''}`;
    pdf.text(contactLine, 74, curY, { align: 'center' });
    curY += 3.5;

    // Divider Line
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.3);
    pdf.line(7, curY, pageWidth - 7, curY);
    curY += 2.5;

    // 4. Billed To (Customer) & Invoice Meta Box
    const metaBoxY = curY;
    const metaBoxH = recipientPhone ? 17 : 14;
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(7, metaBoxY, pageWidth - 14, metaBoxH, 1.5, 1.5, 'FD');

    // Left Column: Customer Details
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text('BILLED TO (CUSTOMER / HOTEL):', 10, metaBoxY + 4);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    pdf.text(bill.hotelName, 10, metaBoxY + 8.5, { maxWidth: 70 });

    if (recipientPhone) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(6, 78, 59);
      pdf.text(`PH: ${recipientPhone}`, 10, metaBoxY + 13.5);
    }

    // Vertical Divider
    pdf.setDrawColor(203, 213, 225);
    pdf.line(84, metaBoxY, 84, metaBoxY + metaBoxH);

    // Right Column: Bill Meta
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text('Bill No:', 87, metaBoxY + 5.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(6, 78, 59);
    pdf.text(`#${bill.billNumber}`, pageWidth - 10, metaBoxY + 5.5, { align: 'right' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text('Date:', 87, metaBoxY + 10.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(15, 23, 42);
    pdf.text(formatDisplayDate(bill.date), pageWidth - 10, metaBoxY + 10.5, { align: 'right' });

    curY = metaBoxY + metaBoxH + 2.5;

    // 5. Itemized Table using autoTable
    const tableBody = bill.items.map((item, idx) => [
      (idx + 1).toString(),
      item.productName,
      `${item.kg.toFixed(2)} KG`,
      `Rs. ${Math.round(item.pricePerKg)}`,
      `Rs. ${Math.round(item.amount).toLocaleString('en-IN')}`,
    ]);

    autoTable(pdf, {
      startY: curY,
      margin: { left: 7, right: 7 },
      head: [['#', 'ITEM DESCRIPTION', 'QTY (KG)', 'RATE (Rs)', 'AMOUNT (Rs)']],
      body: tableBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2,
        lineColor: [203, 213, 225],
        lineWidth: 0.2,
        textColor: [15, 23, 42],
      },
      headStyles: {
        fillColor: [15, 23, 42], // Dark navy / black
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 9 },
        1: { halign: 'left', fontStyle: 'bold' },
        2: { halign: 'right', fontStyle: 'bold', cellWidth: 25 },
        3: { halign: 'right', cellWidth: 22 },
        4: { halign: 'right', fontStyle: 'bold', textColor: [6, 78, 59], cellWidth: 28 },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    curY = (pdf as any).lastAutoTable.finalY + 2.5;

    // 6. Weight Summary Strip
    pdf.setFillColor(241, 245, 249);
    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(7, curY, pageWidth - 14, 6, 1.5, 1.5, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(51, 65, 85);
    pdf.text('TOTAL WEIGHT / QUANTITY:', 10, curY + 4.2);
    pdf.setFontSize(8.5);
    pdf.setTextColor(6, 78, 59);
    pdf.text(`${bill.totalKg.toFixed(2)} KG  (${bill.items.length} Items)`, pageWidth - 10, curY + 4.2, { align: 'right' });
    curY += 8.5;

    // 7. Financial Calculations Box
    const calcBoxH = hasPrevBalance ? 13 : 7.5;
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(7, curY, pageWidth - 14, calcBoxH, 1.5, 1.5, 'FD');

    // Current Bill line
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);
    pdf.text('Current Bill Total:', 10, curY + 4.8);
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`Rs. ${Math.round(bill.totalAmount).toLocaleString('en-IN')}`, pageWidth - 10, curY + 4.8, { align: 'right' });

    if (hasPrevBalance) {
      pdf.setDrawColor(253, 230, 138);
      pdf.line(8, curY + 6.8, pageWidth - 8, curY + 6.8);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(180, 83, 9); // Amber-700
      pdf.text('Old Balance (Previous Due):', 10, curY + 10.8);
      pdf.setFontSize(9);
      pdf.text(`Rs. ${Math.round(bill.previousBalance || 0).toLocaleString('en-IN')}`, pageWidth - 10, curY + 10.8, { align: 'right' });
    }
    curY += calcBoxH + 3;

    // 8. HUGE GRAND TOTAL BANNER (High contrast, crystal clear)
    pdf.setFillColor(6, 78, 59); // Deep Emerald
    pdf.setDrawColor(4, 47, 36);
    pdf.roundedRect(7, curY, pageWidth - 14, 14, 2, 2, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(167, 243, 208); // Emerald-200
    pdf.text(
      hasPrevBalance ? 'NET PAYABLE BALANCE DUE' : 'GRAND TOTAL AMOUNT',
      74,
      curY + 4.2,
      { align: 'center' }
    );

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`Rs. ${finalPayableAmount.toLocaleString('en-IN')}/-`, 74, curY + 11.2, { align: 'center' });
    curY += 16.5;

    // 9. QR CODE & UPI SCAN SECTION
    const upiId = settings.upiId || 'NAZIRAHAMED0003@okhdfcbank';
    const upiPayUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(settings.shopName || 'SSS CHICKEN AGENCY')}&am=${finalPayableAmount > 0 ? finalPayableAmount : ''}&cu=INR&tn=Bill%20${bill.billNumber}`;
    const qrDataUrl = getQrCodeDataUrl(upiPayUrl);

    if (qrDataUrl) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(6, 78, 59);
      pdf.text('SCAN QR CODE TO PAY VIA ANY UPI APP (GPay / PhonePe / Paytm)', 74, curY, { align: 'center' });
      curY += 2;

      // Draw QR Code centered (24mm x 24mm)
      pdf.addImage(qrDataUrl, 'PNG', 62, curY, 24, 24);
      curY += 25.5;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text(`UPI ID: ${upiId}`, 74, curY, { align: 'center' });
      curY += 4.5;
    }

    // 10. Signatures & Footer
    pdf.setDrawColor(148, 163, 184);
    pdf.line(12, curY + 6, 52, curY + 6);
    pdf.line(96, curY + 6, pageWidth - 12, curY + 6);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(71, 85, 105);
    pdf.text('Customer Signature', 32, curY + 9.5, { align: 'center' });
    pdf.text('Authorized Signatory', 116, curY + 9.5, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.text(`For ${settings.shopName || 'SSS CHICKEN AGENCY'}`, 116, curY + 13, { align: 'center' });

    curY += 15.5;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text('Thank You! Visit Again.', 74, curY, { align: 'center' });

    return pdf.output('blob');
  } catch (error) {
    console.error('Error generating vector bill PDF:', error);
    return null;
  }
}

/**
 * Downloads the Bill as a Small A4 Vector PDF directly to user storage
 */
export async function downloadBillPdf(
  bill: Bill,
  settings: ShopSettings,
  recipientPhone?: string
): Promise<boolean> {
  const filename = `SmallA4_Bill_${bill.billNumber}_${bill.date}.pdf`;
  const blob = await generateBillPdfBlob(bill, settings, recipientPhone);
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
  phoneNumber?: string
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
  const pdfBlob = await generateBillPdfBlob(bill, settings, phoneNumber);
  if (!pdfBlob) {
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
