const path = require("path");
const fs = require("fs");

const REGISTRY_PATH = path.join(process.cwd(), "/preview");

function getFilesRecursive(directory) {
  const files = [];
  const items = fs.readdirSync(directory);

  // Remove the check for index.tsx
  for (const item of items) {
    const fullPath = path.join(directory, item);
    if (fs.statSync(fullPath).isDirectory()) {
      files.push(...getFilesRecursive(fullPath));
    } else if (item.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }

  return files;
}

const READ_PATH = getFilesRecursive(REGISTRY_PATH);

let index = `// @ts-nocheck
import * as React from "react"
 
import dynamic from "next/dynamic";
 
export const Index: Record<string, any> = {`;

for (const file of READ_PATH) {
  const relativePath = path.relative(REGISTRY_PATH, file);
  let componentName = relativePath.replace(/\.tsx$/, "").replace(/\//g, "-");

  // Remove '_index' if it's an index file and remove '-index' if it's part of the folder name
  if (componentName.endsWith("_index")) {
    componentName = componentName.replace(/_index$/, "");
  } else {
    componentName = componentName.replace(/-index$/, "");
  }

  index += `
        "${componentName}": {
          name: "${componentName}",
          component: dynamic(() => import("@/preview/${relativePath.replace(/\\/g, "/")}"), { ssr: false }),
        },`;
}

index += `
},`;

fs.writeFileSync(path.join(process.cwd(), "__registry__/index.tsx"), index);
