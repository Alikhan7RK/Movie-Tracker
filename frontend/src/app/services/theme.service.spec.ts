import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  afterEach(() => localStorage.clear());

  it('uses the saved theme', () => {
    localStorage.setItem('theme', 'light');

    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('toggles the theme and remembers it in localStorage', () => {
    localStorage.setItem('theme', 'dark');
    const service = TestBed.inject(ThemeService);

    service.toggle();

    expect(service.theme()).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    service.toggle();

    expect(service.theme()).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('ignores an invalid saved value', () => {
    localStorage.setItem('theme', 'purple');

    const service = TestBed.inject(ThemeService);

    expect(['dark', 'light']).toContain(service.theme());
  });
});
