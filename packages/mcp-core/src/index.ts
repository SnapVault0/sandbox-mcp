import { MCPRequest, ServerState, Tool, Transport } from "./types";

export class MCP {
  private tools: Map<string, Tool>;
  private transport: Transport | null;
  private healthCheckInterval: NodeJS.Timeout | null;
  private lastMessageTime: number;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30초
  private readonly MESSAGE_TIMEOUT = 60000; // 60초
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private reconnectAttempts: number;
  private serverState: ServerState;
  private stateChangeCallbacks: ((state: ServerState) => void)[];

  constructor() {
    this.tools = new Map();
    this.transport = null;
    this.healthCheckInterval = null;
    this.lastMessageTime = Date.now();
    this.reconnectAttempts = 0;
    this.stateChangeCallbacks = [];
    this.serverState = {
      status: "disconnected",
    };
  }

  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  listTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  onStateChange(callback: (state: ServerState) => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  private updateState(newState: Partial<ServerState>): void {
    this.serverState = { ...this.serverState, ...newState };
    this.stateChangeCallbacks.forEach((callback) => callback(this.serverState));
  }

  getState(): ServerState {
    return { ...this.serverState };
  }

  async connect(transport: Transport): Promise<void> {
    try {
      this.updateState({ status: "connecting" });
      this.transport = transport;
      this.startHealthCheck();

      // start()는 이제 background에서 실행
      this.start().catch((error) => {
        console.error("Error in MCP start:", error);
        this.handleConnectionError(error);
      });

      // 초기 연결 성공을 기다림
      await this.waitForConnection();
    } catch (error) {
      this.handleConnectionError(error);
      // 에러를 throw하여 클라이언트에게 알림
      throw new Error(
        "Failed to connect to MCP server: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  }

  private async waitForConnection(timeout: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, timeout);

      const checkConnection = () => {
        if (this.serverState.status === "connected") {
          clearTimeout(timeoutId);
          resolve();
        } else if (this.serverState.status === "error") {
          clearTimeout(timeoutId);
          reject(new Error(this.serverState.error || "Connection failed"));
        }
      };

      this.onStateChange(checkConnection);
    });
  }

  private handleConnectionError(error: unknown): void {
    console.error("Connection error:", error);

    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`
      );

      this.updateState({
        status: "connecting",
        error: `Reconnecting... Attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}`,
      });

      // 재연결 시도
      setTimeout(() => {
        if (this.transport) {
          this.connect(this.transport).catch(console.error);
        }
      }, 1000 * this.reconnectAttempts); // 지수 백오프
    } else {
      this.updateState({
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Connection failed after multiple attempts",
      });
    }
  }

  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.checkHealth();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  private async checkHealth(): Promise<void> {
    if (!this.transport) return;

    try {
      const timeSinceLastMessage = Date.now() - this.lastMessageTime;
      if (timeSinceLastMessage > this.MESSAGE_TIMEOUT) {
        console.warn("No messages received for too long, sending health check");
        await this.transport.send({
          type: "request",
          id: `health-check-${Date.now()}`,
          payload: {
            tool: "health_check",
            args: {},
          },
        });
      }
    } catch (error) {
      console.error("Health check failed:", error);
      this.handleConnectionError(error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.transport) {
      try {
        await this.transport.send({
          type: "notification",
          id: `disconnect-${Date.now()}`,
          payload: {
            type: "disconnect",
            message: "Client is disconnecting",
          },
        });
        await this.transport.close();
      } catch (error) {
        console.error("Error during disconnect:", error);
      }
      this.transport = null;
    }

    this.updateState({
      status: "disconnected",
      error: undefined,
    });
  }

  private async start(): Promise<void> {
    if (!this.transport) {
      throw new Error("Transport not connected");
    }

    try {
      this.updateState({ status: "connected" });

      for await (const message of this.transport.receive()) {
        this.lastMessageTime = Date.now();

        if (message.type === "request") {
          const request = message as MCPRequest;
          if (request.payload.tool === "health_check") {
            await this.handleHealthCheck(request);
          } else {
            await this.handleRequest(request);
          }
        }
      }
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  private async handleHealthCheck(request: MCPRequest): Promise<void> {
    if (!this.transport) return;

    await this.transport.send({
      type: "response",
      id: request.id,
      payload: {
        status: "healthy",
        uptime: process.uptime(),
        timestamp: Date.now(),
      },
    });
  }

  async handleRequest(request: MCPRequest): Promise<unknown> {
    if (!this.transport) {
      throw new Error("Transport not connected");
    }

    try {
      const tool = this.tools.get(request.payload.tool);
      if (!tool) {
        throw new Error(`Tool not found: ${request.payload.tool}`);
      }

      const result = await tool.execute(request.payload.args);
      await this.transport.send({
        type: "response",
        id: request.id,
        payload: result,
      });
      return result;
    } catch (error) {
      await this.transport.send({
        type: "error",
        id: request.id,
        payload: {
          code: "EXECUTION_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      });
      throw error;
    }
  }
}

export * from "./providers/openai";
export * from "./tools/sequential-thinking";
export * from "./transport/stdio";
export * from "./types";
