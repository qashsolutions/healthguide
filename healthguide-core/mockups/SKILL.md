---
name: healthguide-core-mockups
description: Flagship SVG mockups for all HealthGuide user roles. Professional screen designs showing Agency Dashboard, Caregiver Task UI, Elder Home Screen, and Volunteer Matching. Reference these mockups when building screens. Use when designing new screens, reviewing UI consistency, or understanding role-specific interfaces.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: core
  tags: [mockups, svg, design, screens, ui-reference]
---

# HealthGuide Screen Mockups

## Overview
Professional SVG mockups for each user role. These serve as the visual reference for implementing screens and ensuring consistency across the app.

## Design Specifications

| Role | Primary Color | Touch Target | Font Base | Complexity |
|------|--------------|--------------|-----------|------------|
| Agency Owner | `#7C3AED` Purple | 48px | 16px | High (data-dense) |
| Caregiver | `#3B82F6` Blue | 72px | 18px | Low (icon-focused) |
| Elder | `#10B981` Green | 96px | 24px | Minimal |
| Volunteer | `#F59E0B` Amber | 56px | 16px | Medium |
| Family | `#EC4899` Pink | 48px | 16px | Medium (web portal) |

---

## Mockup 1: Agency Owner Dashboard

```svg
<svg width="375" height="812" viewBox="0 0 375 812" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Status Bar -->
  <rect width="375" height="44" fill="#7C3AED"/>
  <text x="187" y="28" font-family="Inter" font-size="14" font-weight="600" fill="white" text-anchor="middle">9:41</text>

  <!-- Header -->
  <rect y="44" width="375" height="64" fill="#7C3AED"/>
  <text x="20" y="84" font-family="Inter" font-size="24" font-weight="700" fill="white">Dashboard</text>
  <circle cx="340" cy="76" r="18" fill="rgba(255,255,255,0.2)"/>
  <text x="340" y="81" font-family="Inter" font-size="14" font-weight="600" fill="white" text-anchor="middle">👤</text>

  <!-- Stats Cards Row -->
  <g transform="translate(16, 124)">
    <!-- Active Caregivers Card -->
    <rect width="165" height="100" rx="16" fill="white" filter="url(#shadow)"/>
    <text x="16" y="28" font-family="Inter" font-size="13" fill="#6B7280">Active Caregivers</text>
    <text x="16" y="64" font-family="Inter" font-size="36" font-weight="700" fill="#1F2937">12</text>
    <text x="16" y="84" font-family="Inter" font-size="12" fill="#10B981">↑ 2 this week</text>
    <rect x="120" y="16" width="32" height="32" rx="8" fill="#EDE9FE"/>
    <text x="136" y="38" font-family="Inter" font-size="18" text-anchor="middle">👥</text>

    <!-- Active Elders Card -->
    <g transform="translate(178, 0)">
      <rect width="165" height="100" rx="16" fill="white" filter="url(#shadow)"/>
      <text x="16" y="28" font-family="Inter" font-size="13" fill="#6B7280">Elders in Care</text>
      <text x="16" y="64" font-family="Inter" font-size="36" font-weight="700" fill="#1F2937">28</text>
      <text x="16" y="84" font-family="Inter" font-size="12" fill="#6B7280">$420/month</text>
      <rect x="120" y="16" width="32" height="32" rx="8" fill="#D1FAE5"/>
      <text x="136" y="38" font-family="Inter" font-size="18" text-anchor="middle">🧓</text>
    </g>
  </g>

  <!-- Today's Visits Section -->
  <g transform="translate(16, 244)">
    <text x="0" y="20" font-family="Inter" font-size="18" font-weight="600" fill="#1F2937">Today's Visits</text>
    <text x="290" y="20" font-family="Inter" font-size="14" fill="#7C3AED">View All →</text>

    <!-- Visit Card 1 -->
    <g transform="translate(0, 36)">
      <rect width="343" height="88" rx="12" fill="white" stroke="#E5E7EB"/>
      <rect x="0" y="0" width="4" height="88" rx="2" fill="#10B981"/>
      <circle cx="40" cy="44" r="24" fill="#F3F4F6"/>
      <text x="40" y="50" font-family="Inter" font-size="16" text-anchor="middle">MJ</text>
      <text x="76" y="32" font-family="Inter" font-size="15" font-weight="600" fill="#1F2937">Maria Johnson → Eleanor Smith</text>
      <text x="76" y="52" font-family="Inter" font-size="13" fill="#6B7280">9:00 AM - 11:00 AM</text>
      <rect x="76" y="62" width="72" height="20" rx="10" fill="#D1FAE5"/>
      <text x="112" y="76" font-family="Inter" font-size="11" font-weight="500" fill="#047857" text-anchor="middle">Checked In</text>
    </g>

    <!-- Visit Card 2 -->
    <g transform="translate(0, 136)">
      <rect width="343" height="88" rx="12" fill="white" stroke="#E5E7EB"/>
      <rect x="0" y="0" width="4" height="88" rx="2" fill="#3B82F6"/>
      <circle cx="40" cy="44" r="24" fill="#F3F4F6"/>
      <text x="40" y="50" font-family="Inter" font-size="16" text-anchor="middle">JD</text>
      <text x="76" y="32" font-family="Inter" font-size="15" font-weight="600" fill="#1F2937">James Davis → Robert Wilson</text>
      <text x="76" y="52" font-family="Inter" font-size="13" fill="#6B7280">1:00 PM - 3:00 PM</text>
      <rect x="76" y="62" width="72" height="20" rx="10" fill="#DBEAFE"/>
      <text x="112" y="76" font-family="Inter" font-size="11" font-weight="500" fill="#1D4ED8" text-anchor="middle">Scheduled</text>
    </g>

    <!-- Visit Card 3 -->
    <g transform="translate(0, 236)">
      <rect width="343" height="88" rx="12" fill="white" stroke="#E5E7EB"/>
      <rect x="0" y="0" width="4" height="88" rx="2" fill="#F59E0B"/>
      <circle cx="40" cy="44" r="24" fill="#F3F4F6"/>
      <text x="40" y="50" font-family="Inter" font-size="16" text-anchor="middle">SK</text>
      <text x="76" y="32" font-family="Inter" font-size="15" font-weight="600" fill="#1F2937">Sarah Kim → Dorothy Brown</text>
      <text x="76" y="52" font-family="Inter" font-size="13" fill="#6B7280">3:30 PM - 5:30 PM</text>
      <rect x="76" y="62" width="72" height="20" rx="10" fill="#FEF3C7"/>
      <text x="112" y="76" font-family="Inter" font-size="11" font-weight="500" fill="#B45309" text-anchor="middle">Upcoming</text>
    </g>
  </g>

  <!-- Tab Bar -->
  <g transform="translate(0, 728)">
    <rect width="375" height="84" fill="white" filter="url(#tabShadow)"/>
    <g transform="translate(30, 16)">
      <rect width="56" height="48" rx="12" fill="#EDE9FE"/>
      <text x="28" y="28" font-family="Inter" font-size="20" text-anchor="middle">📊</text>
      <text x="28" y="44" font-family="Inter" font-size="10" font-weight="500" fill="#7C3AED" text-anchor="middle">Dashboard</text>
    </g>
    <g transform="translate(100, 16)">
      <text x="28" y="28" font-family="Inter" font-size="20" text-anchor="middle">👥</text>
      <text x="28" y="44" font-family="Inter" font-size="10" fill="#6B7280" text-anchor="middle">Caregivers</text>
    </g>
    <g transform="translate(170, 16)">
      <text x="28" y="28" font-family="Inter" font-size="20" text-anchor="middle">🧓</text>
      <text x="28" y="44" font-family="Inter" font-size="10" fill="#6B7280" text-anchor="middle">Elders</text>
    </g>
    <g transform="translate(240, 16)">
      <text x="28" y="28" font-family="Inter" font-size="20" text-anchor="middle">📅</text>
      <text x="28" y="44" font-family="Inter" font-size="10" fill="#6B7280" text-anchor="middle">Schedule</text>
    </g>
    <g transform="translate(310, 16)">
      <text x="28" y="28" font-family="Inter" font-size="20" text-anchor="middle">⚙️</text>
      <text x="28" y="44" font-family="Inter" font-size="10" fill="#6B7280" text-anchor="middle">Settings</text>
    </g>
  </g>

  <!-- Shadow Definitions -->
  <defs>
    <filter id="shadow" x="-4" y="-2" width="180" height="112" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.1"/>
    </filter>
    <filter id="tabShadow" x="0" y="-8" width="375" height="92" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="-2" stdDeviation="4" flood-opacity="0.1"/>
    </filter>
  </defs>
</svg>
```

