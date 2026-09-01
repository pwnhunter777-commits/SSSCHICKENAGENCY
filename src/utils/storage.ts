import {
  Bill,
  DailyPriceRecord,
  DEFAULT_HOTELS,
  DEFAULT_PRODUCTS,
  DEFAULT_SETTINGS,
  HotelItem,
  HotelPayment,
  LanguageCode,
  ProductItem,
  ShopSettings,
} from '../types';

const STORAGE_KEYS = {
  SETTINGS: 'chicken_app_settings',
  PRODUCTS: 'chicken_app_products',
  DAILY_PRICES: 'chicken_app_daily_prices',
  BILLS: 'chicken_app_bills',
  HOTELS: 'chicken_app_hotels',
  HOTEL_PAYMENTS: 'chicken_app_hotel_payments',
  LANGUAGE: 'chicken_app_language',
  LAST_BILL_NUMBER: 'chicken_app_last_bill_no',
};

// Format date helper: YYYY-MM-DD
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// 1. Settings
export function loadSettings(): ShopSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.shopName === 'GREEN FARMS CHICKEN' || !parsed.shopName) {
        const merged = { ...DEFAULT_SETTINGS, ...parsed, ...DEFAULT_SETTINGS };
        saveSettings(merged);
        return merged;
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Error loading settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: ShopSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings:', e);
  }
}

// 2. Products
export function loadProducts(): ProductItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Enrich existing products with bilingual translations if missing
        return parsed.map((item: any) => {
          const defaultMatch = DEFAULT_PRODUCTS.find((dp) => dp.id === item.id);
          return {
            ...item,
            nameEn: item.nameEn || defaultMatch?.nameEn || item.name,
            nameTa: item.nameTa || defaultMatch?.nameTa || item.name,
          };
        });
      }
    }
  } catch (e) {
    console.error('Error loading products:', e);
  }
  return DEFAULT_PRODUCTS;
}

export function saveProducts(products: ProductItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  } catch (e) {
    console.error('Error saving products:', e);
  }
}

// 3. Daily Prices
// Keyed by date: { [dateStr]: DailyPriceRecord }
export function loadAllDailyPrices(): Record<string, DailyPriceRecord> {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DAILY_PRICES);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading daily prices:', e);
  }
  return {};
}

export function getTodayDailyPrices(): DailyPriceRecord | null {
  const today = getTodayDateString();
  const all = loadAllDailyPrices();
  return all[today] || null;
}

export function saveTodayDailyPrices(prices: Record<string, number>): DailyPriceRecord {
  const today = getTodayDateString();
  const all = loadAllDailyPrices();
  const record: DailyPriceRecord = {
    date: today,
    savedAt: new Date().toISOString(),
    prices,
  };
  all[today] = record;
  try {
    localStorage.setItem(STORAGE_KEYS.DAILY_PRICES, JSON.stringify(all));
  } catch (e) {
    console.error('Error saving daily prices:', e);
  }
  return record;
}

// 4. Bills
export function loadBills(): Bill[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BILLS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading bills:', e);
  }
  return [];
}

export function saveBills(bills: Bill[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
  } catch (e) {
    console.error('Error saving bills:', e);
  }
}

export function getNextBillNumber(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LAST_BILL_NUMBER);
    let nextNum = stored ? parseInt(stored, 10) + 1 : 1001;
    if (isNaN(nextNum)) nextNum = 1001;
    return String(nextNum);
  } catch {
    return '1001';
  }
}

export function incrementBillNumber(): void {
  try {
    const current = getNextBillNumber();
    localStorage.setItem(STORAGE_KEYS.LAST_BILL_NUMBER, current);
  } catch (e) {
    console.error('Error incrementing bill number:', e);
  }
}

export function addBill(bill: Bill): Bill[] {
  const bills = loadBills();
  const updated = [bill, ...bills];
  saveBills(updated);
  incrementBillNumber();
  return updated;
}

export function deleteBill(billId: string): Bill[] {
  const bills = loadBills();
  const updated = bills.filter((b) => b.id !== billId);
  saveBills(updated);
  return updated;
}

// 5. Hotels
export function loadHotels(): HotelItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HOTELS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Check if legacy string array
        if (typeof parsed[0] === 'string') {
          return parsed.map((str: string, index: number) => {
            const match = DEFAULT_HOTELS.find((dh) => dh.nameEn.toLowerCase() === str.toLowerCase());
            return {
              id: 'h_' + index,
              nameEn: match ? match.nameEn : str,
              nameTa: match ? match.nameTa : str,
            };
          });
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading hotels:', e);
  }
  saveHotels(DEFAULT_HOTELS);
  return DEFAULT_HOTELS;
}

export function saveHotels(hotels: HotelItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.HOTELS, JSON.stringify(hotels));
  } catch (e) {
    console.error('Error saving hotels:', e);
  }
}

