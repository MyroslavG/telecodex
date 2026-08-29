import { buildDevelopmentInstructions, withDevelopmentInstructions } from "../src/development-instructions.js";

const project = {
  id: "kolo",
  name: "Kolo",
  path: "/data/projects/kolo",
  baseBranch: "main",
};

describe("development instructions", () => {
  it("scopes a new project thread to its configured repository and branch policy", () => {
    const instructions = buildDevelopmentInstructions(project);

    expect(instructions).toContain("Work only inside /data/projects/kolo");
    expect(instructions).toContain("check out main");
    expect(instructions).toContain("Never force-push");
    expect(instructions).toContain("push directly to main");
    expect(instructions).toContain("create a non-draft PR with gh pr create");
  });

  it("puts the user request after the durable project instructions", () => {
    const prompt = withDevelopmentInstructions(project, "Add a health endpoint");

    expect(prompt).toMatch(/User request:\nAdd a health endpoint$/);
  });
});