---

## Mockup 2: Caregiver Task Completion Screen

```svg
<svg width="375" height="812" viewBox="0 0 375 812" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Status Bar -->
  <rect width="375" height="44" fill="#3B82F6"/>
  <text x="187" y="28" font-family="Inter" font-size="14" font-weight="600" fill="white" text-anchor="middle">9:41</text>

  <!-- Header with Elder Info -->
  <rect y="44" width="375" height="120" fill="#3B82F6"/>
  <circle cx="50" cy="104" r="32" fill="white"/>
  <text x="50" y="112" font-family="Inter" font-size="20" font-weight="600" text-anchor="middle" fill="#3B82F6">ES</text>
  <text x="98" y="96" font-family="Inter" font-size="22" font-weight="700" fill="white">Eleanor Smith</text>
  <text x="98" y="120" font-family="Inter" font-size="14" fill="rgba(255,255,255,0.8)">✓ Checked in at 9:02 AM</text>

  <!-- Progress Bar -->
  <g transform="translate(16, 180)">
    <rect width="343" height="8" rx="4" fill="#E5E7EB"/>
    <rect width="172" height="8" rx="4" fill="#10B981"/>
    <text x="0" y="28" font-family="Inter" font-size="14" fill="#6B7280">3 of 6 tasks completed</text>
  </g>

  <!-- Task Grid - Large Icon Buttons -->
  <g transform="translate(16, 230)">
    <!-- Row 1 -->
    <g transform="translate(0, 0)">
      <!-- Completed Task -->
      <rect width="105" height="105" rx="20" fill="#D1FAE5" stroke="#10B981" stroke-width="3"/>
      <text x="52" y="50" font-family="Inter" font-size="40" text-anchor="middle">🛁</text>
      <text x="52" y="80" font-family="Inter" font-size="13" font-weight="600" fill="#047857" text-anchor="middle">Bathing</text>
      <circle cx="85" cy="20" r="14" fill="#10B981"/>
      <text x="85" y="26" font-family="Inter" font-size="16" fill="white" text-anchor="middle">✓</text>
    </g>

    <g transform="translate(119, 0)">
      <!-- Completed Task -->
      <rect width="105" height="105" rx="20" fill="#D1FAE5" stroke="#10B981" stroke-width="3"/>
      <text x="52" y="50" font-family="Inter" font-size="40" text-anchor="middle">💊</text>
      <text x="52" y="80" font-family="Inter" font-size="13" font-weight="600" fill="#047857" text-anchor="middle">Medication</text>
      <circle cx="85" cy="20" r="14" fill="#10B981"/>
      <text x="85" y="26" font-family="Inter" font-size="16" fill="white" text-anchor="middle">✓</text>
    </g>

    <g transform="translate(238, 0)">
      <!-- Completed Task -->
      <rect width="105" height="105" rx="20" fill="#D1FAE5" stroke="#10B981" stroke-width="3"/>
      <text x="52" y="50" font-family="Inter" font-size="40" text-anchor="middle">🍳</text>
      <text x="52" y="80" font-family="Inter" font-size="13" font-weight="600" fill="#047857" text-anchor="middle">Breakfast</text>
      <circle cx="85" cy="20" r="14" fill="#10B981"/>
      <text x="85" y="26" font-family="Inter" font-size="16" fill="white" text-anchor="middle">✓</text>
    </g>

    <!-- Row 2 -->
    <g transform="translate(0, 120)">
      <!-- Pending Task -->
      <rect width="105" height="105" rx="20" fill="white" stroke="#E5E7EB" stroke-width="2"/>
      <text x="52" y="50" font-family="Inter" font-size="40" text-anchor="middle">🚶</text>
      <text x="52" y="80" font-family="Inter" font-size="13" font-weight="500" fill="#374151" text-anchor="middle">Walking</text>
    </g>

    <g transform="translate(119, 120)">
      <!-- Pending Task -->
      <rect width="105" height="105" rx="20" fill="white" stroke="#E5E7EB" stroke-width="2"/>
      <text x="52" y="50" font-family="Inter" font-size="40" text-anchor="middle">💧</text>
      <text x="52" y="80" font-family="Inter" font-size="13" font-weight="500" fill="#374151" text-anchor="middle">Hydration</text>
    </g>

    <g transform="translate(238, 120)">
      <!-- Pending Task -->
      <rect width="105" height="105" rx="20" fill="white" stroke="#E5E7EB" stroke-width="2"/>
      <text x="52" y="50" font-family="Inter" font-size="40" text-anchor="middle">🧹</text>
      <text x="52" y="80" font-family="Inter" font-size="13" font-weight="500" fill="#374151" text-anchor="middle">Tidy Up</text>
    </g>
  </g>

  <!-- Action Buttons - Done/Skip -->
  <g transform="translate(16, 500)">
    <text x="171" y="20" font-family="Inter" font-size="16" font-weight="600" fill="#374151" text-anchor="middle">Tap a task, then mark it:</text>

    <g transform="translate(0, 40)">
      <!-- Done Button -->
      <rect width="165" height="72" rx="16" fill="#10B981"/>
      <text x="82" y="38" font-family="Inter" font-size="28" text-anchor="middle">✓</text>
      <text x="82" y="60" font-family="Inter" font-size="16" font-weight="600" fill="white" text-anchor="middle">DONE</text>
    </g>

    <g transform="translate(178, 40)">
      <!-- Skip Button -->
      <rect width="165" height="72" rx="16" fill="#FEE2E2"/>
      <text x="82" y="38" font-family="Inter" font-size="28" text-anchor="middle">✗</text>
      <text x="82" y="60" font-family="Inter" font-size="16" font-weight="600" fill="#B91C1C" text-anchor="middle">SKIP</text>
    </g>
  </g>

  <!-- Add Note Button -->
  <g transform="translate(16, 640)">
    <rect width="343" height="56" rx="12" fill="#F3F4F6"/>
    <text x="171" y="36" font-family="Inter" font-size="16" fill="#6B7280" text-anchor="middle">🎤 Add observation (voice or type)</text>
  </g>

  <!-- Check Out Button -->
  <g transform="translate(16, 720)">
    <rect width="343" height="64" rx="16" fill="#1E40AF"/>
    <text x="171" y="40" font-family="Inter" font-size="18" font-weight="600" fill="white" text-anchor="middle">CHECK OUT →</text>
  </g>
</svg>
```

