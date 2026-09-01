import React, { useMemo, useState } from 'react';
import { BarChart3, Scale, IndianRupee, Layers, Download, Building2, ArrowRight } from 'lucide-react';
import { Bill, getProductName, LanguageCode, ProductItem } from '../types';
import { exportBillsToCSV, getTodayDateString } from '../utils/storage';
import { TRANSLATIONS } from '../utils/translations';

interface TotalPageProps {
  bills: Bill[];
  products: ProductItem[];
  language: LanguageCode;
  onNavigateToHotel?: () => void;
}

export const TotalPage: React.FC<TotalPageProps> = ({
  bills,
  products,
  language,
  onNavigateToHotel,
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const todayStr = getTodayDateString();
  const [filterMode, setFilterMode] = useState<'today' | 'all'>('all');

  // Filter bills based on selected filter
  const targetBills = useMemo(() => {
    if (filterMode === 'today') {
      return bills.filter((b) => b.date === todayStr);
    }
    return bills;
  }, [bills, filterMode, todayStr]);

  // Overall totals
  const overallTotalKg = useMemo(() => {
    return targetBills.reduce((acc, bill) => acc + bill.totalKg, 0);
  }, [targetBills]);

  const overallTotalAmount = useMemo(() => {
    return targetBills.reduce((acc, bill) => acc + bill.totalAmount, 0);
  }, [targetBills]);

  // Product-wise calculation for ALL products
  const productTotals = useMemo(() => {
    // Map productId -> { id, product, totalKg, totalAmount, count }
    const map: Record<string, { id: string; product: ProductItem | null; fallbackName: string; totalKg: number; totalAmount: number; count: number }> = {};

    // Initialize all existing products
    products.forEach((p) => {
      map[p.id] = {
        id: p.id,
        product: p,
        fallbackName: getProductName(p, language),
        totalKg: 0,
        totalAmount: 0,
        count: 0,
      };
    });

    // Aggregate from bills
    targetBills.forEach((bill) => {
      bill.items.forEach((item) => {
        if (!map[item.productId]) {
          const matchedProd = products.find((p) => p.id === item.productId) || null;
          map[item.productId] = {
            id: item.productId,
            product: matchedProd,
            fallbackName: item.productName,
            totalKg: 0,
            totalAmount: 0,
            count: 0,
          };
        }
        map[item.productId].totalKg += item.kg;
        map[item.productId].totalAmount += item.amount;
        map[item.productId].count += 1;
      });
    });

    return Object.values(map);
  }, [products, targetBills, language]);

  return (
    <div id="page-total" className="pb-24 pt-3 px-4 max-w-md mx-auto">
      {/* Page Title & Filter Toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-700" />
          <h2 className="text-base font-bold text-emerald-950">{t.total}</h2>
        </div>

        {/* Filter Toggle: All Time vs Today */}
        <div className="bg-emerald-100/70 p-0.5 rounded-xl flex items-center gap-1 border border-emerald-200">
          <button
            type="button"
            onClick={() => setFilterMode('today')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              filterMode === 'today'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-emerald-900 hover:bg-emerald-200/50'
            }`}
          >
            {t.today}
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              filterMode === 'all'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-emerald-900 hover:bg-emerald-200/50'
            }`}
          >
            {t.allTime}
          </button>
        </div>
      </div>

      {/* Grand Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Total KG Sold */}
        <div className="bg-white border-2 border-emerald-300 rounded-3xl p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1 text-emerald-700">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Scale className="w-4 h-4 text-emerald-800" />
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              {t.totalKgSold}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-950 mt-1">
            {overallTotalKg.toFixed(2)}
            <span className="text-xs font-bold text-emerald-700 ml-1">{t.kgUnit}</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5 block font-medium">
            {language === 'ta' ? `${targetBills.length} ரசீதுகளில் இருந்து` : `From ${targetBills.length} saved bills`}
          </span>
        </div>

        {/* Total Amount */}
        <div className="bg-emerald-700 text-white rounded-3xl p-4 shadow-md">
          <div className="flex items-center gap-2 mb-1 text-emerald-100">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <IndianRupee className="w-4 h-4 text-white" />
            </div>
            <span className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider">
              {t.totalAmount}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            ₹{Math.round(overallTotalAmount).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-emerald-200 mt-0.5 block font-medium">
            {language === 'ta' ? 'மொத்த விற்பனைத் தொகை' : 'Total sales revenue'}
          </span>
        </div>
      </div>

      {/* Hotel Balance & Payment Quick Link Banner */}
      {onNavigateToHotel && (
        <div className="mb-3">
          <button
            id="btn-goto-hotel-balance"
            type="button"
            onClick={onNavigateToHotel}
            className="w-full p-3.5 bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-900 hover:to-teal-900 text-white rounded-3xl shadow-sm flex items-center justify-between transition-all active:scale-98"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
                <Building2 className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-extrabold text-white">
                  {t.hotelAccounts}
                </div>
                <div className="text-[10px] text-emerald-200">
                  {language === 'ta' ? 'ஹோட்டல் பாக்கி மற்றும் வரவு விவரங்களை பார்க்க' : 'Check hotel pending balances & record payments'}
                </div>
              </div>
            </div>
            <div className="w-7 h-7 rounded-xl bg-white/15 flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
          </button>
        </div>
      )}

      {/* Save Sales Report File to Phone Button */}
      {targetBills.length > 0 && (
        <div className="mb-3">
          <button
            id="btn-export-totals-file"
            type="button"
            onClick={() => exportBillsToCSV(targetBills)}
            className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-colors active:scale-98"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>
              {language === 'ta'
                ? `${filterMode === 'today' ? 'இன்றைய' : 'முழு'} விற்பனை அறிக்கையை CSV ஆக சேமி`
                : `Save ${filterMode === 'today' ? "Today's" : 'All-Time'} Report File to Phone (.CSV)`}
            </span>
          </button>
        </div>
      )}

      {/* Product Totals Section (Shows ALL products) */}
      <div className="bg-white border border-emerald-200 rounded-3xl p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-emerald-100">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-700" />
            <h3 className="text-xs sm:text-sm font-bold text-emerald-950 uppercase tracking-wide">
              {t.productSummary}
            </h3>
          </div>
          <span className="text-xs font-bold text-gray-500">
            {productTotals.length} {t.chickenProducts}
          </span>
        </div>

        {/* Product Breakdown List */}
        <div className="divide-y divide-emerald-50">
          {productTotals.map((item, idx) => {
            const displayName = item.product ? getProductName(item.product, language) : item.fallbackName;

            return (
              <div
                key={item.id}
                id={`total-product-row-${item.id}`}
                className="py-2.5 flex items-center justify-between gap-2 hover:bg-emerald-50/40 rounded-xl px-1.5 transition-colors"
              >
                {/* Product Name & order number */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                      {displayName}
                    </h4>
                    <span className="text-[10px] text-gray-400">
                      {language === 'ta' ? `${item.count} விற்பனைகளில்` : `Sold in ${item.count} orders`}
                    </span>
                  </div>
                </div>

                {/* Total KG & Total Amount for this item */}
                <div className="text-right flex-shrink-0">
                  <div className="text-xs sm:text-sm font-black text-emerald-950">
                    {item.totalKg.toFixed(2)} <span className="text-[10px] font-semibold text-gray-500">{t.kgUnit}</span>
                  </div>
                  <div className="text-xs font-bold text-emerald-700">
                    ₹{Math.round(item.totalAmount).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
