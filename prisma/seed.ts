import "dotenv/config";
import { prisma } from "../src/lib/prisma";

// Local dev/testing convenience only. Creates synthetic departments, users,
// and sample boards across all three visibility types. Never touches or
// promotes any real account — every user here has a fake @example.test email.
async function main() {
  // Department.name has no unique constraint, so find-or-create by name.
  const engineering =
    (await prisma.department.findFirst({ where: { name: "Engineering (seed)" } })) ??
    (await prisma.department.create({ data: { name: "Engineering (seed)" } }));

  const marketing =
    (await prisma.department.findFirst({ where: { name: "Marketing (seed)" } })) ??
    (await prisma.department.create({ data: { name: "Marketing (seed)" } }));

  const manager = await prisma.user.upsert({
    where: { email: "seed-manager@example.test" },
    update: {},
    create: { email: "seed-manager@example.test", name: "Seed Manager", globalRole: "USER" },
  });
  const member = await prisma.user.upsert({
    where: { email: "seed-member@example.test" },
    update: {},
    create: { email: "seed-member@example.test", name: "Seed Member", globalRole: "USER" },
  });
  const outsider = await prisma.user.upsert({
    where: { email: "seed-outsider@example.test" },
    update: {},
    create: { email: "seed-outsider@example.test", name: "Seed Outsider", globalRole: "USER" },
  });

  await prisma.departmentMember.upsert({
    where: { departmentId_userId: { departmentId: engineering.id, userId: manager.id } },
    update: { role: "MANAGER" },
    create: { departmentId: engineering.id, userId: manager.id, role: "MANAGER" },
  });
  await prisma.departmentMember.upsert({
    where: { departmentId_userId: { departmentId: engineering.id, userId: member.id } },
    update: { role: "MEMBER" },
    create: { departmentId: engineering.id, userId: member.id, role: "MEMBER" },
  });

  const defaultColumns = [
    { name: "To Do", order: 0 },
    { name: "In Progress", order: 1 },
    { name: "Done", order: 2 },
  ];

  const existingGlobal = await prisma.board.findFirst({ where: { name: "Seed: Global Board" } });
  if (!existingGlobal) {
    await prisma.board.create({
      data: {
        name: "Seed: Global Board",
        ownerId: manager.id,
        visibilityType: "GLOBAL",
        columns: { create: defaultColumns },
      },
    });
  }

  const existingDept = await prisma.board.findFirst({ where: { name: "Seed: Engineering Board" } });
  if (!existingDept) {
    await prisma.board.create({
      data: {
        name: "Seed: Engineering Board",
        ownerId: manager.id,
        visibilityType: "DEPARTMENT",
        departmentId: engineering.id,
        columns: { create: defaultColumns },
      },
    });
  }

  const existingPersonal = await prisma.board.findFirst({ where: { name: "Seed: Personal Board" } });
  if (!existingPersonal) {
    await prisma.board.create({
      data: {
        name: "Seed: Personal Board",
        ownerId: member.id,
        visibilityType: "PERSONAL",
        columns: { create: defaultColumns },
      },
    });
  }

  console.log("Seed complete:", { engineering: engineering.id, marketing: marketing.id, manager: manager.id, member: member.id, outsider: outsider.id });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
