import { test, expect, describe } from "bun:test";
import { convert } from "../../src/index.ts";

describe("Combinators", () => {
  test("oneOf - simple union", () => {
    const schema = {
      oneOf: [{ type: "string" }, { type: "number" }],
    };
    const result = convert(schema);
    expect(result).toBe("string | number");
  });

  test("anyOf - simple union", () => {
    const schema = {
      anyOf: [{ type: "string" }, { type: "number" }],
    };
    const result = convert(schema);
    expect(result).toBe("string | number");
  });

  test("allOf - intersection", () => {
    const schema = {
      allOf: [
        {
          type: "object",
          properties: { name: { type: "string" } },
        } as const,
        {
          type: "object",
          properties: { age: { type: "number" } },
        } as const,
      ],
    } as const;
    const result = convert(schema as any);
    expect(result).toContain("name?: string;");
    expect(result).toContain("age?: number;");
    expect(result).toContain("&");
  });

  test("oneOf with objects", () => {
    const schema = {
      oneOf: [
        {
          type: "object",
          properties: { type: { const: "a" } },
        },
        {
          type: "object",
          properties: { type: { const: "b" } },
        },
      ],
    };
    const result = convert(schema);
    expect(result).toContain("|");
    expect(result).toContain('"a"');
    expect(result).toContain('"b"');
  });
});
