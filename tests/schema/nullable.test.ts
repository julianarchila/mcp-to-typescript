import { test, expect, describe } from "bun:test";
import { convert } from "../../src/index.ts";

describe("Nullable", () => {
  test("nullable string primitive", () => {
    const schema = { type: "string", nullable: true };
    const result = convert(schema, "NullableString");
    expect(result).toBe("export type NullableString = string | null;");
  });

  test("nullable number primitive", () => {
    const schema = { type: "number", nullable: true };
    const result = convert(schema, "NullableNumber");
    expect(result).toBe("export type NullableNumber = number | null;");
  });

  test("nullable boolean primitive", () => {
    const schema = { type: "boolean", nullable: true };
    const result = convert(schema, "NullableBoolean");
    expect(result).toBe("export type NullableBoolean = boolean | null;");
  });

  test("nullable integer converts to number | null", () => {
    const schema = { type: "integer", nullable: true };
    const result = convert(schema, "NullableInteger");
    expect(result).toBe("export type NullableInteger = number | null;");
  });

  test("object with nullable properties", () => {
    const schema = {
      type: "object",
      properties: {
        name: { type: "string", nullable: true },
        age: { type: "number", nullable: false },
        email: { type: "string" },
      },
      required: ["name", "age"],
    };
    const result = convert(schema);
    expect(result).toContain("name: string | null;");
    expect(result).toContain("age: number;");
    expect(result).toContain("email?: string;");
  });

  test("optional AND nullable property", () => {
    const schema = {
      type: "object",
      properties: {
        title: { type: "string", nullable: true },
      },
    };
    const result = convert(schema);
    // Optional (not in required) and nullable
    expect(result).toContain("title?: string | null;");
  });

  test("required AND nullable property", () => {
    const schema = {
      type: "object",
      properties: {
        id: { type: "string", nullable: true },
      },
      required: ["id"],
    };
    const result = convert(schema);
    // Required but nullable
    expect(result).toContain("id: string | null;");
  });

  test("nullable enum", () => {
    const schema = {
      type: "string",
      enum: ["red", "green", "blue"],
      nullable: true,
    };
    const result = convert(schema);
    expect(result).toBe('"red" | "green" | "blue" | null');
  });

  test("nullable array", () => {
    const schema = {
      type: "array",
      items: { type: "string" },
      nullable: true,
    };
    const result = convert(schema);
    expect(result).toBe("string[] | null");
  });

  test("nullable object", () => {
    const schema = {
      type: "object",
      properties: {
        name: { type: "string" },
      },
      nullable: true,
    };
    const result = convert(schema);
    expect(result).toContain("name?: string;");
    expect(result).toContain("| null");
  });

  test("array of nullable items", () => {
    const schema = {
      type: "array",
      items: { type: "string", nullable: true },
    };
    const result = convert(schema);
    expect(result).toBe("(string | null)[]");
  });

  test("nested object with nullable fields", () => {
    const schema = {
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            name: { type: "string", nullable: true },
            age: { type: "number", nullable: true },
          },
          nullable: true,
        },
      },
    };
    const result = convert(schema);
    expect(result).toContain("name?: string | null;");
    expect(result).toContain("age?: number | null;");
    expect(result).toContain("| null");
  });

  test("nullable false should not add null", () => {
    const schema = {
      type: "object",
      properties: {
        name: { type: "string", nullable: false },
      },
      required: ["name"],
    };
    const result = convert(schema);
    expect(result).toContain("name: string;");
    expect(result).not.toContain("| null");
  });

  test("nullable with oneOf", () => {
    const schema = {
      oneOf: [{ type: "string" }, { type: "number" }],
      nullable: true,
    };
    const result = convert(schema);
    expect(result).toBe("string | number | null");
  });

  test("nullable with allOf", () => {
    const schema = {
      allOf: [
        { type: "object", properties: { name: { type: "string" } } },
        { type: "object", properties: { age: { type: "number" } } },
      ],
      nullable: true,
    } as any;
    const result = convert(schema);
    expect(result).toContain("&");
    expect(result).toContain("| null");
  });
});
