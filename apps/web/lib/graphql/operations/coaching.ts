import { graphql } from '@/lib/graphql/__generated__'

// ── Links (coaches ↔ athletes) ───────────────────────────────

export const MyAthletesDocument = graphql(`
    query MyAthletes {
        myAthletes {
            userId
            username
        }
    }
`)

export const MyCoachesDocument = graphql(`
    query MyCoaches {
        myCoaches {
            userId
            username
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

export const InviteAthleteDocument = graphql(`
    mutation InviteAthlete($username: String!) {
        inviteAthlete(username: $username) {
            id
            status
        }
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
