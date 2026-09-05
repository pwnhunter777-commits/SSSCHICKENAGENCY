import React, { useState } from 'react';
import { ArrowLeft, Bold, Calendar, Globe, Store } from 'lucide-react';
import { appLogo } from '../assets/logo';
import { AppPage, LanguageCode, ShopSettings } from '../types';
import { formatDisplayDate, getTodayDateString } from '../utils/storage';
import { TRANSLATIONS } from '../utils/translations';

interface AppHeaderProps {
  settings: ShopSettings;
  language: LanguageCode;
  currentPage: AppPage;
  onLanguageChange: (lang: LanguageCode) => void;
  onToggleBold?: () => void;
  onBackToMain?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  settings,
  language,
  currentPage,
  onLanguageChange,
  onToggleBold,
  onBackToMain,
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
    <header id="app-header" className="relative bg-gradient-to-r from-emerald-700 via-emerald-800 to-emerald-900 text-white shadow-lg shadow-emerald-950/15 rounded-b-3xl px-4 pt-3.5 pb-4 z-30 border-b-2 border-emerald-600/30">
      <div className="flex items-center justify-between gap-2">
        {/* Back Button (if on subpage) & Company Logo & Name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {currentPage !== 'billing' && onBackToMain && (
            <button
              id="btn-header-back-navigation"
              type="button"
              onClick={onBackToMain}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-950 hover:bg-black active:bg-slate-950 text-white rounded-xl text-xs font-black transition-all border border-emerald-600/60 active:scale-95 shadow-xs flex-shrink-0"
              title={language === 'ta' ? 'முதன்மை பக்கம் செல்ல' : 'Back to Main Page (Billing)'}
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5] text-white" />
              <span className="font-black">{language === 'ta' ? 'முதன்மை' : 'Back'}</span>
            </button>
          )}

          <div className="w-10 h-10 rounded-2xl bg-white p-0.5 flex items-center justify-center flex-shrink-0 shadow-sm border border-white/80 overflow-hidden">
            {logoLoaded && appLogo ? (
              <img
                src={appLogo}
                alt="SSS Chicken Agency Logo"
                className="w-full h-full object-cover rounded-xl"
                onError={() => setLogoLoaded(false)}
                referrerPolicy="no-referrer"
              />
            ) : (
              <Store className="w-5 h-5 text-emerald-700" />
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
                  : 'bg-emerald-950/80 hover:bg-emerald-950 text-white border-emerald-600/60'
              }`}
              title={
                language === 'ta'
                  ? (settings.isBoldText ? 'தடித்த எழுத்து இயக்கத்தில் உள்ளது' : 'எழுத்தை தடிமனாக்கு (Bold)')
                  : (settings.isBoldText ? 'Bold Text is ON' : 'Make Text Bold')
              }
            >
              <Bold className="w-3.5 h-3.5 stroke-[3]" />
              <span className="font-black">{settings.isBoldText ? 'B (ON)' : 'B'}</span>
            </button>
          )}

          {/* Language Selector */}
          <div className="relative">
            <button
              id="language-selector-btn"
              type="button"
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1 bg-emerald-950/80 hover:bg-emerald-950 active:scale-95 text-white px-2.5 py-1.5 rounded-xl text-xs font-black backdrop-blur-xs transition-all border border-emerald-600/60 shadow-xs"
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
                <div className="absolute right-0 mt-1.5 w-36 bg-slate-900 rounded-2xl shadow-2xl border-2 border-emerald-600 py-1.5 z-50 text-white">
                  <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300 border-b border-slate-800">
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
                      className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between transition-colors ${
                        language === lang.code
                          ? 'bg-emerald-700 text-white font-black'
                          : 'hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      <span>{lang.native}</span>
                      <span className="text-[10px] text-slate-400">({lang.label})</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Date Badge */}
          <div
            id="header-date-badge"
            className="flex items-center gap-1 bg-emerald-950/40 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white border border-emerald-500/40 shadow-inner"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-300" />
            <span className="whitespace-nowrap">{displayDate}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
