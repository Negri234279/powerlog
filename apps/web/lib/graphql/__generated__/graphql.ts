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

export type AddPlanPriceInput = {
  /** Integer cents. Replaces the version on sale for this combo. */
  amountCents: number;
  /** EUR | USD */
  currency: string;
  /** month | quarter | semester | year */
  interval: string;
  planId: string | number;
};

export type AssignSubscriptionInput = {
  planId: string | number;
  /** When the grant ends. Omitted → one year. */
  until?: string | null | undefined;
  userId: string | number;
};

export type ChangePasswordInput = {
  currentPassword?: string | null | undefined;
  newPassword: string;
};

export type CompleteSetInput = {
  entryId: string | number;
  notes?: string | null | undefined;
  /** success | failed */
  outcome: string;
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

export type CreateExerciseInput = {
  /** squat | bench | deadlift | chest | back | shoulders | legs | arms | core */
  category: string;
  /** barbell | dumbbell | machine | cable | bodyweight */
  equipment: string;
  name: string;
  /** Spanish display name (optional). */
  nameEs?: string | null | undefined;
  /** Primary muscle worked. */
  primaryMuscle: string;
  /** Stable key; derived from name if omitted. */
  slug?: string | null | undefined;
};

export type CreatePlanInput = {
  /** athlete | coach — decides the shape of the entitlements. */
  audience: string;
  description?: string | null | undefined;
  /** Validated against the zod schema of the audience. */
  entitlements: unknown;
  /** The audience fallback. At most one active free plan per audience. */
  isFree?: boolean | null | undefined;
  name: string;
  /** Stable public id (e.g. athlete-pro). Immutable afterwards. */
  slug: string;
  sortOrder?: number | null | undefined;
  /** draft (default) | active | archived */
  status?: string | null | undefined;
  /** Name/description in non-default locales. */
  translations?: Array<PlanTranslationInput> | null | undefined;
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

export type GenerateMesocycleDraftInput = {
  /** Design for one of your athletes (coaches only): the loads are anchored on THEIR strength, not yours. */
  athleteId?: string | number | null | undefined;
  /** Free-text goal (e.g. hypertrophy, strength, peak). */
  goal?: string | null | undefined;
  /** Anything the model should know, e.g. "squat focus, no hack squat machine". */
  prompt?: string | null | undefined;
  /** Days trained, as 0–6 offsets from the week start. Monday is 0. */
  trainingDays: Array<number>;
  /** How many weeks the block runs for. The template week is repeated in each. */
  weeks: number;
};

export type GenerateMesocycleWeekInput = {
  mesocycleId: string | number;
  /** Replace the week’s still-planned sessions if it exists. */
  replace?: boolean | null | undefined;
  /** 1-based week to generate. */
  week: number;
  /** ISO date (YYYY-MM-DD) overriding the mesocycle start date as the anchor. */
  weekStartDate?: string | null | undefined;
};

export type GenerateSessionPlanDraftInput = {
  /** Program only this exercise entry; omit for the whole session. */
  entryId?: string | number | null | undefined;
  /** Anything the model should know, e.g. "shoulder is sore, keep pressing light". */
  extraInfo?: string | null | undefined;
  sessionId: string | number;
};

export type LogSetInput = {
  entryId: string | number;
  notes?: string | null | undefined;
  plannedReps?: number | null | undefined;
  /** Target reps in reserve (alternative to planned RPE). */
  plannedRir?: number | null | undefined;
  /** Target RPE 0–10 in half-point steps. */
  plannedRpe?: number | null | undefined;
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

export type MesocycleDayExerciseInput = {
  exerciseId: string | number;
  notes?: string | null | undefined;
  sets: Array<MesocycleDaySetInput>;
};

export type MesocycleDaySetInput = {
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

export type MesocycleInput = {
  /** Free-text goal (e.g. hypertrophy, strength, peak). */
  goal?: string | null | undefined;
  microcycles: Array<MicrocycleInput>;
  name: string;
  notes?: string | null | undefined;
  /** ISO date (YYYY-MM-DD) anchoring week 1. */
  startDate?: string | null | undefined;
};

export type MicrocycleDayInput = {
  /** 0–6 offset from the week start. */
  dayOffset: number;
  exercises: Array<MesocycleDayExerciseInput>;
  label?: string | null | undefined;
  notes?: string | null | undefined;
};

export type MicrocycleInput = {
  days: Array<MicrocycleDayInput>;
  label?: string | null | undefined;
  notes?: string | null | undefined;
};

export type PlanSessionFromTemplateInput = {
  /** The athlete this session is planned for. */
  athleteId: string | number;
  notes?: string | null | undefined;
  /** ISO 8601 datetime; defaults to now. */
  performedAt?: string | null | undefined;
  templateId: string | number;
};

export type PlanTranslationInput = {
  description?: string | null | undefined;
  /** A non-default supported locale, e.g. "es". */
  locale: string;
  name: string;
};

export type PlanWorkoutSessionInput = {
  /** The athlete this session is planned for. */
  athleteId: string | number;
  notes?: string | null | undefined;
  /** ISO 8601 datetime; defaults to now. */
  performedAt?: string | null | undefined;
};

export type RefineMesocycleDraftInput = {
  draftId: string | number;
  /** What to change, e.g. "swap the leg press for lunges". */
  message: string;
};

export type RefinePlanDraftInput = {
  draftId: string | number;
  /** What to change, e.g. "less volume, I slept badly". */
  message: string;
};

export type RegisterInput = {
  /** Birth date as YYYY-MM-DD. */
  birthDate?: string | null | undefined;
  email: string;
  firstName?: string | null | undefined;
  /** Height in centimetres (50–300). */
  heightCm?: number | null | undefined;
  lastName?: string | null | undefined;
  /** BCP 47 UI locale, e.g. "es". */
  locale?: string | null | undefined;
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

export type SetAiProviderEnabledInput = {
  enabled: boolean;
  /** "openai" or "anthropic". */
  provider: string;
};

export type SetAiProviderKeyInput = {
  /** The provider API key. Stored encrypted; never returned. */
  apiKey: string;
  /** Model to select; must be callable with this key. */
  model?: string | null | undefined;
  /** "openai" or "anthropic". */
  provider: string;
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

export type UpdateAiProviderModelInput = {
  /** Model id, or null to clear the selection. */
  model?: string | null | undefined;
  /** "openai" or "anthropic". */
  provider: string;
};

export type UpdateExerciseInput = {
  category?: string | null | undefined;
  equipment?: string | null | undefined;
  exerciseId: string | number;
  /** Absent = leave unchanged. */
  name?: string | null | undefined;
  /** Spanish display name. Empty string clears it; absent leaves it unchanged. */
  nameEs?: string | null | undefined;
  primaryMuscle?: string | null | undefined;
};

export type UpdatePlanInput = {
  /** Pass null to clear it. */
  description?: string | null | undefined;
  /** Editing these reaches live subscribers immediately. */
  entitlements?: unknown;
  id: string | number;
  name?: string | null | undefined;
  sortOrder?: number | null | undefined;
  /** Absent leaves translations alone; present replaces the whole set. */
  translations?: Array<PlanTranslationInput> | null | undefined;
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
  /** success | failed; null sends the set back to pending. Absent leaves it as it is. */
  outcome?: string | null | undefined;
  plannedReps?: number | null | undefined;
  /** Target reps in reserve (alternative to planned RPE). */
  plannedRir?: number | null | undefined;
  /** Target RPE 0–10 in half-point steps. */
  plannedRpe?: number | null | undefined;
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

export type AvailablePlansQueryVariables = Exact<{
  audience: string;
  locale?: string | null | undefined;
}>;


export type AvailablePlansQuery = { availablePlans: Array<{ id: string, slug: string, name: string, description: string | null, isFree: boolean, sortOrder: number, maxTemplates: number | null, maxMesocycles: number | null, maxWorkouts: number | null, ai: boolean, planSessions: boolean, maxAthletes: number | null, prices: Array<{ id: string, interval: string, currency: string, amountCents: number, gateways: Array<string> }>, offer: { id: string, name: string, trialDays: number | null, endsAt: string | null, introPhase: { cycles: number, percentOff: number } | null } | null }> };

export type MyPlanQueryVariables = Exact<{ [key: string]: never; }>;


export type MyPlanQuery = { myEntitlements: { athlete: { plan: string, maxTemplates: number | null, maxMesocycles: number | null, maxWorkouts: number | null, ai: boolean }, coach: { plan: string, maxAthletes: number | null, planSessions: boolean, maxTemplates: number | null, maxMesocycles: number | null, ai: boolean } | null }, athleteSubscription: { id: string, planSlug: string, planName: string, gateway: string, status: string, amountCents: number | null, currency: string | null, interval: string | null, currentPeriodEnd: string, cancelAtPeriodEnd: boolean, pendingPlanSlug: string | null, canResume: boolean } | null, coachSubscription: { id: string, planSlug: string, planName: string, gateway: string, status: string, amountCents: number | null, currency: string | null, interval: string | null, currentPeriodEnd: string, cancelAtPeriodEnd: boolean, pendingPlanSlug: string | null, canResume: boolean } | null };

export type MyWorkoutUsageQueryVariables = Exact<{ [key: string]: never; }>;


export type MyWorkoutUsageQuery = { myWorkoutUsage: { templates: number, mesocycles: number, workouts: number } };

export type MyInvoicesQueryVariables = Exact<{
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type MyInvoicesQuery = { myInvoices: { total: number, rows: Array<{ id: string, gateway: string, number: string | null, status: string, amountPaidCents: number, amountDueCents: number, currency: string, hostedUrl: string | null, pdfUrl: string | null, receiptUrl: string | null, issuedAt: string }> } };

export type BillingPortalUrlQueryVariables = Exact<{
  audience: string;
}>;


export type BillingPortalUrlQuery = { billingPortalUrl: string | null };

export type StartCheckoutMutationVariables = Exact<{
  planPriceId: string | number;
  gateway: string;
  offerId?: string | number | null | undefined;
}>;


export type StartCheckoutMutation = { startCheckout: string };

export type CancelSubscriptionMutationVariables = Exact<{
  audience: string;
}>;


export type CancelSubscriptionMutation = { cancelSubscription: boolean };

export type ResumeSubscriptionMutationVariables = Exact<{
  audience: string;
}>;


export type ResumeSubscriptionMutation = { resumeSubscription: boolean };

export type ChangePlanMutationVariables = Exact<{
  planPriceId: string | number;
}>;


export type ChangePlanMutation = { changePlan: string | null };

export type AdminGatewayStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminGatewayStatusQuery = { adminGatewayStatus: Array<{ gateway: string, configured: boolean, syncedPlans: number, totalPlans: number, lastWebhookAt: string | null, failedWebhooks: number }> };

export type AdminWebhookEventsQueryVariables = Exact<{
  status?: string | null | undefined;
  gateway?: string | null | undefined;
  limit?: number | null | undefined;
}>;


export type AdminWebhookEventsQuery = { adminWebhookEvents: { total: number, rows: Array<{ id: string, gateway: string, eventId: string, type: string, status: string, error: string | null, receivedAt: string, processedAt: string | null }> } };

export type AdminBillingDriftQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminBillingDriftQuery = { adminBillingDrift: Array<{ gateway: string, total: number | null, missingLocally: Array<string>, staleLocally: Array<string> }> };

export type RetryWebhookEventMutationVariables = Exact<{
  id: string | number;
}>;


export type RetryWebhookEventMutation = { retryWebhookEvent: boolean };

export type SyncPlanToGatewayMutationVariables = Exact<{
  planId: string | number;
  gateway: string;
}>;


export type SyncPlanToGatewayMutation = { syncPlanToGateway: boolean };

export type AdminExercisesQueryVariables = Exact<{
  categories?: Array<string> | string | null | undefined;
  equipment?: Array<string> | string | null | undefined;
  muscles?: Array<string> | string | null | undefined;
  search?: string | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type AdminExercisesQuery = { adminExercises: { total: number, limit: number, offset: number, rows: Array<{ id: string, slug: string, name: string, nameEs: string | null, category: string, equipment: string, primaryMuscle: string }> } };

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


export type AdminStatsQuery = { apiVersion: string, adminUserStats: { total: number, athletes: number, coaches: number, admins: number, verified: number, active: number, disabled: number, newLast7Days: number, newLast30Days: number }, adminCoachingStats: { links: number, activeCoaches: number, linkedAthletes: number, pendingInvitations: number }, adminWorkoutStats: { sessions: number, completedSessions: number, sets: number, exercises: number, sessionsLast7Days: number, activeUsers: number } };

export type AdminUsersQueryVariables = Exact<{
  roles?: Array<string> | string | null | undefined;
  statuses?: Array<string> | string | null | undefined;
  isAdmin?: boolean | null | undefined;
  verified?: boolean | null | undefined;
  search?: string | null | undefined;
  plans?: Array<string> | string | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type AdminUsersQuery = { adminUsers: { total: number, limit: number, offset: number, rows: Array<{ id: string, email: string, username: string | null, role: string, isAdmin: boolean, status: string, emailVerified: boolean, plan: string | null, createdAt: string }> } };

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

export type MesocycleDraftQueryVariables = Exact<{
  athleteId?: string | number | null | undefined;
}>;


export type MesocycleDraftQuery = { mesocycleDraft: { id: string, athleteId: string | null, provider: string, model: string, status: string, weeks: number, trainingDays: Array<number>, goal: string | null, name: string, updatedAt: string, days: Array<{ dayOffset: number, label: string | null, exercises: Array<{ exerciseId: string, slug: string, name: string, notes: string | null, sets: Array<{ order: number, plannedWeightKg: number | null, plannedReps: number | null, rpe: number | null, rir: number | null, notes: string | null }> }> }>, messages: Array<{ id: string, role: string, content: string, createdAt: string }> } | null };

export type AiMesocycleDraftFieldsFragment = { id: string, athleteId: string | null, provider: string, model: string, status: string, weeks: number, trainingDays: Array<number>, goal: string | null, name: string, updatedAt: string, days: Array<{ dayOffset: number, label: string | null, exercises: Array<{ exerciseId: string, slug: string, name: string, notes: string | null, sets: Array<{ order: number, plannedWeightKg: number | null, plannedReps: number | null, rpe: number | null, rir: number | null, notes: string | null }> }> }>, messages: Array<{ id: string, role: string, content: string, createdAt: string }> };

export type GenerateMesocycleDraftMutationVariables = Exact<{
  input: GenerateMesocycleDraftInput;
}>;


export type GenerateMesocycleDraftMutation = { generateMesocycleDraft: { id: string, athleteId: string | null, provider: string, model: string, status: string, weeks: number, trainingDays: Array<number>, goal: string | null, name: string, updatedAt: string, days: Array<{ dayOffset: number, label: string | null, exercises: Array<{ exerciseId: string, slug: string, name: string, notes: string | null, sets: Array<{ order: number, plannedWeightKg: number | null, plannedReps: number | null, rpe: number | null, rir: number | null, notes: string | null }> }> }>, messages: Array<{ id: string, role: string, content: string, createdAt: string }> } };

export type RefineMesocycleDraftMutationVariables = Exact<{
  input: RefineMesocycleDraftInput;
}>;


export type RefineMesocycleDraftMutation = { refineMesocycleDraft: { id: string, athleteId: string | null, provider: string, model: string, status: string, weeks: number, trainingDays: Array<number>, goal: string | null, name: string, updatedAt: string, days: Array<{ dayOffset: number, label: string | null, exercises: Array<{ exerciseId: string, slug: string, name: string, notes: string | null, sets: Array<{ order: number, plannedWeightKg: number | null, plannedReps: number | null, rpe: number | null, rir: number | null, notes: string | null }> }> }>, messages: Array<{ id: string, role: string, content: string, createdAt: string }> } };

export type AcceptMesocycleDraftMutationVariables = Exact<{
  draftId: string | number;
}>;


export type AcceptMesocycleDraftMutation = { acceptMesocycleDraft: { id: string, status: string } };

export type DiscardMesocycleDraftMutationVariables = Exact<{
  draftId: string | number;
}>;


export type DiscardMesocycleDraftMutation = { discardMesocycleDraft: boolean };

export type SessionPlanDraftQueryVariables = Exact<{
  sessionId: string | number;
}>;


export type SessionPlanDraftQuery = { sessionPlanDraft: { id: string, sessionId: string, entryId: string | null, provider: string, model: string, status: string, updatedAt: string, sets: Array<{ entryId: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, rpe: number | null, rir: number | null, notes: string | null }>, messages: Array<{ id: string, role: string, content: string, createdAt: string }> } | null };

export type AiPlanDraftFieldsFragment = { id: string, sessionId: string, entryId: string | null, provider: string, model: string, status: string, updatedAt: string, sets: Array<{ entryId: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, rpe: number | null, rir: number | null, notes: string | null }>, messages: Array<{ id: string, role: string, content: string, createdAt: string }> };

export type GenerateSessionPlanDraftMutationVariables = Exact<{
  input: GenerateSessionPlanDraftInput;
}>;


export type GenerateSessionPlanDraftMutation = { generateSessionPlanDraft: { id: string, sessionId: string, entryId: string | null, provider: string, model: string, status: string, updatedAt: string, sets: Array<{ entryId: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, rpe: number | null, rir: number | null, notes: string | null }>, messages: Array<{ id: string, role: string, content: string, createdAt: string }> } };

export type RefinePlanDraftMutationVariables = Exact<{
  input: RefinePlanDraftInput;
}>;


export type RefinePlanDraftMutation = { refinePlanDraft: { id: string, sessionId: string, entryId: string | null, provider: string, model: string, status: string, updatedAt: string, sets: Array<{ entryId: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, rpe: number | null, rir: number | null, notes: string | null }>, messages: Array<{ id: string, role: string, content: string, createdAt: string }> } };

export type AcceptPlanDraftMutationVariables = Exact<{
  draftId: string | number;
}>;


export type AcceptPlanDraftMutation = { acceptPlanDraft: { id: string, status: string } };

export type DiscardPlanDraftMutationVariables = Exact<{
  draftId: string | number;
}>;


export type DiscardPlanDraftMutation = { discardPlanDraft: boolean };

export type MyAiSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyAiSettingsQuery = { myAiSettings: Array<{ provider: string, keyLast4: string, model: string | null, enabled: boolean, isDefault: boolean, createdAt: string, updatedAt: string }> };

export type AiModelsQueryVariables = Exact<{
  provider: string;
}>;


export type AiModelsQuery = { aiModels: Array<{ id: string, displayName: string }> };

export type MyAiUsageQueryVariables = Exact<{ [key: string]: never; }>;


export type MyAiUsageQuery = { myAiUsage: { currency: string, rows: Array<{ provider: string, model: string, inputTokens: number, outputTokens: number, inputPricePerMTok: number | null, outputPricePerMTok: number | null, totalCost: number | null, requests: number, lastUsedAt: string }>, totals: { inputTokens: number, outputTokens: number, totalCost: number | null, requests: number } } };

export type SetAiProviderKeyMutationVariables = Exact<{
  input: SetAiProviderKeyInput;
}>;


export type SetAiProviderKeyMutation = { setAiProviderKey: { provider: string, keyLast4: string, model: string | null, enabled: boolean, createdAt: string, updatedAt: string } };

export type UpdateAiProviderModelMutationVariables = Exact<{
  input: UpdateAiProviderModelInput;
}>;


export type UpdateAiProviderModelMutation = { updateAiProviderModel: { provider: string, keyLast4: string, model: string | null, enabled: boolean } };

export type SetAiProviderEnabledMutationVariables = Exact<{
  input: SetAiProviderEnabledInput;
}>;


export type SetAiProviderEnabledMutation = { setAiProviderEnabled: { provider: string, keyLast4: string, model: string | null, enabled: boolean } };

export type SetAiProviderDefaultMutationVariables = Exact<{
  provider: string;
}>;


export type SetAiProviderDefaultMutation = { setAiProviderDefault: { provider: string, isDefault: boolean } };

export type DeleteAiProviderKeyMutationVariables = Exact<{
  provider: string;
}>;


export type DeleteAiProviderKeyMutation = { deleteAiProviderKey: boolean };

export type AthleteWorkoutHistoryQueryVariables = Exact<{
  athleteId: string | number;
  limit?: number | null | undefined;
  status?: string | null | undefined;
  cursor?: string | null | undefined;
}>;


export type AthleteWorkoutHistoryQuery = { athleteWorkoutHistory: { nextCursor: string | null, hasNextPage: boolean, items: Array<{ id: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, exerciseCount: number, setCount: number, totalVolumeKg: number }> } };

export type AthleteWorkoutSessionQueryVariables = Exact<{
  athleteId: string | number;
  id: string | number;
}>;


export type AthleteWorkoutSessionQuery = { athleteWorkoutSession: { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, plannedRpe: number | null, plannedRir: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, outcome: string | null, notes: string | null }> }> } };

export type AthleteTrainingSummaryQueryVariables = Exact<{
  athleteId: string | number;
  from?: string | null | undefined;
  to?: string | null | undefined;
}>;


export type AthleteTrainingSummaryQuery = { athleteTrainingSummary: { sessions: number, trainingDays: number, totalSets: number, totalReps: number, totalVolumeKg: number, avgRpe: number | null, distinctExercises: number, bestSquatE1rmKg: number | null, bestBenchE1rmKg: number | null, bestDeadliftE1rmKg: number | null, estimatedTotalKg: number | null } };

export type AthleteExerciseStatsQueryVariables = Exact<{
  athleteId: string | number;
  from?: string | null | undefined;
  to?: string | null | undefined;
}>;


export type AthleteExerciseStatsQuery = { athleteExerciseStats: Array<{ exerciseId: string, slug: string, name: string, category: string, totalVolumeKg: number, totalSets: number, totalReps: number, bestE1rmKg: number | null, heaviestWeightKg: number | null }> };

export type AthleteExerciseSessionHistoryQueryVariables = Exact<{
  athleteId: string | number;
  exerciseId: string | number;
  excludeSessionId?: string | number | null | undefined;
  limit?: number | null | undefined;
}>;


export type AthleteExerciseSessionHistoryQuery = { athleteExerciseSessionHistory: Array<{ sessionId: string, performedAt: string, status: string, sets: Array<{ plannedWeightKg: number | null, plannedReps: number | null, weightKg: number, reps: number, rpe: number | null, rir: number | null, e1rmKg: number | null }> }> };

export type AthleteMesocyclesQueryVariables = Exact<{
  athleteId: string | number;
}>;


export type AthleteMesocyclesQuery = { athleteMesocycles: Array<{ id: string, plannedByUserId: string | null, name: string, goal: string | null, status: string, startDate: string | null, updatedAt: string, weekCount: number, dayCount: number }> };

export type PlanWorkoutSessionMutationVariables = Exact<{
  input: PlanWorkoutSessionInput;
}>;


export type PlanWorkoutSessionMutation = { planWorkoutSession: { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, plannedRpe: number | null, plannedRir: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, outcome: string | null, notes: string | null }> }> } };

export type PlanSessionFromTemplateMutationVariables = Exact<{
  input: PlanSessionFromTemplateInput;
}>;


export type PlanSessionFromTemplateMutation = { planSessionFromTemplate: { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, plannedRpe: number | null, plannedRir: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, outcome: string | null, notes: string | null }> }> } };

export type AssignMesocycleToAthleteMutationVariables = Exact<{
  athleteId: string | number;
  mesocycleId: string | number;
  startDate?: string | null | undefined;
}>;


export type AssignMesocycleToAthleteMutation = { assignMesocycleToAthlete: { id: string, name: string, ownerId: string, plannedByUserId: string | null } };

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

export type AdminPlansQueryVariables = Exact<{
  audience?: string | null | undefined;
}>;


export type AdminPlansQuery = { adminPlans: Array<{ id: string, audience: string, slug: string, name: string, description: string | null, status: string, isFree: boolean, sortOrder: number, entitlements: unknown, stripeProductId: string | null, paypalProductId: string | null, snapshot: { maxTemplates: number | null, maxMesocycles: number | null, maxWorkouts: number | null, ai: boolean, planSessions: boolean, maxAthletes: number | null }, prices: Array<{ id: string, interval: string, currency: string, amountCents: number, active: boolean, stripePriceId: string | null, paypalPlanId: string | null }>, translations: Array<{ locale: string, name: string, description: string | null }> }> };

export type AdminPlanEntitlementsSchemaQueryVariables = Exact<{
  audience: string;
}>;


export type AdminPlanEntitlementsSchemaQuery = { adminPlanEntitlementsSchema: unknown };

export type CreatePlanMutationVariables = Exact<{
  input: CreatePlanInput;
}>;


export type CreatePlanMutation = { createPlan: string };

export type UpdatePlanMutationVariables = Exact<{
  input: UpdatePlanInput;
}>;


export type UpdatePlanMutation = { updatePlan: boolean };

export type SetPlanStatusMutationVariables = Exact<{
  id: string | number;
  status: string;
}>;


export type SetPlanStatusMutation = { setPlanStatus: boolean };

export type AddPlanPriceMutationVariables = Exact<{
  input: AddPlanPriceInput;
}>;


export type AddPlanPriceMutation = { addPlanPrice: string };

export type DeactivatePlanPriceMutationVariables = Exact<{
  id: string | number;
}>;


export type DeactivatePlanPriceMutation = { deactivatePlanPrice: boolean };

export type AdminBillingStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminBillingStatsQuery = { adminBillingStats: { activeSubscriptions: number, trialing: number, pastDue: number, canceling: number, byStatus: Array<{ status: string, gateway: string, count: number }>, byPlan: Array<{ plan: string, audience: string, count: number }>, mrr: Array<{ plan: string, currency: string, amountCents: number }> } };

export type AdminSubscriptionsQueryVariables = Exact<{
  status?: string | null | undefined;
  gateway?: string | null | undefined;
  planId?: string | number | null | undefined;
  search?: string | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type AdminSubscriptionsQuery = { adminSubscriptions: { total: number, limit: number, offset: number, rows: Array<{ id: string, userId: string, email: string | null, username: string | null, planSlug: string, planName: string, gateway: string, status: string, amountCents: number | null, currency: string | null, interval: string | null, currentPeriodEnd: string, cancelAtPeriodEnd: boolean }> } };

export type AdminAssignSubscriptionMutationVariables = Exact<{
  input: AssignSubscriptionInput;
}>;


export type AdminAssignSubscriptionMutation = { adminAssignSubscription: string };

export type AdminRevokeSubscriptionMutationVariables = Exact<{
  id: string | number;
}>;


export type AdminRevokeSubscriptionMutation = { adminRevokeSubscription: boolean };

export type MyAthletesQueryVariables = Exact<{ [key: string]: never; }>;


export type MyAthletesQuery = { myAthletes: Array<{ userId: string, username: string, firstName: string | null, lastName: string | null, avatarUrl: string | null }> };

export type MyCoachesQueryVariables = Exact<{ [key: string]: never; }>;


export type MyCoachesQuery = { myCoaches: Array<{ userId: string, username: string, firstName: string | null, lastName: string | null, avatarUrl: string | null }> };

export type PendingInvitationsQueryVariables = Exact<{ [key: string]: never; }>;


export type PendingInvitationsQuery = { pendingInvitations: Array<{ id: string, coachId: string, coachUsername: string, createdAt: string }> };

export type BecomeCoachMutationVariables = Exact<{ [key: string]: never; }>;


export type BecomeCoachMutation = { becomeCoach: { id: string, role: string } };

export type RemoveAthleteMutationVariables = Exact<{
  athleteId: string | number;
}>;


export type RemoveAthleteMutation = { removeAthlete: boolean };

export type LeaveCoachMutationVariables = Exact<{
  coachId: string | number;
}>;


export type LeaveCoachMutation = { leaveCoach: boolean };

export type InviteAthleteMutationVariables = Exact<{
  email: string;
}>;


export type InviteAthleteMutation = { inviteAthlete: { id: string, status: string } };

export type CoachInvitationPreviewQueryVariables = Exact<{
  token: string;
}>;


export type CoachInvitationPreviewQuery = { coachInvitationPreview: { email: string, coachUsername: string, suggestedUsername: string } | null };

export type AthleteNoteQueryVariables = Exact<{
  athleteId: string | number;
}>;


export type AthleteNoteQuery = { athleteNote: { body: string, updatedAt: string } | null };

export type SetAthleteNoteMutationVariables = Exact<{
  athleteId: string | number;
  body: string;
}>;


export type SetAthleteNoteMutation = { setAthleteNote: boolean };

export type AcceptInvitationMutationVariables = Exact<{
  id: string | number;
}>;


export type AcceptInvitationMutation = { acceptInvitation: { id: string, status: string } };

export type DeclineInvitationMutationVariables = Exact<{
  id: string | number;
}>;


export type DeclineInvitationMutation = { declineInvitation: { id: string, status: string } };

export type MesocycleFieldsFragment = { id: string, ownerId: string, plannedByUserId: string | null, name: string, notes: string | null, goal: string | null, startDate: string | null, status: string, createdAt: string, updatedAt: string, generatedWeeks: Array<number>, microcycles: Array<{ id: string, weekIndex: number, label: string | null, notes: string | null, days: Array<{ id: string, order: number, dayOffset: number, label: string | null, notes: string | null, exercises: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, rpe: number | null, rir: number | null, notes: string | null }> }> }> }> };

export type MesocyclesQueryVariables = Exact<{
  search?: string | null | undefined;
}>;


export type MesocyclesQuery = { mesocycles: Array<{ id: string, plannedByUserId: string | null, name: string, notes: string | null, goal: string | null, status: string, startDate: string | null, updatedAt: string, weekCount: number, dayCount: number }> };

export type MesocycleQueryVariables = Exact<{
  id: string | number;
}>;


export type MesocycleQuery = { mesocycle: { id: string, ownerId: string, plannedByUserId: string | null, name: string, notes: string | null, goal: string | null, startDate: string | null, status: string, createdAt: string, updatedAt: string, generatedWeeks: Array<number>, microcycles: Array<{ id: string, weekIndex: number, label: string | null, notes: string | null, days: Array<{ id: string, order: number, dayOffset: number, label: string | null, notes: string | null, exercises: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, rpe: number | null, rir: number | null, notes: string | null }> }> }> }> } };

export type CreateMesocycleMutationVariables = Exact<{
  input: MesocycleInput;
}>;


export type CreateMesocycleMutation = { createMesocycle: { id: string, ownerId: string, plannedByUserId: string | null, name: string, notes: string | null, goal: string | null, startDate: string | null, status: string, createdAt: string, updatedAt: string, generatedWeeks: Array<number>, microcycles: Array<{ id: string, weekIndex: number, label: string | null, notes: string | null, days: Array<{ id: string, order: number, dayOffset: number, label: string | null, notes: string | null, exercises: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, rpe: number | null, rir: number | null, notes: string | null }> }> }> }> } };

