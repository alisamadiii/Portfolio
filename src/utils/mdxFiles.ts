import path from "path";
import fs from "fs";

export const blogPathFiles = path.join(process.cwd(), "blog");
export const blogFileNames = fs.readdirSync(blogPathFiles, {
  withFileTypes: false,
});
