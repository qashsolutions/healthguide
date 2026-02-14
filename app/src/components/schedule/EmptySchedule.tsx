// HealthGuide Empty Schedule Component
// Shows when caregiver has no assignments for the day

import { View, Text, StyleSheet } from 'react-native';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import Svg, { Path, Rect } from 'react-native-svg';

interface Props {
  date: Date;
}

function CalendarIcon({ size = 64, color = '#D1D5DB' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        stroke={color}
        strokeWidth={1.5}
      />
      <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

export function EmptySchedule({ date }: Props) {
  const getMessage = () => {
    if (isToday(date)) {
      return "No visits scheduled for today";
    } else if (isTomorrow(date)) {
      return "No visits scheduled for tomorrow";
    } else if (isPast(date)) {
      return `No visits were scheduled for ${format(date, 'EEEE')}`;
    } else {
      return `No visits scheduled for ${format(date, 'EEEE')}`;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <CalendarIcon />
      </View>
      <Text style={styles.message}>{getMessage()}</Text>
      <Text style={styles.subMessage}>
        Pull down to refresh or select another day
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  subMessage: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
