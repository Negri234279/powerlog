/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type AddExerciseEntryInput = {
  exerciseId: string | number;
  notes?: string | null | undefined;
  sessionId: string | number;
};

export type ChangePasswordInput = {
  currentPassword?: string | null | undefined;
  newPassword: string;
};

export type CreateExerciseInput = {
  /** squat | bench | deadlift | chest | back | shoulders | legs | arms | core */
  category: string;
  /** barbell | dumbbell | machine | cable | bodyweight */
  equipment: string;
  name: string;
  /** Primary muscle worked. */
  primaryMuscle: string;
  /** Stable key; derived from name if omitted. */
  slug?: string | null | undefined;
};

export type CreateSessionFromTemplateInput = {
  notes?: string | null | undefined;
  /** ISO 8601 datetime; defaults to now. */
  performedAt?: string | null | undefined;
  templateId: string | number;
};

export type CreateWorkoutSessionInput = {
  notes?: string | null | undefined;
  /** ISO 8601 datetime; defaults to now. */
  performedAt?: string | null | undefined;
};

export type LogSetInput = {
  entryId: string | number;
  notes?: string | null | undefined;
  plannedReps?: number | null | undefined;
  plannedWeight?: number | null | undefined;
  reps?: number | null | undefined;
  /** Reps in reserve (alternative to RPE). */
  rir?: number | null | undefined;
  /** RPE 0–10 in half-point steps. */
  rpe?: number | null | undefined;
  sessionId: string | number;
  /** Weight unit of the inputs: kg | lb (default kg). */
  unit?: string | null | undefined;
  weight?: number | null | undefined;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  /** Birth date as YYYY-MM-DD. */
  birthDate?: string | null | undefined;
  email: string;
  firstName?: string | null | undefined;
  /** Height in centimetres (50–300). */
  heightCm?: number | null | undefined;
  lastName?: string | null | undefined;
  password: string;
  /** "kg" (default) or "lb". */
  units?: string | null | undefined;
  /** Public handle: 3–30 chars of a–z, 0–9 or underscore. */
  username: string;
};

export type ResetPasswordInput = {
  newPassword: string;
  token: string;
};

export type SetUserAdminInput = {
  isAdmin: boolean;
  userId: string | number;
};

export type SetUserRoleInput = {
  /** "athlete" or "coach". */
  role: string;
  userId: string | number;
};

export type SetUserStatusInput = {
  /** true → disable (suspend) the account; false → re-enable. */
  disabled: boolean;
  userId: string | number;
};

export type TemplateExerciseInput = {
  exerciseId: string | number;
  notes?: string | null | undefined;
  sets: Array<TemplateSetInput>;
};

export type TemplateSetInput = {
  notes?: string | null | undefined;
  plannedReps?: number | null | undefined;
  plannedWeight?: number | null | undefined;
  /** Target reps in reserve (alternative to RPE). */
  rir?: number | null | undefined;
  /** Target RPE 0–10 in half-point steps. */
  rpe?: number | null | undefined;
  /** Weight unit of the inputs: kg | lb (default kg). */
  unit?: string | null | undefined;
};

export type UpdateExerciseInput = {
  category?: string | null | undefined;
  equipment?: string | null | undefined;
  exerciseId: string | number;
  /** Absent = leave unchanged. */
  name?: string | null | undefined;
  primaryMuscle?: string | null | undefined;
};

export type UpdateProfileInput = {
  bio?: string | null | undefined;
  /** Birth date as YYYY-MM-DD. */
  birthDate?: string | null | undefined;
  /** ISO 3166-1 alpha-2 country code. */
  country?: string | null | undefined;
  displayName?: string | null | undefined;
  firstName?: string | null | undefined;
  /** Height in centimetres (50–300). */
  heightCm?: number | null | undefined;
  lastName?: string | null | undefined;
  /** BCP 47 locale, e.g. "es-ES". */
  locale?: string | null | undefined;
  /** "male" or "female". */
  sex?: string | null | undefined;
  /** IANA timezone, e.g. "Europe/Madrid". */
  timezone?: string | null | undefined;
};