export type CreateAthleteMesocycleMutationVariables = Exact<{
  athleteId: string | number;
  input: MesocycleInput;
}>;


export type CreateAthleteMesocycleMutation = { createAthleteMesocycle: { id: string, ownerId: string, plannedByUserId: string | null, name: string, notes: string | null, goal: string | null, startDate: string | null, status: string, createdAt: string, updatedAt: string, generatedWeeks: Array<number>, microcycles: Array<{ id: string, weekIndex: number, label: string | null, notes: string | null, days: Array<{ id: string, order: number, dayOffset: number, label: string | null, notes: string | null, exercises: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, rpe: number | null, rir: number | null, notes: string | null }> }> }> }> } };

export type UpdateMesocycleMutationVariables = Exact<{
  id: string | number;
  input: MesocycleInput;
}>;


export type UpdateMesocycleMutation = { updateMesocycle: { id: string, ownerId: string, plannedByUserId: string | null, name: string, notes: string | null, goal: string | null, startDate: string | null, status: string, createdAt: string, updatedAt: string, generatedWeeks: Array<number>, microcycles: Array<{ id: string, weekIndex: number, label: string | null, notes: string | null, days: Array<{ id: string, order: number, dayOffset: number, label: string | null, notes: string | null, exercises: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, rpe: number | null, rir: number | null, notes: string | null }> }> }> }> } };

