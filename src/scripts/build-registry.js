const path = require("path");
const fs = require("fs");

const REGISTRY_PATH = path.join(process.cwd(), "/src/preview");
const READ_PATH = fs.readdirSync(REGISTRY_PATH);

let index = `// @ts-nocheck
import * as React from "react"
 
import dynamic from "next/dynamic";
 
export const Index: Record<string, any> = {`;

for (const file of READ_PATH) {
  index += `
        "${file.replace(".tsx", "")}": {
          name: "${file.replace(".tsx", "")}",
          component: dynamic(() => import("@/preview/${file}"), { ssr: false }),
        },`;
}

index += `
},`;

fs.writeFileSync(path.join(process.cwd(), "src/__registry__/index.tsx"), index);
