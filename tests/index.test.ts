import { test, expect, describe } from "bun:test";
import { convert, jsonSchemaToTypeScript, ParserError } from "../src/index.ts";

describe("Tipos Primitivos", () => {
  test("string simple", () => {
    const schema = { type: "string" };
    const result = convert(schema, "MyString");
    expect(result).toBe("export type MyString = string;");
  });

  test("number simple", () => {
    const schema = { type: "number" };
    const result = convert(schema, "MyNumber");
    expect(result).toBe("export type MyNumber = number;");
  });

  test("integer se convierte a number", () => {
    const schema = { type: "integer" };
    const result = convert(schema, "MyInteger");
    expect(result).toBe("export type MyInteger = number;");
  });

  test("boolean simple", () => {
    const schema = { type: "boolean" };
    const result = convert(schema, "MyBoolean");
    expect(result).toBe("export type MyBoolean = boolean;");
  });

  test("null simple", () => {
    const schema = { type: "null" };
    const result = convert(schema, "MyNull");
    expect(result).toBe("export type MyNull = null;");
  });
});

describe("Union de tipos primitivos", () => {
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

  test("múltiples tipos", () => {
    const schema = { type: ["string", "number", "boolean"] };
    const result = convert(schema);
    expect(result).toBe("string | number | boolean");
  });
});

describe("Objetos", () => {
  test("objeto vacío", () => {
    const schema = { type: "object" };
    const result = convert(schema);
    expect(result).toBe("{}");
  });

  test("objeto con propiedades requeridas", () => {
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

  test("objeto con propiedades opcionales", () => {
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

  test("objeto sin required (todas opcionales)", () => {
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

  test("objeto con additionalProperties: true", () => {
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

  test("objeto con additionalProperties tipado", () => {
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

  test("objeto con keys que requieren escape", () => {
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
});

describe("Arrays", () => {
  test("array de strings", () => {
    const schema = {
      type: "array",
      items: { type: "string" },
    };
    const result = convert(schema, "StringArray");
    expect(result).toBe("export type StringArray = string[];");
  });

  test("array de objetos", () => {
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

  test("array sin items (any[])", () => {
    const schema = {
      type: "array",
    };
    const result = convert(schema);
    expect(result).toBe("any[]");
  });

  test("array de enum usa paréntesis", () => {
    const schema = {
      type: "array",
      items: { enum: ["a", "b", "c"] },
    };
    const result = convert(schema);
    expect(result).toBe('("a" | "b" | "c")[]');
  });

  test("array de union usa paréntesis", () => {
    const schema = {
      type: "array",
      items: { oneOf: [{ type: "string" }, { type: "number" }] },
    };
    const result = convert(schema);
    expect(result).toBe("(string | number)[]");
  });
});

describe("Tuplas", () => {
  test("tupla simple [string, number]", () => {
    const schema = {
      type: "array",
      items: [{ type: "string" }, { type: "number" }],
    };
    const result = convert(schema);
    expect(result).toBe("[string, number]");
  });

  test("tupla compleja", () => {
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

  test("tupla vacía", () => {
    const schema = {
      type: "array",
      items: [],
    };
    const result = convert(schema);
    expect(result).toBe("[]");
  });
});

describe("Enum y Const", () => {
  test("enum de strings", () => {
    const schema = {
      enum: ["red", "green", "blue"],
    };
    const result = convert(schema);
    expect(result).toBe('"red" | "green" | "blue"');
  });

  test("enum de numbers", () => {
    const schema = {
      enum: [1, 2, 3],
    };
    const result = convert(schema);
    expect(result).toBe("1 | 2 | 3");
  });

  test("enum mixto", () => {
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

describe("Combinadores", () => {
  test("oneOf - union simple", () => {
    const schema = {
      oneOf: [{ type: "string" }, { type: "number" }],
    };
    const result = convert(schema);
    expect(result).toBe("string | number");
  });

  test("anyOf - union simple", () => {
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

  test("oneOf con objetos", () => {
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

describe("Casos especiales", () => {
  test("schema sin type retorna any", () => {
    const schema = {};
    const result = convert(schema);
    expect(result).toBe("any");
  });

  test("tipo desconocido lanza error", () => {
    const schema = { type: "unknown-type" };
    expect(() => convert(schema)).toThrow(ParserError);
  });

  test("objeto anidado complejo", () => {
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

describe("API - returnAST", () => {
  test("returnAST retorna el AST", () => {
    const schema = { type: "string" };
    const result = jsonSchemaToTypeScript(schema, { returnAST: true });
    expect(result.ast).toBeDefined();
    expect(result.ast?.kind).toBe("primitive");
    expect(result.code).toBeUndefined();
  });
});

describe("Ejemplos del mundo real", () => {
  test("User con múltiples propiedades", () => {
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

  test("API Response con data genérica", () => {
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
