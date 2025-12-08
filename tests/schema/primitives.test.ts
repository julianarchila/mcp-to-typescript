import { test, expect, describe } from "bun:test";
import { convert } from "../../src/index.ts";

describe("Primitive Types", () => {
  test("simple string", () => {
    const schema = { type: "string" };
    const result = convert(schema, "MyString");
    expect(result).toBe("export type MyString = string;");
  });

  test("simple number", () => {
    const schema = { type: "number" };
    const result = convert(schema, "MyNumber");
    expect(result).toBe("export type MyNumber = number;");
  });

  test("integer converts to number", () => {
    const schema = { type: "integer" };
    const result = convert(schema, "MyInteger");
    expect(result).toBe("export type MyInteger = number;");
  });

  test("simple boolean", () => {
    const schema = { type: "boolean" };
    const result = convert(schema, "MyBoolean");
    expect(result).toBe("export type MyBoolean = boolean;");
  });

  test("simple null", () => {
    const schema = { type: "null" };
    const result = convert(schema, "MyNull");
    expect(result).toBe("export type MyNull = null;");
  });
});

describe("Primitive type unions", () => {
  test("string | number", () => {
    const schema = { type: ["string", "number"] };
    const result = convert(schema, "StringOrNumber");
    expect(result).toBe("export type StringOrNumber = string | number;");
  });

  test("string | null", () => {
    const schema = { type: ["string", "null"] };
    const result = convert(schema, "NullableString");
    expect(result).toBe("export type NullableString = string | null;");
  });

  test("multiple types", () => {
    const schema = { type: ["string", "number", "boolean"] };
    const result = convert(schema);
    expect(result).toBe("string | number | boolean");
  });
});