export type UpdateSetInput = {
  entryId: string | number;
  notes?: string | null | undefined;
  plannedReps?: number | null | undefined;
  plannedWeight?: number | null | undefined;
  reps?: number | null | undefined;
  /** Reps in reserve (alternative to RPE). */
  rir?: number | null | undefined;
  /** RPE 0–10 in half-point steps. */
  rpe?: number | null | undefined;
  sessionId: string | number;
  setId: string | number;
  /** Weight unit of the inputs: kg | lb (default kg). */
  unit?: string | null | undefined;
  weight?: number | null | undefined;
};

export type UpdateWorkoutSessionInput = {
  /** Absent = leave unchanged; null = clear. */
  notes?: string | null | undefined;
  /** ISO 8601 datetime; absent = leave unchanged. */
  performedAt?: string | null | undefined;
  sessionId: string | number;
};

export type WorkoutTemplateInput = {
  exercises: Array<TemplateExerciseInput>;
  name: string;
  notes?: string | null | undefined;
};

export type AdminExercisesQueryVariables = Exact<{
  categories?: Array<string> | string | null | undefined;
  equipment?: Array<string> | string | null | undefined;
  muscles?: Array<string> | string | null | undefined;
  search?: string | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type AdminExercisesQuery = { adminExercises: { total: number, limit: number, offset: number, rows: Array<{ id: string, slug: string, name: string, category: string, equipment: string, primaryMuscle: string }> } };

export type CreateExerciseMutationVariables = Exact<{
  input: CreateExerciseInput;
}>;


export type CreateExerciseMutation = { createExercise: { id: string, slug: string, name: string, category: string, equipment: string, primaryMuscle: string } };

export type UpdateExerciseMutationVariables = Exact<{
  input: UpdateExerciseInput;
}>;


export type UpdateExerciseMutation = { updateExercise: { id: string, slug: string, name: string, category: string, equipment: string, primaryMuscle: string } };

export type DeleteExerciseMutationVariables = Exact<{
  exerciseId: string | number;
}>;


export type DeleteExerciseMutation = { deleteExercise: boolean };

export type AdminStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminStatsQuery = { adminUserStats: { total: number, athletes: number, coaches: number, admins: number, verified: number, active: number, disabled: number, newLast7Days: number, newLast30Days: number }, adminCoachingStats: { links: number, activeCoaches: number, linkedAthletes: number, pendingInvitations: number }, adminWorkoutStats: { sessions: number, completedSessions: number, sets: number, exercises: number, sessionsLast7Days: number, activeUsers: number } };

export type AdminUsersQueryVariables = Exact<{
  roles?: Array<string> | string | null | undefined;
  statuses?: Array<string> | string | null | undefined;
  isAdmin?: boolean | null | undefined;
  verified?: boolean | null | undefined;
  search?: string | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type AdminUsersQuery = { adminUsers: { total: number, limit: number, offset: number, rows: Array<{ id: string, email: string, username: string | null, role: string, isAdmin: boolean, status: string, emailVerified: boolean, createdAt: string }> } };

export type SetUserRoleMutationVariables = Exact<{
  input: SetUserRoleInput;
}>;


export type SetUserRoleMutation = { setUserRole: { id: string, role: string } };

export type SetUserAdminMutationVariables = Exact<{
  input: SetUserAdminInput;
}>;


export type SetUserAdminMutation = { setUserAdmin: { id: string, isAdmin: boolean } };

export type SetUserStatusMutationVariables = Exact<{
  input: SetUserStatusInput;
}>;


export type SetUserStatusMutation = { setUserStatus: { id: string, status: string } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { me: { id: string, email: string, username: string, role: string, isAdmin: boolean, units: string, emailVerified: boolean, hasPassword: boolean, createdAt: string } };

export type RegisterMutationVariables = Exact<{
  input: RegisterInput;
}>;


export type RegisterMutation = { register: { id: string } };

export type LoginMutationVariables = Exact<{
  input: LoginInput;
}>;


export type LoginMutation = { login: { id: string } };

export type LogoutMutationVariables = Exact<{ [key: string]: never; }>;


export type LogoutMutation = { logout: boolean };

export type RefreshMutationVariables = Exact<{ [key: string]: never; }>;


export type RefreshMutation = { refresh: { id: string } };

export type DeleteAccountMutationVariables = Exact<{ [key: string]: never; }>;


export type DeleteAccountMutation = { deleteAccount: boolean };

export type ChangePasswordMutationVariables = Exact<{
  input: ChangePasswordInput;
}>;


export type ChangePasswordMutation = { changePassword: boolean };

export type VerifyEmailMutationVariables = Exact<{
  token: string;
}>;


export type VerifyEmailMutation = { verifyEmail: boolean };

export type ResendEmailVerificationMutationVariables = Exact<{ [key: string]: never; }>;


export type ResendEmailVerificationMutation = { resendEmailVerification: boolean };

export type ForgotPasswordMutationVariables = Exact<{
  email: string;
}>;


export type ForgotPasswordMutation = { forgotPassword: boolean };

export type ResetPasswordMutationVariables = Exact<{
  input: ResetPasswordInput;
}>;


export type ResetPasswordMutation = { resetPassword: boolean };

export type MySessionsQueryVariables = Exact<{ [key: string]: never; }>;


export type MySessionsQuery = { mySessions: Array<{ id: string, current: boolean, userAgent: string | null, ip: string | null, lastUsedAt: string }> };

export type RevokeSessionMutationVariables = Exact<{
  id: string;
}>;


export type RevokeSessionMutation = { revokeSession: boolean };

export type RevokeOtherSessionsMutationVariables = Exact<{ [key: string]: never; }>;


export type RevokeOtherSessionsMutation = { revokeOtherSessions: boolean };

export type PingQueryVariables = Exact<{ [key: string]: never; }>;


export type PingQuery = { ping: string };

export type MyProfileQueryVariables = Exact<{ [key: string]: never; }>;


export type MyProfileQuery = { myProfile: { userId: string, displayName: string, firstName: string | null, lastName: string | null, birthDate: string | null, sex: string | null, heightCm: number | null, bio: string | null, country: string | null, timezone: string | null, locale: string | null, avatarUrl: string | null, createdAt: string, updatedAt: string } };

export type UpdateProfileMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateProfileMutation = { updateProfile: { userId: string, displayName: string, firstName: string | null, lastName: string | null, birthDate: string | null, sex: string | null, heightCm: number | null, bio: string | null, country: string | null, timezone: string | null, locale: string | null, avatarUrl: string | null } };

export type WorkoutTemplateFieldsFragment = { id: string, ownerId: string, name: string, notes: string | null, createdAt: string, updatedAt: string, exercises: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, rpe: number | null, rir: number | null, notes: string | null }> }> };

export type WorkoutTemplatesQueryVariables = Exact<{
  search?: string | null | undefined;
}>;


export type WorkoutTemplatesQuery = { workoutTemplates: Array<{ id: string, name: string, notes: string | null, updatedAt: string, exerciseCount: number, setCount: number }> };

export type WorkoutTemplateQueryVariables = Exact<{
  id: string | number;
}>;


export type WorkoutTemplateQuery = { workoutTemplate: { id: string, ownerId: string, name: string, notes: string | null, createdAt: string, updatedAt: string, exercises: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, rpe: number | null, rir: number | null, notes: string | null }> }> } };