---

## Mockup 3: Elder Home Screen (Simplified UI)

```svg
<svg width="375" height="812" viewBox="0 0 375 812" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="375" height="812" fill="#F9FAFB"/>

  <!-- Status Bar -->
  <rect width="375" height="44" fill="#10B981"/>
  <text x="187" y="28" font-family="Inter" font-size="14" font-weight="600" fill="white" text-anchor="middle">9:41</text>

  <!-- Greeting Header -->
  <rect y="44" width="375" height="140" fill="#10B981"/>
  <text x="24" y="100" font-family="Inter" font-size="36" font-weight="700" fill="white">Hello, Eleanor! 👋</text>
  <text x="24" y="135" font-family="Inter" font-size="18" fill="rgba(255,255,255,0.9)">Tuesday, February 4</text>

  <!-- Daily Check-in Card -->
  <g transform="translate(16, 200)">
    <rect width="343" height="80" rx="16" fill="#FEF3C7"/>
    <text x="24" y="35" font-family="Inter" font-size="32">☀️</text>
    <text x="72" y="40" font-family="Inter" font-size="20" font-weight="600" fill="#92400E">How are you feeling today?</text>
    <text x="72" y="62" font-family="Inter" font-size="14" fill="#B45309">Tap to check in</text>
    <text x="310" y="48" font-family="Inter" font-size="24" fill="#92400E">→</text>
  </g>

  <!-- Call Family Section -->
  <g transform="translate(16, 300)">
    <text x="0" y="24" font-family="Inter" font-size="22" font-weight="600" fill="#1F2937">📞 Call Family</text>

    <!-- Family Contact Cards - Extra Large -->
    <g transform="translate(0, 44)">
      <!-- Contact 1 -->
      <rect width="165" height="160" rx="24" fill="white" filter="url(#shadowLg)"/>
      <circle cx="82" cy="60" r="40" fill="#DBEAFE"/>
      <text x="82" y="72" font-family="Inter" font-size="32" font-weight="600" text-anchor="middle" fill="#1D4ED8">S</text>
      <text x="82" y="120" font-family="Inter" font-size="22" font-weight="700" fill="#1F2937" text-anchor="middle">Sarah</text>
      <text x="82" y="145" font-family="Inter" font-size="14" fill="#6B7280" text-anchor="middle">Daughter</text>

      <!-- Contact 2 -->
      <g transform="translate(178, 0)">
        <rect width="165" height="160" rx="24" fill="white" filter="url(#shadowLg)"/>
        <circle cx="82" cy="60" r="40" fill="#FCE7F3"/>
        <text x="82" y="72" font-family="Inter" font-size="32" font-weight="600" text-anchor="middle" fill="#BE185D">M</text>
        <text x="82" y="120" font-family="Inter" font-size="22" font-weight="700" fill="#1F2937" text-anchor="middle">Michael</text>
        <text x="82" y="145" font-family="Inter" font-size="14" fill="#6B7280" text-anchor="middle">Son</text>
      </g>
    </g>
  </g>

  <!-- Activities Section -->
  <g transform="translate(16, 540)">
    <text x="0" y="24" font-family="Inter" font-size="22" font-weight="600" fill="#1F2937">🎯 Activities</text>

    <!-- Activity Buttons - Extra Large -->
    <g transform="translate(0, 44)">
      <rect width="105" height="105" rx="20" fill="#FEE2E2"/>
      <text x="52" y="55" font-family="Inter" font-size="44" text-anchor="middle">🎮</text>
      <text x="52" y="90" font-family="Inter" font-size="16" font-weight="600" fill="#991B1B" text-anchor="middle">Games</text>
    </g>

    <g transform="translate(119, 44)">
      <rect width="105" height="105" rx="20" fill="#E0E7FF"/>
      <text x="52" y="55" font-family="Inter" font-size="44" text-anchor="middle">🎵</text>
      <text x="52" y="90" font-family="Inter" font-size="16" font-weight="600" fill="#3730A3" text-anchor="middle">Music</text>
    </g>

    <g transform="translate(238, 44)">
      <rect width="105" height="105" rx="20" fill="#D1FAE5"/>
      <text x="52" y="55" font-family="Inter" font-size="44" text-anchor="middle">📷</text>
      <text x="52" y="90" font-family="Inter" font-size="16" font-weight="600" fill="#065F46" text-anchor="middle">Photos</text>
    </g>
  </g>

  <!-- Simple Tab Bar -->
  <g transform="translate(0, 728)">
    <rect width="375" height="84" fill="white" filter="url(#tabShadow)"/>
    <g transform="translate(50, 16)">
      <rect width="80" height="52" rx="16" fill="#D1FAE5"/>
      <text x="40" y="32" font-family="Inter" font-size="28" text-anchor="middle">🏠</text>
      <text x="40" y="48" font-family="Inter" font-size="11" font-weight="500" fill="#047857" text-anchor="middle">Home</text>
    </g>
    <g transform="translate(147, 16)">
      <text x="40" y="32" font-family="Inter" font-size="28" text-anchor="middle">🎯</text>
      <text x="40" y="48" font-family="Inter" font-size="11" fill="#6B7280" text-anchor="middle">Activities</text>
    </g>
    <g transform="translate(244, 16)">
      <text x="40" y="32" font-family="Inter" font-size="28" text-anchor="middle">📞</text>
      <text x="40" y="48" font-family="Inter" font-size="11" fill="#6B7280" text-anchor="middle">Calls</text>
    </g>
  </g>

  <!-- Shadow Definitions -->
  <defs>
    <filter id="shadowLg" x="-8" y="-4" width="181" height="180" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.15"/>
    </filter>
  </defs>
</svg>
```

