// HealthGuide Elder Memory Game
// Per healthguide-community/elder-engagement skill - Extra large cards, simple gameplay

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import {
  FlowerBlossomIcon,
  FlowerSunIcon,
  FlowerHibiscusIcon,
  FlowerRoseIcon,
  FlowerTulipIcon,
  FlowerDaisyIcon,
  PartyIcon,
  SyncIcon,
  IconProps,
} from '@/components/icons';
import * as Haptics from 'expo-haptics';

// Flower icon components for elder-friendly game
const FLOWER_ICONS: React.ComponentType<IconProps>[] = [
  FlowerBlossomIcon,
  FlowerSunIcon,
  FlowerHibiscusIcon,
  FlowerRoseIcon,
  FlowerTulipIcon,
  FlowerDaisyIcon,
];

interface Card {
  id: number;
  iconIndex: number;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function MemoryGameScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [gameComplete, setGameComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    initializeGame();
  }, []);

  function initializeGame() {
    // Create pairs of cards - 6 pairs = 12 cards
    const iconIndices = FLOWER_ICONS.map((_, i) => i);
    const cardPairs = [...iconIndices, ...iconIndices];

    // Shuffle
    const shuffled = cardPairs
      .map((iconIndex, index) => ({
        id: index,
        iconIndex,
        isFlipped: false,
        isMatched: false,
      }))
      .sort(() => Math.random() - 0.5);

    setCards(shuffled);
    setFlippedCards([]);
    setMatches(0);
    setMoves(0);
    setStartTime(new Date());
    setGameComplete(false);
    setIsProcessing(false);
  }

  const handleCardPress = useCallback(
    (cardId: number) => {
      if (isProcessing || flippedCards.length === 2) return;

      const card = cards.find((c) => c.id === cardId);
      if (!card || card.isFlipped || card.isMatched) return;

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Flip card
      const newCards = cards.map((c) =>
        c.id === cardId ? { ...c, isFlipped: true } : c
      );
      setCards(newCards);

      const newFlipped = [...flippedCards, cardId];
      setFlippedCards(newFlipped);

      // Check for match if two cards flipped
      if (newFlipped.length === 2) {
        setIsProcessing(true);
        setMoves((m) => m + 1);

        const [first, second] = newFlipped;
        const card1 = newCards.find((c) => c.id === first);
        const card2 = newCards.find((c) => c.id === second);

        if (card1?.iconIndex === card2?.iconIndex) {
          // Match found!
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === first || c.id === second
                  ? { ...c, isMatched: true }
                  : c
              )
            );
            const newMatches = matches + 1;
            setMatches(newMatches);
            setFlippedCards([]);
            setIsProcessing(false);

            // Check win
            if (newMatches === 6) {
              handleGameComplete();
            }
          }, 500);
        } else {
          // No match - flip back after delay
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === first || c.id === second
                  ? { ...c, isFlipped: false }
                  : c
              )
            );
            setFlippedCards([]);
            setIsProcessing(false);
          }, 1200); // Longer delay for elders
        }
      }
    },
    [cards, flippedCards, matches, isProcessing]
  );

  async function handleGameComplete() {
    setGameComplete(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const duration = Math.round(
      (new Date().getTime() - startTime!.getTime()) / 1000
    );

    // Save game session to database
    try {
      await supabase.from('game_sessions').insert({
        elder_id: user?.id,
        game_type: 'memory',
        difficulty: 'easy',
        score: Math.max(100 - moves * 5, 10), // Score based on moves
        max_score: 100,
        duration_seconds: duration,
      });
    } catch (error) {
      console.log('Could not save game:', error);
    }

    Alert.alert(
      'Great Job!',
      `You matched all the flowers in ${moves} moves!\n\nThat was wonderful!`,
      [
        { text: 'Play Again', onPress: initializeGame },
        { text: 'Done', onPress: () => router.back() },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Memory Game',
          headerBackTitle: 'Back',
          headerTitleStyle: typography.elder.heading,
        }}
      />

      {/* Header Stats */}
      <View style={styles.header}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Matches</Text>
          <Text style={styles.statValue}>{matches}/6</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Moves</Text>
          <Text style={styles.statValue}>{moves}</Text>
        </View>
      </View>

      {/* Card Grid */}
      <View style={styles.grid}>
        {cards.map((card) => (
          <Pressable
            key={card.id}
            style={[
              styles.card,
              card.isFlipped && styles.cardFlipped,
              card.isMatched && styles.cardMatched,
            ]}
            onPress={() => handleCardPress(card.id)}
            disabled={card.isMatched || isProcessing}
            accessibilityRole="button"
            accessibilityLabel={
              card.isFlipped || card.isMatched
                ? `Card with flower ${card.iconIndex + 1}`
                : 'Hidden card'
            }
            accessibilityState={{ selected: card.isFlipped }}
          >
            {card.isFlipped || card.isMatched ? (
              (() => {
                const FlowerIcon = FLOWER_ICONS[card.iconIndex];
                return <FlowerIcon size={48} />;
              })()
            ) : (
              <Text style={styles.cardBack}>?</Text>
            )}
          </Pressable>
        ))}
      </View>

      {/* New Game Button */}
      <View style={styles.footer}>
        <Button
          title="New Game"
          variant="outline"
          size="lg"
          onPress={initializeGame}
          style={styles.resetButton}
          icon={<SyncIcon size={20} color={colors.primary[500]} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[8],
    marginBottom: spacing[6],
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },
  statLabel: {
    ...typography.elder.body,
    color: colors.text.secondary,
    fontSize: 18,
  },
  statValue: {
    ...typography.elder.heading,
    color: colors.primary[500],
    fontSize: 32,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[3],
    flex: 1,
    alignContent: 'center',
  },
  card: {
    width: 100,
    height: 100,
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  cardFlipped: {
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.primary[500],
  },
  cardMatched: {
    backgroundColor: colors.success[50],
    borderWidth: 3,
    borderColor: colors.success[500],
  },
  cardBack: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.white,
  },
  footer: {
    paddingTop: spacing[4],
  },
  resetButton: {
    paddingVertical: spacing[4],
  },
});
