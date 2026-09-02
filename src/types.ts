export interface ShopSettings {
  shopName: string;
  shopNameTa?: string;
  phoneNumber: string;
  gstNumber: string;
  address: string;
  addressTa?: string;
  upiId: string;
  billWidthCm?: number;
}

export interface ProductItem {
  id: string;
  name: string; // fallback / common name
  nameEn?: string; // English name
  nameTa?: string; // Tamil name
  pricePerKg: number;
  isCustom?: boolean;
}

export interface HotelItem {
  id: string;
  nameEn: string;
  nameTa: string;
  phone?: string;
}

export interface DailyPriceRecord {
  date: string; // YYYY-MM-DD
  savedAt: string;
  prices: Record<string, number>; // productId -> pricePerKg
}

export interface BillItem {
  productId: string;
  productName: string;
  pricePerKg: number;
  kg: number;
  amount: number;
}

export interface Bill {
  id: string;
  billNumber: string;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO string
  hotelName: string;
  hotelId?: string;
  items: BillItem[];
  totalKg: number;
  totalAmount: number;
  previousBalance?: number;
  netTotalWithBalance?: number;
}

export interface HotelPayment {
  id: string;
  hotelId?: string;
  hotelName: string;
  amount: number;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO string
  paymentMode?: 'cash' | 'upi' | 'bank' | 'other';
  notes?: string;
}

export type AppPage = 'daily-price' | 'billing' | 'register' | 'total' | 'hotel' | 'settings';

export type LanguageCode = 'en' | 'ta';

export const DEFAULT_PRODUCTS: ProductItem[] = [
  { id: 'p1', name: 'Biriyani piece', nameEn: 'Biriyani piece', nameTa: 'பிரியாணி துண்டு', pricePerKg: 240 },
  { id: 'p2', name: '65 piece', nameEn: '65 piece', nameTa: '65 துண்டு', pricePerKg: 260 },
  { id: 'p3', name: 'Boneless', nameEn: 'Boneless', nameTa: 'போன்லெஸ் (எலும்பில்லாதது)', pricePerKg: 320 },
  { id: 'p4', name: 'Wings', nameEn: 'Wings', nameTa: 'விங்ஸ் (இறக்கைகள்)', pricePerKg: 200 },
  { id: 'p5', name: 'Liver', nameEn: 'Liver', nameTa: 'ஈரல்', pricePerKg: 160 },
  { id: 'p6', name: 'Leg boneless', nameEn: 'Leg boneless', nameTa: 'லெக் போன்லெஸ்', pricePerKg: 340 },
  { id: 'p7', name: 'Leg Skinless chicken', nameEn: 'Leg Skinless chicken', nameTa: 'லெக் ஸ்கின்லெஸ்', pricePerKg: 250 },
  { id: 'p8', name: 'Skin chicken', nameEn: 'Skin chicken', nameTa: 'தோல் உள்ள கோழி', pricePerKg: 190 },
  { id: 'p9', name: 'Bone', nameEn: 'Bone', nameTa: 'எலும்பு (சூப் போன்)', pricePerKg: 120 },
  { id: 'p10', name: 'Gravy piece', nameEn: 'Gravy piece', nameTa: 'கிரேவி துண்டு', pricePerKg: 220 },
  { id: 'p11', name: 'Fry piece', nameEn: 'Fry piece', nameTa: 'வறுவல் துண்டு', pricePerKg: 230 },
];

export const DEFAULT_HOTELS: HotelItem[] = [
  { id: 'h1', nameEn: 'K.N. Hotel', nameTa: 'கே.என். ஹோட்டல்' },
  { id: 'h2', nameEn: 'DJ Hotel', nameTa: 'டி.ஜே. ஹோட்டல்' },
  { id: 'h3', nameEn: 'Babu Biriyani', nameTa: 'பாபு பிரியாணி' },
  { id: 'h4', nameEn: 'S.S.S. Biriyani', nameTa: 'எஸ்.எஸ்.எஸ். பிரியாணி' },
  { id: 'h5', nameEn: 'Kadhar Hotel', nameTa: 'காதர் ஹோட்டல்' },
  { id: 'h6', nameEn: 'Rahmath Hotel', nameTa: 'ரஹ்மத் ஹோட்டல்' },
  { id: 'h7', nameEn: 'Dhaba', nameTa: 'தாபா' },
  { id: 'h8', nameEn: 'Santhosh Fast Food', nameTa: 'சந்தோஷ் பாஸ்ட் புட்' },
  { id: 'h9', nameEn: 'Savitha', nameTa: 'சவிதா' },
  { id: 'h10', nameEn: 'Ibrahim Biriyani', nameTa: 'இப்ராஹிம் பிரியாணி' },
  { id: 'h11', nameEn: 'HOPE', nameTa: 'ஹோப் (HOPE)' },
  { id: 'h12', nameEn: 'Murugan Vada', nameTa: 'முருகன் வடை' },
  { id: 'h13', nameEn: 'Saravana Hotel', nameTa: 'சரவணா ஹோட்டல்' },
  { id: 'h14', nameEn: 'Muniyandi', nameTa: 'முனியாண்டி விலாஸ்' },
];