---

## Mockup 4: Caregiver Community / Support Groups

```svg
<svg width="375" height="812" viewBox="0 0 375 812" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Status Bar -->
  <rect width="375" height="44" fill="#3B82F6"/>
  <text x="187" y="28" font-family="Inter" font-size="14" font-weight="600" fill="white" text-anchor="middle">9:41</text>

  <!-- Header -->
  <rect y="44" width="375" height="64" fill="#3B82F6"/>
  <text x="20" y="84" font-family="Inter" font-size="24" font-weight="700" fill="white">Support Groups</text>

  <!-- Search Bar -->
  <g transform="translate(16, 124)">
    <rect width="343" height="48" rx="12" fill="#F3F4F6"/>
    <text x="20" y="30" font-family="Inter" font-size="16" fill="#9CA3AF">🔍 Search groups...</text>
  </g>

  <!-- Category Pills -->
  <g transform="translate(16, 188)">
    <rect width="70" height="36" rx="18" fill="#3B82F6"/>
    <text x="35" y="24" font-family="Inter" font-size="13" font-weight="500" fill="white" text-anchor="middle">All</text>

    <g transform="translate(82, 0)">
      <rect width="100" height="36" rx="18" fill="#F3F4F6"/>
      <text x="50" y="24" font-family="Inter" font-size="13" font-weight="500" fill="#374151" text-anchor="middle">🔥 Burnout</text>
    </g>

    <g transform="translate(194, 0)">
      <rect width="100" height="36" rx="18" fill="#F3F4F6"/>
      <text x="50" y="24" font-family="Inter" font-size="13" font-weight="500" fill="#374151" text-anchor="middle">🧘 Self-Care</text>
    </g>
  </g>

  <!-- Group Cards -->
  <g transform="translate(16, 244)">
    <!-- Group 1 - Joined -->
    <rect width="343" height="120" rx="16" fill="white" stroke="#E5E7EB"/>
    <text x="20" y="36" font-family="Inter" font-size="32">💬</text>
    <text x="68" y="32" font-family="Inter" font-size="17" font-weight="600" fill="#1F2937">Caregiver Connection</text>
    <text x="68" y="52" font-family="Inter" font-size="13" fill="#6B7280">General support and encouragement</text>
    <text x="68" y="76" font-family="Inter" font-size="12" fill="#9CA3AF">👥 1,234 members • 12 posts today</text>
    <rect x="68" y="88" width="72" height="24" rx="12" fill="#D1FAE5"/>
    <text x="104" y="104" font-family="Inter" font-size="12" font-weight="500" fill="#047857" text-anchor="middle">✓ Joined</text>

    <!-- Group 2 -->
    <g transform="translate(0, 136)">
      <rect width="343" height="120" rx="16" fill="white" stroke="#E5E7EB"/>
      <text x="20" y="36" font-family="Inter" font-size="32">🔥</text>
      <text x="68" y="32" font-family="Inter" font-size="17" font-weight="600" fill="#1F2937">Burnout Recovery</text>
      <text x="68" y="52" font-family="Inter" font-size="13" fill="#6B7280">Strategies for managing caregiver fatigue</text>
      <text x="68" y="76" font-family="Inter" font-size="12" fill="#9CA3AF">👥 856 members • 8 posts today</text>
      <rect x="68" y="88" width="56" height="24" rx="12" fill="#3B82F6"/>
      <text x="96" y="104" font-family="Inter" font-size="12" font-weight="500" fill="white" text-anchor="middle">Join</text>
    </g>

    <!-- Group 3 -->
    <g transform="translate(0, 272)">
      <rect width="343" height="120" rx="16" fill="white" stroke="#E5E7EB"/>
      <text x="20" y="36" font-family="Inter" font-size="32">🧠</text>
      <text x="68" y="32" font-family="Inter" font-size="17" font-weight="600" fill="#1F2937">Dementia Care Support</text>
      <text x="68" y="52" font-family="Inter" font-size="13" fill="#6B7280">Specialized tips for memory care</text>
      <text x="68" y="76" font-family="Inter" font-size="12" fill="#9CA3AF">👥 2,105 members • 15 posts today</text>
      <rect x="68" y="88" width="56" height="24" rx="12" fill="#3B82F6"/>
      <text x="96" y="104" font-family="Inter" font-size="12" font-weight="500" fill="white" text-anchor="middle">Join</text>
    </g>

    <!-- Group 4 -->
    <g transform="translate(0, 408)">
      <rect width="343" height="120" rx="16" fill="white" stroke="#E5E7EB"/>
      <text x="20" y="36" font-family="Inter" font-size="32">🌱</text>
      <text x="68" y="32" font-family="Inter" font-size="17" font-weight="600" fill="#1F2937">New Caregiver Welcome</text>
      <text x="68" y="52" font-family="Inter" font-size="13" fill="#6B7280">Getting started in caregiving</text>
      <text x="68" y="76" font-family="Inter" font-size="12" fill="#9CA3AF">👥 567 members • 5 posts today</text>
      <rect x="68" y="88" width="56" height="24" rx="12" fill="#3B82F6"/>
      <text x="96" y="104" font-family="Inter" font-size="12" font-weight="500" fill="white" text-anchor="middle">Join</text>
    </g>
  </g>

  <!-- Wellness Check-in FAB -->
  <g transform="translate(287, 640)">
    <circle cx="36" cy="36" r="36" fill="#10B981" filter="url(#fabShadow)"/>
    <text x="36" y="32" font-family="Inter" font-size="16" fill="white" text-anchor="middle">❤️</text>
    <text x="36" y="48" font-family="Inter" font-size="9" font-weight="500" fill="white" text-anchor="middle">Check-in</text>
  </g>

  <!-- Tab Bar -->
  <g transform="translate(0, 728)">
    <rect width="375" height="84" fill="white" filter="url(#tabShadow)"/>
    <g transform="translate(30, 16)">
      <text x="28" y="28" font-family="Inter" font-size="20" text-anchor="middle">📅</text>
      <text x="28" y="44" font-family="Inter" font-size="10" fill="#6B7280" text-anchor="middle">Today</text>
    </g>
    <g transform="translate(100, 16)">
      <text x="28" y="28" font-family="Inter" font-size="20" text-anchor="middle">📆</text>
      <text x="28" y="44" font-family="Inter" font-size="10" fill="#6B7280" text-anchor="middle">Schedule</text>
    </g>
    <g transform="translate(170, 16)">
      <rect width="56" height="48" rx="12" fill="#DBEAFE"/>
      <text x="28" y="28" font-family="Inter" font-size="20" text-anchor="middle">💬</text>
      <text x="28" y="44" font-family="Inter" font-size="10" font-weight="500" fill="#1D4ED8" text-anchor="middle">Community</text>
    </g>
    <g transform="translate(240, 16)">
      <text x="28" y="28" font-family="Inter" font-size="20" text-anchor="middle">👤</text>
      <text x="28" y="44" font-family="Inter" font-size="10" fill="#6B7280" text-anchor="middle">Profile</text>
    </g>
  </g>

  <defs>
    <filter id="fabShadow">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.25"/>
    </filter>
  </defs>
</svg>
```

