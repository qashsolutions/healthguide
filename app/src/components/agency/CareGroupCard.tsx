// HealthGuide Care Group Card Component
// Displays care group members with their status on the elder detail screen.
// Used by agency owners to manage the care team.

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, createShadow } from '@/theme/spacing';
import {
  CaregiverIcon,
  FamilyIcon,
  ElderIcon,
  CheckIcon,
  ClockIcon,
} from '@/components/icons';

interface CareGroupMember {
  id: string;
  name: string;
  role: 'caregiver' | 'family_member' | 'elder';
  relationship?: string;
  phone: string;
  invite_status: 'pending' | 'accepted' | 'expired' | 'declined';
}

interface CareGroupCardProps {
  /** Group name (e.g., "John's Care Team") */
  groupName: string;
  /** List of group members */
  members: CareGroupMember[];
  /** Invite code for the group */
  inviteCode: string;
  /** Called when "Share Invite" is pressed */
  onShareInvite: () => void;
  /** Called when "Manage Group" is pressed */
  onManageGroup: () => void;
  /** Called when a specific member is pressed */
  onMemberPress?: (member: CareGroupMember) => void;
}

export function CareGroupCard({
  groupName,
  members,
  inviteCode,
  onShareInvite,
  onManageGroup,
  onMemberPress,
}: CareGroupCardProps) {
  const acceptedCount = members.filter((m) => m.invite_status === 'accepted').length;
  const pendingCount = members.filter((m) => m.invite_status === 'pending').length;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{groupName}</Text>
          <Text style={styles.subtitle}>
            {acceptedCount} joined
            {pendingCount > 0 ? ` · ${pendingCount} pending` : ''}
          </Text>
        </View>
        <Pressable style={styles.manageButton} onPress={onManageGroup}>
          <Text style={styles.manageButtonText}>Manage</Text>
        </Pressable>
      </View>

      {/* Members List */}
      <View style={styles.membersList}>
        {members.map((member) => (
          <Pressable
            key={member.id}
            style={styles.memberRow}
            onPress={() => onMemberPress?.(member)}
            disabled={!onMemberPress}
          >
            <View style={[styles.memberIcon, { backgroundColor: getRoleColor(member.role) + '20' }]}>
              {getRoleIcon(member.role)}
            </View>

            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberRole}>
                {getRoleLabel(member.role)}
                {member.relationship ? ` · ${member.relationship}` : ''}
              </Text>
            </View>

            <View style={[styles.statusBadge, getStatusStyle(member.invite_status)]}>
              {member.invite_status === 'accepted' ? (
                <CheckIcon size={12} color={colors.success[600]} />
              ) : (
                <ClockIcon size={12} color={colors.warning[600]} />
              )}
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      member.invite_status === 'accepted'
                        ? colors.success[600]
                        : colors.warning[600],
                  },
                ]}
              >
                {member.invite_status === 'accepted' ? 'Joined' : 'Pending'}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Share Invite Button */}
      {pendingCount > 0 && (
        <Pressable style={styles.shareButton} onPress={onShareInvite}>
          <Text style={styles.shareButtonText}>Share Invite to Pending Members</Text>
        </Pressable>
      )}
    </View>
  );
}

function getRoleIcon(role: string) {
  const color = getRoleColor(role);
  const size = 20;

  switch (role) {
    case 'caregiver':
      return <CaregiverIcon size={size} color={color} />;
    case 'family_member':
      return <FamilyIcon size={size} color={color} />;
    case 'elder':
      return <ElderIcon size={size} color={color} />;
    default:
      return <FamilyIcon size={size} color={color} />;
  }
}

function getRoleColor(role: string): string {
  switch (role) {
    case 'caregiver':
      return roleColors.caregiver;
    case 'family_member':
      return roleColors.family;
    case 'elder':
      return roleColors.careseeker;
    default:
      return colors.neutral[500];
  }
}

function getRoleLabel(role: string): string {
  switch (role) {
    case 'caregiver':
      return 'Caregiver';
    case 'family_member':
      return 'Family';
    case 'elder':
      return 'Elder';
    default:
      return role;
  }
}

function getStatusStyle(status: string) {
  if (status === 'accepted') {
    return { backgroundColor: colors.success[50] };
  }
  return { backgroundColor: colors.warning[50] };
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing[4],
    ...createShadow(1, 0.06, 4, 2),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  title: {
    ...typography.styles.h3,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  manageButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.primary[50],
    borderRadius: 8,
  },
  manageButtonText: {
    ...typography.styles.caption,
    color: colors.primary[600],
    fontWeight: '600',
  },
  membersList: {
    gap: spacing[2],
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    borderRadius: 10,
  },
  memberIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  memberRole: {
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  shareButton: {
    marginTop: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.primary[500],
    borderRadius: 10,
    alignItems: 'center',
  },
  shareButtonText: {
    ...typography.styles.label,
    color: colors.white,
    fontWeight: '600',
  },
});
