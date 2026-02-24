/**
 * 08-Companionship: Tasks Constants Tests
 * Tests for @/constants/tasks — ALLOWED_TASKS, TASK_DB_NAMES, SCOPE_ALERT_TEXT, etc.
 */

import {
  ALLOWED_TASKS,
  TASK_DB_NAMES,
  TASK_CATEGORIES,
  SCOPE_ALERT_TEXT,
  CAPABILITIES_MAP,
  ALLOWED_CATEGORY_LABELS,
} from '@/constants/tasks';

describe('08-Companionship: Tasks Constants', () => {
  // ── ALLOWED_TASKS ──────────────────────────────────────────────────────────

  it('ALLOWED_TASKS has exactly 3 items', () => {
    expect(ALLOWED_TASKS).toHaveLength(3);
  });

  it('ALLOWED_TASKS contains companionship task', () => {
    const ids = ALLOWED_TASKS.map((t) => t.id);
    expect(ids).toContain('companionship');
  });

  it('ALLOWED_TASKS contains light_cleaning task', () => {
    const ids = ALLOWED_TASKS.map((t) => t.id);
    expect(ids).toContain('light_cleaning');
  });

  it('ALLOWED_TASKS contains groceries task', () => {
    const ids = ALLOWED_TASKS.map((t) => t.id);
    expect(ids).toContain('groceries');
  });

  it('companionship task has label "Companionship"', () => {
    const task = ALLOWED_TASKS.find((t) => t.id === 'companionship');
    expect(task?.label).toBe('Companionship');
  });

  it('light_cleaning task has label "Light Cleaning"', () => {
    const task = ALLOWED_TASKS.find((t) => t.id === 'light_cleaning');
    expect(task?.label).toBe('Light Cleaning');
  });

  it('groceries task has label "Groceries & Errands"', () => {
    const task = ALLOWED_TASKS.find((t) => t.id === 'groceries');
    expect(task?.label).toBe('Groceries & Errands');
  });

  it('every task has id, label, icon, description', () => {
    ALLOWED_TASKS.forEach((task) => {
      expect(task.id).toBeTruthy();
      expect(task.label).toBeTruthy();
      expect(task.icon).toBeTruthy();
      expect(task.description).toBeTruthy();
    });
  });

  // ── NEGATIVE: Medical tasks NOT present ────────────────────────────────────

  it('NEGATIVE: ALLOWED_TASKS does not include "medication"', () => {
    const ids = ALLOWED_TASKS.map((t) => t.id as string);
    expect(ids).not.toContain('medication');
  });

  it('NEGATIVE: ALLOWED_TASKS does not include "bathing"', () => {
    const ids = ALLOWED_TASKS.map((t) => t.id as string);
    expect(ids).not.toContain('bathing');
  });

  it('NEGATIVE: ALLOWED_TASKS does not include "wound_care"', () => {
    const ids = ALLOWED_TASKS.map((t) => t.id as string);
    expect(ids).not.toContain('wound_care');
  });

  it('NEGATIVE: ALLOWED_TASKS does not include "transportation"', () => {
    const ids = ALLOWED_TASKS.map((t) => t.id as string);
    expect(ids).not.toContain('transportation');
  });

  it('NEGATIVE: ALLOWED_TASKS does not include "meal_preparation"', () => {
    const ids = ALLOWED_TASKS.map((t) => t.id as string);
    expect(ids).not.toContain('meal_preparation');
  });

  // ── TASK_DB_NAMES ──────────────────────────────────────────────────────────

  it('TASK_DB_NAMES maps companionship to "Companionship"', () => {
    expect(TASK_DB_NAMES.companionship).toBe('Companionship');
  });

  it('TASK_DB_NAMES maps light_cleaning to "Light Cleaning"', () => {
    expect(TASK_DB_NAMES.light_cleaning).toBe('Light Cleaning');
  });

  it('TASK_DB_NAMES maps groceries to "Groceries & Errands"', () => {
    expect(TASK_DB_NAMES.groceries).toBe('Groceries & Errands');
  });

  // ── TASK_CATEGORIES ────────────────────────────────────────────────────────

  it('TASK_CATEGORIES maps companionship to "companionship"', () => {
    expect(TASK_CATEGORIES.companionship).toBe('companionship');
  });

  it('TASK_CATEGORIES maps light_cleaning to "housekeeping"', () => {
    expect(TASK_CATEGORIES.light_cleaning).toBe('housekeeping');
  });

  it('TASK_CATEGORIES maps groceries to "errands"', () => {
    expect(TASK_CATEGORIES.groceries).toBe('errands');
  });

  // ── SCOPE_ALERT_TEXT ────────────────────────────────────────────────────────

  it('SCOPE_ALERT_TEXT is a non-empty string', () => {
    expect(typeof SCOPE_ALERT_TEXT).toBe('string');
    expect(SCOPE_ALERT_TEXT.length).toBeGreaterThan(0);
  });

  it('SCOPE_ALERT_TEXT mentions "Toileting or bathing"', () => {
    expect(SCOPE_ALERT_TEXT).toMatch(/[Tt]oileting/);
  });

  it('SCOPE_ALERT_TEXT mentions "Medication"', () => {
    expect(SCOPE_ALERT_TEXT).toMatch(/[Mm]edication/);
  });

  it('SCOPE_ALERT_TEXT mentions medical restrictions', () => {
    expect(SCOPE_ALERT_TEXT).toMatch(/medical/i);
  });

  // ── CAPABILITIES_MAP ────────────────────────────────────────────────────────

  it('CAPABILITIES_MAP maps "companionship" to companionship', () => {
    expect(CAPABILITIES_MAP['companionship']).toBe('companionship');
  });

  it('CAPABILITIES_MAP maps legacy "light_housekeeping" to light_cleaning', () => {
    expect(CAPABILITIES_MAP['light_housekeeping']).toBe('light_cleaning');
  });

  it('CAPABILITIES_MAP maps "errands" to groceries', () => {
    expect(CAPABILITIES_MAP['errands']).toBe('groceries');
  });

  // ── ALLOWED_CATEGORY_LABELS ────────────────────────────────────────────────

  it('ALLOWED_CATEGORY_LABELS has entries for companionship, housekeeping, errands', () => {
    expect(ALLOWED_CATEGORY_LABELS['companionship']).toBeTruthy();
    expect(ALLOWED_CATEGORY_LABELS['housekeeping']).toBeTruthy();
    expect(ALLOWED_CATEGORY_LABELS['errands']).toBeTruthy();
  });
});
