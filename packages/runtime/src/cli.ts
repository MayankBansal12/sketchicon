#!/usr/bin/env node

import { reportCliError, runCli } from "../../create-sketchicon/src/main.js";

const commandName = "sketchicon";

runCli(process.argv.slice(2), { commandName, packageUrl: import.meta.url })
  .catch((error: unknown) => reportCliError(commandName, error));
