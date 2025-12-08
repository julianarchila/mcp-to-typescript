import { test, expect, describe } from "bun:test";
import { convert } from "../../src/index.ts";

describe("Arrays", () => {
  test("string array", () => {
    const schema = {
      type: "array",
      items: { type: "string" },
    };
    const result = convert(schema, "StringArray");
    expect(result).toBe("export type StringArray = string[];");
  });

  test("object array", () => {
    const schema = {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "number" },
        },
      },
    };
    const result = convert(schema);
    expect(result).toContain("id?: number;");
    expect(result).toContain("[]");
  });

  test("array without items (any[])", () => {
    const schema = {
      type: "array",
    };
    const result = convert(schema);
    expect(result).toBe("any[]");
  });

  test("enum array uses parentheses", () => {
    const schema = {
      type: "array",
      items: { enum: ["a", "b", "c"] },
    };
    const result = convert(schema);
    expect(result).toBe('("a" | "b" | "c")[]');
  });

  test("union array uses parentheses", () => {
    const schema = {
      type: "array",
      items: { oneOf: [{ type: "string" }, { type: "number" }] },
    };
    const result = convert(schema);
    expect(result).toBe("(string | number)[]");
  });
});

describe("Tuples", () => {
  test("simple tuple [string, number]", () => {
    const schema = {
      type: "array",
      items: [{ type: "string" }, { type: "number" }],
    };
    const result = convert(schema);
    expect(result).toBe("[string, number]");
  });

  test("complex tuple", () => {
    const schema = {
      type: "array",
      items: [
        { type: "string" },
        { type: "number" },
        { type: "boolean" },
      ],
    };
    const result = convert(schema);
    expect(result).toBe("[string, number, boolean]");
  });

  test("empty tuple", () => {
    const schema = {
      type: "array",
      items: [],
    };
    const result = convert(schema);
    expect(result).toBe("[]");
  });
});
