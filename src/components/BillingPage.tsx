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
  ChevronUp,
  Percent,
  Tag,
  RotateCcw,
  IndianRupee,
  ArrowRight,
  Trash2,
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

interface BillingPageProps {
  products: ProductItem[];
  dailyPrices: DailyPriceRecord | null;
  hotels: HotelItem[];
  bills?: Bill[];
  payments?: HotelPayment[];
  settings: ShopSettings;
  language: LanguageCode;
  onSaveBill: (bill: Bill) => void;
  onOpenReceipt: (bill: Bill, isDraft?: boolean) => void;
  onNavigateToDailyPrice: () => void;
  onNavigateToHotel?: () => void;
  onAddHotel?: (nameEn: string, nameTa: string) => void;
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

  // Price Reduce State
  const [isReduceOpen, setIsReduceOpen] = useState<boolean>(false);
  const [reduceAmountInput, setReduceAmountInput] = useState<string>('5');
  // Multi-select product IDs for reduction
  const [selectedReduceProductIds, setSelectedReduceProductIds] = useState<string[]>(
    products.map((p) => p.id)
  );
  // Map of productId -> discount amount (e.g. { 'p1': 5 })
  const [productReductions, setProductReductions] = useState<Record<string, number>>({});
  const [reduceNotification, setReduceNotification] = useState<string | null>(null);

  // Billing items input state: map of productId -> { kgInput, priceInput }
  const [billingInputs, setBillingInputs] = useState<Record<string, ProductBillingState>>({});

  // Base rate before discount
  const getBaseProductRate = (product: ProductItem): number => {
    if (dailyPrices && dailyPrices.prices[product.id] !== undefined) {
      return dailyPrices.prices[product.id];
    }
    return product.pricePerKg || 0;
  };

  // Active rate after per-product reduction
  const getProductRate = (product: ProductItem): number => {
    const base = getBaseProductRate(product);
    const reduction = productReductions[product.id] || 0;
    return Math.max(0, base - reduction);
  };

  // Helper to determine effective KG price (custom edited or daily price - reduction)
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

  // Toggle a single product in the multi-select reduction list
  const handleToggleReduceProduct = (prodId: string) => {
    setSelectedReduceProductIds((prev) =>
      prev.includes(prodId) ? prev.filter((id) => id !== prodId) : [...prev, prodId]
    );
  };

  const handleSelectAllReduceProducts = () => {
    setSelectedReduceProductIds(products.map((p) => p.id));
  };

  const handleDeselectAllReduceProducts = () => {
    setSelectedReduceProductIds([]);
  };

  // Apply price reduction for all selected products
  const handleApplyReduction = (customAmt?: number) => {
    if (selectedReduceProductIds.length === 0) {
      setReduceNotification(language === 'ta' ? 'குறைந்தது ஒரு பொருளைத் தேர்ந்தெடுக்கவும்.' : 'Please select at least one product.');
      setTimeout(() => setReduceNotification(null), 2500);
      return;
    }

    const amt = customAmt !== undefined ? customAmt : Math.abs(parseFloat(reduceAmountInput) || 5);
    const newReductions = { ...productReductions };

    selectedReduceProductIds.forEach((prodId) => {
      newReductions[prodId] = amt;
    });

    setProductReductions(newReductions);

    // Recalculate price if KG is already entered for these products
    setBillingInputs((prev) => {
      const updated = { ...prev };
      selectedReduceProductIds.forEach((prodId) => {
        const prod = products.find((p) => p.id === prodId);
        if (!prod) return;
        const existing = updated[prodId];
        if (existing && existing.kgInput && parseFloat(existing.kgInput) > 0) {
          const kg = parseFloat(existing.kgInput);
          const baseRate = getBaseProductRate(prod);
          const newRate = Math.max(0, baseRate - amt);
          updated[prodId] = {
            ...existing,
            priceInput: Math.round(kg * newRate).toString(),
          };
        }
      });
      return updated;
    });

    const count = selectedReduceProductIds.length;
    setReduceNotification(
      language === 'ta'
        ? `${count} பொருட்களுக்கு ₹${amt}/கிலோ குறைக்கப்பட்டது!`
        : `Reduced ₹${amt}/kg for ${count} product${count > 1 ? 's' : ''}!`
    );
    setTimeout(() => setReduceNotification(null), 3500);
  };

