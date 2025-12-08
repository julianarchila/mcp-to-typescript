/**
 * Parser Error
 * Custom error type for JSON Schema parsing errors
 */

export class ParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParserError";
  }
}
