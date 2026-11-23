import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const email = "sakil@point001.local";
  const passwordHash = await bcrypt.hash("sakill", 10);

  // Upsert dev user
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      name: "Sakil",
      passwordHash,
    },
  });

  console.log(`Dev user configured: ${user.email} (id: ${user.id})`);

  // Clear existing items for dev user to re-seed cleanly
  await prisma.task.deleteMany({ where: { userId: user.id } });
  await prisma.calendarEvent.deleteMany({ where: { userId: user.id } });
  await prisma.habitLog.deleteMany({ where: { habit: { userId: user.id } } });
  await prisma.habit.deleteMany({ where: { userId: user.id } });
  await prisma.clipboardNote.deleteMany({ where: { userId: user.id } });
  await prisma.debtRecord.deleteMany({ where: { userId: user.id } });
  await prisma.financialAccount.deleteMany({ where: { userId: user.id } });

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const today = new Date(`${y}-${m}-${d}T00:00:00.000Z`);

  // 1. Dev Tasks (Today & upcoming)
  await prisma.task.createMany({
    data: [
      {
        userId: user.id,
        title: "Review Neon database migration logs",
        description: "Check connection pooling limits, SSL cert configuration, and query performance.",
        dueDate: today,
        dueTime: "11:00 AM",
        priority: "HIGH",
        isCompleted: false,
      },
      {
        userId: user.id,
        title: "Verify local backup integrity",
        description: "Ensure pg_dump archives are encrypted and checksums match.",
        dueDate: today,
        dueTime: "05:00 PM",
        priority: "MEDIUM",
        isCompleted: false,
      },
      {
        userId: user.id,
        title: "Setup email account OAuth tokens",
        description: "Configure Google Cloud console OAuth 2.0 client IDs for IMAP/SMTP sync.",
        dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2),
        dueTime: "02:00 PM",
        priority: "LOW",
        isCompleted: false,
      },
    ],
  });

  // 2. Dev Events (Today & this week)
  await prisma.calendarEvent.createMany({
    data: [
      {
        userId: user.id,
        title: "Architecture Alignment Sync",
        description: "Review monorepo layout, Prisma schema conventions, and UX principles.",
        startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 30),
        endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 30),
        eventType: "STANDARD",
        color: "#3b82f6",
        location: "Google Meet",
      },
      {
        userId: user.id,
        title: "Team Weekly Review",
        description: "Weekly cadence across projects and blocker triage.",
        startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0),
        endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 11, 0),
        eventType: "WEEKLY",
        recurrenceType: "WEEKLY",
        recurrenceEndDate: new Date("2030-12-12T00:00:00.000Z"),
        color: "#10b981",
        location: "Conference Room A",
      },
      {
        userId: user.id,
        title: "Family Anniversary",
        description: "Annual family celebration and dinner.",
        startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 19, 0),
        endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 22, 0),
        eventType: "ANNIVERSARY",
        recurrenceType: "YEARLY",
        recurrenceEndDate: new Date("2030-12-12T00:00:00.000Z"),
        color: "#8b5cf6",
        location: "Downtown Bistro",
      },
      {
        userId: user.id,
        title: "Sprint Retrospective",
        description: "Celebrate wins, identify process friction, and update sprint backlog.",
        startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 4, 16, 0),
        endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 4, 17, 0),
        eventType: "STANDARD",
        color: "#f59e0b",
        location: "Team Hub",
      },
    ],
  });

  // 3. Dev Habits
  const h1 = await prisma.habit.create({
    data: { userId: user.id, name: "Morning Quran & Prayer" },
  });
  await prisma.habit.create({
    data: { userId: user.id, name: "Deep Engineering Focus" },
  });
  await prisma.habit.create({
    data: { userId: user.id, name: "Physical Workout & Stretch" },
  });
  const h4 = await prisma.habit.create({
    data: { userId: user.id, name: "Book Reading (20 min)" },
  });

  // Habit logs for today
  await prisma.habitLog.createMany({
    data: [
      { habitId: h1.id, date: today, status: true },
      { habitId: h4.id, date: today, status: true },
    ],
  });

  // 4. Dev Clipboard Notes
  await prisma.clipboardNote.createMany({
    data: [
      {
        userId: user.id,
        title: "Active Deployment Pipeline",
        elements: [
          { id: "e1", text: "Render build: npm run build && npx prisma migrate deploy" },
          { id: "e2", text: "Vercel client: rewrites configured for SPA navigation" },
        ],
        order: 1,
      },
      {
        userId: user.id,
        title: "Key Port Mappings",
        elements: [
          { id: "e3", text: "Local Express API: 5000\nClient Vite: 5173" },
          { id: "e4", text: "PostgreSQL port: 5432" },
        ],
        order: 2,
      },
    ],
  });

  // 5. Dev Financial Accounts & Debts
  await prisma.financialAccount.createMany({
    data: [
      { userId: user.id, name: "Cash in Hand", balance: 3250, accountType: "CASH" },
      { userId: user.id, name: "bKash Personal", balance: 15000, accountType: "BKASH" },
      { userId: user.id, name: "City Bank", balance: 30000, accountType: "BANK" },
    ],
  });

  await prisma.debtRecord.createMany({
    data: [
      {
        userId: user.id,
        personName: "Apartment Mess Charge",
        type: "I_OWE",
        totalAmount: 3500,
        paidAmount: 0,
        dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 4),
        status: "PENDING",
      },
      {
        userId: user.id,
        personName: "Cloud Server Hosting",
        type: "I_OWE",
        totalAmount: 1500,
        paidAmount: 0,
        dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6),
        status: "PENDING",
      },
      {
        userId: user.id,
        personName: "Freelance Client Payout",
        type: "OWES_ME",
        totalAmount: 12500,
        paidAmount: 0,
        status: "PENDING",
      },
    ],
  });

  console.log("Database seeded successfully with dev data!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
