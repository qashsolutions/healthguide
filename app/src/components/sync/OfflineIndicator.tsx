// HealthGuide Offline Indicator
// Small badge or icon to indicate offline mode

import { View, Text, StyleSheet } from 'react-native';
import { useConnectivity } from '@/lib/connectivity';
import { CloudIcon } from '@/components/icons';

interface OfflineIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

export function OfflineIndicator({
  size = 'medium',
  showText = true,
}: OfflineIndicatorProps) {
  const { isConnected, isInternetReachable } = useConnectivity();
  const isOnline = isConnected && isInternetReachable;

  if (isOnline) return null;

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.containerSmall,
          iconSize: 12,
          text: styles.textSmall,
        };
      case 'large':
        return {
          container: styles.containerLarge,
          iconSize: 18,
          text: styles.textLarge,
        };
      default:
        return {
          container: styles.containerMedium,
          iconSize: 14,
          text: styles.textMedium,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View style={[styles.container, sizeStyles.container]}>
      <CloudIcon size={sizeStyles.iconSize} color="#DC2626" />
      {showText && <Text style={[styles.text, sizeStyles.text]}>Offline</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
  },
  containerSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  containerMedium: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  containerLarge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
  },
  text: {
    color: '#DC2626',
    fontWeight: '500',
  },
  textSmall: {
    fontSize: 10,
  },
  textMedium: {
    fontSize: 12,
  },
  textLarge: {
    fontSize: 14,
  },
});
