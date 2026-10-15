## Overview

**Docket** is a privacy-first Progressive Web App (PWA) designed for structured strength training, biometric tracking, and weekly self-accountability. Built with a developer-tool aesthetic and zero cloud dependencies, all workout logs, nutrition data, and physique photos live strictly on-device inside IndexedDB.

🔗 **Live Application:** [docket-iota-brown.vercel.app](https://docket-iota-brown.vercel.app/)

---

## Core Modules

Docket is organized around a 5-page mobile-first architecture:

1. **Overview (Daily Command Center)**
   * **Session Status:** Instant launch into today's scheduled workout or routine planner.
   * **Morning Weight:** Frictionless daily scale weight entry.
   * **Nutrition Progress:** Real-time progress bars for Calories, Protein, Carbs, and Fats against daily targets.
   * **Daily Habits & Non-Negotiables:** One-tap quick-add chips for hydration (`+250ml`, `+500ml`), daily steps (`+1k`), and supplement/mobility checkboxes.

2. **Workouts (The Iron Ledger)**
   * **Active Session Logging:** Track sets, reps, weight, and rest intervals with automatic Personal Record (PR) detection.
   * **One-Tap Split Templates:** Apply pre-configured routines (*Push Day*, *Pull Day*, *Leg Day*) or build custom workouts.
   * **Accountability Skip Logging:** Log missed sessions with explicit categorization (`Justified` vs. `Unjustified`) to maintain honest compliance metrics.

3. **Progress & Analytics**
   * **Dual-Strategy Weight Smoothing:** Compare raw daily weigh-ins against a **7-Day Moving Average** and Sunday **Official Weigh-In** locks across `14D`, `30D`, and `ALL` time horizons.
   * **1RM Strength Milestones:** Automatic estimated 1-Rep Max calculations (Brzycki formula) with exercise search and muscle-group filtering.
   * **Rolling Macro Averages:** 7-day nutritional averages compared directly against baseline targets.

4. **Physique Photo Vault**
   * **100% On-Device Privacy:** Client-side image compression stored directly as blobs in IndexedDB—never uploaded to external servers.
   * **Structured Pose Filtering:** Categorize and filter uploads by `FRONT`, `BACK`, and `SIDE` angles.
   * **Compare Mode:** Side-by-side transformation view to inspect visual progress across dates.

5. **Weekly Review (Accountability Hub)**
   * **Executive Weekly Summary:** 7-day rolling weight delta, completed lift count, and habit commitment percentage.
   * **Accountability Audit Trail:** Separates controllable slips (`Unjustified`) from external life exceptions (`Justified`).
   * **Weekly Scratchpad:** Dedicated reflection logbook for strength plateaus, recovery notes, and diet adjustments.

---

## Design System

Crafted for low-light gym environments with high-contrast data legibility:

| Token | Hex | Role |
| :--- | :--- | :--- |
| **Canvas** | `#0A0D14` | Primary deep midnight background |
| **Surface / Card** | `#121722` | Elevated slate containers |
| **Border / Muted** | `#242E45` | Structural hairlines and inactive states |
| **Primary Accent** | `#FFAE75` | Sandy Orange — primary CTAs, active tabs, and highlights |
| **Success / PR** | `#34D399` | Emerald Mint — completed sets, PR badges, moving averages |
| **Danger / Slip** | `#F87171` | Coral Red — unjustified skips and negative drift alerts |

---

## Architecture & Tech Stack

* **Frontend:** React 19, TypeScript, Vite
* **Styling:** Tailwind CSS
* **Local Database:** Dexie.js (IndexedDB wrapper) for 0ms offline-capable reads/writes
* **PWA Support:** Web App Manifest & custom home-screen icons for native-like mobile installation
* **Linting:** Oxlint
