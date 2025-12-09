/**
 * Test: Google Sheets Integration
 *
 * This is a runnable test that verifies the entire system works end-to-end.
 * It uses a safe test account to create 100 rows of random numbers in a Google Sheet.
 *
 * TEST ACCOUNT (Safe for LLM Testing):
 * - Composio User ID: j57antztt10jqe7cfzr7qapdh17p7tfb
 * - Spreadsheet ID: 1biMeNqihJGvuu1Ee21hPT1_-3vb7iH5F59_Y3fi--UY
 * - Google Sheets URL: https://docs.google.com/spreadsheets/d/1biMeNqihJGvuu1Ee21hPT1_-3vb7iH5F59_Y3fi--UY/edit
 *
 * Prerequisites:
 * - OPENROUTER_API_KEY environment variable set
 * - COMPOSIO_API_KEY environment variable set
 *
 * Run with:
 *   bun run example/test-sheets.ts
 */

import { generateText, stepCountIs } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createCodeExecutionTool } from "../src/agent/index.ts";
import { getComposioTools } from "../src/index.ts";

// Test account - safe for LLM testing
const TEST_USER_ID = "j57antztt10jqe7cfzr7qapdh17p7tfb";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || "",
});

// Fetch Google Sheets tools from Composio
const sheetsTools = await getComposioTools({
  toolkits: ["GOOGLESHEETS"],
  userId: TEST_USER_ID,
});

console.log(`Loaded ${sheetsTools.length} Google Sheets tools:`);
sheetsTools.slice(0, 10).forEach((t) => console.log(`  - ${t.name}`));
if (sheetsTools.length > 10) {
  console.log(`  ... and ${sheetsTools.length - 10} more`);
}

const executeCode = createCodeExecutionTool(sheetsTools, {
  maxExecutionTime: 100000, // Allow 60 seconds for batch operations
});

const sheetName = `Random Data ${Date.now()}`;

console.log(`\nAsking LLM to create sheet "${sheetName}" with 100 rows of random numbers...\n`);

const result = await generateText({
  model: openrouter.chat("anthropic/claude-haiku-4.5"),
  messages: [
    {
      role: "user",
      content: `Create a new sheet called "${sheetName}" in spreadsheet https://docs.google.com/spreadsheets/d/1jDr3KDFNBnwdi9_-AFMFYvjyX8q904QHC0nWdyQ4Ung/edit?gid=0#gid=0, then populate it with 500 rows of data that looks like sales records.

Each row should have 5 columns:
- Column A: Date in YYYY-MM-DD format (from january to december 2025)
- Column B: Product name (Generate a list of 10 product names and use them randomly here)
- Column C: Full sale price 
- Column D: Seller Name (We will have 5 sellers: Pepito, Juanita, Paco, Bob, Camila) 
- Column E: City (Choose from: Bogota, Medellin, Pererira, Barranquilla, Chia)

Use batch operations where possible for efficiency. First create the sheet, then use batch update to add the data
Data should be in spanish and in COP. Make sure you generate realistic looking data.
`,
    },
  ],
  tools: { executeCode },
  stopWhen: stepCountIs(15),
});

console.log("\n" + "=".repeat(60));
console.log("Result");
console.log("=".repeat(60));
console.log(result.text);

// Verify by checking tool calls
const allToolCalls = result.steps.flatMap((s) =>
  s.toolCalls?.map((tc: any) => ({
    name: tc.toolName,
    args: tc.args,
  })) || []
);

console.log("\n" + "=".repeat(60));
console.log("Tool Calls Summary");
console.log("=".repeat(60));
console.log(`Total executeCode calls: ${allToolCalls.length}`);

// Show each tool result
for (const step of result.steps) {
  if (step.toolResults) {
    for (const tr of step.toolResults) {
      const toolResult = (tr as any).result as any;
      if (toolResult?.toolCalls) {
        console.log(`\nSandbox executed ${toolResult.toolCalls.length} tool(s):`);
        for (const tc of toolResult.toolCalls) {
          console.log(`  - ${tc.name}: ${tc.error ? "ERROR: " + tc.error : "SUCCESS"}`);
        }
      }
    }
  }
}

