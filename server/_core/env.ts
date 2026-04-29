export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  s3Endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
  s3AccessKey: process.env.S3_ACCESS_KEY ?? "minioadmin",
  s3SecretKey: process.env.S3_SECRET_KEY ?? "minioadmin",
  s3Bucket: process.env.S3_BUCKET ?? "fichas-tecnicas",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  ollamaUrl: process.env.OLLAMA_URL ?? "http://host.docker.internal:11434", // Using host.docker.internal assuming Ollama runs on host
};
