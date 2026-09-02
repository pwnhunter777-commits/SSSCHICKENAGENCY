import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Bill,
  getShopDisplayAddress,
  getShopDisplayName,
  HotelItem,
  LanguageCode,
  ProductItem,
  resolveHotelDisplayName,
  resolveItemDisplayName,
  ShopSettings,
} from '../types';
import { formatDisplayDate, formatDisplayTime } from './storage';

/**
 * Get QR code PNG data URL from DOM canvas or fallback
 */
function getQrCodeDataUrl(): string | null {
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
 * Generate a crystal-clear, professional A5 Sheet (148mm x 210mm) PDF.
 * Uses high-resolution DOM rasterization (3x pixelRatio) so Tamil typography (glyphs, fonts, conjuncts)
 * and English vector typography are 100% crisp and identical to the on-screen preview.
 * Falls back to jsPDF autotable vector rendering if DOM element is not mounted.
 */
export async function generateBillPdfBlob(
  bill: Bill,
  settings: ShopSettings,
  recipientPhone?: string,
  elementId: string = 'printable-thermal-receipt',
  lang: LanguageCode = 'en',
  hotels: HotelItem[] = [],
  products: ProductItem[] = []
): Promise<Blob | null> {
  const receiptElem = document.getElementById(elementId);

  // 1. HIGH-DPI DOM RASTERIZATION (Ensures 100% pure Tamil & English rendering with exact fonts)
  if (receiptElem) {
    try {
      const dataUrl = await toPng(receiptElem, {
        pixelRatio: 3,
        backgroundColor: '#ffffff',
        cacheBust: true,
        quality: 1,
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [148, 210], // Standard A5 dimensions (148mm x 210mm)
        compress: true,
      });

      const pdfWidth = 148;
      const pdfHeight = 210;
      const margin = 4;
      const printableWidth = pdfWidth - margin * 2; // 140mm

      const imgProps = pdf.getImageProperties(dataUrl);
      const imgHeight = (imgProps.height * printableWidth) / imgProps.width;

      const topPos = imgHeight < pdfHeight - margin * 2 ? (pdfHeight - imgHeight) / 2 : margin;

      pdf.addImage(dataUrl, 'PNG', margin, topPos, printableWidth, imgHeight, undefined, 'FAST');
      return pdf.output('blob');
    } catch (domErr) {
      console.warn('DOM to PDF image capture skipped/failed, using vector fallback:', domErr);
    }
  }

  // 2. VECTOR PDF FALLBACK GENERATOR
  try {
    const hasPrevBalance = bill.previousBalance !== undefined && bill.previousBalance !== 0;
    const finalPayableAmount = Math.round(
      hasPrevBalance
        ? (bill.netTotalWithBalance ?? (bill.totalAmount + (bill.previousBalance || 0)))
        : bill.totalAmount
    );

    const isTamil = lang === 'ta';
    const pageWidth = 148;
    const pageHeight = 210;
    const margin = 6;
    const contentWidth = pageWidth - margin * 2; // 136mm

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pageWidth, pageHeight],
      compress: true,
    });

    // Outer Border
    pdf.setDrawColor(30, 41, 59);
    pdf.setLineWidth(0.4);
    pdf.rect(margin, margin, contentWidth, pageHeight - margin * 2, 'S');

    // Header: Store Name
    let curY = margin + 5;
    const shopName = getShopDisplayName(settings, lang);
    const shopAddress = getShopDisplayAddress(settings, lang);
    const hotelName = resolveHotelDisplayName(bill.hotelName, bill.hotelId, hotels, lang);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.setTextColor(15, 23, 42);
    pdf.text(shopName.toUpperCase(), pageWidth / 2, curY, { align: 'center' });
    curY += 4.5;

    if (shopAddress) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(51, 65, 85);
      pdf.text(shopAddress, pageWidth / 2, curY, { align: 'center', maxWidth: 120 });
      curY += 4;
    }

    // Phone & GST
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    const phone = settings.phoneNumber || '8680000003';
    const gst = settings.gstNumber || '34AQPN8846J2ZF';
    const phoneLabel = isTamil ? 'போன்' : 'Phone';
    const gstLabel = isTamil ? 'ஜிஎஸ்டி' : 'GSTIN';
    pdf.text(`${phoneLabel}: ${phone}   |   ${gstLabel}: ${gst}`, pageWidth / 2, curY, { align: 'center' });
    curY += 3.5;

    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.3);
    pdf.line(margin + 2, curY, pageWidth - margin - 2, curY);
    curY += 2;

    // Customer & Bill Details Box
    const metaBoxY = curY;
    const metaBoxH = recipientPhone ? 15 : 13;
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(margin + 2, metaBoxY, contentWidth - 4, metaBoxH, 1, 1, 'FD');

    // Left: Customer
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);
    pdf.text(isTamil ? 'வாடிக்கையாளர் / ஹோட்டல்:' : 'CUSTOMER / HOTEL:', margin + 5, metaBoxY + 4);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(15, 23, 42);
    pdf.text(hotelName, margin + 5, metaBoxY + 8.5, { maxWidth: 68 });

    if (recipientPhone) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(5, 150, 105);
      pdf.text(`${phoneLabel}: ${recipientPhone}`, margin + 5, metaBoxY + 12.5);
    }

    pdf.setDrawColor(203, 213, 225);
    pdf.line(82, metaBoxY, 82, metaBoxY + metaBoxH);

    // Right: Bill No, Date & Time
    const billTimeStr = formatDisplayTime(bill.createdAt, lang);
    const billDateStr = formatDisplayDate(bill.date, lang);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`${isTamil ? 'பில் எண்' : 'Bill No'}: #${bill.billNumber}`, contentWidth + margin - 5, metaBoxY + 4.5, { align: 'right' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text(`${isTamil ? 'தேதி' : 'Date'}: ${billDateStr}`, contentWidth + margin - 5, metaBoxY + 8.5, { align: 'right' });
    if (billTimeStr) {
      pdf.text(`${isTamil ? 'நேரம்' : 'Time'}: ${billTimeStr}`, contentWidth + margin - 5, metaBoxY + 12, { align: 'right' });
    }

    curY = metaBoxY + metaBoxH + 2;

    // Items Table
    const tableBody = bill.items.map((item, idx) => {
      const itemName = resolveItemDisplayName(item, products, lang);
      const unit = isTamil ? 'கிலோ' : 'KG';
      return [
        (idx + 1).toString(),
        itemName,
        `${item.kg.toFixed(2)} ${unit}`,
        `Rs. ${Math.round(item.pricePerKg)}`,
        `Rs. ${Math.round(item.amount).toLocaleString('en-IN')}`,
      ];
    });

    const headers = isTamil
      ? [['வ.எண்', 'பொருள் பெயர்', 'எடை (கிலோ)', 'விலை (₹)', 'தொகை (₹)']]
      : [['#', 'ITEM NAME', 'QTY (KG)', 'RATE (Rs)', 'AMOUNT (Rs)']];

    autoTable(pdf, {
      startY: curY,
      margin: { left: margin + 2, right: margin + 2 },
      head: headers,
      body: tableBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        cellPadding: 2.2,
        lineColor: [203, 213, 225],
        lineWidth: 0.2,
        textColor: [15, 23, 42],
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { halign: 'left', fontStyle: 'bold' },
        2: { halign: 'right', fontStyle: 'bold', cellWidth: 26 },
        3: { halign: 'right', cellWidth: 22 },
        4: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: 28 },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    curY = (pdf as any).lastAutoTable.finalY + 2;

    // Total Weight Strip
    pdf.setFillColor(241, 245, 249);
    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(margin + 2, curY, contentWidth - 4, 6, 1, 1, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);
    pdf.text(isTamil ? 'மொத்த எடை:' : 'TOTAL WEIGHT:', margin + 5, curY + 4.2);
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`${bill.totalKg.toFixed(2)} ${isTamil ? 'கிலோ' : 'KG'}`, contentWidth + margin - 5, curY + 4.2, { align: 'right' });
    curY += 8;

    // Calculations Breakdown
    const calcBoxH = hasPrevBalance ? 14 : 8;
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(margin + 2, curY, contentWidth - 4, calcBoxH, 1, 1, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(71, 85, 105);
    pdf.text(isTamil ? 'நடப்பு பில் தொகை:' : 'Current Bill Amount:', margin + 5, curY + 5.2);
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`Rs. ${Math.round(bill.totalAmount).toLocaleString('en-IN')}`, contentWidth + margin - 5, curY + 5.2, {
      align: 'right',
    });

    if (hasPrevBalance) {
      pdf.setDrawColor(253, 230, 138);
      pdf.line(margin + 3, curY + 7.2, contentWidth + margin - 3, curY + 7.2);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(180, 83, 9);
      pdf.text(isTamil ? 'பழைய பாக்கி தொகை:' : 'Old Balance (Previous Due):', margin + 5, curY + 11.5);
      pdf.setFontSize(10);
      pdf.text(
        `Rs. ${Math.round(bill.previousBalance || 0).toLocaleString('en-IN')}`,
        contentWidth + margin - 5,
        curY + 11.5,
        { align: 'right' }
      );
    }
    curY += calcBoxH + 2.5;

    // Grand Total
    pdf.setFillColor(15, 23, 42);
    pdf.roundedRect(margin + 2, curY, contentWidth - 4, 15, 1.5, 1.5, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(203, 213, 225);
    const totalLabel = isTamil
      ? (hasPrevBalance ? 'மொத்த பாக்கி தொகை' : 'செலுத்த வேண்டிய மொத்த தொகை')
      : (hasPrevBalance ? 'TOTAL PAYABLE DUE' : 'GRAND TOTAL');
    pdf.text(totalLabel, pageWidth / 2, curY + 4.5, { align: 'center' });

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`Rs. ${finalPayableAmount.toLocaleString('en-IN')}/-`, pageWidth / 2, curY + 11.8, {
      align: 'center',
    });
    curY += 17.5;

    // UPI QR Code
    const upiId = settings.upiId || 'NAZIRAHAMED0003@okhdfcbank';
    const qrDataUrl = getQrCodeDataUrl();

    if (qrDataUrl) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text(
        isTamil ? 'UPI மூலம் பணம் செலுத்த QR குறியீட்டை ஸ்கேன் செய்யவும்' : 'SCAN QR CODE TO PAY (UPI / GPay / PhonePe)',
        pageWidth / 2,
        curY,
        { align: 'center' }
      );
      curY += 2;

      pdf.addImage(qrDataUrl, 'PNG', pageWidth / 2 - 12, curY, 24, 24);
      curY += 25.5;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(15, 23, 42);
      pdf.text(`UPI: ${upiId}`, pageWidth / 2, curY, { align: 'center' });
    }

    return pdf.output('blob');
  } catch (error) {
    console.error('Error generating A5 bill PDF fallback:', error);
    return null;
  }
}

