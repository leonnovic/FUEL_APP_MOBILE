/**
 * Lightweight i18n system for FuelPro's first-impression surfaces (login page,
 * header, top-level CTAs). Keeps the bundle tiny (no `i18next`) and persists
 * the user's choice in localStorage.
 *
 * To add a new language:
 *   1. Append the locale code to `SUPPORTED_LOCALES`.
 *   2. Add a column to `STRINGS` (every key must be translated — TS will catch misses).
 *   3. Add the display name + flag emoji to `LOCALE_META`.
 *
 * The Dashboard and feature pages remain in English for now — i18n is being
 * rolled out gradually starting from the surfaces most-visible to new users.
 */

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const SUPPORTED_LOCALES = ['en', 'sw', 'fr', 'es', 'ar', 'pt', 'hi'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];

export const LOCALE_META: Record<Locale, { label: string; native: string; flag: string; dir: 'ltr' | 'rtl' }> = {
  en: { label: 'English',    native: 'English',    flag: '🇬🇧', dir: 'ltr' },
  sw: { label: 'Swahili',    native: 'Kiswahili',  flag: '🇰🇪', dir: 'ltr' },
  fr: { label: 'French',     native: 'Français',   flag: '🇫🇷', dir: 'ltr' },
  es: { label: 'Spanish',    native: 'Español',    flag: '🇪🇸', dir: 'ltr' },
  ar: { label: 'Arabic',     native: 'العربية',     flag: '🇸🇦', dir: 'rtl' },
  pt: { label: 'Portuguese', native: 'Português',  flag: '🇧🇷', dir: 'ltr' },
  hi: { label: 'Hindi',      native: 'हिन्दी',       flag: '🇮🇳', dir: 'ltr' },
};

