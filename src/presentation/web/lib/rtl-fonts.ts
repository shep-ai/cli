/**
 * Lazy font loader for RTL languages (Arabic and Hebrew).
 *
 * Dynamically loads Noto Sans Arabic or Noto Sans Hebrew from Google Fonts
 * when the user switches to an RTL language. Fonts are cached after first
 * load — subsequent calls for the same language are no-ops.
 *
 * This module must only be imported in client components (uses DOM APIs).
 */

const FONT_CONFIG: Record<string, { family: string; cssUrl: string }> = {
  ar: {
    family: 'Noto Sans Arabic',
    cssUrl:
      'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap',
  },
  he: {
    family: 'Noto Sans Hebrew',
    cssUrl:
      'https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;500;600;700&display=swap',
  },
};

/**
 * Load the appropriate font for an RTL language and apply it to the document.
 *
 * For non-RTL languages this removes any previously applied RTL font class.
 * The Google Fonts stylesheet is injected as a `<link>` element in `<head>`,
 * which the browser caches normally (no re-download on subsequent visits).
 * Duplicate link elements are avoided by checking DOM existence.
 */
export function applyRtlFont(language: string): void {
  const config = FONT_CONFIG[language];

  // Remove any existing RTL font class
  document.documentElement.classList.remove('font-rtl-arabic', 'font-rtl-hebrew');

  if (!config) {
    // LTR language — clear RTL font override
    document.documentElement.style.removeProperty('--font-rtl');
    return;
  }

  // Set the CSS custom property for the RTL font family
  document.documentElement.style.setProperty('--font-rtl', `"${config.family}"`);

  // Add language-specific font class
  const fontClass = language === 'ar' ? 'font-rtl-arabic' : 'font-rtl-hebrew';
  document.documentElement.classList.add(fontClass);

  // Load the font stylesheet if not already present in the DOM
  const linkId = `rtl-font-${language}`;
  if (!document.getElementById(linkId)) {
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = config.cssUrl;
    document.head.appendChild(link);
  }
}
