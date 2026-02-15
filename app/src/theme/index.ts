// HealthGuide Theme System
// Central export for all theme tokens

export { colors, roleColors, type ColorShade, type UserRole } from './colors';
export { typography, type TextStyle } from './typography';
export {
  spacing,
  touchTargets,
  borderRadius,
  shadows,
  createShadow,
  type SpacingKey,
  type TouchTargetKey,
  type BorderRadiusKey,
  type ShadowKey,
} from './spacing';

// Convenience theme object
export const theme = {
  colors: require('./colors').colors,
  roleColors: require('./colors').roleColors,
  typography: require('./typography').typography,
  spacing: require('./spacing').spacing,
  touchTargets: require('./spacing').touchTargets,
  borderRadius: require('./spacing').borderRadius,
  shadows: require('./spacing').shadows,
} as const;
