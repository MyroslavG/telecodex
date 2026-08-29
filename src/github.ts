import { execFile } from "node:child_process";

import type { RegisteredProject } from "./projects.js";

export interface PullRequestInfo {
  number: number;
  title: string;
  url: string;
  state: string;
}

export async function getCurrentPullRequest(project: RegisteredProject): Promise<PullRequestInfo | null> {
  const output = await runGh(project.path, ["pr", "view", "--json", "number,title,url,state"]);
  if (output === null) {
    return null;
  }
  return parsePullRequestOutput(output);
}

export function parsePullRequestOutput(output: string): PullRequestInfo | null {
  const parsed: unknown = JSON.parse(output);
  if (
    !isRecord(parsed) ||
    typeof parsed.number !== "number" ||
    typeof parsed.title !== "string" ||
    typeof parsed.url !== "string" ||
    typeof parsed.state !== "string"
  ) {
    throw new Error("GitHub CLI returned an invalid pull request response");
  }
  return { number: parsed.number, title: parsed.title, url: parsed.url, state: parsed.state };
}

function runGh(cwd: string, args: string[]): Promise<string | null> {
  return new Promise((resolve, reject) => {
    execFile("gh", args, { cwd, encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        const detail = (stderr || error.message).trim();
        if (/no pull requests? found/i.test(detail)) {
          resolve(null);
          return;
        }
        reject(new Error(`Could not read the current pull request: ${detail || "gh failed"}`));
        return;
      }
      resolve(stdout);
    });
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
