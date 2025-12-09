import { generateText, stepCountIs } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createCodeExecutionTool } from "../src/agent/index.ts";
import { getComposioTools } from "../src/composio/adapter.ts";

// Test account - safe for LLM testing
const TEST_USER_ID = process.env.COMPOSIO_USER_ID!;
const TEST_SPREADSHEET_ID ="115enCmaKT8PLElYhxPKtSPmQ_NP0MPNv";

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

const sheetName = `Stats ${Date.now()}`;

const result = await generateText({
  model: openrouter.chat("anthropic/claude-sonnet-4.5"),
  messages: [
    {
      role: "user",
      content: `Create a new sheet called "${sheetName}" in spreadsheet https://docs.google.com/spreadsheets/d/1aC2x4M5DOs42AxramKZRiJ97j_4Yy8_NTSKEUwCj_q8/edit?gid=241735026#gid=241735026, go to Base tab in the sheet, read the data from all colums, understand the sctructure,
      and generate a report of the sales by month in a new sheet. The report should include the total sales per month and seller (VENDEDOR). I want you to create a table with the following columns: Month, Seller, Total Sales and add graphics to visualize the sales performance of each seller over the months.
      Make sure to only log the things that are necessary to understand the flow and avoid excessive logging. Focus on the key actions you are taking, such as creating the new sheet, reading data, calculating totals, and generating graphics.`

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