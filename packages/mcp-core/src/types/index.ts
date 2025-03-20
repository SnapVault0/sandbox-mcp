export type MessageType = "request" | "response" | "error" | "notification";

export type ServerStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface ServerState {
  status: ServerStatus;
  error?: string;
  lastMessageTime?: number;
  uptime?: number;
}

export interface MCPMessage {
  type: MessageType;
  id: string;
  payload: unknown;
}

export interface MCPRequest extends MCPMessage {
  type: "request";
  payload: {
    tool: string;
    args: Record<string, unknown>;
  };
}

export interface MCPResponse extends MCPMessage {
  type: "response";
  payload: unknown;
}

export interface MCPError extends MCPMessage {
  type: "error";
  payload: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface Tool {
  name: string;
  description: string;
  parameters: {
    name: string;
    type: string;
    description: string;
    required?: boolean;
  }[];
  execute(args: Record<string, unknown>): Promise<unknown>;
}

export interface Transport {
  send(message: MCPMessage): Promise<void>;
  receive(): AsyncIterableIterator<MCPMessage>;
  close(): Promise<void>;
}