  const handleRemoveProductReduction = (prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    setProductReductions((prev) => {
      const copy = { ...prev };
      delete copy[prodId];
      return copy;
    });

    if (prod) {
      const normalRate = getBaseProductRate(prod);
      setBillingInputs((prev) => {
        const existing = prev[prodId];
        if (existing && existing.kgInput && parseFloat(existing.kgInput) > 0) {
          const kg = parseFloat(existing.kgInput);
          return {
            ...prev,
            [prodId]: {
              ...existing,
              priceInput: Math.round(kg * normalRate).toString(),
            },
          };
        }
        return prev;
      });
      const pName = getProductName(prod, language);
      setReduceNotification(
        language === 'ta'
          ? `"${pName}" இயல்பு விலை மீட்டமைக்கப்பட்டது (₹${normalRate}/கிலோ)`
          : `Restored normal price for "${pName}" (₹${normalRate}/kg)`
      );
      setTimeout(() => setReduceNotification(null), 3000);
    }
  };

  const handleClearAllReductions = () => {
    setProductReductions({});
    setBillingInputs((prev) => {
      const updated = { ...prev };
      products.forEach((p) => {
        const existing = updated[p.id];
        if (existing && existing.kgInput && parseFloat(existing.kgInput) > 0) {
          const kg = parseFloat(existing.kgInput);
          const baseRate = getBaseProductRate(p);
          updated[p.id] = {
            ...existing,
            priceInput: Math.round(kg * baseRate).toString(),
          };
        }
      });
      return updated;
    });
    setReduceNotification(language === 'ta' ? 'அனைத்து விலைக் குறைப்புகளும் ரத்து செய்யப்பட்டன.' : 'All price reductions cleared.');
    setTimeout(() => setReduceNotification(null), 3000);
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
  }, [billingInputs, products, dailyPrices, productReductions, language]);

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
      const paid = hotelPayments.reduce((sum, p) => sum + p.amount, 0);
      return billed - paid;
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
    const paid = hotelPayments.reduce((sum, p) => sum + p.amount, 0);
    return billed - paid;
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

    // Reset current form inputs
    setBillingInputs({});

    // If bluetooth print was requested directly, save immediately
    if (_triggerBluetooth) {
      onSaveBill(newBill);
      onOpenReceipt(newBill, false);
    } else {
      // Draft mode: the bill is added to Bill History only after clicking Print, WhatsApp, or Save
      onOpenReceipt(newBill, true);
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

  // Count active reductions
  const activeReductionsCount = Object.keys(productReductions).length;

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
            className="text-xs font-bold text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-50 px-2.5 py-1 rounded-xl shadow-xs"
          >
            {t.dailyPrice}
          </button>
        </div>
      )}

      {/* Hotel Selection Section with Dropdown and Add Button */}
      <div className="bg-white border border-emerald-200 rounded-3xl p-3.5 shadow-xs mb-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950 uppercase tracking-wide">
            <Building2 className="w-4 h-4 text-emerald-700" />
            <span>{t.selectHotel}</span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded-md">
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
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shadow-xs"
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
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
              >
                {t.cancel}
              </button>
              <button
                id="btn-save-new-hotel-billing"
                type="submit"
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-xs active:scale-95"
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
            className="w-full h-12 px-3.5 pr-9 bg-emerald-50/60 hover:bg-emerald-50/90 border-2 border-emerald-300 focus:border-emerald-600 focus:bg-white rounded-2xl text-xs sm:text-sm font-bold text-emerald-950 outline-none appearance-none transition-colors cursor-pointer"
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
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-700">
            <ChevronDown className="w-5 h-5" />
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
                className="text-[11px] font-bold text-emerald-800 bg-white hover:bg-emerald-100/90 border border-emerald-300 px-2.5 py-1.5 rounded-xl shadow-2xs flex items-center gap-1 transition-all active:scale-95"
                title={language === 'ta' ? 'ஹோட்டல் கணக்கை காண்க' : 'View Hotel Ledger'}
              >
                <span>{language === 'ta' ? 'கணக்கு' : 'Ledger'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PRICE REDUCE CONTAINER (AS REQUESTED) */}
      {/* ======================================================== */}
      <div id="price-reduce-container" className="mb-3.5">
        {/* Main Green Bar matching requested UI */}
        <div
          onClick={() => setIsReduceOpen((prev) => !prev)}
          className="bg-[#00a859] hover:bg-[#00964f] text-white rounded-2xl p-2.5 px-3.5 flex items-center justify-between shadow-md cursor-pointer transition-all active:scale-[0.99] select-none"
        >
          {/* Left Text */}
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-100" />
            <span className="text-sm sm:text-base font-extrabold tracking-wide">
              {t.priceReduce}
            </span>
            {activeReductionsCount > 0 && (
              <span className="text-[10px] font-extrabold bg-white text-[#00a859] px-2 py-0.5 rounded-full shadow-2xs">
                {activeReductionsCount} {language === 'ta' ? 'குறைப்பு' : 'Active'}
              </span>
            )}
          </div>

          {/* Center: -5 / Discount Pill Input Box */}
          <div
            className="flex items-center justify-center bg-white text-gray-950 font-black text-sm sm:text-base px-3 py-1 rounded-xl shadow-inner min-w-[60px]"
            onClick={(e) => e.stopPropagation()}
          >
            <span>-</span>
            <input
              type="text"
              inputMode="numeric"
              value={reduceAmountInput}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setReduceAmountInput(val);
              }}
              className="w-8 text-center font-black bg-transparent outline-none text-gray-950"
              placeholder="5"
            />
          </div>

          {/* Right: Triangle Chevron */}
          <div className="flex items-center gap-1 text-black bg-white/90 p-1.5 rounded-lg shadow-2xs">
            {isReduceOpen ? (
              <ChevronUp className="w-4 h-4 stroke-[3]" />
            ) : (
              <ChevronDown className="w-4 h-4 stroke-[3]" />
            )}
          </div>
        </div>

        {/* Notification when price reduced */}
        {reduceNotification && (
          <div className="mt-2 bg-emerald-600 text-white p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs animate-in fade-in">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{reduceNotification}</span>
          </div>
        )}

        {/* Expanded Dropdown Drawer for Multi-Product Selection */}
        {isReduceOpen && (
          <div className="mt-2 bg-white border-2 border-emerald-300 rounded-3xl p-3.5 shadow-md space-y-3 animate-in fade-in slide-in-from-top-2">
            {/* Header & Select All / Deselect Controls */}
            <div className="flex items-center justify-between pb-2 border-b border-emerald-100 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                <Percent className="w-4 h-4 text-emerald-700" />
                <span>{t.selectProducts} ({selectedReduceProductIds.length}/{products.length})</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAllReduceProducts}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200"
                >
                  {t.selectAll}
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllReduceProducts}
                  className="text-[11px] font-bold text-gray-600 hover:text-gray-800 bg-gray-100 px-2 py-0.5 rounded-lg"
                >
                  {t.clear}
                </button>
                {activeReductionsCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllReductions}
                    className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-lg border border-red-200"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{t.reset}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Reduction Amount Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">{t.amount}:</span>
              {[2, 3, 5, 10, 15, 20].map((amt) => {
                const isSelected = reduceAmountInput === amt.toString();
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setReduceAmountInput(amt.toString());
                      handleApplyReduction(amt);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all ${
                      isSelected
                        ? 'bg-[#00a859] text-white shadow-xs scale-105'
                        : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    -₹{amt}
                  </button>
                );
              })}
            </div>

            {/* Multi-Select Checkbox List of All Chicken Products */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {products.map((product) => {
                const baseRate = getBaseProductRate(product);
                const currentReduction = productReductions[product.id] || 0;
                const effectiveRate = Math.max(0, baseRate - currentReduction);
                const isChecked = selectedReduceProductIds.includes(product.id);
                const hasActiveDiscount = currentReduction > 0;
                const prodDisplayName = getProductName(product, language);

                const targetDiscountVal = parseFloat(reduceAmountInput) || 5;
                const previewRate = Math.max(0, baseRate - targetDiscountVal);

                return (
                  <label
                    key={product.id}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer select-none ${
                      isChecked
                        ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500/20'
                        : hasActiveDiscount
                        ? 'bg-emerald-50/40 border-emerald-300'
                        : 'bg-gray-50/70 border-gray-200 hover:bg-emerald-50/30'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Multi-select Checkbox */}
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleReduceProduct(product.id)}
                        className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer accent-[#00a859]"
                      />
                      <div className="truncate">
                        <span className="text-xs sm:text-sm font-bold text-gray-900 block truncate">
                          {prodDisplayName}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {language === 'ta' ? 'வழக்கமான விலை' : 'Regular'}: ₹{baseRate}/kg
                        </span>
                      </div>
                    </div>

                    {/* Price Status & Action */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {hasActiveDiscount ? (
                        <div className="text-right">
                          <span className="text-xs font-black text-[#00a859] block">
                            ₹{effectiveRate}/kg
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                            -₹{currentReduction} off
                          </span>
                        </div>
                      ) : (
                        <div className="text-right">
                          <span className="text-xs font-bold text-gray-700 block">
                            ₹{baseRate}/kg
                          </span>
                          {isChecked && (
                            <span className="text-[10px] font-bold text-emerald-600">
                              → ₹{previewRate} (-₹{targetDiscountVal})
                            </span>
                          )}
                        </div>
                      )}

                      {hasActiveDiscount && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveProductReduction(product.id);
                          }}
                          className="text-gray-400 hover:text-red-500 p-1"
                          title="Remove discount"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Apply Reduction Button to All Selected Products */}
            <div className="pt-1">
              <button
                id="btn-apply-price-reduction"
                type="button"
                onClick={() => handleApplyReduction()}
                disabled={selectedReduceProductIds.length === 0}
                className="w-full py-2.5 px-3 bg-[#00a859] hover:bg-[#00964f] active:bg-emerald-800 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-98"
              >
                <Check className="w-4 h-4" />
                <span>
                  {language === 'ta'
                    ? `தேர்ந்தெடுக்கப்பட்ட ${selectedReduceProductIds.length} பொருட்களுக்கு -₹${reduceAmountInput || '5'} குறைக்கவும்`
                    : `Apply -₹${reduceAmountInput || '5'} to ${selectedReduceProductIds.length} Selected Product${selectedReduceProductIds.length === 1 ? '' : 's'}`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Products Section Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950 uppercase tracking-wide">
          <ShoppingBag className="w-4 h-4 text-emerald-700" />
          <span>{t.chickenProducts} ({products.length})</span>
        </div>

        {activeBillItems.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[11px] font-bold text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{t.resetAll}</span>
          </button>
        )}
      </div>

      {/* Chicken Products List */}
      <div className="space-y-2">
        {products.map((product) => {
          const baseRate = getBaseProductRate(product);
          const currentReduction = productReductions[product.id] || 0;
          const defaultRate = getProductRate(product);
          const hasDiscount = currentReduction > 0;
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
              className={`bg-white rounded-2xl p-3 sm:p-3.5 transition-all border-2 flex flex-col gap-2 ${
                isItemActive
                  ? 'border-emerald-600 shadow-md ring-2 ring-emerald-500/20 bg-emerald-50/15'
                  : 'border-gray-800 shadow-2xs hover:border-emerald-700'
              }`}
            >
              {/* TOP ROW: PRODUCT NAME (LEFT) & DELETE BUTTON (RIGHT) */}
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm sm:text-base font-black text-gray-900 truncate uppercase tracking-tight">
                      {prodDisplayName}
                    </h4>
                    {hasDiscount && (
                      <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-md border border-emerald-300">
                        -₹{currentReduction} off
                      </span>
                    )}
                  </div>
                  {/* Secondary bilingual name */}
                  {language === 'ta' && product.nameEn && product.nameEn !== product.nameTa && (
                    <p className="text-[11px] text-gray-500 font-bold truncate">
                      {product.nameEn}
                    </p>
                  )}
                  {language === 'en' && product.nameTa && (
                    <p className="text-[11px] text-gray-500 font-bold truncate font-tamil">
                      {product.nameTa}
                    </p>
                  )}
                </div>

                {/* DELETE BUTTON */}
                <button
                  id={`btn-delete-${product.id}`}
                  type="button"
                  onClick={() => handleClearItem(product.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 touch-manipulation border ${
                    isItemActive
                      ? 'bg-red-50 text-red-700 hover:bg-red-100 border-red-300 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                  title={language === 'ta' ? 'அழி / நீக்கு' : 'Delete / Clear item'}
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  <span className="uppercase text-[11px] tracking-wider font-extrabold">
                    {language === 'ta' ? 'நீக்கு (DELETE)' : 'DELETE'}
                  </span>
                </button>
              </div>

              {/* BOTTOM ROW: 3 INPUTS [ KG ] [ PRICE ] [ KG PRICE ] */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
                {/* 1. KG INPUT */}
                <div className="flex flex-col">
                  <label
                    htmlFor={`input-kg-${product.id}`}
                    className="text-[11px] font-black uppercase text-gray-800 mb-1 text-center tracking-wider"
                  >
                    {language === 'ta' ? 'கிலோ (KG)' : 'KG'}
                  </label>
                  <div className="relative">
                    <input
                      id={`input-kg-${product.id}`}
                      type="text"
                      inputMode="decimal"
                      value={currentKg}
                      onChange={(e) => handleKgChange(product.id, e.target.value)}
                      placeholder="KG"
                      className="w-full h-11 px-2 bg-white border-2 border-gray-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/30 rounded-xl text-sm sm:text-base font-black text-gray-900 outline-none text-center shadow-xs transition-all placeholder:text-gray-400 placeholder:font-bold"
                    />
                  </div>
                </div>

                {/* 2. PRICE INPUT */}
                <div className="flex flex-col">
                  <label
                    htmlFor={`input-price-${product.id}`}
                    className="text-[11px] font-black uppercase text-gray-800 mb-1 text-center tracking-wider"
                  >
                    {language === 'ta' ? 'விலை (PRICE)' : 'PRICE'}
                  </label>
                  <div className="relative">
                    <input
                      id={`input-price-${product.id}`}
                      type="text"
                      inputMode="decimal"
                      value={currentPrice}
                      onChange={(e) => handlePriceChange(product.id, e.target.value)}
                      placeholder="PRICE"
                      className="w-full h-11 px-2 bg-white border-2 border-gray-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/30 rounded-xl text-sm sm:text-base font-black text-gray-900 outline-none text-center shadow-xs transition-all placeholder:text-gray-400 placeholder:font-bold"
                    />
                  </div>
                </div>

                {/* 3. KG PRICE INPUT */}
                <div className="flex flex-col">
                  <label
                    htmlFor={`input-rate-${product.id}`}
                    className="text-[11px] font-black uppercase text-gray-800 mb-1 text-center tracking-wider"
                  >
                    {language === 'ta' ? 'கிலோ விலை' : 'KG PRICE'}
                  </label>
                  <div className="relative">
                    <input
                      id={`input-rate-${product.id}`}
                      type="text"
                      inputMode="decimal"
                      value={displayedRate}
                      onChange={(e) => handleRateChange(product.id, e.target.value)}
                      placeholder="KG PRICE"
                      className="w-full h-11 px-2 bg-white border-2 border-gray-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/30 rounded-xl text-sm sm:text-base font-black text-gray-900 outline-none text-center shadow-xs transition-all placeholder:text-gray-400 placeholder:font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fixed Bottom Total & Actions Bar */}
      <div className="mt-4 sticky bottom-20 z-20 bg-white/95 backdrop-blur-md border border-emerald-300 rounded-3xl p-3.5 shadow-xl">
        {/* Bill Summary */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-500 block">
              {t.totalKg}
            </span>
            <span className="text-lg sm:text-xl font-black text-emerald-950">
              {totalKg.toFixed(2)} {t.kgUnit}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold uppercase text-gray-500 block">
              {t.totalAmount}
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-700">
              ₹{Math.round(totalAmount).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Action Buttons: Create Bill and Bluetooth Print */}
        <div className="grid grid-cols-2 gap-2">
          {/* Create & Save Bill */}
          <button
            id="btn-create-bill"
            type="button"
            onClick={() => handleCreateBill(false)}
            disabled={activeBillItems.length === 0}
            className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-98"
          >
            <Check className="w-4 h-4" />
            <span>{t.createBill}</span>
          </button>

          {/* Bluetooth Print Button */}
          <button
            id="btn-bluetooth-billing-print"
            type="button"
            onClick={() => handleCreateBill(true)}
            disabled={activeBillItems.length === 0}
            className="py-3 px-3 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-98"
          >
            <Bluetooth className="w-4 h-4" />
            <span>{t.bluetoothPrint}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
