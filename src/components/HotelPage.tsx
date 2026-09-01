import React, { useState, useMemo } from 'react';
import {
  Building2,
  ChevronDown,
  PlusCircle,
  IndianRupee,
  Calendar,
  CreditCard,
  CheckCircle2,
  Trash2,
  Download,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  AlertCircle,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { Bill, getHotelName, HotelItem, HotelPayment, LanguageCode, ShopSettings } from '../types';
import {
  exportHotelStatementToCSV,
  formatDisplayDate,
  getTodayDateString,
} from '../utils/storage';
import { TRANSLATIONS } from '../utils/translations';

interface HotelPageProps {
  hotels: HotelItem[];
  bills: Bill[];
  payments: HotelPayment[];
  settings: ShopSettings;
  language: LanguageCode;
  onAddPayment: (payment: HotelPayment) => void;
  onDeletePayment: (paymentId: string) => void;
  onReprintBill: (bill: Bill) => void;
}

export const HotelPage: React.FC<HotelPageProps> = ({
  hotels,
  bills,
  payments,
  settings,
  language,
  onAddPayment,
  onDeletePayment,
  onReprintBill,
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const todayStr = getTodayDateString();

  // Selected Hotel ID or Name (Default to first hotel or 'all')
  const [selectedHotelKey, setSelectedHotelKey] = useState<string>(
    hotels.length > 0 ? hotels[0].id : 'all'
  );

  // Active Ledger Tab: 'payments' | 'bills'
  const [activeLedgerTab, setActiveLedgerTab] = useState<'payments' | 'bills'>('payments');

  // Form State for Adding Payment
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(true);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payDate, setPayDate] = useState<string>(todayStr);
  const [payMode, setPayMode] = useState<'cash' | 'upi' | 'bank' | 'cheque' | 'other'>('cash');
  const [paymentSuccessToast, setPaymentSuccessToast] = useState<string | null>(null);

  // Delete Payment Confirmation modal state
  const [paymentToDelete, setPaymentToDelete] = useState<HotelPayment | null>(null);

  // Map of all unique hotels (both from registered hotels and any extra names appearing in bills/payments)
  const allHotelOptions = useMemo(() => {
    const list: { id: string; nameEn: string; nameTa: string; key: string }[] = hotels.map((h) => ({
      id: h.id,
      nameEn: h.nameEn,
      nameTa: h.nameTa,
      key: h.id,
    }));

    // Find any extra customer names from bills not in standard hotels
    bills.forEach((b) => {
      const bName = b.hotelName?.trim();
      if (!bName) return;
      const matched = hotels.some(
        (h) =>
          h.nameEn.toLowerCase() === bName.toLowerCase() ||
          h.nameTa.toLowerCase() === bName.toLowerCase()
      );
      if (!matched && !list.some((it) => it.nameEn.toLowerCase() === bName.toLowerCase())) {
        list.push({
          id: 'custom_' + bName,
          nameEn: bName,
          nameTa: bName,
          key: 'custom_' + bName,
        });
      }
    });

    return list;
  }, [hotels, bills]);

  // Find the currently selected hotel object
  const currentSelectedHotel = useMemo(() => {
    if (selectedHotelKey === 'all') return null;
    return allHotelOptions.find((h) => h.key === selectedHotelKey) || null;
  }, [selectedHotelKey, allHotelOptions]);

  // Helper to check if a bill belongs to a specific hotel
  const isBillForHotel = (bill: Bill, hotel: { nameEn: string; nameTa: string; id: string }) => {
    const bName = (bill.hotelName || '').trim().toLowerCase();
    const en = hotel.nameEn.trim().toLowerCase();
    const ta = hotel.nameTa.trim().toLowerCase();
    return bName === en || bName === ta;
  };

  // Helper to check if a payment belongs to a specific hotel
  const isPaymentForHotel = (
    payment: HotelPayment,
    hotel: { nameEn: string; nameTa: string; id: string; key: string }
  ) => {
    if (payment.hotelId && (payment.hotelId === hotel.id || payment.hotelId === hotel.key)) {
      return true;
    }
    const pName = (payment.hotelName || '').trim().toLowerCase();
    const en = hotel.nameEn.trim().toLowerCase();
    const ta = hotel.nameTa.trim().toLowerCase();
    return pName === en || pName === ta;
  };

  // Compute stats for the currently selected hotel
  const hotelStats = useMemo(() => {
    if (!currentSelectedHotel) {
      return {
        totalBilled: 0,
        totalKg: 0,
        totalPaid: 0,
        balance: 0,
        hotelBills: [],
        hotelPayments: [],
      };
    }

    const hotelBills = bills.filter((b) => isBillForHotel(b, currentSelectedHotel));
    const hotelPayments = payments.filter((p) => isPaymentForHotel(p, currentSelectedHotel));

    const totalBilled = hotelBills.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalKg = hotelBills.reduce((sum, b) => sum + b.totalKg, 0);
    const totalPaid = hotelPayments.reduce((sum, p) => sum + p.amount, 0);
    const balance = totalBilled - totalPaid;

    return {
      totalBilled,
      totalKg,
      totalPaid,
      balance,
      hotelBills,
      hotelPayments,
    };
  }, [currentSelectedHotel, bills, payments]);

  // Overall summary for all hotels combined
  const allHotelsBalances = useMemo(() => {
    return allHotelOptions.map((h) => {
      const hBills = bills.filter((b) => isBillForHotel(b, h));
      const hPayments = payments.filter((p) => isPaymentForHotel(p, h));
      const billed = hBills.reduce((sum, b) => sum + b.totalAmount, 0);
      const paid = hPayments.reduce((sum, p) => sum + p.amount, 0);
      const bal = billed - paid;
      const lastPayment = hPayments.length > 0 ? hPayments[0] : null;

      return {
        hotel: h,
        billed,
        paid,
        balance: bal,
        billCount: hBills.length,
        paymentCount: hPayments.length,
        lastPayment,
      };
    });
  }, [allHotelOptions, bills, payments]);

  // Total pending across all hotels
  const totalPendingAllHotels = useMemo(() => {
    return allHotelsBalances.reduce((sum, item) => (item.balance > 0 ? sum + item.balance : sum), 0);
  }, [allHotelsBalances]);

  // Handle Add Payment Submit
  const handleAddPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSelectedHotel) return;

    const amountNum = parseFloat(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return;
    }

    const hotelDisplayName = language === 'ta' ? currentSelectedHotel.nameTa : currentSelectedHotel.nameEn;

    const newPayment: HotelPayment = {
      id: 'pay_' + Date.now(),
      hotelId: currentSelectedHotel.id,
      hotelName: hotelDisplayName,
      amount: amountNum,
      date: payDate || todayStr,
      createdAt: new Date().toISOString(),
      paymentMode: payMode,
    };

    onAddPayment(newPayment);
    setPayAmount('');
    setPaymentSuccessToast(
      language === 'ta'
        ? `₹${amountNum.toLocaleString('en-IN')} வரவு வைக்கப்பட்டது!`
        : `₹${amountNum.toLocaleString('en-IN')} payment recorded!`
    );
    setTimeout(() => setPaymentSuccessToast(null), 3500);
  };

  // Quick fill payment amount helper
  const handleQuickAmount = (amt: number) => {
    setPayAmount(String(amt));
  };

  return (
    <div id="page-hotel" className="pb-24 pt-3 px-4 max-w-md mx-auto space-y-3.5 animate-in fade-in duration-200">
      {/* Top Header with Total Market Outstanding summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-emerald-950 leading-none">
              {t.hotelAccounts}
            </h2>
            <span className="text-[10px] text-gray-500 font-medium">
              {language === 'ta' ? 'ஹோட்டல் பாக்கி & வரவு கண்காணிப்பு' : 'Hotel balance & payment tracking'}
            </span>
          </div>
        </div>

        {/* Global Pending Due Badge */}
        {totalPendingAllHotels > 0 && (
          <div className="text-right bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
            <span className="text-[9px] font-bold text-amber-800 uppercase block leading-none">
              {language === 'ta' ? 'மொத்த பாக்கி' : 'Total Dues'}
            </span>
            <span className="text-xs font-black text-amber-900">
              ₹{Math.round(totalPendingAllHotels).toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </div>

      {/* Hotel Dropdown Selector Container */}
      <div className="bg-white border-2 border-emerald-300 rounded-3xl p-3.5 shadow-xs space-y-2">
        <label className="block text-xs font-extrabold text-emerald-950 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>{t.selectHotelToViewBal}</span>
          </span>
          <span className="text-[10px] text-gray-400 font-normal">
            ({allHotelOptions.length} {language === 'ta' ? 'ஹோட்டல்கள்' : 'Hotels'})
          </span>
        </label>

        {/* Select element */}
        <div className="relative">
          <select
            id="hotel-dropdown-selector"
            value={selectedHotelKey}
            onChange={(e) => setSelectedHotelKey(e.target.value)}
            className="w-full pl-3.5 pr-10 py-3 bg-emerald-50/60 border border-emerald-300 focus:border-emerald-600 focus:bg-white rounded-2xl text-xs sm:text-sm font-bold text-emerald-950 outline-none appearance-none transition-all cursor-pointer shadow-xs"
          >
            <option value="all">
              {language === 'ta' ? '📊 அனைத்து ஹோட்டல்களின் பட்டியல் (Overview)' : '📊 All Hotels Overview Summary'}
            </option>
            {allHotelOptions.map((hotel) => {
              const displayName = language === 'ta' ? hotel.nameTa : hotel.nameEn;
              const secondaryName = language === 'ta' ? hotel.nameEn : hotel.nameTa;

              // Find quick balance for this hotel
              const stat = allHotelsBalances.find((s) => s.hotel.key === hotel.key);
              const balText = stat && stat.balance > 0 ? ` (Due: ₹${Math.round(stat.balance)})` : '';

              return (
                <option key={hotel.key} value={hotel.key}>
                  {displayName} {secondaryName !== displayName ? `(${secondaryName})` : ''} {balText}
                </option>
              );
            })}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-emerald-700">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* SUCCESS TOAST MESSAGE */}
      {paymentSuccessToast && (
        <div className="bg-emerald-700 text-white p-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{paymentSuccessToast}</span>
        </div>
      )}

      {/* VIEW 1: SPECIFIC HOTEL SELECTED */}
      {currentSelectedHotel && (
        <div className="space-y-3.5">
          {/* Main Balance Display Card ("Payment want to pay") */}
          <div
            id="hotel-balance-summary-card"
            className={`rounded-3xl p-4 sm:p-5 text-white shadow-md transition-all ${
              hotelStats.balance > 0
                ? 'bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 border-2 border-emerald-600'
                : hotelStats.balance === 0
                ? 'bg-gradient-to-br from-teal-800 to-emerald-900 border-2 border-emerald-500'
                : 'bg-gradient-to-br from-sky-800 to-emerald-900 border-2 border-sky-500'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/20">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-200" />
                <h3 className="font-extrabold text-sm sm:text-base text-white tracking-wide">
                  {language === 'ta' ? currentSelectedHotel.nameTa : currentSelectedHotel.nameEn}
                </h3>
              </div>

              {/* Status Pill */}
              <div className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-white/20 backdrop-blur-xs text-white">
                {hotelStats.balance > 0
                  ? t.balanceDue
                  : hotelStats.balance === 0
                  ? (language === 'ta' ? 'முடிந்தது' : 'Settled')
                  : (language === 'ta' ? 'முன்பணம்' : 'Advance')}
              </div>
            </div>

            {/* Main Highlight: Balance want to pay */}
            <div className="pt-3 pb-2 text-center">
              <span className="text-[11px] sm:text-xs font-bold text-emerald-100 uppercase tracking-wider block mb-0.5">
                {t.paymentWantToPay}
              </span>
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-1">
                <span>₹</span>
                <span>{Math.abs(Math.round(hotelStats.balance)).toLocaleString('en-IN')}</span>
              </div>

              {hotelStats.balance === 0 && (
                <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-200 bg-white/10 px-3 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t.allSettled}</span>
                </div>
              )}

              {hotelStats.balance < 0 && (
                <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-sky-200 bg-white/10 px-3 py-0.5 rounded-full">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t.advancePaid}</span>
                </div>
              )}
            </div>

            {/* Sub-Stats Grid: Billed vs Paid */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/20 text-xs">
              <div className="bg-black/15 rounded-2xl p-2.5">
                <div className="flex items-center gap-1 text-emerald-200 text-[10px] font-bold uppercase mb-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{t.totalBilled}</span>
                </div>
                <div className="font-extrabold text-sm sm:text-base text-white">
                  ₹{Math.round(hotelStats.totalBilled).toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-emerald-200 block">
                  {hotelStats.hotelBills.length} {language === 'ta' ? 'பில்கள்' : 'bills'} &bull; {hotelStats.totalKg.toFixed(1)} {t.kg}
                </span>
              </div>

              <div className="bg-black/15 rounded-2xl p-2.5">
                <div className="flex items-center gap-1 text-emerald-200 text-[10px] font-bold uppercase mb-0.5">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{t.totalPaid}</span>
                </div>
                <div className="font-extrabold text-sm sm:text-base text-white">
                  ₹{Math.round(hotelStats.totalPaid).toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-emerald-200 block">
                  {hotelStats.hotelPayments.length} {language === 'ta' ? 'வரவு பதிவுகள்' : 'payments'}
                </span>
              </div>
            </div>
          </div>

          {/* Form Card: "Add Paid Payment" */}
          <div className="bg-white border border-emerald-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setIsAddPaymentOpen(!isAddPaymentOpen)}
            >
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-700" />
                <h3 className="text-xs sm:text-sm font-extrabold text-emerald-950 uppercase tracking-wide">
                  {t.addPayment}
                </h3>
              </div>
              <button
                type="button"
                className="text-xs font-bold text-emerald-700 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100"
              >
                {isAddPaymentOpen ? (language === 'ta' ? 'மறைக்க' : 'Hide') : (language === 'ta' ? 'திறக்க' : 'Open')}
              </button>
            </div>

            {isAddPaymentOpen && (
              <form onSubmit={handleAddPaymentSubmit} className="space-y-3 pt-1 animate-in fade-in duration-150">
                {/* Amount Input */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{t.paymentAmount}</span>
                    </span>
                    {hotelStats.balance > 0 && (
                      <button
                        type="button"
                        onClick={() => handleQuickAmount(Math.round(hotelStats.balance))}
                        className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 hover:bg-emerald-200 px-2 py-0.5 rounded-md transition-colors"
                      >
                        ⚡ {t.quickPayFull} (₹{Math.round(hotelStats.balance)})
                      </button>
                    )}
                  </label>
                  <input
                    id="input-pay-amount"
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="e.g. 2000"
                    className="w-full px-3.5 py-2.5 bg-emerald-50/40 border border-emerald-300 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-base font-black text-gray-900 outline-none transition-all"
                  />

                  {/* Quick Preset Amount Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[500, 1000, 2000, 5000, 10000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleQuickAmount(preset)}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 rounded-lg text-[11px] font-bold transition-all active:scale-95"
                      >
                        +₹{preset.toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date & Payment Mode Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Payment Date */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{t.paymentDate}</span>
                    </label>
                    <input
                      id="input-pay-date"
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className="w-full px-3 py-2 bg-emerald-50/40 border border-emerald-300 focus:border-emerald-600 rounded-xl text-xs font-semibold text-gray-900 outline-none"
                    />
                  </div>

                  {/* Payment Mode */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{t.paymentMode}</span>
                    </label>
                    <select
                      id="select-pay-mode"
                      value={payMode}
                      onChange={(e) => setPayMode(e.target.value as any)}
                      className="w-full px-3 py-2 bg-emerald-50/40 border border-emerald-300 focus:border-emerald-600 rounded-xl text-xs font-bold text-gray-900 outline-none"
                    >
                      <option value="cash">{t.cash}</option>
                      <option value="upi">{t.upi}</option>
                      <option value="bank">{t.bankTransfer}</option>
                      <option value="cheque">{t.cheque}</option>
                      <option value="other">{t.other}</option>
                    </select>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-1">
                  <button
                    id="btn-save-hotel-payment"
                    type="submit"
                    className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-98"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{t.savePayment}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Statement Export Button */}
          {(hotelStats.hotelBills.length > 0 || hotelStats.hotelPayments.length > 0) && (
            <div>
              <button
                type="button"
                onClick={() =>
                  exportHotelStatementToCSV(
                    language === 'ta' ? currentSelectedHotel.nameTa : currentSelectedHotel.nameEn,
                    hotelStats.hotelBills,
                    hotelStats.hotelPayments,
                    hotelStats.totalBilled,
                    hotelStats.totalPaid,
                    hotelStats.balance
                  )
                }
                className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-colors active:scale-98"
              >
                <Download className="w-4 h-4 text-emerald-700" />
                <span>{t.saveHotelStatementCsv}</span>
              </button>
            </div>
          )}

          {/* Ledger Breakdown Tabs: Payments vs Bills */}
          <div className="bg-white border border-emerald-200 rounded-3xl p-4 shadow-xs space-y-3">
            {/* Tab Header Selector */}
            <div className="flex bg-emerald-50 p-1 rounded-2xl border border-emerald-200/80">
              <button
                type="button"
                onClick={() => setActiveLedgerTab('payments')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeLedgerTab === 'payments'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-emerald-900 hover:bg-emerald-100/50'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>{t.paymentHistory} ({hotelStats.hotelPayments.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveLedgerTab('bills')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeLedgerTab === 'bills'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-emerald-900 hover:bg-emerald-100/50'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>{t.billsHistory} ({hotelStats.hotelBills.length})</span>
              </button>
            </div>

            {/* TAB 1 CONTENT: PAYMENTS */}
            {activeLedgerTab === 'payments' && (
              <div className="space-y-2">
                {hotelStats.hotelPayments.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-xs">
                    <IndianRupee className="w-8 h-8 mx-auto mb-1.5 opacity-40 text-emerald-700" />
                    <p className="font-semibold text-gray-600">{t.noPaymentsRecorded}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {language === 'ta' ? 'மேலே உள்ள படிவத்தைப் பயன்படுத்தி வரவைச் சேர்க்கவும்.' : 'Use the form above to record a payment.'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-emerald-50 max-h-72 overflow-y-auto">
                    {hotelStats.hotelPayments.map((p) => (
                      <div
                        key={p.id}
                        id={`payment-row-${p.id}`}
                        className="py-2.5 flex items-center justify-between gap-2 hover:bg-emerald-50/40 rounded-xl px-1.5 transition-colors"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-extrabold text-emerald-950">
                                ₹{Math.round(p.amount).toLocaleString('en-IN')}
                              </span>
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md uppercase">
                                {p.paymentMode || 'cash'}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-emerald-600" />
                              <span>{formatDisplayDate(p.date)}</span>
                              {p.notes && <span className="text-gray-400 truncate max-w-[120px]">&bull; {p.notes}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => setPaymentToDelete(p)}
                          title="Delete payment"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2 CONTENT: BILLS */}
            {activeLedgerTab === 'bills' && (
              <div className="space-y-2">
                {hotelStats.hotelBills.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-xs">
                    <Receipt className="w-8 h-8 mx-auto mb-1.5 opacity-40 text-emerald-700" />
                    <p className="font-semibold text-gray-600">{t.noBillsForThisHotel}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-emerald-50 max-h-72 overflow-y-auto">
                    {hotelStats.hotelBills.map((b) => (
                      <div
                        key={b.id}
                        id={`hotel-bill-row-${b.id}`}
                        className="py-2.5 flex items-center justify-between gap-2 hover:bg-emerald-50/40 rounded-xl px-1.5 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-emerald-700 text-white font-mono text-[10px] font-bold rounded-md">
                              #{b.billNumber}
                            </span>
                            <span className="text-[11px] font-semibold text-gray-500">
                              {formatDisplayDate(b.date)}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-600 mt-1">
                            <strong>{b.totalKg.toFixed(2)} {t.kg}</strong> &bull; {b.items.length} {language === 'ta' ? 'பொருட்கள்' : 'items'}
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-1.5 flex-shrink-0">
                          <div>
                            <div className="text-xs sm:text-sm font-extrabold text-emerald-950">
                              ₹{Math.round(b.totalAmount).toLocaleString('en-IN')}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onReprintBill(b)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                            title={language === 'ta' ? 'வாட்ஸ்அப் PDF அனுப்ப' : 'Send WhatsApp PDF'}
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-white" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onReprintBill(b)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200 transition-colors"
                            title={t.reprint}
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: ALL HOTELS SUMMARY / OVERVIEW (When 'all' is selected) */}
      {!currentSelectedHotel && (
        <div className="space-y-3">
          {/* Bento Global Outstanding Summary Card */}
          <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white rounded-3xl p-4 sm:p-5 shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-white/20">
              <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">
                {t.totalPendingAcrossHotels}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white">
                {allHotelsBalances.filter((h) => h.balance > 0).length} {t.hotelsWithBalance}
              </span>
            </div>

            <div className="pt-3 text-center">
              <div className="text-2xl sm:text-3xl font-black text-white">
                ₹{Math.round(totalPendingAllHotels).toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-emerald-200 mt-0.5 block">
                {language === 'ta'
                  ? 'கீழே உள்ள ஏதேனும் ஒரு ஹோட்டலைத் தேர்ந்தெடுத்து பாக்கியைப் பார்க்கலாம் அல்லது வரவு சேர்க்கலாம்.'
                  : 'Click any hotel below to view balance ledger or add payment.'}
              </span>
            </div>
          </div>

          {/* List of All Hotels with Balances */}
          <div className="bg-white border border-emerald-200 rounded-3xl p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
              <h3 className="text-xs sm:text-sm font-extrabold text-emerald-950 uppercase tracking-wide">
                {t.allHotelsOverview} ({allHotelsBalances.length})
              </h3>
            </div>

            <div className="divide-y divide-emerald-50">
              {allHotelsBalances.map((item) => {
                const displayName = language === 'ta' ? item.hotel.nameTa : item.hotel.nameEn;
                const secondaryName = language === 'ta' ? item.hotel.nameEn : item.hotel.nameTa;

                return (
                  <div
                    key={item.hotel.key}
                    id={`hotel-overview-row-${item.hotel.key}`}
                    onClick={() => setSelectedHotelKey(item.hotel.key)}
                    className="py-3 px-2 flex items-center justify-between gap-2 hover:bg-emerald-50/70 rounded-2xl transition-all cursor-pointer group"
                  >
                    {/* Hotel Name & Stats */}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-emerald-900 truncate">
                        {displayName}
                      </h4>
                      {secondaryName !== displayName && (
                        <span className="text-[10px] text-gray-400 block truncate">
                          {secondaryName}
                        </span>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                        <span>{item.billCount} {language === 'ta' ? 'பில்கள்' : 'bills'}</span>
                        <span>&bull;</span>
                        <span>
                          {item.lastPayment
                            ? `${t.lastPaymentOn} ₹${Math.round(item.lastPayment.amount)} (${formatDisplayDate(item.lastPayment.date)})`
                            : t.noPayments}
                        </span>
                      </div>
                    </div>

                    {/* Balance Status Badge */}
                    <div className="text-right flex-shrink-0">
                      <span className="text-[10px] font-bold uppercase block text-gray-400">
                        {t.balanceDue}
                      </span>
                      <div
                        className={`text-xs sm:text-sm font-black ${
                          item.balance > 0
                            ? 'text-amber-800'
                            : item.balance === 0
                            ? 'text-emerald-700'
                            : 'text-sky-700'
                        }`}
                      >
                        ₹{Math.abs(Math.round(item.balance)).toLocaleString('en-IN')}
                      </div>
                      <span
                        className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                          item.balance > 0
                            ? 'bg-amber-100 text-amber-900'
                            : item.balance === 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {item.balance > 0
                          ? (language === 'ta' ? 'பாக்கி' : 'Due')
                          : item.balance === 0
                          ? (language === 'ta' ? 'முடிந்தது' : 'Settled')
                          : (language === 'ta' ? 'முன்பணம்' : 'Advance')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Delete Payment Confirmation Modal */}
      {paymentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl border border-emerald-100">
            <div className="flex items-center gap-2 text-amber-700 mb-2">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-base font-bold text-gray-900">
                {t.deletePayment}
              </h3>
            </div>
            <p className="text-xs text-gray-600 mb-4">
              {t.deletePaymentConfirm}
              <strong>{Math.round(paymentToDelete.amount).toLocaleString('en-IN')}</strong> ({formatDisplayDate(paymentToDelete.date)})?
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentToDelete(null)}
                className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-colors"
              >
                {t.cancel}
              </button>
              <button
                id="btn-confirm-delete-payment"
                type="button"
                onClick={() => {
                  onDeletePayment(paymentToDelete.id);
                  setPaymentToDelete(null);
                }}
                className="py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md transition-colors"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