export const DEFAULT_SETTINGS: ShopSettings = {
  shopName: 'SSS CHICKEN AGENCY',
  shopNameTa: 'எஸ்.எஸ்.எஸ். சிக்கன் ஏஜென்சி',
  phoneNumber: '8680000003',
  gstNumber: '34AQPN8846J2ZF',
  address: 'NO 6, PONDY MAIN ROAD, SULTHANPET, VILLIANUR, PUDUCHERRY - 605 110',
  addressTa: 'எண் 6, பாண்டி மெயின் ரோடு, சுல்தான்பேட்டை, வில்லியனூர், புதுச்சேரி – 605 110',
  upiId: 'NAZIRAHAMED0003@okhdfcbank',
  billWidthCm: 17,
};

// Helper function to get product name based on active language
export function getProductName(product: ProductItem, lang: LanguageCode): string {
  if (lang === 'ta') {
    return product.nameTa || product.name || product.nameEn || '';
  }
  return product.nameEn || product.name || product.nameTa || '';
}

// Helper function to get hotel name based on active language
export function getHotelName(hotel: HotelItem, lang: LanguageCode): string {
  if (lang === 'ta') {
    return hotel.nameTa || hotel.nameEn || '';
  }
  return hotel.nameEn || hotel.nameTa || '';
}

// Helper function to get shop name based on active language
export function getShopDisplayName(settings: ShopSettings, lang: LanguageCode): string {
  if (lang === 'ta') {
    if (settings.shopNameTa && settings.shopNameTa.trim()) return settings.shopNameTa;
    if (settings.shopName === 'SSS CHICKEN AGENCY' || !settings.shopName) return 'எஸ்.எஸ்.எஸ். சிக்கன் ஏஜென்சி';
    return settings.shopName;
  }
  return settings.shopName || 'SSS CHICKEN AGENCY';
}

// Helper function to get shop address based on active language
export function getShopDisplayAddress(settings: ShopSettings, lang: LanguageCode): string {
  if (lang === 'ta') {
    if (settings.addressTa && settings.addressTa.trim()) return settings.addressTa;
    if (settings.address?.includes('PONDY MAIN ROAD') || settings.address?.includes('VILLIANUR') || !settings.address) {
      return 'எண் 6, பாண்டி மெயின் ரோடு, சுல்தான்பேட்டை, வில்லியனூர், புதுச்சேரி – 605 110';
    }
    return settings.address;
  }
  return settings.address || 'NO 6, PONDY MAIN ROAD, SULTHANPET, VILLIANUR, PUDUCHERRY - 605 110';
}

// Helper function to resolve item name to the current active bill language
export function resolveItemDisplayName(
  item: { productId?: string; productName: string },
  products: ProductItem[] = [],
  lang: LanguageCode
): string {
  // 1. Try finding by productId in loaded products
  if (item.productId) {
    const p = products.find((x) => x.id === item.productId);
    if (p) return getProductName(p, lang);
    const def = DEFAULT_PRODUCTS.find((x) => x.id === item.productId);
    if (def) return getProductName(def, lang);
  }

  // 2. Try special cases like gravy piece
  const cleanName = item.productName?.trim().toLowerCase() || '';
  if (cleanName === 'gravy piece' || cleanName === 'கிரேவி துண்டு' || cleanName === 'கிரேவி துண்டுகள்') {
    return lang === 'ta' ? 'கிரேவி துண்டுகள்' : 'Gravy piece';
  }

  // 3. Try matching productName across defaults
  const matched = (products.length > 0 ? products : DEFAULT_PRODUCTS).find(
    (x) =>
      x.name?.trim().toLowerCase() === cleanName ||
      x.nameEn?.trim().toLowerCase() === cleanName ||
      x.nameTa?.trim().toLowerCase() === cleanName
  );

  if (matched) {
    return getProductName(matched, lang);
  }

  return item.productName;
}

// Helper function to resolve hotel name to the current active bill language
export function resolveHotelDisplayName(
  hotelName: string,
  hotelId: string | undefined,
  hotels: HotelItem[] = [],
  lang: LanguageCode
): string {
  if (hotelId) {
    const h = hotels.find((x) => x.id === hotelId);
    if (h) return getHotelName(h, lang);
    const defH = DEFAULT_HOTELS.find((x) => x.id === hotelId);
    if (defH) return getHotelName(defH, lang);
  }

  const matched = (hotels.length > 0 ? hotels : DEFAULT_HOTELS).find(
    (x) =>
      x.nameEn?.trim().toLowerCase() === hotelName?.trim().toLowerCase() ||
      x.nameTa?.trim().toLowerCase() === hotelName?.trim().toLowerCase()
  );

  if (matched) {
    return getHotelName(matched, lang);
  }

  return hotelName;
}

