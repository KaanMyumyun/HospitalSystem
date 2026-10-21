// Writes src/api-schema.ts, one TypeScript type per schema in openapi.json.
// The backend's OpenApiContractTests keeps openapi.json equal to what the API
// serves; run `npm run generate:api` after it changes.
//
// This covers what Swashbuckle emits for this API: objects, arrays, string
// enums, nullable, $ref, and a one-item allOf around a $ref that may be null. It is written here because the usual generators
// need TypeScript 5's compiler API, which TypeScript 7 does not have.
import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const header = `// Generated from openapi.json by scripts/generate-api-types.mjs. Do not edit:
// run \`npm run generate:api\` instead.
`

export function toTypeScript(spec) {
  const schemas = spec.components?.schemas ?? {}
  const requestOnly = requestOnlySchemas(spec)
  const declarations = Object.keys(schemas)
    .sort()
    .map((name) => `export type ${name} = ${typeOf(schemas[name], '', requestOnly.has(name))}\n`)
  return [header, ...declarations].join('\n')
}

function typeOf(schema, indent, isRequest) {
  let type
  if (schema.$ref) type = schema.$ref.replace('#/components/schemas/', '')
  else if (schema.allOf?.length === 1) type = typeOf(schema.allOf[0], indent, isRequest)
  else if (schema.enum) type = schema.enum.map((value) => `'${value}'`).join(' | ')
  else if (schema.type === 'array') type = `${parenthesize(typeOf(schema.items, indent, isRequest))}[]`
  else if (schema.type === 'integer' || schema.type === 'number') type = 'number'
  else if (schema.type === 'boolean') type = 'boolean'
  else if (schema.type === 'string') type = 'string'
  else if (schema.type === 'object' && schema.properties) type = objectType(schema, indent, isRequest)
  else type = 'unknown'
  return schema.nullable ? `${type} | null` : type
}

// A request body may leave out what its required list does not name. A
// response has every property, null or not, whether or not the spec says so:
// Swashbuckle lists none for responses.
function objectType(schema, indent, isRequest) {
  const required = new Set(schema.required ?? [])
  const inner = `${indent}  `
  const lines = Object.entries(schema.properties).map(([name, property]) => {
    const optional = isRequest && !required.has(name) ? '?' : ''
    return `${inner}${name}${optional}: ${typeOf(property, inner, isRequest)}`
  })
  return `{\n${lines.join('\n')}\n${indent}}`
}

// Schemas that appear in request bodies and in no response.
function requestOnlySchemas(spec) {
  const requests = new Set()
  const responses = new Set()
  for (const operations of Object.values(spec.paths ?? {})) {
    for (const operation of Object.values(operations)) {
      for (const media of Object.values(operation.requestBody?.content ?? {})) collectRefs(spec, media.schema, requests)
      for (const response of Object.values(operation.responses ?? {})) {
        for (const media of Object.values(response.content ?? {})) collectRefs(spec, media.schema, responses)
      }
    }
  }
  return new Set([...requests].filter((name) => !responses.has(name)))
}

// The names of the schemas a schema refers to, directly or through others.
function collectRefs(spec, schema, found) {
  if (!schema || typeof schema !== 'object') return
  if (schema.$ref) {
    const name = schema.$ref.replace('#/components/schemas/', '')
    if (found.has(name)) return
    found.add(name)
    collectRefs(spec, spec.components?.schemas?.[name], found)
    return
  }
  for (const value of Object.values(schema)) collectRefs(spec, value, found)
}

function parenthesize(type) {
  return type.includes(' | ') ? `(${type})` : type
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [input = 'openapi.json', output = 'src/api-schema.ts'] = process.argv.slice(2)
  const spec = JSON.parse(await readFile(input, 'utf8'))
  await writeFile(output, toTypeScript(spec))
}
