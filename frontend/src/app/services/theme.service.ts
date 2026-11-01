import { Injectable, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

// Same key as the small script in index.html that applies the theme before Angular starts
const STORAGE_KEY = 'theme';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  theme = signal<Theme>(this.initialTheme());

  constructor() {
    this.apply(this.theme());
  }

  toggle(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
    this.apply(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage can be blocked (private mode); the theme still works for this visit
    }
  }

  // Saved choice first, otherwise follow the operating system setting, otherwise dark
  private initialTheme(): Theme {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {}
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  // styles.css switches all colors with [data-theme='light'] / [data-theme='dark'] on <html>
  private apply(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