export function saveOrUpdateHotelPhone(hotelIdOrName: string, phone: string): HotelItem[] {
  const hotels = loadHotels();
  const trimmedPhone = phone.trim();
  let updated = false;

  const newHotels = hotels.map((h) => {
    if (
      h.id === hotelIdOrName ||
      h.nameEn.toLowerCase() === hotelIdOrName.toLowerCase() ||
      h.nameTa.toLowerCase() === hotelIdOrName.toLowerCase()
    ) {
      updated = true;
      return { ...h, phone: trimmedPhone };
    }
    return h;
  });

  if (!updated && hotelIdOrName) {
    // If not found in default list, add as custom hotel with phone
    newHotels.push({
      id: 'h_' + Date.now(),
      nameEn: hotelIdOrName,
      nameTa: hotelIdOrName,
      phone: trimmedPhone,
    });
  }

  saveHotels(newHotels);
  return newHotels;
}

export function getHotelPhone(hotelIdOrName: string, hotelsList?: HotelItem[]): string {
  const list = hotelsList || loadHotels();
  const match = list.find(
    (h) =>
      h.id === hotelIdOrName ||
      h.nameEn.toLowerCase() === hotelIdOrName.toLowerCase() ||
      h.nameTa.toLowerCase() === hotelIdOrName.toLowerCase()
  );
  return match?.phone || '';
}

// 6. Hotel Payments (Received payments ledger)
export function loadHotelPayments(): HotelPayment[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HOTEL_PAYMENTS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading hotel payments:', e);
  }
  return [];
}

export function saveHotelPayments(payments: HotelPayment[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.HOTEL_PAYMENTS, JSON.stringify(payments));
  } catch (e) {
    console.error('Error saving hotel payments:', e);
  }
}

export function addHotelPayment(payment: HotelPayment): HotelPayment[] {
  const payments = loadHotelPayments();
  const updated = [payment, ...payments];
  saveHotelPayments(updated);
  return updated;
}

export function deleteHotelPayment(paymentId: string): HotelPayment[] {
  const payments = loadHotelPayments();
  const updated = payments.filter((p) => p.id !== paymentId);
  saveHotelPayments(updated);
  return updated;
}

// 7. Language (Strictly 'en' | 'ta')
export function loadLanguage(): LanguageCode {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.LANGUAGE) as LanguageCode;
    if (data === 'en' || data === 'ta') {
      return data;
    }
  } catch {
    // fallback
  }
  return 'en';
}

export function saveLanguage(lang: LanguageCode): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
  } catch (e) {
    console.error('Error saving language:', e);
  }
}

// ==========================================
// 8. FILE STORAGE ON PHONE (EXPORT / SAVE / IMPORT)
// ==========================================

export interface AppBackupData {
  version: number;
  exportedAt: string;
  settings: ShopSettings;
  products: ProductItem[];
  dailyPrices: Record<string, DailyPriceRecord>;
  bills: Bill[];
  hotels: HotelItem[];
  hotelPayments?: HotelPayment[];
  language: LanguageCode;
}

