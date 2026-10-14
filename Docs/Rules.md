# Antigravity Agent Guidelines: Review Fitness App

## Project Overview
You are building **Review Fitness** (`reviewfitness.app`), a mobile-first, local-first progressive web app (PWA) designed for personal fitness tracking, progressive overload management, physical photo comparison, and weekly accountability reviews. 

## Core Architecture & Rules
1. **Local-First & Private:** Never assume a backend server, cloud database, or external API. All data (logs, workouts, images) must persist locally using IndexedDB (via Dexie.js).
2. **Strict Color Palette Enforcement:** Tailwind classes must map exclusively to our custom color tokens:
   - Base Canvas: `bg-canvas` (`#0A0D14`)
   - Card Surfaces: `bg-surface` (`#141A29`)
   - Borders / Dividers: `border-subtle` (`#242E45`)
   - Primary Accent / CTAs: `bg-primary` (`#FFAE75`) with dark canvas text (`text-canvas`)
   - Primary Text: `text-textPrimary` (`#F1F5F9`)
   - Muted Text: `text-textMuted` (`#9E9E9E`)
   - Semantic Danger / Unjustified: `text-danger` (`#F87171`)
   - Semantic Success / PR / Justified: `text-success` (`#34D399`)
3. **The 5 Core Navigation Pages:**
   - **01: Overview** (Calendar Scroller, Daily Biometrics, Nutrition, Habits, Workout Preview)
   - **02: Workouts** (Active Session Timer, Progressive Overload Benchmarks, Set Logger, PR Badges)
   - **03: Progress** (Weight Analysis, 1RM Strength Charts, Nutrition Compliance Bars)
   - **04: Photos** (Chronological Gallery, Side-by-Side Comparison Slider)
   - **05: Review** (7-Day Averages, Accountability Gaps/Exceptions [Justified vs. Unjustified], Scratchpad Notes, Copyable Check-In Hub)