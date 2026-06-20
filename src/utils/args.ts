export interface ParsedArgs {
  command: string[];
  options: Record<string, string | boolean>;
  positionals: string[];
}

export function parseArgs(argv: string[]): ParsedArgs {
  const command: string[] = [];
  const positionals: string[] = [];
  const options: Record<string, string | boolean> = {};
  let index = 0;

  while (index < argv.length && !argv[index].startsWith("-")) {
    command.push(argv[index]);
    index += 1;
  }

  while (index < argv.length) {
    const token = argv[index];

    if (token.startsWith("--")) {
      const equalIndex = token.indexOf("=");
      if (equalIndex >= 0) {
        options[token.slice(2, equalIndex)] = token.slice(equalIndex + 1);
      } else {
        const key = token.slice(2);
        const next = argv[index + 1];
        if (next && !next.startsWith("-")) {
          options[key] = next;
          index += 1;
        } else {
          options[key] = true;
        }
      }
    } else {
      positionals.push(token);
    }

    index += 1;
  }

  return { command, options, positionals };
}

export function getStringOption(
  options: Record<string, string | boolean>,
  key: string,
): string | undefined {
  const value = options[key];
  return typeof value === "string" ? value : undefined;
}

export function getBooleanOption(
  options: Record<string, string | boolean>,
  key: string,
): boolean {
  return options[key] === true || options[key] === "true";
}
