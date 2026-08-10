import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en';
import es from './es';
import pt from './pt';

const LANG_KEY = '@ironflow_lang';

const translations = { en, es, pt };

const I18nContext = createContext({
  locale: 'en',
  t: () => '',
  setLocale: () => {},
});

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState('en');

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((saved) => {
      if (saved && translations[saved]) setLocaleState(saved);
    });
  }, []);

  const setLocale = async (lang) => {
    if (!translations[lang]) return;
    setLocaleState(lang);
    await AsyncStorage.setItem(LANG_KEY, lang);
  };

  const t = (key) => {
    const parts = key.split('.');
    let value = translations[locale];
    for (const part of parts) {
      if (value == null) return key;
      value = value[part];
    }
    return value ?? key;
  };

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useTranslation = () => useContext(I18nContext);

export const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
];
