/**
 * Stress Test Data Generators
 * Used by all 07-stress test files for volume, limit, and negative testing.
 */

// ── Caregiver generation ────────────────────────────────────────

const ZIP_POOL = [
  '10001', '90210', '60601', '77001', '85001',
  '30301', '33101', '98101', '02101', '80201',
  '19101', '48201', '55401', '37201', '84101',
  '27601', '73301', '64101', '97201', '89101',
];

const CAPABILITY_COMBOS = [
  ['Companionship', 'Meal Prep'],
  ['Personal Care', 'Medication Reminders'],
  ['Light Housekeeping', 'Transportation'],
  ['Companionship', 'Personal Care', 'Meal Prep'],
  ['Medication Reminders', 'Light Housekeeping', 'Companionship'],
  ['Transportation', 'Companionship', 'Personal Care', 'Meal Prep'],
  ['Meal Prep', 'Light Housekeeping', 'Medication Reminders', 'Transportation'],
  ['Companionship', 'Meal Prep', 'Personal Care', 'Light Housekeeping', 'Medication Reminders', 'Transportation', 'Mobility Assistance', 'Specialized Care'],
];

const AVAILABILITY_PATTERNS = [
  { morning: true, afternoon: true, evening: false },
  { morning: true, afternoon: false, evening: false },
  { morning: false, afternoon: true, evening: true },
  { morning: false, afternoon: false, evening: true },
  { morning: true, afternoon: true, evening: true },
  { morning: false, afternoon: true, evening: false },
];

const FIRST_NAMES = [
  'Maria', 'James', 'Patricia', 'Robert', 'Linda', 'Michael', 'Barbara', 'David',
  'Elizabeth', 'William', 'Jennifer', 'Richard', 'Susan', 'Joseph', 'Sarah', 'Thomas',
  'Karen', 'Charles', 'Lisa', 'Christopher', 'Nancy', 'Daniel', 'Betty', 'Matthew',
  'Dorothy', 'Anthony', 'Sandra', 'Mark', 'Ashley', 'Donald', 'Kimberly', 'Steven',
  'Emily', 'Paul', 'Donna', 'Andrew', 'Michelle', 'Joshua', 'Carol', 'Kenneth',
  'Amanda', 'Kevin', 'Melissa', 'Brian', 'Deborah', 'George', 'Stephanie', 'Timothy',
  'Rebecca', 'Ronald',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts',
];

const CERTIFICATIONS = [
  'CNA', 'HHA', 'LPN', 'RN', 'CPR', 'First Aid',
  'Alzheimer\'s Care', 'Hospice Care',
];

