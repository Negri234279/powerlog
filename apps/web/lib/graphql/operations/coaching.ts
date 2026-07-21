import { graphql } from '@/lib/graphql/__generated__'

// ── Links (coaches ↔ athletes) ───────────────────────────────

export const MyAthletesDocument = graphql(`
    query MyAthletes {
        myAthletes {
            userId
            username
            firstName
            lastName
            avatarUrl
        }
    }
`)

export const MyAthleteDocument = graphql(`
    query MyAthlete($athleteId: ID!) {
        myAthlete(athleteId: $athleteId) {
            userId
            username
            firstName
            lastName
            avatarUrl
        }
    }
`)

export const MyCoachesDocument = graphql(`
    query MyCoaches {
        myCoaches {
            userId
            username
            firstName
            lastName
            avatarUrl
        }
    }
`)

export const PendingInvitationsDocument = graphql(`
    query PendingInvitations {
        pendingInvitations {
            id
            coachId
            coachUsername
            createdAt
        }
    }
`)

// ── Mutations ────────────────────────────────────────────────

export const BecomeCoachDocument = graphql(`
    mutation BecomeCoach {
        becomeCoach {
            id
            role
        }
    }
`)

export const RemoveAthleteDocument = graphql(`
    mutation RemoveAthlete($athleteId: ID!) {
        removeAthlete(athleteId: $athleteId)
    }
`)

export const LeaveCoachDocument = graphql(`
    mutation LeaveCoach($coachId: ID!) {
        leaveCoach(coachId: $coachId)
    }
`)

export const InviteAthleteDocument = graphql(`
    mutation InviteAthlete($email: String!) {
        inviteAthlete(email: $email) {
            id
            status
        }
    }
`)

// ── Public invitation preview (invite-aware signup) ──────────

export const CoachInvitationPreviewDocument = graphql(`
    query CoachInvitationPreview($token: String!) {
        coachInvitationPreview(token: $token) {
            email
            coachUsername
            suggestedUsername
        }
    }
`)

// ── Athlete note (coach's private note) ──────────────────────

export const AthleteNoteDocument = graphql(`
    query AthleteNote($athleteId: ID!) {
        athleteNote(athleteId: $athleteId) {
            body
            updatedAt
        }
    }
`)

export const SetAthleteNoteDocument = graphql(`
    mutation SetAthleteNote($athleteId: ID!, $body: String!) {
        setAthleteNote(athleteId: $athleteId, body: $body)
    }
`)

export const AcceptInvitationDocument = graphql(`
    mutation AcceptInvitation($id: ID!) {
        acceptInvitation(id: $id) {
            id
            status
        }
    }
`)

export const DeclineInvitationDocument = graphql(`
    mutation DeclineInvitation($id: ID!) {
        declineInvitation(id: $id) {
            id
            status
        }
    }
`)
