import { test, expect, describe } from "bun:test";
import { convert } from "../../src/index.ts";

describe("Objects", () => {
  test("empty object", () => {
    const schema = { type: "object" };
    const result = convert(schema);
    expect(result).toBe("{}");
  });

  test("object with required properties", () => {
    const schema = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
      required: ["name", "age"],
    };
    const result = convert(schema);
    expect(result).toContain("name: string;");
    expect(result).toContain("age: number;");
    expect(result).not.toContain("?");
  });

  test("object with optional properties", () => {
    const schema = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
      required: ["name"],
    };
    const result = convert(schema);
    expect(result).toContain("name: string;");
    expect(result).toContain("age?: number;");
  });

  test("object without required (all optional)", () => {
    const schema = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
    };
    const result = convert(schema);
    expect(result).toContain("name?: string;");
    expect(result).toContain("age?: number;");
  });

  test("object with additionalProperties: true", () => {
    const schema = {
      type: "object",
      properties: {
        name: { type: "string" },
      },
      additionalProperties: true,
    };
    const result = convert(schema);
    expect(result).toContain("[key: string]: any;");
  });

  test("object with typed additionalProperties", () => {
    const schema = {
      type: "object",
      properties: {
        name: { type: "string" },
      },
      additionalProperties: { type: "number" },
    };
    const result = convert(schema);
    expect(result).toContain("[key: string]: number;");
  });

  test("object with keys that require escaping", () => {
    const schema = {
      type: "object",
      properties: {
        "my-key": { type: "string" },
        "123": { type: "number" },
      },
      required: ["my-key"],
    };
    const result = convert(schema);
    expect(result).toContain('"my-key": string;');
    expect(result).toContain('"123"?: number;');
  });

  test("complex nested object", () => {
    const schema = {
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
          },
          required: ["name"],
        },
        tags: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["user"],
    };
    const result = convert(schema);
    expect(result).toContain("user:");
    expect(result).toContain("name: string;");
    expect(result).toContain("email?: string;");
    expect(result).toContain("tags?: string[];");
  });
});
