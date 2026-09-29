import React from 'react';
import { HomePage } from './pages/HomePage';
import { LanguageProvider } from './i18n';

/**
 * AI YouTube - Main Application Shell
 * Wraps the modular HomePage workstation in the global LanguageProvider.
 */
export default function App() {
  return (
    <LanguageProvider>
      <HomePage />
    </LanguageProvider>
  );
}
