"use client";

import * as React from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export function LanguageToggle() {
  const { language: globalLanguage, setLanguage } = useLanguage();
  const [localLanguage, setLocalLanguage] = React.useState(globalLanguage);

  // Synchronize local state with global state if changed elsewhere
  React.useEffect(() => {
    setLocalLanguage(globalLanguage);
  }, [globalLanguage]);

  const toggleLanguage = (lang: "en" | "bn") => {
    // 1. Immediately toggle the button visual state (instant feedback)
    setLocalLanguage(lang);
    
    // 2. Defer the heavy global translation re-rendering to the next event loop tick
    setTimeout(() => {
      setLanguage(lang);
    }, 0);
  };

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-0.5 md:p-1 border border-gray-200 dark:border-gray-700">
      <button
        onClick={() => toggleLanguage("en")}
        className={`px-1.5 py-0.5 md:px-3 md:py-1 text-[9px] md:text-xs font-semibold rounded-full transition-colors duration-200 ${
          localLanguage === "en"
            ? "bg-[#ec4899] text-white" // pink-500 similar to the image
            : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        }`}
      >
        <span className="md:hidden">EN</span>
        <span className="hidden md:inline">ENG</span>
      </button>
      <button
        onClick={() => toggleLanguage("bn")}
        className={`px-1.5 py-0.5 md:px-3 md:py-1 text-[9px] md:text-xs font-semibold rounded-full transition-colors duration-200 ${
          localLanguage === "bn"
            ? "bg-[#ec4899] text-white" // pink-500 similar to the image
            : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        }`}
      >
        <span className="md:hidden">BN</span>
        <span className="hidden md:inline">বাংলা</span>
      </button>
    </div>
  );
}
