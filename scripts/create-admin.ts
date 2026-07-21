/**
 * SiteStatus — Create First Admin
 *
 * Interactive script that creates the initial company and admin user.
 * Run AFTER `prisma migrate deploy` and `npm run db:seed`.
 *
 * Usage (from the project root on the server):
 *   DATABASE_URL="postgresql://user:pass@127.0.0.1:5432/sitestatus" \
 *     npx tsx scripts/create-admin.ts
 */
import * as dotenv from "dotenv"

// Load .env but do NOT override DATABASE_URL if it was set before this script.
// dotenv skips existing env vars by default (override: false).
dotenv.config({ path: ".env" })
dotenv.config({ path: ".env.local", override: true })

import { PrismaClient, UserRole } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"
import * as readline from "readline"

if (!process.env.DATABASE_URL) {
  console.error("❌  DATABASE_URL is not set. Prefix the command or add it to .env.")
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const prompt = (question: string): Promise<string> =>
  new Promise(resolve => rl.question(question, resolve))

async function main() {
  console.log("\n🔐  SiteStatus — Create First Admin\n")

  const companyName = (await prompt("Company name: ")).trim()
  const companySlug = (await prompt("Company slug (lowercase letters, numbers, hyphens — e.g. acme): ")).trim()
  const adminName   = (await prompt("Admin full name: ")).trim()
  const adminEmail  = (await prompt("Admin email: ")).trim().toLowerCase()
  const adminPass   = (await prompt("Admin password (min 8 characters): ")).trim()

  rl.close()

  // Validate
  if (!companyName || !companySlug || !adminName || !adminEmail || !adminPass) {
    console.error("\n❌  All fields are required.")
    process.exit(1)
  }
  if (!/^[a-z0-9-]+$/.test(companySlug)) {
    console.error("\n❌  Slug must be lowercase letters, numbers, and hyphens only (e.g. my-company).")
    process.exit(1)
  }
  if (adminPass.length < 8) {
    console.error("\n❌  Password must be at least 8 characters.")
    process.exit(1)
  }

  console.log("\n   Creating company and admin...\n")

  // Create or find company
  const company = await prisma.company.upsert({
    where: { slug: companySlug },
    update: {},
    create: { name: companyName, slug: companySlug },
  })

  // Create or update admin user
  const passwordHash = await bcrypt.hash(adminPass, 12)
  const user = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: adminEmail } },
    update: { name: adminName, passwordHash, role: UserRole.COMPANY_ADMIN },
    create: {
      companyId: company.id,
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: UserRole.COMPANY_ADMIN,
    },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://your-domain.com"

  console.log("✅  Done!\n")
  console.log(`   Company : ${company.name}  (slug: ${company.slug})`)
  console.log(`   Email   : ${user.email}`)
  console.log(`   Login at: ${appUrl}\n`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