---

## Mockup 5: Volunteer Matching Screen

```svg
<svg width="375" height="812" viewBox="0 0 375 812" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Status Bar -->
  <rect width="375" height="44" fill="#F59E0B"/>
  <text x="187" y="28" font-family="Inter" font-size="14" font-weight="600" fill="white" text-anchor="middle">9:41</text>

  <!-- Header -->
  <rect y="44" width="375" height="64" fill="#F59E0B"/>
  <text x="20" y="84" font-family="Inter" font-size="24" font-weight="700" fill="white">Your Matches</text>

  <!-- Match Stats -->
  <g transform="translate(16, 124)">
    <rect width="343" height="72" rx="16" fill="#FEF3C7"/>
    <text x="24" y="32" font-family="Inter" font-size="14" fill="#92400E">Based on your interests and availability</text>
    <text x="24" y="56" font-family="Inter" font-size="16" font-weight="600" fill="#78350F">🎯 5 great matches found nearby</text>
  </g>

  <!-- Match Cards -->
  <g transform="translate(16, 212)">
    <!-- Match 1 - High Score -->
    <rect width="343" height="160" rx="16" fill="white" stroke="#F59E0B" stroke-width="2"/>
    <rect x="280" y="12" width="52" height="24" rx="12" fill="#FEF3C7"/>
    <text x="306" y="28" font-family="Inter" font-size="12" font-weight="700" fill="#B45309" text-anchor="middle">95%</text>

    <circle cx="48" cy="56" r="32" fill="#FEF3C7"/>
    <text x="48" y="64" font-family="Inter" font-size="24" text-anchor="middle">👵</text>

    <text x="96" y="44" font-family="Inter" font-size="18" font-weight="600" fill="#1F2937">Dorothy Brown</text>
    <text x="96" y="64" font-family="Inter" font-size="13" fill="#6B7280">2.3 miles away • Afternoon visits</text>

    <!-- Shared Interests -->
    <g transform="translate(96, 76)">
      <rect width="60" height="24" rx="12" fill="#E0E7FF"/>
      <text x="30" y="16" font-family="Inter" font-size="11" fill="#4338CA" text-anchor="middle">📚 Reading</text>

      <rect x="68" width="56" height="24" rx="12" fill="#FCE7F3"/>
      <text x="96" y="16" font-family="Inter" font-size="11" fill="#BE185D" text-anchor="middle">🎵 Music</text>

      <rect x="132" width="60" height="24" rx="12" fill="#D1FAE5"/>
      <text x="162" y="16" font-family="Inter" font-size="11" fill="#047857" text-anchor="middle">🎲 Games</text>
    </g>

    <g transform="translate(16, 116)">
      <rect width="150" height="32" rx="8" fill="#F59E0B"/>
      <text x="75" y="21" font-family="Inter" font-size="14" font-weight="600" fill="white" text-anchor="middle">Schedule Visit</text>

      <rect x="162" width="165" height="32" rx="8" fill="#F3F4F6"/>
      <text x="244" y="21" font-family="Inter" font-size="14" font-weight="500" fill="#374151" text-anchor="middle">View Profile</text>
    </g>

    <!-- Match 2 -->
    <g transform="translate(0, 176)">
      <rect width="343" height="160" rx="16" fill="white" stroke="#E5E7EB"/>
      <rect x="280" y="12" width="52" height="24" rx="12" fill="#E5E7EB"/>
      <text x="306" y="28" font-family="Inter" font-size="12" font-weight="700" fill="#6B7280" text-anchor="middle">87%</text>

      <circle cx="48" cy="56" r="32" fill="#DBEAFE"/>
      <text x="48" y="64" font-family="Inter" font-size="24" text-anchor="middle">👴</text>

      <text x="96" y="44" font-family="Inter" font-size="18" font-weight="600" fill="#1F2937">Robert Wilson</text>
      <text x="96" y="64" font-family="Inter" font-size="13" fill="#6B7280">3.8 miles away • Morning visits</text>

      <g transform="translate(96, 76)">
        <rect width="68" height="24" rx="12" fill="#FEF3C7"/>
        <text x="34" y="16" font-family="Inter" font-size="11" fill="#B45309" text-anchor="middle">🌱 Garden</text>

        <rect x="76" width="48" height="24" rx="12" fill="#E0E7FF"/>
        <text x="100" y="16" font-family="Inter" font-size="11" fill="#4338CA" text-anchor="middle">📜 History</text>
      </g>

      <g transform="translate(16, 116)">
        <rect width="150" height="32" rx="8" fill="#F59E0B"/>
        <text x="75" y="21" font-family="Inter" font-size="14" font-weight="600" fill="white" text-anchor="middle">Schedule Visit</text>

        <rect x="162" width="165" height="32" rx="8" fill="#F3F4F6"/>
        <text x="244" y="21" font-family="Inter" font-size="14" font-weight="500" fill="#374151" text-anchor="middle">View Profile</text>
      </g>
    </g>

    <!-- Match 3 -->
    <g transform="translate(0, 352)">
      <rect width="343" height="160" rx="16" fill="white" stroke="#E5E7EB"/>
      <rect x="280" y="12" width="52" height="24" rx="12" fill="#E5E7EB"/>
      <text x="306" y="28" font-family="Inter" font-size="12" font-weight="700" fill="#6B7280" text-anchor="middle">82%</text>

      <circle cx="48" cy="56" r="32" fill="#FCE7F3"/>
      <text x="48" y="64" font-family="Inter" font-size="24" text-anchor="middle">👵</text>

      <text x="96" y="44" font-family="Inter" font-size="18" font-weight="600" fill="#1F2937">Margaret Chen</text>
      <text x="96" y="64" font-family="Inter" font-size="13" fill="#6B7280">5.1 miles away • Flexible schedule</text>

      <g transform="translate(96, 76)">
        <rect width="48" height="24" rx="12" fill="#D1FAE5"/>
        <text x="24" y="16" font-family="Inter" font-size="11" fill="#047857" text-anchor="middle">🎨 Art</text>

        <rect x="56" width="64" height="24" rx="12" fill="#FEE2E2"/>
        <text x="88" y="16" font-family="Inter" font-size="11" fill="#991B1B" text-anchor="middle">👨‍🍳 Cooking</text>
      </g>

      <g transform="translate(16, 116)">
        <rect width="150" height="32" rx="8" fill="#F59E0B"/>
        <text x="75" y="21" font-family="Inter" font-size="14" font-weight="600" fill="white" text-anchor="middle">Schedule Visit</text>

        <rect x="162" width="165" height="32" rx="8" fill="#F3F4F6"/>
        <text x="244" y="21" font-family="Inter" font-size="14" font-weight="500" fill="#374151" text-anchor="middle">View Profile</text>
      </g>
    </g>
  </g>

  <!-- Tab Bar -->
  <g transform="translate(0, 728)">
    <rect width="375" height="84" fill="white" filter="url(#tabShadow)"/>
    <g transform="translate(60, 16)">
      <rect width="56" height="48" rx="12" fill="#FEF3C7"/>
      <text x="28" y="28" font-family="Inter" font-size="20" text-anchor="middle">🎯</text>
      <text x="28" y="44" font-family="Inter" font-size="10" font-weight="500" fill="#B45309" text-anchor="middle">Matches</text>
    </g>
    <g transform="translate(157, 16)">
      <text x="28" y="28" font-family="Inter" font-size="20" text-anchor="middle">📅</text>
      <text x="28" y="44" font-family="Inter" font-size="10" fill="#6B7280" text-anchor="middle">Visits</text>
    </g>
    <g transform="translate(254, 16)">
      <text x="28" y="28" font-family="Inter" font-size="20" text-anchor="middle">👤</text>
      <text x="28" y="44" font-family="Inter" font-size="10" fill="#6B7280" text-anchor="middle">Profile</text>
    </g>
  </g>
</svg>
```

---

## Usage Guidelines

### When to Reference These Mockups

1. **Building new screens** - Match the visual style, spacing, and component patterns
2. **Code reviews** - Verify implemented UI matches the mockups
3. **Design consistency** - Use same colors, fonts, and touch targets
4. **Accessibility audits** - Verify touch targets and contrast ratios

### Key Design Patterns to Follow

| Element | Agency | Caregiver | Elder | Volunteer |
|---------|--------|-----------|-------|-----------|
| Header Height | 64px | 120px (with elder info) | 140px | 64px |
| Touch Target | 48px | 72px+ | 96px+ | 56px |
| Border Radius | 12-16px | 16-20px | 20-24px | 16px |
| Card Padding | 16px | 20px | 24px | 16px |
| Font Base | 14-16px | 16-18px | 20-24px | 14-16px |

## Troubleshooting

### SVG not rendering in React Native
**Cause:** Incorrect SVG transformer setup
**Solution:** Use `react-native-svg-transformer` with metro config

### Colors look different on device
**Cause:** Color profile differences
**Solution:** Test on physical devices, use sRGB color space
