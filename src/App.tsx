import React, { useState, useEffect } from 'react';
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
  const [settings, setSettings] = useState<ShopSettings>(() => loadSettings());
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
  const [activeReceiptBill, setActiveReceiptBill] = useState<Bill | null>(null);

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
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col font-sans select-none antialiased">
      {/* Centered Mobile Layout Container */}
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-white shadow-xl relative">
        {/* Top Header - Every Page */}
        <AppHeader
          settings={settings}
          language={language}
          onLanguageChange={handleLanguageChange}
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
              onNavigateToBilling={() => setCurrentPage('billing')}
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
              onOpenReceipt={(bill) => setActiveReceiptBill(bill)}
              onNavigateToDailyPrice={() => setCurrentPage('daily-price')}
              onNavigateToHotel={() => setCurrentPage('hotel')}
              onAddHotel={handleAddHotel}
            />
          )}

          {currentPage === 'register' && (
            <RegisterPage
              bills={bills}
              settings={settings}
              language={language}
              onDeleteBill={handleDeleteBill}
              onReprintBill={(bill) => setActiveReceiptBill(bill)}
            />
          )}

          {currentPage === 'total' && (
            <TotalPage
              bills={bills}
              products={products}
              language={language}
              onNavigateToHotel={() => setCurrentPage('hotel')}
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
              onReprintBill={(bill) => setActiveReceiptBill(bill)}
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
              onDataRestored={handleDataRestored}
            />
          )}
        </main>

        {/* Bottom Navigation - Every Page */}
        <BottomNav
          currentPage={currentPage}
          onPageChange={(page) => setCurrentPage(page)}
          language={language}
        />

        {/* Printable / Bluetooth Receipt Modal */}
        {activeReceiptBill && (
          <ReceiptModal
            bill={activeReceiptBill}
            settings={settings}
            hotels={hotels}
            language={language}
            onUpdateHotelPhone={handleUpdateHotelPhone}
            onClose={() => setActiveReceiptBill(null)}
          />
        )}
      </div>
    </div>
  );
}
