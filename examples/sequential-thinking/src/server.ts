import {
  AuthContext,
  BaseMCPServer,
  ExecutionResult,
  Registry,
  ServerConfig,
  ServerState,
  Tool,
  ToolArgs,
} from "@sandbox-mcp/mcp-server";
import { FileSystemTool } from "./tools/file-system.js";
import { ProcessTool } from "./tools/process.js";

export class SequentialThinkingServer extends BaseMCPServer {
  private registry: Registry;
  protected state: ServerState;

  constructor(config: ServerConfig) {
    super(config);
    this.registry = new Registry();
    this.state = {
      isRunning: false,
      startTime: new Date(),
      connections: 0,
      errors: [],
    };
  }

  getState(): ServerState {
    return { ...this.state };
  }

  async initialize(): Promise<void> {
    // 기본 도구들 등록
    this.registry.registerTool(new FileSystemTool());
    this.registry.registerTool(new ProcessTool());
  }

  async start(): Promise<void> {
    if (this.state.isRunning) {
      throw new Error("Server is already running");
    }

    await this.initialize();
    this.state.isRunning = true;
    this.state.startTime = new Date();
  }

  async stop(): Promise<void> {
    if (!this.state.isRunning) {
      throw new Error("Server is not running");
    }

    try {
      // 등록된 모든 도구의 정리 작업 수행
      const tools = this.registry.getTools();
      await Promise.all(
        tools.map((tool: Tool<ToolArgs>) =>
          typeof tool.cleanup === "function"
            ? tool.cleanup()
            : Promise.resolve()
        )
      );
    } finally {
      this.state.isRunning = false;
      this.registry.clear();
    }
  }

  async handleToolCall<T extends ToolArgs>(
    name: string,
    args: T,
    auth?: AuthContext
  ): Promise<ExecutionResult> {
    const tool = this.registry.getTool(name) as Tool<T>;
    if (!tool) {
      return {
        success: false,
        error: new Error(`Tool '${name}' not found`),
        duration: 0,
      };
    }

    if (!tool.validate(args)) {
      return {
        success: false,
        error: new Error(`Invalid arguments for tool '${name}'`),
        duration: 0,
      };
    }

    return tool.execute(args, auth);
  }

  async handleResourceRequest(
    uri: string,
    auth?: AuthContext
  ): Promise<ExecutionResult> {
    const resource = this.registry.getResource(uri);
    if (!resource) {
      return {
        success: false,
        error: new Error(`Resource '${uri}' not found`),
        duration: 0,
      };
    }

    return resource.fetch(undefined, auth);
  }
}
