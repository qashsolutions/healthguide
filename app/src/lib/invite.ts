// HealthGuide Invite Utilities
// Handles invite code generation, deep link building, and native share sheet.
// No Twilio dependency — invites are shared via OS native share sheet or QR code.

import { Share, Platform } from 'react-native';
import { supabase } from './supabase';

const APP_SCHEME = 'healthguide';
const APP_DOWNLOAD_URL = 'https://healthguide.app/download';

// ============================================================================
// Deep Link Helpers
// ============================================================================

/**
 * Build a deep link URL for joining a care group.
 * Format: healthguide://join/{invite_code}
 */
export function buildDeepLink(inviteCode: string): string {
  return `${APP_SCHEME}://join/${inviteCode}`;
}

/**
 * Build a universal link URL (for web fallback).
 * Format: https://healthguide.app/join/{invite_code}
 */
export function buildUniversalLink(inviteCode: string): string {
  return `https://healthguide.app/join/${inviteCode}`;
}

/**
 * Parse an invite code from a deep link URL.
 * Handles both scheme links (healthguide://join/CODE) and
 * universal links (https://healthguide.app/join/CODE).
 */
export function parseInviteCode(url: string): string | null {
  try {
    // Match healthguide://join/{code}
    const schemeMatch = url.match(/healthguide:\/\/join\/([A-Z0-9]+)/i);
    if (schemeMatch) return schemeMatch[1].toUpperCase();

    // Match https://healthguide.app/join/{code}
    const webMatch = url.match(/healthguide\.app\/join\/([A-Z0-9]+)/i);
    if (webMatch) return webMatch[1].toUpperCase();

    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// Share Sheet
// ============================================================================

interface ShareInviteParams {
  elderName: string;
  agencyName?: string;
  inviteCode: string;
  memberName?: string;
  role?: string;
}

/**
 * Open the native OS share sheet with the invite message.
 * Works on iOS (Share Sheet) and Android (Share Intent).
 * Supports sharing via SMS, WhatsApp, email, iMessage, etc.
 */
export async function shareInvite(params: ShareInviteParams): Promise<boolean> {
  const { elderName, agencyName, inviteCode, memberName, role } = params;

  const greeting = memberName ? `Hi ${memberName}! ` : '';
  const roleText = role === 'caregiver'
    ? 'as the assigned caregiver'
    : role === 'elder'
    ? 'to view your own care updates'
    : 'to receive care updates';

  const message =
    `${greeting}You've been invited to join ${elderName}'s care team on HealthGuide` +
    (agencyName ? ` by ${agencyName}` : '') +
    ` ${roleText}.\n\n` +
    `1. Download the app: ${APP_DOWNLOAD_URL}\n` +
    `2. Open the app and tap "I have an invite"\n` +
    `3. Enter code: ${inviteCode}\n\n` +
    `This invitation expires in 7 days.`;

  try {
    const result = await Share.share(
      Platform.OS === 'ios'
        ? { message }
        : { message, title: `Join ${elderName}'s Care Team on HealthGuide` }
    );

    return result.action === Share.sharedAction;
  } catch (error) {
    console.error('Share failed:', error);
    return false;
  }
}

/**
 * Share invite to a specific member (generates a personalized message).
 */
export async function shareInviteToMember(
  careGroupId: string,
  memberId: string
): Promise<boolean> {
  // Fetch group + member details
  const { data: member } = await supabase
    .from('care_group_members')
    .select(`
      name,
      role,
      care_group:care_groups (
        invite_code,
        elder:elders (first_name, last_name),
        agency:agencies (name)
      )
    `)
    .eq('id', memberId)
    .single();

  if (!member || !member.care_group) return false;

  const group = Array.isArray(member.care_group)
    ? member.care_group[0]
    : member.care_group;
  const elder = Array.isArray(group.elder) ? group.elder[0] : group.elder;
  const agency = Array.isArray(group.agency) ? group.agency[0] : group.agency;

  return shareInvite({
    elderName: elder ? `${elder.first_name} ${elder.last_name}` : 'your loved one',
    agencyName: agency?.name,
    inviteCode: group.invite_code,
    memberName: member.name,
    role: member.role,
  });
}

// ============================================================================
// Invite Code Helpers
// ============================================================================

/**
 * Generate an 8-character invite code (client-side fallback).
 * Excludes ambiguous characters: 0, O, I, L, 1.
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Format an invite code for display (e.g., "ABCD-1234").
 */
export function formatInviteCode(code: string): string {
  if (code.length !== 8) return code;
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * Clean an invite code input (strip dashes, spaces, uppercase).
 */
export function cleanInviteCode(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}

// ============================================================================
// Care Group API Helpers
// ============================================================================

interface CreateGroupParams {
  elderId: string;
  createdBy: string;
  members: {
    name: string;
    phone: string;
    role: 'caregiver' | 'family_member' | 'elder';
    relationship?: string;
  }[];
}

/**
 * Create a care group via edge function.
 */
export async function createCareGroup(params: CreateGroupParams) {
  const { data, error } = await supabase.functions.invoke('create-care-group', {
    body: {
      elder_id: params.elderId,
      created_by: params.createdBy,
      members: params.members,
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Validate an invite code via edge function.
 */
export async function validateInviteCode(code: string, phone?: string) {
  const { data, error } = await supabase.functions.invoke('join-care-group?action=validate', {
    body: { invite_code: cleanInviteCode(code), phone },
  });

  if (error) throw error;
  return data;
}

/**
 * Join a care group via edge function (after OTP verification).
 */
export async function joinCareGroup(inviteCode: string, userId: string, phone: string) {
  const { data, error } = await supabase.functions.invoke('join-care-group', {
    body: {
      invite_code: cleanInviteCode(inviteCode),
      user_id: userId,
      phone,
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Refresh (regenerate) the invite code for a care group.
 * Extends expiration by 7 days.
 */
export async function refreshInviteCode(careGroupId: string) {
  const newCode = generateInviteCode();
  const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('care_groups')
    .update({
      invite_code: newCode,
      invite_expires_at: newExpiry,
      qr_code_data: buildDeepLink(newCode),
    })
    .eq('id', careGroupId)
    .select('invite_code, invite_expires_at, qr_code_data')
    .single();

  if (error) throw error;
  return data;
}