export type DeleteMesocycleMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteMesocycleMutation = { deleteMesocycle: boolean };

export type SetMesocycleStatusMutationVariables = Exact<{
  id: string | number;
  status: string;
}>;


export type SetMesocycleStatusMutation = { setMesocycleStatus: { id: string, ownerId: string, plannedByUserId: string | null, name: string, notes: string | null, goal: string | null, startDate: string | null, status: string, createdAt: string, updatedAt: string, generatedWeeks: Array<number>, microcycles: Array<{ id: string, weekIndex: number, label: string | null, notes: string | null, days: Array<{ id: string, order: number, dayOffset: number, label: string | null, notes: string | null, exercises: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, rpe: number | null, rir: number | null, notes: string | null }> }> }> }> } };

export type GenerateMesocycleWeekMutationVariables = Exact<{
  input: GenerateMesocycleWeekInput;
}>;


export type GenerateMesocycleWeekMutation = { generateMesocycleWeek: Array<{ id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, plannedRpe: number | null, plannedRir: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, outcome: string | null, notes: string | null }> }> }> };

export type MyNotificationsQueryVariables = Exact<{
  limit?: number | null | undefined;
  cursor?: string | null | undefined;
}>;


export type MyNotificationsQuery = { myNotifications: { nextCursor: string | null, hasNextPage: boolean, items: Array<{ id: string, type: string, data: string, readAt: string | null, createdAt: string }> } };

