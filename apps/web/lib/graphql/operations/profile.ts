import { graphql } from '@/lib/graphql/__generated__'

export const MyProfileDocument = graphql(`
    query MyProfile {
        myProfile {
            userId
            displayName
            firstName
            lastName
            birthDate
            sex
            heightCm
            bio
            country
            timezone
            locale
            avatarUrl
            createdAt
            updatedAt
        }
    }
`)

export const UpdateProfileDocument = graphql(`
    mutation UpdateProfile($input: UpdateProfileInput!) {
        updateProfile(input: $input) {
            userId
            displayName
            firstName
            lastName
            birthDate
            sex
            heightCm
            bio
            country
            timezone
            locale
            avatarUrl
        }
    }
`)
