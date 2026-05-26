import type { ErrorCode } from './types.js'

const DOCS_BASE = 'https://docs.kappelas.com/errors'

interface ErrorHint {
  description: string
  solutions:   string[]
  slug:        string
}

const HINTS: Partial<Record<ErrorCode, ErrorHint>> = {
  UNAUTHORIZED: {
    description: 'Authentication failed. Your token or API key is invalid or expired.',
    solutions: [
      'Verify your bot token is correct',
      'Ensure your API key has not been revoked',
    ],
    slug: 'unauthorized',
  },
  FORBIDDEN: {
    description: 'You do not have permission to perform this action.',
    solutions: [
      'Check that your bot is a participant in this chat',
      'Verify you have the required role (e.g. admin)',
    ],
    slug: 'forbidden',
  },
  NOT_FOUND: {
    description: 'The requested resource does not exist.',
    solutions: [
      'Check the ID is correct',
      'Make sure your bot has access to this resource',
      'List available chats with: bot.chats.list()',
    ],
    slug: 'not_found',
  },
  MISSING_FIELD: {
    description: 'A required field is missing from your request.',
    solutions: [
      'Check the method signature — all required params must be provided',
      'See the full parameter list at the docs link below',
    ],
    slug: 'missing_field',
  },
  INVALID_FIELD: {
    description: 'One or more fields contain invalid values.',
    solutions: [
      'Verify field types match the expected types (e.g. chat_id must be a number)',
      'Check string length and format constraints',
    ],
    slug: 'invalid_field',
  },
  CONFLICT: {
    description: 'The resource already exists or conflicts with an existing state.',
    solutions: ['Check if the resource already exists before creating it'],
    slug: 'conflict',
  },
  INTERNAL_ERROR: {
    description: 'An unexpected error occurred on the Kappela servers.',
    solutions: [
      'Retry the request — this is usually transient',
      'If the problem persists, contact support with the request_id',
    ],
    slug: 'internal_error',
  },
  SERVICE_UNAVAILABLE: {
    description: 'A Kappela service is temporarily unavailable.',
    solutions: [
      'Retry with exponential backoff',
      'Check status.kappelas.com for ongoing incidents',
    ],
    slug: 'service_unavailable',
  },
  UPSTREAM_ERROR: {
    description: 'An upstream Kappela service returned an unexpected response.',
    solutions: [
      'Retry the request',
      'Check status.kappelas.com for service issues',
    ],
    slug: 'upstream_error',
  },
  METHOD_NOT_ALLOWED: {
    description: 'The HTTP method used is not allowed for this endpoint.',
    solutions: [
      'Check you are using the correct HTTP method (GET vs POST)',
      'See the API documentation for this endpoint',
    ],
    slug: 'method_not_allowed',
  },
  INVALID_PATH: {
    description: 'The requested API path does not exist.',
    solutions: [
      'Check for typos in the endpoint path',
      'Verify the SDK version matches the API version',
    ],
    slug: 'invalid_path',
  },
}

export class KappelaError extends Error {
  readonly error_code:  ErrorCode
  readonly status:      number
  readonly request_id?: string
  readonly hint?:       string
  readonly solutions?:  string[]

  constructor(message: string, error_code: ErrorCode, status: number, request_id?: string) {
    super(message)
    this.name       = 'KappelaError'
    this.error_code  = error_code
    this.status      = status
    this.request_id  = request_id
    const h = HINTS[error_code]
    this.hint      = h?.description
    this.solutions = h?.solutions
  }

  override toString(): string {
    const hint = HINTS[this.error_code]
    const lines: string[] = [
      `KappelaError: ${this.message}`,
      `  Code:   ${this.error_code}`,
      `  Status: ${this.status}`,
    ]
    if (hint) {
      lines.push(`\n  ${hint.description}`)
      lines.push('\n  Possible solutions:')
      hint.solutions.forEach(s => lines.push(`  - ${s}`))
      lines.push(`\n  Docs: ${DOCS_BASE}/${hint.slug}`)
    }
    if (this.request_id) {
      lines.push(`  Request ID: ${this.request_id}  (mention this when contacting support)`)
    }
    return lines.join('\n')
  }
}
