import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";

import { parse } from "yaml";

export interface RegisteredProject {
  id: string;
  name: string;
  path: string;
  baseBranch: string;
}

const PROJECT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

/**
 * Loads the server-owned project allowlist. Telegram never supplies a repository path.
 */
export function loadProjectsConfig(
  configPath: string | undefined,
  projectsRoot: string,
): RegisteredProject[] {
  if (!configPath) {
    return [];
  }
  if (!existsSync(configPath)) {
    throw new Error(`PROJECTS_CONFIG does not exist: ${configPath}`);
  }

  const resolvedRoot = validateDirectory(projectsRoot, "PROJECTS_ROOT");
  const raw = parse(readFileSync(configPath, "utf8"));
  if (!isRecord(raw) || !isRecord(raw.projects)) {
    throw new Error("Project config must contain a 'projects' mapping");
  }

  const projects: RegisteredProject[] = [];
  const seenPaths = new Set<string>();
  for (const [id, definition] of Object.entries(raw.projects)) {
    if (!PROJECT_ID_PATTERN.test(id)) {
      throw new Error(`Invalid project id: ${id}`);
    }
    if (!isRecord(definition)) {
      throw new Error(`Project '${id}' must be a mapping`);
    }
    const name = requiredString(definition.name, `Project '${id}' name`);
    const configuredPath = requiredString(definition.path, `Project '${id}' path`);
    const baseBranch = requiredString(definition.base_branch, `Project '${id}' base_branch`);
    validateGitRef(baseBranch, id);

    const resolvedPath = validateDirectory(configuredPath, `Project '${id}' path`);
    if (!isWithinRoot(resolvedPath, resolvedRoot)) {
      throw new Error(`Project '${id}' path must be within PROJECTS_ROOT`);
    }
    if (seenPaths.has(resolvedPath)) {
      throw new Error(`Project '${id}' duplicates another project path`);
    }
    seenPaths.add(resolvedPath);
    projects.push({ id, name, path: resolvedPath, baseBranch });
  }

  return projects.sort((left, right) => left.name.localeCompare(right.name));
}

export function getProjectById(
  projects: readonly RegisteredProject[],
  projectId: string | undefined,
): RegisteredProject | undefined {
  return projects.find((project) => project.id === projectId);
}

export function renderProjectsPlain(projects: readonly RegisteredProject[]): string {
  if (projects.length === 0) {
    return "No projects are configured. Set PROJECTS_CONFIG on the server.";
  }
  return ["Projects", "", ...projects.map((project, index) => `${index + 1}. ${project.name} (${project.id})`)].join(
    "\n",
  );
}

function validateDirectory(targetPath: string, label: string): string {
  if (!path.isAbsolute(targetPath)) {
    throw new Error(`${label} must be an absolute path`);
  }
  if (!existsSync(targetPath)) {
    throw new Error(`${label} does not exist: ${targetPath}`);
  }
  const resolved = realpathSync(targetPath);
  if (!statSync(resolved).isDirectory()) {
    throw new Error(`${label} must be a directory`);
  }
  return resolved;
}

function isWithinRoot(targetPath: string, rootPath: string): boolean {
  const relative = path.relative(rootPath, targetPath);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function validateGitRef(baseBranch: string, projectId: string): void {
  if (
    baseBranch.startsWith("-") ||
    baseBranch.includes("..") ||
    baseBranch.includes("//") ||
    baseBranch.includes("@{") ||
    baseBranch.endsWith(".") ||
    /[\s~^:?*]/.test(baseBranch) ||
    baseBranch.includes("[") ||
    baseBranch.includes("\\")
  ) {
    throw new Error(`Project '${projectId}' has an invalid base_branch`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
