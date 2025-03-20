import * as dotenv from "dotenv";
import { resolve } from "path";

export interface EnvConfig {
  OPENAI_API_KEY?: string;
  [key: string]: string | undefined;
}

export class Config {
  private static instance: Config;
  private config: EnvConfig = {};

  private constructor() {
    this.loadEnv();
  }

  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  private loadEnv(): void {
    try {
      // 로컬 개발 환경에서는 .env.local 파일 사용
      if (process.env.NODE_ENV !== "production") {
        const envPath = resolve(__dirname, "../../.env.local");
        const result = dotenv.config({ path: envPath });

        if (result.error) {
          console.error("Failed to load .env.local file:", result.error);
        } else {
          this.config = { ...result.parsed };
        }
      }

      // 프로덕션 환경변수 로드 (process.env에서)
      Object.keys(process.env).forEach((key) => {
        this.config[key] = process.env[key];
      });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to load environment variables:", error);
      }
    }
  }

  get<T = string>(key: string, defaultValue?: T): T | undefined {
    return (this.config[key] as T) ?? defaultValue;
  }

  set(key: string, value: string): void {
    this.config[key] = value;
  }
}
