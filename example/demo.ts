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

const sheetName = `Pereira sales --- ${Date.now()}`;

console.log(`\nAsking LLM to create sheet "${sheetName}" with filtered sales data\n`);

const result = await generateText({
  model: openrouter.chat("anthropic/claude-haiku-4.5"),
  messages: [
    {
      role: "user",
      content: `"In spreadsheet https://docs.google.com/spreadsheets/d/1jDr3KDFNBnwdi9_-AFMFYvjyX8q904QHC0nWdyQ4Ung/edit?gid=0#gid=0, we have a list of sales records.

I need you to analize the data structure first and then:
- Move the sales records of "Pereira" into a new sheet
- Only include sales above COP 1,000,000

Use batch operations where possible for efficiency. First get a few records to analyze the sheets structure. 
New sheet name: "${sheetName}"
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

