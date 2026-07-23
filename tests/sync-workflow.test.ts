import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("upstream synchronization workflow", () => {
  it("updates the pinned CLI dependency, validates it, and opens a fork-local PR", async () => {
    const workflow = await readFile(
      path.resolve(".github/workflows/sync-upstream.yml"),
      "utf8",
    );

    expect(workflow).toContain("schedule:");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("npm view paper-search-cli version");
    expect(workflow).toContain("npm install --ignore-scripts --save-exact");
    expect(workflow).toContain("npm run check");
    expect(workflow).toContain("gh pr create");
    expect(workflow).toContain("pull-requests: write");
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("validated-upstream-update");
    expect(workflow).toContain("real CLI contract");
    expect(workflow).not.toMatch(/uses:\s+[^@\n]+@v\d+/);
    expect(workflow).not.toMatch(/personal[_ -]?access[_ -]?token/i);
  });

  it("runs normal changes on both Linux and Windows", async () => {
    const workflow = await readFile(
      path.resolve(".github/workflows/ci.yml"),
      "utf8",
    );

    expect(workflow).toContain("push:");
    expect(workflow).toContain("pull_request:");
    expect(workflow).toContain("ubuntu-latest");
    expect(workflow).toContain("windows-latest");
    expect(workflow).toContain("npm ci --ignore-scripts");
    expect(workflow).toContain("npm run check");
    expect(workflow).not.toMatch(/uses:\s+[^@\n]+@v\d+/);
  });
});
