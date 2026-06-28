/**
 * Estimated one-rep max via the Epley formula: `weight · (1 + reps/30)`.
 * Computed from the *actual* logged weight/reps and rounded to 2 decimals.
 */
export function epleyOneRepMax(weightKg: number, reps: number): number {
    return Math.round(weightKg * (1 + reps / 30) * 100) / 100
}
