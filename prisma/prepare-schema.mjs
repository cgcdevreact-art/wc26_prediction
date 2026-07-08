import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const prismaDir = path.join(root, "prisma");
const templatePath = path.join(prismaDir, "schema.template.prisma");
const outputPath = path.join(prismaDir, "schema.runtime.prisma");

const readDatabaseUrlFromEnvFile = () => {
  const envPaths = [
    path.join(root, ".env"),
    path.join(root, ".env.local"),
    path.join(root, ".env.development.local"),
    path.join(root, ".env.production.local"),
  ];

  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;

    const contents = fs.readFileSync(envPath, "utf8");
    const line = contents
      .split(/\r?\n/)
      .find((entry) => entry.trim().startsWith("DATABASE_URL="));

    if (!line) continue;

    const value = line.slice("DATABASE_URL=".length).trim();
    return value.replace(/^['"]|['"]$/g, "");
  }

  return "";
};

const databaseUrl = process.env.DATABASE_URL || readDatabaseUrlFromEnvFile();
const isMySql = databaseUrl.startsWith("mysql://") || databaseUrl.startsWith("mysqls://");
const provider = isMySql ? "mysql" : "sqlite";

const template = fs.readFileSync(templatePath, "utf8");
let rendered = template.replace("__DATABASE_PROVIDER__", provider);
if (provider === "sqlite") {
  rendered = rendered.replace(/\s+@db\.\w+/g, "");
}

fs.writeFileSync(outputPath, rendered);

console.log(`[prisma] prepared schema.runtime.prisma for ${provider}`);
