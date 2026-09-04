import React, { useState } from 'react';
import { Bold, Calendar, Globe, Store } from 'lucide-react';
import { appLogo } from '../assets/logo';
import { LanguageCode, ShopSettings } from '../types';
import { formatDisplayDate, getTodayDateString } from '../utils/storage';
import { TRANSLATIONS } from '../utils/translations';

interface AppHeaderProps {
  settings: ShopSettings;
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onToggleBold?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  settings,
  language,
  onLanguageChange,
  onToggleBold,
}) => {
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(true);
  const todayStr = getTodayDateString();
  const displayDate = formatDisplayDate(todayStr, language);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const languages: { code: LanguageCode; label: string; native: string }[] = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  ];

  const currentLangObj = languages.find((l) => l.code === language) || languages[0];

  return (
    <header id="app-header" className="relative bg-emerald-800 text-white shadow-md rounded-b-3xl px-4 pt-3.5 pb-4.5 z-30">
      <div className="flex items-center justify-between gap-2">
        {/* Company Logo & Name */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-2xl bg-white/20 p-0.5 flex items-center justify-center flex-shrink-0 backdrop-blur-sm overflow-hidden border border-white/30 shadow-xs">
            {logoLoaded && appLogo ? (
              <img
                src={appLogo}
                alt="SSS Chicken Agency Logo"
                className="w-full h-full object-cover rounded-xl"
                onError={() => setLogoLoaded(false)}
                referrerPolicy="no-referrer"
              />
            ) : (
              <Store className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white truncate uppercase drop-shadow-xs">
              {settings.shopName || 'SSS CHICKEN AGENCY'}
            </h1>
            <p className="text-[11px] text-emerald-100 font-medium truncate">
              {settings.address ? settings.address : 'Sulthanpet, Villianur, Puducherry'}
            </p>
          </div>
        </div>

        {/* Language & Date Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Bold Text Toggle Button */}
          {onToggleBold && (
            <button
              id="btn-header-toggle-bold"
              type="button"
              onClick={onToggleBold}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-black backdrop-blur-xs transition-all border active:scale-95 touch-manipulation ${
                settings.isBoldText
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                  : 'bg-white/15 hover:bg-white/25 text-white border-white/20'
              }`}
              title={
                language === 'ta'
                  ? (settings.isBoldText ? 'தடித்த எழுத்து இயக்கத்தில் உள்ளது' : 'எழுத்தை தடிமனாக்கு (Bold)')
                  : (settings.isBoldText ? 'Bold Text is ON' : 'Make Text Bold')
              }
            >
              <Bold className="w-3.5 h-3.5 stroke-[3]" />
              <span className="font-extrabold">{settings.isBoldText ? 'B (ON)' : 'B'}</span>
            </button>
          )}

          {/* Language Selector */}
          <div className="relative">
            <button
              id="language-selector-btn"
              type="button"
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1 bg-white/15 hover:bg-white/25 active:scale-95 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-xs transition-all border border-white/20"
              title={t.language}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{currentLangObj.native}</span>
            </button>

            {showLangMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowLangMenu(false)}
                />
                <div className="absolute right-0 mt-1.5 w-36 bg-white rounded-2xl shadow-xl border border-emerald-100 py-1.5 z-50 text-gray-800">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800 border-b border-emerald-50">
                    {t.language}
                  </div>
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        onLanguageChange(lang.code);
                        setShowLangMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between transition-colors ${
                        language === lang.code
                          ? 'bg-emerald-50 text-emerald-700 font-bold'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span>{lang.native}</span>
                      <span className="text-[10px] text-gray-400">({lang.label})</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Date Badge */}
          <div
            id="header-date-badge"
            className="flex items-center gap-1 bg-emerald-800/60 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-white border border-emerald-600/60 shadow-inner"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-200" />
            <span className="whitespace-nowrap">{displayDate}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
