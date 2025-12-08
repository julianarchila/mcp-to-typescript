import { test, expect, describe } from "bun:test";
import {
  generateToolTypes,
  generateToolSummary,
  type Tool,
} from "../../src/agent/index.ts";

// ============================================================================
// Test Tools
// ============================================================================

const createTestTools = (): Tool[] => [
  {
    name: "add",
    description: "Adds two numbers together",
    parameters: {
      type: "object",
      properties: {
        a: { type: "number", description: "First number" },
        b: { type: "number", description: "Second number" },
      },
      required: ["a", "b"],
    },
    execute: (args: { a: number; b: number }) => args.a + args.b,
  },
  {
    name: "multiply",
    description: "Multiplies two numbers",
    parameters: {
      type: "object",
      properties: {
        x: { type: "number", description: "First factor" },
        y: { type: "number", description: "Second factor" },
      },
      required: ["x", "y"],
    },
    execute: (args: { x: number; y: number }) => args.x * args.y,
  },
  {
    name: "greet",
    description: "Returns a greeting message",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name to greet" },
        formal: { type: "boolean", description: "Use formal greeting" },
      },
      required: ["name"],
    },
    execute: (args: { name: string; formal?: boolean }) =>
      args.formal ? `Good day, ${args.name}.` : `Hello, ${args.name}!`,
  },
];

// ============================================================================
// Tool Type Generation Tests
// ============================================================================

describe("Tool Type Generation", () => {
  describe("generateToolTypes", () => {
    test("generates function signature for simple tool", () => {
      const tools: Tool[] = [
        {
          name: "simpleFunc",
          description: "A simple function",
          parameters: {
            type: "object",
            properties: {
              input: { type: "string" },
            },
            required: ["input"],
          },
          execute: () => {},
        },
      ];

      const result = generateToolTypes(tools);

      expect(result).toContain("declare function simpleFunc");
      expect(result).toContain("A simple function");
      expect(result).toContain("input: string");
      expect(result).toContain("Promise<any>");
    });

    test("generates signatures for multiple tools", () => {
      const tools = createTestTools();
      const result = generateToolTypes(tools);

      expect(result).toContain("declare function add");
      expect(result).toContain("declare function multiply");
      expect(result).toContain("declare function greet");
    });

    test("includes parameter documentation", () => {
      const tools: Tool[] = [
        {
          name: "documented",
          description: "Well documented function",
          parameters: {
            type: "object",
            properties: {
              param1: { type: "string", description: "First parameter" },
              param2: { type: "number", description: "Second parameter" },
            },
            required: ["param1"],
          },
          execute: () => {},
        },
      ];

      const result = generateToolTypes(tools);

      expect(result).toContain("@param args.param1 - First parameter");
      expect(result).toContain("@param args.param2 (optional) - Second parameter");
    });

    test("handles tool with no parameters", () => {
      const tools: Tool[] = [
        {
          name: "noParams",
          description: "Takes no parameters",
          parameters: {
            type: "object",
            properties: {},
          },
          execute: () => "result",
        },
      ];

      const result = generateToolTypes(tools);

      expect(result).toContain("declare function noParams");
      expect(result).toContain("{}");
    });

    test("handles complex nested parameters", () => {
      const tools: Tool[] = [
        {
          name: "complexTool",
          description: "Has complex parameters",
          parameters: {
            type: "object",
            properties: {
              config: {
                type: "object",
                properties: {
                  enabled: { type: "boolean" },
                  value: { type: "number" },
                },
              },
              items: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["config"],
          },
          execute: () => {},
        },
      ];

      const result = generateToolTypes(tools);

      expect(result).toContain("config:");
      expect(result).toContain("enabled?: boolean");
      expect(result).toContain("items?: string[]");
    });
  });

  describe("generateToolSummary", () => {
    test("generates brief summary of tools", () => {
      const tools = createTestTools();
      const result = generateToolSummary(tools);

      expect(result).toContain("- add: Adds two numbers together");
      expect(result).toContain("- multiply: Multiplies two numbers");
      expect(result).toContain("- greet: Returns a greeting message");
    });

    test("handles multiline descriptions", () => {
      const tools: Tool[] = [
        {
          name: "multiLine",
          description: "First line\nSecond line\nThird line",
          parameters: { type: "object", properties: {} },
          execute: () => {},
        },
      ];

      const result = generateToolSummary(tools);

      // Should only include first line
      expect(result).toBe("- multiLine: First line");
    });
  });
});
