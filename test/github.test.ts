import { parsePullRequestOutput } from "../src/github.js";

describe("GitHub CLI integration", () => {
  it("parses the current pull request response", () => {
    expect(
      parsePullRequestOutput(
        JSON.stringify({ number: 42, title: "Fix session isolation", url: "https://github.com/acme/repo/pull/42", state: "OPEN" }),
      ),
    ).toEqual({
      number: 42,
      title: "Fix session isolation",
      url: "https://github.com/acme/repo/pull/42",
      state: "OPEN",
    });
  });

  it("rejects an unexpected GitHub CLI response", () => {
    expect(() => parsePullRequestOutput("{}"))
      .toThrow("GitHub CLI returned an invalid pull request response");
  });
});
