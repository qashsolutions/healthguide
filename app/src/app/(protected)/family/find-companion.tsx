// HealthGuide Family Member — Find Companion
// Redirects to the shared careseeker directory screen
// Family members browse companions on behalf of their elder

import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

export default function FamilyFindCompanionScreen() {
  const router = useRouter();

  // Family member uses the same directory — navigate there
  useEffect(() => {
    router.replace('/(protected)/careseeker/find-companion' as any);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Loading companion directory...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  text: {
    ...typography.styles.body,
    color: colors.text.tertiary,
  },
});
