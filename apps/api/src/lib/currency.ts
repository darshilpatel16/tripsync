const currencyApi = Intl as typeof Intl & { supportedValuesOf?: (key: "currency") => string[] };
export const supportedCurrencies = new Set(currencyApi.supportedValuesOf?.("currency") ?? ["GBP", "EUR", "USD", "INR", "JPY"]);
