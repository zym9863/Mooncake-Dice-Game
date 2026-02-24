import { createI18n } from 'vue-i18n'
import enUS from './messages/en-US'
import zhCN from './messages/zh-CN'

export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

const LOCALE_STORAGE_KEY = 'mooncake-locale'
const DEFAULT_LOCALE: Locale = 'zh-CN'

const messages = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

function normalizeLocale(input: string | null | undefined): Locale {
  if (input && SUPPORTED_LOCALES.includes(input as Locale)) {
    return input as Locale
  }
  return DEFAULT_LOCALE
}

const initialLocale = normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY))

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'en-US',
  messages,
})

export function setLocale(locale: Locale) {
  i18n.global.locale.value = locale
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
}
