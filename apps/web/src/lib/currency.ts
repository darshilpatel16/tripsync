const currencyApi = Intl as typeof Intl & { supportedValuesOf?: (key: "currency") => string[] };
const displayNames = new Intl.DisplayNames([navigator.language], { type: "currency" });
export const currencies = (currencyApi.supportedValuesOf?.("currency") ?? ["GBP", "EUR", "USD", "INR", "JPY"])
  .map((code) => ({ code, name: displayNames.of(code) ?? code }))
  .sort((a, b) => a.name.localeCompare(b.name));
export const currencyDigits = (currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
export const majorToMinor = (value: string, currency: string) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a positive amount");
  return Math.round(amount * 10 ** currencyDigits(currency));
};
export const minorToMajor = (amount: number, currency: string) => amount / 10 ** currencyDigits(currency);
export const formatMoney = (amount: number, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(minorToMajor(amount, currency));
