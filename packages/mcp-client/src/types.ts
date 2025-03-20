import { Tool as CoreTool } from "@sandbox-mcp/mcp-core";

export interface ClientConfig {
  name: string;
  version: string;
  serverScript?: string;
  openaiApiKey: string;
  model?: string;
}

export type Tool = CoreTool;

export interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required?: boolean;
}

export interface ToolCallResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

export interface Resource {
  uri: string;
  data: unknown;
  lastFetched?: number;
}

export interface Prompt {
  name: string;
  description: string;
  template: string;
  arguments: PromptArgument[];
  lastFetched?: number;
}

export interface PromptArgument {
  name: string;
  type: string;
  description: string;
  required?: boolean;
}

export interface Client {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  listTools(): Promise<Tool[]>;
  listResources(): Promise<Resource[]>;
  listPrompts(): Promise<Prompt[]>;
  sendMessage(content: string): Promise<void>;
  fetchResource(uri: string): Promise<unknown>;
  executePrompt(name: string, args?: Record<string, unknown>): Promise<string>;
  getMessages(): Message[];
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}