// All strings keyed by id. Each row: [en, sw, fr, es, ar, pt, hi].
// Keep this file as the single source of truth for translated copy.
const STRINGS = {
  // Hero / landing
  'auth.welcome':         ['Welcome to your comprehensive fuel management solution for unlimited stations',
                           'Karibu kwenye suluhisho lako kamili la usimamizi wa mafuta kwa vituo visivyo na kikomo',
                           'Bienvenue dans votre solution complète de gestion de carburant pour stations illimitées',
                           'Bienvenido a tu solución integral de gestión de combustible para estaciones ilimitadas',
                           'مرحبًا بك في حل الإدارة الشامل للوقود لمحطات غير محدودة',
                           'Bem-vindo à sua solução completa de gestão de combustível para estações ilimitadas',
                           'असीमित स्टेशनों के लिए अपने व्यापक ईंधन प्रबंधन समाधान में आपका स्वागत है'],
  'auth.tagline':         ['Professional Fuel Management',
                           'Usimamizi wa Mafuta wa Kitaalamu',
                           'Gestion Professionnelle du Carburant',
                           'Gestión Profesional de Combustible',
                           'إدارة احترافية للوقود',
                           'Gestão Profissional de Combustível',
                           'पेशेवर ईंधन प्रबंधन'],
  'auth.sign_in':         ['Sign In', 'Ingia', 'Se connecter', 'Iniciar sesión', 'تسجيل الدخول', 'Entrar', 'साइन इन'],
  'auth.continue_google': ['Continue with Google', 'Endelea na Google', 'Continuer avec Google',
                           'Continuar con Google', 'المتابعة باستخدام Google', 'Continuar com Google', 'Google के साथ जारी रखें'],
  'auth.or_with_email':   ['Or with email', 'Au kwa barua pepe', 'Ou par email', 'O con correo',
                           'أو بالبريد الإلكتروني', 'Ou por email', 'या ईमेल से'],
  'auth.email':           ['Email Address', 'Anwani ya Barua Pepe', 'Adresse e-mail', 'Correo electrónico',
                           'البريد الإلكتروني', 'Endereço de e-mail', 'ईमेल पता'],
  'auth.password':        ['Password', 'Nenosiri', 'Mot de passe', 'Contraseña', 'كلمة المرور', 'Palavra-passe', 'पासवर्ड'],
  'auth.forgot_pw':       ['Forgot Password?', 'Umesahau Nenosiri?', 'Mot de passe oublié ?',
                           '¿Olvidaste tu contraseña?', 'هل نسيت كلمة المرور؟', 'Esqueceu a palavra-passe?', 'पासवर्ड भूल गए?'],
  'auth.new_to_fuelpro':  ['New to FuelPro? Create an account',
                           'Mpya kwa FuelPro? Fungua akaunti',
                           'Nouveau sur FuelPro ? Créer un compte',
                           '¿Nuevo en FuelPro? Crea una cuenta',
                           'مستخدم جديد على FuelPro؟ أنشئ حسابًا',
                           'Novo no FuelPro? Crie uma conta',
                           'FuelPro पर नए हैं? खाता बनाएं'],
  'auth.founder_access':  ['Founder Access', 'Ufikiaji wa Mwanzilishi', 'Accès Fondateur', 'Acceso del Fundador',
                           'وصول المؤسس', 'Acesso do Fundador', 'संस्थापक एक्सेस'],
  'auth.create_account':  ['Create Account', 'Fungua Akaunti', 'Créer un compte', 'Crear cuenta',
                           'إنشاء حساب', 'Criar conta', 'खाता बनाएं'],
  'auth.full_name':       ['Full Name', 'Jina Kamili', 'Nom complet', 'Nombre completo',
                           'الاسم الكامل', 'Nome completo', 'पूरा नाम'],
  'auth.confirm_pw':      ['Confirm Password', 'Thibitisha Nenosiri', 'Confirmer le mot de passe',
                           'Confirmar contraseña', 'تأكيد كلمة المرور', 'Confirmar palavra-passe', 'पासवर्ड की पुष्टि करें'],
  // Feature cards on the landing page
  'feature.cloud_sync':         ['Cloud Sync', 'Usawazishaji wa Wingu', 'Synchro. Cloud', 'Sincronización Cloud',
                                 'مزامنة سحابية', 'Sincronização na nuvem', 'क्लाउड सिंक'],
  'feature.cloud_sync_desc':    ['Your data securely synced across all devices in real-time',
                                 'Data yako inasawazishwa kwa usalama kati ya vifaa vyote kwa wakati halisi',
                                 'Vos données synchronisées en toute sécurité sur tous vos appareils en temps réel',
                                 'Tus datos sincronizados de forma segura en todos los dispositivos en tiempo real',
                                 'بياناتك متزامنة بأمان عبر جميع الأجهزة في الوقت الفعلي',
                                 'Os seus dados sincronizados em segurança em todos os dispositivos em tempo real',
                                 'आपका डेटा सभी डिवाइस पर रीयल-टाइम में सुरक्षित रूप से सिंक्रनाइज़'],
  'feature.secure_auth':        ['Secure Authentication', 'Uthibitishaji Salama', 'Authentification Sécurisée',
                                 'Autenticación Segura', 'مصادقة آمنة', 'Autenticação Segura', 'सुरक्षित प्रमाणीकरण'],
  'feature.realtime_updates':   ['Real-Time Updates', 'Masasisho ya Wakati Halisi', 'Mises à jour en temps réel',
                                 'Actualizaciones en Tiempo Real', 'تحديثات في الوقت الفعلي',
                                 'Atualizações em tempo real', 'रीयल-टाइम अपडेट'],
  'feature.multistation':       ['Multi-Station', 'Vituo Vingi', 'Multi-Stations', 'Multi-Estación',
                                 'متعدد المحطات', 'Multi-Estação', 'मल्टी-स्टेशन'],
  'feature.admin_control':      ['Admin Control', 'Udhibiti wa Msimamizi', 'Contrôle Administrateur',
                                 'Control Administrativo', 'تحكم المسؤول', 'Controlo Administrativo', 'व्यवस्थापक नियंत्रण'],
  // Header buttons
  'header.team':       ['Team', 'Timu', 'Équipe', 'Equipo', 'الفريق', 'Equipa', 'टीम'],
  'header.digest':     ['Digest', 'Muhtasari', 'Récap', 'Resumen', 'الملخص', 'Resumo', 'सारांश'],
  'header.admin':      ['Admin', 'Msimamizi', 'Admin', 'Admin', 'المسؤول', 'Admin', 'व्यवस्थापक'],
  'header.logout':     ['Logout', 'Toka', 'Déconnexion', 'Cerrar sesión', 'تسجيل خروج', 'Sair', 'लॉग आउट'],
  // Trial banner
  'trial.upgrade':     ['Upgrade Now', 'Boresha Sasa', 'Mettre à niveau', 'Actualizar ahora',
                        'الترقية الآن', 'Atualizar agora', 'अभी अपग्रेड करें'],
  'trial.full_access': ['Full access', 'Ufikiaji kamili', 'Accès complet', 'Acceso completo',
                        'الوصول الكامل', 'Acesso total', 'पूर्ण पहुंच'],
} as const satisfies Record<string, readonly [string, string, string, string, string, string, string]>;

export type StringKey = keyof typeof STRINGS;

const LOCALE_INDEX: Record<Locale, number> = { en: 0, sw: 1, fr: 2, es: 3, ar: 4, pt: 5, hi: 6 };

/** Detect locale from the user's browser, falling back to English. */
function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem('fuelpro_locale');
    if (saved && (SUPPORTED_LOCALES as readonly string[]).includes(saved)) return saved as Locale;
  } catch { /* ignore */ }
  const browser = (typeof navigator !== 'undefined' ? navigator.language : 'en').toLowerCase();
  const root = browser.split('-')[0];
  if ((SUPPORTED_LOCALES as readonly string[]).includes(root)) return root as Locale;
  return 'en';
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: StringKey) => string;
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (k) => STRINGS[k]?.[0] ?? k,
  dir: 'ltr',
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem('fuelpro_locale', l); } catch { /* ignore */ }
  };

  // Update <html dir> for RTL languages (Arabic)
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = LOCALE_META[locale].dir;
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    t: (key: StringKey) => STRINGS[key]?.[LOCALE_INDEX[locale]] ?? STRINGS[key]?.[0] ?? key,
    dir: LOCALE_META[locale].dir,
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
