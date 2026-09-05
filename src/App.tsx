import React, { useState, useEffect, useRef } from 'react';
import { AppPage, Bill, DailyPriceRecord, HotelItem, HotelPayment, LanguageCode, ProductItem, ShopSettings } from './types';
import {
  addBill,
  addHotelPayment,
  deleteBill,
  deleteHotelPayment,
  getTodayDailyPrices,
  getTodayDateString,
  loadBills,
  loadHotels,
  loadHotelPayments,
  saveHotels,
  loadLanguage,
  loadProducts,
  loadSettings,
  saveLanguage,
  saveProducts,
  saveSettings,
  saveTodayDailyPrices,
} from './utils/storage';
import { AppHeader } from './components/AppHeader';
import { BottomNav } from './components/BottomNav';
import { DailyPricePage } from './components/DailyPricePage';
import { BillingPage } from './components/BillingPage';
import { RegisterPage } from './components/RegisterPage';
import { TotalPage } from './components/TotalPage';
import { HotelPage } from './components/HotelPage';
import { SettingsPage } from './components/SettingsPage';
import { ReceiptModal } from './components/ReceiptModal';

export default function App() {
  // App State with LocalStorage Initialization
  const [settings, setSettings] = useState<ShopSettings>(() => {
    const loaded = loadSettings();
    if (typeof document !== 'undefined') {
      if (loaded?.fontSizeScale) {
        document.documentElement.style.fontSize = `${loaded.fontSizeScale}%`;
      }
      if (loaded?.isBoldText) {
        document.body.classList.add('app-bold-mode');
      }
    }
    return loaded;
  });
  const [products, setProducts] = useState<ProductItem[]>(() => loadProducts());
  const [dailyPrices, setDailyPrices] = useState<DailyPriceRecord | null>(() => getTodayDailyPrices());
  const [bills, setBills] = useState<Bill[]>(() => loadBills());
  const [hotels, setHotels] = useState<HotelItem[]>(() => loadHotels());
  const [payments, setPayments] = useState<HotelPayment[]>(() => loadHotelPayments());
  const [language, setLanguage] = useState<LanguageCode>(() => loadLanguage());

  // Determine initial page: if daily prices are not set for today, show Daily Price page, otherwise start on Billing or Daily Price
  const [currentPage, setCurrentPage] = useState<AppPage>(() => {
    const today = getTodayDateString();
    const todayPrices = getTodayDailyPrices();
    return todayPrices && todayPrices.date === today ? 'billing' : 'daily-price';
  });

  // Receipt Modal State
  const [activeReceiptState, setActiveReceiptState] = useState<{
    bill: Bill;
    isDraft?: boolean;
    onSaved?: () => void;
  } | null>(null);

  // Back Navigation & App Exit Protection State
  const [exitToast, setExitToast] = useState<string | null>(null);
  const lastBackPressRef = useRef<number>(0);
  const currentPageRef = useRef<AppPage>(currentPage);
  currentPageRef.current = currentPage;
  const activeReceiptRef = useRef(activeReceiptState);
  activeReceiptRef.current = activeReceiptState;

  // Safe navigation function updating history
  const navigateToPage = (page: AppPage) => {
    if (page === currentPage) return;
    window.history.pushState({ page }, '');
    setCurrentPage(page);
  };

  // Hardware/Browser Back Navigation Listener
  useEffect(() => {
    // Set initial history state
    window.history.replaceState({ page: currentPage }, '');

    const handlePopState = () => {
      // 1. If Receipt Modal is open, close modal first and stay on current page
      if (activeReceiptRef.current) {
        setActiveReceiptState(null);
        window.history.pushState({ page: currentPageRef.current }, '');
        return;
      }

      // 2. If on any subpage, navigate to main page ('billing') before exiting
      if (currentPageRef.current !== 'billing') {
        setCurrentPage('billing');
        window.history.pushState({ page: 'billing' }, '');
        return;
      }

      // 3. If already on main page ('billing'), require double press within 2 seconds to close app
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        // Second press: let the browser history proceed so the app can close
        setExitToast(null);
      } else {
        lastBackPressRef.current = now;
        window.history.pushState({ page: 'billing' }, '');
        const msg = language === 'ta' ? 'வெளியேற மீண்டும் பின்செல்லவும்' : 'Press Back again to exit app';
        setExitToast(msg);
        setTimeout(() => {
          setExitToast((curr) => (curr === msg ? null : curr));
        }, 2000);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [language, currentPage]);

  // Synchronize dynamic font size scale to root document
  useEffect(() => {
    const scale = settings.fontSizeScale || 100;
    document.documentElement.style.fontSize = `${scale}%`;
  }, [settings.fontSizeScale]);

  // Synchronize bold text mode to root body
  useEffect(() => {
    if (settings.isBoldText) {
      document.body.classList.add('app-bold-mode');
    } else {
      document.body.classList.remove('app-bold-mode');
    }
  }, [settings.isBoldText]);

  const handleToggleBoldText = () => {
    const nextBold = !settings.isBoldText;
    const updated = { ...settings, isBoldText: nextBold };
    setSettings(updated);
    saveSettings(updated);
    if (nextBold) {
      document.body.classList.add('app-bold-mode');
    } else {
      document.body.classList.remove('app-bold-mode');
    }
  };

  // Handlers
  const handleSavePrices = (prices: Record<string, number>) => {
    const record = saveTodayDailyPrices(prices);
    setDailyPrices(record);
  };

  const handleAddProduct = (nameEn: string, nameTa: string, price: number) => {
    const trimmedEn = nameEn.trim();
    const trimmedTa = nameTa.trim();
    const primaryName = language === 'ta' ? (trimmedTa || trimmedEn) : (trimmedEn || trimmedTa);

    const newProduct: ProductItem = {
      id: 'p_' + Date.now(),
      name: primaryName,
      nameEn: trimmedEn || trimmedTa,
      nameTa: trimmedTa || trimmedEn,
      pricePerKg: price,
      isCustom: true,
    };
    const updated = [...products, newProduct];
    setProducts(updated);
    saveProducts(updated);

    // Also update today's daily prices if present
    if (dailyPrices) {
      const updatedPrices = { ...dailyPrices.prices, [newProduct.id]: price };
      handleSavePrices(updatedPrices);
    }
  };

  const handleDeleteProduct = (productId: string) => {
    const updated = products.filter((p) => p.id !== productId);
    setProducts(updated);
    saveProducts(updated);
  };

  const handleSaveBill = (newBill: Bill) => {
    const updated = addBill(newBill);
    setBills(updated);
  };

  const handleDeleteBill = (billId: string) => {
    const updated = deleteBill(billId);
    setBills(updated);
  };

  const handleAddPayment = (newPayment: HotelPayment) => {
    const updated = addHotelPayment(newPayment);
    setPayments(updated);
  };

  const handleDeletePayment = (paymentId: string) => {
    const updated = deleteHotelPayment(paymentId);
    setPayments(updated);
  };

  const handleSaveSettings = (newSettings: ShopSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleSaveHotels = (updatedHotels: HotelItem[]) => {
    setHotels(updatedHotels);
    saveHotels(updatedHotels);
  };

  const handleUpdateHotelPhone = (hotelIdOrName: string, phone: string) => {
    const updated = loadHotels();
    setHotels(updated);
  };

  const handleAddHotel = (nameEn: string, nameTa: string) => {
    const trimmedEn = nameEn.trim();
    const trimmedTa = nameTa.trim();
    if (!trimmedEn && !trimmedTa) return;

    const newHotel: HotelItem = {
      id: 'h_' + Date.now(),
      nameEn: trimmedEn || trimmedTa,
      nameTa: trimmedTa || trimmedEn,
    };

    const updated = [...hotels, newHotel];
    setHotels(updated);
    saveHotels(updated);
  };

  const handleDataRestored = () => {
    setSettings(loadSettings());
    setProducts(loadProducts());
    setDailyPrices(getTodayDailyPrices());
    setBills(loadBills());
    setHotels(loadHotels());
    setPayments(loadHotelPayments());
    setLanguage(loadLanguage());
  };

  const handleLanguageChange = (newLang: LanguageCode) => {
    setLanguage(newLang);
    saveLanguage(newLang);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/50 text-emerald-950 flex flex-col font-sans select-none antialiased">
      {/* Centered Mobile Layout Container */}
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-white shadow-2xl shadow-emerald-950/10 border-x border-emerald-100 relative">
        {/* Top Header - Every Page */}
        <AppHeader
          settings={settings}
          language={language}
          currentPage={currentPage}
          onLanguageChange={handleLanguageChange}
          onToggleBold={handleToggleBoldText}
          onBackToMain={() => navigateToPage('billing')}
        />

        {/* Main 6 Pages Body */}
        <main className="flex-1 overflow-y-auto">
          {currentPage === 'daily-price' && (
            <DailyPricePage
              products={products}
              dailyPrices={dailyPrices}
              language={language}
              onSavePrices={handleSavePrices}
              onAddProduct={handleAddProduct}
              onDeleteProduct={handleDeleteProduct}
              onNavigateToBilling={() => navigateToPage('billing')}
            />
          )}

          {currentPage === 'billing' && (
            <BillingPage
              products={products}
              dailyPrices={dailyPrices}
              hotels={hotels}
              bills={bills}
              payments={payments}
              settings={settings}
              language={language}
              onSaveBill={handleSaveBill}
              onOpenReceipt={(bill, isDraft, onSaved) => {
                window.history.pushState({ modal: 'receipt' }, '');
                setActiveReceiptState({ bill, isDraft: !!isDraft, onSaved });
              }}
              onNavigateToDailyPrice={() => navigateToPage('daily-price')}
              onNavigateToHotel={() => navigateToPage('hotel')}
              onAddHotel={handleAddHotel}
              onAddProduct={handleAddProduct}
              onDeleteProduct={handleDeleteProduct}
            />
          )}

          {currentPage === 'register' && (
            <RegisterPage
              bills={bills}
              settings={settings}
              language={language}
              onDeleteBill={handleDeleteBill}
              onReprintBill={(bill) => {
                window.history.pushState({ modal: 'receipt' }, '');
                setActiveReceiptState({ bill, isDraft: false });
              }}
            />
          )}

          {currentPage === 'total' && (
            <TotalPage
              bills={bills}
              products={products}
              language={language}
              onNavigateToHotel={() => navigateToPage('hotel')}
            />
          )}

          {currentPage === 'hotel' && (
            <HotelPage
              hotels={hotels}
              bills={bills}
              payments={payments}
              settings={settings}
              language={language}
              onAddPayment={handleAddPayment}
              onDeletePayment={handleDeletePayment}
              onReprintBill={(bill) => {
                window.history.pushState({ modal: 'receipt' }, '');
                setActiveReceiptState({ bill, isDraft: false });
              }}
            />
          )}

          {currentPage === 'settings' && (
            <SettingsPage
              settings={settings}
              bills={bills}
              hotels={hotels}
              language={language}
              onSaveSettings={handleSaveSettings}
              onSaveHotels={handleSaveHotels}
              onNavigateToMain={() => navigateToPage('billing')}
              onDataRestored={handleDataRestored}
            />
          )}
        </main>

        {/* Bottom Navigation - Every Page */}
        <BottomNav
          currentPage={currentPage}
          onPageChange={(page) => navigateToPage(page)}
          language={language}
        />

        {/* Printable / Bluetooth Receipt Modal */}
        {activeReceiptState && (
          <ReceiptModal
            bill={activeReceiptState.bill}
            isDraft={activeReceiptState.isDraft}
            settings={settings}
            hotels={hotels}
            products={products}
            language={language}
            onSaveBill={handleSaveBill}
            onUpdateHotelPhone={handleUpdateHotelPhone}
            onBillSaved={activeReceiptState.onSaved}
            onClose={() => setActiveReceiptState(null)}
          />
        )}

        {/* App Exit Confirmation Toast */}
        {exitToast && (
          <div
            id="exit-app-toast"
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 border border-white/20 pointer-events-none"
          >
            <span>{exitToast}</span>
          </div>
        )}
      </div>
    </div>
  );
}
