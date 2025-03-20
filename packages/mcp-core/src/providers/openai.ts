import OpenAI from "openai";
import { Config } from "../config/env";
import { Tool } from "../types";

export interface OpenAIProviderConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class OpenAIProvider {
  private client: OpenAI;
  private config: Required<Omit<OpenAIProviderConfig, "apiKey">>;

  constructor(config: OpenAIProviderConfig = {}) {
    const envConfig = Config.getInstance();
    const apiKey = config.apiKey ?? envConfig.get("OPENAI_API_KEY");

    if (!apiKey) {
      throw new Error(
        "OpenAI API key is required. Set it in .env.local or pass it in the constructor."
      );
    }

    this.client = new OpenAI({
      apiKey,
    });

    this.config = {
      model: config.model ?? "gpt-3.5-turbo",
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 1000,
    };
  }

  async generateToolCalls(
    prompt: string,
    tools: Tool[],
    systemPrompt?: string
  ): Promise<OpenAI.Chat.Completions.ChatCompletionMessage> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      messages.push({
        role: "system",
        content: systemPrompt,
      });
    }

    messages.push({
      role: "user",
      content: prompt,
    });

    const toolDefinitions = tools.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object",
          properties: tool.parameters.reduce(
            (acc, param) => ({
              ...acc,
              [param.name]: {
                type: param.type,
                description: param.description,
              },
            }),
            {}
          ),
          required: tool.parameters
            .filter((p) => p.required)
            .map((p) => p.name),
        },
      },
    }));

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      tools: toolDefinitions,
      tool_choice: "auto",
    });

    return response.choices[0].message;
  }
}
