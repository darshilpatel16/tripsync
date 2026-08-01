/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type LanguageCode = "en" | "es" | "hi" | "gu";

const languageStorageKey = "tripsync-language";

const translations: Record<Exclude<LanguageCode, "en">, Record<string, string>> = {
  es: {
    Language: "Idioma", "Sign in": "Iniciar sesión", "Sign out": "Cerrar sesión", "Create account": "Crear cuenta", "Create an account": "Crear una cuenta", "Email address": "Correo electrónico", Password: "Contraseña", "Confirm password": "Confirmar contraseña", "Forgot password?": "¿Olvidaste tu contraseña?", "Back to sign in": "Volver a iniciar sesión", "Your dashboard": "Tu panel", "Create trip": "Crear viaje", "Create your first trip": "Crea tu primer viaje", "Your trips": "Tus viajes", "All trips": "Todos los viajes", Organising: "Organizando", Member: "Miembro", Owner: "Propietario", Travellers: "Viajeros", "Invite a traveller": "Invitar a un viajero", "Send invitation": "Enviar invitación", Accept: "Aceptar", Decline: "Rechazar", "Edit trip": "Editar viaje", "Delete trip": "Eliminar viaje", "Leave trip": "Salir del viaje", Remove: "Eliminar", Destination: "Destino", "Trip name": "Nombre del viaje", Currency: "Moneda", "Start date": "Fecha de inicio", "End date": "Fecha de fin", Cancel: "Cancelar", "Save changes": "Guardar cambios", "Shared expenses": "Gastos compartidos", "Who paid for what?": "¿Quién pagó qué?", "+ Add expense": "+ Añadir gasto", Close: "Cerrar", "What was the expense?": "¿Cuál fue el gasto?", Description: "Descripción", Amount: "Importe", "Who paid?": "¿Quién pagó?", "Who shared this expense?": "¿Quién compartió este gasto?", "Save expense": "Guardar gasto", "More options: custom split, date and notes": "Más opciones: reparto personalizado, fecha y notas", "Hide more options": "Ocultar opciones", "Split equally": "Dividir por igual", "Enter custom amounts": "Introducir importes personalizados", Date: "Fecha", "Optional notes": "Notas opcionales", Edit: "Editar", Delete: "Eliminar", "Suggested settlements": "Pagos sugeridos", Settled: "Saldado", "Add photo": "Añadir foto", "Change photo": "Cambiar foto", Saving: "Guardando", "Remove photo": "Eliminar foto", "Profile photo": "Foto de perfil", "Add activity": "Añadir actividad", "Propose an activity": "Proponer una actividad", Location: "Ubicación", Notes: "Notas", "Loading trip…": "Cargando viaje…", "Loading your dashboard…": "Cargando tu panel…"
  },
  hi: {
    Language: "भाषा", "Sign in": "साइन इन करें", "Sign out": "साइन आउट", "Create account": "खाता बनाएँ", "Create an account": "खाता बनाएँ", "Email address": "ईमेल पता", Password: "पासवर्ड", "Confirm password": "पासवर्ड की पुष्टि करें", "Forgot password?": "पासवर्ड भूल गए?", "Back to sign in": "साइन इन पर वापस जाएँ", "Your dashboard": "आपका डैशबोर्ड", "Create trip": "यात्रा बनाएँ", "Create your first trip": "अपनी पहली यात्रा बनाएँ", "Your trips": "आपकी यात्राएँ", "All trips": "सभी यात्राएँ", Organising: "आयोजक", Member: "सदस्य", Owner: "मालिक", Travellers: "यात्री", "Invite a traveller": "यात्री को आमंत्रित करें", "Send invitation": "आमंत्रण भेजें", Accept: "स्वीकार करें", Decline: "अस्वीकार करें", "Edit trip": "यात्रा संपादित करें", "Delete trip": "यात्रा हटाएँ", "Leave trip": "यात्रा छोड़ें", Remove: "हटाएँ", Destination: "गंतव्य", "Trip name": "यात्रा का नाम", Currency: "मुद्रा", "Start date": "आरंभ तिथि", "End date": "समाप्ति तिथि", Cancel: "रद्द करें", "Save changes": "बदलाव सहेजें", "Shared expenses": "साझा खर्च", "Who paid for what?": "किसने किसके लिए भुगतान किया?", "+ Add expense": "+ खर्च जोड़ें", Close: "बंद करें", "What was the expense?": "खर्च किस चीज़ का था?", Description: "विवरण", Amount: "राशि", "Who paid?": "किसने भुगतान किया?", "Who shared this expense?": "यह खर्च किसने साझा किया?", "Save expense": "खर्च सहेजें", "More options: custom split, date and notes": "अधिक विकल्प: कस्टम बँटवारा, तिथि और नोट्स", "Hide more options": "अधिक विकल्प छिपाएँ", "Split equally": "बराबर बाँटें", "Enter custom amounts": "कस्टम राशि डालें", Date: "तिथि", "Optional notes": "वैकल्पिक नोट्स", Edit: "संपादित करें", Delete: "हटाएँ", "Suggested settlements": "सुझाए गए भुगतान", Settled: "हिसाब पूरा", "Add photo": "फोटो जोड़ें", "Change photo": "फोटो बदलें", Saving: "सहेजा जा रहा है", "Remove photo": "फोटो हटाएँ", "Profile photo": "प्रोफाइल फोटो", "Add activity": "गतिविधि जोड़ें", "Propose an activity": "गतिविधि सुझाएँ", Location: "स्थान", Notes: "नोट्स", "Loading trip…": "यात्रा लोड हो रही है…", "Loading your dashboard…": "डैशबोर्ड लोड हो रहा है…"
  },
  gu: {
    Language: "ભાષા", "Sign in": "સાઇન ઇન", "Sign out": "સાઇન આઉટ", "Create account": "ખાતું બનાવો", "Create an account": "ખાતું બનાવો", "Email address": "ઇમેઇલ સરનામું", Password: "પાસવર્ડ", "Confirm password": "પાસવર્ડની ખાતરી કરો", "Forgot password?": "પાસવર્ડ ભૂલી ગયા?", "Back to sign in": "સાઇન ઇન પર પાછા જાઓ", "Your dashboard": "તમારું ડૅશબોર્ડ", "Create trip": "ટ્રિપ બનાવો", "Create your first trip": "તમારી પહેલી ટ્રિપ બનાવો", "Your trips": "તમારી ટ્રિપ્સ", "All trips": "બધી ટ્રિપ્સ", Organising: "આયોજક", Member: "સભ્ય", Owner: "માલિક", Travellers: "મુસાફરો", "Invite a traveller": "મુસાફરને આમંત્રણ આપો", "Send invitation": "આમંત્રણ મોકલો", Accept: "સ્વીકારો", Decline: "નકારો", "Edit trip": "ટ્રિપ સંપાદિત કરો", "Delete trip": "ટ્રિપ કાઢી નાખો", "Leave trip": "ટ્રિપ છોડો", Remove: "દૂર કરો", Destination: "ગંતવ્ય", "Trip name": "ટ્રિપનું નામ", Currency: "ચલણ", "Start date": "શરૂઆતની તારીખ", "End date": "અંતિમ તારીખ", Cancel: "રદ કરો", "Save changes": "ફેરફારો સાચવો", "Shared expenses": "સહિયારા ખર્ચ", "Who paid for what?": "કોણે શેના માટે ચૂકવ્યું?", "+ Add expense": "+ ખર્ચ ઉમેરો", Close: "બંધ કરો", "What was the expense?": "ખર્ચ શેનો હતો?", Description: "વર્ણન", Amount: "રકમ", "Who paid?": "કોણે ચૂકવ્યું?", "Who shared this expense?": "આ ખર્ચ કોણે વહેંચ્યો?", "Save expense": "ખર્ચ સાચવો", "More options: custom split, date and notes": "વધુ વિકલ્પો: કસ્ટમ વહેંચણી, તારીખ અને નોંધો", "Hide more options": "વધુ વિકલ્પો છુપાવો", "Split equally": "સમાન રીતે વહેંચો", "Enter custom amounts": "કસ્ટમ રકમ દાખલ કરો", Date: "તારીખ", "Optional notes": "વૈકલ્પિક નોંધો", Edit: "સંપાદિત કરો", Delete: "કાઢી નાખો", "Suggested settlements": "સૂચવેલ ચૂકવણીઓ", Settled: "હિસાબ પૂર્ણ", "Add photo": "ફોટો ઉમેરો", "Change photo": "ફોટો બદલો", Saving: "સાચવી રહ્યું છે", "Remove photo": "ફોટો દૂર કરો", "Profile photo": "પ્રોફાઇલ ફોટો", "Add activity": "પ્રવૃત્તિ ઉમેરો", "Propose an activity": "પ્રવૃત્તિ સૂચવો", Location: "સ્થળ", Notes: "નોંધો", "Loading trip…": "ટ્રિપ લોડ થઈ રહી છે…", "Loading your dashboard…": "ડૅશબોર્ડ લોડ થઈ રહ્યું છે…"
  },
};

