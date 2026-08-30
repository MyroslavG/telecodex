import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { getProjectGitHubEnvironment, loadProjectsConfig, renderProjectsPlain } from "../src/projects.js";

describe("project configuration", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), "telecodex-projects-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("loads registered projects from the server-owned allowlist", () => {
    const projectsRoot = path.join(tempDir, "projects");
    const apiPath = path.join(projectsRoot, "api");
    const webPath = path.join(projectsRoot, "web");
    const configPath = path.join(tempDir, "projects.yml");
    mkdirSync(apiPath, { recursive: true });
    mkdirSync(webPath, { recursive: true });
    writeFileSync(
      configPath,
      [
        "projects:",
        "  web:",
        "    name: Web App",
        `    path: ${webPath}`,
        "    base_branch: develop",
        "  api:",
        "    name: API",
        `    path: ${apiPath}`,
        "    base_branch: main",
        "    github_profile: company",
      ].join("\n"),
    );

    const projects = loadProjectsConfig(configPath, projectsRoot);

    expect(projects).toEqual([
      { id: "api", name: "API", path: apiPath, baseBranch: "main", githubProfile: "company" },
      { id: "web", name: "Web App", path: webPath, baseBranch: "develop" },
    ]);
    expect(renderProjectsPlain(projects)).toContain("Web App (web)");
  });

  it("rejects a configured project outside PROJECTS_ROOT", () => {
    const projectsRoot = path.join(tempDir, "projects");
    const unrelatedPath = path.join(tempDir, "unrelated-repository");
    const configPath = path.join(tempDir, "projects.yml");
    mkdirSync(projectsRoot, { recursive: true });
    mkdirSync(unrelatedPath, { recursive: true });
    writeFileSync(
      configPath,
      [
        "projects:",
        "  forbidden:",
        "    name: Forbidden",
        `    path: ${unrelatedPath}`,
        "    base_branch: main",
      ].join("\n"),
    );

    expect(() => loadProjectsConfig(configPath, projectsRoot)).toThrow(
      "Project 'forbidden' path must be within PROJECTS_ROOT",
    );
  });

  it("rejects invalid project identifiers", () => {
    const projectsRoot = path.join(tempDir, "projects");
    const projectPath = path.join(projectsRoot, "api");
    const configPath = path.join(tempDir, "projects.yml");
    mkdirSync(projectPath, { recursive: true });
    writeFileSync(
      configPath,
      [
        "projects:",
        "  ../../outside:",
        "    name: Invalid",
        `    path: ${projectPath}`,
        "    base_branch: main",
      ].join("\n"),
    );

    expect(() => loadProjectsConfig(configPath, projectsRoot)).toThrow("Invalid project id: ../../outside");
  });

  it("rejects invalid GitHub profile identifiers", () => {
    const projectsRoot = path.join(tempDir, "projects");
    const projectPath = path.join(projectsRoot, "api");
    const configPath = path.join(tempDir, "projects.yml");
    mkdirSync(projectPath, { recursive: true });
    writeFileSync(
      configPath,
      [
        "projects:",
        "  api:",
        "    name: API",
        `    path: ${projectPath}`,
        "    base_branch: main",
        "    github_profile: ../../company",
      ].join("\n"),
    );

    expect(() => loadProjectsConfig(configPath, projectsRoot)).toThrow(
      "Project 'api' github_profile must be a valid identifier",
    );
  });

  it("derives a project-scoped GitHub CLI environment", () => {
    expect(
      getProjectGitHubEnvironment(
        { id: "api", name: "API", path: "/projects/api", baseBranch: "main", githubProfile: "company" },
        "/data/gh-profiles",
      ),
    ).toEqual({ GH_CONFIG_DIR: path.join("/data/gh-profiles", "company") });
  });
});
