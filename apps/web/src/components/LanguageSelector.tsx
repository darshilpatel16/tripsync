import { useState } from "react";

const languageStorageKey = "tripsync-language";

const languages = [
  ["en", "English"],
  ["es", "Español"],
  ["fr", "Français"],
  ["de", "Deutsch"],
  ["hi", "हिन्दी"],
  ["gu", "ગુજરાતી"],
] as const;

function readStoredLanguage() {
  try {
    return window.localStorage.getItem(languageStorageKey) ?? "en";
  } catch {
    return "en";
  }
}

function saveLanguage(language: string) {
  try {
    window.localStorage.setItem(languageStorageKey, language);
  } catch {
    // The selection still works for this page when storage is unavailable.
  }
}

export function LanguageSelector() {
  const [language, setLanguage] = useState(readStoredLanguage);

  const changeLanguage = (value: string) => {
    setLanguage(value);
    saveLanguage(value);
    document.documentElement.lang = value;
  };

  return (
    <label className="language-selector">
      <span>Language</span>
      <select
        aria-label="Language"
        value={language}
        onChange={(event) => changeLanguage(event.target.value)}
      >
        {languages.map(([code, name]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
