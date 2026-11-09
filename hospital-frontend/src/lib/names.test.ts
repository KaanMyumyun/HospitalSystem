import { describe, expect, it } from 'vitest'
import { auditTone, departmentHue, humanizeAction, initialsOf, personName } from './names'

describe('personName', () => {
  it('turns a login name into a readable name', () => {
    expect(personName('elena.markova')).toBe('Elena Markova')
    expect(personName('ivan_georgiev-jr')).toBe('Ivan Georgiev Jr')
  })

  it('keeps names that already read as names', () => {
    expect(personName('Dr. Ada Lovelace')).toBe('Dr. Ada Lovelace')
    expect(personName('DemoAdmin')).toBe('DemoAdmin')
  })

  it('keeps capitals someone typed on purpose', () => {
    expect(personName('anna.McKay')).toBe('Anna McKay')
  })
})

describe('initialsOf', () => {
  it('takes the first and last name', () => {
    expect(initialsOf('elena.markova')).toBe('EM')
    expect(initialsOf('Dr. Ada King Lovelace')).toBe('AL')
    expect(initialsOf('Plato')).toBe('P')
  })
})

describe('departmentHue', () => {
  it('cycles through eight hues', () => {
    expect(departmentHue(1)).toBe(1)
    expect(departmentHue(8)).toBe(8)
    expect(departmentHue(9)).toBe(1)
    expect(departmentHue(undefined)).toBe(0)
  })
})

describe('audit actions', () => {
  it('reads known actions in plain words', () => {
    expect(humanizeAction('ChangeUserRole')).toBe('Changed a role')
    expect(humanizeAction('SignInLocked')).toBe('Account locked')
  })

  it('splits unknown actions into words', () => {
    expect(humanizeAction('ArchiveOldRecords')).toBe('Archive old records')
  })

  it('marks failures and locks as security events', () => {
    expect(auditTone('SignInFailed')).toBe('security')
    expect(auditTone('ChangePasswordFailed')).toBe('security')
    expect(auditTone('MoveAppointment')).toBe('booking')
    expect(auditTone('CreateDepartment')).toBe('change')
  })
})