type LocalisationValue = { language: LanguageCode; setLanguage: (language: LanguageCode) => void };
const LocalisationContext = createContext<LocalisationValue>({ language: "en", setLanguage: () => undefined });
const originalText = new WeakMap<Text, string>();

function translatePage(language: LanguageCode) {
  const dictionary = language === "en" ? null : translations[language];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    const parent = node.parentElement;
    if (parent && !parent.closest("[data-no-translate]") && !["SCRIPT", "STYLE"].includes(parent.tagName)) {
      const source = originalText.get(node) ?? node.data;
      originalText.set(node, source);
      const leading = source.match(/^\s*/)?.[0] ?? "";
      const trailing = source.match(/\s*$/)?.[0] ?? "";
      const phrase = source.trim();
      node.data = phrase && dictionary?.[phrase] ? `${leading}${dictionary[phrase]}${trailing}` : source;
    }
    node = walker.nextNode() as Text | null;
  }
}

function initialLanguage(): LanguageCode {
  try {
    const saved = window.localStorage.getItem(languageStorageKey);
    return saved === "es" || saved === "hi" || saved === "gu" ? saved : "en";
  } catch { return "en"; }
}

export function LocalisationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(initialLanguage);
  const setLanguage = (value: LanguageCode) => {
    setLanguageState(value);
    try { window.localStorage.setItem(languageStorageKey, value); } catch { /* In-memory selection still works. */ }
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = "ltr";
    translatePage(language);
    const observer = new MutationObserver(() => translatePage(language));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage }), [language]);
  return <LocalisationContext.Provider value={value}>{children}</LocalisationContext.Provider>;
}

export function useLocalisation() {
  const value = useContext(LocalisationContext);
  return value;
}
