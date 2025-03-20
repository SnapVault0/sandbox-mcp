import * as fs from "fs/promises";
import * as path from "path";
import { z } from "zod";
import {
  BaseTool,
  ExecutionResult,
  ToolParameter,
} from "../framework/index.js";

export class WorkspaceTool extends BaseTool {
  readonly name = "workspace";
  readonly description = "Workspace management operations";
  readonly parameters: ToolParameter[] = [
    {
      name: "operation",
      type: z.enum(["init", "status", "search", "clean"]),
      description: "The operation to perform",
      required: true,
    },
    {
      name: "path",
      type: z.string(),
      description: "Workspace path",
      required: true,
    },
    {
      name: "pattern",
      type: z.string(),
      description: "Search pattern for files",
      required: false,
    },
  ];

  private async searchFiles(dir: string, pattern: string): Promise<string[]> {
    const results: string[] = [];
    const files = await fs.readdir(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        results.push(...(await this.searchFiles(fullPath, pattern)));
      } else if (file.includes(pattern)) {
        results.push(fullPath);
      }
    }

    return results;
  }

  async execute(args: unknown): Promise<ExecutionResult> {
    const startTime = Date.now();
    try {
      const {
        operation,
        path: workspacePath,
        pattern,
      } = args as {
        operation: "init" | "status" | "search" | "clean";
        path: string;
        pattern?: string;
      };

      switch (operation) {
        case "init":
          await fs.mkdir(workspacePath, { recursive: true });
          return {
            success: true,
            data: { message: `Workspace initialized at ${workspacePath}` },
            duration: Date.now() - startTime,
          };

        case "status":
          const stats = await fs.stat(workspacePath);
          return {
            success: true,
            data: {
              exists: true,
              isDirectory: stats.isDirectory(),
              size: stats.size,
              modified: stats.mtime,
            },
            duration: Date.now() - startTime,
          };

        case "search":
          if (!pattern) {
            throw new Error("Search pattern is required");
          }
          const files = await this.searchFiles(workspacePath, pattern);
          return {
            success: true,
            data: { files },
            duration: Date.now() - startTime,
          };

        case "clean":
          const items = await fs.readdir(workspacePath);
          await Promise.all(
            items.map((item) =>
              fs.rm(path.join(workspacePath, item), {
                recursive: true,
                force: true,
              })
            )
          );
          return {
            success: true,
            data: {
              message: `Workspace cleaned: ${items.length} items removed`,
            },
            duration: Date.now() - startTime,
          };

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
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
        operation: z.enum(["init", "status", "search", "clean"]),
        path: z.string(),
        pattern: z.string().optional(),
      });
      schema.parse(args);
      return true;
    } catch {
      return false;
    }
  }
}
