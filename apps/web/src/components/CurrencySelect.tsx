import type { ChangeEventHandler } from "react";
import { currencies } from "../lib/currency";
type Props = { name: string; value: string; onChange: ChangeEventHandler<HTMLSelectElement> };
export function CurrencySelect({ name, value, onChange }: Props) {
  return <select name={name} onChange={onChange} value={value}>{currencies.map((item) => <option key={item.code} value={item.code}>{item.code} — {item.name}</option>)}</select>;
}