export type CreateWorkoutTemplateMutationVariables = Exact<{
  input: WorkoutTemplateInput;
}>;


export type CreateWorkoutTemplateMutation = { createWorkoutTemplate: { id: string, ownerId: string, name: string, notes: string | null, createdAt: string, updatedAt: string, exercises: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, rpe: number | null, rir: number | null, notes: string | null }> }> } };

export type UpdateWorkoutTemplateMutationVariables = Exact<{
  id: string | number;
  input: WorkoutTemplateInput;
}>;


export type UpdateWorkoutTemplateMutation = { updateWorkoutTemplate: { id: string, ownerId: string, name: string, notes: string | null, createdAt: string, updatedAt: string, exercises: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, rpe: number | null, rir: number | null, notes: string | null }> }> } };

export type DeleteWorkoutTemplateMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteWorkoutTemplateMutation = { deleteWorkoutTemplate: boolean };

export type CreateSessionFromTemplateMutationVariables = Exact<{
  input: CreateSessionFromTemplateInput;
}>;


export type CreateSessionFromTemplateMutation = { createSessionFromTemplate: { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, notes: string | null }> }> } };

export type WorkoutSessionFieldsFragment = { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, notes: string | null }> }> };

export type ExercisesQueryVariables = Exact<{
  category?: string | null | undefined;
}>;


export type ExercisesQuery = { exercises: Array<{ id: string, slug: string, name: string, category: string, equipment: string, primaryMuscle: string }> };

