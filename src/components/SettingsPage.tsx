import React, { useRef, useState } from 'react';
import {
  Settings,
  Save,
  Check,
  Store,
  Phone,
  FileText,
  MapPin,
  QrCode,
  HardDrive,
  Download,
  Upload,
  FileSpreadsheet,
  Smartphone,
  Building2,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  Search,
  MessageCircle,
  Printer,
} from 'lucide-react';
import { appLogo } from '../assets/logo';
import { Bill, DEFAULT_HOTELS, getHotelName, HotelItem, LanguageCode, ShopSettings } from '../types';
import { exportAllDataToFile, exportBillsToCSV, importDataFromFile, saveOrUpdateHotelPhone } from '../utils/storage';
import { TRANSLATIONS } from '../utils/translations';

interface SettingsPageProps {
  settings: ShopSettings;
  bills: Bill[];
  hotels: HotelItem[];
  language: LanguageCode;
  onSaveSettings: (newSettings: ShopSettings) => void;
  onSaveHotels?: (hotels: HotelItem[]) => void;
  onDataRestored?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  bills,
  hotels,
  language,
  onSaveSettings,
  onSaveHotels,
  onDataRestored,
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ShopSettings>({
    shopName: settings.shopName || '',
    shopNameTa: settings.shopNameTa || 'எஸ்.எஸ்.எஸ். சிக்கன் ஏஜென்சி',
    phoneNumber: settings.phoneNumber || '',
    gstNumber: settings.gstNumber || '',
    address: settings.address || '',
    addressTa: settings.addressTa || 'எண் 6, பாண்டி மெயின் ரோடு, சுல்தான்பேட்டை, வில்லியனூர், புதுச்சேரி - 605 110',
    upiId: settings.upiId || '',
    billWidthCm: settings.billWidthCm || 17,
  });

