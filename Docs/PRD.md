# Antigravity Agent Guidelines: Docket App

## Project Overview
You are building **Docket** (`docket.app`), a mobile-first, local-first progressive web app (PWA) designed for personal fitness tracking, progressive overload management, physical photo comparison, and weekly accountability reviews. 

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

_______________________________________
More context: 
1. Product Overview
Product Name: Personal Fitness & Coaching Companion (Working Title)
Product Type: Local-first, private personal utility app.
Target User: Ahmad (Single user/founder) working alongside an online fitness coach.
Core Objective: To eliminate data fragmentation by centralizing daily biometrics, nutrition targets, workout execution, habit non-negotiables, accountability metrics, `and weekly coach check-in summaries into one frictionless dashboard.
2. User Personas & Goals
The User (Ahmad): Wants a lightning-fast way to log morning metrics, check off daily habits (like water and steps), track gym weights against last week's performance, and easily compile a weekly report for an online coach without digging through messy notes or external spreadsheets.
3. Core Functional Requirements & Features
Module A: Daily Tracking & Biometrics
Morning Biometrics Log: Input fields for morning body weight, optional resting heart rate, and subjective daily metrics (sleep quality, stress levels, energy levels).
Dual-Strategy Weight Tracking:
Daily Mode: Continuous log to build out smooth moving-average trend lines and account for water weight fluctuations.
Fixed Weekly Weigh-In: Designating a specific day of the week to lock in an official weight metric for the online coach.
Physique Photo Vault: Uploading and organizing weekly/bi-weekly physique photos (front, back, side) tagged by date.
Photo Comparison Tool: A side-by-side view / slider tool allowing selection of any two dates to visually compare physique changes.
Module B: Nutrition & Macro Target Management
External Nutrition Input: A clean manual entry interface to record final daily totals (calculated externally in apps like MyFitnessPal) for total calories and protein.
Target Compliance Indicator: Visual comparison showing actual intake vs. daily calorie and protein targets assigned by the coach.
Module C: Schedule-Driven Navigation & Coach Programming
Calendar & Weekly Nav Bar: A calendar-driven home interface to view and jump between days.
Prescribed Workouts & Cardio: Viewing daily resistance training blocks (exercises, target sets, reps) and cardio requirements.
Progressive Overload View: Displays what was lifted last week live on screen while entering today’s numbers.
Automatic PR Tracker: Automatically detects and highlights personal records (PRs) when previous strength milestones are beaten.
Module D: Accountability & Exception Handling
Retroactive Editing / Backfill: Permanent ability to open and edit/fill any past date's data without breaking historical data trends or moving averages.
Workout Cancellation & Reason Tagging: Option to cancel a scheduled workout session, prompting a required selection for the reason (e.g., Sick, Injury, Work Overtime, Travel, Low Motivation).
Justified vs. Unjustified Color Coding:
Green (Justified): Automatically applied to external/uncontrollable factors (illness, work emergencies, travel).
Red (Unjustified): Automatically applied to internal/controllable slips (procrastination, skipping due to low motivation) to provide a clear audit trail for the coach.
Module E: Daily Habits & Non-Negotiables Checklist
Side Checklist / Daily Habit Tracker: A collapsible or side checklist for daily non-negotiables (e.g., drink 2.5L of water, step target, daily supplements, sleep hours).
Module F: The "Coach Check-In" Hub
Weekly Summary View: An automated compilation dashboard aggregating the past 7 days (fixed weekly weight, average daily calories, workout completion rate, habit compliance, and progress photos).
Running Scratchpad / Notes: A frictionless text block to drop random thoughts, questions, or notes throughout the week so nothing is forgotten on check-in day.
4. User Flows (How It Works)
Daily Morning Routine: Open app  Calendar defaults to today  Log morning weight, sleep/stress notes, and check off daily habits (water, steps)  Review today's scheduled workout.
Gym Session: Open today's workout  See last week's logged weights for each exercise  Log current sets/reps  App automatically flags if a personal record (PR) was broken.
End-of-Day Wrap-Up: Input final calorie and protein totals calculated externally  App updates compliance indicator.
Handling a Missed Day / Cancellation: If a workout is skipped, user clicks "Cancel Session"  Selects reason (e.g., "Slept poorly")  App tags it as Red (Unjustified) or Green (Justified) based on category.
Weekly Coach Check-In: Navigate to the Check-In Hub  View aggregated 7-day metrics, side-by-side photos, and check-in notes  Copy/export cleanly to send to the coach.
5. Non-Functional Requirements
Data Privacy & Storage: Local-first data architecture ensuring total ownership and privacy of personal fitness data, photos, and notes.
Frictionless UI: Fast load times, minimal clicks per entry, and a clean mobile-friendly or desktop layout.
