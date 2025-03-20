import { BaseResource } from "./base.js";
import { Tool, ToolArgs } from "./types.js";

export class Registry {
  private tools: Map<string, Tool<ToolArgs>>;
  private resources: Map<string, BaseResource>;

  constructor() {
    this.tools = new Map();
    this.resources = new Map();
  }

  registerTool<T extends ToolArgs>(tool: Tool<T>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool with name ${tool.name} already registered`);
    }
    this.tools.set(tool.name, tool as Tool<ToolArgs>);
  }

  registerResource(resource: BaseResource): void {
    if (this.resources.has(resource.uri)) {
      throw new Error(`Resource with URI ${resource.uri} already registered`);
    }
    this.resources.set(resource.uri, resource);
  }

  getTool<T extends ToolArgs>(name: string): Tool<T> | undefined {
    return this.tools.get(name) as Tool<T> | undefined;
  }

  getResource(uri: string): BaseResource | undefined {
    return this.resources.get(uri);
  }

  getTools(): Tool<ToolArgs>[] {
    return Array.from(this.tools.values());
  }

  listResources(): BaseResource[] {
    return Array.from(this.resources.values());
  }

  clear(): void {
    this.tools.clear();
    this.resources.clear();
  }
}
