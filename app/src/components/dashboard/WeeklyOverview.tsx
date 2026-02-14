// HealthGuide Weekly Overview Grid
// Shows caregiver-to-elder assignments in a grid layout

import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { format, startOfWeek, addDays } from 'date-fns';

interface Assignment {
  id: string;
  caregiver_id: string;
  caregiver_name: string;
  elder_id: string;
  elder_name: string;
  date: string;
}

interface Props {
  assignments: Assignment[];
  viewMode: 'weekly' | 'monthly';
}

// Color palette for elders
const ELDER_COLORS = [
  '#DBEAFE', // blue
  '#D1FAE5', // green
  '#FEF3C7', // yellow
  '#FCE7F3', // pink
  '#E0E7FF', // indigo
  '#FED7AA', // orange
  '#D5F5F6', // cyan
  '#DDD6FE', // violet
];

function getColorForElder(elderId: string): string {
  const hash = elderId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ELDER_COLORS[hash % ELDER_COLORS.length];
}

interface GridData {
  [caregiverId: string]: {
    name: string;
    days: {
      [date: string]: Array<{
        elderId: string;
        elderName: string;
        color: string;
      }>;
    };
  };
}

function buildAssignmentGrid(assignments: Assignment[], days: Date[]): GridData {
  const grid: GridData = {};

  assignments.forEach((assignment) => {
    if (!grid[assignment.caregiver_id]) {
      grid[assignment.caregiver_id] = {
        name: assignment.caregiver_name,
        days: {},
      };
    }

    const dateStr = format(new Date(assignment.date), 'yyyy-MM-dd');
    if (!grid[assignment.caregiver_id].days[dateStr]) {
      grid[assignment.caregiver_id].days[dateStr] = [];
    }

    grid[assignment.caregiver_id].days[dateStr].push({
      elderId: assignment.elder_id,
      elderName: assignment.elder_name,
      color: getColorForElder(assignment.elder_id),
    });
  });

  return grid;
}

export function WeeklyOverview({ assignments, viewMode }: Props) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday start
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const grid = buildAssignmentGrid(assignments, days);
  const caregiverIds = Object.keys(grid);

  if (caregiverIds.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          {viewMode === 'weekly' ? 'This Week' : 'This Month'}
        </Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No assignments this period</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {viewMode === 'weekly' ? 'This Week' : 'This Month'}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.grid}>
          {/* Header row - days */}
          <View style={styles.row}>
            <View style={styles.caregiverCell}>
              <Text style={styles.caregiverHeader}>Caregiver</Text>
            </View>
            {days.map((day) => (
              <View key={day.toISOString()} style={styles.dayCell}>
                <Text style={styles.dayName}>{format(day, 'EEE')}</Text>
                <Text style={styles.dayNumber}>{format(day, 'd')}</Text>
              </View>
            ))}
          </View>

          {/* Caregiver rows */}
          {caregiverIds.map((caregiverId) => {
            const caregiverData = grid[caregiverId];
            return (
              <View key={caregiverId} style={styles.row}>
                <View style={styles.caregiverCell}>
                  <Text style={styles.caregiverName} numberOfLines={1}>
                    {caregiverData.name}
                  </Text>
                </View>
                {days.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayAssignments = caregiverData.days[dateStr] || [];

                  return (
                    <View key={day.toISOString()} style={styles.assignmentCell}>
                      {dayAssignments.map((assignment, i) => (
                        <View
                          key={`${assignment.elderId}-${i}`}
                          style={[
                            styles.assignmentBadge,
                            { backgroundColor: assignment.color },
                          ]}
                        >
                          <Text style={styles.assignmentText} numberOfLines={1}>
                            {assignment.elderName.split(' ')[0]}
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  grid: {
    minWidth: '100%',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E4E4E7',
  },
  caregiverCell: {
    width: 100,
    padding: 8,
    justifyContent: 'center',
  },
  caregiverHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  caregiverName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  dayCell: {
    width: 72,
    padding: 8,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderLeftWidth: 1,
    borderLeftColor: '#E4E4E7',
  },
  dayName: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  assignmentCell: {
    width: 72,
    minHeight: 56,
    padding: 4,
    gap: 2,
    borderLeftWidth: 1,
    borderLeftColor: '#E4E4E7',
  },
  assignmentBadge: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  assignmentText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#374151',
  },
});
