/**
 * Example: Using the Code Execution Tool with Composio
 *
 * This example demonstrates how to use the agent with Composio's Google Sheets integration.
 *
 * Prerequisites:
 * - OPENROUTER_API_KEY environment variable set
 * - COMPOSIO_API_KEY environment variable set
 * - COMPOSIO_USER_ID environment variable set (or use the test account below)
 */

import { generateText, stepCountIs } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createCodeExecutionTool } from "../src/agent/index.ts";
import { getComposioTools } from "../src/adapters/index.ts";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || "",
});

// Use test account or environment variable
const userId = process.env.COMPOSIO_USER_ID || "j57antztt10jqe7cfzr7qapdh17p7tfb";

console.log("Fetching Google Sheets tools from Composio...");

// Fetch Composio tools (Google Sheets in this example)
const composioTools = await getComposioTools({
  toolkits: ["GOOGLESHEETS"],
  userId,
});

console.log(`Loaded ${composioTools.length} tools:`);
composioTools.forEach((t) => console.log(`  - ${t.name}`));

const executeCode = createCodeExecutionTool(composioTools);

console.log("\nAsking LLM to list sheets...\n");

const result = await generateText({
  model: openrouter.chat("anthropic/claude-sonnet-4"),
  messages: [
    {
      role: "user",
      content:
        "List all sheets in spreadsheet 1biMeNqihJGvuu1Ee21hPT1_-3vb7iH5F59_Y3fi--UY",
    },
  ],
  tools: { executeCode },
  stopWhen: stepCountIs(10),
});

console.log("--- Result ---");
console.log(result.text);