/**
 * Downloads the Bill as an A5 PDF directly to user storage
 */
export async function downloadBillPdf(
  bill: Bill,
  settings: ShopSettings,
  recipientPhone?: string,
  elementId: string = 'printable-thermal-receipt',
  lang: LanguageCode = 'en',
  hotels: HotelItem[] = [],
  products: ProductItem[] = []
): Promise<boolean> {
  const filename = `A5_Bill_${bill.billNumber}_${bill.date}.pdf`;
  const blob = await generateBillPdfBlob(bill, settings, recipientPhone, elementId, lang, hotels, products);
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
 * Shares the bill ONLY as an A5 PDF document to WhatsApp
 */
export async function shareBillAsPdfToWhatsApp(
  bill: Bill,
  settings: ShopSettings,
  phoneNumber?: string,
  elementId: string = 'printable-thermal-receipt',
  lang: LanguageCode = 'en',
  hotels: HotelItem[] = [],
  products: ProductItem[] = []
): Promise<{ success: boolean; sharedDirectly: boolean; message: string }> {
  const filename = `A5_Bill_${bill.billNumber}_${bill.date}.pdf`;

  let cleanNumber = '';
  if (phoneNumber && phoneNumber.trim().length > 0) {
    cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length === 10) {
      cleanNumber = '91' + cleanNumber;
    }
  }

  // 1. Generate A5 PDF blob
  const pdfBlob = await generateBillPdfBlob(bill, settings, phoneNumber, elementId, lang, hotels, products);
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
          message: 'A5 Bill PDF shared to WhatsApp!',
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
    message: 'A5 PDF saved to device and WhatsApp opened!',
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
