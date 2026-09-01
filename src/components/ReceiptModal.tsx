import React, { useState, useEffect } from 'react';
import {
  Printer,
  X,
  Check,
  AlertCircle,
  MessageCircle,
  Send,
  Phone,
  QrCode,
  Download,
  Building2,
  Calendar,
  Hash,
  Scale,
  CreditCard,
  FileSpreadsheet,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { appLogo } from '../assets/logo';
import { Bill, HotelItem, LanguageCode, ShopSettings } from '../types';
import { formatDisplayDate, getHotelPhone, saveOrUpdateHotelPhone } from '../utils/storage';
import { TRANSLATIONS } from '../utils/translations';
import { shareBillAsPdfToWhatsApp, downloadBillPdf, openWhatsAppChatWithoutText } from '../utils/whatsapp';

interface ReceiptModalProps {
  bill: Bill | null;
  settings: ShopSettings;
  hotels?: HotelItem[];
  language: LanguageCode;
  onUpdateHotelPhone?: (hotelIdOrName: string, phone: string) => void;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  bill,
  settings,
  hotels = [],
  language,
  onUpdateHotelPhone,
  onClose,
}) => {
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showWhatsAppInput, setShowWhatsAppInput] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState('');
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Pre-fill phone number from saved hotel records in local storage
  useEffect(() => {
    if (bill) {
      const savedPhone = getHotelPhone(bill.hotelId || bill.hotelName, hotels);
      setRecipientPhone(savedPhone || '');
      if (savedPhone) {
        setShowWhatsAppInput(true);
      }
    }
  }, [bill, hotels]);

  if (!bill) return null;

  const hasPreviousBalance = bill.previousBalance !== undefined && bill.previousBalance !== 0;
  const finalPayableAmount = Math.round(
    hasPreviousBalance
      ? (bill.netTotalWithBalance ?? (bill.totalAmount + (bill.previousBalance || 0)))
      : bill.totalAmount
  );

  // Generate UPI Deep Link for scanning & instant pay
  const upiId = settings.upiId || 'NAZIRAHAMED0003@okhdfcbank';
  const shopNameEncoded = encodeURIComponent(settings.shopName || 'SSS CHICKEN AGENCY');
  const upiPayUrl = `upi://pay?pa=${upiId}&pn=${shopNameEncoded}&am=${finalPayableAmount > 0 ? finalPayableAmount : ''}&cu=INR&tn=Bill%20${bill.billNumber}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    setStatusMessage({
      type: 'info',
      text: language === 'ta' ? 'Small A4 PDF உருவாக்கப்படுகிறது...' : 'Generating Small A4 PDF...',
    });

    try {
      const success = await downloadBillPdf(bill, settings, 'printable-thermal-receipt');
      if (success) {
        setStatusMessage({
          type: 'success',
          text: language === 'ta' ? '📄 Small A4 PDF போனில் சேமிக்கப்பட்டது!' : '📄 Small A4 PDF saved to your device!',
        });
      } else {
        throw new Error('PDF generation failed');
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: language === 'ta' ? 'PDF உருவாக்க முடியவில்லை' : 'Failed to generate PDF',
      });
    } finally {
      setIsDownloadingPdf(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleSendWhatsAppPdf = async () => {
    setIsSharingWhatsApp(true);
    setStatusMessage({
      type: 'info',
      text: language === 'ta' ? 'Small A4 பில் PDF அனுப்பப்படுகிறது...' : 'Generating Small A4 PDF & opening WhatsApp...',
    });

    try {
      if (recipientPhone.trim() && onUpdateHotelPhone) {
        const hotelKey = bill.hotelId || bill.hotelName;
        if (hotelKey) {
          saveOrUpdateHotelPhone(hotelKey, recipientPhone.trim());
          onUpdateHotelPhone(hotelKey, recipientPhone.trim());
        }
      }

      const res = await shareBillAsPdfToWhatsApp(
        bill,
        settings,
        recipientPhone,
        'printable-thermal-receipt'
      );

      setStatusMessage({
        type: 'success',
        text: language === 'ta'
          ? (res.sharedDirectly ? '📄 Small A4 பில் PDF பகிரப்பட்டது!' : '📄 Small A4 PDF சேமிக்கப்பட்டு வாட்ஸ்அப் திறக்கப்பட்டது!')
          : (res.sharedDirectly ? '📄 Small A4 Bill PDF shared to WhatsApp!' : '📄 Small A4 PDF saved & WhatsApp opened!'),
      });
    } catch (err: any) {
      openWhatsAppChatWithoutText(recipientPhone);
      setStatusMessage({
        type: 'info',
        text: language === 'ta' ? 'வாட்ஸ்அப் திறக்கப்பட்டது!' : 'WhatsApp opened!',
      });
    } finally {
      setIsSharingWhatsApp(false);
      setTimeout(() => {
        setStatusMessage(null);
      }, 5000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-emerald-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] border border-emerald-300">
        {/* Modal Top Bar */}
        <div className="bg-emerald-900 text-white px-4 sm:px-5 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-800 border border-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg tracking-wide leading-tight flex items-center gap-2">
                <span>{t.printReceipt}</span>
                <span className="bg-emerald-800 text-emerald-200 text-xs px-2 py-0.5 rounded-md border border-emerald-700 font-mono font-bold">
                  #{bill.billNumber}
                </span>
              </h3>
              <span className="text-[11px] sm:text-xs text-emerald-300 font-bold">
                {language === 'ta' ? 'Small A4 பில் (பெரிய கணக்கீடு & Grand Total)' : 'Small A4 Bill (Big Numbers & Clear Calculations)'}
              </span>
            </div>
          </div>
          <button
            id="close-receipt-modal-btn"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition-all"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Toast inside Modal */}
        {statusMessage && (
          <div
            className={`mx-4 mt-2.5 p-2.5 rounded-2xl text-xs font-medium flex items-center gap-2 shadow-xs ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : statusMessage.type === 'error'
                ? 'bg-amber-50 text-amber-900 border border-amber-200'
                : 'bg-emerald-100/70 text-emerald-900 border border-emerald-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            )}
            <span className="flex-1 font-semibold">{statusMessage.text}</span>
          </div>
        )}

        {/* Receipt Content Area (Small A4 Snug Proportions) */}
        <div className="p-2 sm:p-3.5 overflow-y-auto flex-1 bg-slate-100/90 flex justify-center">
          <div
            id="printable-thermal-receipt"
            className="w-full max-w-[560px] bg-white border-2 border-gray-900 rounded-2xl p-4 sm:p-5 text-gray-950 shadow-md font-sans transition-all leading-normal"
          >
            {/* Top Invoice Banner */}
            <div className="flex items-center justify-between border-b-2 border-gray-900 pb-1.5 mb-2.5 text-xs font-black text-gray-800 uppercase tracking-wider">
              <span className="bg-emerald-900 text-white px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-black">
                {language === 'ta' ? 'வரி விலைப்பட்டியல் / TAX INVOICE' : 'TAX INVOICE / CASH MEMO'}
              </span>
              <span className="text-[10px] sm:text-[11px] text-gray-600 font-black tracking-wider">
                ORIGINAL (SMALL A4)
              </span>
            </div>

            {/* Header with App Logo & Business Details */}
            <div className="text-center pb-3 border-b-2 border-gray-950">
              <div className="flex justify-center mb-1.5">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-emerald-700 shadow-xs bg-emerald-50 p-1 flex items-center justify-center">
                  <img
                    src={appLogo}
                    alt="SSS Chicken Agency Logo"
                    className="w-full h-full object-cover rounded-xl"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <h1 className="font-black text-xl sm:text-2xl uppercase tracking-wide text-emerald-950 leading-tight">
                {settings.shopName || 'SSS CHICKEN AGENCY'}
              </h1>
              <p className="text-[11px] sm:text-xs font-black text-emerald-800 uppercase tracking-widest mt-0.5">
                {language === 'ta' ? 'மொத்த கோழி வியாபாரம் & சப்ளையர்ஸ்' : 'Wholesale Chicken Dealers & Suppliers'}
              </p>
              {settings.address && (
                <p className="text-[11px] sm:text-xs text-gray-800 mt-1 leading-snug font-bold max-w-md mx-auto">
                  {settings.address}
                </p>
              )}
              <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap font-black text-xs text-gray-950">
                {settings.phoneNumber && (
                  <span className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-300">
                    <Phone className="w-3 h-3 text-emerald-700 inline" />
                    <span>PH: {settings.phoneNumber}</span>
                  </span>
                )}
                {settings.gstNumber && (
                  <span className="bg-gray-100 px-2 py-0.5 rounded-lg text-[11px] border border-gray-400 font-mono font-black">
                    GSTIN: {settings.gstNumber}
                  </span>
                )}
              </div>
            </div>

            {/* Customer & Invoice Meta Grid */}
            <div className="my-2.5 p-2.5 bg-gray-50/95 rounded-xl border-2 border-gray-300 grid grid-cols-12 gap-2 text-xs">
              {/* Left Column: Billed To / Hotel */}
              <div className="col-span-7 pr-1.5 border-r-2 border-gray-300 space-y-0.5">
                <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-emerald-700 flex-shrink-0" />
                  <span>{language === 'ta' ? 'வாடிக்கையாளர் / ஹோட்டல்:' : 'BILLED TO (CUSTOMER):'}</span>
                </div>
                <div className="font-black text-sm sm:text-base text-gray-950 leading-snug break-words">
                  {bill.hotelName}
                </div>
                {recipientPhone && (
                  <div className="text-[11px] font-black text-emerald-900 flex items-center gap-1">
                    <Phone className="w-2.5 h-2.5 text-emerald-700" />
                    <span>{recipientPhone}</span>
                  </div>
                )}
              </div>

              {/* Right Column: Invoice Details */}
              <div className="col-span-5 pl-1 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-gray-600 flex items-center gap-1">
                    <Hash className="w-3 h-3 text-emerald-700 flex-shrink-0" />
                    <span>{language === 'ta' ? 'பில் எண்:' : 'Bill No:'}</span>
                  </span>
                  <span className="font-black text-xs text-emerald-950 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-400 font-mono">
                    #{bill.billNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-gray-600 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-700 flex-shrink-0" />
                    <span>{language === 'ta' ? 'தேதி:' : 'Date:'}</span>
                  </span>
                  <span className="font-black text-gray-950 text-xs font-mono">
                    {formatDisplayDate(bill.date)}
                  </span>
                </div>
              </div>
            </div>

            {/* BIG ITEMIZED CALCULATION TABLE */}
            <div className="py-1">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-900 text-white font-black text-[11px] sm:text-xs uppercase border-2 border-gray-900">
                    <th className="py-2 px-1.5 text-center w-[8%] border-r border-gray-700">#</th>
                    <th className="py-2 px-2 text-left w-[42%] border-r border-gray-700">
                      {language === 'ta' ? 'பொருள் (ITEM)' : 'ITEM DESCRIPTION'}
                    </th>
                    <th className="py-2 px-1.5 text-right w-[16%] border-r border-gray-700">
                      {language === 'ta' ? 'எடை (KG)' : 'QTY (KG)'}
                    </th>
                    <th className="py-2 px-1.5 text-right w-[16%] border-r border-gray-700">
                      {language === 'ta' ? 'விலை (₹)' : 'RATE (₹)'}
                    </th>
                    <th className="py-2 px-2 text-right w-[18%]">
                      {language === 'ta' ? 'தொகை (₹)' : 'AMOUNT (₹)'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-gray-300 font-mono border-x-2 border-b-2 border-gray-900 text-xs sm:text-sm">
                  {bill.items.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/80'}>
                      <td className="py-2 px-1.5 text-center font-bold text-gray-500 border-r-2 border-gray-200">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2 text-left font-sans font-black text-gray-950 text-xs sm:text-sm border-r-2 border-gray-200 break-words">
                        {item.productName}
                      </td>
                      <td className="py-2 px-1.5 text-right font-black text-gray-950 border-r-2 border-gray-200 text-xs sm:text-sm">
                        {item.kg.toFixed(2)}
                      </td>
                      <td className="py-2 px-1.5 text-right font-bold text-gray-800 border-r-2 border-gray-200 text-xs sm:text-sm">
                        {Math.round(item.pricePerKg)}
                      </td>
                      <td className="py-2 px-2 text-right font-black text-emerald-950 text-sm sm:text-base">
                        ₹{Math.round(item.amount).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Quantity & Weight Strip */}
            <div className="flex items-center justify-between p-2.5 bg-gray-100 rounded-xl border-2 border-gray-300 my-2">
              <div className="flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-emerald-800" />
                <span className="text-xs font-black text-gray-800 uppercase tracking-wide">
                  {language === 'ta' ? 'மொத்த எடை (Total Weight):' : 'Total Quantity / Weight:'}
                </span>
              </div>
              <div className="font-black text-sm sm:text-base text-emerald-950 font-mono bg-white px-2.5 py-0.5 rounded-lg border-2 border-gray-400">
                {bill.totalKg.toFixed(2)} KG ({bill.items.length} {language === 'ta' ? 'பொருட்கள்' : 'Items'})
              </div>
            </div>

            {/* BIG FINANCIAL CALCULATIONS BREAKDOWN BOX */}
            <div className="p-3 bg-gray-50 rounded-xl border-2 border-gray-300 space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between items-center text-gray-800 font-bold">
                <span className="font-black">
                  {language === 'ta' ? 'நடப்பு பில் தொகை (Current Bill Total):' : 'Current Bill Total:'}
                </span>
                <span className="font-black text-base text-gray-950 font-mono">
                  ₹{Math.round(bill.totalAmount).toLocaleString('en-IN')}
                </span>
              </div>

              {hasPreviousBalance && (
                <div className="flex justify-between items-center text-amber-950 font-bold pt-1.5 border-t-2 border-dashed border-amber-300 bg-amber-50/90 -mx-3 px-3 py-1.5">
                  <span className="flex items-center gap-1.5 font-black text-xs">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                    <span>{language === 'ta' ? 'பழைய பாக்கி (Previous Balance Due):' : 'Old Balance (Previous Due):'}</span>
                  </span>
                  <span className="font-black text-base text-amber-900 font-mono">
                    ₹{Math.round(bill.previousBalance || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>

            {/* HUGE GRAND TOTAL CARD */}
            <div className="my-3 p-4 bg-emerald-900 text-white rounded-2xl text-center shadow-md border-2 border-emerald-950">
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-emerald-200 block mb-0.5">
                {hasPreviousBalance
                  ? (language === 'ta' ? 'மொத்த பாக்கி தொகை (NET PAYABLE DUE)' : 'TOTAL PAYABLE BALANCE DUE')
                  : (language === 'ta' ? 'மொத்த தொகை (GRAND TOTAL AMOUNT)' : 'GRAND TOTAL AMOUNT')}
              </span>
              <div className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center justify-center gap-1.5 font-mono mt-0.5">
                <span className="text-emerald-300">₹</span>
                <span>{finalPayableAmount.toLocaleString('en-IN')}/-</span>
              </div>
            </div>

            {/* QR CODE TO SCAN & PAY SECTION */}
            <div className="pt-2.5 pb-2.5 text-center border-t-2 border-b-2 border-gray-950 my-2.5">
              <div className="flex items-center justify-center gap-1.5 text-xs font-black text-emerald-950 mb-2 uppercase">
                <QrCode className="w-4 h-4 text-emerald-800" />
                <span>{language === 'ta' ? 'UPI ஸ்கேன் செய்து உடனடியாக செலுத்தவும்' : 'SCAN QR CODE TO PAY VIA ANY UPI APP'}</span>
              </div>

              <div className="inline-block p-2.5 bg-white rounded-2xl border-2 border-gray-900 shadow-sm">
                <QRCodeSVG
                  value={upiPayUrl}
                  size={135}
                  level="M"
                  includeMargin={false}
                />
              </div>

              <div className="mt-2 space-y-0.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-300">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-xs font-black text-emerald-950 font-mono">
                    {settings.upiId || 'NAZIRAHAMED0003@okhdfcbank'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-700 font-bold">
                  Google Pay • PhonePe • Paytm • BHIM • Amazon Pay
                </p>
              </div>
            </div>

            {/* Signature & Terms Footer */}
            <div className="pt-1.5">
              <div className="grid grid-cols-2 gap-4 text-center text-xs font-bold text-gray-800 py-2">
                <div className="border-t-2 border-gray-400 pt-1.5">
                  <span>{language === 'ta' ? 'வாடிக்கையாளர் கையொப்பம்' : 'Customer Signature'}</span>
                </div>
                <div className="border-t-2 border-gray-400 pt-1.5">
                  <span>{language === 'ta' ? 'அங்கீகரிக்கப்பட்ட கையொப்பம்' : 'Authorized Signatory'}</span>
                  <p className="text-[11px] text-gray-600 font-bold mt-0.5">
                    For {settings.shopName || 'SSS CHICKEN AGENCY'}
                  </p>
                </div>
              </div>

              <div className="text-center pt-2 border-t border-gray-200">
                <p className="font-black text-xs text-gray-950">
                  {language === 'ta' ? 'நன்றி! மீண்டும் வருக!' : 'Thank You! Visit Again.'}
                </p>
                <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                  This is a computer-generated tax invoice.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-3.5 bg-emerald-50/90 border-t-2 border-emerald-200 flex flex-col gap-2">
          {/* 1. WhatsApp as Small A4 PDF */}
          <div className="bg-emerald-100/80 border border-emerald-300 rounded-2xl p-2 space-y-1.5">
            {!showWhatsAppInput ? (
              <button
                id="modal-open-whatsapp-btn"
                type="button"
                onClick={() => setShowWhatsAppInput(true)}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm transition-all touch-manipulation active:scale-[0.99]"
              >
                <MessageCircle className="w-5 h-5 fill-white" />
                <span>{language === 'ta' ? 'வாட்ஸ்அப் Small A4 PDF (WhatsApp PDF)' : 'WhatsApp (Small A4 PDF)'}</span>
              </button>
            ) : (
              <div className="space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-700" />
                    <span>
                      {language === 'ta' ? 'வாட்ஸ்அப் எண் (PDF அனுப்ப):' : 'WhatsApp Number (Send PDF):'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowWhatsAppInput(false)}
                    className="text-gray-500 hover:text-gray-700 text-xs underline font-bold"
                  >
                    {language === 'ta' ? 'மறை' : 'Hide'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    id="modal-whatsapp-phone-input"
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="flex-1 px-3 py-2 bg-white border border-emerald-400 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <button
                    id="btn-send-whatsapp-confirm"
                    type="button"
                    disabled={isSharingWhatsApp}
                    onClick={handleSendWhatsAppPdf}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSharingWhatsApp ? '...' : (language === 'ta' ? 'PDF அனுப்பு' : 'Send PDF')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Download Small A4 PDF & Print Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              id="modal-download-pdf-btn"
              type="button"
              disabled={isDownloadingPdf}
              onClick={handleDownloadPdf}
              className="py-2.5 px-3 bg-white hover:bg-emerald-50 active:bg-emerald-100 border-2 border-emerald-600 text-emerald-800 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs transition-all touch-manipulation active:scale-[0.99]"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>{isDownloadingPdf ? '...' : (language === 'ta' ? 'PDF சேமி' : 'Save PDF')}</span>
            </button>

            <button
              id="modal-main-print-btn"
              type="button"
              onClick={handlePrint}
              className="py-2.5 px-3 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition-all touch-manipulation active:scale-[0.99]"
            >
              <Printer className="w-4 h-4" />
              <span>{language === 'ta' ? 'பிரிண்ட்' : 'Print'}</span>
            </button>
          </div>

          {/* 3. Cancel / Close */}
          <button
            id="modal-cancel-btn"
            type="button"
            onClick={onClose}
            className="w-full py-1.5 bg-transparent hover:bg-gray-100 text-gray-500 text-xs font-bold rounded-xl transition-colors"
          >
            {language === 'ta' ? 'மூடு (Close)' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
