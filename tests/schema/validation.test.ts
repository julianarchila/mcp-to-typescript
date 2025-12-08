import { test, expect, describe } from "bun:test";
import { convert, jsonSchemaToTypeScript, ParserError } from "../../src/index.ts";

describe("Special cases", () => {
  test("schema without type returns any", () => {
    const schema = {};
    const result = convert(schema);
    expect(result).toBe("any");
  });

  test("unknown type throws error", () => {
    const schema = { type: "unknown-type" };
    expect(() => convert(schema)).toThrow(ParserError);
  });
});

describe("API - returnAST", () => {
  test("returnAST returns the AST", () => {
    const schema = { type: "string" };
    const result = jsonSchemaToTypeScript(schema, { returnAST: true });
    expect(result.ast).toBeDefined();
    expect(result.ast?.kind).toBe("primitive");
    expect(result.code).toBeUndefined();
  });
});

describe("Input validation", () => {
  test("rejects null as schema", () => {
    expect(() => convert(null)).toThrow(ParserError);
    expect(() => convert(null)).toThrow("Schema cannot be null or undefined");
  });

  test("rejects undefined as schema", () => {
    expect(() => convert(undefined)).toThrow(ParserError);
    expect(() => convert(undefined)).toThrow("Schema cannot be null or undefined");
  });

  test("rejects string as schema", () => {
    expect(() => convert("not an object")).toThrow(ParserError);
    expect(() => convert("not an object")).toThrow("Schema must be an object");
  });

  test("rejects number as schema", () => {
    expect(() => convert(42)).toThrow(ParserError);
    expect(() => convert(42)).toThrow("Schema must be an object");
  });

  test("rejects boolean as schema", () => {
    expect(() => convert(true)).toThrow(ParserError);
    expect(() => convert(true)).toThrow("Schema must be an object");
  });

  test("rejects array as schema", () => {
    expect(() => convert([1, 2, 3])).toThrow(ParserError);
    expect(() => convert([1, 2, 3])).toThrow("Schema must be an object");
  });

  test("accepts empty object as valid schema", () => {
    const result = convert({});
    expect(result).toBe("any");
  });

  test("accepts object with unknown properties", () => {
    const result = convert({ type: "string", unknownProp: "value" });
    expect(result).toBe("string");
  });
});

describe("Real world examples", () => {
  test("User with multiple properties", () => {
    const schema = {
      type: "object",
      properties: {
        id: { type: "integer" },
        username: { type: "string" },
        email: { type: "string" },
        isActive: { type: "boolean" },
        roles: {
          type: "array",
          items: { enum: ["admin", "user", "moderator"] },
        },
      },
      required: ["id", "username", "email"],
    };
    const result = convert(schema, "User");
    expect(result).toContain("id: number;");
    expect(result).toContain("username: string;");
    expect(result).toContain("email: string;");
    expect(result).toContain("isActive?: boolean;");
    expect(result).toContain("roles?:");
  });

  test("API Response with generic data", () => {
    const schema = {
      type: "object",
      properties: {
        success: { type: "boolean" },
        data: { type: "object" },
        error: {
          oneOf: [{ type: "string" }, { type: "null" }],
        },
      },
      required: ["success"],
    };
    const result = convert(schema, "ApiResponse");
    expect(result).toContain("success: boolean;");
    expect(result).toContain("data?:");
    expect(result).toContain("error?:");
    expect(result).toContain("string | null");
  });
});
