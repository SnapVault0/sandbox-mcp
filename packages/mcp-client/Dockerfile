FROM node:18-alpine

WORKDIR /app

# 패키지 파일 복사
COPY package*.json ./
COPY packages/mcp-client/package*.json ./packages/mcp-client/
COPY packages/mcp-core/package*.json ./packages/mcp-core/

# 의존성 설치
RUN npm install

# 소스 코드 복사
COPY packages/mcp-core ./packages/mcp-core
COPY packages/mcp-client ./packages/mcp-client

# 빌드
RUN npm run build

# 테스트 실행
CMD ["npm", "run", "test:client"] 