import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Scale, Award, Utensils, HelpCircle, Check, Search, X, Dumbbell, Star } from 'lucide-react';
import { db, isOfficialWeighInDay } from '../../db/db';
import type { DailyBiometrics, WorkoutLog, Exercise, DailyNutrition, UserSettings } from '../../types';

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

interface ProgressViewProps {
  settings: UserSettings;
  allExercises: Exercise[];
}

export const ProgressView: React.FC<ProgressViewProps> = ({ settings, allExercises }) => {
  const [biometricsList, setBiometricsList] = useState<DailyBiometrics[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [nutritionList, setNutritionList] = useState<DailyNutrition[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | ''>('');
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<'14d' | '30d' | 'all'>('14d');
  const [show1RMInfo, setShow1RMInfo] = useState(false);

  // Line toggles
  const [showDailyLine, setShowDailyLine] = useState(true);
  const [showMovingAvgLine, setShowMovingAvgLine] = useState(true);
  const [showOfficialLocks, setShowOfficialLocks] = useState(true);

  useEffect(() => {
    async function loadData() {
      const bios = await db.biometrics.orderBy('date').toArray();
      const logs = await db.workoutLogs.where('status').equals('completed').toArray();
      const nuts = await db.nutrition.orderBy('date').toArray();

      setBiometricsList(bios);
      setWorkoutLogs(logs);
      setNutritionList(nuts);

      const lifting = allExercises.filter((e) => e.type === 'lifting');
      if (lifting.length > 0 && !selectedExerciseId) {
        setSelectedExerciseId(lifting[0].id || '');
      }
    }
    loadData();
  }, [allExercises, selectedExerciseId]);

  // Filter weights by timeRange
  const validWeights = biometricsList.filter((b) => b.weightKg && b.weightKg > 0);
  const displayedWeights =
    timeRange === '14d'
      ? validWeights.slice(-14)
      : timeRange === '30d'
      ? validWeights.slice(-30)
      : validWeights;

  // Calculate 7-day moving averages
  const weightsWithMA = displayedWeights.map((item, idx, arr) => {
    const windowStart = Math.max(0, idx - 6);
    const windowSlice = arr.slice(windowStart, idx + 1);
    const avg = windowSlice.reduce((sum, w) => sum + (w.weightKg || 0), 0) / windowSlice.length;
    const isOfficial = Boolean(item.isOfficialWeighIn || isOfficialWeighInDay(item.date, settings));
    return {
      date: item.date,
      weight: item.weightKg!,
      movingAvg: Number(avg.toFixed(2)),
      isOfficial,
    };
  });

  // Filtered lifting exercises for the 1RM search
  const filteredLiftingExercises = useMemo(() => {
    const q = exerciseSearchQuery.trim().toLowerCase();
    return allExercises
      .filter((e) => e.type === 'lifting')
      .filter((e) => !q || e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
  }, [allExercises, exerciseSearchQuery]);

  // Strength 1RM history for selected exercise
  const exerciseLogs = useMemo(() => {
    if (!selectedExerciseId) return [];
    return workoutLogs
      .map((log) => {
        const matchEx = log.exercises.find((e) => e.exerciseId === Number(selectedExerciseId));
        if (!matchEx || matchEx.sets.length === 0) return null;

        let maxEst1RM = 0;
        let bestSet = matchEx.sets[0];

        for (const s of matchEx.sets) {
          if (!s.weightKg || !s.reps) continue;
          // Epley formula: 1RM = weight * (1 + reps / 30)
          const est1RM = s.weightKg * (1 + s.reps / 30);
          if (est1RM > maxEst1RM) {
            maxEst1RM = est1RM;
            bestSet = s;
          }
        }

        if (maxEst1RM <= 0) return null;

        return {
          date: log.date,
          est1RM: Math.round(maxEst1RM * 10) / 10,
          bestWeight: bestSet.weightKg,
          bestReps: bestSet.reps,
        };
      })
      .filter(Boolean) as { date: string; est1RM: number; bestWeight: number; bestReps: number }[];
  }, [selectedExerciseId, workoutLogs]);

  // 7-day macro averages
  const recentNutrition = nutritionList.slice(-7);
  const avgCalories = recentNutrition.length
    ? Math.round(recentNutrition.reduce((s, n) => s + (n.calories || 0), 0) / recentNutrition.length)
    : 0;
  const avgProtein = recentNutrition.length
    ? Math.round(recentNutrition.reduce((s, n) => s + (n.proteinGrams || 0), 0) / recentNutrition.length)
    : 0;
  const avgCarbs = recentNutrition.length
    ? Math.round(recentNutrition.reduce((s, n) => s + (n.carbsGrams || 0), 0) / recentNutrition.length)
    : 0;
  const avgFats = recentNutrition.length
    ? Math.round(recentNutrition.reduce((s, n) => s + (n.fatsGrams || 0), 0) / recentNutrition.length)
    : 0;

  // Chart coordinates
  const minWeight = weightsWithMA.length
    ? Math.floor(Math.min(...weightsWithMA.map((w) => w.weight)) - 1)
    : 70;
  const maxWeight = weightsWithMA.length
    ? Math.ceil(Math.max(...weightsWithMA.map((w) => w.weight)) + 1)
    : 90;
  const weightRange = maxWeight - minWeight || 1;

  const chartWidth = 320;
  const chartHeight = 120;
  const paddingX = 15;
  const paddingY = 15;

  const points = weightsWithMA.map((item, idx) => {
    const x =
      paddingX + (idx / Math.max(1, weightsWithMA.length - 1)) * (chartWidth - paddingX * 2);
    const y =
      chartHeight - paddingY - ((item.weight - minWeight) / weightRange) * (chartHeight - paddingY * 2);
    const maY =
      chartHeight - paddingY - ((item.movingAvg - minWeight) / weightRange) * (chartHeight - paddingY * 2);
    return { x, y, maY, ...item };
  });

  const weightPathD = points.length ? `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}` : '';
  const maPathD = points.length ? `M ${points.map((p) => `${p.x},${p.maY}`).join(' L ')}` : '';
  const officialPoints = points.filter((p) => p.isOfficial);
  const officialPathD = officialPoints.length >= 2 ? `M ${officialPoints.map((p) => `${p.x},${p.y}`).join(' L ')}` : '';

  const selectedEx = allExercises.find((e) => e.id === Number(selectedExerciseId));

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-textPrimary flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <span>Progress & Analytics</span>
        </h2>

        {/* Time range pills */}
        <div className="flex bg-surface border border-border-subtle rounded-xl p-1">
          {(['14d', '30d', 'all'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setTimeRange(r)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                timeRange === r ? 'bg-primary text-canvas' : 'text-textMuted hover:text-textPrimary'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Dual-Strategy Weight Chart Card */}
      <div className="bg-surface rounded-2xl p-4 border border-border-subtle shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-textPrimary">Weight Trend & Moving Average</h3>
              <p className="text-[11px] text-textMuted">Tap filters below to show/hide lines</p>
            </div>
          </div>

          {weightsWithMA.length > 0 && (
            <div className="text-right">
              <span className="text-base font-bold text-primary">
                {weightsWithMA[weightsWithMA.length - 1].weight} {settings.weightUnit}
              </span>
              <span className="text-[10px] text-textMuted block font-medium">
                MA: {weightsWithMA[weightsWithMA.length - 1].movingAvg}
              </span>
            </div>
          )}
        </div>

        {/* Clickable Line Toggles */}
        <div className="flex items-center flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => setShowDailyLine(!showDailyLine)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition-all ${
              showDailyLine
                ? 'bg-primary/15 text-primary border-primary/40'
                : 'bg-canvas text-textMuted border-border-subtle opacity-60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>Daily Weights</span>
            {showDailyLine && <Check className="w-3 h-3 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => setShowMovingAvgLine(!showMovingAvgLine)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition-all ${
              showMovingAvgLine
                ? 'bg-success/15 text-success border-success/40'
                : 'bg-canvas text-textMuted border-border-subtle opacity-60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-success" />
            <span>7-Day Moving Avg</span>
            {showMovingAvgLine && <Check className="w-3 h-3 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => setShowOfficialLocks(!showOfficialLocks)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition-all ${
              showOfficialLocks
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/40 shadow-sm'
                : 'bg-canvas text-textMuted border-border-subtle opacity-60'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${showOfficialLocks ? 'fill-amber-400 text-amber-400' : 'text-textMuted'}`} />
            <span>Official Weigh-In</span>
            {showOfficialLocks && <Check className="w-3 h-3 ml-0.5" />}
          </button>
        </div>

        {/* Official Weigh-In Info Banner when toggle is ON */}
        {showOfficialLocks && (
          <div className="bg-canvas/90 rounded-xl p-2.5 border border-amber-500/30 flex items-center justify-between text-xs transition-all">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 flex-shrink-0">
                <Star className="w-4 h-4 fill-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-textPrimary">Official Weigh-In Tracking</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                    Every {DAYS_OF_WEEK[settings.fixedWeighInDay ?? 0]}
                  </span>
                </div>
                <span className="text-[10px] text-textMuted block truncate">
                  {officialPoints.length > 0
                    ? `${officialPoints.length} official weigh-in${officialPoints.length > 1 ? 's' : ''} highlighted on chart`
                    : `No weigh-ins logged on ${DAYS_OF_WEEK[settings.fixedWeighInDay ?? 0]}s yet.`}
                </span>
              </div>
            </div>
            {officialPoints.length > 0 && (
              <div className="text-right flex-shrink-0 pl-2">
                <span className="text-xs font-bold text-amber-400">
                  {officialPoints[officialPoints.length - 1].weight} {settings.weightUnit}
                </span>
                <span className="text-[9px] text-textMuted block">Latest</span>
              </div>
            )}
          </div>
        )}

        {/* SVG Chart */}
        <div className="bg-canvas/80 rounded-xl p-3 border border-border-subtle/80 overflow-hidden">
          {weightsWithMA.length < 2 ? (
            <div className="py-10 text-center text-xs text-textMuted">
              Log at least 2 days of weight to view moving-average trend line.
            </div>
          ) : (
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-36 overflow-visible">
              {/* Grid Lines */}
              <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="#242E45" strokeDasharray="3 3" />
              <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke="#242E45" strokeDasharray="3 3" />
              <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="#242E45" strokeDasharray="3 3" />

              {/* Official Weigh-Ins Trend Line */}
              {showOfficialLocks && officialPathD && (
                <path
                  d={officialPathD}
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="2"
                  strokeDasharray="3 3"
                />
              )}

              {/* Moving Average Line */}
              {showMovingAvgLine && (
                <path
                  d={maPathD}
                  fill="none"
                  stroke="#34D399"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Daily Weight Line */}
              {showDailyLine && (
                <path
                  d={weightPathD}
                  fill="none"
                  stroke="#FFAE75"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Points */}
              {points.map((p, idx) => (
                <g key={idx}>
                  {showDailyLine && <circle cx={p.x} cy={p.y} r="2.5" fill="#FFAE75" />}
                  {showOfficialLocks && p.isOfficial && (
                    <g>
                      <circle cx={p.x} cy={p.y} r="8" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.9" />
                      <circle cx={p.x} cy={p.y} r="4.5" fill="#F59E0B" stroke="#0B0F19" strokeWidth="1.5" />
                      <text
                        x={p.x}
                        y={Math.max(12, p.y - 10)}
                        textAnchor="middle"
                        fill="#F59E0B"
                        fontSize="9"
                        fontWeight="bold"
                        className="select-none"
                      >
                        ★ {p.weight}
                      </text>
                    </g>
                  )}
                </g>
              ))}
            </svg>
          )}

          <div className="flex justify-between text-[10px] text-textMuted pt-2 px-1">
            <span>{displayedWeights[0]?.date || ''}</span>
            <span>{displayedWeights[displayedWeights.length - 1]?.date || ''}</span>
          </div>
        </div>
      </div>

      {/* 1RM Strength Progression Chart */}
      <div className="bg-surface rounded-2xl p-4 border border-border-subtle shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-success/10 text-success">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-textPrimary">1RM Strength Milestones</h3>
                <button
                  type="button"
                  onClick={() => setShow1RMInfo(!show1RMInfo)}
                  className="text-textMuted hover:text-primary transition-colors"
                  title="What is 1RM?"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-textMuted">Estimated 1-rep max over time</p>
            </div>
          </div>
        </div>

        {/* 1RM Explanation Banner */}
        {show1RMInfo && (
          <div className="p-3 rounded-xl bg-canvas/70 border border-border-subtle text-xs text-textMuted leading-relaxed space-y-1">
            <p className="font-semibold text-textPrimary">What is 1RM (One-Rep Max)?</p>
            <p>
              1RM is the maximum weight you can lift for a single clean repetition. You do not need to test dangerous 1-rep lifts in the gym; Docket automatically calculates your estimated 1RM from every logged set using the standard Epley formula:
            </p>
            <p className="font-mono text-primary bg-canvas px-2 py-1 rounded inline-block">
              1RM = Weight × (1 + Reps / 30)
            </p>
            <p>
              This lets you track true strength progression even when training in normal hypertrophy rep ranges (like 8–10 reps).
            </p>
          </div>
        )}

        {/* Exercise Search & Clickable Selection */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-textMuted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={exerciseSearchQuery}
              onChange={(e) => setExerciseSearchQuery(e.target.value)}
              placeholder="Search exercise for 1RM (e.g. Bench, Squat)…"
              className="w-full bg-canvas border border-border-subtle rounded-xl pl-8 pr-8 py-2 text-xs text-textPrimary focus:outline-none focus:border-primary placeholder:text-textMuted/40"
            />
            {exerciseSearchQuery && (
              <button
                type="button"
                onClick={() => setExerciseSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-textMuted hover:text-textPrimary"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Instant Clickable Search Results Dropdown */}
          {exerciseSearchQuery.trim() !== '' && (
            <div className="bg-canvas border border-primary/30 rounded-xl p-1.5 max-h-48 overflow-y-auto space-y-1 shadow-lg animate-fade-in">
              <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider px-2 py-0.5 block">
                Tap to Select Exercise ({filteredLiftingExercises.length}):
              </span>
              {filteredLiftingExercises.length === 0 ? (
                <p className="text-xs text-textMuted px-2 py-2 italic text-center">No matching exercises found.</p>
              ) : (
                filteredLiftingExercises.map((ex) => {
                  const isSelected = ex.id === Number(selectedExerciseId);
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => {
                        setSelectedExerciseId(ex.id!);
                        setExerciseSearchQuery('');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left ${
                        isSelected
                          ? 'bg-primary text-canvas font-bold'
                          : 'bg-surface hover:bg-surface/80 text-textPrimary border border-border-subtle/50'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <Dumbbell className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{ex.name}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold flex-shrink-0 ml-2 ${
                        isSelected ? 'bg-canvas/20 text-canvas' : 'bg-canvas text-textMuted'
                      }`}>
                        {ex.category}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Active Selected Exercise Pill / Quick Selector */}
          {selectedEx && !exerciseSearchQuery && (
            <div className="flex items-center justify-between p-2.5 bg-canvas/60 rounded-xl border border-border-subtle text-xs">
              <div className="flex items-center space-x-2 truncate">
                <Dumbbell className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="font-bold text-textPrimary truncate">{selectedEx.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold uppercase flex-shrink-0">
                  {selectedEx.category}
                </span>
              </div>
              <select
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value ? Number(e.target.value) : '')}
                className="bg-transparent text-[11px] font-semibold text-primary focus:outline-none cursor-pointer max-w-[120px]"
                title="Choose another exercise"
              >
                {allExercises
                  .filter((e) => e.type === 'lifting')
                  .map((ex) => (
                    <option key={ex.id} value={ex.id} className="bg-surface text-textPrimary">
                      {ex.name}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>

        {/* Milestones History Table */}
        <div className="bg-canvas/70 rounded-xl p-3 border border-border-subtle space-y-2">
          {exerciseLogs.length === 0 ? (
            <p className="text-center text-xs text-textMuted py-4">
              No completed logs for {selectedEx?.name || 'this exercise'} yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-textMuted uppercase tracking-wider px-1">
                <span>Date</span>
                <span>Best Lift</span>
                <span>Est. 1RM</span>
              </div>
              {exerciseLogs.slice(-8).map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-2 rounded-lg bg-surface border border-border-subtle/60 text-xs"
                >
                  <span className="text-textMuted font-medium">{item.date}</span>
                  <span className="font-bold text-textPrimary">
                    {item.bestWeight} {settings.weightUnit} × {item.bestReps}
                  </span>
                  <span className="font-bold text-success px-2 py-0.5 rounded bg-success/10 font-mono">
                    {item.est1RM} {settings.weightUnit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 7-Day Macro Averages */}
      <div className="bg-surface rounded-2xl p-4 border border-border-subtle shadow-sm space-y-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Utensils className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-textPrimary">7-Day Macro Averages</h3>
            <p className="text-[11px] text-textMuted">Average intake vs target goals</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-canvas/70 rounded-xl p-3 border border-border-subtle">
            <span className="text-[10px] font-semibold text-textMuted uppercase block">Calories</span>
            <span className="text-lg font-bold text-primary mt-0.5 block">
              {avgCalories.toLocaleString()} <span className="text-xs text-textMuted font-normal">kcal</span>
            </span>
            <span className="text-[10px] text-textMuted">Target: {settings.calorieTarget} kcal</span>
          </div>

          <div className="bg-canvas/70 rounded-xl p-3 border border-border-subtle">
            <span className="text-[10px] font-semibold text-textMuted uppercase block">Protein</span>
            <span className="text-lg font-bold text-success mt-0.5 block">
              {avgProtein} <span className="text-xs text-textMuted font-normal">g</span>
            </span>
            <span className="text-[10px] text-textMuted">Target: {settings.proteinTarget}g</span>
          </div>

          <div className="bg-canvas/70 rounded-xl p-3 border border-border-subtle">
            <span className="text-[10px] font-semibold text-textMuted uppercase block">Carbohydrates</span>
            <span className="text-lg font-bold text-sky-400 mt-0.5 block">
              {avgCarbs} <span className="text-xs text-textMuted font-normal">g</span>
            </span>
            <span className="text-[10px] text-textMuted">Target: {settings.carbsTarget}g</span>
          </div>

          <div className="bg-canvas/70 rounded-xl p-3 border border-border-subtle">
            <span className="text-[10px] font-semibold text-textMuted uppercase block">Fats</span>
            <span className="text-lg font-bold text-violet-400 mt-0.5 block">
              {avgFats} <span className="text-xs text-textMuted font-normal">g</span>
            </span>
            <span className="text-[10px] text-textMuted">Target: {settings.fatsTarget}g</span>
          </div>
        </div>
      </div>
    </div>
  );
};
