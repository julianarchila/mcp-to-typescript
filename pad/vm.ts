import * as vm from "node:vm"



let a = 1

function tooa() {
  a += 1
  return a.toString()
}

const allTOols = [tooa]


type ToolResItem = {
  name: string;
} & (
    {
      success: true;
      result: any;
    } | {
      success: false;
      error: any;
    }
  )

type ToolsRes = Array<ToolResItem>

const toolsRes: ToolsRes = [];


function wrapTool(f: Function) {

  return function wrappedTool(...args: any[]) {
    try {
      const result = f(...args);
      toolsRes.push({ name: f.name, success: true, result });
    }
    catch (error) {
      toolsRes.push({ name: f.name, success: false, error });
    }
  }

}



const context = {
  animal: 'cat',
  count: 2,
  tools: Object.fromEntries(
    allTOols.map(f => [f.name, wrapTool(f)])
  ),
  res: ""
};

console.log(JSON.stringify(context, null, 2));
const script = new vm.Script('count += 1; name = "kitty"; tools.tooa()');

vm.createContext(context);
for (let i = 0; i < 10; ++i) {
  const res = script.runInContext(context);
  // console.log(`Iteration ${i}:`, context);
}


console.log(toolsRes);
console.log(context);
