export const theme = {
  colors: {
    background: '#000000',
    surface: '#16161A',
    ringTrack: '#3A3A3A',
    borderSubtle: '#1C1C20',
    textPrimary: '#FFFFFF',
    textSecondary: '#A0A0A6',
    textTertiary: '#707070',
    accent: '#B8E550',
    accentForeground: '#0B0B0C',
    addButtonBg: '#FFFFFF',
    addButtonText: '#000000',
    buttonMuted: '#2C2C2C',
    danger: '#FF453A',
    edit: '#0A84FF',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    pill: 999,
  },
  typography: {
    label: {
      fontSize: 12,
      fontWeight: '500' as const,
      letterSpacing: 0.5,
    },
    body: {
      fontSize: 15,
      fontWeight: '400' as const,
    },
    title: {
      fontSize: 17,
      fontWeight: '600' as const,
    },
    headline: {
      fontSize: 22,
      fontWeight: '700' as const,
    },
    dayNumber: {
      fontSize: 18,
      fontWeight: '600' as const,
    },
    exerciseName: {
      fontSize: 16,
      fontWeight: '500' as const,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    addButton: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    pageTitle: {
      fontSize: 20,
      fontWeight: '600' as const,
    },
  },
};

export type Theme = typeof theme;
