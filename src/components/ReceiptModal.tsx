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
  Clock,
  Hash,
  Scale,
  CreditCard,
  FileText,
  Languages,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
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
import { formatDisplayDate, formatDisplayTime, getHotelPhone, saveOrUpdateHotelPhone } from '../utils/storage';
import { TRANSLATIONS } from '../utils/translations';
import { shareBillAsPdfToWhatsApp, downloadBillPdf, openWhatsAppChatWithoutText } from '../utils/whatsapp';

interface ReceiptModalProps {
  bill: Bill | null;
  settings: ShopSettings;
  hotels?: HotelItem[];
  products?: ProductItem[];
  language: LanguageCode;
  onUpdateHotelPhone?: (hotelIdOrName: string, phone: string) => void;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  bill,
  settings,
  hotels = [],
  products = [],
  language,
  onUpdateHotelPhone,
  onClose,
}) => {
  // Allow toggling between English and Tamil directly in the modal while default is app language
  const [billLang, setBillLang] = useState<LanguageCode>(language);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showWhatsAppInput, setShowWhatsAppInput] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState('');

  // Keep billLang synced if language prop changes
  useEffect(() => {
    setBillLang(language);
  }, [language]);

  const t = TRANSLATIONS[billLang] || TRANSLATIONS.en;
  const isTamil = billLang === 'ta';

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

  // Resolved localized text fields
  const shopName = getShopDisplayName(settings, billLang);
  const shopAddress = getShopDisplayAddress(settings, billLang);
  const displayHotelName = resolveHotelDisplayName(bill.hotelName, bill.hotelId, hotels, billLang);
  const upiId = settings.upiId || 'NAZIRAHAMED0003@okhdfcbank';
  const shopNameEncoded = encodeURIComponent(settings.shopName || 'SSS CHICKEN AGENCY');
  const upiPayUrl = `upi://pay?pa=${upiId}&pn=${shopNameEncoded}&am=${finalPayableAmount > 0 ? finalPayableAmount : ''}&cu=INR&tn=Bill%20${bill.billNumber}`;

  const billTimeStr = formatDisplayTime(bill.createdAt, billLang);
  const billDateStr = formatDisplayDate(bill.date, billLang);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    setStatusMessage({
      type: 'info',
      text: isTamil ? 'A5 பில் PDF உருவாக்கப்படுகிறது...' : 'Generating A5 Bill PDF...',
    });

    try {
      const success = await downloadBillPdf(
        bill,
        settings,
        recipientPhone,
        'printable-thermal-receipt',
        billLang,
        hotels,
        products
      );
      if (success) {
        setStatusMessage({
          type: 'success',
          text: isTamil ? '📄 A5 PDF போனில் சேமிக்கப்பட்டது!' : '📄 A5 PDF saved to your device!',
        });
      } else {
        throw new Error('PDF generation failed');
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: isTamil ? 'PDF உருவாக்க முடியவில்லை' : 'Failed to generate PDF',
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
      text: isTamil ? 'A5 பில் PDF உருவாக்கப்படுகிறது...' : 'Generating A5 PDF & opening WhatsApp...',
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
        'printable-thermal-receipt',
        billLang,
        hotels,
        products
      );

      setStatusMessage({
        type: 'success',
        text: isTamil
          ? (res.sharedDirectly ? '📄 A5 பில் PDF பகிரப்பட்டது!' : '📄 A5 PDF சேமிக்கப்பட்டு வாட்ஸ்அப் திறக்கப்பட்டது!')
          : (res.sharedDirectly ? '📄 A5 Bill PDF shared to WhatsApp!' : '📄 A5 PDF saved & WhatsApp opened!'),
      });
    } catch {
      openWhatsAppChatWithoutText(recipientPhone);
      setStatusMessage({
        type: 'info',
        text: isTamil ? 'வாட்ஸ்அப் திறக்கப்பட்டது!' : 'WhatsApp opened!',
      });
    } finally {
      setIsSharingWhatsApp(false);
      setTimeout(() => {
        setStatusMessage(null);
      }, 5000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] border border-slate-300">
        {/* Modal Top Bar */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight flex items-center gap-2">
                <span>{t.printReceipt}</span>
                <span className="bg-slate-800 text-emerald-400 text-xs px-2 py-0.5 rounded font-mono font-bold">
                  #{bill.billNumber}
                </span>
              </h3>
              <span className="text-xs text-slate-300">
                {isTamil ? 'A5 தாள் பில் ரசீது' : 'A5 Sheet Invoice'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Bill Language Switcher */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setBillLang('ta')}
                className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                  billLang === 'ta'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="தமிழ் பில்"
              >
                தமிழ்
              </button>
              <button
                type="button"
                onClick={() => setBillLang('en')}
                className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                  billLang === 'en'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="English Bill"
              >
                ENG
              </button>
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
        </div>

        {/* Status Toast inside Modal */}
        {statusMessage && (
          <div
            className={`mx-4 mt-2.5 p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 shadow-xs ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : statusMessage.type === 'error'
                ? 'bg-amber-50 text-amber-900 border border-amber-200'
                : 'bg-slate-100 text-slate-900 border border-slate-200'
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

        {/* Receipt Content Area (A5 Sheet Layout) */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-slate-200/80 flex justify-center items-start">
          <div
            id="printable-thermal-receipt"
            className="w-full max-w-[480px] bg-white border-2 border-slate-950 rounded-lg p-4 sm:p-5 text-slate-950 shadow-md font-sans leading-tight"
          >
            {/* 1. STORE NAME & MAIN DETAILS HEADER */}
            <div className="text-center pb-2.5">
              <h1 className="font-black text-2xl tracking-wide text-slate-950 leading-tight">
                {shopName}
              </h1>

              {shopAddress && (
                <p className="text-xs text-slate-700 mt-1 font-medium leading-snug max-w-sm mx-auto">
                  {shopAddress}
                </p>
              )}

              <div className="flex items-center justify-center gap-2 mt-1.5 font-bold text-xs text-slate-950">
                <span>
                  {isTamil ? 'தொலைபேசி' : 'Phone'}: {settings.phoneNumber || '8680000003'}
                </span>
                <span className="text-slate-400">|</span>
                <span>
                  {isTamil ? 'ஜி.எஸ்.டி.ஐ.என்' : 'GSTIN'}: {settings.gstNumber || '34AQPN8846J2ZF'}
                </span>
              </div>
            </div>

            {/* Divider line under header */}
            <div className="border-b border-slate-300 -mx-4 sm:-mx-5 my-2.5" />

            {/* 2. HOTEL NAME & BILL META (DATE, TIME, BILL NO) */}
            <div className="my-2.5 p-3 bg-white rounded-lg border border-slate-300 grid grid-cols-12 gap-2 text-xs">
              {/* Left Column: Hotel / Customer */}
              <div className="col-span-7 pr-2 border-r border-slate-300 space-y-1">
                <div className="text-[11px] font-medium text-slate-600">
                  {isTamil ? 'ஹோட்டல் / வாடிக்கையாளர்:' : 'HOTEL / CUSTOMER:'}
                </div>
                <div className="font-black text-base text-slate-950 leading-snug break-words">
                  {displayHotelName}
                </div>
                {recipientPhone && (
                  <div className="text-xs font-bold text-emerald-700">
                    {isTamil ? 'தொலைபேசி' : 'Ph'}: {recipientPhone}
                  </div>
                )}
              </div>

              {/* Right Column: Bill No, Date & Time */}
              <div className="col-span-5 pl-2 space-y-1">
                <div className="font-bold text-xs text-slate-950">
                  <span>{isTamil ? 'பில் எண்: ' : 'Bill No: '}</span>
                  <span>#{bill.billNumber}</span>
                </div>
                <div className="text-xs text-slate-800 font-medium">
                  <span>{isTamil ? 'தேதி: ' : 'Date: '}</span>
                  <span>{billDateStr}</span>
                </div>
                {billTimeStr && (
                  <div className="text-xs text-slate-800 font-medium">
                    <span>{isTamil ? 'நேரம்: ' : 'Time: '}</span>
                    <span>{billTimeStr}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. ITEMS TABLE */}
            <div className="py-1">
              <table className="w-full table-fixed border-collapse border border-slate-300 rounded-lg overflow-hidden">
                <colgroup>
                  <col className="w-[12%]" />
                  <col className="w-[38%]" />
                  <col className="w-[18%]" />
                  <col className="w-[16%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-xs uppercase border border-slate-900">
                    <th className="py-2 px-1 text-center border-r border-slate-700">
                      {isTamil ? 'வ. எண்.' : '#'}
                    </th>
                    <th className="py-2 px-2 text-left border-r border-slate-700">
                      {isTamil ? 'பொருள் விவரம்' : 'ITEM NAME'}
                    </th>
                    <th className="py-2 px-1 text-center border-r border-slate-700">
                      {isTamil ? 'எடை (கி.கி)' : 'WEIGHT (KG)'}
                    </th>
                    <th className="py-2 px-1 text-center border-r border-slate-700">
                      {isTamil ? 'விலை (ரூ.)' : 'RATE (Rs)'}
                    </th>
                    <th className="py-2 px-1 text-center">
                      {isTamil ? 'தொகை (ரூ.)' : 'AMOUNT (Rs)'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 border-x border-b border-slate-300 text-xs sm:text-sm">
                  {bill.items.map((item, idx) => {
                    const itemName = resolveItemDisplayName(item, products, billLang);
                    const unit = isTamil ? 'கி.கி' : 'KG';
                    const currency = isTamil ? 'ரூ. ' : 'Rs. ';
                    return (
                      <tr key={idx} className="bg-white">
                        <td className="py-2 px-1 text-center font-bold text-slate-900 border-r border-slate-300 align-middle">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2 text-left font-sans font-bold text-slate-950 border-r border-slate-300 break-words align-middle">
                          {itemName}
                        </td>
                        <td className="py-2 px-1 text-center font-medium text-slate-950 border-r border-slate-300 align-middle">
                          {item.kg.toFixed(2)} {unit}
                        </td>
                        <td className="py-2 px-1 text-center font-medium text-slate-950 border-r border-slate-300 align-middle">
                          {currency}{Math.round(item.pricePerKg)}
                        </td>
                        <td className="py-2 px-1 text-center font-bold text-slate-950 align-middle">
                          {currency}{Math.round(item.amount).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 4. TOTAL WEIGHT STRIP */}
            <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-300 my-2 text-xs sm:text-sm">
              <span className="font-bold text-slate-900">
                {isTamil ? 'மொத்த எடை:' : 'TOTAL WEIGHT:'}
              </span>
              <span className="font-bold text-slate-950">
                {bill.totalKg.toFixed(2)} {isTamil ? 'கி.கி' : 'KG'}
              </span>
            </div>

            {/* 5. BIG FINANCIAL CALCULATIONS BREAKDOWN */}
            <div className="p-2.5 bg-white rounded-lg border border-slate-300 space-y-1.5 text-xs sm:text-sm my-2">
              <div className="flex justify-between items-center text-slate-900 font-bold">
                <span>
                  {isTamil ? 'தற்போதைய பில் தொகை:' : 'Current Bill Amount:'}
                </span>
                <span className="font-bold text-slate-950">
                  {isTamil ? 'ரூ. ' : 'Rs. '}{Math.round(bill.totalAmount).toLocaleString('en-IN')}
                </span>
              </div>

              {hasPreviousBalance && (
                <div className="flex justify-between items-center text-amber-950 font-bold pt-1.5 border-t border-dashed border-amber-300">
                  <span>{isTamil ? 'பழைய பாக்கி தொகை:' : 'Old Balance (Previous Due):'}</span>
                  <span className="font-bold text-amber-900">
                    {isTamil ? 'ரூ. ' : 'Rs. '}{Math.round(bill.previousBalance || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>

            {/* 6. BIG GRAND TOTAL */}
            <div className="my-2.5 p-3.5 bg-slate-950 text-white rounded-xl text-center shadow-xs">
              <span className="text-xs font-semibold text-slate-200 block mb-0.5">
                {hasPreviousBalance
                  ? (isTamil ? 'மொத்த பாக்கி தொகை' : 'TOTAL PAYABLE DUE')
                  : (isTamil ? 'மொத்தம் செலுத்த வேண்டிய தொகை' : 'GRAND TOTAL')}
              </span>
              <div className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-1">
                <span>{isTamil ? 'ரூ. ' : 'Rs. '}{finalPayableAmount.toLocaleString('en-IN')}/-</span>
              </div>
            </div>

            {/* 7. UPI QR CODE SECTION */}
            <div className="pt-2 pb-1 text-center border-t border-slate-300 my-2">
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {isTamil ? 'பணம் செலுத்த QR குறியீட்டை ஸ்கேன் செய்யவும்' : 'SCAN QR CODE TO PAY (UPI)'}
              </div>
              <div className="text-[11px] font-medium text-slate-600 mb-2">
                (UPI / GPay / PhonePe / Paytm)
              </div>

              <div className="inline-block p-1.5 bg-white rounded-lg border border-slate-300">
                <QRCodeCanvas
                  id="bill-upi-qr-canvas"
                  value={upiPayUrl}
                  size={120}
                  level="M"
                  includeMargin={false}
                />
              </div>

              <div className="mt-2 text-xs font-bold text-slate-900 font-mono">
                UPI ID: {upiId}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col gap-2">
          {/* 1. WhatsApp as A5 PDF */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 space-y-1.5">
            {!showWhatsAppInput ? (
              <button
                id="modal-open-whatsapp-btn"
                type="button"
                onClick={() => setShowWhatsAppInput(true)}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xs transition-all touch-manipulation active:scale-[0.99]"
              >
                <MessageCircle className="w-5 h-5 fill-white" />
                <span>{isTamil ? 'வாட்ஸ்அப் A5 PDF' : 'WhatsApp (A5 PDF)'}</span>
              </button>
            ) : (
              <div className="space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-700" />
                    <span>
                      {isTamil ? 'வாட்ஸ்அப் எண் (A5 PDF அனுப்ப):' : 'WhatsApp Number (Send A5 PDF):'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowWhatsAppInput(false)}
                    className="text-slate-500 hover:text-slate-700 text-xs underline font-bold"
                  >
                    {isTamil ? 'மறை' : 'Hide'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    id="modal-whatsapp-phone-input"
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <button
                    id="btn-send-whatsapp-confirm"
                    type="button"
                    disabled={isSharingWhatsApp}
                    onClick={handleSendWhatsAppPdf}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSharingWhatsApp ? '...' : (isTamil ? 'PDF அனுப்பு' : 'Send PDF')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Download A5 PDF & Print Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              id="modal-download-pdf-btn"
              type="button"
              disabled={isDownloadingPdf}
              onClick={handleDownloadPdf}
              className="py-2.5 px-3 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-400 text-slate-800 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-2xs transition-all touch-manipulation active:scale-[0.99]"
            >
              <Download className="w-4 h-4 text-slate-700" />
              <span>{isDownloadingPdf ? '...' : (isTamil ? 'A5 PDF சேமி' : 'Save A5 PDF')}</span>
            </button>

            <button
              id="modal-main-print-btn"
              type="button"
              onClick={handlePrint}
              className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 active:bg-black text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs transition-all touch-manipulation active:scale-[0.99]"
            >
              <Printer className="w-4 h-4" />
              <span>{isTamil ? 'பிரிண்ட் (A5)' : 'Print (A5)'}</span>
            </button>
          </div>

          {/* 3. Cancel / Close */}
          <button
            id="modal-cancel-btn"
            type="button"
            onClick={onClose}
            className="w-full py-1 bg-transparent hover:bg-slate-200 text-slate-500 text-xs font-semibold rounded-lg transition-colors"
          >
            {isTamil ? 'மூடு' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
