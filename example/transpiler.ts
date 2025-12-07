/**
 * Ejemplos de uso del transpilador JSON Schema → TypeScript
 */

import { convert, jsonSchemaToTypeScript } from "./src/index.ts";

console.log("========================================");
console.log("JSON Schema to TypeScript Transpiler");
console.log("========================================\n");

// Ejemplo 1: Objeto simple
console.log("📦 Ejemplo 1: Objeto con propiedades requeridas y opcionales");
console.log("---");
const userSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    name: { type: "string" },
    email: { type: "string" },
    age: { type: "number" },
    isActive: { type: "boolean" },
  },
  required: ["id", "name", "email"],
};

console.log("Input Schema:", JSON.stringify(userSchema, null, 2));
console.log("\nOutput TypeScript:");
console.log(convert(userSchema, "User"));
console.log();

// Ejemplo 2: Arrays y Enums
console.log("📦 Ejemplo 2: Array con enum");
console.log("---");
const rolesSchema = {
  type: "object",
  properties: {
    username: { type: "string" },
    roles: {
      type: "array",
      items: {
        enum: ["admin", "moderator", "user", "guest"],
      },
    },
  },
  required: ["username"],
};

console.log("Input Schema:", JSON.stringify(rolesSchema, null, 2));
console.log("\nOutput TypeScript:");
console.log(convert(rolesSchema, "UserRoles"));
console.log();

// Ejemplo 3: Tuplas
console.log("📦 Ejemplo 3: Tuplas");
console.log("---");
const coordinateSchema = {
  type: "array",
  items: [{ type: "number" }, { type: "number" }, { type: "number" }],
};

console.log("Input Schema:", JSON.stringify(coordinateSchema, null, 2));
console.log("\nOutput TypeScript:");
console.log(convert(coordinateSchema, "Coordinate3D"));
console.log();

// Ejemplo 4: Unions con oneOf
console.log("📦 Ejemplo 4: Union con oneOf");
console.log("---");
const responseSchema = {
  oneOf: [
    {
      type: "object",
      properties: {
        success: { const: true },
        data: { type: "object" },
      },
      required: ["success", "data"],
    } as const,
    {
      type: "object",
      properties: {
        success: { const: false },
        error: { type: "string" },
      },
      required: ["success", "error"],
    } as const,
  ],
} as const;

console.log("Input Schema:", JSON.stringify(responseSchema, null, 2));
console.log("\nOutput TypeScript:");
console.log(convert(responseSchema as any, "ApiResponse"));
console.log();

// Ejemplo 5: Intersección con allOf
console.log("📦 Ejemplo 5: Intersección con allOf");
console.log("---");
const extendedUserSchema = {
  allOf: [
    {
      type: "object",
      properties: {
        id: { type: "number" },
        name: { type: "string" },
      },
      required: ["id", "name"],
    } as const,
    {
      type: "object",
      properties: {
        email: { type: "string" },
        role: { enum: ["admin", "user"] },
      },
      required: ["email"],
    } as const,
  ],
} as const;

console.log("Input Schema:", JSON.stringify(extendedUserSchema, null, 2));
console.log("\nOutput TypeScript:");
console.log(convert(extendedUserSchema as any, "ExtendedUser"));
console.log();

// Ejemplo 6: Objeto complejo anidado
console.log("📦 Ejemplo 6: Objeto complejo anidado");
console.log("---");
const blogPostSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    content: { type: "string" },
    author: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        email: { type: "string" },
      },
      required: ["id", "name"],
    },
    tags: {
      type: "array",
      items: { type: "string" },
    },
    metadata: {
      type: "object",
      additionalProperties: { type: "string" },
    },
    status: {
      enum: ["draft", "published", "archived"],
    },
  },
  required: ["id", "title", "author"],
};

console.log("Input Schema:", JSON.stringify(blogPostSchema, null, 2));
console.log("\nOutput TypeScript:");
console.log(convert(blogPostSchema, "BlogPost"));
console.log();

// Ejemplo 7: Usando returnAST
console.log("📦 Ejemplo 7: Obteniendo el AST intermedio");
console.log("---");
const simpleSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
  },
};

const result = jsonSchemaToTypeScript(simpleSchema, { returnAST: true });
console.log("AST:", JSON.stringify(result.ast, null, 2));
console.log();

console.log("========================================");
console.log("✅ Todos los ejemplos ejecutados correctamente");
console.log("========================================");
