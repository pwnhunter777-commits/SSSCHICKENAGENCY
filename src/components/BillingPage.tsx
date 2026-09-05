import React, { useState, useMemo } from 'react';
import {
  Bluetooth,
  Check,
  Plus,
  RefreshCw,
  Building2,
  ShoppingBag,
  X,
  ChevronDown,
  IndianRupee,
  ArrowRight,
  Trash2,
  Send,
} from 'lucide-react';
import {
  Bill,
  BillItem,
  DailyPriceRecord,
  getHotelName,
  getProductName,
  HotelItem,
  HotelPayment,
  LanguageCode,
  ProductItem,
  ShopSettings,
} from '../types';
import { getNextBillNumber, getTodayDateString } from '../utils/storage';
import { TRANSLATIONS } from '../utils/translations';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface BillingPageProps {
  products: ProductItem[];
  dailyPrices: DailyPriceRecord | null;
  hotels: HotelItem[];
  bills?: Bill[];
  payments?: HotelPayment[];
  settings: ShopSettings;
  language: LanguageCode;
  onSaveBill: (bill: Bill) => void;
  onOpenReceipt: (bill: Bill, isDraft?: boolean, onSaved?: () => void) => void;
  onNavigateToDailyPrice: () => void;
  onNavigateToHotel?: () => void;
  onAddHotel?: (nameEn: string, nameTa: string) => void;
  onAddProduct?: (nameEn: string, nameTa: string, price: number) => void;
  onDeleteProduct?: (productId: string) => void;
}

interface ProductBillingState {
  productId: string;
  kgInput: string;
  priceInput: string;
  rateInput?: string;
  isCustomManual?: boolean;
}

