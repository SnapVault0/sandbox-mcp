import { OpenAIProvider } from "../providers/openai";
import { Tool } from "../types";

export interface SequentialThinkingConfig {
  maxSteps?: number;
  systemPrompt?: string;
}

export class SequentialThinkingTool implements Tool {
  name = "sequential_thinking";
  description =
    "Breaks down complex problems into sequential steps and executes them";
  parameters = [
    {
      name: "goal",
      type: "string",
      description: "The goal or problem to solve",
      required: true,
    },
    {
      name: "context",
      type: "string",
      description: "Additional context or constraints",
      required: false,
    },
  ];

  private provider: OpenAIProvider;
  private config: Required<SequentialThinkingConfig>;
  private availableTools: Tool[];

  constructor(
    provider: OpenAIProvider,
    tools: Tool[],
    config: SequentialThinkingConfig = {}
  ) {
    this.provider = provider;
    this.availableTools = tools.filter((t) => t.name !== this.name);
    this.config = {
      maxSteps: config.maxSteps ?? 5,
      systemPrompt: config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
    };
  }

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const { goal, context = "" } = args as { goal: string; context?: string };
    const steps: Array<{ thought: string; action?: string; result?: unknown }> =
      [];

    for (let step = 0; step < this.config.maxSteps; step++) {
      const prompt = this.buildPrompt(goal, context, steps);
      const response = await this.provider.generateToolCalls(
        prompt,
        this.availableTools,
        this.config.systemPrompt
      );

      if (!response.tool_calls?.length) {
        steps.push({ thought: response.content || "Task completed." });
        break;
      }

      const toolCall = response.tool_calls[0];
      const tool = this.availableTools.find(
        (t) => t.name === toolCall.function.name
      );

      if (!tool) {
        throw new Error(`Tool not found: ${toolCall.function.name}`);
      }

      try {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await tool.execute(args);
        steps.push({
          thought: response.content || "",
          action: `${tool.name}(${JSON.stringify(args)})`,
          result,
        });
      } catch (error) {
        steps.push({
          thought: response.content || "",
          action: `${tool.name} failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
        break;
      }
    }

    return {
      goal,
      context,
      steps,
    };
  }

  private buildPrompt(
    goal: string,
    context: string,
    steps: Array<{ thought: string; action?: string; result?: unknown }>
  ): string {
    let prompt = `Goal: ${goal}\n`;
    if (context) {
      prompt += `Context: ${context}\n`;
    }

    if (steps.length > 0) {
      prompt += "\nPrevious steps:\n";
      steps.forEach((step, i) => {
        prompt += `${i + 1}. Thought: ${step.thought}\n`;
        if (step.action) {
          prompt += `   Action: ${step.action}\n`;
        }
        if (step.result !== undefined) {
          prompt += `   Result: ${JSON.stringify(step.result)}\n`;
        }
      });
    }

    prompt += "\nWhat should be the next step?";
    return prompt;
  }
}

const DEFAULT_SYSTEM_PROMPT = `You are an AI assistant that helps solve problems by breaking them down into sequential steps.
For each step:
1. Think about what needs to be done
2. If needed, use an available tool to gather information or perform an action
3. Use the result to plan the next step
4. If the goal is achieved, respond without using any tools

Always explain your thinking before taking any action.`;
