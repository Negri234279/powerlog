import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { linearRegression, projectAt, type TrendPoint } from '../../../domain/strength-projection'
import { type StrengthPointRow, TrainingDashboardReadModel } from '../../ports/training-dashboard.read-model'
import { GetStrengthProgressionQuery } from './get-strength-progression.query'

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000
const PROJECTION_WEEKS = [4, 8, 12] as const

/** A future e1RM estimate `weeks` ahead of the last data point. */
export interface StrengthProjection {
    weeks: number
    e1rmKg: number
}

/** Linear trend over the e1RM points plus forward projections. */
export interface StrengthTrend {
    /** kg gained per week (negative = regressing). */
    slopePerWeekKg: number
    /** Fit quality R² in [0, 1]. */
    r2: number
    projections: StrengthProjection[]
}

/** Progression series for one exercise plus its trend (null when < 2 points). */
export interface StrengthProgressionView {
    points: StrengthPointRow[]
    trend: StrengthTrend | null
}

@QueryHandler(GetStrengthProgressionQuery)
export class GetStrengthProgressionHandler implements IQueryHandler<
    GetStrengthProgressionQuery,
    StrengthProgressionView
> {
    constructor(private readonly dashboard: TrainingDashboardReadModel) {}

    async execute(query: GetStrengthProgressionQuery): Promise<StrengthProgressionView> {
        const points = await this.dashboard.strengthSeries({
            userId: query.userId,
            exerciseId: query.exerciseId,
            from: query.from ? new Date(query.from) : undefined,
            to: query.to ? new Date(query.to) : undefined,
        })

        return { points, trend: this.trendOf(points) }
    }

    /** Fit x = weeks-since-first, y = e1RM; project from the last point forward. */
    private trendOf(points: StrengthPointRow[]): StrengthTrend | null {
        if (points.length < 2) return null

        const firstAt = points[0]!.performedAt.getTime()
        const trendPoints: TrendPoint[] = points.map((p) => ({
            x: (p.performedAt.getTime() - firstAt) / MS_PER_WEEK,
            y: p.e1rmKg,
        }))

        const line = linearRegression(trendPoints)
        if (!line) return null

        const lastX = trendPoints[trendPoints.length - 1]!.x
        return {
            slopePerWeekKg: Math.round(line.slope * 100) / 100,
            r2: line.r2,
            projections: PROJECTION_WEEKS.map((weeks) => ({ weeks, e1rmKg: projectAt(line, lastX + weeks) })),
        }
    }
}