  const [newHotelNameEn, setNewHotelNameEn] = useState('');
  const [newHotelNameTa, setNewHotelNameTa] = useState('');
  const [newHotelPhone, setNewHotelPhone] = useState('');
  const [hotelPhoneEdits, setHotelPhoneEdits] = useState<Record<string, string>>({});
  const [hotelSearchQuery, setHotelSearchQuery] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [fileStatus, setFileStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (field: keyof ShopSettings, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddHotel = (e: React.FormEvent) => {
    e.preventDefault();
    const enTrimmed = newHotelNameEn.trim();
    const taTrimmed = newHotelNameTa.trim();
    const phoneTrimmed = newHotelPhone.trim();
    if (!enTrimmed && !taTrimmed) {
      setFileStatus({ type: 'error', text: t.addErrorHotelName });
      setTimeout(() => setFileStatus(null), 3000);
      return;
    }

    const newHotel: HotelItem = {
      id: 'h_' + Date.now(),
      nameEn: enTrimmed || taTrimmed,
      nameTa: taTrimmed || enTrimmed,
      phone: phoneTrimmed || undefined,
    };

    const updated = [...hotels, newHotel];
    if (onSaveHotels) onSaveHotels(updated);
    if (phoneTrimmed) {
      saveOrUpdateHotelPhone(newHotel.id, phoneTrimmed);
    }
    setNewHotelNameEn('');
    setNewHotelNameTa('');
    setNewHotelPhone('');
    const displayName = getHotelName(newHotel, language);
    setFileStatus({
      type: 'success',
      text: language === 'ta' ? `"${displayName}" ஹோட்டல் சேர்க்கப்பட்டது!` : `Added "${displayName}" to hotels!`,
    });
    setTimeout(() => setFileStatus(null), 3000);
  };

  const handleSaveHotelPhone = (hotelId: string) => {
    const phoneToSave = (hotelPhoneEdits[hotelId] ?? '').trim();
    const targetHotel = hotels.find((h) => h.id === hotelId);
    if (!targetHotel) return;

    const updated = hotels.map((h) => (h.id === hotelId ? { ...h, phone: phoneToSave || undefined } : h));
    if (onSaveHotels) onSaveHotels(updated);
    saveOrUpdateHotelPhone(hotelId, phoneToSave);

    const displayName = getHotelName(targetHotel, language);
    setFileStatus({
      type: 'success',
      text: language === 'ta'
        ? `"${displayName}" தொலைபேசி எண் சேமிக்கப்பட்டது!`
        : `Phone number for "${displayName}" saved!`,
    });
    setTimeout(() => setFileStatus(null), 3000);
  };

  const handleDeleteHotelPhone = (hotelId: string) => {
    const targetHotel = hotels.find((h) => h.id === hotelId);
    if (!targetHotel) return;

    const updated = hotels.map((h) => (h.id === hotelId ? { ...h, phone: undefined } : h));
    if (onSaveHotels) onSaveHotels(updated);
    saveOrUpdateHotelPhone(hotelId, '');
    setHotelPhoneEdits((prev) => ({
      ...prev,
      [hotelId]: '',
    }));

    const displayName = getHotelName(targetHotel, language);
    setFileStatus({
      type: 'success',
      text: language === 'ta'
        ? `"${displayName}" தொலைபேசி எண் நீக்கப்பட்டது!`
        : `Phone number removed for "${displayName}"!`,
    });
    setTimeout(() => setFileStatus(null), 3000);
  };

  const handleDeleteHotel = (hotelId: string) => {
    if (hotels.length <= 1) {
      setFileStatus({
        type: 'error',
        text: language === 'ta' ? 'குறைந்தது ஒரு ஹோட்டல் பட்டியலில் இருக்க வேண்டும்.' : 'At least one hotel must remain in the list.',
      });
      setTimeout(() => setFileStatus(null), 3000);
      return;
    }
    const hotelToRemove = hotels.find((h) => h.id === hotelId);
    const updated = hotels.filter((h) => h.id !== hotelId);
    if (onSaveHotels) onSaveHotels(updated);
    const removedName = hotelToRemove ? getHotelName(hotelToRemove, language) : '';
    setFileStatus({
      type: 'success',
      text: language === 'ta' ? `"${removedName}" நீக்கப்பட்டது` : `Removed "${removedName}"`,
    });
    setTimeout(() => setFileStatus(null), 3000);
  };

  const handleResetDefaultHotels = () => {
    if (onSaveHotels) onSaveHotels(DEFAULT_HOTELS);
    setFileStatus({
      type: 'success',
      text: language === 'ta' ? '14 நிலையான ஹோட்டல்கள் மீட்டமைக்கப்பட்டன!' : 'Reset to standard 14 hotel names!',
    });
    setTimeout(() => setFileStatus(null), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 4000);
  };

  const handleExportBackup = () => {
    exportAllDataToFile();
    setFileStatus({
      type: 'success',
      text: language === 'ta' ? 'காப்புப் பிரதி கோப்பு பதிவிறக்கம் செய்யப்பட்டது!' : 'Backup file saved directly to your phone storage (Downloads)!',
    });
    setTimeout(() => setFileStatus(null), 5000);
  };

  const handleExportCSV = () => {
    exportBillsToCSV(bills);
    setFileStatus({
      type: 'success',
      text: language === 'ta' ? 'விற்பனை அறிக்கை CSV கோப்பாக பதிவிறக்கம் செய்யப்பட்டது!' : 'Sales report CSV file saved directly to your phone!',
    });
    setTimeout(() => setFileStatus(null), 5000);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const result = await importDataFromFile(file);
    if (result.success) {
      setFileStatus({
        type: 'success',
        text: language === 'ta' ? 'தரவு வெற்றிகரமாக மீட்டமைக்கப்பட்டது!' : 'Backup restored successfully from phone file!',
      });
      if (onDataRestored) {
        onDataRestored();
      }
    } else {
      setFileStatus({
        type: 'error',
        text: result.message || (language === 'ta' ? 'கோப்பை மீட்டமைப்பதில் தோல்வி.' : 'Failed to restore file.'),
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setTimeout(() => setFileStatus(null), 6000);
  };

  return (
    <div id="page-settings" className="pb-24 pt-3 px-4 max-w-md mx-auto space-y-4">
      {/* Page Title */}
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-emerald-700" />
        <h2 className="text-base font-bold text-emerald-950">{t.settings}</h2>
      </div>

      {/* Official Business Branding Badge Card */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 text-white rounded-3xl p-4 shadow-md flex items-center gap-3.5 border border-emerald-700/60">
        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white p-0.5 flex-shrink-0 shadow-md border-2 border-amber-300">
          <img
            src={appLogo}
            alt="SSS Chicken Agency Logo"
            className="w-full h-full object-cover rounded-xl"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-black text-sm sm:text-base tracking-wide uppercase text-white truncate">
              {formData.shopName || 'SSS CHICKEN AGENCY'}
            </h3>
          </div>
          <p className="text-[11px] text-emerald-100 font-semibold truncate">
            📞 {formData.phoneNumber || '8680000003'}
          </p>
          <p className="text-[10px] text-amber-200 font-medium truncate">
            GST: {formData.gstNumber || '34AQPN8846J2ZF'}
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {savedSuccess && (
        <div className="bg-emerald-600 text-white p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md animate-in fade-in slide-in-from-top-2">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{t.saveSettingsSuccess}</span>
        </div>
      )}

      {fileStatus && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md animate-in fade-in slide-in-from-top-2 ${
            fileStatus.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{fileStatus.text}</span>
        </div>
      )}

      {/* Settings Form Card */}
      <form onSubmit={handleSubmit} className="bg-white border border-emerald-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* 1. Shop Name */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-emerald-700" />
            <span>1. {t.shopName}</span>
          </label>
          <input
            id="setting-input-shop-name"
            type="text"
            value={formData.shopName}
            onChange={(e) => handleChange('shopName', e.target.value)}
            placeholder="SSS CHICKEN AGENCY"
            required
            className="w-full px-3.5 py-2.5 bg-emerald-50/40 border border-emerald-300 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-xs sm:text-sm font-bold text-gray-900 outline-none transition-all"
          />
          <span className="text-[10px] text-gray-400 mt-1 block">
            {language === 'ta' ? 'இந்த பெயர் தலைப்பிலும் ரசீதுகளிலும் தோன்றும்.' : 'This name appears at the top header and on printed bills.'}
          </span>
        </div>

        {/* 2. Phone Number */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-emerald-700" />
            <span>2. {t.phoneNumber}</span>
          </label>
          <input
            id="setting-input-phone"
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) => handleChange('phoneNumber', e.target.value)}
            placeholder="8680000003"
            className="w-full px-3.5 py-2.5 bg-emerald-50/40 border border-emerald-300 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 outline-none transition-all"
          />
        </div>

        {/* 3. GST Number */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-emerald-700" />
            <span>3. {t.gstNumber}</span>
          </label>
          <input
            id="setting-input-gst"
            type="text"
            value={formData.gstNumber}
            onChange={(e) => handleChange('gstNumber', e.target.value)}
            placeholder="34AQPN8846J2ZF"
            className="w-full px-3.5 py-2.5 bg-emerald-50/40 border border-emerald-300 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 outline-none transition-all uppercase"
          />
        </div>

        {/* 4. Address */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-700" />
            <span>4. {t.address}</span>
          </label>
          <textarea
            id="setting-input-address"
            rows={2}
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="NO 6, PONDY MAIN ROAD, SULTHANPET, VILLIANUR, PUDUCHERRY - 605 110"
            className="w-full px-3.5 py-2 bg-emerald-50/40 border border-emerald-300 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-xs sm:text-sm font-medium text-gray-900 outline-none transition-all resize-none"
          />
        </div>

        {/* 5. UPI ID */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5 text-emerald-700" />
            <span>5. {t.upiId}</span>
          </label>
          <input
            id="setting-input-upi"
            type="text"
            value={formData.upiId}
            onChange={(e) => handleChange('upiId', e.target.value)}
            placeholder="NAZIRAHAMED0003@okhdfcbank"
            className="w-full px-3.5 py-2.5 bg-emerald-50/40 border border-emerald-300 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 outline-none transition-all"
          />
        </div>

        {/* 6. Default Bill Print Width */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5 text-emerald-700" />
            <span>6. {language === 'ta' ? 'பில் அச்சிடும் அகலம் (Bill Width)' : 'Bill Print Width'}</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              id="setting-input-bill-width"
              type="number"
              min="5"
              max="30"
              step="1"
              value={formData.billWidthCm || 17}
              onChange={(e) => handleChange('billWidthCm', Number(e.target.value) || 17)}
              className="w-28 px-3.5 py-2.5 bg-emerald-50/40 border border-emerald-300 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-xs sm:text-sm font-black text-gray-900 outline-none"
            />
            <span className="text-xs font-extrabold text-emerald-950">cm (செ.மீ)</span>
            <span className="text-[11px] text-gray-500 ml-auto font-medium">
              {language === 'ta' ? 'இயல்புநிலை: 17 செ.மீ' : 'Default: 17 cm'}
            </span>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2">
          <button
            id="btn-save-settings"
            type="submit"
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-700/25 flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <Save className="w-5 h-5" />
            <span>{t.save}</span>
          </button>
        </div>
      </form>

      {/* Hotel & Customer Names Management Card with Phone Number Setup */}
      <div className="bg-white border border-emerald-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-emerald-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-700" />
            <h3 className="text-xs sm:text-sm font-bold text-emerald-950 uppercase tracking-wide">
              {t.hotelsAndCustomers} ({hotels.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={handleResetDefaultHotels}
            title="Reset to 14 standard hotels"
            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{t.resetHotels}</span>
          </button>
        </div>

        {/* Add New Hotel Form (English, Tamil & Phone Number) */}
        <form onSubmit={handleAddHotel} className="space-y-2 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-200">
          <div className="text-xs font-bold text-emerald-950 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5 text-emerald-700" />
            <span>{t.addHotel}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={newHotelNameEn}
              onChange={(e) => setNewHotelNameEn(e.target.value)}
              placeholder={t.hotelNameEn + ' (e.g. Star Biriyani)'}
              className="w-full px-3 py-2 bg-white border border-emerald-300 focus:border-emerald-600 rounded-xl text-xs font-semibold text-gray-900 outline-none"
            />
            <input
              type="text"
              value={newHotelNameTa}
              onChange={(e) => setNewHotelNameTa(e.target.value)}
              placeholder={t.hotelNameTa + ' (எ.கா. ஸ்டார் பிரியாணி)'}
              className="w-full px-3 py-2 bg-white border border-emerald-300 focus:border-emerald-600 rounded-xl text-xs font-semibold text-gray-900 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="tel"
                value={newHotelPhone}
                onChange={(e) => setNewHotelPhone(e.target.value)}
                placeholder={language === 'ta' ? 'வாட்ஸ்அப் எண் (விருப்பத்தேர்வு - எ.கா: 9876543210)' : 'WhatsApp Phone (Optional - e.g. 9876543210)'}
                className="w-full pl-8 pr-3 py-2 bg-white border border-emerald-300 focus:border-emerald-600 rounded-xl text-xs font-semibold text-gray-900 outline-none"
              />
              <Phone className="w-3.5 h-3.5 text-emerald-600 absolute left-2.5 top-2.5" />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shadow-xs whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addHotel}</span>
            </button>
          </div>
        </form>

        {/* Hotel Search & Filter */}
        <div className="relative">
          <input
            type="text"
            value={hotelSearchQuery}
            onChange={(e) => setHotelSearchQuery(e.target.value)}
            placeholder={language === 'ta' ? 'ஹோட்டல் பெயர் / எண் தேட...' : 'Search hotel name or phone number...'}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl text-xs text-gray-800 outline-none"
          />
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
        </div>

        {/* Hotel list with Hotel Name, Phone Number, Save & Delete */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {hotels
            .filter((hotel) => {
              if (!hotelSearchQuery.trim()) return true;
              const q = hotelSearchQuery.toLowerCase();
              return (
                hotel.nameEn.toLowerCase().includes(q) ||
                hotel.nameTa.toLowerCase().includes(q) ||
                (hotel.phone && hotel.phone.includes(q))
              );
            })
            .map((hotel) => {
              const displayName = getHotelName(hotel, language);
              const secondaryName = language === 'ta' ? hotel.nameEn : hotel.nameTa;
              const currentEditPhone = hotelPhoneEdits[hotel.id] !== undefined ? hotelPhoneEdits[hotel.id] : (hotel.phone || '');

              return (
                <div
                  key={hotel.id}
                  className="bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 p-2.5 rounded-2xl transition-all space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs sm:text-sm font-extrabold text-emerald-950 block truncate">
                        {displayName}
                      </span>
                      {secondaryName && secondaryName !== displayName && (
                        <span className="text-[10px] text-gray-500 font-medium block truncate">{secondaryName}</span>
                      )}
                    </div>
                    {hotel.phone && (
                      <span className="text-[10px] text-emerald-800 bg-emerald-100 font-bold px-2 py-0.5 rounded-md flex items-center gap-1 flex-shrink-0">
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                        <span>{hotel.phone}</span>
                      </span>
                    )}
                  </div>

                  {/* Hotel Phone Input + Save + Delete */}
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <input
                        type="tel"
                        value={currentEditPhone}
                        onChange={(e) => {
                          const val = e.target.value;
                          setHotelPhoneEdits((prev) => ({
                            ...prev,
                            [hotel.id]: val,
                          }));
                        }}
                        placeholder={language === 'ta' ? 'வாட்ஸ்அப் எண் (எ.கா: 9876543210)' : 'WhatsApp phone (e.g. 9876543210)'}
                        className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-300 focus:border-emerald-600 rounded-xl text-xs font-bold text-gray-900 outline-none"
                      />
                      <Phone className="w-3.5 h-3.5 text-emerald-600 absolute left-2 top-2" />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSaveHotelPhone(hotel.id)}
                      title="Save Phone Number"
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95 flex-shrink-0"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{language === 'ta' ? 'சேமி' : 'Save'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteHotelPhone(hotel.id)}
                      title={language === 'ta' ? `தொலைபேசி எண்ணை நீக்கு (${displayName})` : `Delete Phone Number for ${displayName}`}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center transition-colors active:scale-95 flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Local Phone Storage & File Backup Card */}
      <div className="bg-white border border-emerald-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-emerald-100">
          <Smartphone className="w-4 h-4 text-emerald-700" />
          <h3 className="text-xs sm:text-sm font-bold text-emerald-950 uppercase tracking-wide">
            {t.backupAndRestore}
          </h3>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 text-xs text-emerald-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <HardDrive className="w-4 h-4 text-emerald-700" />
            <span>{language === 'ta' ? 'தொலைபேசி சேமிப்பகம்: இயங்குகிறது' : 'Device Storage Status: Active & Saved Locally'}</span>
          </div>
          <p className="text-[11px] text-emerald-800 leading-relaxed">
            {language === 'ta'
              ? 'அனைத்து விலைகள், ரசீதுகள் மற்றும் அமைப்புகள் இந்த மொபைலில் பாதுகாப்பாக சேமிக்கப்படுகின்றன.'
              : "All prices, bills, and settings are saved on this phone's local storage. No internet connection required."}
          </p>
        </div>

        {/* Action Buttons for Phone File Storage */}
        <div className="space-y-2 pt-1">
          {/* Export JSON Backup File */}
          <button
            id="btn-save-phone-backup-file"
            type="button"
            onClick={handleExportBackup}
            className="w-full py-2.5 px-3 bg-emerald-100/70 hover:bg-emerald-200/80 border border-emerald-300 text-emerald-900 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors active:scale-98"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>{t.exportJson}</span>
          </button>

          {/* Export CSV File */}
          <button
            id="btn-save-phone-csv-file"
            type="button"
            onClick={handleExportCSV}
            className="w-full py-2.5 px-3 bg-emerald-100/70 hover:bg-emerald-200/80 border border-emerald-300 text-emerald-900 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors active:scale-98"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>{t.exportCsv}</span>
          </button>

          {/* Import JSON File */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelected}
              className="hidden"
              id="input-restore-phone-file"
            />
            <button
              id="btn-restore-phone-file"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-3 bg-white hover:bg-emerald-50 border-2 border-dashed border-emerald-300 text-emerald-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors active:scale-98"
            >
              <Upload className="w-4 h-4 text-emerald-700" />
              <span>{t.restoreJson}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
