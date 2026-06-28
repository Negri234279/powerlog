/**
 * Ordinary least-squares trend over (x, y) points and a forward projection of
 * estimated 1RM. Pure + deterministic so it can be unit-tested without infra;
 * the read model supplies the raw e1RM-per-session points, this turns them into
 * a slope and a forecast for the analytics dashboard.
 */
export interface TrendLine {
    /** Change in y per unit of x (x is in weeks → kg per week). */
    slope: number
    /** y at x = 0. */
    intercept: number
    /** Coefficient of determination (R²) in [0, 1]; fit quality. */
    r2: number
}

/** A single observation: `x` weeks since the first point, `y` the e1RM in kg. */
export interface TrendPoint {
    x: number
    y: number
}

/**
 * Least-squares fit. Returns `null` when a line is undefined or meaningless:
 * fewer than two points, or zero variance in x (every point on the same day).
 */
export function linearRegression(points: readonly TrendPoint[]): TrendLine | null {
    const n = points.length
    if (n < 2) return null

    let sumX = 0
    let sumY = 0

    for (const p of points) {
        sumX += p.x
        sumY += p.y
    }

    const meanX = sumX / n
    const meanY = sumY / n

    let ssXX = 0
    let ssYY = 0
    let ssXY = 0

    for (const p of points) {
        const dx = p.x - meanX
        const dy = p.y - meanY
        ssXX += dx * dx
        ssYY += dy * dy
        ssXY += dx * dy
    }

    if (ssXX === 0) return null

    const slope = ssXY / ssXX
    const intercept = meanY - slope * meanX
    // R² = (covariance² / (varX·varY)); when y is constant the fit is perfect.
    const r2 = ssYY === 0 ? 1 : (ssXY * ssXY) / (ssXX * ssYY)

    return {
        slope,
        intercept,
        r2: Math.round(r2 * 1000) / 1000,
    }
}

/** y on the trend line at a given x, rounded to 2 decimals (kg). */
export function projectAt(line: TrendLine, x: number): number {
    return Math.round((line.intercept + line.slope * x) * 100) / 100
}
