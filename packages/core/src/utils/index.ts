// Core utilities will go here
export function formatResponse(response: unknown): string {
  return JSON.stringify(response, null, 2)
}

export function validateInput(input: unknown): boolean {
  return input !== null && input !== undefined
}
