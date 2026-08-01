import { useLocalisation, type LanguageCode } from "../localisation/LocalisationProvider";

const languages: Array<[LanguageCode, string]> = [
  ["en", "English"], ["es", "Español"], ["hi", "हिन्दी"], ["gu", "ગુજરાતી"],
];

export function LanguageSelector() {
  const { language, setLanguage } = useLocalisation();
  return <label className="language-selector"><span>Language</span><select aria-label="Language" value={language} onChange={(event) => setLanguage(event.target.value as LanguageCode)}>{languages.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>;
}
