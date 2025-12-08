/**
 * JSON Schema to TypeScript Transpiler Examples
 */

import { convert, jsonSchemaToTypeScript } from "../src/index.ts";

console.log("========================================");
console.log("JSON Schema to TypeScript Transpiler");
console.log("========================================\n");

// Example 1: Simple object
console.log("📦 Example 1: Object with required and optional properties");
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

// Example 2: Arrays and Enums
console.log("📦 Example 2: Array with enum");
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

// Example 3: Tuples
console.log("📦 Example 3: Tuples");
console.log("---");
const coordinateSchema = {
  type: "array",
  items: [{ type: "number" }, { type: "number" }, { type: "number" }],
};

console.log("Input Schema:", JSON.stringify(coordinateSchema, null, 2));
console.log("\nOutput TypeScript:");
console.log(convert(coordinateSchema, "Coordinate3D"));
console.log();

// Example 4: Unions with oneOf
console.log("📦 Example 4: Union with oneOf");
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

// Example 5: Intersection with allOf
console.log("📦 Example 5: Intersection with allOf");
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

// Example 6: Complex nested object
console.log("📦 Example 6: Complex nested object");
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

// Example 7: Using returnAST
console.log("📦 Example 7: Getting the intermediate AST");
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
console.log("✅ All examples executed successfully");
console.log("========================================");
