import {
  AuthContext,
  ExecutionResult,
  ResourceMetadata,
  ServerConfig,
  ServerState,
  ToolParameter,
} from "./types.js";

export abstract class BaseMCPServer {
  protected config: ServerConfig;
  protected state: ServerState;

  constructor(config: ServerConfig) {
    this.config = config;
    this.state = {
      isRunning: false,
      connections: 0,
      startTime: new Date(),
      errors: [],
    };
  }

  abstract initialize(): Promise<void>;
  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;

  abstract handleToolCall(
    name: string,
    args: unknown,
    auth?: AuthContext
  ): Promise<ExecutionResult>;

  abstract handleResourceRequest(
    uri: string,
    auth?: AuthContext
  ): Promise<ExecutionResult>;

  getState(): ServerState {
    return { ...this.state };
  }

  protected addError(error: Error): void {
    this.state.errors.push(error);
  }
}

export abstract class BaseTool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly parameters: ToolParameter[];

  abstract execute(args: unknown, auth?: AuthContext): Promise<ExecutionResult>;

  abstract validate(args: unknown): boolean;
}

export abstract class BaseResource {
  abstract readonly uri: string;
  abstract readonly metadata: ResourceMetadata;

  abstract fetch(
    params?: unknown,
    auth?: AuthContext
  ): Promise<ExecutionResult>;

  abstract exists(): Promise<boolean>;
}
