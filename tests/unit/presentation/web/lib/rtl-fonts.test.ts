import { describe, it, expect, beforeEach } from 'vitest';
import { applyRtlFont } from '@/lib/rtl-fonts';

describe('applyRtlFont', () => {
  beforeEach(() => {
    // Clean up any RTL font classes and styles from previous tests
    document.documentElement.classList.remove('font-rtl-arabic', 'font-rtl-hebrew');
    document.documentElement.style.removeProperty('--font-rtl');

    // Remove any injected font link elements
    document.querySelectorAll('[id^="rtl-font-"]').forEach((el) => el.remove());
  });

  it('does not load any font or add classes when language is English', () => {
    applyRtlFont('en');

    expect(document.documentElement.classList.contains('font-rtl-arabic')).toBe(false);
    expect(document.documentElement.classList.contains('font-rtl-hebrew')).toBe(false);
    expect(document.documentElement.style.getPropertyValue('--font-rtl')).toBe('');
    expect(document.getElementById('rtl-font-en')).toBeNull();
  });

  it('applies Arabic font class and loads stylesheet when language is "ar"', () => {
    applyRtlFont('ar');

    expect(document.documentElement.classList.contains('font-rtl-arabic')).toBe(true);
    expect(document.documentElement.classList.contains('font-rtl-hebrew')).toBe(false);
    expect(document.documentElement.style.getPropertyValue('--font-rtl')).toBe(
      '"Noto Sans Arabic"'
    );

    const link = document.getElementById('rtl-font-ar') as HTMLLinkElement;
    expect(link).not.toBeNull();
    expect(link.rel).toBe('stylesheet');
    expect(link.href).toContain('Noto+Sans+Arabic');
  });

  it('applies Hebrew font class and loads stylesheet when language is "he"', () => {
    applyRtlFont('he');

    expect(document.documentElement.classList.contains('font-rtl-hebrew')).toBe(true);
    expect(document.documentElement.classList.contains('font-rtl-arabic')).toBe(false);
    expect(document.documentElement.style.getPropertyValue('--font-rtl')).toBe(
      '"Noto Sans Hebrew"'
    );

    const link = document.getElementById('rtl-font-he') as HTMLLinkElement;
    expect(link).not.toBeNull();
    expect(link.rel).toBe('stylesheet');
    expect(link.href).toContain('Noto+Sans+Hebrew');
  });

  it('removes RTL font when switching from Arabic to English', () => {
    applyRtlFont('ar');
    expect(document.documentElement.classList.contains('font-rtl-arabic')).toBe(true);

    applyRtlFont('en');
    expect(document.documentElement.classList.contains('font-rtl-arabic')).toBe(false);
    expect(document.documentElement.style.getPropertyValue('--font-rtl')).toBe('');
  });

  it('switches font class when changing from Arabic to Hebrew', () => {
    applyRtlFont('ar');
    expect(document.documentElement.classList.contains('font-rtl-arabic')).toBe(true);

    applyRtlFont('he');
    expect(document.documentElement.classList.contains('font-rtl-arabic')).toBe(false);
    expect(document.documentElement.classList.contains('font-rtl-hebrew')).toBe(true);
  });

  it('does not create duplicate link elements on repeated calls', () => {
    applyRtlFont('ar');
    applyRtlFont('ar');
    applyRtlFont('ar');

    const links = document.querySelectorAll('#rtl-font-ar');
    expect(links.length).toBe(1);
  });

  it('does not load font for unsupported languages like French', () => {
    applyRtlFont('fr');

    expect(document.documentElement.classList.contains('font-rtl-arabic')).toBe(false);
    expect(document.documentElement.classList.contains('font-rtl-hebrew')).toBe(false);
    expect(document.getElementById('rtl-font-fr')).toBeNull();
  });
});
