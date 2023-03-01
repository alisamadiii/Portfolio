import fs from "fs";
import path from "path";

export const pathFiles = path.join(process.cwd(), "blogs");

export const fileNames = fs.readdirSync(pathFiles);
