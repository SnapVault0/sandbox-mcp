import {
  MCP,
  MCPRequest,
  OpenAIProvider,
  StdioTransport,
  Tool,
  Transport,
} from "@sandbox-mcp/mcp-core";
import { Client, ClientConfig, Message, Prompt, Resource } from "./types.js";

export class MCPClient implements Client {
  private mcp: MCP;
  private transport: Transport | null;
  private messages: Message[];
  private llmProvider: OpenAIProvider;
  private toolCallRetries: number;
  private connectionRetries: number;
  private resources: Map<string, Resource>;
  private prompts: Map<string, Prompt>;
  private readonly MAX_RETRIES = 3;
  private readonly RECONNECT_DELAY = 1000; // 1초
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5분

  constructor(private config: ClientConfig) {
    this.mcp = new MCP();
    this.transport = null;
    this.messages = [];
    this.toolCallRetries = 0;
    this.connectionRetries = 0;
    this.resources = new Map();
    this.prompts = new Map();
    this.llmProvider = new OpenAIProvider({
      apiKey: config.openaiApiKey,
      model: config.model || "gpt-4",
    });
  }

  async connect(): Promise<void> {
    if (this.transport) {
      throw new Error("Already connected");
    }

    try {
      this.transport = new StdioTransport();
      if (!this.transport) {
        throw new Error("Failed to create transport");
      }
      await this.mcp.connect(this.transport);
      this.connectionRetries = 0; // 성공 시 재시도 카운터 초기화
    } catch (error) {
      if (this.connectionRetries < this.MAX_RETRIES) {
        this.connectionRetries++;
        console.log(
          `Retrying connection (${this.connectionRetries}/${this.MAX_RETRIES})...`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, this.RECONNECT_DELAY * this.connectionRetries)
        );
        return this.connect();
      }
      throw new Error(
        `Failed to connect after ${this.MAX_RETRIES} attempts: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      try {
        await this.mcp.disconnect();
      } catch (error) {
        console.error("Error during disconnect:", error);
      } finally {
        this.transport = null;
      }
    }
  }

  async listTools(): Promise<Tool[]> {
    if (!this.transport) {
      throw new Error("Client is not connected");
    }

    try {
      return await this.mcp.listTools();
    } catch (error) {
      console.error("Error listing tools:", error);
      throw new Error(
        `Failed to list tools: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async listResources(): Promise<Resource[]> {
    if (!this.transport) {
      throw new Error("Client is not connected");
    }

    try {
      const request: MCPRequest = {
        type: "request",
        id: `list-resources-${Date.now()}`,
        payload: {
          tool: "list_resources",
          args: {},
        },
      };

      const result = await this.mcp.handleRequest(request);
      const resources = result as Resource[];

      // 리소스 캐시 업데이트
      resources.forEach((resource) => {
        this.resources.set(resource.uri, {
          ...resource,
          lastFetched: Date.now(),
        });
      });

      return resources;
    } catch (error) {
      console.error("Error listing resources:", error);
      throw new Error(
        `Failed to list resources: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async listPrompts(): Promise<Prompt[]> {
    if (!this.transport) {
      throw new Error("Client is not connected");
    }

    try {
      const request: MCPRequest = {
        type: "request",
        id: `list-prompts-${Date.now()}`,
        payload: {
          tool: "list_prompts",
          args: {},
        },
      };

      const result = await this.mcp.handleRequest(request);
      const prompts = result as Prompt[];

      // 프롬프트 캐시 업데이트
      prompts.forEach((prompt) => {
        this.prompts.set(prompt.name, {
          ...prompt,
          lastFetched: Date.now(),
        });
      });

      return prompts;
    } catch (error) {
      console.error("Error listing prompts:", error);
      throw new Error(
        `Failed to list prompts: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async sendMessage(content: string): Promise<void> {
    if (!this.transport) {
      throw new Error("Not connected");
    }

    // 사용자 메시지 추가
    this.messages.push({
      role: "user",
      content,
    });

    try {
      // 사용 가능한 도구 목록 가져오기
      const availableTools = await this.listTools();

      // LLM을 통해 응답 생성
      const response = await this.llmProvider.generateToolCalls(
        content,
        availableTools,
        this.getSystemPrompt()
      );

      // 도구 호출이 있는 경우 처리
      if (response.tool_calls) {
        for (const toolCall of response.tool_calls) {
          const result = await this.executeToolCall(
            toolCall.function.name,
            toolCall.function.arguments
          );

          // 도구 호출 결과를 메시지에 추가
          this.messages.push({
            role: "assistant",
            content: JSON.stringify(result),
          });
        }
      } else {
        // 일반 응답을 메시지에 추가
        this.messages.push({
          role: "assistant",
          content: response.content || "",
        });
      }
    } catch (error) {
      console.error("Error processing message:", error);
      this.messages.push({
        role: "assistant",
        content: `I apologize, but I encountered an error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
      throw error;
    }
  }

  private async executeToolCall(
    toolName: string,
    args: string
  ): Promise<unknown> {
    if (!this.transport) {
      throw new Error("Not connected");
    }

    try {
      const request: MCPRequest = {
        type: "request",
        id: `tool-call-${Date.now()}`,
        payload: {
          tool: toolName,
          args: JSON.parse(args),
        },
      };

      const result = await this.mcp.handleRequest(request);
      this.toolCallRetries = 0; // 성공 시 재시도 카운터 초기화
      return result;
    } catch (error) {
      if (this.toolCallRetries < this.MAX_RETRIES) {
        this.toolCallRetries++;
        console.log(
          `Retrying tool call (${this.toolCallRetries}/${this.MAX_RETRIES})...`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * this.toolCallRetries)
        ); // 지수 백오프
        return this.executeToolCall(toolName, args);
      }
      throw new Error(
        `Failed to execute tool ${toolName} after ${
          this.MAX_RETRIES
        } attempts: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private getSystemPrompt(): string {
    return `You are a helpful assistant that can use tools to help users.
Your responses should be clear and concise.
When using tools, explain what you're doing and why.
If you encounter any errors, explain them clearly to the user.`;
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  async fetchResource(uri: string): Promise<unknown> {
    if (!this.transport) {
      throw new Error("Client is not connected");
    }

    try {
      // 캐시된 리소스 확인
      const cachedResource = this.resources.get(uri);
      if (
        cachedResource &&
        Date.now() - (cachedResource.lastFetched ?? 0) < this.CACHE_TTL
      ) {
        return cachedResource.data;
      }

      const request: MCPRequest = {
        type: "request",
        id: `fetch-resource-${Date.now()}`,
        payload: {
          tool: "fetch_resource",
          args: { uri },
        },
      };

      const result = await this.mcp.handleRequest(request);

      // 리소스 캐시 업데이트
      this.resources.set(uri, {
        uri,
        data: result,
        lastFetched: Date.now(),
      });

      return result;
    } catch (error) {
      console.error("Error fetching resource:", error);
      throw new Error(
        `Failed to fetch resource: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async executePrompt(
    name: string,
    args?: Record<string, unknown>
  ): Promise<string> {
    if (!this.transport) {
      throw new Error("Client is not connected");
    }

    try {
      // 프롬프트 템플릿 가져오기
      let prompt = this.prompts.get(name);
      if (!prompt || Date.now() - (prompt.lastFetched ?? 0) >= this.CACHE_TTL) {
        const prompts = await this.listPrompts();
        prompt = prompts.find((p) => p.name === name);
        if (!prompt) {
          throw new Error(`Prompt not found: ${name}`);
        }
      }

      const request: MCPRequest = {
        type: "request",
        id: `execute-prompt-${Date.now()}`,
        payload: {
          tool: "execute_prompt",
          args: {
            name,
            args: args || {},
          },
        },
      };

      const result = await this.mcp.handleRequest(request);
      return result as string;
    } catch (error) {
      console.error("Error executing prompt:", error);
      throw new Error(
        `Failed to execute prompt: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
