export type AppLanguage = 'az' | 'ru';

type Dictionary = Record<string, string>;

export const translations: Record<AppLanguage, Dictionary> = {
  az: {
    'nav.dashboard': 'Panel',
    'nav.orders': 'Sifariş',
    'nav.sales': 'Satış',
    'nav.calculations': 'Hesablamalar',
    'nav.calculationParameters': 'Parametrlər',
    'nav.customers': 'Müştəri',
    'nav.production': 'İstehsal',
    'nav.inventory': 'Anbar',
    'nav.materials': 'Materiallar',
    'nav.import': 'Import Excel',
    'nav.finance': 'Maliyyə',
    'nav.customerDebts': 'Müştəri borcu',
    'nav.supplierDebts': 'Təchizatçı borcu',
    'nav.purchases': 'Alış',
    'nav.salaries': 'Maaş',
    'nav.debts': 'Borc mərkəzi',
    'nav.settings': 'Ayarlar',
    'layout.title': 'Çap evi idarəetməsi',
    'layout.subtitle': 'Satış, istehsal, anbar və maliyyə axını bir paneldə',
    'layout.headerTitle': 'Çap evi əməliyyat paneli',
    'layout.newOrder': 'Yeni sifariş',
    'layout.logout': 'Çıxış',
    'layout.security': 'Giriş və rol ayarları',
    'settings.title': 'Ayarlar',
    'settings.description': 'Şirkət məlumatları, işçilər, dil və seçim siyahıları burada idarə olunur.',
    'language.az': 'Azərbaycan dili',
    'language.ru': 'Русский язык'
  },
  ru: {
    'nav.dashboard': 'Панель',
    'nav.orders': 'Заказы',
    'nav.sales': 'Продажи',
    'nav.calculations': 'Расчёты',
    'nav.calculationParameters': 'Параметры',
    'nav.customers': 'Клиенты',
    'nav.production': 'Производство',
    'nav.inventory': 'Склад',
    'nav.materials': 'Материалы',
    'nav.import': 'Импорт Excel',
    'nav.finance': 'Финансы',
    'nav.customerDebts': 'Долги клиентов',
    'nav.supplierDebts': 'Долги поставщикам',
    'nav.purchases': 'Закупки',
    'nav.salaries': 'Зарплата',
    'nav.debts': 'Центр долгов',
    'nav.settings': 'Настройки',
    'layout.title': 'Управление типографией',
    'layout.subtitle': 'Продажи, производство, склад и финансы в одной панели',
    'layout.headerTitle': 'Операционная панель типографии',
    'layout.newOrder': 'Новый заказ',
    'layout.logout': 'Выход',
    'layout.security': 'Доступ и роли',
    'settings.title': 'Настройки',
    'settings.description': 'Компания, сотрудники, язык и справочники управляются здесь.',
    'language.az': 'Azərbaycan dili',
    'language.ru': 'Русский язык'
  }
};

export function translate(language: AppLanguage, key: string, fallback?: string) {
  return translations[language][key] ?? fallback ?? key;
}
