// HealthGuide Dashboard Alerts List
// Shows actionable alerts requiring attention

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

interface Alert {
  id: string;
  type: 'missed_visit' | 'late_checkin' | 'pending_handshake' | 'expiring_license' | 'unassigned_visit';
  title: string;
  description: string;
  link?: string;
  priority: 'high' | 'medium' | 'low';
}

interface Props {
  alerts: Alert[];
}

function AlertIcon({ size = 20, color = '#F59E0B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ClockIcon({ size = 20, color = '#F59E0B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 6v6l4 2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function UserCheckIcon({ size = 20, color = '#F59E0B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17 11l2 2 4-4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function FileIcon({ size = 20, color = '#F59E0B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CalendarIcon({ size = 20, color = '#F59E0B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function getAlertIcon(type: Alert['type']) {
  switch (type) {
    case 'missed_visit':
      return AlertIcon;
    case 'late_checkin':
      return ClockIcon;
    case 'pending_handshake':
      return UserCheckIcon;
    case 'expiring_license':
      return FileIcon;
    case 'unassigned_visit':
      return CalendarIcon;
    default:
      return AlertIcon;
  }
}

export function AlertsList({ alerts }: Props) {
  if (alerts.length === 0) return null;

  const highPriority = alerts.filter((a) => a.priority === 'high');
  const otherAlerts = alerts.filter((a) => a.priority !== 'high');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Alerts {alerts.length > 0 && `(${alerts.length})`}
      </Text>

      {highPriority.map((alert) => {
        const IconComponent = getAlertIcon(alert.type);
        return (
          <Pressable
            key={alert.id}
            style={[styles.alert, styles.alertHigh]}
            onPress={() => alert.link && router.push(alert.link as any)}
          >
            <IconComponent size={20} color="#DC2626" />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertDescription}>{alert.description}</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </Pressable>
        );
      })}

      {otherAlerts.map((alert) => {
        const IconComponent = getAlertIcon(alert.type);
        return (
          <Pressable
            key={alert.id}
            style={styles.alert}
            onPress={() => alert.link && router.push(alert.link as any)}
          >
            <IconComponent size={20} color="#F59E0B" />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertDescription}>{alert.description}</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  alertHigh: {
    backgroundColor: '#FEE2E2',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  alertDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  arrow: {
    fontSize: 16,
    color: '#9CA3AF',
  },
});
