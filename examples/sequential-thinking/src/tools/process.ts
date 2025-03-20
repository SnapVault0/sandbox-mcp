import {
  BaseTool,
  ExecutionResult,
  ToolParameter,
} from "@sandbox-mcp/mcp-server";
import { exec } from "child_process";
import { promisify } from "util";
import { z } from "zod";

const execAsync = promisify(exec);

export class ProcessTool extends BaseTool {
  readonly name = "process";
  readonly description = "Execute shell commands and processes";
  readonly parameters: ToolParameter[] = [
    {
      name: "command",
      type: z.string(),
      description: "The command to execute",
      required: true,
    },
    {
      name: "cwd",
      type: z.string(),
      description: "Working directory for the command",
      required: false,
    },
    {
      name: "timeout",
      type: z.number(),
      description: "Timeout in milliseconds",
      required: false,
      default: 30000,
    },
  ];

  async execute(args: unknown): Promise<ExecutionResult> {
    const startTime = Date.now();
    try {
      const { command, cwd, timeout } = args as {
        command: string;
        cwd?: string;
        timeout?: number;
      };

      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout: timeout || 30000,
      });

      return {
        success: true,
        data: {
          stdout,
          stderr,
        },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        duration: Date.now() - startTime,
      };
    }
  }

  validate(args: unknown): boolean {
    try {
      const schema = z.object({
        command: z.string(),
        cwd: z.string().optional(),
        timeout: z.number().optional(),
      });
      schema.parse(args);
      return true;
    } catch {
      return false;
    }
  }
}
