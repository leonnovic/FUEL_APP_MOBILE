/**
 * Compact language picker — fixed to the top-right of any page that mounts it.
 * Persists the user's choice in localStorage via I18nContext.
 */
import { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useI18n, LOCALE_META, SUPPORTED_LOCALES, Locale } from '@/react-app/context/I18nContext';

interface Props {
  /** Floating position vs inline. Defaults to floating in the top-right. */
  floating?: boolean;
}

export default function LanguagePicker({ floating = true }: Props) {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const current = LOCALE_META[locale];
  const containerClass = floating
    ? 'fixed top-4 right-4 z-[60]'
    : 'relative inline-block';

  return (
    <div ref={ref} className={containerClass} data-testid="language-picker">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 rounded-lg text-xs text-white transition-colors shadow-md"
        aria-label="Change language"
        data-testid="language-picker-trigger"
      >
        <Globe size={13} className="text-amber-300" />
        <span className="text-base leading-none" aria-hidden>{current.flag}</span>
        <span className="font-semibold hidden sm:inline">{current.native}</span>
        <ChevronDown size={11} className="opacity-70" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 w-56 bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/15 overflow-hidden"
          role="listbox"
          data-testid="language-picker-menu"
        >
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-gray-400 border-b border-white/10">
            Choose language
          </div>
          {SUPPORTED_LOCALES.map((code) => {
            const meta = LOCALE_META[code as Locale];
            const isActive = code === locale;
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => { setLocale(code as Locale); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs hover:bg-white/5 transition-colors ${isActive ? 'bg-amber-500/10' : ''}`}
                data-testid={`language-option-${code}`}
              >
                <span className="text-lg leading-none" aria-hidden>{meta.flag}</span>
                <div className="flex-1">
                  <div className="text-white font-semibold">{meta.native}</div>
                  <div className="text-[10px] text-gray-400">{meta.label}</div>
                </div>
                {isActive && <Check size={13} className="text-amber-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
