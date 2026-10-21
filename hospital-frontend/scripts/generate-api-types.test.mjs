import { describe, expect, it } from 'vitest'
import { toTypeScript } from './generate-api-types.mjs'

const spec = (schemas) => ({ components: { schemas } })

describe('toTypeScript', () => {
  it('turns a string enum into a union', () => {
    expect(toTypeScript(spec({ Status: { type: 'string', enum: ['Scheduled', 'NoShow'] } }))).toContain(
      "export type Status = 'Scheduled' | 'NoShow'",
    )
  })

  it('makes every property of a response required, and keeps null where the spec allows it', () => {
    const output = toTypeScript(
      spec({
        Result: {
          type: 'object',
          properties: {
            isSuccess: { type: 'boolean' },
            error: { type: 'string', nullable: true },
            data: { type: 'array', items: { $ref: '#/components/schemas/Item' }, nullable: true },
          },
        },
      }),
    )

    expect(output).toContain('export type Result = {\n  isSuccess: boolean\n  error: string | null\n  data: Item[] | null\n}')
  })

  it('makes request body properties outside the required list optional', () => {
    const output = toTypeScript({
      paths: {
        '/api/book': {
          post: {
            requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Input' } } } },
            responses: { 200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Result' } } } } },
          },
        },
      },
      components: {
        schemas: {
          Input: {
            type: 'object',
            required: ['name'],
            properties: { name: { type: 'string' }, patientId: { type: 'integer', nullable: true } },
          },
          Result: { type: 'object', required: ['isSuccess'], properties: { isSuccess: { type: 'boolean' }, error: { type: 'string' } } },
        },
      },
    })

    expect(output).toContain('export type Input = {\n  name: string\n  patientId?: number | null\n}')
    expect(output).toContain('export type Result = {\n  isSuccess: boolean\n  error: string\n}')
  })

  it('reads a reference that may be null from its allOf wrapper', () => {
    const output = toTypeScript(
      spec({
        Result: {
          type: 'object',
          properties: { name: { allOf: [{ $ref: '#/components/schemas/Status' }], nullable: true } },
        },
      }),
    )

    expect(output).toContain('  name: Status | null')
  })

  it('parenthesizes nullable items inside an array', () => {
    expect(
      toTypeScript(spec({ List: { type: 'array', items: { type: 'string', nullable: true } } })),
    ).toContain('export type List = (string | null)[]')
  })
})
