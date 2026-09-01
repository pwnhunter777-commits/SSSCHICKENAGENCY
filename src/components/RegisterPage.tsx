import React, { useState, useMemo } from 'react';
import { BookOpen, Search, Trash2, Printer, Calendar, Building2, Download, MessageCircle } from 'lucide-react';
import { Bill, LanguageCode, ShopSettings } from '../types';
import { exportBillsToCSV, formatDisplayDate } from '../utils/storage';
import { TRANSLATIONS } from '../utils/translations';

interface RegisterPageProps {
  bills: Bill[];
  settings: ShopSettings;
  language: LanguageCode;
  onDeleteBill: (billId: string) => void;
  onReprintBill: (bill: Bill) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  bills,
  settings,
  language,
  onDeleteBill,
  onReprintBill,
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [billToDelete, setBillToDelete] = useState<Bill | null>(null);

  // Extract all unique dates from bills
  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    bills.forEach((b) => {
      if (b.date) dates.add(b.date);
    });
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [bills]);

  // Filter bills by search query and date
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        b.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.hotelName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDate =
        selectedDateFilter === 'all' || b.date === selectedDateFilter;

      return matchesSearch && matchesDate;
    });
  }, [bills, searchQuery, selectedDateFilter]);

  const confirmDelete = () => {
    if (billToDelete) {
      onDeleteBill(billToDelete.id);
      setBillToDelete(null);
    }
  };

  return (
    <div id="page-register" className="pb-24 pt-3 px-4 max-w-md mx-auto">
      {/* Page Header Title */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-700" />
          <h2 className="text-base font-bold text-emerald-950">{t.recentBills}</h2>
        </div>
        <div className="flex items-center gap-1.5">
          {filteredBills.length > 0 && (
            <button
              id="btn-export-bills-csv"
              type="button"
              onClick={() => exportBillsToCSV(filteredBills)}
              title="Save CSV file to phone"
              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="text-[11px]">{t.exportCsv}</span>
            </button>
          )}
          <span className="text-xs font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-xl">
            {bills.length} {language === 'ta' ? 'ரசீதுகள்' : 'Bills'}
          </span>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-emerald-700 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          id="input-search-bill"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchBillPlaceholder}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl text-xs sm:text-sm font-semibold text-gray-900 outline-none shadow-xs transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600 px-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* Date Filter Chips (Date by Date view) */}
      {uniqueDates.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedDateFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedDateFilter === 'all'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            {t.allDates} ({bills.length})
          </button>
          {uniqueDates.map((d) => {
            const count = bills.filter((b) => b.date === d).length;
            const isSelected = selectedDateFilter === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDateFilter(d)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1 transition-all ${
                  isSelected
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                <Calendar className="w-3 h-3 text-emerald-600" />
                <span>{formatDisplayDate(d)}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Bills List */}
      {filteredBills.length === 0 ? (
        <div className="bg-white border border-dashed border-emerald-200 rounded-3xl p-8 text-center shadow-xs">
          <BookOpen className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-gray-800">{t.noBillsFound}</h3>
          <p className="text-xs text-gray-500 mt-1">
            {searchQuery
              ? (language === 'ta' ? 'தேடலுக்கு ஏற்ற ரசீதுகள் இல்லை.' : 'No bills match your search criteria.')
              : (language === 'ta' ? 'பில்லிங் பக்கத்தில் புதிய ரசீதை உருவாக்கவும்.' : 'Create your first bill from the Billing tab.')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBills.map((bill) => (
            <div
              key={bill.id}
              id={`register-bill-${bill.id}`}
              className="bg-white border border-emerald-200 hover:border-emerald-400 rounded-2xl p-3.5 shadow-xs transition-all"
            >
              {/* Card Header: Bill #, Date, Hotel */}
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-emerald-50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-700 text-white font-mono font-bold text-xs">
                      #{bill.billNumber}
                    </span>
                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-emerald-600" />
                      {formatDisplayDate(bill.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs sm:text-sm font-bold text-emerald-950">
                    <Building2 className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                    <span className="truncate">{bill.hotelName}</span>
                  </div>
                </div>

                {/* Total Value Badge */}
                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">
                    {t.totalAmount}
                  </span>
                  <span className="text-base sm:text-lg font-extrabold text-emerald-700">
                    ₹{Math.round(bill.totalAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Items Summary preview */}
              <div className="py-2 text-[11px] text-gray-600 flex items-center justify-between">
                <span>
                  <strong className="text-emerald-900">{bill.items.length}</strong> {language === 'ta' ? 'பொருட்கள்' : 'items'} &bull;{' '}
                  <strong className="text-emerald-900">{bill.totalKg.toFixed(2)} {t.kgUnit}</strong>
                </span>
                <span className="text-[10px] text-gray-400 truncate max-w-[150px]">
                  {bill.items.map((i) => i.productName).join(', ')}
                </span>
              </div>

              {/* Previous Balance breakdown if attached to bill */}
              {bill.previousBalance !== undefined && bill.previousBalance !== 0 && (
                <div className="mb-2 text-[10px] text-amber-900 bg-amber-50/90 border border-amber-200/80 px-2 py-1 rounded-lg flex items-center justify-between">
                  <span>{language === 'ta' ? 'முந்தைய பாக்கி:' : 'Prev Bal:'} ₹{Math.round(bill.previousBalance).toLocaleString('en-IN')}</span>
                  <span className="font-bold">{language === 'ta' ? 'மொத்த பாக்கி:' : 'Total Due:'} ₹{Math.round(bill.netTotalWithBalance ?? (bill.totalAmount + bill.previousBalance)).toLocaleString('en-IN')}</span>
                </div>
              )}

              {/* Action Buttons: WhatsApp, Reprint & Delete */}
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-emerald-50">
                <button
                  id={`btn-whatsapp-bill-${bill.id}`}
                  type="button"
                  onClick={() => onReprintBill(bill)}
                  className="py-2 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors active:scale-95 shadow-xs"
                  title={language === 'ta' ? 'வாட்ஸ்அப் PDF அனுப்ப' : 'Send WhatsApp PDF'}
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-white" />
                  <span className="truncate">{language === 'ta' ? 'வாட்ஸ்அப் PDF' : 'WhatsApp PDF'}</span>
                </button>

                <button
                  id={`btn-reprint-bill-${bill.id}`}
                  type="button"
                  onClick={() => onReprintBill(bill)}
                  className="py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors active:scale-95 border border-emerald-200/60"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="truncate">{t.reprint}</span>
                </button>

                <button
                  id={`btn-delete-bill-${bill.id}`}
                  type="button"
                  onClick={() => setBillToDelete(bill)}
                  className="py-2 px-2 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors active:scale-95 border border-gray-200 hover:border-red-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="truncate">{t.delete}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {billToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl border border-emerald-100">
            <h3 className="text-base font-bold text-gray-900 mb-2">
              {language === 'ta' ? `ரசீது #${billToDelete.billNumber} நீக்கவா?` : `Delete Bill #${billToDelete.billNumber}?`}
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              {language === 'ta'
                ? `ஹோட்டல்: ${billToDelete.hotelName} (${formatDisplayDate(billToDelete.date)}) - மொத்தம் ₹${Math.round(billToDelete.totalAmount)} ஆகிய ரசீதை நிச்சயமாக நீக்க விரும்புகிறீர்களா?`
                : `Are you sure you want to delete this bill for ${billToDelete.hotelName} (${formatDisplayDate(billToDelete.date)}) totaling ₹${Math.round(billToDelete.totalAmount)}?`}
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBillToDelete(null)}
                className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-colors"
              >
                {t.cancel}
              </button>
              <button
                id="btn-confirm-delete-bill"
                type="button"
                onClick={confirmDelete}
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
