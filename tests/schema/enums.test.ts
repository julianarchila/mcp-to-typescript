import { test, expect, describe } from "bun:test";
import { convert } from "../../src/index.ts";

describe("Enum and Const", () => {
  test("string enum", () => {
    const schema = {
      enum: ["red", "green", "blue"],
    };
    const result = convert(schema);
    expect(result).toBe('"red" | "green" | "blue"');
  });

  test("number enum", () => {
    const schema = {
      enum: [1, 2, 3],
    };
    const result = convert(schema);
    expect(result).toBe("1 | 2 | 3");
  });

  test("mixed enum", () => {
    const schema = {
      enum: ["hello", 42, true],
    };
    const result = convert(schema);
    expect(result).toContain('"hello"');
    expect(result).toContain("42");
    expect(result).toContain("true");
  });

  test("const string", () => {
    const schema = {
      const: "hello",
    };
    const result = convert(schema);
    expect(result).toBe('"hello"');
  });

  test("const number", () => {
    const schema = {
      const: 42,
    };
    const result = convert(schema);
    expect(result).toBe("42");
  });

  test("const boolean", () => {
    const schema = {
      const: true,
    };
    const result = convert(schema);
    expect(result).toBe("true");
  });

  test("const null", () => {
    const schema = {
      const: null,
    };
    const result = convert(schema);
    expect(result).toBe("null");
  });
});
