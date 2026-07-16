import { graphql } from '@/lib/graphql/__generated__'

// ── Exercises catalog (admin) ────────────────────────────────

export const AdminExercisesDocument = graphql(`
    query AdminExercises(
        $categories: [String!]
        $equipment: [String!]
        $muscles: [String!]
        $search: String
        $limit: Int
        $offset: Int
    ) {
        adminExercises(
            categories: $categories
            equipment: $equipment
            muscles: $muscles
            search: $search
            limit: $limit
            offset: $offset
        ) {
            rows {
                id
                slug
                name
                nameEs
                category
                equipment
                primaryMuscle
            }
            total
            limit
            offset
        }
    }
`)

export const CreateExerciseDocument = graphql(`
    mutation CreateExercise($input: CreateExerciseInput!) {
        createExercise(input: $input) {
            id
            slug
            name
            category
            equipment
            primaryMuscle
        }
    }
`)

export const UpdateExerciseDocument = graphql(`
    mutation UpdateExercise($input: UpdateExerciseInput!) {
        updateExercise(input: $input) {
            id
            slug
            name
            category
            equipment
            primaryMuscle
        }
    }
`)

export const DeleteExerciseDocument = graphql(`
    mutation DeleteExercise($exerciseId: ID!) {
        deleteExercise(exerciseId: $exerciseId)
    }
`)

// ── dashboard stats ──────────────────────────────────────────

export const AdminStatsDocument = graphql(`
    query AdminStats {
        apiVersion
        adminUserStats {
            total
            athletes
            coaches
            admins
            verified
            active
            disabled
            newLast7Days
            newLast30Days
        }
        adminCoachingStats {
            links
            activeCoaches
            linkedAthletes
            pendingInvitations
        }
        adminWorkoutStats {
            sessions
            completedSessions
            sets
            exercises
            sessionsLast7Days
            activeUsers
        }
    }
`)

// ── users ────────────────────────────────────────────────────

export const AdminUsersDocument = graphql(`
    query AdminUsers(
        $roles: [String!]
        $statuses: [String!]
        $isAdmin: Boolean
        $verified: Boolean
        $search: String
        $plans: [String!]
        $limit: Int
        $offset: Int
    ) {
        adminUsers(
            roles: $roles
            statuses: $statuses
            isAdmin: $isAdmin
            verified: $verified
            search: $search
            plans: $plans
            limit: $limit
            offset: $offset
        ) {
            rows {
                id
                email
                username
                role
                isAdmin
                status
                emailVerified
                plan
                createdAt
            }
            total
            limit
            offset
        }
    }
`)

export const SetUserRoleDocument = graphql(`
    mutation SetUserRole($input: SetUserRoleInput!) {
        setUserRole(input: $input) {
            id
            role
        }
    }
`)

export const SetUserAdminDocument = graphql(`
    mutation SetUserAdmin($input: SetUserAdminInput!) {
        setUserAdmin(input: $input) {
            id
            isAdmin
        }
    }
`)

export const SetUserStatusDocument = graphql(`
    mutation SetUserStatus($input: SetUserStatusInput!) {
        setUserStatus(input: $input) {
            id
            status
        }
    }
`)
