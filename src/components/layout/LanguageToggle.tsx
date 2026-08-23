"use client";

import * as React from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = (lang: "en" | "bn") => {
    setLanguage(lang);
  };

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1 border border-gray-200 dark:border-gray-700">
      <button
        onClick={() => toggleLanguage("en")}
        className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors duration-200 ${
          language === "en"
            ? "bg-[#ec4899] text-white" // pink-500 similar to the image
            : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        }`}
      >
        ENG
      </button>
      <button
        onClick={() => toggleLanguage("bn")}
        className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors duration-200 ${
          language === "bn"
            ? "bg-[#ec4899] text-white" // pink-500 similar to the image
            : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        }`}
      >
        বাংলা
      </button>
    </div>
  );
}
