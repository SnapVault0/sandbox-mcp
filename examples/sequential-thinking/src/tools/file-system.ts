import {
  BaseTool,
  ExecutionResult,
  ToolParameter,
} from "@sandbox-mcp/mcp-server";
import * as fs from "fs/promises";
import * as path from "path";
import { z } from "zod";

export class FileSystemTool extends BaseTool {
  readonly name = "file-system";
  readonly description = "File system operations like read, write, list files";
  readonly parameters: ToolParameter[] = [
    {
      name: "operation",
      type: z.enum(["read", "write", "list", "delete"]),
      description: "The operation to perform",
      required: true,
    },
    {
      name: "path",
      type: z.string(),
      description: "File or directory path",
      required: true,
    },
    {
      name: "content",
      type: z.string(),
      description: "Content to write (for write operation)",
      required: false,
    },
  ];

  async execute(args: unknown): Promise<ExecutionResult> {
    const startTime = Date.now();
    try {
      const {
        operation,
        path: filePath,
        content,
      } = args as {
        operation: "read" | "write" | "list" | "delete";
        path: string;
        content?: string;
      };

      switch (operation) {
        case "read":
          const data = await fs.readFile(filePath, "utf-8");
          return {
            success: true,
            data,
            duration: Date.now() - startTime,
          };

        case "write":
          if (!content) {
            throw new Error("Content is required for write operation");
          }
          await fs.writeFile(filePath, content, "utf-8");
          return {
            success: true,
            duration: Date.now() - startTime,
          };

        case "list":
          const files = await fs.readdir(filePath);
          const fileStats = await Promise.all(
            files.map(async (file) => {
              const fullPath = path.join(filePath, file);
              const stats = await fs.stat(fullPath);
              return {
                name: file,
                isDirectory: stats.isDirectory(),
                size: stats.size,
                modified: stats.mtime,
              };
            })
          );
          return {
            success: true,
            data: fileStats,
            duration: Date.now() - startTime,
          };

        case "delete":
          await fs.unlink(filePath);
          return {
            success: true,
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
        operation: z.enum(["read", "write", "list", "delete"]),
        path: z.string(),
        content: z.string().optional(),
      });
      schema.parse(args);
      return true;
    } catch {
      return false;
    }
  }
}
