import { registerAs } from "@nestjs/config";
import { DataSource, DataSourceOptions } from "typeorm";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

const config: DataSourceOptions = {
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT, 10) || 5433,
  username: process.env.DB_USER || "mbois_user",
  password: process.env.DB_PASSWORD || "mbois_password_2026",
  database: process.env.DB_NAME || "festival_mbois",
  entities: ["dist/**/*.entity{.ts,.js}"],
  migrations: ["dist/database/migrations/*{.ts,.js}"],
  synchronize: false,
  logging: process.env.DB_LOGGING === "true",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
};

export default registerAs("typeorm", () => config);
export const connectionSource = new DataSource(config);
