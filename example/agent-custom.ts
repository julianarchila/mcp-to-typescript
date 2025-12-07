/**
 * Example: Using the Code Execution Tool with Custom Tools
 *
 * This example demonstrates how to define and use custom tools
 * without any external service like Composio.
 *
 * Prerequisites:
 * - OPENROUTER_API_KEY environment variable set
 */

import { generateText, stepCountIs } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createCodeExecutionTool, type Tool } from "../src/agent/index.ts";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || "",
});

// Define custom tools (no external services needed)
const customTools: Tool[] = [
  {
    name: "calculate",
    description: "Performs mathematical calculations safely",
    parameters: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "Math expression to evaluate (e.g., '2 + 2', '10 * 5')",
        },
      },
      required: ["expression"],
    },
    execute: (args: { expression: string }) => {
      // Simple safe math evaluation
      const sanitized = args.expression.replace(/[^0-9+\-*/().%\s]/g, "");
      try {
        // Using Function constructor for safer eval
        const result = new Function(`return ${sanitized}`)();
        return { result, expression: args.expression };
      } catch (e: any) {
        return { error: e.message, expression: args.expression };
      }
    },
  },
  {
    name: "getCurrentTime",
    description: "Gets the current date and time in various formats",
    parameters: {
      type: "object",
      properties: {
        format: {
          type: "string",
          enum: ["iso", "unix", "human"],
          description: "Output format: iso (ISO 8601), unix (timestamp), human (readable)",
        },
      },
      required: [],
    },
    execute: (args: { format?: string }) => {
      const now = new Date();
      switch (args.format) {
        case "unix":
          return { timestamp: Math.floor(now.getTime() / 1000) };
        case "human":
          return { time: now.toLocaleString() };
        case "iso":
        default:
          return { time: now.toISOString() };
      }
    },
  },
  {
    name: "generateRandomNumbers",
    description: "Generates an array of random numbers",
    parameters: {
      type: "object",
      properties: {
        count: {
          type: "number",
          description: "How many random numbers to generate",
        },
        min: {
          type: "number",
          description: "Minimum value (inclusive)",
        },
        max: {
          type: "number",
          description: "Maximum value (inclusive)",
        },
      },
      required: ["count"],
    },
    execute: (args: { count: number; min?: number; max?: number }) => {
      const min = args.min ?? 0;
      const max = args.max ?? 100;
      const numbers = Array.from({ length: args.count }, () =>
        Math.floor(Math.random() * (max - min + 1)) + min
      );
      return { numbers, count: args.count, min, max };
    },
  },
];

const executeCode = createCodeExecutionTool(customTools);

console.log("Asking LLM to perform calculations and get time...\n");

const result = await generateText({
  model: openrouter.chat("anthropic/claude-haiku-4.5"),
  messages: [
    {
      role: "user",
      content:
        "What is 42 * 1337? Also, what time is it now? And generate 5 random numbers between 1 and 100.",
    },
  ],
  tools: { executeCode },
  stopWhen: stepCountIs(5),
});

console.log("--- Result ---");
console.log(result.text);

// Show tool calls made
console.log("\n--- Tool Calls ---");
for (const step of result.steps) {
  if (step.toolCalls) {
    for (const call of step.toolCalls) {
      console.log(`${call.toolName}:`, JSON.stringify((call as any).args, null, 2));
    }
  }
}