export function generateCaregivers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `caregiver-${i + 1}`,
    full_name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]}`,
    phone: `(555) ${String(100 + i).padStart(3, '0')}-${String(1000 + i).padStart(4, '0')}`,
    status: (['active', 'active', 'active', 'inactive', 'pending'] as const)[i % 5],
    is_licensed: i % 3 === 0,
    avatar_url: null,
    active_visits: i % 4,
    today_visits: (i % 3) + 1,
  }));
}

export function generateCaregiverProfiles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `profile-${i + 1}`,
    profile_id: `profile-${i + 1}`,
    first_name: FIRST_NAMES[i % FIRST_NAMES.length],
    last_name: LAST_NAMES[i % LAST_NAMES.length],
    photo_url: null,
    zip_code: ZIP_POOL[i % ZIP_POOL.length],
    hourly_rate: i % 7 === 0 ? null : 15 + (i % 30),
    npi_verified: i % 4 === 0,
    capabilities: CAPABILITY_COMBOS[i % CAPABILITY_COMBOS.length],
    rating_count: i * 3,
    positive_count: i * 2,
    availability: AVAILABILITY_PATTERNS[i % AVAILABILITY_PATTERNS.length],
    certifications: [CERTIFICATIONS[i % CERTIFICATIONS.length]],
    npi_number: i % 4 === 0 ? `${1234567890 + i}` : null,
  }));
}

// ── Elder generation ────────────────────────────────────────────

const US_CITIES = [
  { city: 'New York', state: 'NY', zip: '10001' },
  { city: 'Los Angeles', state: 'CA', zip: '90001' },
  { city: 'Chicago', state: 'IL', zip: '60601' },
  { city: 'Houston', state: 'TX', zip: '77001' },
  { city: 'Phoenix', state: 'AZ', zip: '85001' },
  { city: 'Philadelphia', state: 'PA', zip: '19101' },
  { city: 'San Antonio', state: 'TX', zip: '78201' },
  { city: 'San Diego', state: 'CA', zip: '92101' },
  { city: 'Dallas', state: 'TX', zip: '75201' },
  { city: 'San Jose', state: 'CA', zip: '95101' },
  { city: 'Austin', state: 'TX', zip: '73301' },
  { city: 'Jacksonville', state: 'FL', zip: '32099' },
  { city: 'Columbus', state: 'OH', zip: '43085' },
  { city: 'Charlotte', state: 'NC', zip: '28201' },
  { city: 'Indianapolis', state: 'IN', zip: '46201' },
];

const ELDER_FIRST_NAMES = [
  'Margaret', 'Dorothy', 'Helen', 'Ruth', 'Virginia',
  'Evelyn', 'Frances', 'Mildred', 'Gladys', 'Edith',
  'Clarence', 'Harold', 'Earl', 'Walter', 'Herbert',
];

export function generateElders(count: number, agencyId = 'agency-1') {
  return Array.from({ length: count }, (_, i) => {
    const location = US_CITIES[i % US_CITIES.length];
    const firstName = ELDER_FIRST_NAMES[i % ELDER_FIRST_NAMES.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    return {
      id: `elder-${i + 1}`,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      phone: `(555) ${String(200 + i).padStart(3, '0')}-${String(2000 + i).padStart(4, '0')}`,
      address_line1: `${100 + i} Main St`,
      city: location.city,
      state: location.state,
      zip_code: location.zip,
      status: i % 5 === 0 ? 'pending_handshake' : 'active',
      handshake_completed: i % 5 !== 0,
      agency_id: agencyId,
      care_needs: ['companionship', 'meal_prep', 'personal_care'].slice(0, (i % 3) + 1),
      gender_preference: 'no_preference',
      family_contacts_count: (i % 4),
      is_active: true,
    };
  });
}

// ── Emergency contacts ──────────────────────────────────────────

const RELATIONSHIPS = ['Spouse', 'Child', 'Grandchild', 'Sibling', 'Parent', 'Friend', 'Other'];

export function generateEmergencyContacts(elders: ReturnType<typeof generateElders>) {
  const contacts: any[] = [];
  elders.forEach((elder, eIdx) => {
    for (let c = 0; c < 3; c++) {
      contacts.push({
        id: `ec-${eIdx}-${c}`,
        elder_id: elder.id,
        name: `${FIRST_NAMES[(eIdx * 3 + c) % FIRST_NAMES.length]} ${LAST_NAMES[(eIdx * 3 + c + 10) % LAST_NAMES.length]}`,
        phone: `(555) ${String(300 + eIdx * 3 + c).padStart(3, '0')}-0000`,
        relationship: RELATIONSHIPS[c % RELATIONSHIPS.length],
        is_primary: c === 0,
      });
    }
  });
  return contacts;
}

// ── Care groups ─────────────────────────────────────────────────

export function generateCareGroups(elders: ReturnType<typeof generateElders>) {
  return elders.map((elder, i) => ({
    id: `group-${i + 1}`,
    elder_id: elder.id,
    agency_id: elder.agency_id,
    invite_code: `INV-${String(i + 1).padStart(4, '0')}`,
    is_active: true,
    created_at: new Date(2026, 0, 1 + i).toISOString(),
  }));
}

export function generateCareGroupMembers(groups: ReturnType<typeof generateCareGroups>) {
  const members: any[] = [];
  groups.forEach((group, gIdx) => {
    // 1 caregiver
    members.push({
      id: `gm-${gIdx}-cg`,
      care_group_id: group.id,
      user_id: `user-cg-${gIdx}`,
      role: 'caregiver',
      full_name: `${FIRST_NAMES[gIdx % FIRST_NAMES.length]} ${LAST_NAMES[gIdx % LAST_NAMES.length]}`,
      phone: `(555) 400-${String(gIdx).padStart(4, '0')}`,
      consent_status: 'accepted',
      is_active: true,
    });
    // 3 family members
    for (let f = 0; f < 3; f++) {
      members.push({
        id: `gm-${gIdx}-fm-${f}`,
        care_group_id: group.id,
        user_id: `user-fm-${gIdx}-${f}`,
        role: 'family_member',
        full_name: `${FIRST_NAMES[(gIdx * 3 + f + 20) % FIRST_NAMES.length]} ${LAST_NAMES[(gIdx * 3 + f + 20) % LAST_NAMES.length]}`,
        phone: `(555) 500-${String(gIdx * 10 + f).padStart(4, '0')}`,
        relationship: RELATIONSHIPS[f % RELATIONSHIPS.length],
        consent_status: 'accepted',
        is_active: true,
      });
    }
    // 1 elder
    members.push({
      id: `gm-${gIdx}-elder`,
      care_group_id: group.id,
      user_id: null,
      role: 'elder',
      full_name: `Elder ${gIdx + 1}`,
      phone: null,
      consent_status: 'accepted',
      is_active: true,
    });
  });
  return members;
}

// ── Visits ──────────────────────────────────────────────────────

const VISIT_STATUSES = [
  'scheduled', 'scheduled', 'scheduled', 'scheduled',   // 40%
  'in_progress', 'in_progress',                          // 20%
  'completed', 'completed', 'completed',                 // 30%
  'missed',                                               // 5% (approximated)
  'cancelled',                                            // 5% (approximated)
] as const;

export function generateVisits(
  count: number,
  elders: ReturnType<typeof generateElders>,
  caregiverIds: string[]
) {
  const today = new Date().toISOString().split('T')[0];
  return Array.from({ length: count }, (_, i) => {
    const elder = elders[i % elders.length];
    const status = VISIT_STATUSES[i % VISIT_STATUSES.length];
    const hour = 8 + (i % 10);
    return {
      id: `visit-${i + 1}`,
      elder_id: elder.id,
      caregiver_id: caregiverIds[i % caregiverIds.length],
      agency_id: elder.agency_id,
      scheduled_date: today,
      scheduled_start: `${String(hour).padStart(2, '0')}:00`,
      scheduled_end: `${String(hour + 1).padStart(2, '0')}:00`,
      status,
      actual_start: status === 'in_progress' || status === 'completed'
        ? `${today}T${String(hour).padStart(2, '0')}:05:00`
        : null,
      actual_end: status === 'completed'
        ? `${today}T${String(hour + 1).padStart(2, '0')}:00:00`
        : null,
      tasks_completed: status === 'completed' ? 3 : (status === 'in_progress' ? 1 : 0),
      tasks_total: 3,
      elder: {
        first_name: elder.first_name,
        last_name: elder.last_name,
        address_line1: elder.address_line1,
        city: elder.city,
        state: elder.state,
      },
      caregiver: {
        full_name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]}`,
        user: {
          first_name: FIRST_NAMES[i % FIRST_NAMES.length],
          last_name: LAST_NAMES[i % LAST_NAMES.length],
        },
      },
    };
  });
}

