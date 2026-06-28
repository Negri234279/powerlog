import { describe, expect, it } from 'vitest'

import { InvalidUserRoleError } from '../errors/auth.errors'
import { UserRoleVO } from './user-role.vo'

describe('UserRoleVO', () => {
    it('accepts athlete and coach', () => {
        expect(UserRoleVO.create('athlete').value).toBe('athlete')
        expect(UserRoleVO.create('coach').value).toBe('coach')
    })

    it('exposes athlete/coach factories', () => {
        expect(UserRoleVO.athlete().value).toBe('athlete')
        expect(UserRoleVO.coach().value).toBe('coach')
    })

    it('defaults to athlete', () => {
        expect(UserRoleVO.default().value).toBe('athlete')
    })

    it('rejects an unknown role', () => {
        expect(() => UserRoleVO.create('admin')).toThrow(InvalidUserRoleError)
    })

    it('compares by value', () => {
        expect(UserRoleVO.athlete().equals(UserRoleVO.default())).toBe(true)
        expect(UserRoleVO.athlete().equals(UserRoleVO.coach())).toBe(false)
    })
})
