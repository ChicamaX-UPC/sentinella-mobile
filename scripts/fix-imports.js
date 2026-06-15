const fs = require("fs");
const path = require("path");

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.tsx?$/.test(full)) {
      const content = fs.readFileSync(full, "utf8");
      const next = content.replace(
        /from ["'](?:\.\.\/)+src\//g,
        'from "@/',
      );
      if (next !== content) fs.writeFileSync(full, next);
    }
  }
}

walk(path.join(__dirname, "..", "app"));
console.log("imports fixed");
