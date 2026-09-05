import React from 'react';
import { Tag, Receipt, BookOpen, BarChart3, Building2, Settings } from 'lucide-react';
import { AppPage, LanguageCode } from '../types';
import { TRANSLATIONS } from '../utils/translations';

interface BottomNavProps {
  currentPage: AppPage;
  onPageChange: (page: AppPage) => void;
  language: LanguageCode;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentPage,
  onPageChange,
  language,
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const navItems: { id: AppPage; label: string; icon: React.ReactNode }[] = [
    {
      id: 'daily-price',
      label: t.dailyPrice,
      icon: <Tag className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
    {
      id: 'billing',
      label: t.billing,
      icon: <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
    {
      id: 'register',
      label: t.register,
      icon: <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
    {
      id: 'total',
      label: t.total,
      icon: <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
    {
      id: 'hotel',
      label: t.hotel,
      icon: <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
    {
      id: 'settings',
      label: t.settings,
      icon: <Settings className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
  ];

  return (
    <nav
      id="bottom-navigation-bar"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-emerald-200/90 shadow-[0_-4px_25px_rgba(5,150,105,0.08)] safe-area-pb"
    >
      <div className="max-w-md mx-auto grid grid-cols-6 px-1 py-1.5">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              type="button"
              onClick={() => onPageChange(item.id)}
              className={`relative flex flex-col items-center justify-center py-0.5 px-0.5 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-emerald-900 font-black'
                  : 'text-emerald-950/60 hover:text-emerald-800 font-semibold'
              }`}
            >
              {/* Highlight pill behind icon for active state */}
              <div
                className={`flex items-center justify-center w-10 h-7 rounded-full mb-0.5 transition-all ${
                  isActive
                    ? 'bg-emerald-700 text-white scale-105 shadow-md shadow-emerald-700/35'
                    : 'text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                {item.icon}
              </div>

              {/* Label */}
              <span
                className={`text-[9px] sm:text-[10px] leading-tight text-center truncate max-w-full px-0.5 ${
                  isActive ? 'text-emerald-950 font-black' : 'text-emerald-950/70 font-bold'
                }`}
              >
                {item.label}
              </span>

              {/* Bottom active dot */}
              {isActive && (
                <span className="absolute -bottom-0.5 w-1.5 h-1.5 bg-emerald-700 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
