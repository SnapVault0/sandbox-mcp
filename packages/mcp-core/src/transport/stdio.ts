import { Transform } from "stream";
import { MCPMessage, Transport } from "../types";

export class StdioTransport implements Transport {
  private encoder: Transform;
  private decoder: Transform;

  constructor() {
    this.encoder = new Transform({
      transform(chunk, encoding, callback) {
        callback(null, chunk + "\n");
      },
    });

    this.decoder = new Transform({
      transform(chunk, encoding, callback) {
        callback(null, chunk.toString().trim());
      },
    });

    this.encoder.pipe(process.stdout);
    process.stdin.pipe(this.decoder);
  }

  async send(message: MCPMessage): Promise<void> {
    this.encoder.write(JSON.stringify(message));
  }

  async *receive(): AsyncIterableIterator<MCPMessage> {
    for await (const chunk of this.decoder) {
      try {
        const message = JSON.parse(chunk as string) as MCPMessage;
        yield message;
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    }
  }

  async close(): Promise<void> {
    this.encoder.end();
    this.decoder.end();
  }
}
