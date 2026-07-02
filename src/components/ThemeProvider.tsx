import React, { createContext, useContext, useEffect, useState } from 'react';

export interface ColorTheme {
  id: string;
  name: string;
  nameEn: string;
  colors: {
    theme400: string;
    theme500: string;
    theme600: string;
    theme700: string;
  };
}

export const ACG_THEMES: ColorTheme[] = [
  {
    id: 'cosmic',
    name: '星空星尘 (Cosmic Blue)',
    nameEn: 'Cosmic Blue',
    colors: {
      theme400: '129, 140, 248',
      theme500: '99, 102, 241',
      theme600: '79, 70, 229',
      theme700: '67, 56, 202',
    }
  },
  {
    id: 'miku',
    name: '初音未来 (Miku Teal)',
    nameEn: 'Miku Teal',
    colors: {
      theme400: '86, 219, 209',
      theme500: '57, 197, 187',
      theme600: '43, 160, 152',
      theme700: '30, 128, 122',
    }
  },
  {
    id: 'kurumi',
    name: '时崎狂三 (Kurumi Red)',
    nameEn: 'Kurumi Crimson',
    colors: {
      theme400: '248, 113, 113',
      theme500: '220, 38, 38',
      theme600: '185, 28, 28',
      theme700: '153, 27, 27',
    }
  },
  {
    id: 'sakura',
    name: '二次元樱花 (Sakura Pink)',
    nameEn: 'Sakura Pink',
    colors: {
      theme400: '244, 143, 177',
      theme500: '236, 64, 122',
      theme600: '216, 27, 96',
      theme700: '194, 24, 91',
    }
  },
  {
    id: 'rem',
    name: '蕾姆天空蓝 (Rem Blue)',
    nameEn: 'Rem Blue',
    colors: {
      theme400: '96, 165, 250',
      theme500: '59, 130, 246',
      theme600: '37, 99, 235',
      theme700: '29, 78, 216',
    }
  },
  {
    id: 'unicorn',
    name: '独角兽梦幻紫 (Unicorn Purple)',
    nameEn: 'Unicorn Purple',
    colors: {
      theme400: '192, 132, 252',
      theme500: '168, 85, 247',
      theme600: '147, 51, 234',
      theme700: '126, 34, 206',
    }
  }
];

interface ThemeContextType {
  activeTheme: ColorTheme;
  setThemeById: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  activeTheme: ACG_THEMES[0],
  setThemeById: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeTheme, setActiveTheme] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem('euroacg_theme');
    return ACG_THEMES.find(t => t.id === saved) || ACG_THEMES[0];
  });

  const applyTheme = (theme: ColorTheme) => {
    const root = document.documentElement;
    root.style.setProperty('--theme-400', theme.colors.theme400);
    root.style.setProperty('--theme-500', theme.colors.theme500);
    root.style.setProperty('--theme-600', theme.colors.theme600);
    root.style.setProperty('--theme-700', theme.colors.theme700);
  };

  useEffect(() => {
    applyTheme(activeTheme);
  }, [activeTheme]);

  const setThemeById = (id: string) => {
    const found = ACG_THEMES.find(t => t.id === id);
    if (found) {
      setActiveTheme(found);
      localStorage.setItem('euroacg_theme', id);
    }
  };

  return (
    <ThemeContext.Provider value={{ activeTheme, setThemeById }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
