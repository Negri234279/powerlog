/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n    query AdminExercises(\n        $categories: [String!]\n        $equipment: [String!]\n        $muscles: [String!]\n        $search: String\n        $limit: Int\n        $offset: Int\n    ) {\n        adminExercises(\n            categories: $categories\n            equipment: $equipment\n            muscles: $muscles\n            search: $search\n            limit: $limit\n            offset: $offset\n        ) {\n            rows {\n                id\n                slug\n                name\n                nameEs\n                category\n                equipment\n                primaryMuscle\n            }\n            total\n            limit\n            offset\n        }\n    }\n": typeof types.AdminExercisesDocument,
    "\n    mutation CreateExercise($input: CreateExerciseInput!) {\n        createExercise(input: $input) {\n            id\n            slug\n            name\n            category\n            equipment\n            primaryMuscle\n        }\n    }\n": typeof types.CreateExerciseDocument,
    "\n    mutation UpdateExercise($input: UpdateExerciseInput!) {\n        updateExercise(input: $input) {\n            id\n            slug\n            name\n            category\n            equipment\n            primaryMuscle\n        }\n    }\n": typeof types.UpdateExerciseDocument,
    "\n    mutation DeleteExercise($exerciseId: ID!) {\n        deleteExercise(exerciseId: $exerciseId)\n    }\n": typeof types.DeleteExerciseDocument,
    "\n    query AdminStats {\n        adminUserStats {\n            total\n            athletes\n            coaches\n            admins\n            verified\n            active\n            disabled\n            newLast7Days\n            newLast30Days\n        }\n        adminCoachingStats {\n            links\n            activeCoaches\n            linkedAthletes\n            pendingInvitations\n        }\n        adminWorkoutStats {\n            sessions\n            completedSessions\n            sets\n            exercises\n            sessionsLast7Days\n            activeUsers\n        }\n    }\n": typeof types.AdminStatsDocument,
    "\n    query AdminUsers(\n        $roles: [String!]\n        $statuses: [String!]\n        $isAdmin: Boolean\n        $verified: Boolean\n        $search: String\n        $limit: Int\n        $offset: Int\n    ) {\n        adminUsers(\n            roles: $roles\n            statuses: $statuses\n            isAdmin: $isAdmin\n            verified: $verified\n            search: $search\n            limit: $limit\n            offset: $offset\n        ) {\n            rows {\n                id\n                email\n                username\n                role\n                isAdmin\n                status\n                emailVerified\n                createdAt\n            }\n            total\n            limit\n            offset\n        }\n    }\n": typeof types.AdminUsersDocument,
    "\n    mutation SetUserRole($input: SetUserRoleInput!) {\n        setUserRole(input: $input) {\n            id\n            role\n        }\n    }\n": typeof types.SetUserRoleDocument,
    "\n    mutation SetUserAdmin($input: SetUserAdminInput!) {\n        setUserAdmin(input: $input) {\n            id\n            isAdmin\n        }\n    }\n": typeof types.SetUserAdminDocument,
    "\n    mutation SetUserStatus($input: SetUserStatusInput!) {\n        setUserStatus(input: $input) {\n            id\n            status\n        }\n    }\n": typeof types.SetUserStatusDocument,
    "\n    query Me {\n        me {\n            id\n            email\n            username\n            role\n            isAdmin\n            units\n            emailVerified\n            hasPassword\n            createdAt\n        }\n    }\n": typeof types.MeDocument,
    "\n    mutation Register($input: RegisterInput!) {\n        register(input: $input) {\n            id\n        }\n    }\n": typeof types.RegisterDocument,
    "\n    mutation Login($input: LoginInput!) {\n        login(input: $input) {\n            id\n        }\n    }\n": typeof types.LoginDocument,
    "\n    mutation Logout {\n        logout\n    }\n": typeof types.LogoutDocument,
    "\n    mutation Refresh {\n        refresh {\n            id\n        }\n    }\n": typeof types.RefreshDocument,
    "\n    mutation DeleteAccount {\n        deleteAccount\n    }\n": typeof types.DeleteAccountDocument,
    "\n    mutation ChangePassword($input: ChangePasswordInput!) {\n        changePassword(input: $input)\n    }\n": typeof types.ChangePasswordDocument,
    "\n    mutation VerifyEmail($token: String!) {\n        verifyEmail(token: $token)\n    }\n": typeof types.VerifyEmailDocument,
    "\n    mutation ResendEmailVerification {\n        resendEmailVerification\n    }\n": typeof types.ResendEmailVerificationDocument,
    "\n    mutation ForgotPassword($email: String!) {\n        forgotPassword(email: $email)\n    }\n": typeof types.ForgotPasswordDocument,
    "\n    mutation ResetPassword($input: ResetPasswordInput!) {\n        resetPassword(input: $input)\n    }\n": typeof types.ResetPasswordDocument,
    "\n    query MySessions {\n        mySessions {\n            id\n            current\n            userAgent\n            ip\n            lastUsedAt\n        }\n    }\n": typeof types.MySessionsDocument,
    "\n    mutation RevokeSession($id: String!) {\n        revokeSession(id: $id)\n    }\n": typeof types.RevokeSessionDocument,
    "\n    mutation RevokeOtherSessions {\n        revokeOtherSessions\n    }\n": typeof types.RevokeOtherSessionsDocument,
    "\n    query Ping {\n        ping\n    }\n": typeof types.PingDocument,
    "\n    query MyProfile {\n        myProfile {\n            userId\n            displayName\n            firstName\n            lastName\n            birthDate\n            sex\n            heightCm\n            bio\n            country\n            timezone\n            locale\n            avatarUrl\n            createdAt\n            updatedAt\n        }\n    }\n": typeof types.MyProfileDocument,
    "\n    mutation UpdateProfile($input: UpdateProfileInput!) {\n        updateProfile(input: $input) {\n            userId\n            displayName\n            firstName\n            lastName\n            birthDate\n            sex\n            heightCm\n            bio\n            country\n            timezone\n            locale\n            avatarUrl\n        }\n    }\n": typeof types.UpdateProfileDocument,
    "\n    fragment WorkoutTemplateFields on WorkoutTemplate {\n        id\n        ownerId\n        name\n        notes\n        createdAt\n        updatedAt\n        exercises {\n            id\n            exerciseId\n            order\n            notes\n            sets {\n                id\n                order\n                plannedWeightKg\n                plannedReps\n                rpe\n                rir\n                notes\n            }\n        }\n    }\n": typeof types.WorkoutTemplateFieldsFragmentDoc,
    "\n    query WorkoutTemplates($search: String) {\n        workoutTemplates(search: $search) {\n            id\n            name\n            notes\n            updatedAt\n            exerciseCount\n            setCount\n        }\n    }\n": typeof types.WorkoutTemplatesDocument,
    "\n    query WorkoutTemplate($id: ID!) {\n        workoutTemplate(id: $id) {\n            ...WorkoutTemplateFields\n        }\n    }\n": typeof types.WorkoutTemplateDocument,
    "\n    mutation CreateWorkoutTemplate($input: WorkoutTemplateInput!) {\n        createWorkoutTemplate(input: $input) {\n            ...WorkoutTemplateFields\n        }\n    }\n": typeof types.CreateWorkoutTemplateDocument,
    "\n    mutation UpdateWorkoutTemplate($id: ID!, $input: WorkoutTemplateInput!) {\n        updateWorkoutTemplate(id: $id, input: $input) {\n            ...WorkoutTemplateFields\n        }\n    }\n": typeof types.UpdateWorkoutTemplateDocument,
    "\n    mutation DeleteWorkoutTemplate($id: ID!) {\n        deleteWorkoutTemplate(id: $id)\n    }\n": typeof types.DeleteWorkoutTemplateDocument,
    "\n    mutation CreateSessionFromTemplate($input: CreateSessionFromTemplateInput!) {\n        createSessionFromTemplate(input: $input) {\n            ...WorkoutSessionFields\n        }\n    }\n": typeof types.CreateSessionFromTemplateDocument,
    "\n    fragment WorkoutSessionFields on WorkoutSession {\n        id\n        userId\n        status\n        performedAt\n        notes\n        plannedByUserId\n        createdAt\n        updatedAt\n        entries {\n            id\n            exerciseId\n            order\n            notes\n            sets {\n                id\n                order\n                plannedWeightKg\n                plannedReps\n                weightKg\n                reps\n                rpe\n                rir\n                e1rmKg\n                notes\n            }\n        }\n    }\n": typeof types.WorkoutSessionFieldsFragmentDoc,
    "\n    query Exercises($category: String) {\n        exercises(category: $category) {\n            id\n            slug\n            name\n            category\n            equipment\n            primaryMuscle\n        }\n    }\n": typeof types.ExercisesDocument,
    "\n    query WorkoutSession($id: ID!) {\n        workoutSession(id: $id) {\n            ...WorkoutSessionFields\n        }\n    }\n": typeof types.WorkoutSessionDocument,
    "\n    query WorkoutHistory(\n        $cursor: String\n        $limit: Int\n        $status: String\n        $from: String\n        $to: String\n        $exerciseId: ID\n        $query: String\n    ) {\n        workoutHistory(\n            cursor: $cursor\n            limit: $limit\n            status: $status\n            from: $from\n            to: $to\n            exerciseId: $exerciseId\n            query: $query\n        ) {\n            items {\n                id\n                userId\n                status\n                performedAt\n                notes\n                plannedByUserId\n                exerciseCount\n                setCount\n                totalVolumeKg\n                createdAt\n                updatedAt\n            }\n            nextCursor\n            hasNextPage\n        }\n    }\n": typeof types.WorkoutHistoryDocument,
    "\n    query ExerciseStats($from: String, $to: String) {\n        exerciseStats(from: $from, to: $to) {\n            exerciseId\n            slug\n            name\n            category\n            totalVolumeKg\n            totalSets\n            totalReps\n            bestE1rmKg\n            heaviestWeightKg\n        }\n    }\n": typeof types.ExerciseStatsDocument,
    "\n    query ExerciseSessionHistory($exerciseId: ID!, $excludeSessionId: ID, $limit: Int) {\n        exerciseSessionHistory(exerciseId: $exerciseId, excludeSessionId: $excludeSessionId, limit: $limit) {\n            sessionId\n            performedAt\n            status\n            sets {\n                plannedWeightKg\n                plannedReps\n                weightKg\n                reps\n                rpe\n                rir\n                e1rmKg\n            }\n        }\n    }\n": typeof types.ExerciseSessionHistoryDocument,
    "\n    query TrainingSummary($from: String, $to: String) {\n        trainingSummary(from: $from, to: $to) {\n            sessions\n            trainingDays\n            totalSets\n            totalReps\n            totalVolumeKg\n            avgRpe\n            distinctExercises\n            bestSquatE1rmKg\n            bestBenchE1rmKg\n            bestDeadliftE1rmKg\n            estimatedTotalKg\n        }\n    }\n": typeof types.TrainingSummaryDocument,
    "\n    query VolumeSeries($from: String, $to: String) {\n        volumeSeries(from: $from, to: $to) {\n            bucketStart\n            totalVolumeKg\n            totalSets\n            sessions\n        }\n    }\n": typeof types.VolumeSeriesDocument,
    "\n    query StrengthProgression($exerciseId: ID!, $from: String, $to: String) {\n        strengthProgression(exerciseId: $exerciseId, from: $from, to: $to) {\n            points {\n                performedAt\n                e1rmKg\n            }\n            trend {\n                slopePerWeekKg\n                r2\n                projections {\n                    weeks\n                    e1rmKg\n                }\n            }\n        }\n    }\n": typeof types.StrengthProgressionDocument,
    "\n    query TrainingDistribution($from: String, $to: String) {\n        trainingDistribution(from: $from, to: $to) {\n            byMuscle {\n                key\n                totalVolumeKg\n                totalSets\n            }\n            byCategory {\n                key\n                totalVolumeKg\n                totalSets\n            }\n            rpe {\n                value\n                sets\n            }\n            rir {\n                value\n                sets\n            }\n        }\n    }\n": typeof types.TrainingDistributionDocument,
    "\n    mutation CreateWorkoutSession($input: CreateWorkoutSessionInput) {\n        createWorkoutSession(input: $input) {\n            ...WorkoutSessionFields\n        }\n    }\n": typeof types.CreateWorkoutSessionDocument,
    "\n    mutation AddExerciseEntry($input: AddExerciseEntryInput!) {\n        addExerciseEntry(input: $input) {\n            ...WorkoutSessionFields\n        }\n    }\n": typeof types.AddExerciseEntryDocument,
    "\n    mutation RemoveExerciseEntry($sessionId: ID!, $entryId: ID!) {\n        removeExerciseEntry(sessionId: $sessionId, entryId: $entryId) {\n            ...WorkoutSessionFields\n        }\n    }\n": typeof types.RemoveExerciseEntryDocument,
    "\n    mutation LogSet($input: LogSetInput!) {\n        logSet(input: $input) {\n            ...WorkoutSessionFields\n        }\n    }\n": typeof types.LogSetDocument,
    "\n    mutation UpdateSet($input: UpdateSetInput!) {\n        updateSet(input: $input) {\n            ...WorkoutSessionFields\n        }\n    }\n": typeof types.UpdateSetDocument,
    "\n    mutation RemoveSet($sessionId: ID!, $entryId: ID!, $setId: ID!) {\n        removeSet(sessionId: $sessionId, entryId: $entryId, setId: $setId) {\n            ...WorkoutSessionFields\n        }\n    }\n": typeof types.RemoveSetDocument,
    "\n    mutation UpdateWorkoutSession($input: UpdateWorkoutSessionInput!) {\n        updateWorkoutSession(input: $input) {\n            ...WorkoutSessionFields\n        }\n    }\n": typeof types.UpdateWorkoutSessionDocument,
    "\n    mutation CompleteWorkoutSession($id: ID!) {\n        completeWorkoutSession(id: $id) {\n            ...WorkoutSessionFields\n        }\n    }\n": typeof types.CompleteWorkoutSessionDocument,
    "\n    mutation DeleteWorkoutSession($id: ID!) {\n        deleteWorkoutSession(id: $id)\n    }\n": typeof types.DeleteWorkoutSessionDocument,
};
const documents: Documents = {
    "\n    query AdminExercises(\n        $categories: [String!]\n        $equipment: [String!]\n        $muscles: [String!]\n        $search: String\n        $limit: Int\n        $offset: Int\n    ) {\n        adminExercises(\n            categories: $categories\n            equipment: $equipment\n            muscles: $muscles\n            search: $search\n            limit: $limit\n            offset: $offset\n        ) {\n            rows {\n                id\n                slug\n                name\n                nameEs\n                category\n                equipment\n                primaryMuscle\n            }\n            total\n            limit\n            offset\n        }\n    }\n": types.AdminExercisesDocument,
    "\n    mutation CreateExercise($input: CreateExerciseInput!) {\n        createExercise(input: $input) {\n            id\n            slug\n            name\n            category\n            equipment\n            primaryMuscle\n        }\n    }\n": types.CreateExerciseDocument,
    "\n    mutation UpdateExercise($input: UpdateExerciseInput!) {\n        updateExercise(input: $input) {\n            id\n            slug\n            name\n            category\n            equipment\n            primaryMuscle\n        }\n    }\n": types.UpdateExerciseDocument,
    "\n    mutation DeleteExercise($exerciseId: ID!) {\n        deleteExercise(exerciseId: $exerciseId)\n    }\n": types.DeleteExerciseDocument,
    "\n    query AdminStats {\n        adminUserStats {\n            total\n            athletes\n            coaches\n            admins\n            verified\n            active\n            disabled\n            newLast7Days\n            newLast30Days\n        }\n        adminCoachingStats {\n            links\n            activeCoaches\n            linkedAthletes\n            pendingInvitations\n        }\n        adminWorkoutStats {\n            sessions\n            completedSessions\n            sets\n            exercises\n            sessionsLast7Days\n            activeUsers\n        }\n    }\n": types.AdminStatsDocument,
    "\n    query AdminUsers(\n        $roles: [String!]\n        $statuses: [String!]\n        $isAdmin: Boolean\n        $verified: Boolean\n        $search: String\n        $limit: Int\n        $offset: Int\n    ) {\n        adminUsers(\n            roles: $roles\n            statuses: $statuses\n            isAdmin: $isAdmin\n            verified: $verified\n            search: $search\n            limit: $limit\n            offset: $offset\n        ) {\n            rows {\n                id\n                email\n                username\n                role\n                isAdmin\n                status\n                emailVerified\n                createdAt\n            }\n            total\n            limit\n            offset\n        }\n    }\n": types.AdminUsersDocument,
    "\n    mutation SetUserRole($input: SetUserRoleInput!) {\n        setUserRole(input: $input) {\n            id\n            role\n        }\n    }\n": types.SetUserRoleDocument,
    "\n    mutation SetUserAdmin($input: SetUserAdminInput!) {\n        setUserAdmin(input: $input) {\n            id\n            isAdmin\n        }\n    }\n": types.SetUserAdminDocument,
    "\n    mutation SetUserStatus($input: SetUserStatusInput!) {\n        setUserStatus(input: $input) {\n            id\n            status\n        }\n    }\n": types.SetUserStatusDocument,
    "\n    query Me {\n        me {\n            id\n            email\n            username\n            role\n            isAdmin\n            units\n            emailVerified\n            hasPassword\n            createdAt\n        }\n    }\n": types.MeDocument,
    "\n    mutation Register($input: RegisterInput!) {\n        register(input: $input) {\n            id\n        }\n    }\n": types.RegisterDocument,
    "\n    mutation Login($input: LoginInput!) {\n        login(input: $input) {\n            id\n        }\n    }\n": types.LoginDocument,
    "\n    mutation Logout {\n        logout\n    }\n": types.LogoutDocument,
    "\n    mutation Refresh {\n        refresh {\n            id\n        }\n    }\n": types.RefreshDocument,
    "\n    mutation DeleteAccount {\n        deleteAccount\n    }\n": types.DeleteAccountDocument,
    "\n    mutation ChangePassword($input: ChangePasswordInput!) {\n        changePassword(input: $input)\n    }\n": types.ChangePasswordDocument,
    "\n    mutation VerifyEmail($token: String!) {\n        verifyEmail(token: $token)\n    }\n": types.VerifyEmailDocument,
    "\n    mutation ResendEmailVerification {\n        resendEmailVerification\n    }\n": types.ResendEmailVerificationDocument,
    "\n    mutation ForgotPassword($email: String!) {\n        forgotPassword(email: $email)\n    }\n": types.ForgotPasswordDocument,
    "\n    mutation ResetPassword($input: ResetPasswordInput!) {\n        resetPassword(input: $input)\n    }\n": types.ResetPasswordDocument,
    "\n    query MySessions {\n        mySessions {\n            id\n            current\n            userAgent\n            ip\n            lastUsedAt\n        }\n    }\n": types.MySessionsDocument,
    "\n    mutation RevokeSession($id: String!) {\n        revokeSession(id: $id)\n    }\n": types.RevokeSessionDocument,
    "\n    mutation RevokeOtherSessions {\n        revokeOtherSessions\n    }\n": types.RevokeOtherSessionsDocument,
    "\n    query Ping {\n        ping\n    }\n": types.PingDocument,
    "\n    query MyProfile {\n        myProfile {\n            userId\n            displayName\n            firstName\n            lastName\n            birthDate\n            sex\n            heightCm\n            bio\n            country\n            timezone\n            locale\n            avatarUrl\n            createdAt\n            updatedAt\n        }\n    }\n": types.MyProfileDocument,
    "\n    mutation UpdateProfile($input: UpdateProfileInput!) {\n        updateProfile(input: $input) {\n            userId\n            displayName\n            firstName\n            lastName\n            birthDate\n            sex\n            heightCm\n            bio\n            country\n            timezone\n            locale\n            avatarUrl\n        }\n    }\n": types.UpdateProfileDocument,
    "\n    fragment WorkoutTemplateFields on WorkoutTemplate {\n        id\n        ownerId\n        name\n        notes\n        createdAt\n        updatedAt\n        exercises {\n            id\n            exerciseId\n            order\n            notes\n            sets {\n                id\n                order\n                plannedWeightKg\n                plannedReps\n                rpe\n                rir\n                notes\n            }\n        }\n    }\n": types.WorkoutTemplateFieldsFragmentDoc,
    "\n    query WorkoutTemplates($search: String) {\n        workoutTemplates(search: $search) {\n            id\n            name\n            notes\n            updatedAt\n            exerciseCount\n            setCount\n        }\n    }\n": types.WorkoutTemplatesDocument,
    "\n    query WorkoutTemplate($id: ID!) {\n        workoutTemplate(id: $id) {\n            ...WorkoutTemplateFields\n        }\n    }\n": types.WorkoutTemplateDocument,
    "\n    mutation CreateWorkoutTemplate($input: WorkoutTemplateInput!) {\n        createWorkoutTemplate(input: $input) {\n            ...WorkoutTemplateFields\n        }\n    }\n": types.CreateWorkoutTemplateDocument,
    "\n    mutation UpdateWorkoutTemplate($id: ID!, $input: WorkoutTemplateInput!) {\n        updateWorkoutTemplate(id: $id, input: $input) {\n            ...WorkoutTemplateFields\n        }\n    }\n": types.UpdateWorkoutTemplateDocument,
    "\n    mutation DeleteWorkoutTemplate($id: ID!) {\n        deleteWorkoutTemplate(id: $id)\n    }\n": types.DeleteWorkoutTemplateDocument,
    "\n    mutation CreateSessionFromTemplate($input: CreateSessionFromTemplateInput!) {\n        createSessionFromTemplate(input: $input) {\n            ...WorkoutSessionFields\n        }\n    }\n": types.CreateSessionFromTemplateDocument,
    "\n    fragment WorkoutSessionFields on WorkoutSession {\n        id\n        userId\n        status\n        performedAt\n        notes\n        plannedByUserId\n        createdAt\n        updatedAt\n        entries {\n            id\n            exerciseId\n            order\n            notes\n            sets {\n                id\n                order\n                plannedWeightKg\n                plannedReps\n                weightKg\n                reps\n                rpe\n                rir\n                e1rmKg\n                notes\n            }\n        }\n    }\n": types.WorkoutSessionFieldsFragmentDoc,
    "\n    query Exercises($category: String) {\n        exercises(category: $category) {\n            id\n            slug\n            name\n            category\n            equipment\n            primaryMuscle\n        }\n    }\n": types.ExercisesDocument,
    "\n    query WorkoutSession($id: ID!) {\n        workoutSession(id: $id) {\n            ...WorkoutSessionFields\n        }\n    }\n": types.WorkoutSessionDocument,
    "\n    query WorkoutHistory(\n        $cursor: String\n        $limit: Int\n        $status: String\n        $from: String\n        $to: String\n        $exerciseId: ID\n        $query: String\n    ) {\n        workoutHistory(\n            cursor: $cursor\n            limit: $limit\n            status: $status\n            from: $from\n            to: $to\n            exerciseId: $exerciseId\n            query: $query\n        ) {\n            items {\n                id\n                userId\n                status\n                performedAt\n                notes\n                plannedByUserId\n                exerciseCount\n                setCount\n                totalVolumeKg\n                createdAt\n                updatedAt\n            }\n            nextCursor\n            hasNextPage\n        }\n    }\n": types.WorkoutHistoryDocument,
    "\n    query ExerciseStats($from: String, $to: String) {\n        exerciseStats(from: $from, to: $to) {\n            exerciseId\n            slug\n            name\n            category\n            totalVolumeKg\n            totalSets\n            totalReps\n            bestE1rmKg\n            heaviestWeightKg\n        }\n    }\n": types.ExerciseStatsDocument,
    "\n    query ExerciseSessionHistory($exerciseId: ID!, $excludeSessionId: ID, $limit: Int) {\n        exerciseSessionHistory(exerciseId: $exerciseId, excludeSessionId: $excludeSessionId, limit: $limit) {\n            sessionId\n            performedAt\n            status\n            sets {\n                plannedWeightKg\n                plannedReps\n                weightKg\n                reps\n                rpe\n                rir\n                e1rmKg\n            }\n        }\n    }\n": types.ExerciseSessionHistoryDocument,
    "\n    query TrainingSummary($from: String, $to: String) {\n        trainingSummary(from: $from, to: $to) {\n            sessions\n            trainingDays\n            totalSets\n            totalReps\n            totalVolumeKg\n            avgRpe\n            distinctExercises\n            bestSquatE1rmKg\n            bestBenchE1rmKg\n            bestDeadliftE1rmKg\n            estimatedTotalKg\n        }\n    }\n": types.TrainingSummaryDocument,
    "\n    query VolumeSeries($from: String, $to: String) {\n        volumeSeries(from: $from, to: $to) {\n            bucketStart\n            totalVolumeKg\n            totalSets\n            sessions\n        }\n    }\n": types.VolumeSeriesDocument,
    "\n    query StrengthProgression($exerciseId: ID!, $from: String, $to: String) {\n        strengthProgression(exerciseId: $exerciseId, from: $from, to: $to) {\n            points {\n                performedAt\n                e1rmKg\n            }\n            trend {\n                slopePerWeekKg\n                r2\n                projections {\n                    weeks\n                    e1rmKg\n                }\n            }\n        }\n    }\n": types.StrengthProgressionDocument,
    "\n    query TrainingDistribution($from: String, $to: String) {\n        trainingDistribution(from: $from, to: $to) {\n            byMuscle {\n                key\n                totalVolumeKg\n                totalSets\n            }\n            byCategory {\n                key\n                totalVolumeKg\n                totalSets\n            }\n            rpe {\n                value\n                sets\n            }\n            rir {\n                value\n                sets\n            }\n        }\n    }\n": types.TrainingDistributionDocument,
    "\n    mutation CreateWorkoutSession($input: CreateWorkoutSessionInput) {\n        createWorkoutSession(input: $input) {\n            ...WorkoutSessionFields\n        }\n    }\n": types.CreateWorkoutSessionDocument,
    "\n    mutation AddExerciseEntry($input: AddExerciseEntryInput!) {\n        addExerciseEntry(input: $input) {\n            ...WorkoutSessionFields\n        }\n    }\n": types.AddExerciseEntryDocument,
    "\n    mutation RemoveExerciseEntry($sessionId: ID!, $entryId: ID!) {\n        removeExerciseEntry(sessionId: $sessionId, entryId: $entryId) {\n            ...WorkoutSessionFields\n        }\n    }\n": types.RemoveExerciseEntryDocument,
    "\n    mutation LogSet($input: LogSetInput!) {\n        logSet(input: $input) {\n            ...WorkoutSessionFields\n        }\n    }\n": types.LogSetDocument,
    "\n    mutation UpdateSet($input: UpdateSetInput!) {\n        updateSet(input: $input) {\n            ...WorkoutSessionFields\n        }\n    }\n": types.UpdateSetDocument,
    "\n    mutation RemoveSet($sessionId: ID!, $entryId: ID!, $setId: ID!) {\n        removeSet(sessionId: $sessionId, entryId: $entryId, setId: $setId) {\n            ...WorkoutSessionFields\n        }\n    }\n": types.RemoveSetDocument,
    "\n    mutation UpdateWorkoutSession($input: UpdateWorkoutSessionInput!) {\n        updateWorkoutSession(input: $input) {\n            ...WorkoutSessionFields\n        }\n    }\n": types.UpdateWorkoutSessionDocument,
    "\n    mutation CompleteWorkoutSession($id: ID!) {\n        completeWorkoutSession(id: $id) {\n            ...WorkoutSessionFields\n        }\n    }\n": types.CompleteWorkoutSessionDocument,
    "\n    mutation DeleteWorkoutSession($id: ID!) {\n        deleteWorkoutSession(id: $id)\n    }\n": types.DeleteWorkoutSessionDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query AdminExercises(\n        $categories: [String!]\n        $equipment: [String!]\n        $muscles: [String!]\n        $search: String\n        $limit: Int\n        $offset: Int\n    ) {\n        adminExercises(\n            categories: $categories\n            equipment: $equipment\n            muscles: $muscles\n            search: $search\n            limit: $limit\n            offset: $offset\n        ) {\n            rows {\n                id\n                slug\n                name\n                nameEs\n                category\n                equipment\n                primaryMuscle\n            }\n            total\n            limit\n            offset\n        }\n    }\n"): (typeof documents)["\n    query AdminExercises(\n        $categories: [String!]\n        $equipment: [String!]\n        $muscles: [String!]\n        $search: String\n        $limit: Int\n        $offset: Int\n    ) {\n        adminExercises(\n            categories: $categories\n            equipment: $equipment\n            muscles: $muscles\n            search: $search\n            limit: $limit\n            offset: $offset\n        ) {\n            rows {\n                id\n                slug\n                name\n                nameEs\n                category\n                equipment\n                primaryMuscle\n            }\n            total\n            limit\n            offset\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation CreateExercise($input: CreateExerciseInput!) {\n        createExercise(input: $input) {\n            id\n            slug\n            name\n            category\n            equipment\n            primaryMuscle\n        }\n    }\n"): (typeof documents)["\n    mutation CreateExercise($input: CreateExerciseInput!) {\n        createExercise(input: $input) {\n            id\n            slug\n            name\n            category\n            equipment\n            primaryMuscle\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation UpdateExercise($input: UpdateExerciseInput!) {\n        updateExercise(input: $input) {\n            id\n            slug\n            name\n            category\n            equipment\n            primaryMuscle\n        }\n    }\n"): (typeof documents)["\n    mutation UpdateExercise($input: UpdateExerciseInput!) {\n        updateExercise(input: $input) {\n            id\n            slug\n            name\n            category\n            equipment\n            primaryMuscle\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation DeleteExercise($exerciseId: ID!) {\n        deleteExercise(exerciseId: $exerciseId)\n    }\n"): (typeof documents)["\n    mutation DeleteExercise($exerciseId: ID!) {\n        deleteExercise(exerciseId: $exerciseId)\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query AdminStats {\n        adminUserStats {\n            total\n            athletes\n            coaches\n            admins\n            verified\n            active\n            disabled\n            newLast7Days\n            newLast30Days\n        }\n        adminCoachingStats {\n            links\n            activeCoaches\n            linkedAthletes\n            pendingInvitations\n        }\n        adminWorkoutStats {\n            sessions\n            completedSessions\n            sets\n            exercises\n            sessionsLast7Days\n            activeUsers\n        }\n    }\n"): (typeof documents)["\n    query AdminStats {\n        adminUserStats {\n            total\n            athletes\n            coaches\n            admins\n            verified\n            active\n            disabled\n            newLast7Days\n            newLast30Days\n        }\n        adminCoachingStats {\n            links\n            activeCoaches\n            linkedAthletes\n            pendingInvitations\n        }\n        adminWorkoutStats {\n            sessions\n            completedSessions\n            sets\n            exercises\n            sessionsLast7Days\n            activeUsers\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query AdminUsers(\n        $roles: [String!]\n        $statuses: [String!]\n        $isAdmin: Boolean\n        $verified: Boolean\n        $search: String\n        $limit: Int\n        $offset: Int\n    ) {\n        adminUsers(\n            roles: $roles\n            statuses: $statuses\n            isAdmin: $isAdmin\n            verified: $verified\n            search: $search\n            limit: $limit\n            offset: $offset\n        ) {\n            rows {\n                id\n                email\n                username\n                role\n                isAdmin\n                status\n                emailVerified\n                createdAt\n            }\n            total\n            limit\n            offset\n        }\n    }\n"): (typeof documents)["\n    query AdminUsers(\n        $roles: [String!]\n        $statuses: [String!]\n        $isAdmin: Boolean\n        $verified: Boolean\n        $search: String\n        $limit: Int\n        $offset: Int\n    ) {\n        adminUsers(\n            roles: $roles\n            statuses: $statuses\n            isAdmin: $isAdmin\n            verified: $verified\n            search: $search\n            limit: $limit\n            offset: $offset\n        ) {\n            rows {\n                id\n                email\n                username\n                role\n                isAdmin\n                status\n                emailVerified\n                createdAt\n            }\n            total\n            limit\n            offset\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation SetUserRole($input: SetUserRoleInput!) {\n        setUserRole(input: $input) {\n            id\n            role\n        }\n    }\n"): (typeof documents)["\n    mutation SetUserRole($input: SetUserRoleInput!) {\n        setUserRole(input: $input) {\n            id\n            role\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation SetUserAdmin($input: SetUserAdminInput!) {\n        setUserAdmin(input: $input) {\n            id\n            isAdmin\n        }\n    }\n"): (typeof documents)["\n    mutation SetUserAdmin($input: SetUserAdminInput!) {\n        setUserAdmin(input: $input) {\n            id\n            isAdmin\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation SetUserStatus($input: SetUserStatusInput!) {\n        setUserStatus(input: $input) {\n            id\n            status\n        }\n    }\n"): (typeof documents)["\n    mutation SetUserStatus($input: SetUserStatusInput!) {\n        setUserStatus(input: $input) {\n            id\n            status\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query Me {\n        me {\n            id\n            email\n            username\n            role\n            isAdmin\n            units\n            emailVerified\n            hasPassword\n            createdAt\n        }\n    }\n"): (typeof documents)["\n    query Me {\n        me {\n            id\n            email\n            username\n            role\n            isAdmin\n            units\n            emailVerified\n            hasPassword\n            createdAt\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation Register($input: RegisterInput!) {\n        register(input: $input) {\n            id\n        }\n    }\n"): (typeof documents)["\n    mutation Register($input: RegisterInput!) {\n        register(input: $input) {\n            id\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation Login($input: LoginInput!) {\n        login(input: $input) {\n            id\n        }\n    }\n"): (typeof documents)["\n    mutation Login($input: LoginInput!) {\n        login(input: $input) {\n            id\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation Logout {\n        logout\n    }\n"): (typeof documents)["\n    mutation Logout {\n        logout\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation Refresh {\n        refresh {\n            id\n        }\n    }\n"): (typeof documents)["\n    mutation Refresh {\n        refresh {\n            id\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation DeleteAccount {\n        deleteAccount\n    }\n"): (typeof documents)["\n    mutation DeleteAccount {\n        deleteAccount\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation ChangePassword($input: ChangePasswordInput!) {\n        changePassword(input: $input)\n    }\n"): (typeof documents)["\n    mutation ChangePassword($input: ChangePasswordInput!) {\n        changePassword(input: $input)\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation VerifyEmail($token: String!) {\n        verifyEmail(token: $token)\n    }\n"): (typeof documents)["\n    mutation VerifyEmail($token: String!) {\n        verifyEmail(token: $token)\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation ResendEmailVerification {\n        resendEmailVerification\n    }\n"): (typeof documents)["\n    mutation ResendEmailVerification {\n        resendEmailVerification\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation ForgotPassword($email: String!) {\n        forgotPassword(email: $email)\n    }\n"): (typeof documents)["\n    mutation ForgotPassword($email: String!) {\n        forgotPassword(email: $email)\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation ResetPassword($input: ResetPasswordInput!) {\n        resetPassword(input: $input)\n    }\n"): (typeof documents)["\n    mutation ResetPassword($input: ResetPasswordInput!) {\n        resetPassword(input: $input)\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query MySessions {\n        mySessions {\n            id\n            current\n            userAgent\n            ip\n            lastUsedAt\n        }\n    }\n"): (typeof documents)["\n    query MySessions {\n        mySessions {\n            id\n            current\n            userAgent\n            ip\n            lastUsedAt\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation RevokeSession($id: String!) {\n        revokeSession(id: $id)\n    }\n"): (typeof documents)["\n    mutation RevokeSession($id: String!) {\n        revokeSession(id: $id)\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation RevokeOtherSessions {\n        revokeOtherSessions\n    }\n"): (typeof documents)["\n    mutation RevokeOtherSessions {\n        revokeOtherSessions\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query Ping {\n        ping\n    }\n"): (typeof documents)["\n    query Ping {\n        ping\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query MyProfile {\n        myProfile {\n            userId\n            displayName\n            firstName\n            lastName\n            birthDate\n            sex\n            heightCm\n            bio\n            country\n            timezone\n            locale\n            avatarUrl\n            createdAt\n            updatedAt\n        }\n    }\n"): (typeof documents)["\n    query MyProfile {\n        myProfile {\n            userId\n            displayName\n            firstName\n            lastName\n            birthDate\n            sex\n            heightCm\n            bio\n            country\n            timezone\n            locale\n            avatarUrl\n            createdAt\n            updatedAt\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation UpdateProfile($input: UpdateProfileInput!) {\n        updateProfile(input: $input) {\n            userId\n            displayName\n            firstName\n            lastName\n            birthDate\n            sex\n            heightCm\n            bio\n            country\n            timezone\n            locale\n            avatarUrl\n        }\n    }\n"): (typeof documents)["\n    mutation UpdateProfile($input: UpdateProfileInput!) {\n        updateProfile(input: $input) {\n            userId\n            displayName\n            firstName\n            lastName\n            birthDate\n            sex\n            heightCm\n            bio\n            country\n            timezone\n            locale\n            avatarUrl\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    fragment WorkoutTemplateFields on WorkoutTemplate {\n        id\n        ownerId\n        name\n        notes\n        createdAt\n        updatedAt\n        exercises {\n            id\n            exerciseId\n            order\n            notes\n            sets {\n                id\n                order\n                plannedWeightKg\n                plannedReps\n                rpe\n                rir\n                notes\n            }\n        }\n    }\n"): (typeof documents)["\n    fragment WorkoutTemplateFields on WorkoutTemplate {\n        id\n        ownerId\n        name\n        notes\n        createdAt\n        updatedAt\n        exercises {\n            id\n            exerciseId\n            order\n            notes\n            sets {\n                id\n                order\n                plannedWeightKg\n                plannedReps\n                rpe\n                rir\n                notes\n            }\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query WorkoutTemplates($search: String) {\n        workoutTemplates(search: $search) {\n            id\n            name\n            notes\n            updatedAt\n            exerciseCount\n            setCount\n        }\n    }\n"): (typeof documents)["\n    query WorkoutTemplates($search: String) {\n        workoutTemplates(search: $search) {\n            id\n            name\n            notes\n            updatedAt\n            exerciseCount\n            setCount\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query WorkoutTemplate($id: ID!) {\n        workoutTemplate(id: $id) {\n            ...WorkoutTemplateFields\n        }\n    }\n"): (typeof documents)["\n    query WorkoutTemplate($id: ID!) {\n        workoutTemplate(id: $id) {\n            ...WorkoutTemplateFields\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation CreateWorkoutTemplate($input: WorkoutTemplateInput!) {\n        createWorkoutTemplate(input: $input) {\n            ...WorkoutTemplateFields\n        }\n    }\n"): (typeof documents)["\n    mutation CreateWorkoutTemplate($input: WorkoutTemplateInput!) {\n        createWorkoutTemplate(input: $input) {\n            ...WorkoutTemplateFields\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation UpdateWorkoutTemplate($id: ID!, $input: WorkoutTemplateInput!) {\n        updateWorkoutTemplate(id: $id, input: $input) {\n            ...WorkoutTemplateFields\n        }\n    }\n"): (typeof documents)["\n    mutation UpdateWorkoutTemplate($id: ID!, $input: WorkoutTemplateInput!) {\n        updateWorkoutTemplate(id: $id, input: $input) {\n            ...WorkoutTemplateFields\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation DeleteWorkoutTemplate($id: ID!) {\n        deleteWorkoutTemplate(id: $id)\n    }\n"): (typeof documents)["\n    mutation DeleteWorkoutTemplate($id: ID!) {\n        deleteWorkoutTemplate(id: $id)\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation CreateSessionFromTemplate($input: CreateSessionFromTemplateInput!) {\n        createSessionFromTemplate(input: $input) {\n            ...WorkoutSessionFields\n        }\n    }\n"): (typeof documents)["\n    mutation CreateSessionFromTemplate($input: CreateSessionFromTemplateInput!) {\n        createSessionFromTemplate(input: $input) {\n            ...WorkoutSessionFields\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    fragment WorkoutSessionFields on WorkoutSession {\n        id\n        userId\n        status\n        performedAt\n        notes\n        plannedByUserId\n        createdAt\n        updatedAt\n        entries {\n            id\n            exerciseId\n            order\n            notes\n            sets {\n                id\n                order\n                plannedWeightKg\n                plannedReps\n                weightKg\n                reps\n                rpe\n                rir\n                e1rmKg\n                notes\n            }\n        }\n    }\n"): (typeof documents)["\n    fragment WorkoutSessionFields on WorkoutSession {\n        id\n        userId\n        status\n        performedAt\n        notes\n        plannedByUserId\n        createdAt\n        updatedAt\n        entries {\n            id\n            exerciseId\n            order\n            notes\n            sets {\n                id\n                order\n                plannedWeightKg\n                plannedReps\n                weightKg\n                reps\n                rpe\n                rir\n                e1rmKg\n                notes\n            }\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query Exercises($category: String) {\n        exercises(category: $category) {\n            id\n            slug\n            name\n            category\n            equipment\n            primaryMuscle\n        }\n    }\n"): (typeof documents)["\n    query Exercises($category: String) {\n        exercises(category: $category) {\n            id\n            slug\n            name\n            category\n            equipment\n            primaryMuscle\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query WorkoutSession($id: ID!) {\n        workoutSession(id: $id) {\n            ...WorkoutSessionFields\n        }\n    }\n"): (typeof documents)["\n    query WorkoutSession($id: ID!) {\n        workoutSession(id: $id) {\n            ...WorkoutSessionFields\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query WorkoutHistory(\n        $cursor: String\n        $limit: Int\n        $status: String\n        $from: String\n        $to: String\n        $exerciseId: ID\n        $query: String\n    ) {\n        workoutHistory(\n            cursor: $cursor\n            limit: $limit\n            status: $status\n            from: $from\n            to: $to\n            exerciseId: $exerciseId\n            query: $query\n        ) {\n            items {\n                id\n                userId\n                status\n                performedAt\n                notes\n                plannedByUserId\n                exerciseCount\n                setCount\n                totalVolumeKg\n                createdAt\n                updatedAt\n            }\n            nextCursor\n            hasNextPage\n        }\n    }\n"): (typeof documents)["\n    query WorkoutHistory(\n        $cursor: String\n        $limit: Int\n        $status: String\n        $from: String\n        $to: String\n        $exerciseId: ID\n        $query: String\n    ) {\n        workoutHistory(\n            cursor: $cursor\n            limit: $limit\n            status: $status\n            from: $from\n            to: $to\n            exerciseId: $exerciseId\n            query: $query\n        ) {\n            items {\n                id\n                userId\n                status\n                performedAt\n                notes\n                plannedByUserId\n                exerciseCount\n                setCount\n                totalVolumeKg\n                createdAt\n                updatedAt\n            }\n            nextCursor\n            hasNextPage\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query ExerciseStats($from: String, $to: String) {\n        exerciseStats(from: $from, to: $to) {\n            exerciseId\n            slug\n            name\n            category\n            totalVolumeKg\n            totalSets\n            totalReps\n            bestE1rmKg\n            heaviestWeightKg\n        }\n    }\n"): (typeof documents)["\n    query ExerciseStats($from: String, $to: String) {\n        exerciseStats(from: $from, to: $to) {\n            exerciseId\n            slug\n            name\n            category\n            totalVolumeKg\n            totalSets\n            totalReps\n            bestE1rmKg\n            heaviestWeightKg\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query ExerciseSessionHistory($exerciseId: ID!, $excludeSessionId: ID, $limit: Int) {\n        exerciseSessionHistory(exerciseId: $exerciseId, excludeSessionId: $excludeSessionId, limit: $limit) {\n            sessionId\n            performedAt\n            status\n            sets {\n                plannedWeightKg\n                plannedReps\n                weightKg\n                reps\n                rpe\n                rir\n                e1rmKg\n            }\n        }\n    }\n"): (typeof documents)["\n    query ExerciseSessionHistory($exerciseId: ID!, $excludeSessionId: ID, $limit: Int) {\n        exerciseSessionHistory(exerciseId: $exerciseId, excludeSessionId: $excludeSessionId, limit: $limit) {\n            sessionId\n            performedAt\n            status\n            sets {\n                plannedWeightKg\n                plannedReps\n                weightKg\n                reps\n                rpe\n                rir\n                e1rmKg\n            }\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query TrainingSummary($from: String, $to: String) {\n        trainingSummary(from: $from, to: $to) {\n            sessions\n            trainingDays\n            totalSets\n            totalReps\n            totalVolumeKg\n            avgRpe\n            distinctExercises\n            bestSquatE1rmKg\n            bestBenchE1rmKg\n            bestDeadliftE1rmKg\n            estimatedTotalKg\n        }\n    }\n"): (typeof documents)["\n    query TrainingSummary($from: String, $to: String) {\n        trainingSummary(from: $from, to: $to) {\n            sessions\n            trainingDays\n            totalSets\n            totalReps\n            totalVolumeKg\n            avgRpe\n            distinctExercises\n            bestSquatE1rmKg\n            bestBenchE1rmKg\n            bestDeadliftE1rmKg\n            estimatedTotalKg\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query VolumeSeries($from: String, $to: String) {\n        volumeSeries(from: $from, to: $to) {\n            bucketStart\n            totalVolumeKg\n            totalSets\n            sessions\n        }\n    }\n"): (typeof documents)["\n    query VolumeSeries($from: String, $to: String) {\n        volumeSeries(from: $from, to: $to) {\n            bucketStart\n            totalVolumeKg\n            totalSets\n            sessions\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query StrengthProgression($exerciseId: ID!, $from: String, $to: String) {\n        strengthProgression(exerciseId: $exerciseId, from: $from, to: $to) {\n            points {\n                performedAt\n                e1rmKg\n            }\n            trend {\n                slopePerWeekKg\n                r2\n                projections {\n                    weeks\n                    e1rmKg\n                }\n            }\n        }\n    }\n"): (typeof documents)["\n    query StrengthProgression($exerciseId: ID!, $from: String, $to: String) {\n        strengthProgression(exerciseId: $exerciseId, from: $from, to: $to) {\n            points {\n                performedAt\n                e1rmKg\n            }\n            trend {\n                slopePerWeekKg\n                r2\n                projections {\n                    weeks\n                    e1rmKg\n                }\n            }\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query TrainingDistribution($from: String, $to: String) {\n        trainingDistribution(from: $from, to: $to) {\n            byMuscle {\n                key\n                totalVolumeKg\n                totalSets\n            }\n            byCategory {\n                key\n                totalVolumeKg\n                totalSets\n            }\n            rpe {\n                value\n                sets\n            }\n            rir {\n                value\n                sets\n            }\n        }\n    }\n"): (typeof documents)["\n    query TrainingDistribution($from: String, $to: String) {\n        trainingDistribution(from: $from, to: $to) {\n            byMuscle {\n                key\n                totalVolumeKg\n                totalSets\n            }\n            byCategory {\n                key\n                totalVolumeKg\n                totalSets\n            }\n            rpe {\n                value\n                sets\n            }\n            rir {\n                value\n                sets\n            }\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation CreateWorkoutSession($input: CreateWorkoutSessionInput) {\n        createWorkoutSession(input: $input) {\n            ...WorkoutSessionFields\n        }\n    }\n"): (typeof documents)["\n    mutation CreateWorkoutSession($input: CreateWorkoutSessionInput) {\n        createWorkoutSession(input: $input) {\n            ...WorkoutSessionFields\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation AddExerciseEntry($input: AddExerciseEntryInput!) {\n        addExerciseEntry(input: $input) {\n            ...WorkoutSessionFields\n        }\n    }\n"): (typeof documents)["\n    mutation AddExerciseEntry($input: AddExerciseEntryInput!) {\n        addExerciseEntry(input: $input) {\n            ...WorkoutSessionFields\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation RemoveExerciseEntry($sessionId: ID!, $entryId: ID!) {\n        removeExerciseEntry(sessionId: $sessionId, entryId: $entryId) {\n            ...WorkoutSessionFields\n        }\n    }\n"): (typeof documents)["\n    mutation RemoveExerciseEntry($sessionId: ID!, $entryId: ID!) {\n        removeExerciseEntry(sessionId: $sessionId, entryId: $entryId) {\n            ...WorkoutSessionFields\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation LogSet($input: LogSetInput!) {\n        logSet(input: $input) {\n            ...WorkoutSessionFields\n        }\n    }\n"): (typeof documents)["\n    mutation LogSet($input: LogSetInput!) {\n        logSet(input: $input) {\n            ...WorkoutSessionFields\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation UpdateSet($input: UpdateSetInput!) {\n        updateSet(input: $input) {\n            ...WorkoutSessionFields\n        }\n    }\n"): (typeof documents)["\n    mutation UpdateSet($input: UpdateSetInput!) {\n        updateSet(input: $input) {\n            ...WorkoutSessionFields\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation RemoveSet($sessionId: ID!, $entryId: ID!, $setId: ID!) {\n        removeSet(sessionId: $sessionId, entryId: $entryId, setId: $setId) {\n            ...WorkoutSessionFields\n        }\n    }\n"): (typeof documents)["\n    mutation RemoveSet($sessionId: ID!, $entryId: ID!, $setId: ID!) {\n        removeSet(sessionId: $sessionId, entryId: $entryId, setId: $setId) {\n            ...WorkoutSessionFields\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation UpdateWorkoutSession($input: UpdateWorkoutSessionInput!) {\n        updateWorkoutSession(input: $input) {\n            ...WorkoutSessionFields\n        }\n    }\n"): (typeof documents)["\n    mutation UpdateWorkoutSession($input: UpdateWorkoutSessionInput!) {\n        updateWorkoutSession(input: $input) {\n            ...WorkoutSessionFields\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation CompleteWorkoutSession($id: ID!) {\n        completeWorkoutSession(id: $id) {\n            ...WorkoutSessionFields\n        }\n    }\n"): (typeof documents)["\n    mutation CompleteWorkoutSession($id: ID!) {\n        completeWorkoutSession(id: $id) {\n            ...WorkoutSessionFields\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation DeleteWorkoutSession($id: ID!) {\n        deleteWorkoutSession(id: $id)\n    }\n"): (typeof documents)["\n    mutation DeleteWorkoutSession($id: ID!) {\n        deleteWorkoutSession(id: $id)\n    }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;