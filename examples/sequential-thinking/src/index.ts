import { SequentialThinkingServer } from "./server.js";

async function main() {
  const server = new SequentialThinkingServer({
    port: 3000,
    host: "localhost",
  });

  try {
    await server.start();
    console.log("Sequential Thinking MCP Server started");
    console.log("Server state:", server.getState());

    // 테스트 도구 호출
    const fileResult = await server.handleToolCall("file-system", {
      operation: "list",
      path: ".",
    });
    console.log("File system tool test result:", fileResult);

    const processResult = await server.handleToolCall("process", {
      command: 'echo "Hello from Sequential Thinking MCP Server"',
    });
    console.log("Process tool test result:", processResult);

    // 5초 후 서버 종료
    setTimeout(async () => {
      await server.stop();
      console.log("Server stopped");
      process.exit(0);
    }, 5000);
  } catch (error) {
    console.error("Server error:", error);
    process.exit(1);
  }
}

main().catch(console.error);