// ── Negative / boundary test data ───────────────────────────────

export const INVALID_PHONES = [
  '123',                    // too short
  'abcdefghij',            // letters
  '',                       // empty
  '+1555!@#$%^&',          // special chars
  '12345',                 // 5 digits only
  '(555) 123',             // partial
  '00000000000000000',     // too long
];

export const INVALID_ZIPS = [
  '1234',                  // 4 digits
  '123456',                // 6 digits
  'ABCDE',                 // letters
  '',                       // empty
  '!@#$%',                 // special chars
  '12 34',                 // spaces
];

export const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '"><img src=x onerror=alert(1)>',
  '<svg onload=alert(1)>',
  "javascript:alert('xss')",
];

export const SQL_INJECTION_PAYLOADS = [
  "'; DROP TABLE elders; --",
  "1' OR '1'='1",
  "admin'--",
  "'; DELETE FROM users WHERE '1'='1",
];

export const EXTREMELY_LONG_TEXT = 'A'.repeat(10000);

// ── Notification test data ──────────────────────────────────────

export const NOTIFICATION_TYPES = [
  'check_in',
  'check_out',
  'daily_report',
  'delivery_time',
  'include_observations',
  'caregiver_arrival',
  'visit_completed',
];

// ── Activity records ────────────────────────────────────────────

export function generateActivityRecords(count: number) {
  const types = ['check_in', 'check_out', 'task_completed', 'observation', 'medication_given'];
  return Array.from({ length: count }, (_, i) => ({
    id: `activity-${i + 1}`,
    type: types[i % types.length],
    description: `Activity ${i + 1}: ${types[i % types.length]}`,
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    caregiver_name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]}`,
    elder_name: `${ELDER_FIRST_NAMES[i % ELDER_FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]}`,
  }));
}

// ── Video contacts ──────────────────────────────────────────────

export function generateVideoContacts(count: number, elderId = 'elder-1') {
  return Array.from({ length: count }, (_, i) => ({
    id: `vc-${i + 1}`,
    elder_id: elderId,
    name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]}`,
    relationship: RELATIONSHIPS[i % RELATIONSHIPS.length],
    video_call_link: `https://zoom.us/j/${1000000 + i}`,
    is_favorite: i === 0,
    created_at: new Date(2026, 0, 1 + i).toISOString(),
  }));
}
