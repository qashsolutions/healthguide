// HealthGuide Assignment Modal
// For assigning caregivers to elders on a time slot

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import Svg, { Path } from 'react-native-svg';

interface TimeSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
}

interface Caregiver {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  is_available: boolean;
}

interface Elder {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  address: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  slot: TimeSlot;
  onAssign: () => void;
}

function CloseIcon({ size = 24, color = '#6B7280' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6 6 18M6 6l12 12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckIcon({ size = 20, color = '#10B981' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m20 6-11 11-5-5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function AssignmentModal({ visible, onClose, slot, onAssign }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<'elder' | 'caregiver'>('elder');
  const [elders, setElders] = useState<Elder[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [selectedElder, setSelectedElder] = useState<string | null>(null);
  const [selectedCaregiver, setSelectedCaregiver] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  useEffect(() => {
    if (visible) {
      fetchElders();
      fetchCaregivers();
    }
  }, [visible]);

  async function fetchElders() {
    setFetchingData(true);
    const { data, error } = await supabase
      .from('elders')
      .select('id, first_name, last_name, avatar_url, address')
      .eq('agency_id', user?.user_metadata?.agency_id)
      .eq('is_active', true)
      .order('first_name');

    if (data) setElders(data);
    setFetchingData(false);
  }

  async function fetchCaregivers() {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, avatar_url')
      .eq('agency_id', user?.user_metadata?.agency_id)
      .eq('role', 'caregiver')
      .eq('is_active', true)
      .order('first_name');

    if (data) {
      // Check availability for this slot
      const caregiverList = data.map((cg) => ({
        ...cg,
        is_available: true, // Would check actual availability here
      }));
      setCaregivers(caregiverList);
    }
  }

  async function handleAssign() {
    if (!selectedElder || !selectedCaregiver) return;

    setLoading(true);

    try {
      // Update time slot with assignment
      const { error: slotError } = await supabase
        .from('time_slots')
        .update({
          elder_id: selectedElder,
          caregiver_id: selectedCaregiver,
          status: 'assigned',
        })
        .eq('id', slot.id);

      if (slotError) throw slotError;

      // Create visit record
      const { error: visitError } = await supabase.from('visits').insert({
        agency_id: user?.user_metadata?.agency_id,
        elder_id: selectedElder,
        caregiver_id: selectedCaregiver,
        scheduled_date: slot.date,
        scheduled_start: `${slot.date}T${slot.start_time}`,
        scheduled_end: `${slot.date}T${slot.end_time}`,
        status: 'scheduled',
      });

      if (visitError) throw visitError;

      onAssign();
      handleClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not create assignment');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setStep('elder');
    setSelectedElder(null);
    setSelectedCaregiver(null);
    onClose();
  }

  function renderElderItem({ item }: { item: Elder }) {
    const isSelected = selectedElder === item.id;

    return (
      <Pressable
        style={[styles.listItem, isSelected && styles.listItemSelected]}
        onPress={() => setSelectedElder(item.id)}
      >
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>
              {item.first_name[0]}
              {item.last_name[0]}
            </Text>
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>
            {item.first_name} {item.last_name}
          </Text>
          <Text style={styles.itemDetail} numberOfLines={1}>
            {item.address}
          </Text>
        </View>
        {isSelected && <CheckIcon />}
      </Pressable>
    );
  }

  function renderCaregiverItem({ item }: { item: Caregiver }) {
    const isSelected = selectedCaregiver === item.id;

    return (
      <Pressable
        style={[
          styles.listItem,
          isSelected && styles.listItemSelected,
          !item.is_available && styles.listItemDisabled,
        ]}
        onPress={() => item.is_available && setSelectedCaregiver(item.id)}
        disabled={!item.is_available}
      >
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>
              {item.first_name[0]}
              {item.last_name[0]}
            </Text>
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>
            {item.first_name} {item.last_name}
          </Text>
          <Text
            style={[
              styles.itemDetail,
              !item.is_available && styles.unavailableText,
            ]}
          >
            {item.is_available ? 'Available' : 'Not available'}
          </Text>
        </View>
        {isSelected && <CheckIcon />}
      </Pressable>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {step === 'elder' ? 'Select Elder' : 'Select Caregiver'}
          </Text>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <CloseIcon />
          </Pressable>
        </View>

        {/* Step Indicator */}
        <View style={styles.steps}>
          <View
            style={[styles.step, step === 'elder' ? styles.stepActive : styles.stepCompleted]}
          >
            <Text style={styles.stepText}>1. Elder</Text>
          </View>
          <View style={styles.stepDivider} />
          <View style={[styles.step, step === 'caregiver' && styles.stepActive]}>
            <Text style={styles.stepText}>2. Caregiver</Text>
          </View>
        </View>

        {/* List */}
        {step === 'elder' ? (
          <FlatList
            data={elders}
            keyExtractor={(item) => item.id}
            renderItem={renderElderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No elders found</Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={caregivers}
            keyExtractor={(item) => item.id}
            renderItem={renderCaregiverItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No caregivers found</Text>
              </View>
            }
          />
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {step === 'elder' ? (
            <Button
              title="Next: Select Caregiver"
              onPress={() => setStep('caregiver')}
              disabled={!selectedElder}
              style={styles.actionButton}
            />
          ) : (
            <View style={styles.actionRow}>
              <Button
                title="Back"
                variant="outline"
                onPress={() => setStep('elder')}
                style={styles.backButton}
              />
              <Button
                title="Assign Visit"
                onPress={handleAssign}
                loading={loading}
                disabled={!selectedCaregiver}
                style={styles.actionButton}
              />
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 8,
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  step: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  stepActive: {
    backgroundColor: '#3B82F6',
  },
  stepCompleted: {
    backgroundColor: '#D1FAE5',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  stepDivider: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
  },
  list: {
    padding: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  listItemSelected: {
    backgroundColor: '#DBEAFE',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  listItemDisabled: {
    opacity: 0.5,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  itemDetail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  unavailableText: {
    color: '#EF4444',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  actions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 0.4,
  },
  actionButton: {
    flex: 1,
  },
});
