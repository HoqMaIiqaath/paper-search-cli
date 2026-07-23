import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("built package entrypoints", () => {
  it("emits every declared binary at the package root", async () => {
    const packageJson = JSON.parse(
      await readFile(path.resolve("package.json"), "utf8"),
    ) as { bin: Record<string, string> };

    const checks = Object.values(packageJson.bin).map(async (relativePath) => {
      const absolutePath = path.resolve(relativePath);
      await expect(access(absolutePath)).resolves.toBeUndefined();
    });

    await Promise.all(checks);
  });
});