// Save complete local database as a JSON file to the phone's file storage
export function exportAllDataToFile(): void {
  try {
    const backup: AppBackupData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      settings: loadSettings(),
      products: loadProducts(),
      dailyPrices: loadAllDailyPrices(),
      bills: loadBills(),
      hotels: loadHotels(),
      hotelPayments: loadHotelPayments(),
      language: loadLanguage(),
    };

    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = getTodayDateString();
    a.href = url;
    a.download = `chicken_billing_data_${today}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Failed to export file to phone storage:', e);
  }
}

// Restore data from a JSON file selected from phone storage
export async function importDataFromFile(file: File): Promise<{ success: boolean; message: string }> {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as Partial<AppBackupData>;

    if (data.settings) saveSettings(data.settings);
    if (data.products && Array.isArray(data.products)) saveProducts(data.products);
    if (data.bills && Array.isArray(data.bills)) {
      localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(data.bills));
    }
    if (data.dailyPrices && typeof data.dailyPrices === 'object') {
      localStorage.setItem(STORAGE_KEYS.DAILY_PRICES, JSON.stringify(data.dailyPrices));
    }
    if (data.hotels && Array.isArray(data.hotels)) {
      // Handle legacy string format or HotelItem format
      if (data.hotels.length > 0 && typeof data.hotels[0] === 'string') {
        const converted = (data.hotels as unknown as string[]).map((str, idx) => ({
          id: 'h_' + idx,
          nameEn: str,
          nameTa: str,
        }));
        saveHotels(converted);
      } else {
        saveHotels(data.hotels as HotelItem[]);
      }
    }
    if (data.hotelPayments && Array.isArray(data.hotelPayments)) {
      saveHotelPayments(data.hotelPayments);
    }
    if (data.language && (data.language === 'en' || data.language === 'ta')) {
      saveLanguage(data.language);
    }

    return { success: true, message: 'Data restored successfully!' };
  } catch (e: any) {
    console.error('Failed to import file:', e);
    return { success: false, message: e.message || 'Invalid backup file format' };
  }
}

// Save Bills Sales Report as a CSV file to phone storage
export function exportBillsToCSV(bills: Bill[]): void {
  try {
    const headers = ['Bill No', 'Date', 'Hotel', 'Item', 'Kg', 'Rate (Rs/Kg)', 'Amount (Rs)', 'Total Bill Amount'];
    const rows: string[][] = [];

    bills.forEach((bill) => {
      bill.items.forEach((item, index) => {
        rows.push([
          `#${bill.billNumber}`,
          bill.date,
          `"${bill.hotelName.replace(/"/g, '""')}"`,
          `"${item.productName.replace(/"/g, '""')}"`,
          item.kg.toFixed(2),
          item.pricePerKg.toFixed(2),
          item.amount.toFixed(2),
          index === 0 ? bill.totalAmount.toFixed(2) : '',
        ]);
      });
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = getTodayDateString();
    a.href = url;
    a.download = `chicken_sales_report_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Failed to export CSV file to phone:', e);
  }
}

// Save individual bill receipt as a .txt file on the phone
export function saveReceiptAsTextFile(bill: Bill, settings: ShopSettings): void {
  try {
    const lines: string[] = [];
    lines.push('================================');
    lines.push((settings.shopName || 'CHICKEN BILLING').toUpperCase());
    if (settings.address) lines.push(settings.address);
    if (settings.phoneNumber) lines.push(`Ph: ${settings.phoneNumber}`);
    if (settings.gstNumber) lines.push(`GST: ${settings.gstNumber}`);
    lines.push('================================');
    lines.push(`Bill No: #${bill.billNumber}`);
    lines.push(`Date: ${formatDisplayDate(bill.date)}`);
    lines.push(`Hotel: ${bill.hotelName}`);
    lines.push('--------------------------------');
    lines.push('Item              Kg   Rate   Amt');
    lines.push('--------------------------------');
    bill.items.forEach((it) => {
      const name = it.productName.padEnd(16).slice(0, 16);
      const kg = it.kg.toFixed(2).padStart(5);
      const rate = Math.round(it.pricePerKg).toString().padStart(6);
      const amt = Math.round(it.amount).toString().padStart(5);
      lines.push(`${name} ${kg} ${rate} ${amt}`);
    });
    lines.push('--------------------------------');
    lines.push(`Total Quantity: ${bill.totalKg.toFixed(2)} KG`);
    lines.push(`CURRENT BILL : Rs. ${Math.round(bill.totalAmount)}`);
    if (bill.previousBalance !== undefined && bill.previousBalance !== 0) {
      lines.push(`PREV BALANCE : Rs. ${Math.round(bill.previousBalance)}`);
      lines.push(`TOTAL PAYABLE: Rs. ${Math.round(bill.netTotalWithBalance ?? (bill.totalAmount + bill.previousBalance))}`);
    } else {
      lines.push(`GRAND TOTAL  : Rs. ${Math.round(bill.totalAmount)}`);
    }
    lines.push('================================');
    if (settings.upiId) lines.push(`UPI: ${settings.upiId}`);
    lines.push('Thank you! Visit again.');
    lines.push('================================');

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bill_${bill.billNumber}_${bill.date}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Failed to save receipt file to phone:', e);
  }
}

// Export specific Hotel Statement (Bills & Payments Ledger) as CSV
export function exportHotelStatementToCSV(
  hotelName: string,
  bills: Bill[],
  payments: HotelPayment[],
  totalBilled: number,
  totalPaid: number,
  balance: number
): void {
  try {
    const lines: string[] = [];
    lines.push(`HOTEL STATEMENT - ${hotelName.toUpperCase()}`);
    lines.push(`Generated On,${new Date().toLocaleString('en-IN')}`);
    lines.push(`Total Billed (Rs),${totalBilled.toFixed(2)}`);
    lines.push(`Total Paid (Rs),${totalPaid.toFixed(2)}`);
    lines.push(`Outstanding Balance Due (Rs),${balance.toFixed(2)}`);
    lines.push('');
    lines.push('--- PURCHASE BILLS ---');
    lines.push('Bill No,Date,Total Kg,Bill Amount (Rs),Items');
    bills.forEach((b) => {
      const itemsSummary = `"${b.items.map((i) => `${i.productName} (${i.kg}kg)`).join('; ')}"`;
      lines.push(`#${b.billNumber},${b.date},${b.totalKg.toFixed(2)},${b.totalAmount.toFixed(2)},${itemsSummary}`);
    });
    lines.push('');
    lines.push('--- PAYMENTS RECEIVED ---');
    lines.push('Payment ID,Date,Amount (Rs),Payment Mode,Notes');
    payments.forEach((p) => {
      lines.push(`${p.id},${p.date},${p.amount.toFixed(2)},${p.paymentMode || 'Cash'},"${(p.notes || '').replace(/"/g, '""')}"`);
    });

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = getTodayDateString();
    a.href = url;
    a.download = `Hotel_Statement_${hotelName.replace(/[^a-zA-Z0-9]/g, '_')}_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Failed to export hotel statement to CSV:', e);
  }
}
