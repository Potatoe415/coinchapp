import type { Title } from "@/lib/president";
import type { Locale } from "@/lib/client/i18n";

export const TITLE_LABEL: Record<Locale, Record<Title, string>> = {
  fr: {
    president: "Président",
    vicePresident: "Vice-Président",
    viceTrouDuCul: "Vice-Trou du cul",
    trouDuCul: "Trou du cul",
  },
  en: {
    president: "President",
    vicePresident: "Vice-President",
    viceTrouDuCul: "Vice-Asshole",
    trouDuCul: "Asshole",
  },
};

export const TITLE_SHORT_LABEL: Record<Locale, Record<Title, string>> = {
  fr: { president: "Prés.", vicePresident: "V-Prés.", viceTrouDuCul: "V-TDC", trouDuCul: "TDC" },
  en: { president: "Pres.", vicePresident: "V-Pres.", viceTrouDuCul: "V-Ass.", trouDuCul: "Ass." },
};
