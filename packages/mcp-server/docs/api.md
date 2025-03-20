# API 문서

## 핵심 인터페이스

### BaseMCPServer

MCP 서버의 기본 구현을 제공하는 추상 클래스입니다.

```typescript
abstract class BaseMCPServer {
  constructor(config: ServerConfig);

  abstract initialize(): Promise<void>;
  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;

  handleToolCall(
    name: string,
    args: unknown,
    auth?: AuthContext
  ): Promise<ExecutionResult>;

  handleResourceRequest(
    uri: string,
    auth?: AuthContext
  ): Promise<ExecutionResult>;

  getState(): ServerState;
}
```

### BaseTool

도구 구현을 위한 기본 추상 클래스입니다.

```typescript
abstract class BaseTool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly parameters: ToolParameter[];

  abstract execute(args: unknown, auth?: AuthContext): Promise<ExecutionResult>;

  abstract validate(args: unknown): boolean;
}
```

### BaseResource

리소스 구현을 위한 기본 추상 클래스입니다.

```typescript
abstract class BaseResource {
  abstract readonly uri: string;
  abstract readonly metadata: ResourceMetadata;

  abstract fetch(
    params?: unknown,
    auth?: AuthContext
  ): Promise<ExecutionResult>;

  abstract exists(): Promise<boolean>;
}
```

## 타입 정의

### ServerConfig

서버 설정을 위한 인터페이스입니다.

```typescript
interface ServerConfig {
  port?: number;
  host?: string;
  maxConnections?: number;
  timeout?: number;
}
```

### ServerState

서버 상태 정보를 위한 인터페이스입니다.

```typescript
interface ServerState {
  isRunning: boolean;
  connections: number;
  startTime: Date;
  errors: Error[];
}
```

### ToolParameter

도구 매개변수 정의를 위한 인터페이스입니다.

```typescript
interface ToolParameter {
  name: string;
  type: z.ZodType;
  description: string;
  required: boolean;
  default?: unknown;
}
```

### ResourceMetadata

리소스 메타데이터를 위한 인터페이스입니다.

```typescript
interface ResourceMetadata {
  uri: string;
  contentType: string;
  lastModified?: Date;
  size?: number;
}
```

### AuthContext

인증 컨텍스트를 위한 인터페이스입니다.

```typescript
interface AuthContext {
  userId?: string;
  permissions: string[];
  metadata: Record<string, unknown>;
}
```

### ExecutionResult

도구 실행 결과를 위한 타입입니다.

```typescript
type ExecutionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: Error;
  duration: number;
};
```

## 내장 도구

### FileSystemTool

파일 시스템 작업을 위한 도구입니다.

#### 작업

- `read`: 파일 읽기
- `write`: 파일 쓰기
- `list`: 디렉토리 목록
- `delete`: 파일 삭제

### ProcessTool

시스템 명령어 실행을 위한 도구입니다.

#### 매개변수

- `command`: 실행할 명령어
- `cwd`: 작업 디렉토리 (선택)
- `timeout`: 타임아웃 (선택, 기본값: 30000ms)

### WorkspaceTool

워크스페이스 관리를 위한 도구입니다.

#### 작업

- `init`: 워크스페이스 초기화
- `status`: 워크스페이스 상태 확인
- `search`: 파일 검색
- `clean`: 워크스페이스 정리