export type UnreadNotificationsCountQueryVariables = Exact<{ [key: string]: never; }>;


export type UnreadNotificationsCountQuery = { unreadNotificationsCount: number };

export type MarkNotificationReadMutationVariables = Exact<{
  id: string | number;
}>;


export type MarkNotificationReadMutation = { markNotificationRead: boolean };

export type MarkAllNotificationsReadMutationVariables = Exact<{ [key: string]: never; }>;


export type MarkAllNotificationsReadMutation = { markAllNotificationsRead: number };

export type DeleteNotificationMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteNotificationMutation = { deleteNotification: boolean };

export type DeleteReadNotificationsMutationVariables = Exact<{ [key: string]: never; }>;


export type DeleteReadNotificationsMutation = { deleteReadNotifications: number };

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


export type CreateSessionFromTemplateMutation = { createSessionFromTemplate: { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, plannedRpe: number | null, plannedRir: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, outcome: string | null, notes: string | null }> }> } };

export type WorkoutSessionFieldsFragment = { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, plannedRpe: number | null, plannedRir: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, outcome: string | null, notes: string | null }> }> };

export type ExercisesQueryVariables = Exact<{
  category?: string | null | undefined;
}>;


export type ExercisesQuery = { exercises: Array<{ id: string, slug: string, name: string, category: string, equipment: string, primaryMuscle: string }> };

export type WorkoutSessionQueryVariables = Exact<{
  id: string | number;
}>;


export type WorkoutSessionQuery = { workoutSession: { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, plannedRpe: number | null, plannedRir: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, outcome: string | null, notes: string | null }> }> } };

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


export type ExerciseSessionHistoryQuery = { exerciseSessionHistory: Array<{ sessionId: string, performedAt: string, status: string, sets: Array<{ plannedWeightKg: number | null, plannedReps: number | null, weightKg: number, reps: number, rpe: number | null, rir: number | null, e1rmKg: number | null }> }> };

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


export type CreateWorkoutSessionMutation = { createWorkoutSession: { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, plannedRpe: number | null, plannedRir: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, outcome: string | null, notes: string | null }> }> } };

export type AddExerciseEntryMutationVariables = Exact<{
  input: AddExerciseEntryInput;
}>;


export type AddExerciseEntryMutation = { addExerciseEntry: { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, plannedRpe: number | null, plannedRir: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, outcome: string | null, notes: string | null }> }> } };

export type RemoveExerciseEntryMutationVariables = Exact<{
  sessionId: string | number;
  entryId: string | number;
}>;


export type RemoveExerciseEntryMutation = { removeExerciseEntry: { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, plannedRpe: number | null, plannedRir: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, outcome: string | null, notes: string | null }> }> } };

export type LogSetMutationVariables = Exact<{
  input: LogSetInput;
}>;


export type LogSetMutation = { logSet: { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, plannedRpe: number | null, plannedRir: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, outcome: string | null, notes: string | null }> }> } };

export type UpdateSetMutationVariables = Exact<{
  input: UpdateSetInput;
}>;


export type UpdateSetMutation = { updateSet: { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, plannedRpe: number | null, plannedRir: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, outcome: string | null, notes: string | null }> }> } };

export type CompleteSetMutationVariables = Exact<{
  input: CompleteSetInput;
}>;


export type CompleteSetMutation = { completeSet: { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, plannedRpe: number | null, plannedRir: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, outcome: string | null, notes: string | null }> }> } };

export type RemoveSetMutationVariables = Exact<{
  sessionId: string | number;
  entryId: string | number;
  setId: string | number;
}>;


export type RemoveSetMutation = { removeSet: { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, plannedRpe: number | null, plannedRir: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, outcome: string | null, notes: string | null }> }> } };

export type UpdateWorkoutSessionMutationVariables = Exact<{
  input: UpdateWorkoutSessionInput;
}>;


export type UpdateWorkoutSessionMutation = { updateWorkoutSession: { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, plannedRpe: number | null, plannedRir: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, outcome: string | null, notes: string | null }> }> } };

export type CompleteWorkoutSessionMutationVariables = Exact<{
  id: string | number;
}>;


export type CompleteWorkoutSessionMutation = { completeWorkoutSession: { id: string, userId: string, status: string, performedAt: string, notes: string | null, plannedByUserId: string | null, createdAt: string, updatedAt: string, entries: Array<{ id: string, exerciseId: string, order: number, notes: string | null, sets: Array<{ id: string, order: number, plannedWeightKg: number | null, plannedReps: number | null, plannedRpe: number | null, plannedRir: number | null, weightKg: number | null, reps: number | null, rpe: number | null, rir: number | null, e1rmKg: number | null, outcome: string | null, notes: string | null }> }> } };

export type DeleteWorkoutSessionMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteWorkoutSessionMutation = { deleteWorkoutSession: boolean };

