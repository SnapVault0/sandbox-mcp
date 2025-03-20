import { ServerConfig } from "@sandbox-mcp/mcp-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SequentialThinkingServer } from "./server.js";

describe("SequentialThinkingServer", () => {
  let server: SequentialThinkingServer;

  beforeAll(async () => {
    const config: ServerConfig = {
      port: 3000,
      host: "localhost",
    };
    server = new SequentialThinkingServer(config);
    await server.start();
  });

  afterAll(async () => {
    if (server.getState().isRunning) {
      await server.stop();
    }
  });

  it("should initialize with correct state", async () => {
    const state = server.getState();
    expect(state.isRunning).toBe(true);
    expect(state.startTime).toBeDefined();
    expect(state.connections).toBe(0);
    expect(state.errors).toHaveLength(0);
  });

  it("should handle tool execution", async () => {
    const result = await server.handleToolCall("fileSystem", {});
    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
    expect(result.duration).toBeDefined();
  });

  it("should handle resource requests", async () => {
    const result = await server.handleResourceRequest("test-resource");
    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
    expect(result.duration).toBeDefined();
  });

  it("should not start when already running", async () => {
    await expect(server.start()).rejects.toThrow("Server is already running");
  });

  it("should handle server stop and start", async () => {
    await server.stop();
    expect(server.getState().isRunning).toBe(false);

    await server.start();
    expect(server.getState().isRunning).toBe(true);

    await expect(server.stop()).resolves.not.toThrow();
  });
});
