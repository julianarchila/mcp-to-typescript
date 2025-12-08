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
const TEST_SPREADSHEET_ID = "1biMeNqihJGvuu1Ee21hPT1_-3vb7iH5F59_Y3fi--UY";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || "",
});

console.log("=".repeat(60));
console.log("Google Sheets Integration Test");
console.log("=".repeat(60));
console.log(`\nTest Account: ${TEST_USER_ID}`);
console.log(`Spreadsheet: https://docs.google.com/spreadsheets/d/${TEST_SPREADSHEET_ID}/edit`);
console.log("\nFetching Google Sheets tools from Composio...\n");

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
  maxExecutionTime: 60000, // Allow 60 seconds for batch operations
});

const sheetName = `Random Data ${Date.now()}`;

console.log(`\nAsking LLM to create sheet "${sheetName}" with 100 rows of random numbers...\n`);

const result = await generateText({
  model: openrouter.chat("anthropic/claude-sonnet-4.5"),
  messages: [
    {
      role: "user",
      content: `Create a new sheet called "${sheetName}" in spreadsheet ${TEST_SPREADSHEET_ID}, then populate it with 100 rows of random numbers.

Each row should have 5 columns:
- Column A: Row number (1-100)
- Column B: Random integer between 1-1000
- Column C: Random decimal between 0-1 (2 decimal places)
- Column D: Random integer between 1-100
- Column E: Sum of columns B, C, and D

Use batch operations where possible for efficiency. First create the sheet, then use batch update to add all data at once.`,
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

console.log("\n" + "=".repeat(60));
console.log("Verification");
console.log("=".repeat(60));
console.log(`\nCheck the spreadsheet at:`);
console.log(`https://docs.google.com/spreadsheets/d/${TEST_SPREADSHEET_ID}/edit`);
console.log(`\nLook for sheet: "${sheetName}"`);
console.log(`\nExpected:`);
console.log(`  - [ ] New sheet created`);
console.log(`  - [ ] 100 rows of data`);
console.log(`  - [ ] Columns A-E populated correctly`);
console.log(`  - [ ] Column E contains correct sums`);