export const AiMesocycleDraftFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AiMesocycleDraftFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AiMesocycleDraft"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"athleteId"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"weeks"}},{"kind":"Field","name":{"kind":"Name","value":"trainingDays"}},{"kind":"Field","name":{"kind":"Name","value":"goal"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"days"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dayOffset"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"exercises"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"messages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<AiMesocycleDraftFieldsFragment, unknown>;
export const AiPlanDraftFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AiPlanDraftFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AiPlanDraft"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"sessionId"}},{"kind":"Field","name":{"kind":"Name","value":"entryId"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entryId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}},{"kind":"Field","name":{"kind":"Name","value":"messages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<AiPlanDraftFieldsFragment, unknown>;
export const MesocycleFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MesocycleFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Mesocycle"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ownerId"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"goal"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"generatedWeeks"}},{"kind":"Field","name":{"kind":"Name","value":"microcycles"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"weekIndex"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"days"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"dayOffset"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"exercises"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<MesocycleFieldsFragment, unknown>;
export const WorkoutTemplateFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutTemplateFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutTemplate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ownerId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"exercises"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<WorkoutTemplateFieldsFragment, unknown>;
export const WorkoutSessionFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRpe"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRir"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<WorkoutSessionFieldsFragment, unknown>;
export const AvailablePlansDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AvailablePlans"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"audience"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"locale"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"availablePlans"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"audience"},"value":{"kind":"Variable","name":{"kind":"Name","value":"audience"}}},{"kind":"Argument","name":{"kind":"Name","value":"locale"},"value":{"kind":"Variable","name":{"kind":"Name","value":"locale"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"isFree"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}},{"kind":"Field","name":{"kind":"Name","value":"maxTemplates"}},{"kind":"Field","name":{"kind":"Name","value":"maxMesocycles"}},{"kind":"Field","name":{"kind":"Name","value":"maxWorkouts"}},{"kind":"Field","name":{"kind":"Name","value":"ai"}},{"kind":"Field","name":{"kind":"Name","value":"planSessions"}},{"kind":"Field","name":{"kind":"Name","value":"maxAthletes"}},{"kind":"Field","name":{"kind":"Name","value":"prices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"interval"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"amountCents"}},{"kind":"Field","name":{"kind":"Name","value":"gateways"}}]}},{"kind":"Field","name":{"kind":"Name","value":"offer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"trialDays"}},{"kind":"Field","name":{"kind":"Name","value":"introPhase"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cycles"}},{"kind":"Field","name":{"kind":"Name","value":"percentOff"}}]}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}}]}}]}}]}}]} as unknown as DocumentNode<AvailablePlansQuery, AvailablePlansQueryVariables>;
export const MyPlanDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyPlan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myEntitlements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"athlete"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plan"}},{"kind":"Field","name":{"kind":"Name","value":"maxTemplates"}},{"kind":"Field","name":{"kind":"Name","value":"maxMesocycles"}},{"kind":"Field","name":{"kind":"Name","value":"maxWorkouts"}},{"kind":"Field","name":{"kind":"Name","value":"ai"}}]}},{"kind":"Field","name":{"kind":"Name","value":"coach"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plan"}},{"kind":"Field","name":{"kind":"Name","value":"maxAthletes"}},{"kind":"Field","name":{"kind":"Name","value":"planSessions"}},{"kind":"Field","name":{"kind":"Name","value":"maxTemplates"}},{"kind":"Field","name":{"kind":"Name","value":"maxMesocycles"}},{"kind":"Field","name":{"kind":"Name","value":"ai"}}]}}]}},{"kind":"Field","alias":{"kind":"Name","value":"athleteSubscription"},"name":{"kind":"Name","value":"mySubscription"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"audience"},"value":{"kind":"StringValue","value":"athlete","block":false}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"planSlug"}},{"kind":"Field","name":{"kind":"Name","value":"planName"}},{"kind":"Field","name":{"kind":"Name","value":"gateway"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"amountCents"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"interval"}},{"kind":"Field","name":{"kind":"Name","value":"currentPeriodEnd"}},{"kind":"Field","name":{"kind":"Name","value":"cancelAtPeriodEnd"}},{"kind":"Field","name":{"kind":"Name","value":"pendingPlanSlug"}},{"kind":"Field","name":{"kind":"Name","value":"canResume"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"coachSubscription"},"name":{"kind":"Name","value":"mySubscription"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"audience"},"value":{"kind":"StringValue","value":"coach","block":false}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"planSlug"}},{"kind":"Field","name":{"kind":"Name","value":"planName"}},{"kind":"Field","name":{"kind":"Name","value":"gateway"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"amountCents"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"interval"}},{"kind":"Field","name":{"kind":"Name","value":"currentPeriodEnd"}},{"kind":"Field","name":{"kind":"Name","value":"cancelAtPeriodEnd"}},{"kind":"Field","name":{"kind":"Name","value":"pendingPlanSlug"}},{"kind":"Field","name":{"kind":"Name","value":"canResume"}}]}}]}}]} as unknown as DocumentNode<MyPlanQuery, MyPlanQueryVariables>;
export const MyWorkoutUsageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyWorkoutUsage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myWorkoutUsage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"templates"}},{"kind":"Field","name":{"kind":"Name","value":"mesocycles"}},{"kind":"Field","name":{"kind":"Name","value":"workouts"}}]}}]}}]} as unknown as DocumentNode<MyWorkoutUsageQuery, MyWorkoutUsageQueryVariables>;
export const MyInvoicesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyInvoices"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myInvoices"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"rows"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"gateway"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"amountPaidCents"}},{"kind":"Field","name":{"kind":"Name","value":"amountDueCents"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"hostedUrl"}},{"kind":"Field","name":{"kind":"Name","value":"pdfUrl"}},{"kind":"Field","name":{"kind":"Name","value":"receiptUrl"}},{"kind":"Field","name":{"kind":"Name","value":"issuedAt"}}]}}]}}]}}]} as unknown as DocumentNode<MyInvoicesQuery, MyInvoicesQueryVariables>;
export const BillingPortalUrlDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BillingPortalUrl"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"audience"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"billingPortalUrl"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"audience"},"value":{"kind":"Variable","name":{"kind":"Name","value":"audience"}}}]}]}}]} as unknown as DocumentNode<BillingPortalUrlQuery, BillingPortalUrlQueryVariables>;
export const StartCheckoutDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StartCheckout"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"planPriceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"gateway"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offerId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startCheckout"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"planPriceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"planPriceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"gateway"},"value":{"kind":"Variable","name":{"kind":"Name","value":"gateway"}}},{"kind":"Argument","name":{"kind":"Name","value":"offerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offerId"}}}]}]}}]} as unknown as DocumentNode<StartCheckoutMutation, StartCheckoutMutationVariables>;
export const CancelSubscriptionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CancelSubscription"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"audience"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cancelSubscription"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"audience"},"value":{"kind":"Variable","name":{"kind":"Name","value":"audience"}}}]}]}}]} as unknown as DocumentNode<CancelSubscriptionMutation, CancelSubscriptionMutationVariables>;
export const ResumeSubscriptionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResumeSubscription"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"audience"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resumeSubscription"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"audience"},"value":{"kind":"Variable","name":{"kind":"Name","value":"audience"}}}]}]}}]} as unknown as DocumentNode<ResumeSubscriptionMutation, ResumeSubscriptionMutationVariables>;
export const ChangePlanDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChangePlan"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"planPriceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changePlan"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"planPriceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"planPriceId"}}}]}]}}]} as unknown as DocumentNode<ChangePlanMutation, ChangePlanMutationVariables>;
export const AdminGatewayStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminGatewayStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminGatewayStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"gateway"}},{"kind":"Field","name":{"kind":"Name","value":"configured"}},{"kind":"Field","name":{"kind":"Name","value":"syncedPlans"}},{"kind":"Field","name":{"kind":"Name","value":"totalPlans"}},{"kind":"Field","name":{"kind":"Name","value":"lastWebhookAt"}},{"kind":"Field","name":{"kind":"Name","value":"failedWebhooks"}}]}}]}}]} as unknown as DocumentNode<AdminGatewayStatusQuery, AdminGatewayStatusQueryVariables>;
export const AdminWebhookEventsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminWebhookEvents"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"gateway"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminWebhookEvents"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"Argument","name":{"kind":"Name","value":"gateway"},"value":{"kind":"Variable","name":{"kind":"Name","value":"gateway"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"rows"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"gateway"}},{"kind":"Field","name":{"kind":"Name","value":"eventId"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"processedAt"}}]}}]}}]}}]} as unknown as DocumentNode<AdminWebhookEventsQuery, AdminWebhookEventsQueryVariables>;
export const AdminBillingDriftDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminBillingDrift"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminBillingDrift"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"gateway"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"missingLocally"}},{"kind":"Field","name":{"kind":"Name","value":"staleLocally"}}]}}]}}]} as unknown as DocumentNode<AdminBillingDriftQuery, AdminBillingDriftQueryVariables>;
export const RetryWebhookEventDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RetryWebhookEvent"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"retryWebhookEvent"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<RetryWebhookEventMutation, RetryWebhookEventMutationVariables>;
export const SyncPlanToGatewayDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SyncPlanToGateway"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"planId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"gateway"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"syncPlanToGateway"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"planId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"planId"}}},{"kind":"Argument","name":{"kind":"Name","value":"gateway"},"value":{"kind":"Variable","name":{"kind":"Name","value":"gateway"}}}]}]}}]} as unknown as DocumentNode<SyncPlanToGatewayMutation, SyncPlanToGatewayMutationVariables>;
export const AdminExercisesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminExercises"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"categories"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"equipment"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"muscles"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminExercises"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"categories"},"value":{"kind":"Variable","name":{"kind":"Name","value":"categories"}}},{"kind":"Argument","name":{"kind":"Name","value":"equipment"},"value":{"kind":"Variable","name":{"kind":"Name","value":"equipment"}}},{"kind":"Argument","name":{"kind":"Name","value":"muscles"},"value":{"kind":"Variable","name":{"kind":"Name","value":"muscles"}}},{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rows"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"nameEs"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"equipment"}},{"kind":"Field","name":{"kind":"Name","value":"primaryMuscle"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"limit"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}}]}}]}}]} as unknown as DocumentNode<AdminExercisesQuery, AdminExercisesQueryVariables>;
export const CreateExerciseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateExercise"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateExerciseInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createExercise"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"equipment"}},{"kind":"Field","name":{"kind":"Name","value":"primaryMuscle"}}]}}]}}]} as unknown as DocumentNode<CreateExerciseMutation, CreateExerciseMutationVariables>;
export const UpdateExerciseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateExercise"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateExerciseInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateExercise"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"equipment"}},{"kind":"Field","name":{"kind":"Name","value":"primaryMuscle"}}]}}]}}]} as unknown as DocumentNode<UpdateExerciseMutation, UpdateExerciseMutationVariables>;
export const DeleteExerciseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteExercise"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"exerciseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteExercise"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"exerciseId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"exerciseId"}}}]}]}}]} as unknown as DocumentNode<DeleteExerciseMutation, DeleteExerciseMutationVariables>;
export const AdminStatsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"apiVersion"}},{"kind":"Field","name":{"kind":"Name","value":"adminUserStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"athletes"}},{"kind":"Field","name":{"kind":"Name","value":"coaches"}},{"kind":"Field","name":{"kind":"Name","value":"admins"}},{"kind":"Field","name":{"kind":"Name","value":"verified"}},{"kind":"Field","name":{"kind":"Name","value":"active"}},{"kind":"Field","name":{"kind":"Name","value":"disabled"}},{"kind":"Field","name":{"kind":"Name","value":"newLast7Days"}},{"kind":"Field","name":{"kind":"Name","value":"newLast30Days"}}]}},{"kind":"Field","name":{"kind":"Name","value":"adminCoachingStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"links"}},{"kind":"Field","name":{"kind":"Name","value":"activeCoaches"}},{"kind":"Field","name":{"kind":"Name","value":"linkedAthletes"}},{"kind":"Field","name":{"kind":"Name","value":"pendingInvitations"}}]}},{"kind":"Field","name":{"kind":"Name","value":"adminWorkoutStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sessions"}},{"kind":"Field","name":{"kind":"Name","value":"completedSessions"}},{"kind":"Field","name":{"kind":"Name","value":"sets"}},{"kind":"Field","name":{"kind":"Name","value":"exercises"}},{"kind":"Field","name":{"kind":"Name","value":"sessionsLast7Days"}},{"kind":"Field","name":{"kind":"Name","value":"activeUsers"}}]}}]}}]} as unknown as DocumentNode<AdminStatsQuery, AdminStatsQueryVariables>;
export const AdminUsersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminUsers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"roles"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"statuses"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isAdmin"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"verified"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"plans"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminUsers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"roles"},"value":{"kind":"Variable","name":{"kind":"Name","value":"roles"}}},{"kind":"Argument","name":{"kind":"Name","value":"statuses"},"value":{"kind":"Variable","name":{"kind":"Name","value":"statuses"}}},{"kind":"Argument","name":{"kind":"Name","value":"isAdmin"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isAdmin"}}},{"kind":"Argument","name":{"kind":"Name","value":"verified"},"value":{"kind":"Variable","name":{"kind":"Name","value":"verified"}}},{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}},{"kind":"Argument","name":{"kind":"Name","value":"plans"},"value":{"kind":"Variable","name":{"kind":"Name","value":"plans"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rows"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"plan"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"limit"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}}]}}]}}]} as unknown as DocumentNode<AdminUsersQuery, AdminUsersQueryVariables>;
export const SetUserRoleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetUserRole"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetUserRoleInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setUserRole"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]}}]} as unknown as DocumentNode<SetUserRoleMutation, SetUserRoleMutationVariables>;
export const SetUserAdminDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetUserAdmin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetUserAdminInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setUserAdmin"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}}]}}]}}]} as unknown as DocumentNode<SetUserAdminMutation, SetUserAdminMutationVariables>;
export const SetUserStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetUserStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetUserStatusInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setUserStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<SetUserStatusMutation, SetUserStatusMutationVariables>;
export const MesocycleDraftDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MesocycleDraft"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"athleteId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mesocycleDraft"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"athleteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"athleteId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AiMesocycleDraftFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AiMesocycleDraftFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AiMesocycleDraft"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"athleteId"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"weeks"}},{"kind":"Field","name":{"kind":"Name","value":"trainingDays"}},{"kind":"Field","name":{"kind":"Name","value":"goal"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"days"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dayOffset"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"exercises"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"messages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<MesocycleDraftQuery, MesocycleDraftQueryVariables>;
export const GenerateMesocycleDraftDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateMesocycleDraft"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GenerateMesocycleDraftInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateMesocycleDraft"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AiMesocycleDraftFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AiMesocycleDraftFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AiMesocycleDraft"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"athleteId"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"weeks"}},{"kind":"Field","name":{"kind":"Name","value":"trainingDays"}},{"kind":"Field","name":{"kind":"Name","value":"goal"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"days"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dayOffset"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"exercises"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"messages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<GenerateMesocycleDraftMutation, GenerateMesocycleDraftMutationVariables>;
export const RefineMesocycleDraftDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RefineMesocycleDraft"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RefineMesocycleDraftInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"refineMesocycleDraft"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AiMesocycleDraftFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AiMesocycleDraftFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AiMesocycleDraft"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"athleteId"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"weeks"}},{"kind":"Field","name":{"kind":"Name","value":"trainingDays"}},{"kind":"Field","name":{"kind":"Name","value":"goal"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"days"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dayOffset"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"exercises"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"messages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<RefineMesocycleDraftMutation, RefineMesocycleDraftMutationVariables>;
export const AcceptMesocycleDraftDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AcceptMesocycleDraft"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"draftId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"acceptMesocycleDraft"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"draftId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"draftId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<AcceptMesocycleDraftMutation, AcceptMesocycleDraftMutationVariables>;
export const DiscardMesocycleDraftDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DiscardMesocycleDraft"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"draftId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"discardMesocycleDraft"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"draftId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"draftId"}}}]}]}}]} as unknown as DocumentNode<DiscardMesocycleDraftMutation, DiscardMesocycleDraftMutationVariables>;
export const SessionPlanDraftDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SessionPlanDraft"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sessionPlanDraft"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sessionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AiPlanDraftFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AiPlanDraftFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AiPlanDraft"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"sessionId"}},{"kind":"Field","name":{"kind":"Name","value":"entryId"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entryId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}},{"kind":"Field","name":{"kind":"Name","value":"messages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<SessionPlanDraftQuery, SessionPlanDraftQueryVariables>;
export const GenerateSessionPlanDraftDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateSessionPlanDraft"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GenerateSessionPlanDraftInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateSessionPlanDraft"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AiPlanDraftFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AiPlanDraftFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AiPlanDraft"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"sessionId"}},{"kind":"Field","name":{"kind":"Name","value":"entryId"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entryId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}},{"kind":"Field","name":{"kind":"Name","value":"messages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<GenerateSessionPlanDraftMutation, GenerateSessionPlanDraftMutationVariables>;
export const RefinePlanDraftDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RefinePlanDraft"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RefinePlanDraftInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"refinePlanDraft"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AiPlanDraftFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AiPlanDraftFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AiPlanDraft"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"sessionId"}},{"kind":"Field","name":{"kind":"Name","value":"entryId"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entryId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}},{"kind":"Field","name":{"kind":"Name","value":"messages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<RefinePlanDraftMutation, RefinePlanDraftMutationVariables>;
export const AcceptPlanDraftDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AcceptPlanDraft"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"draftId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"acceptPlanDraft"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"draftId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"draftId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<AcceptPlanDraftMutation, AcceptPlanDraftMutationVariables>;
export const DiscardPlanDraftDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DiscardPlanDraft"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"draftId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"discardPlanDraft"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"draftId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"draftId"}}}]}]}}]} as unknown as DocumentNode<DiscardPlanDraftMutation, DiscardPlanDraftMutationVariables>;
export const MyAiSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyAiSettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myAiSettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"keyLast4"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"isDefault"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<MyAiSettingsQuery, MyAiSettingsQueryVariables>;
export const AiModelsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AiModels"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"provider"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"aiModels"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"provider"},"value":{"kind":"Variable","name":{"kind":"Name","value":"provider"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}}]}}]} as unknown as DocumentNode<AiModelsQuery, AiModelsQueryVariables>;
export const MyAiUsageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyAiUsage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myAiUsage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"rows"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"inputTokens"}},{"kind":"Field","name":{"kind":"Name","value":"outputTokens"}},{"kind":"Field","name":{"kind":"Name","value":"inputPricePerMTok"}},{"kind":"Field","name":{"kind":"Name","value":"outputPricePerMTok"}},{"kind":"Field","name":{"kind":"Name","value":"totalCost"}},{"kind":"Field","name":{"kind":"Name","value":"requests"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totals"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"inputTokens"}},{"kind":"Field","name":{"kind":"Name","value":"outputTokens"}},{"kind":"Field","name":{"kind":"Name","value":"totalCost"}},{"kind":"Field","name":{"kind":"Name","value":"requests"}}]}}]}}]}}]} as unknown as DocumentNode<MyAiUsageQuery, MyAiUsageQueryVariables>;
export const SetAiProviderKeyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetAiProviderKey"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetAiProviderKeyInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setAiProviderKey"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"keyLast4"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<SetAiProviderKeyMutation, SetAiProviderKeyMutationVariables>;
export const UpdateAiProviderModelDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateAiProviderModel"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateAiProviderModelInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAiProviderModel"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"keyLast4"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}}]}}]}}]} as unknown as DocumentNode<UpdateAiProviderModelMutation, UpdateAiProviderModelMutationVariables>;
export const SetAiProviderEnabledDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetAiProviderEnabled"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetAiProviderEnabledInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setAiProviderEnabled"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"keyLast4"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}}]}}]}}]} as unknown as DocumentNode<SetAiProviderEnabledMutation, SetAiProviderEnabledMutationVariables>;
export const SetAiProviderDefaultDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetAiProviderDefault"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"provider"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setAiProviderDefault"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"provider"},"value":{"kind":"Variable","name":{"kind":"Name","value":"provider"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"isDefault"}}]}}]}}]} as unknown as DocumentNode<SetAiProviderDefaultMutation, SetAiProviderDefaultMutationVariables>;
export const DeleteAiProviderKeyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteAiProviderKey"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"provider"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteAiProviderKey"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"provider"},"value":{"kind":"Variable","name":{"kind":"Name","value":"provider"}}}]}]}}]} as unknown as DocumentNode<DeleteAiProviderKeyMutation, DeleteAiProviderKeyMutationVariables>;
export const AthleteWorkoutHistoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AthleteWorkoutHistory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"athleteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"athleteWorkoutHistory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"athleteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"athleteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"Argument","name":{"kind":"Name","value":"cursor"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseCount"}},{"kind":"Field","name":{"kind":"Name","value":"setCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalVolumeKg"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nextCursor"}},{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}}]}}]} as unknown as DocumentNode<AthleteWorkoutHistoryQuery, AthleteWorkoutHistoryQueryVariables>;
export const AthleteWorkoutSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AthleteWorkoutSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"athleteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"athleteWorkoutSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"athleteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"athleteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRpe"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRir"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<AthleteWorkoutSessionQuery, AthleteWorkoutSessionQueryVariables>;
export const AthleteTrainingSummaryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AthleteTrainingSummary"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"athleteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"from"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"to"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"athleteTrainingSummary"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"athleteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"athleteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"from"},"value":{"kind":"Variable","name":{"kind":"Name","value":"from"}}},{"kind":"Argument","name":{"kind":"Name","value":"to"},"value":{"kind":"Variable","name":{"kind":"Name","value":"to"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sessions"}},{"kind":"Field","name":{"kind":"Name","value":"trainingDays"}},{"kind":"Field","name":{"kind":"Name","value":"totalSets"}},{"kind":"Field","name":{"kind":"Name","value":"totalReps"}},{"kind":"Field","name":{"kind":"Name","value":"totalVolumeKg"}},{"kind":"Field","name":{"kind":"Name","value":"avgRpe"}},{"kind":"Field","name":{"kind":"Name","value":"distinctExercises"}},{"kind":"Field","name":{"kind":"Name","value":"bestSquatE1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"bestBenchE1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"bestDeadliftE1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedTotalKg"}}]}}]}}]} as unknown as DocumentNode<AthleteTrainingSummaryQuery, AthleteTrainingSummaryQueryVariables>;
export const AthleteExerciseStatsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AthleteExerciseStats"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"athleteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"from"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"to"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"athleteExerciseStats"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"athleteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"athleteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"from"},"value":{"kind":"Variable","name":{"kind":"Name","value":"from"}}},{"kind":"Argument","name":{"kind":"Name","value":"to"},"value":{"kind":"Variable","name":{"kind":"Name","value":"to"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"totalVolumeKg"}},{"kind":"Field","name":{"kind":"Name","value":"totalSets"}},{"kind":"Field","name":{"kind":"Name","value":"totalReps"}},{"kind":"Field","name":{"kind":"Name","value":"bestE1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"heaviestWeightKg"}}]}}]}}]} as unknown as DocumentNode<AthleteExerciseStatsQuery, AthleteExerciseStatsQueryVariables>;
export const AthleteExerciseSessionHistoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AthleteExerciseSessionHistory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"athleteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"exerciseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"excludeSessionId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"athleteExerciseSessionHistory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"athleteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"athleteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"exerciseId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"exerciseId"}}},{"kind":"Argument","name":{"kind":"Name","value":"excludeSessionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"excludeSessionId"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sessionId"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}}]}}]}}]}}]} as unknown as DocumentNode<AthleteExerciseSessionHistoryQuery, AthleteExerciseSessionHistoryQueryVariables>;
export const AthleteMesocyclesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AthleteMesocycles"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"athleteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"athleteMesocycles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"athleteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"athleteId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"goal"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"weekCount"}},{"kind":"Field","name":{"kind":"Name","value":"dayCount"}}]}}]}}]} as unknown as DocumentNode<AthleteMesocyclesQuery, AthleteMesocyclesQueryVariables>;
export const PlanWorkoutSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PlanWorkoutSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PlanWorkoutSessionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"planWorkoutSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRpe"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRir"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<PlanWorkoutSessionMutation, PlanWorkoutSessionMutationVariables>;
export const PlanSessionFromTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PlanSessionFromTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PlanSessionFromTemplateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"planSessionFromTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRpe"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRir"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<PlanSessionFromTemplateMutation, PlanSessionFromTemplateMutationVariables>;
export const AssignMesocycleToAthleteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AssignMesocycleToAthlete"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"athleteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"mesocycleId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"startDate"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"assignMesocycleToAthlete"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"athleteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"athleteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"mesocycleId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"mesocycleId"}}},{"kind":"Argument","name":{"kind":"Name","value":"startDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"startDate"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"ownerId"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}}]}}]}}]} as unknown as DocumentNode<AssignMesocycleToAthleteMutation, AssignMesocycleToAthleteMutationVariables>;
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
export const AdminPlansDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminPlans"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"audience"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminPlans"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"audience"},"value":{"kind":"Variable","name":{"kind":"Name","value":"audience"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"audience"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"isFree"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}},{"kind":"Field","name":{"kind":"Name","value":"entitlements"}},{"kind":"Field","name":{"kind":"Name","value":"stripeProductId"}},{"kind":"Field","name":{"kind":"Name","value":"paypalProductId"}},{"kind":"Field","name":{"kind":"Name","value":"snapshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"maxTemplates"}},{"kind":"Field","name":{"kind":"Name","value":"maxMesocycles"}},{"kind":"Field","name":{"kind":"Name","value":"maxWorkouts"}},{"kind":"Field","name":{"kind":"Name","value":"ai"}},{"kind":"Field","name":{"kind":"Name","value":"planSessions"}},{"kind":"Field","name":{"kind":"Name","value":"maxAthletes"}}]}},{"kind":"Field","name":{"kind":"Name","value":"prices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"interval"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"amountCents"}},{"kind":"Field","name":{"kind":"Name","value":"active"}},{"kind":"Field","name":{"kind":"Name","value":"stripePriceId"}},{"kind":"Field","name":{"kind":"Name","value":"paypalPlanId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"translations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}}]}}]}}]}}]} as unknown as DocumentNode<AdminPlansQuery, AdminPlansQueryVariables>;
export const AdminPlanEntitlementsSchemaDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminPlanEntitlementsSchema"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"audience"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminPlanEntitlementsSchema"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"audience"},"value":{"kind":"Variable","name":{"kind":"Name","value":"audience"}}}]}]}}]} as unknown as DocumentNode<AdminPlanEntitlementsSchemaQuery, AdminPlanEntitlementsSchemaQueryVariables>;
export const CreatePlanDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreatePlan"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreatePlanInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createPlan"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<CreatePlanMutation, CreatePlanMutationVariables>;
export const UpdatePlanDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdatePlan"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdatePlanInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatePlan"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<UpdatePlanMutation, UpdatePlanMutationVariables>;
export const SetPlanStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetPlanStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setPlanStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}]}]}}]} as unknown as DocumentNode<SetPlanStatusMutation, SetPlanStatusMutationVariables>;
export const AddPlanPriceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddPlanPrice"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddPlanPriceInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addPlanPrice"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<AddPlanPriceMutation, AddPlanPriceMutationVariables>;
export const DeactivatePlanPriceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeactivatePlanPrice"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deactivatePlanPrice"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeactivatePlanPriceMutation, DeactivatePlanPriceMutationVariables>;
export const AdminBillingStatsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminBillingStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminBillingStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"activeSubscriptions"}},{"kind":"Field","name":{"kind":"Name","value":"trialing"}},{"kind":"Field","name":{"kind":"Name","value":"pastDue"}},{"kind":"Field","name":{"kind":"Name","value":"canceling"}},{"kind":"Field","name":{"kind":"Name","value":"byStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"gateway"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"byPlan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plan"}},{"kind":"Field","name":{"kind":"Name","value":"audience"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"mrr"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plan"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"amountCents"}}]}}]}}]}}]} as unknown as DocumentNode<AdminBillingStatsQuery, AdminBillingStatsQueryVariables>;
export const AdminSubscriptionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminSubscriptions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"gateway"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"planId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminSubscriptions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"Argument","name":{"kind":"Name","value":"gateway"},"value":{"kind":"Variable","name":{"kind":"Name","value":"gateway"}}},{"kind":"Argument","name":{"kind":"Name","value":"planId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"planId"}}},{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rows"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"planSlug"}},{"kind":"Field","name":{"kind":"Name","value":"planName"}},{"kind":"Field","name":{"kind":"Name","value":"gateway"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"amountCents"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"interval"}},{"kind":"Field","name":{"kind":"Name","value":"currentPeriodEnd"}},{"kind":"Field","name":{"kind":"Name","value":"cancelAtPeriodEnd"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"limit"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}}]}}]}}]} as unknown as DocumentNode<AdminSubscriptionsQuery, AdminSubscriptionsQueryVariables>;
export const AdminAssignSubscriptionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminAssignSubscription"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AssignSubscriptionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminAssignSubscription"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<AdminAssignSubscriptionMutation, AdminAssignSubscriptionMutationVariables>;
export const AdminRevokeSubscriptionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminRevokeSubscription"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminRevokeSubscription"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<AdminRevokeSubscriptionMutation, AdminRevokeSubscriptionMutationVariables>;
export const MyAthletesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyAthletes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myAthletes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}}]}}]}}]} as unknown as DocumentNode<MyAthletesQuery, MyAthletesQueryVariables>;
export const MyCoachesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyCoaches"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myCoaches"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}}]}}]}}]} as unknown as DocumentNode<MyCoachesQuery, MyCoachesQueryVariables>;
export const PendingInvitationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PendingInvitations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pendingInvitations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"coachId"}},{"kind":"Field","name":{"kind":"Name","value":"coachUsername"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<PendingInvitationsQuery, PendingInvitationsQueryVariables>;
export const BecomeCoachDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"BecomeCoach"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"becomeCoach"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]}}]} as unknown as DocumentNode<BecomeCoachMutation, BecomeCoachMutationVariables>;
export const RemoveAthleteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveAthlete"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"athleteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeAthlete"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"athleteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"athleteId"}}}]}]}}]} as unknown as DocumentNode<RemoveAthleteMutation, RemoveAthleteMutationVariables>;
export const LeaveCoachDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LeaveCoach"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"coachId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"leaveCoach"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"coachId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"coachId"}}}]}]}}]} as unknown as DocumentNode<LeaveCoachMutation, LeaveCoachMutationVariables>;
export const InviteAthleteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"InviteAthlete"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"inviteAthlete"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<InviteAthleteMutation, InviteAthleteMutationVariables>;
export const CoachInvitationPreviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CoachInvitationPreview"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"coachInvitationPreview"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"coachUsername"}},{"kind":"Field","name":{"kind":"Name","value":"suggestedUsername"}}]}}]}}]} as unknown as DocumentNode<CoachInvitationPreviewQuery, CoachInvitationPreviewQueryVariables>;
export const AthleteNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AthleteNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"athleteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"athleteNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"athleteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"athleteId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<AthleteNoteQuery, AthleteNoteQueryVariables>;
export const SetAthleteNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetAthleteNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"athleteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"body"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setAthleteNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"athleteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"athleteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"body"},"value":{"kind":"Variable","name":{"kind":"Name","value":"body"}}}]}]}}]} as unknown as DocumentNode<SetAthleteNoteMutation, SetAthleteNoteMutationVariables>;
export const AcceptInvitationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AcceptInvitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"acceptInvitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<AcceptInvitationMutation, AcceptInvitationMutationVariables>;
export const DeclineInvitationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeclineInvitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"declineInvitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<DeclineInvitationMutation, DeclineInvitationMutationVariables>;
export const MesocyclesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Mesocycles"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mesocycles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"goal"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"weekCount"}},{"kind":"Field","name":{"kind":"Name","value":"dayCount"}}]}}]}}]} as unknown as DocumentNode<MesocyclesQuery, MesocyclesQueryVariables>;
export const MesocycleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Mesocycle"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mesocycle"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MesocycleFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MesocycleFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Mesocycle"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ownerId"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"goal"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"generatedWeeks"}},{"kind":"Field","name":{"kind":"Name","value":"microcycles"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"weekIndex"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"days"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"dayOffset"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"exercises"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<MesocycleQuery, MesocycleQueryVariables>;
export const CreateMesocycleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateMesocycle"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MesocycleInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createMesocycle"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MesocycleFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MesocycleFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Mesocycle"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ownerId"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"goal"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"generatedWeeks"}},{"kind":"Field","name":{"kind":"Name","value":"microcycles"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"weekIndex"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"days"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"dayOffset"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"exercises"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<CreateMesocycleMutation, CreateMesocycleMutationVariables>;
export const CreateAthleteMesocycleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateAthleteMesocycle"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"athleteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MesocycleInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createAthleteMesocycle"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"athleteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"athleteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MesocycleFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MesocycleFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Mesocycle"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ownerId"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"goal"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"generatedWeeks"}},{"kind":"Field","name":{"kind":"Name","value":"microcycles"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"weekIndex"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"days"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"dayOffset"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"exercises"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<CreateAthleteMesocycleMutation, CreateAthleteMesocycleMutationVariables>;
export const UpdateMesocycleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateMesocycle"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MesocycleInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateMesocycle"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MesocycleFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MesocycleFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Mesocycle"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ownerId"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"goal"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"generatedWeeks"}},{"kind":"Field","name":{"kind":"Name","value":"microcycles"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"weekIndex"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"days"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"dayOffset"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"exercises"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<UpdateMesocycleMutation, UpdateMesocycleMutationVariables>;
export const DeleteMesocycleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteMesocycle"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteMesocycle"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteMesocycleMutation, DeleteMesocycleMutationVariables>;
export const SetMesocycleStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetMesocycleStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setMesocycleStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MesocycleFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MesocycleFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Mesocycle"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ownerId"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"goal"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"generatedWeeks"}},{"kind":"Field","name":{"kind":"Name","value":"microcycles"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"weekIndex"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"days"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"dayOffset"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"exercises"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<SetMesocycleStatusMutation, SetMesocycleStatusMutationVariables>;
export const GenerateMesocycleWeekDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateMesocycleWeek"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GenerateMesocycleWeekInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateMesocycleWeek"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRpe"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRir"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<GenerateMesocycleWeekMutation, GenerateMesocycleWeekMutationVariables>;
export const MyNotificationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyNotifications"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myNotifications"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"cursor"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"data"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nextCursor"}},{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}}]}}]} as unknown as DocumentNode<MyNotificationsQuery, MyNotificationsQueryVariables>;
export const UnreadNotificationsCountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UnreadNotificationsCount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unreadNotificationsCount"}}]}}]} as unknown as DocumentNode<UnreadNotificationsCountQuery, UnreadNotificationsCountQueryVariables>;
export const MarkNotificationReadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkNotificationRead"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markNotificationRead"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<MarkNotificationReadMutation, MarkNotificationReadMutationVariables>;
export const MarkAllNotificationsReadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkAllNotificationsRead"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markAllNotificationsRead"}}]}}]} as unknown as DocumentNode<MarkAllNotificationsReadMutation, MarkAllNotificationsReadMutationVariables>;
export const DeleteNotificationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteNotification"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteNotification"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteNotificationMutation, DeleteNotificationMutationVariables>;
export const DeleteReadNotificationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteReadNotifications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteReadNotifications"}}]}}]} as unknown as DocumentNode<DeleteReadNotificationsMutation, DeleteReadNotificationsMutationVariables>;
export const PingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Ping"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ping"}}]}}]} as unknown as DocumentNode<PingQuery, PingQueryVariables>;
export const MyProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyProfile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myProfile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"birthDate"}},{"kind":"Field","name":{"kind":"Name","value":"sex"}},{"kind":"Field","name":{"kind":"Name","value":"heightCm"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<MyProfileQuery, MyProfileQueryVariables>;
export const UpdateProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateProfile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateProfileInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProfile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"birthDate"}},{"kind":"Field","name":{"kind":"Name","value":"sex"}},{"kind":"Field","name":{"kind":"Name","value":"heightCm"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}}]}}]}}]} as unknown as DocumentNode<UpdateProfileMutation, UpdateProfileMutationVariables>;
export const WorkoutTemplatesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"WorkoutTemplates"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workoutTemplates"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseCount"}},{"kind":"Field","name":{"kind":"Name","value":"setCount"}}]}}]}}]} as unknown as DocumentNode<WorkoutTemplatesQuery, WorkoutTemplatesQueryVariables>;
export const WorkoutTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"WorkoutTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workoutTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutTemplateFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutTemplateFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutTemplate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ownerId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"exercises"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<WorkoutTemplateQuery, WorkoutTemplateQueryVariables>;
export const CreateWorkoutTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateWorkoutTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutTemplateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createWorkoutTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutTemplateFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutTemplateFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutTemplate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ownerId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"exercises"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<CreateWorkoutTemplateMutation, CreateWorkoutTemplateMutationVariables>;
export const UpdateWorkoutTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateWorkoutTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutTemplateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateWorkoutTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutTemplateFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutTemplateFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutTemplate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ownerId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"exercises"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateWorkoutTemplateMutation, UpdateWorkoutTemplateMutationVariables>;
export const DeleteWorkoutTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteWorkoutTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteWorkoutTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteWorkoutTemplateMutation, DeleteWorkoutTemplateMutationVariables>;
export const CreateSessionFromTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateSessionFromTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateSessionFromTemplateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSessionFromTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRpe"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRir"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<CreateSessionFromTemplateMutation, CreateSessionFromTemplateMutationVariables>;
export const ExercisesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Exercises"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"category"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exercises"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"category"},"value":{"kind":"Variable","name":{"kind":"Name","value":"category"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"equipment"}},{"kind":"Field","name":{"kind":"Name","value":"primaryMuscle"}}]}}]}}]} as unknown as DocumentNode<ExercisesQuery, ExercisesQueryVariables>;
export const WorkoutSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"WorkoutSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workoutSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRpe"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRir"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<WorkoutSessionQuery, WorkoutSessionQueryVariables>;
export const WorkoutHistoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"WorkoutHistory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"from"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"to"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"exerciseId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workoutHistory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"cursor"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"Argument","name":{"kind":"Name","value":"from"},"value":{"kind":"Variable","name":{"kind":"Name","value":"from"}}},{"kind":"Argument","name":{"kind":"Name","value":"to"},"value":{"kind":"Variable","name":{"kind":"Name","value":"to"}}},{"kind":"Argument","name":{"kind":"Name","value":"exerciseId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"exerciseId"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseCount"}},{"kind":"Field","name":{"kind":"Name","value":"setCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalVolumeKg"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nextCursor"}},{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}}]}}]} as unknown as DocumentNode<WorkoutHistoryQuery, WorkoutHistoryQueryVariables>;
export const ExerciseStatsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ExerciseStats"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"from"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"to"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exerciseStats"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"from"},"value":{"kind":"Variable","name":{"kind":"Name","value":"from"}}},{"kind":"Argument","name":{"kind":"Name","value":"to"},"value":{"kind":"Variable","name":{"kind":"Name","value":"to"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"totalVolumeKg"}},{"kind":"Field","name":{"kind":"Name","value":"totalSets"}},{"kind":"Field","name":{"kind":"Name","value":"totalReps"}},{"kind":"Field","name":{"kind":"Name","value":"bestE1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"heaviestWeightKg"}}]}}]}}]} as unknown as DocumentNode<ExerciseStatsQuery, ExerciseStatsQueryVariables>;
export const ExerciseSessionHistoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ExerciseSessionHistory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"exerciseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"excludeSessionId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exerciseSessionHistory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"exerciseId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"exerciseId"}}},{"kind":"Argument","name":{"kind":"Name","value":"excludeSessionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"excludeSessionId"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sessionId"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}}]}}]}}]}}]} as unknown as DocumentNode<ExerciseSessionHistoryQuery, ExerciseSessionHistoryQueryVariables>;
export const TrainingSummaryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TrainingSummary"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"from"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"to"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"trainingSummary"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"from"},"value":{"kind":"Variable","name":{"kind":"Name","value":"from"}}},{"kind":"Argument","name":{"kind":"Name","value":"to"},"value":{"kind":"Variable","name":{"kind":"Name","value":"to"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sessions"}},{"kind":"Field","name":{"kind":"Name","value":"trainingDays"}},{"kind":"Field","name":{"kind":"Name","value":"totalSets"}},{"kind":"Field","name":{"kind":"Name","value":"totalReps"}},{"kind":"Field","name":{"kind":"Name","value":"totalVolumeKg"}},{"kind":"Field","name":{"kind":"Name","value":"avgRpe"}},{"kind":"Field","name":{"kind":"Name","value":"distinctExercises"}},{"kind":"Field","name":{"kind":"Name","value":"bestSquatE1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"bestBenchE1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"bestDeadliftE1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedTotalKg"}}]}}]}}]} as unknown as DocumentNode<TrainingSummaryQuery, TrainingSummaryQueryVariables>;
export const VolumeSeriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"VolumeSeries"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"from"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"to"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"volumeSeries"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"from"},"value":{"kind":"Variable","name":{"kind":"Name","value":"from"}}},{"kind":"Argument","name":{"kind":"Name","value":"to"},"value":{"kind":"Variable","name":{"kind":"Name","value":"to"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bucketStart"}},{"kind":"Field","name":{"kind":"Name","value":"totalVolumeKg"}},{"kind":"Field","name":{"kind":"Name","value":"totalSets"}},{"kind":"Field","name":{"kind":"Name","value":"sessions"}}]}}]}}]} as unknown as DocumentNode<VolumeSeriesQuery, VolumeSeriesQueryVariables>;
export const StrengthProgressionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StrengthProgression"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"exerciseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"from"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"to"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"strengthProgression"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"exerciseId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"exerciseId"}}},{"kind":"Argument","name":{"kind":"Name","value":"from"},"value":{"kind":"Variable","name":{"kind":"Name","value":"from"}}},{"kind":"Argument","name":{"kind":"Name","value":"to"},"value":{"kind":"Variable","name":{"kind":"Name","value":"to"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"points"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}}]}},{"kind":"Field","name":{"kind":"Name","value":"trend"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slopePerWeekKg"}},{"kind":"Field","name":{"kind":"Name","value":"r2"}},{"kind":"Field","name":{"kind":"Name","value":"projections"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"weeks"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}}]}}]}}]}}]}}]} as unknown as DocumentNode<StrengthProgressionQuery, StrengthProgressionQueryVariables>;
export const TrainingDistributionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TrainingDistribution"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"from"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"to"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"trainingDistribution"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"from"},"value":{"kind":"Variable","name":{"kind":"Name","value":"from"}}},{"kind":"Argument","name":{"kind":"Name","value":"to"},"value":{"kind":"Variable","name":{"kind":"Name","value":"to"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"byMuscle"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"totalVolumeKg"}},{"kind":"Field","name":{"kind":"Name","value":"totalSets"}}]}},{"kind":"Field","name":{"kind":"Name","value":"byCategory"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"totalVolumeKg"}},{"kind":"Field","name":{"kind":"Name","value":"totalSets"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rpe"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"sets"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rir"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"sets"}}]}}]}}]}}]} as unknown as DocumentNode<TrainingDistributionQuery, TrainingDistributionQueryVariables>;
export const CreateWorkoutSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateWorkoutSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateWorkoutSessionInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createWorkoutSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRpe"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRir"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<CreateWorkoutSessionMutation, CreateWorkoutSessionMutationVariables>;
export const AddExerciseEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddExerciseEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddExerciseEntryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addExerciseEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRpe"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRir"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<AddExerciseEntryMutation, AddExerciseEntryMutationVariables>;
export const RemoveExerciseEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveExerciseEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entryId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeExerciseEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sessionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}}},{"kind":"Argument","name":{"kind":"Name","value":"entryId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entryId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRpe"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRir"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<RemoveExerciseEntryMutation, RemoveExerciseEntryMutationVariables>;
export const LogSetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LogSet"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"LogSetInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logSet"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRpe"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRir"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<LogSetMutation, LogSetMutationVariables>;
export const UpdateSetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSet"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateSetInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSet"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRpe"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRir"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateSetMutation, UpdateSetMutationVariables>;
export const CompleteSetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CompleteSet"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CompleteSetInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"completeSet"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRpe"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRir"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<CompleteSetMutation, CompleteSetMutationVariables>;
export const RemoveSetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveSet"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entryId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"setId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeSet"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sessionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}}},{"kind":"Argument","name":{"kind":"Name","value":"entryId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entryId"}}},{"kind":"Argument","name":{"kind":"Name","value":"setId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"setId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRpe"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRir"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<RemoveSetMutation, RemoveSetMutationVariables>;
export const UpdateWorkoutSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateWorkoutSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateWorkoutSessionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateWorkoutSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRpe"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRir"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateWorkoutSessionMutation, UpdateWorkoutSessionMutationVariables>;
export const CompleteWorkoutSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CompleteWorkoutSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"completeWorkoutSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkoutSessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkoutSessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkoutSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"performedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"plannedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"plannedWeightKg"}},{"kind":"Field","name":{"kind":"Name","value":"plannedReps"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRpe"}},{"kind":"Field","name":{"kind":"Name","value":"plannedRir"}},{"kind":"Field","name":{"kind":"Name","value":"weightKg"}},{"kind":"Field","name":{"kind":"Name","value":"reps"}},{"kind":"Field","name":{"kind":"Name","value":"rpe"}},{"kind":"Field","name":{"kind":"Name","value":"rir"}},{"kind":"Field","name":{"kind":"Name","value":"e1rmKg"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<CompleteWorkoutSessionMutation, CompleteWorkoutSessionMutationVariables>;
export const DeleteWorkoutSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteWorkoutSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteWorkoutSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteWorkoutSessionMutation, DeleteWorkoutSessionMutationVariables>;