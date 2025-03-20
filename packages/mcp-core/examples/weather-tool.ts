import { MCP } from "../src";
import { OpenAIProvider } from "../src/providers/openai";
import { SequentialThinkingTool } from "../src/tools/sequential-thinking";
import { StdioTransport } from "../src/transport/stdio";
import { MCPRequest, Tool } from "../src/types";

// 개발 환경으로 설정
process.env.NODE_ENV = "development";
console.log("[DEBUG] 환경 설정:", process.env.NODE_ENV);

interface WeatherResponse {
  temperature: number;
  conditions: string;
  humidity: number;
}

class WeatherTool implements Tool {
  name = "get_weather";
  description = "Get current weather information for a location";
  parameters = [
    {
      name: "location",
      type: "string",
      description: "City name or location",
      required: true,
    },
  ];

  async execute(args: Record<string, unknown>): Promise<WeatherResponse> {
    const { location } = args as { location: string };

    // 이 예제에서는 실제 API 호출 대신 더미 데이터를 반환합니다
    return {
      temperature: 22,
      conditions: "Partly cloudy",
      humidity: 65,
    };
  }
}

async function main() {
  console.log("[DEBUG] main 함수 시작");

  // OpenAI 프로바이더 설정
  console.log("[DEBUG] OpenAI 프로바이더 초기화 시작");
  const provider = new OpenAIProvider();
  console.log("[DEBUG] OpenAI 프로바이더 초기화 완료");

  // 도구들 설정
  console.log("[DEBUG] 도구 초기화 시작");
  const weatherTool = new WeatherTool();
  const sequentialTool = new SequentialThinkingTool(provider, [weatherTool], {
    maxSteps: 3,
    systemPrompt: "You are a helpful weather assistant.",
  });
  console.log("[DEBUG] 도구 초기화 완료");

  // MCP 서버 설정
  console.log("[DEBUG] MCP 서버 설정 시작");
  const transport = new StdioTransport();
  const mcp = new MCP();
  console.log("[DEBUG] MCP 서버 설정 완료");

  // 도구 등록
  console.log("[DEBUG] 도구 등록 시작");
  mcp.registerTool(weatherTool);
  mcp.registerTool(sequentialTool);
  console.log("[DEBUG] 도구 등록 완료");

  // 서버 상태 변화 모니터링
  mcp.onStateChange((state) => {
    console.log("[DEBUG] 서버 상태 변경:", state);
  });

  try {
    // 서버 연결 시도
    console.log("[DEBUG] 서버 연결 시작");
    await mcp.connect(transport);
    console.log("[DEBUG] 서버 연결 완료");

    // 테스트 메시지 전송
    console.log("[DEBUG] 테스트 메시지 전송");
    const testMessage: MCPRequest = {
      type: "request",
      id: "test-1",
      payload: {
        tool: "get_weather",
        args: {
          location: "Seoul",
        },
      },
    };

    await transport.send(testMessage);
    console.log("[DEBUG] 테스트 메시지 전송 완료");

    // 3초 후에 health check 요청
    setTimeout(async () => {
      console.log("[DEBUG] Health check 요청 전송");
      await transport.send({
        type: "request",
        id: "health-1",
        payload: {
          tool: "health_check",
          args: {},
        },
      });
    }, 3000);

    // 10초 후에 연결 해제
    setTimeout(async () => {
      console.log("[DEBUG] 연결 해제 시작");
      await mcp.disconnect();
      process.exit(0);
    }, 10000);

    console.error("Weather MCP server is running...");

    // SIGINT (Ctrl+C) 처리
    process.on("SIGINT", async () => {
      console.log("\n[DEBUG] SIGINT 수신, 연결 해제 시작");
      await mcp.disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error("[ERROR] MCP 서버 연결 실패:", error);
    // 연결 실패시에도 프로세스를 종료하지 않고 재시도 로직을 기다림
  }
}

main().catch((err) => {
  console.error("[ERROR] 실행 중 오류 발생:", err);
});
