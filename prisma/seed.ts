import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })
dotenv.config({ path: ".env.local", override: true })
import { PrismaClient, UserRole } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const SYSTEM_DEVICE_TYPES = [
  { name: "Smoke Detector", code: "SD", category: "Detection" },
  { name: "Heat Detector", code: "HD", category: "Detection" },
  { name: "Beam Detector", code: "BD", category: "Detection" },
  { name: "Duct Detector", code: "DD", category: "Detection" },
  { name: "Manual Pull Station", code: "PS", category: "Initiation" },
  { name: "Horn", code: "HN", category: "Notification" },
  { name: "Strobe", code: "STR", category: "Notification" },
  { name: "Horn/Strobe", code: "HS", category: "Notification" },
  { name: "Speaker", code: "SPK", category: "Notification" },
  { name: "Speaker/Strobe", code: "SS", category: "Notification" },
  { name: "Monitor Module", code: "MM", category: "Module" },
  { name: "Control Module", code: "CM", category: "Module" },
  { name: "Input Module", code: "IM", category: "Module" },
  { name: "Output Module", code: "OM", category: "Module" },
  { name: "Flow Switch", code: "WF", category: "Suppression" },
  { name: "Tamper Switch", code: "TS", category: "Suppression" },
  { name: "Panel", code: "PNL", category: "Control Equipment" },
  { name: "Power Supply", code: "RPS", category: "Control Equipment" },
  { name: "Annunciator", code: "ANN", category: "Control Equipment" },
  { name: "Graphic Annunciator", code: "GA", category: "Control Equipment" },
  { name: "Amplifier", code: "AMP", category: "Communication" },
  { name: "Custom Device", code: "CUSTOM", category: "Other" },
] as const

async function main() {
  console.log("🌱 Seeding database...")

  // Create system device types — null companyId = shared across all tenants.
  // skipDuplicates makes this idempotent across seed runs.
  await prisma.deviceType.createMany({
    data: SYSTEM_DEVICE_TYPES.map((dt) => ({
      name: dt.name,
      code: dt.code,
      category: dt.category,
      isSystem: true,
      companyId: null,
    })),
    skipDuplicates: true,
  })

  console.log(`✅ Seeded ${SYSTEM_DEVICE_TYPES.length} system device types`)

  // Create a default seed company and admin for local development
  if (process.env.NODE_ENV !== "production") {
    const company = await prisma.company.upsert({
      where: { slug: "demo" },
      update: {},
      create: {
        name: "Demo Company",
        slug: "demo",
      },
    })

    const passwordHash = await bcrypt.hash("password", 12)

    await prisma.user.upsert({
      where: { companyId_email: { companyId: company.id, email: "admin@demo.com" } },
      update: {},
      create: {
        companyId: company.id,
        name: "Admin User",
        email: "admin@demo.com",
        passwordHash,
        role: UserRole.COMPANY_ADMIN,
      },
    })

    console.log("✅ Demo company and admin user created")
    console.log("   Email: admin@demo.com")
    console.log("   Password: password")
  }

  console.log("✅ Seeding complete")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