export type WorkoutSessionQueryVariables = Exact<{
  id: string | number;
}>;


export type WorkoutSessionQuery = { workoutSession: { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, notes: string | null }> }> } };

export type WorkoutHistoryQueryVariables = Exact<{
  cursor?: string | null | undefined;
  limit?: number | null | undefined;
  status?: string | null | undefined;
  from?: string | null | undefined;
  to?: string | null | undefined;
  exerciseId?: string | number | null | undefined;
  query?: string | null | undefined;
}>;


export type WorkoutHistoryQuery = { workoutHistory: { nextCursor: string | null, hasNextPage: boolean, items: Array<{ id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, exerciseCount: number, setCount: number, totalVolumeKg: number, createdAt: string, updatedAt: string }> } };

export type ExerciseStatsQueryVariables = Exact<{
  from?: string | null | undefined;
  to?: string | null | undefined;
}>;


export type ExerciseStatsQuery = { exerciseStats: Array<{ exerciseId: string, slug: string, name: string, category: string, totalVolumeKg: number, totalSets: number, totalReps: number, bestE1rmKg: number | null, heaviestWeightKg: number | null }> };

export type ExerciseSessionHistoryQueryVariables = Exact<{
  exerciseId: string | number;
  excludeSessionId?: string | number | null | undefined;
  limit?: number | null | undefined;
}>;


export type ExerciseSessionHistoryQuery = { exerciseSessionHistory: Array<{ sessionId: string, performedAt: string, status: string, sets: Array<{ weightKg: number, reps: number, rpe: number | null, rir: number | null, e1rmKg: number | null }> }> };

export type TrainingSummaryQueryVariables = Exact<{
  from?: string | null | undefined;
  to?: string | null | undefined;
}>;


export type TrainingSummaryQuery = { trainingSummary: { sessions: number, trainingDays: number, totalSets: number, totalReps: number, totalVolumeKg: number, avgRpe: number | null, distinctExercises: number, bestSquatE1rmKg: number | null, bestBenchE1rmKg: number | null, bestDeadliftE1rmKg: number | null, estimatedTotalKg: number | null } };

export type VolumeSeriesQueryVariables = Exact<{
  from?: string | null | undefined;
  to?: string | null | undefined;
}>;


export type VolumeSeriesQuery = { volumeSeries: Array<{ bucketStart: string, totalVolumeKg: number, totalSets: number, sessions: number }> };

export type StrengthProgressionQueryVariables = Exact<{
  exerciseId: string | number;
  from?: string | null | undefined;
  to?: string | null | undefined;
}>;


export type StrengthProgressionQuery = { strengthProgression: { points: Array<{ performedAt: string, e1rmKg: number }>, trend: { slopePerWeekKg: number, r2: number, projections: Array<{ weeks: number, e1rmKg: number }> } | null } };

export type TrainingDistributionQueryVariables = Exact<{
  from?: string | null | undefined;
  to?: string | null | undefined;
}>;


export type TrainingDistributionQuery = { trainingDistribution: { byMuscle: Array<{ key: string, totalVolumeKg: number, totalSets: number }>, byCategory: Array<{ key: string, totalVolumeKg: number, totalSets: number }>, rpe: Array<{ value: number, sets: number }>, rir: Array<{ value: number, sets: number }> } };

export type CreateWorkoutSessionMutationVariables = Exact<{
  input?: CreateWorkoutSessionInput | null | undefined;
}>;


export type CreateWorkoutSessionMutation = { createWorkoutSession: { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, notes: string | null }> }> } };

export type AddExerciseEntryMutationVariables = Exact<{
  input: AddExerciseEntryInput;
}>;


export type AddExerciseEntryMutation = { addExerciseEntry: { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, notes: string | null }> }> } };

export type RemoveExerciseEntryMutationVariables = Exact<{
  sessionId: string | number;
  entryId: string | number;
}>;


export type RemoveExerciseEntryMutation = { removeExerciseEntry: { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, notes: string | null }> }> } };

export type LogSetMutationVariables = Exact<{
  input: LogSetInput;
}>;


export type LogSetMutation = { logSet: { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, notes: string | null }> }> } };

export type UpdateSetMutationVariables = Exact<{
  input: UpdateSetInput;
}>;


export type UpdateSetMutation = { updateSet: { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, notes: string | null }> }> } };

