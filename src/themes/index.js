// src/themes/index.js
// Drei Themen wie beim Morning Briefing. Standard: Warm (die gemütliche Variante).

export const themes = {
  warm: {
    bg: '#efe4d2', surface: '#fbf4e8', surface2: '#fffaf0',
    ink: '#3a322a', inkSoft: '#857a6c', line: '#e6d8c1',
    accent: '#c4622f', accentDark: '#a44e23', sage: '#6c7a4f',
  },
  ocean: {
    bg: '#e7eef2', surface: '#f4f9fb', surface2: '#ffffff',
    ink: '#23323a', inkSoft: '#6a7a82', line: '#d4e0e6',
    accent: '#2f7fae', accentDark: '#22617f', sage: '#4f8a86',
  },
  violet: {
    bg: '#ece7f2', surface: '#f6f2fb', surface2: '#fffdff',
    ink: '#322a3a', inkSoft: '#7a6f85', line: '#e0d6ea',
    accent: '#7a4fae', accentDark: '#5f3f86', sage: '#8a6fae',
  },
};

export const defaultTheme = themes.warm;
