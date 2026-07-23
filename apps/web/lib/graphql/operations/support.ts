import { graphql } from '@/lib/graphql/__generated__'

// ── Public contact form ──────────────────────────────────────

export const SendContactMessageDocument = graphql(`
    mutation SendContactMessage($input: ContactInput!) {
        sendContactMessage(input: $input)
    }
`)

// ── Admin support inbox ──────────────────────────────────────

export const AdminSupportTicketsDocument = graphql(`
    query AdminSupportTickets($status: String, $category: String, $search: String, $limit: Int, $offset: Int) {
        adminSupportTickets(status: $status, category: $category, search: $search, limit: $limit, offset: $offset) {
            rows {
                id
                category
                subject
                status
                requesterEmail
                requesterName
                requesterUserId
                requesterUsername
                messageCount
                createdAt
                lastMessageAt
            }
            total
            limit
            offset
        }
    }
`)

export const AdminSupportTicketDocument = graphql(`
    query AdminSupportTicket($id: ID!) {
        adminSupportTicket(id: $id) {
            id
            category
            subject
            status
            requesterEmail
            requesterName
            requesterUserId
            requesterUsername
            createdAt
            updatedAt
            lastMessageAt
            messages {
                id
                direction
                body
                authorUserId
                createdAt
            }
        }
    }
`)

export const SetTicketStatusDocument = graphql(`
    mutation SetTicketStatus($id: ID!, $status: String!) {
        setTicketStatus(id: $id, status: $status)
    }
`)