export type RemoveSetMutationVariables = Exact<{
  sessionId: string | number;
  entryId: string | number;
  setId: string | number;
}>;


export type RemoveSetMutation = { removeSet: { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, notes: string | null }> }> } };

export type UpdateWorkoutSessionMutationVariables = Exact<{
  input: UpdateWorkoutSessionInput;
}>;


export type UpdateWorkoutSessionMutation = { updateWorkoutSession: { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, notes: string | null }> }> } };

export type CompleteWorkoutSessionMutationVariables = Exact<{
  id: string | number;
}>;


export type CompleteWorkoutSessionMutation = { completeWorkoutSession: { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, notes: string | null }> }> } };

export type DeleteWorkoutSessionMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteWorkoutSessionMutation = { deleteWorkoutSession: boolean };

export const WorkoutTemplateFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutTemplateFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutTemplate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ownerId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"exercises"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<WorkoutTemplateFieldsFragment, unknown>;
export const WorkoutSessionFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<WorkoutSessionFieldsFragment, unknown>;
export const AdminExercisesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminExercises"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"categories"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"equipment"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"muscles"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminExercises"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"categories"},"value":{"kind":"Variable","name":{"kind":"Name","value":"categories"}}},{"kind":"Argument","name":{"kind":"Name","value":"equipment"},"value":{"kind":"Variable","name":{"kind":"Name","value":"equipment"}}},{"kind":"Argument","name":{"kind":"Name","value":"muscles"},"value":{"kind":"Variable","name":{"kind":"Name","value":"muscles"}}},{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rows"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"equipment"}},{"kind":"Field","name":{"kind":"Name","value":"primaryMuscle"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"limit"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}}]}}]}}]} as unknown as DocumentNode<AdminExercisesQuery, AdminExercisesQueryVariables>;
export const CreateExerciseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateExercise"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateExerciseInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createExercise"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"equipment"}},{"kind":"Field","name":{"kind":"Name","value":"primaryMuscle"}}]}}]}}]} as unknown as DocumentNode<CreateExerciseMutation, CreateExerciseMutationVariables>;
export const UpdateExerciseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateExercise"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateExerciseInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateExercise"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"equipment"}},{"kind":"Field","name":{"kind":"Name","value":"primaryMuscle"}}]}}]}}]} as unknown as DocumentNode<UpdateExerciseMutation, UpdateExerciseMutationVariables>;
export const DeleteExerciseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteExercise"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"exerciseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteExercise"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"exerciseId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"exerciseId"}}}]}]}}]} as unknown as DocumentNode<DeleteExerciseMutation, DeleteExerciseMutationVariables>;
export const AdminStatsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminUserStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"athletes"}},{"kind":"Field","name":{"kind":"Name","value":"coaches"}},{"kind":"Field","name":{"kind":"Name","value":"admins"}},{"kind":"Field","name":{"kind":"Name","value":"verified"}},{"kind":"Field","name":{"kind":"Name","value":"active"}},{"kind":"Field","name":{"kind":"Name","value":"disabled"}},{"kind":"Field","name":{"kind":"Name","value":"newLast7Days"}},{"kind":"Field","name":{"kind":"Name","value":"newLast30Days"}}]}},{"kind":"Field","name":{"kind":"Name","value":"adminCoachingStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"links"}},{"kind":"Field","name":{"kind":"Name","value":"activeCoaches"}},{"kind":"Field","name":{"kind":"Name","value":"linkedAthletes"}},{"kind":"Field","name":{"kind":"Name","value":"pendingInvitations"}}]}},{"kind":"Field","name":{"kind":"Name","value":"adminWorkoutStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sessions"}},{"kind":"Field","name":{"kind":"Name","value":"completedSessions"}},{"kind":"Field","name":{"kind":"Name","value":"sets"}},{"kind":"Field","name":{"kind":"Name","value":"exercises"}},{"kind":"Field","name":{"kind":"Name","value":"sessionsLast7Days"}},{"kind":"Field","name":{"kind":"Name","value":"activeUsers"}}]}}]}}]} as unknown as DocumentNode<AdminStatsQuery, AdminStatsQueryVariables>;
export const AdminUsersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminUsers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"roles"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"statuses"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isAdmin"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"verified"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminUsers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"roles"},"value":{"kind":"Variable","name":{"kind":"Name","value":"roles"}}},{"kind":"Argument","name":{"kind":"Name","value":"statuses"},"value":{"kind":"Variable","name":{"kind":"Name","value":"statuses"}}},{"kind":"Argument","name":{"kind":"Name","value":"isAdmin"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isAdmin"}}},{"kind":"Argument","name":{"kind":"Name","value":"verified"},"value":{"kind":"Variable","name":{"kind":"Name","value":"verified"}}},{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rows"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"limit"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}}]}}]}}]} as unknown as DocumentNode<AdminUsersQuery, AdminUsersQueryVariables>;
export const SetUserRoleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetUserRole"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetUserRoleInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setUserRole"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]}}]} as unknown as DocumentNode<SetUserRoleMutation, SetUserRoleMutationVariables>;
export const SetUserAdminDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetUserAdmin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetUserAdminInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setUserAdmin"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}}]}}]} as unknown as DocumentNode<SetUserAdminMutation, SetUserAdminMutationVariables>;
export const SetUserStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetUserStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetUserStatusInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setUserStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<SetUserStatusMutation, SetUserStatusMutationVariables>;
export const MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}},{"kind":"Field","name":{"kind":"Name","value":"units"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<MeQuery, MeQueryVariables>;
export const RegisterDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Register"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RegisterInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"register"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<RegisterMutation, RegisterMutationVariables>;
export const LoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Login"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"LoginInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<LoginMutation, LoginMutationVariables>;
export const LogoutDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Logout"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logout"}}]}}]} as unknown as DocumentNode<LogoutMutation, LogoutMutationVariables>;
export const RefreshDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Refresh"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"refresh"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<RefreshMutation, RefreshMutationVariables>;
export const DeleteAccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteAccount"}}]}}]} as unknown as DocumentNode<DeleteAccountMutation, DeleteAccountMutationVariables>;
export const ChangePasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChangePassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ChangePasswordInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changePassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<ChangePasswordMutation, ChangePasswordMutationVariables>;
export const VerifyEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VerifyEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"verifyEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}]}]}}]} as unknown as DocumentNode<VerifyEmailMutation, VerifyEmailMutationVariables>;
export const ResendEmailVerificationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResendEmailVerification"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resendEmailVerification"}}]}}]} as unknown as DocumentNode<ResendEmailVerificationMutation, ResendEmailVerificationMutationVariables>;
export const ForgotPasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ForgotPassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"forgotPassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}}]}]}}]} as unknown as DocumentNode<ForgotPasswordMutation, ForgotPasswordMutationVariables>;
export const ResetPasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResetPassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ResetPasswordInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resetPassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<ResetPasswordMutation, ResetPasswordMutationVariables>;
export const MySessionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MySessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mySessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"current"}},{"kind":"Field","name":{"kind":"Name","value":"userAgent"}},{"kind":"Field","name":{"kind":"Name","value":"ip"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsedAt"}}]}}]}}]} as unknown as DocumentNode<MySessionsQuery, MySessionsQueryVariables>;
export const RevokeSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokeSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<RevokeSessionMutation, RevokeSessionMutationVariables>;
export const RevokeOtherSessionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokeOtherSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeOtherSessions"}}]}}]} as unknown as DocumentNode<RevokeOtherSessionsMutation, RevokeOtherSessionsMutationVariables>;
export const PingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Ping"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ping"}}]}}]} as unknown as DocumentNode<PingQuery, PingQueryVariables>;
export const MyProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyProfile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myProfile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"birthDate"}},{"kind":"Field","name":{"kind":"Name","value":"sex"}},{"kind":"Field","name":{"kind":"Name","value":"heightCm"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<MyProfileQuery, MyProfileQueryVariables>;
export const UpdateProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateProfile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateProfileInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProfile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"birthDate"}},{"kind":"Field","name":{"kind":"Name","value":"sex"}},{"kind":"Field","name":{"kind":"Name","value":"heightCm"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}}]}}]}}]} as unknown as DocumentNode<UpdateProfileMutation, UpdateProfileMutationVariables>;
export const WorkoutTemplatesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"WorkoutTemplates"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workoutTemplates"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseCount"}},{"kind":"Field","name":{"kind":"Name","value":"setCount"}}]}}]}}]} as unknown as DocumentNode<WorkoutTemplatesQuery, WorkoutTemplatesQueryVariables>;
export const WorkoutTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"WorkoutTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workoutTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutTemplateFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutTemplateFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutTemplate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ownerId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"exercises"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<WorkoutTemplateQuery, WorkoutTemplateQueryVariables>;
export const CreateWorkoutTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateWorkoutTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutTemplateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createWorkoutTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutTemplateFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutTemplateFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutTemplate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ownerId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"exercises"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<CreateWorkoutTemplateMutation, CreateWorkoutTemplateMutationVariables>;
export const UpdateWorkoutTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateWorkoutTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutTemplateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateWorkoutTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutTemplateFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutTemplateFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutTemplate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ownerId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"exercises"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateWorkoutTemplateMutation, UpdateWorkoutTemplateMutationVariables>;
export const DeleteWorkoutTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteWorkoutTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteWorkoutTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteWorkoutTemplateMutation, DeleteWorkoutTemplateMutationVariables>;
export const CreateSessionFromTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateSessionFromTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateSessionFromTemplateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSessionFromTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<CreateSessionFromTemplateMutation, CreateSessionFromTemplateMutationVariables>;
export const ExercisesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Exercises"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"category"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exercises"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"category"},"value":{"kind":"Variable","name":{"kind":"Name","value":"category"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"equipment"}},{"kind":"Field","name":{"kind":"Name","value":"primaryMuscle"}}]}}]}}]} as unknown as DocumentNode<ExercisesQuery, ExercisesQueryVariables>;
export const WorkoutSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"WorkoutSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workoutSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<WorkoutSessionQuery, WorkoutSessionQueryVariables>;
export const WorkoutHistoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"WorkoutHistory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"from"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"to"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"exerciseId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workoutHistory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"cursor"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"Argument","name":{"kind":"Name","value":"from"},"value":{"kind":"Variable","name":{"kind":"Name","value":"from"}}},{"kind":"Argument","name":{"kind":"Name","value":"to"},"value":{"kind":"Variable","name":{"kind":"Name","value":"to"}}},{"kind":"Argument","name":{"kind":"Name","value":"exerciseId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"exerciseId"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseCount"}},{"kind":"Field","name":{"kind":"Name","value":"setCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalVolumeKg"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nextCursor"}},{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}}]}}]} as unknown as DocumentNode<WorkoutHistoryQuery, WorkoutHistoryQueryVariables>;
export const ExerciseStatsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ExerciseStats"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"from"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"to"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exerciseStats"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"from"},"value":{"kind":"Variable","name":{"kind":"Name","value":"from"}}},{"kind":"Argument","name":{"kind":"Name","value":"to"},"value":{"kind":"Variable","name":{"kind":"Name","value":"to"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"totalVolumeKg"}},{"kind":"Field","name":{"kind":"Name","value":"totalSets"}},{"kind":"Field","name":{"kind":"Name","value":"totalReps"}},{"kind":"Field","name":{"kind":"Name","value":"bestE1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"heaviestWeightKg"}}]}}]}}]} as unknown as DocumentNode<ExerciseStatsQuery, ExerciseStatsQueryVariables>;
export const ExerciseSessionHistoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ExerciseSessionHistory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"exerciseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"excludeSessionId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exerciseSessionHistory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"exerciseId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"exerciseId"}}},{"kind":"Argument","name":{"kind":"Name","value":"excludeSessionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"excludeSessionId"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sessionId"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}}]}}]}}]}}]} as unknown as DocumentNode<ExerciseSessionHistoryQuery, ExerciseSessionHistoryQueryVariables>;
export const TrainingSummaryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TrainingSummary"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"from"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"to"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"trainingSummary"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"from"},"value":{"kind":"Variable","name":{"kind":"Name","value":"from"}}},{"kind":"Argument","name":{"kind":"Name","value":"to"},"value":{"kind":"Variable","name":{"kind":"Name","value":"to"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sessions"}},{"kind":"Field","name":{"kind":"Name","value":"trainingDays"}},{"kind":"Field","name":{"kind":"Name","value":"totalSets"}},{"kind":"Field","name":{"kind":"Name","value":"totalReps"}},{"kind":"Field","name":{"kind":"Name","value":"totalVolumeKg"}},{"kind":"Field","name":{"kind":"Name","value":"avgRpe"}},{"kind":"Field","name":{"kind":"Name","value":"distinctExercises"}},{"kind":"Field","name":{"kind":"Name","value":"bestSquatE1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"bestBenchE1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"bestDeadliftE1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedTotalKg"}}]}}]}}]} as unknown as DocumentNode<TrainingSummaryQuery, TrainingSummaryQueryVariables>;
export const VolumeSeriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"VolumeSeries"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"from"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"to"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"volumeSeries"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"from"},"value":{"kind":"Variable","name":{"kind":"Name","value":"from"}}},{"kind":"Argument","name":{"kind":"Name","value":"to"},"value":{"kind":"Variable","name":{"kind":"Name","value":"to"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bucketStart"}},{"kind":"Field","name":{"kind":"Name","value":"totalVolumeKg"}},{"kind":"Field","name":{"kind":"Name","value":"totalSets"}},{"kind":"Field","name":{"kind":"Name","value":"sessions"}}]}}]}}]} as unknown as DocumentNode<VolumeSeriesQuery, VolumeSeriesQueryVariables>;
export const StrengthProgressionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StrengthProgression"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"exerciseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"from"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"to"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"strengthProgression"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"exerciseId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"exerciseId"}}},{"kind":"Argument","name":{"kind":"Name","value":"from"},"value":{"kind":"Variable","name":{"kind":"Name","value":"from"}}},{"kind":"Argument","name":{"kind":"Name","value":"to"},"value":{"kind":"Variable","name":{"kind":"Name","value":"to"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"points"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}}]}},{"kind":"Field","name":{"kind":"Name","value":"trend"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slopePerWeekKg"}},{"kind":"Field","name":{"kind":"Name","value":"r2"}},{"kind":"Field","name":{"kind":"Name","value":"projections"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"weeks"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}}]}}]}}]}}]}}]} as unknown as DocumentNode<StrengthProgressionQuery, StrengthProgressionQueryVariables>;
export const TrainingDistributionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TrainingDistribution"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"from"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"to"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"trainingDistribution"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"from"},"value":{"kind":"Variable","name":{"kind":"Name","value":"from"}}},{"kind":"Argument","name":{"kind":"Name","value":"to"},"value":{"kind":"Variable","name":{"kind":"Name","value":"to"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"byMuscle"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"totalVolumeKg"}},{"kind":"Field","name":{"kind":"Name","value":"totalSets"}}]}},{"kind":"Field","name":{"kind":"Name","value":"byCategory"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"totalVolumeKg"}},{"kind":"Field","name":{"kind":"Name","value":"totalSets"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rpe"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"sets"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rir"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"sets"}}]}}]}}]}}]} as unknown as DocumentNode<TrainingDistributionQuery, TrainingDistributionQueryVariables>;
export const CreateWorkoutSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateWorkoutSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateWorkoutSessionInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createWorkoutSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<CreateWorkoutSessionMutation, CreateWorkoutSessionMutationVariables>;
export const AddExerciseEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddExerciseEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddExerciseEntryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addExerciseEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<AddExerciseEntryMutation, AddExerciseEntryMutationVariables>;
export const RemoveExerciseEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveExerciseEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entryId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeExerciseEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sessionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}}},{"kind":"Argument","name":{"kind":"Name","value":"entryId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entryId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<RemoveExerciseEntryMutation, RemoveExerciseEntryMutationVariables>;
export const LogSetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LogSet"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"LogSetInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logSet"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<LogSetMutation, LogSetMutationVariables>;
export const UpdateSetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSet"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateSetInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSet"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateSetMutation, UpdateSetMutationVariables>;
export const RemoveSetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveSet"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entryId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"setId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeSet"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sessionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}}},{"kind":"Argument","name":{"kind":"Name","value":"entryId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entryId"}}},{"kind":"Argument","name":{"kind":"Name","value":"setId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"setId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<RemoveSetMutation, RemoveSetMutationVariables>;
export const UpdateWorkoutSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateWorkoutSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateWorkoutSessionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateWorkoutSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateWorkoutSessionMutation, UpdateWorkoutSessionMutationVariables>;
export const CompleteWorkoutSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CompleteWorkoutSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"completeWorkoutSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<CompleteWorkoutSessionMutation, CompleteWorkoutSessionMutationVariables>;
export const DeleteWorkoutSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteWorkoutSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteWorkoutSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteWorkoutSessionMutation, DeleteWorkoutSessionMutationVariables>;