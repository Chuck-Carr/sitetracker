import * as dotenv from "dotenv";
// Load .env first, then .env.local so local values take precedence
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
