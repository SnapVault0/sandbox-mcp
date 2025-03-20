import { z } from "zod";

export interface ServerConfig {
  port?: number;
  host?: string;
  maxConnections?: number;
  timeout?: number;
}

export interface ServerState {
  isRunning: boolean;
  connections: number;
  startTime: Date;
  errors: Error[];
}

export interface ToolParameter {
  name: string;
  type: z.ZodType;
  description: string;
  required: boolean;
  default?: unknown;
}

export interface ResourceMetadata {
  uri: string;
  contentType: string;
  lastModified?: Date;
  size?: number;
}

export interface AuthContext {
  userId?: string;
  permissions: string[];
  metadata: Record<string, unknown>;
}

export type ExecutionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: Error;
  duration: number;
};

export interface ToolArgs {
  [key: string]: unknown;
}

export interface Tool<T extends ToolArgs = ToolArgs> {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute(args: T, auth?: AuthContext): Promise<ExecutionResult>;
  validate(args: T): boolean;
  cleanup?(): Promise<void>;
}
