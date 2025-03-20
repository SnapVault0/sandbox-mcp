# @smcp/mcp-server

Sequential Thinking MCP 서버 프레임워크 구현체입니다.

## 설치

```bash
npm install @smcp/mcp-server
# or
pnpm add @smcp/mcp-server
# or
yarn add @smcp/mcp-server
```

## 기본 사용법

```typescript
import { BaseMCPServer, BaseTool, ExecutionResult } from "@smcp/mcp-server";

// 커스텀 도구 구현
class MyTool extends BaseTool {
  readonly name = "my-tool";
  readonly description = "My custom tool";
  readonly parameters = [
    /* ... */
  ];

  async execute(args: unknown): Promise<ExecutionResult> {
    // 도구 구현
  }

  validate(args: unknown): boolean {
    // 인자 검증
  }
}

// 서버 구현
class MyServer extends BaseMCPServer {
  constructor() {
    super({ port: 3000 });
    this.registry.registerTool(new MyTool());
  }
}

// 서버 실행
const server = new MyServer();
await server.start();
```

## 내장 도구

### FileSystemTool

파일 시스템 작업을 위한 도구입니다.

```typescript
const result = await server.handleToolCall("file-system", {
  operation: "read",
  path: "./myfile.txt",
});
```

### ProcessTool

시스템 명령어 실행을 위한 도구입니다.

```typescript
const result = await server.handleToolCall("process", {
  command: 'echo "Hello"',
  cwd: "/path/to/workspace",
});
```

### WorkspaceTool

워크스페이스 관리를 위한 도구입니다.

```typescript
const result = await server.handleToolCall("workspace", {
  operation: "init",
  path: "./my-workspace",
});
```

## 확장하기

### 커스텀 도구 만들기

```typescript
import { BaseTool, ExecutionResult, ToolParameter } from "@smcp/mcp-server";
import { z } from "zod";

export class CustomTool extends BaseTool {
  readonly name = "custom-tool";
  readonly description = "My custom tool";
  readonly parameters: ToolParameter[] = [
    {
      name: "input",
      type: z.string(),
      description: "Input value",
      required: true,
    },
  ];

  async execute(args: unknown): Promise<ExecutionResult> {
    const { input } = args as { input: string };
    return {
      success: true,
      data: `Processed: ${input}`,
      duration: 0,
    };
  }

  validate(args: unknown): boolean {
    try {
      const schema = z.object({
        input: z.string(),
      });
      schema.parse(args);
      return true;
    } catch {
      return false;
    }
  }
}
```

### 커스텀 서버 만들기

```typescript
import { BaseMCPServer, ServerConfig } from "@smcp/mcp-server";

export class CustomServer extends BaseMCPServer {
  constructor(config: ServerConfig) {
    super(config);
  }

  async initialize(): Promise<void> {
    // 초기화 로직
  }

  async start(): Promise<void> {
    await super.start();
    // 추가 시작 로직
  }

  async stop(): Promise<void> {
    // 정리 로직
    await super.stop();
  }
}
```

## API 문서

자세한 API 문서는 [여기](./docs/api.md)에서 확인할 수 있습니다.

## 테스트

```bash
pnpm test
```

## 라이선스

AGPL-3.0
