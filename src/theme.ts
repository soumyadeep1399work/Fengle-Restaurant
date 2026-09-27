// Exact tokens from "Fengle Platter App Flatboard FInal.html" (the client-approved
// final flatboard — logo-based violet palette). Do not restyle; this file mirrors
// the flatboard's literal hex values and type scale 1:1.

export const colors = {
  // Brand
  primary: '#4B18A6', // deep violet
  primaryMid: '#6423C9', // mid violet — links, secondary CTAs
  primaryTint: '#EFE6FB', // violet tint — chip/banner backgrounds
  gold: '#D99A1F', // turmeric gold accent

  // Ink / text
  ink: '#251C21',
  body: '#4A3C42',
  bodyMuted: '#6B5C63',
  muted: '#857680',
  mutedLight: '#9B8D93',
  faint: '#B4A7AC',
  addressMuted: '#9C86C9',

  // Surfaces
  surface: '#FFFFFF',
  surfaceAlt: '#FCF9F5',
  surfaceCream: '#FFF8F4',
  surfaceCream2: '#FFF7F2',
  sheetBg: '#FCF9F5',

  // Borders
  border: '#DCCEC6',
  borderAlt: '#E9DFD6',
  borderLight: 'rgba(233,223,214,0.75)',

  // Semantic
  veg: '#2F7D4F',
  nonVeg: '#A03A2B',
  vegTintBg: '#E8F3EC',
  goldChipBg: '#FCEED3',
  goldChipText: '#8A6A1F',
  greyChipBg: '#EFE7E2',
  conflictRed: '#C0524A',

  white: '#FFFFFF',
  black: '#000000',
};

export const fonts = {
  heading: 'BricolageGrotesque_700Bold',
  headingBlack: 'BricolageGrotesque_800ExtraBold',
  body: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodySemiBold: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  bodyExtraBold: 'Manrope_800ExtraBold',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

export const radii = {
  sm: 8,
  md: 14,
  lg: 18,
  xl: 20,
  xxl: 22,
  pill: 999,
};

// Restaurant Portal flatboard was drawn in the earlier mulberry palette; the app
// uses the final brand violet/gold above. These are its status colours, unchanged.
export const status = {
  alert: '#B23B3B', // new-order dot / takeover chip
  newBg: '#FBEAEA',
  newText: '#8A2F2F',
  doneBg: '#E8F3EC',
  doneText: '#2F7D4F',
  trackOff: '#C9BAC0',
  takeoverBg: '#251C21',
};
