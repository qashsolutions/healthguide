// HealthGuide Elder Home Screen
// Per healthguide-careseeker/onboarding skill - Extra large touch targets

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable, Platform, ScrollView, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, touchTargets, borderRadius, shadows } from '@/theme/spacing';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { PhoneIcon, HeartIcon, PersonIcon, WaveIcon, CompanionIcon, CalendarIcon, StarIcon } from '@/components/icons';
import { NotificationBell } from '@/components/NotificationBell';
import { registerForPushNotifications } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Card } from '@/components/ui';

interface UpcomingVisit {
  id: string;
  scheduled_date: string;
  scheduled_start: string;
  companion_name: string;
  caregiver_type: string | null;
}

interface FavoriteCompanion {
  user_id: string;
  full_name: string;
  caregiver_type: string | null;
}

interface RecentVisit {
  id: string;
  scheduled_date: string;
  duration_minutes: number | null;
  companion_name: string;
}

export default function ElderHomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [upcomingVisits, setUpcomingVisits] = useState<UpcomingVisit[]>([]);
  const [favorites, setFavorites] = useState<FavoriteCompanion[]>([]);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      registerForPushNotifications(user.id, 'caregiver'); // careseeker uses same type
    }
  }, [user?.id]);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Find elder record
      const { data: elder } = await supabase
        .from('elders')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!elder) return;

      const today = format(new Date(), 'yyyy-MM-dd');

      // Upcoming visits
      const { data: upcoming } = await supabase
        .from('visits')
        .select(`
          id, scheduled_date, scheduled_start,
          caregiver:user_profiles!caregiver_id(full_name)
        `)
        .eq('elder_id', elder.id)
        .eq('status', 'scheduled')
        .gte('scheduled_date', today)
        .order('scheduled_date', { ascending: true })
        .limit(3);

      if (upcoming) {
        // Get caregiver types
        const cgIds = upcoming.map((v: any) => v.caregiver_id || '').filter(Boolean);
        let typeMap: Record<string, string> = {};
        if (cgIds.length > 0) {
          const { data: profiles } = await supabase
            .from('caregiver_profiles')
            .select('user_id, caregiver_type')
            .in('user_id', cgIds);
          if (profiles) {
            profiles.forEach((p: any) => { typeMap[p.user_id] = p.caregiver_type; });
          }
        }

        setUpcomingVisits(upcoming.map((v: any) => {
          const cg = Array.isArray(v.caregiver) ? v.caregiver[0] : v.caregiver;
          return {
            id: v.id,
            scheduled_date: v.scheduled_date,
            scheduled_start: v.scheduled_start,
            companion_name: cg?.full_name || 'Companion',
            caregiver_type: typeMap[v.caregiver_id] || null,
          };
        }));
      }

      // Favorites
      const { data: favs } = await supabase
        .from('elder_favorites')
        .select('companion_id')
        .eq('elder_id', elder.id);

      if (favs && favs.length > 0) {
        const favIds = favs.map((f: any) => f.companion_id);
        const { data: favProfiles } = await supabase
          .from('caregiver_profiles')
          .select('user_id, full_name, caregiver_type')
          .in('user_id', favIds);

        if (favProfiles) {
          setFavorites(favProfiles.map((p: any) => ({
            user_id: p.user_id,
            full_name: p.full_name,
            caregiver_type: p.caregiver_type,
          })));
        }
      }

      // Recent completed visits
      const { data: recent } = await supabase
        .from('visits')
        .select(`
          id, scheduled_date, duration_minutes,
          caregiver:user_profiles!caregiver_id(full_name)
        `)
        .eq('elder_id', elder.id)
        .eq('status', 'completed')
        .order('scheduled_date', { ascending: false })
        .limit(3);

      if (recent) {
        setRecentVisits(recent.map((v: any) => {
          const cg = Array.isArray(v.caregiver) ? v.caregiver[0] : v.caregiver;
          return {
            id: v.id,
            scheduled_date: v.scheduled_date,
            duration_minutes: v.duration_minutes,
            companion_name: cg?.full_name || 'Companion',
          };
        }));
      }
    } catch (error) {
      console.error('Error fetching elder data:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return format(date, 'h:mm a');
  };

  const typeEmoji = (t: string | null) => {
    if (t === 'student') return '🎓';
    if (t === 'companion_55') return '🤝';
    return '';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <GradientHeader roleColor={roleColors.careseeker}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.name}>{user?.full_name?.split(' ')[0] || 'there'}!</Text>
            </View>
            <NotificationBell />
          </View>
        </GradientHeader>

        {/* Upcoming Visits */}
        {upcomingVisits.length > 0 ? (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Upcoming Visits</Text>
            {upcomingVisits.map((visit) => (
              <Pressable key={visit.id} style={styles.upcomingCard}>
                <View style={styles.visitIcon}>
                  <PersonIcon size={28} color={roleColors.caregiver} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.upcomingName}>
                    {typeEmoji(visit.caregiver_type)} {visit.companion_name}
                  </Text>
                  <Text style={styles.upcomingTime}>
                    {format(new Date(visit.scheduled_date + 'T00:00:00'), 'EEE, MMM d')} · {formatTime(visit.scheduled_start)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.nextVisit}>
            <View style={styles.visitIcon}>
              <CalendarIcon size={28} color={colors.text.tertiary} />
            </View>
            <View style={styles.visitInfo}>
              <Text style={styles.visitLabel}>No upcoming visits</Text>
              <Text style={styles.visitTimeText}>Find a companion below</Text>
            </View>
          </View>
        )}

        {/* Large Action Buttons */}
        <View style={styles.buttonsContainer}>
          <Pressable
            style={({ pressed }) => [styles.bigButton, styles.companionButton, pressed && styles.buttonPressed]}
            onPress={() => router.push('/(protected)/careseeker/find-companion')}
          >
            <CompanionIcon size={48} color={colors.white} />
            <Text style={styles.bigButtonText}>Find a Companion</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.bigButton, styles.callButton, pressed && styles.buttonPressed]}
            onPress={() => router.push('/(protected)/careseeker/(tabs)/calls')}
          >
            <PhoneIcon size={48} color={colors.white} />
            <Text style={styles.bigButtonText}>Call Family</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.bigButton, styles.activitiesButton, pressed && styles.buttonPressed]}
            onPress={() => router.push('/(protected)/careseeker/(tabs)/activities')}
          >
            <HeartIcon size={48} color={colors.white} />
            <Text style={styles.bigButtonText}>Activities</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.bigButton, styles.checkinButton, pressed && styles.buttonPressed]}
            onPress={() => router.push('/(protected)/careseeker/daily-check-in')}
          >
            <WaveIcon size={48} color={colors.white} />
            <Text style={styles.bigButtonText}>How are you?</Text>
          </Pressable>
        </View>

        {/* My Companions (Favorites) */}
        {favorites.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>My Companions</Text>
            {favorites.map((fav) => (
              <View key={fav.user_id} style={styles.favoriteRow}>
                <StarIcon size={18} color={colors.warning[500]} />
                <Text style={styles.favoriteName}>
                  {typeEmoji(fav.caregiver_type)} {fav.full_name}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Recent Visits */}
        {recentVisits.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Recent Visits</Text>
            {recentVisits.map((visit) => (
              <View key={visit.id} style={styles.recentRow}>
                <Text style={styles.recentDate}>
                  {format(new Date(visit.scheduled_date + 'T00:00:00'), 'MMM d')}
                </Text>
                <Text style={styles.recentName}>{visit.companion_name}</Text>
                {visit.duration_minutes != null && (
                  <Text style={styles.recentDuration}>
                    {(visit.duration_minutes / 60).toFixed(1)}hrs
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing[6],
    paddingBottom: spacing[12],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[4],
  },
  greeting: {
    ...typography.elder.body,
    color: colors.text.secondary,
  },
  name: {
    ...typography.elder.heading,
    color: colors.text.primary,
  },
  sectionContainer: {
    marginTop: spacing[6],
  },
  sectionTitle: {
    ...typography.elder.body,
    fontWeight: '700',
    color: colors.text.primary,
    fontSize: 20,
    marginBottom: spacing[3],
  },
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    gap: spacing[4],
    marginBottom: spacing[2],
  },
  upcomingName: {
    ...typography.elder.body,
    fontWeight: '600',
    color: colors.text.primary,
    fontSize: 20,
  },
  upcomingTime: {
    ...typography.elder.body,
    color: colors.text.secondary,
    fontSize: 16,
    marginTop: 2,
  },
  buttonsContainer: {
    gap: spacing[3],
    marginTop: spacing[6],
  },
  bigButton: {
    height: touchTargets.elder,
    borderRadius: borderRadius['2xl'],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    ...shadows.lg,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  callButton: {
    backgroundColor: colors.success[500],
  },
  activitiesButton: {
    backgroundColor: roleColors.careseeker,
  },
  companionButton: {
    backgroundColor: '#059669',
  },
  checkinButton: {
    backgroundColor: colors.warning[500],
  },
  bigButtonText: {
    ...typography.elder.button,
    color: colors.white,
  },
  nextVisit: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    gap: spacing[4],
    marginTop: spacing[6],
  },
  visitIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: roleColors.caregiver + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  visitInfo: {
    flex: 1,
  },
  visitLabel: {
    ...typography.elder.body,
    color: colors.text.secondary,
    fontSize: 18,
  },
  visitTimeText: {
    ...typography.elder.body,
    color: colors.text.tertiary,
    fontSize: 16,
  },
  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[2],
  },
  favoriteName: {
    ...typography.elder.body,
    color: colors.text.primary,
    fontSize: 18,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[2],
  },
  recentDate: {
    ...typography.styles.label,
    color: colors.text.secondary,
    width: 50,
  },
  recentName: {
    ...typography.elder.body,
    color: colors.text.primary,
    fontSize: 16,
    flex: 1,
  },
  recentDuration: {
    ...typography.styles.label,
    color: colors.text.tertiary,
  },
});