export const BillingPage: React.FC<BillingPageProps> = ({
  products,
  dailyPrices,
  hotels,
  bills = [],
  payments = [],
  settings,
  language,
  onSaveBill,
  onOpenReceipt,
  onNavigateToDailyPrice,
  onNavigateToHotel,
  onAddHotel,
  onAddProduct,
  onDeleteProduct,
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const todayStr = getTodayDateString();

  // Hotel Selection State (store selected hotel ID or string)
  const [selectedHotelId, setSelectedHotelId] = useState<string>(hotels[0]?.id || 'h_0');
  const [customHotelInput, setCustomHotelInput] = useState<string>('');
  const [isCustomHotel, setIsCustomHotel] = useState<boolean>(false);
  const [isAddingHotel, setIsAddingHotel] = useState<boolean>(false);
  const [newHotelNameEn, setNewHotelNameEn] = useState<string>('');
  const [newHotelNameTa, setNewHotelNameTa] = useState<string>('');
  const [addNotification, setAddNotification] = useState<string | null>(null);

  // Add Product State in Billing Selection
  const [isAddingProduct, setIsAddingProduct] = useState<boolean>(false);
  const [newProductNameEn, setNewProductNameEn] = useState<string>('');
  const [newProductNameTa, setNewProductNameTa] = useState<string>('');
  const [newProductPrice, setNewProductPrice] = useState<string>('');
  const [productAddNotification, setProductAddNotification] = useState<string | null>(null);

  // Billing items input state: map of productId -> { kgInput, priceInput, rateInput }
  const [billingInputs, setBillingInputs] = useState<Record<string, ProductBillingState>>({});

  // Delete item and clear confirmation states
  const [itemToDelete, setItemToDelete] = useState<ProductItem | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState<boolean>(false);

  // Base rate from daily prices or product default
  const getBaseProductRate = (product: ProductItem): number => {
    if (dailyPrices && dailyPrices.prices[product.id] !== undefined) {
      return dailyPrices.prices[product.id];
    }
    return product.pricePerKg || 0;
  };

  const getProductRate = (product: ProductItem): number => {
    return getBaseProductRate(product);
  };

  // Helper to determine effective KG price (custom edited or daily price)
  const getActiveRate = (productId: string): number => {
    const existing = billingInputs[productId];
    if (existing?.rateInput !== undefined && existing.rateInput !== '' && !isNaN(parseFloat(existing.rateInput))) {
      return parseFloat(existing.rateInput);
    }
    const product = products.find((p) => p.id === productId);
    return product ? getProductRate(product) : 0;
  };

  // Synchronized inputs handler
  const handleKgChange = (productId: string, value: string) => {
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;

    const rate = getActiveRate(productId);
    const existing = billingInputs[productId];

    let calcPrice = '';
    if (value !== '' && !isNaN(parseFloat(value)) && rate > 0) {
      const calculated = parseFloat(value) * rate;
      calcPrice = Math.round(calculated).toString();
    }

    setBillingInputs((prev) => ({
      ...prev,
      [productId]: {
        productId,
        kgInput: value,
        priceInput: calcPrice,
        rateInput: existing?.rateInput,
      },
    }));
  };

  const handlePriceChange = (productId: string, value: string) => {
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;

    const rate = getActiveRate(productId);
    const existing = billingInputs[productId];

    let calcKg = '';
    if (value !== '' && !isNaN(parseFloat(value)) && rate > 0) {
      const calculated = parseFloat(value) / rate;
      calcKg = (Math.round(calculated * 100) / 100).toFixed(2);
    }

    setBillingInputs((prev) => ({
      ...prev,
      [productId]: {
        productId,
        kgInput: calcKg,
        priceInput: value,
        rateInput: existing?.rateInput,
      },
    }));
  };

  const handleRateChange = (productId: string, newRateStr: string) => {
    if (newRateStr !== '' && !/^\d*\.?\d*$/.test(newRateStr)) return;

    const newRate = parseFloat(newRateStr);

    setBillingInputs((prev) => {
      const existing = prev[productId] || { productId, kgInput: '', priceInput: '' };
      let newPrice = existing.priceInput;
      let newKg = existing.kgInput;

      if (newRateStr !== '' && !isNaN(newRate) && newRate > 0) {
        if (existing.kgInput && !isNaN(parseFloat(existing.kgInput)) && parseFloat(existing.kgInput) > 0) {
          newPrice = Math.round(parseFloat(existing.kgInput) * newRate).toString();
        } else if (existing.priceInput && !isNaN(parseFloat(existing.priceInput)) && parseFloat(existing.priceInput) > 0) {
          newKg = (Math.round((parseFloat(existing.priceInput) / newRate) * 100) / 100).toFixed(2);
        }
      }

      return {
        ...prev,
        [productId]: {
          ...existing,
          rateInput: newRateStr,
          priceInput: newPrice,
          kgInput: newKg,
        },
      };
    });
  };

  const handleClearItem = (productId: string) => {
    setBillingInputs((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  // Calculate active bill items
  const activeBillItems: BillItem[] = useMemo(() => {
    const items: BillItem[] = [];
    products.forEach((product) => {
      const state = billingInputs[product.id];
      if (!state) return;
      const kg = parseFloat(state.kgInput || '0');
      const amount = parseFloat(state.priceInput || '0');
      const defaultRate = getProductRate(product);
      const effectiveRate = (state.rateInput !== undefined && state.rateInput !== '' && !isNaN(parseFloat(state.rateInput)))
        ? parseFloat(state.rateInput)
        : defaultRate;

      if (kg > 0 && amount > 0) {
        items.push({
          productId: product.id,
          productName: getProductName(product, language),
          pricePerKg: effectiveRate,
          kg,
          amount,
        });
      }
    });
    return items;
  }, [billingInputs, products, dailyPrices, language]);

  const totalKg = useMemo(() => {
    return activeBillItems.reduce((sum, item) => sum + item.kg, 0);
  }, [activeBillItems]);

  const totalAmount = useMemo(() => {
    return activeBillItems.reduce((sum, item) => sum + item.amount, 0);
  }, [activeBillItems]);

  // Selected Hotel resolution
  const currentSelectedHotelItem = hotels.find((h) => h.id === selectedHotelId) || hotels[0];
  const currentHotelDisplayName = isCustomHotel
    ? customHotelInput.trim() || (language === 'ta' ? 'பிற வாடிக்கையாளர்' : 'Other Customer')
    : currentSelectedHotelItem ? getHotelName(currentSelectedHotelItem, language) : 'Hotel';

  // Compute selected hotel outstanding balance
  const hotelBalance = useMemo(() => {
    if (!bills || !payments) return 0;

    if (isCustomHotel) {
      const customName = customHotelInput.trim().toLowerCase();
      if (!customName) return 0;
      const hotelBills = bills.filter((b) => (b.hotelName || '').trim().toLowerCase() === customName);
      const hotelPayments = payments.filter((p) => (p.hotelName || '').trim().toLowerCase() === customName);
      const billed = hotelBills.reduce((sum, b) => sum + b.totalAmount, 0);
      const paid = hotelPayments.filter((p) => p.type !== 'balance_add').reduce((sum, p) => sum + p.amount, 0);
      const balAdded = hotelPayments.filter((p) => p.type === 'balance_add').reduce((sum, p) => sum + p.amount, 0);
      return (billed + balAdded) - paid;
    }

    if (!currentSelectedHotelItem) return 0;

    const targetHotelId = currentSelectedHotelItem.id;
    const targetHotelNameEn = (currentSelectedHotelItem.nameEn || '').trim().toLowerCase();
    const targetHotelNameTa = (currentSelectedHotelItem.nameTa || '').trim().toLowerCase();

    const isMatchingBill = (b: Bill) => {
      if (b.hotelId && b.hotelId === targetHotelId) return true;
      const bName = (b.hotelName || '').trim().toLowerCase();
      return bName === targetHotelNameEn || bName === targetHotelNameTa;
    };

    const isMatchingPayment = (p: HotelPayment) => {
      if (p.hotelId && p.hotelId === targetHotelId) return true;
      const pName = (p.hotelName || '').trim().toLowerCase();
      return pName === targetHotelNameEn || pName === targetHotelNameTa;
    };

    const hotelBills = bills.filter(isMatchingBill);
    const hotelPayments = payments.filter(isMatchingPayment);

    const billed = hotelBills.reduce((sum, b) => sum + b.totalAmount, 0);
    const paid = hotelPayments.filter((p) => p.type !== 'balance_add').reduce((sum, p) => sum + p.amount, 0);
    const balAdded = hotelPayments.filter((p) => p.type === 'balance_add').reduce((sum, p) => sum + p.amount, 0);
    return (billed + balAdded) - paid;
  }, [selectedHotelId, isCustomHotel, customHotelInput, currentSelectedHotelItem, bills, payments]);

  // Handle Complete Bill Creation
  const handleCreateBill = (_triggerBluetooth = false) => {
    if (activeBillItems.length === 0) {
      alert(language === 'ta' ? 'குறைந்தது ஒரு பொருளுக்கு எடை அல்லது விலை உள்ளிடவும்.' : 'Please enter weight (KG) or price for at least one chicken product.');
      return;
    }

    const prevBal = hotelBalance;
    const netTotalWithBal = totalAmount + prevBal;

    const newBill: Bill = {
      id: 'bill_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      billNumber: getNextBillNumber(),
      date: todayStr,
      createdAt: new Date().toISOString(),
      hotelName: currentHotelDisplayName,
      hotelId: isCustomHotel ? undefined : currentSelectedHotelItem?.id,
      items: activeBillItems,
      totalKg,
      totalAmount,
      previousBalance: prevBal !== 0 ? prevBal : undefined,
      netTotalWithBalance: prevBal !== 0 ? netTotalWithBal : totalAmount,
    };

    // If bluetooth print was requested directly, save and clear immediately
    if (_triggerBluetooth) {
      onSaveBill(newBill);
      setBillingInputs({});
      onOpenReceipt(newBill, false);
    } else {
      // Draft mode: the bill is NOT saved yet!
      // Form inputs are preserved.
      // Bill will only be saved after clicking the Send button (or Print/Save) in the receipt modal.
      onOpenReceipt(newBill, true, () => {
        setBillingInputs({});
      });
    }
  };

  const handleClearAll = () => {
    setBillingInputs({});
  };

  const handleSaveNewHotel = (e: React.FormEvent) => {
    e.preventDefault();
    const enTrimmed = newHotelNameEn.trim();
    const taTrimmed = newHotelNameTa.trim();
    if (!enTrimmed && !taTrimmed) return;

    if (onAddHotel) {
      onAddHotel(enTrimmed, taTrimmed);
    }
    setNewHotelNameEn('');
    setNewHotelNameTa('');
    setIsAddingHotel(false);
    const addedName = language === 'ta' ? (taTrimmed || enTrimmed) : (enTrimmed || taTrimmed);
    setAddNotification(
      language === 'ta'
        ? `"${addedName}" ஹோட்டல் சேர்க்கப்பட்டது!`
        : `Hotel "${addedName}" added & selected!`
    );
    setTimeout(() => setAddNotification(null), 3500);
  };

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomHotel(true);
    } else {
      setIsCustomHotel(false);
      setSelectedHotelId(val);
    }
  };

  const handleSaveNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const enTrimmed = newProductNameEn.trim();
    const taTrimmed = newProductNameTa.trim();
    const priceVal = parseFloat(newProductPrice) || 0;
    if (!enTrimmed && !taTrimmed) return;

    if (onAddProduct) {
      onAddProduct(enTrimmed, taTrimmed, priceVal);
    }
    setNewProductNameEn('');
    setNewProductNameTa('');
    setNewProductPrice('');
    setIsAddingProduct(false);
    const addedName = language === 'ta' ? (taTrimmed || enTrimmed) : (enTrimmed || taTrimmed);
    setProductAddNotification(
      language === 'ta'
        ? `"${addedName}" பொருள் வெற்றிகரமாக சேர்க்கப்பட்டது!`
        : `Product "${addedName}" added to billing!`
    );
    setTimeout(() => setProductAddNotification(null), 3500);
  };

  return (
    <div id="page-billing" className="pb-28 pt-2 px-4 max-w-md mx-auto">
      {/* Missing Daily Prices Banner */}
      {!dailyPrices && (
        <div className="mb-3 bg-amber-50 border border-amber-300 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-xs">
          <div className="text-xs text-amber-900">
            <span className="font-bold">{t.pricesRequiredNotice}:</span> {language === 'ta' ? 'இன்றைய விலை நிர்ணயிக்கப்படவில்லை.' : 'Daily rates not set for today.'}
          </div>
          <button
            type="button"
            onClick={onNavigateToDailyPrice}
            className="text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 px-3 py-1.5 rounded-xl shadow-xs transition-all active:scale-95"
          >
            {t.dailyPrice}
          </button>
        </div>
      )}

      {/* Hotel Selection Section with Dropdown and Add Button */}
      <div className="bg-white border-2 border-emerald-300 rounded-3xl p-4 shadow-sm mb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black text-emerald-950 uppercase tracking-wide">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-emerald-800" />
            </div>
            <span>{t.selectHotel}</span>
            <span className="text-[11px] font-black text-white bg-emerald-800 px-2 py-0.5 rounded-lg shadow-2xs">
              {hotels.length}
            </span>
          </div>

          <button
            id="btn-open-add-hotel"
            type="button"
            onClick={() => {
              setIsAddingHotel((prev) => !prev);
              setNewHotelNameEn('');
              setNewHotelNameTa('');
            }}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-xs font-black flex items-center gap-1 transition-all active:scale-95 shadow-md shadow-emerald-700/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ {t.addHotel}</span>
          </button>
        </div>

        {/* Notification when hotel added */}
        {addNotification && (
          <div className="bg-emerald-600 text-white p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs animate-in fade-in">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{addNotification}</span>
          </div>
        )}

        {/* Inline Add Hotel Form (Asking English & Tamil names) */}
        {isAddingHotel && (
          <form
            onSubmit={handleSaveNewHotel}
            className="bg-emerald-50/90 border border-emerald-300 rounded-2xl p-3 space-y-2.5 animate-in fade-in slide-in-from-top-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider">
                {t.addHotel}
              </span>
              <button
                type="button"
                onClick={() => setIsAddingHotel(false)}
                className="text-gray-400 hover:text-gray-700 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              <input
                id="input-new-hotel-en"
                type="text"
                value={newHotelNameEn}
                onChange={(e) => setNewHotelNameEn(e.target.value)}
                placeholder={t.hotelNameEn + ' (e.g. Star Biriyani)'}
                className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
                autoFocus
              />
              <input
                id="input-new-hotel-ta"
                type="text"
                value={newHotelNameTa}
                onChange={(e) => setNewHotelNameTa(e.target.value)}
                placeholder={t.hotelNameTa + ' (எ.கா. ஸ்டார் பிரியாணி)'}
                className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingHotel(false)}
                className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-800 active:bg-slate-900 text-white rounded-xl text-xs font-black shadow-xs transition-all active:scale-95"
              >
                {t.cancel}
              </button>
              <button
                id="btn-save-new-hotel-billing"
                type="submit"
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-xs font-black whitespace-nowrap shadow-md shadow-emerald-700/25 transition-all active:scale-95"
              >
                {t.save}
              </button>
            </div>
          </form>
        )}

        {/* Dropdown for Hotel Selection */}
        <div className="relative">
          <select
            id="hotel-dropdown-select"
            value={isCustomHotel ? '__custom__' : selectedHotelId}
            onChange={handleDropdownChange}
            className="w-full h-12 px-3.5 pr-9 bg-emerald-50/80 hover:bg-emerald-100/70 border-2 border-emerald-500 focus:border-emerald-700 focus:bg-white rounded-2xl text-xs sm:text-sm font-black text-emerald-950 outline-none appearance-none transition-colors cursor-pointer shadow-xs"
          >
            <optgroup label={t.selectHotel}>
              {hotels.map((hotel) => (
                <option key={hotel.id} value={hotel.id} className="py-1 font-semibold text-gray-900">
                  {getHotelName(hotel, language)}
                </option>
              ))}
            </optgroup>
            <optgroup label={t.other}>
              <option value="__custom__" className="py-1 font-bold text-emerald-800">
                ➕ {language === 'ta' ? 'பிற வாடிக்கையாளர்...' : 'Other / One-time Customer...'}
              </option>
            </optgroup>
          </select>
          {/* Custom chevron */}
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-800">
            <ChevronDown className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>

        {/* Custom Hotel Input if selected from dropdown */}
        {isCustomHotel && (
          <div className="pt-1 animate-in fade-in">
            <input
              id="custom-hotel-text-input"
              type="text"
              value={customHotelInput}
              onChange={(e) => setCustomHotelInput(e.target.value)}
              placeholder={language === 'ta' ? 'வாடிக்கையாளர் அல்லது ஹோட்டல் பெயரை உள்ளிடவும்...' : 'Type customer or hotel name for this bill...'}
              className="w-full px-3.5 py-2.5 bg-emerald-50/60 border border-emerald-400 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-emerald-700 focus:bg-white"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* HOTEL BALANCE DISPLAY CONTAINER (IN BETWEEN HOTEL & REDUCE) */}
      {/* ======================================================== */}
      <div
        id="billing-hotel-balance-container"
        className={`mb-3 rounded-3xl p-3 sm:p-3.5 border shadow-xs transition-all ${
          hotelBalance > 0
            ? 'bg-gradient-to-r from-amber-50/95 via-amber-50/70 to-emerald-50/60 border-amber-300'
            : hotelBalance === 0
            ? 'bg-emerald-50/70 border-emerald-200'
            : 'bg-sky-50/70 border-sky-200'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Left: Balance Amount & Label */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs ${
                hotelBalance > 0
                  ? 'bg-amber-600 text-white'
                  : hotelBalance === 0
                  ? 'bg-emerald-600 text-white'
                  : 'bg-sky-600 text-white'
              }`}
            >
              <IndianRupee className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-gray-700">
                  {language === 'ta' ? 'ஹோட்டல் பாக்கி' : 'Hotel Balance'}
                </span>
                <span
                  className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md ${
                    hotelBalance > 0
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : hotelBalance === 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-sky-100 text-sky-800'
                  }`}
                >
                  {hotelBalance > 0
                    ? (language === 'ta' ? 'பாக்கி உள்ளது' : 'Pending Due')
                    : hotelBalance === 0
                    ? (language === 'ta' ? 'பாக்கி இல்லை' : 'Nil Balance')
                    : (language === 'ta' ? 'முன்பணம்' : 'Advance')}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-base sm:text-lg font-black tracking-tight ${
                    hotelBalance > 0
                      ? 'text-amber-900'
                      : hotelBalance === 0
                      ? 'text-emerald-900'
                      : 'text-sky-900'
                  }`}
                >
                  ₹{Math.abs(Math.round(hotelBalance)).toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-gray-500 font-semibold truncate max-w-[120px]">
                  {currentHotelDisplayName}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Net Total With Balance preview or Link to Hotel Page */}
          <div className="text-right flex items-center gap-1.5 flex-shrink-0">
            {totalAmount > 0 ? (
              <div className="bg-white/95 border border-emerald-300 rounded-2xl px-2.5 py-1 text-right shadow-2xs">
                <span className="text-[9px] font-bold text-gray-500 block uppercase leading-tight">
                  {language === 'ta' ? 'மொத்த பாக்கி' : 'Total Due'}
                </span>
                <span className="text-xs sm:text-sm font-black text-emerald-950">
                  ₹{Math.round(totalAmount + (hotelBalance > 0 ? hotelBalance : 0)).toLocaleString('en-IN')}
                </span>
              </div>
            ) : onNavigateToHotel ? (
              <button
                id="btn-billing-goto-hotel-ledger"
                type="button"
                onClick={onNavigateToHotel}
                className="text-[11px] font-black text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1 transition-all active:scale-95"
                title={language === 'ta' ? 'ஹோட்டல் கணக்கை காண்க' : 'View Hotel Ledger'}
              >
                <span>{language === 'ta' ? 'கணக்கு' : 'Ledger'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Products Section Header */}
      <div className="flex items-center justify-between mb-2 px-1 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950 uppercase tracking-wide">
          <ShoppingBag className="w-4 h-4 text-emerald-700" />
          <span>{t.chickenProducts} ({products.length})</span>
        </div>

        <div className="flex items-center gap-1.5">
          {onAddProduct && (
            <button
              id="btn-add-product-billing"
              type="button"
              onClick={() => {
                setIsAddingProduct((prev) => !prev);
                setNewProductNameEn('');
                setNewProductNameTa('');
                setNewProductPrice('');
              }}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-xs font-black flex items-center gap-1 transition-all active:scale-95 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ {language === 'ta' ? 'பொருள் சேர்க்க' : 'Add Item'}</span>
            </button>
          )}

          {activeBillItems.length > 0 && (
            <button
              id="btn-clear-all-billing"
              type="button"
              onClick={() => setShowClearAllConfirm(true)}
              className="text-[11px] font-black text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 flex items-center gap-1 px-2.5 py-1.5 rounded-xl shadow-xs transition-all active:scale-95"
            >
              <RefreshCw className="w-3 h-3 text-white" />
              <span>{t.resetAll}</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification when product added */}
      {productAddNotification && (
        <div className="mb-2.5 bg-emerald-600 text-white p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs animate-in fade-in">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{productAddNotification}</span>
        </div>
      )}

      {/* Inline Add Product / Thing Form */}
      {isAddingProduct && (
        <form
          onSubmit={handleSaveNewProduct}
          className="mb-3 bg-emerald-50/95 border border-emerald-300 rounded-2xl p-3 space-y-2.5 animate-in fade-in slide-in-from-top-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider">
              {language === 'ta' ? 'புதிய பொருள் சேர்க்க' : 'Add New Item / Product'}
            </span>
            <button
              type="button"
              onClick={() => setIsAddingProduct(false)}
              className="text-gray-400 hover:text-gray-700 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={newProductNameEn}
              onChange={(e) => setNewProductNameEn(e.target.value)}
              placeholder="Item name in English (e.g. Tandoori Chicken)"
              className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-emerald-600"
            />
            <input
              type="text"
              value={newProductNameTa}
              onChange={(e) => setNewProductNameTa(e.target.value)}
              placeholder="பொருளின் பெயர் தமிழில் (எ.கா. தந்தூரி சிக்கன்)"
              className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-emerald-600"
            />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">₹</span>
              <input
                type="number"
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(e.target.value)}
                placeholder={language === 'ta' ? 'கிலோ விலை (₹)' : 'Price per KG (₹)'}
                className="w-full pl-7 pr-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingProduct(false)}
              className="px-3.5 py-1.5 text-xs font-black text-white bg-slate-700 hover:bg-slate-800 active:bg-slate-900 rounded-xl shadow-xs transition-all active:scale-95"
            >
              {language === 'ta' ? 'ரத்து' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-xl shadow-md shadow-emerald-700/20 transition-all active:scale-95"
            >
              {language === 'ta' ? 'சேர்க்க' : 'Add Item'}
            </button>
          </div>
        </form>
      )}

      {/* Chicken Products List */}
      <div className="space-y-2">
        {products.map((product) => {
          const defaultRate = getProductRate(product);
          const prodDisplayName = getProductName(product, language);

          const currentKg = billingInputs[product.id]?.kgInput || '';
          const currentPrice = billingInputs[product.id]?.priceInput || '';
          const customRateStr = billingInputs[product.id]?.rateInput;
          const displayedRate = customRateStr !== undefined ? customRateStr : (defaultRate > 0 ? defaultRate.toString() : '');
          const isItemActive = parseFloat(currentKg) > 0 || parseFloat(currentPrice) > 0;

          return (
            <div
              key={product.id}
              id={`billing-card-${product.id}`}
              className={`rounded-2xl p-3 transition-all border-2 flex flex-col gap-2 ${
                isItemActive
                  ? 'bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/50 border-emerald-600 shadow-md ring-2 ring-emerald-500/25'
                  : 'bg-white border-emerald-200/90 hover:border-emerald-400/80 shadow-xs'
              }`}
            >
              {/* TOP ROW: PRODUCT NAME (LEFT) & DELETE BUTTON (RIGHT) */}
              <div className="flex items-center justify-between gap-1.5">
                <div className="min-w-0 flex-1 flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
                      isItemActive ? 'bg-emerald-600 ring-2 ring-emerald-300' : 'bg-emerald-300'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-black text-emerald-950 truncate uppercase tracking-tight leading-tight">
                      {prodDisplayName}
                    </h4>
                    {/* Secondary bilingual name */}
                    {language === 'ta' && product.nameEn && product.nameEn !== product.nameTa && (
                      <p className="text-[10px] text-emerald-800/70 font-bold truncate leading-tight">
                        {product.nameEn}
                      </p>
                    )}
                    {language === 'en' && product.nameTa && (
                      <p className="text-[10px] text-emerald-800/70 font-bold truncate font-tamil leading-tight">
                        {product.nameTa}
                      </p>
                    )}
                  </div>
                </div>

                {/* DELETE BUTTON */}
                <button
                  id={`btn-delete-${product.id}`}
                  type="button"
                  onClick={() => setItemToDelete(product)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all active:scale-95 touch-manipulation shadow-xs bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white flex-shrink-0"
                  title={language === 'ta' ? 'அழி / நீக்கு' : 'Delete / Clear item'}
                >
                  <Trash2 className="w-3 h-3 text-white" />
                  <span className="uppercase tracking-wider font-black">
                    {language === 'ta' ? 'நீக்கு' : 'DELETE'}
                  </span>
                </button>
              </div>

              {/* BOTTOM ROW: 3 INPUTS [ KG ] [ PRICE ] [ KG PRICE ] */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-0.5">
                {/* 1. KG INPUT */}
                <div className="flex flex-col">
                  <label
                    htmlFor={`input-kg-${product.id}`}
                    className="text-[10px] font-black uppercase text-emerald-900 bg-emerald-100/90 py-0.5 px-1 rounded-md mb-1 text-center tracking-wider block"
                  >
                    {language === 'ta' ? 'கிலோ (KG)' : 'KG'}
                  </label>
                  <input
                    id={`input-kg-${product.id}`}
                    type="text"
                    inputMode="decimal"
                    value={currentKg}
                    onChange={(e) => handleKgChange(product.id, e.target.value)}
                    placeholder="KG"
                    className={`w-full h-9 px-2 rounded-xl text-xs sm:text-sm font-black text-emerald-950 outline-none text-center transition-all border-2 ${
                      parseFloat(currentKg) > 0
                        ? 'bg-emerald-50/90 border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white border-emerald-300 focus:border-emerald-600 focus:bg-emerald-50/30 shadow-2xs'
                    } placeholder:text-emerald-400`}
                  />
                </div>

                {/* 2. PRICE INPUT */}
                <div className="flex flex-col">
                  <label
                    htmlFor={`input-price-${product.id}`}
                    className="text-[10px] font-black uppercase text-emerald-900 bg-emerald-100/90 py-0.5 px-1 rounded-md mb-1 text-center tracking-wider block"
                  >
                    {language === 'ta' ? 'விலை (PRICE)' : 'PRICE'}
                  </label>
                  <input
                    id={`input-price-${product.id}`}
                    type="text"
                    inputMode="decimal"
                    value={currentPrice}
                    onChange={(e) => handlePriceChange(product.id, e.target.value)}
                    placeholder="PRICE"
                    className={`w-full h-9 px-2 rounded-xl text-xs sm:text-sm font-black text-emerald-950 outline-none text-center transition-all border-2 ${
                      parseFloat(currentPrice) > 0
                        ? 'bg-emerald-50/90 border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white border-emerald-300 focus:border-emerald-600 focus:bg-emerald-50/30 shadow-2xs'
                    } placeholder:text-emerald-400`}
                  />
                </div>

                {/* 3. KG PRICE INPUT */}
                <div className="flex flex-col">
                  <label
                    htmlFor={`input-rate-${product.id}`}
                    className="text-[10px] font-black uppercase text-emerald-900 bg-emerald-100/90 py-0.5 px-1 rounded-md mb-1 text-center tracking-wider block"
                  >
                    {language === 'ta' ? 'கிலோ விலை' : 'KG PRICE'}
                  </label>
                  <input
                    id={`input-rate-${product.id}`}
                    type="text"
                    inputMode="decimal"
                    value={displayedRate}
                    onChange={(e) => handleRateChange(product.id, e.target.value)}
                    placeholder="KG PRICE"
                    className="w-full h-9 px-2 bg-emerald-50/60 hover:bg-emerald-50/90 focus:bg-white border-2 border-emerald-400/90 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-xs sm:text-sm font-black text-emerald-950 outline-none text-center shadow-2xs transition-all placeholder:text-emerald-400"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fixed Bottom Total & Actions Bar */}
      <div className="mt-4 sticky bottom-20 z-20 bg-white/95 backdrop-blur-md border-2 border-emerald-300 rounded-3xl p-4 shadow-xl shadow-emerald-950/10">
        {/* Bill Summary */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <span className="text-[11px] font-bold uppercase text-emerald-900 block">
              {t.totalKg}
            </span>
            <span className="text-lg sm:text-xl font-black text-emerald-950">
              {totalKg.toFixed(2)} {t.kgUnit}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold uppercase text-emerald-900 block">
              {t.totalAmount}
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-800">
              ₹{Math.round(totalAmount).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Action Buttons: Create Bill and Bluetooth Print */}
        <div className="grid grid-cols-2 gap-2">
          {/* Create & Send Bill */}
          <button
            id="btn-create-bill"
            type="button"
            onClick={() => handleCreateBill(false)}
            disabled={activeBillItems.length === 0}
            className="py-3 px-3 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs sm:text-sm rounded-2xl shadow-md shadow-emerald-700/25 flex items-center justify-center gap-1.5 transition-all active:scale-98"
            title={language === 'ta' ? 'பில் பார்க்க & அனுப்ப' : 'Create & Send Bill'}
          >
            <Send className="w-4 h-4 text-white" />
            <span>{t.createBill}</span>
          </button>

          {/* Bluetooth Print Button */}
          <button
            id="btn-bluetooth-billing-print"
            type="button"
            onClick={() => handleCreateBill(true)}
            disabled={activeBillItems.length === 0}
            className="py-3 px-3 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs sm:text-sm rounded-2xl shadow-md shadow-emerald-800/25 flex items-center justify-center gap-1.5 transition-all active:scale-98"
          >
            <Bluetooth className="w-4 h-4 text-white" />
            <span>{t.bluetoothPrint}</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal: Delete Item */}
      <ConfirmDeleteModal
        isOpen={!!itemToDelete}
        title={language === 'ta' ? 'பொருளை நீக்க வேண்டுமா?' : 'Delete item?'}
        message={
          language === 'ta'
            ? `"${itemToDelete ? getProductName(itemToDelete, language) : ''}" பொருளின் எடையை இந்த பில்லில் இருந்து நீக்க வேண்டுமா?`
            : `Do you want to delete "${itemToDelete ? getProductName(itemToDelete, language) : ''}" from this bill?`
        }
        itemDetails={
          itemToDelete && billingInputs[itemToDelete.id]
            ? `${billingInputs[itemToDelete.id]?.kgInput || '0'} KG — ₹${billingInputs[itemToDelete.id]?.priceInput || '0'}`
            : undefined
        }
        confirmLabel={language === 'ta' ? 'ஆம், நீக்கு' : 'Yes, Delete'}
        cancelLabel={language === 'ta' ? 'ரத்து' : 'Cancel'}
        language={language}
        onConfirm={() => {
          if (itemToDelete) {
            handleClearItem(itemToDelete.id);
            setItemToDelete(null);
          }
        }}
        onCancel={() => setItemToDelete(null)}
      />

      {/* Confirmation Modal: Clear Entire Bill */}
      <ConfirmDeleteModal
        isOpen={showClearAllConfirm}
        title={language === 'ta' ? 'பில்லை அழிக்க வேண்டுமா?' : 'Clear entire bill?'}
        message={
          language === 'ta'
            ? 'இந்த பில்லில் பதிவு செய்யப்பட்ட அனைத்து எடை மற்றும் விலை விவரங்களையும் நீக்க வேண்டுமா?'
            : 'Do you want to clear all entered items and reset this bill?'
        }
        confirmLabel={language === 'ta' ? 'ஆம், அழி' : 'Yes, Clear'}
        cancelLabel={language === 'ta' ? 'ரத்து' : 'Cancel'}
        language={language}
        onConfirm={() => {
          handleClearAll();
          setShowClearAllConfirm(false);
        }}
        onCancel={() => setShowClearAllConfirm(false)}
      />
    </div>
  );
};
