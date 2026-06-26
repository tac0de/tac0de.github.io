#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const candidates = [
  ["npm", ["run", "lint", "--if-present"]],
  ["npm", ["run", "typecheck", "--if-present"]],
  ["npm", ["test", "--if-present"]],
  ["npm", ["run", "build", "--if-present"]]
];

for (const [command, args] of candidates) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.status && result.status !== 0) {
    process.exit(result.status);
  }
}
