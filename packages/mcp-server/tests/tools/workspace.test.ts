import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WorkspaceTool } from "../../src/tools/workspace.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_WORKSPACE = path.join(__dirname, "../../test-workspace");

describe("WorkspaceTool", () => {
  const tool = new WorkspaceTool();

  beforeEach(async () => {
    await fs.mkdir(TEST_WORKSPACE, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(TEST_WORKSPACE, { recursive: true, force: true });
    } catch (error) {
      console.error("Error cleaning up test workspace:", error);
    }
  });

  it("should initialize a workspace", async () => {
    const result = await tool.execute({
      operation: "init",
      path: path.join(TEST_WORKSPACE, "new-workspace"),
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty("message");
    const stats = await fs.stat(path.join(TEST_WORKSPACE, "new-workspace"));
    expect(stats.isDirectory()).toBe(true);
  });

  it("should get workspace status", async () => {
    const result = await tool.execute({
      operation: "status",
      path: TEST_WORKSPACE,
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty("exists", true);
    expect(result.data).toHaveProperty("isDirectory", true);
  });

  it("should search files in workspace", async () => {
    // 테스트 파일 생성
    await fs.writeFile(path.join(TEST_WORKSPACE, "test1.txt"), "test content");
    await fs.writeFile(path.join(TEST_WORKSPACE, "test2.txt"), "test content");
    await fs.mkdir(path.join(TEST_WORKSPACE, "subdir"), { recursive: true });
    await fs.writeFile(
      path.join(TEST_WORKSPACE, "subdir", "test3.txt"),
      "test content"
    );

    const result = await tool.execute({
      operation: "search",
      path: TEST_WORKSPACE,
      pattern: ".txt",
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty("files");
    expect(Array.isArray(result.data.files)).toBe(true);
    expect(result.data.files).toHaveLength(3);
  });

  it("should clean workspace", async () => {
    // 테스트 파일 생성
    await fs.writeFile(path.join(TEST_WORKSPACE, "test.txt"), "test content");
    await fs.mkdir(path.join(TEST_WORKSPACE, "subdir"), { recursive: true });

    const result = await tool.execute({
      operation: "clean",
      path: TEST_WORKSPACE,
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty("message");
    const files = await fs.readdir(TEST_WORKSPACE);
    expect(files).toHaveLength(0);
  });

  it("should validate arguments correctly", () => {
    expect(
      tool.validate({
        operation: "init",
        path: TEST_WORKSPACE,
      })
    ).toBe(true);

    expect(
      tool.validate({
        operation: "invalid",
        path: TEST_WORKSPACE,
      })
    ).toBe(false);

    expect(
      tool.validate({
        operation: "search",
        path: TEST_WORKSPACE,
        pattern: ".txt",
      })
    ).toBe(true);
  });
});
