import { Composio } from "@composio/core"
import { writeFileSync } from "fs"
import path from "path"

const client = new Composio({})

const user_id = "ca_B_vgJ1laKrQf"
console.log("Fetching tools for user:", user_id)

const tools = await client.tools.get(user_id, {
  toolkits: ["GOOGLESHEETS"]
})

const outputPath = path.join(import.meta.dir, "tools.json")
writeFileSync(outputPath, JSON.stringify(tools, null, 2))
console.log(`Tools written to ${outputPath}`)




import { convert, jsonSchemaToTypeScript } from "../src/index.ts";



const types = tools.slice(0, 2).filter((tool => tool.type == "function")).forEach((tool, index) => {
  console.log(`\n📦 Tool ${index + 1}: ${tool.function.name}`);
  const type = convert(tool.function.parameters as any, tool.function.name)

  console.log("Input Schema:", JSON.stringify(tool.function.parameters, null, 2));
  console.log("\nOutput TypeScript:");
  console.log(type);



})
