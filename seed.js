const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding test data ...");

  const user = await prisma.user.create({ data: {} });

  await prisma.member.create({
    data: {
      userId: user.id,
      fullName: "Demo Member",
      dob: new Date("1992-04-20"),
      gender: "F",
      email: "demo@member.com",
      phone: "6139998888"
    }
  });

  console.log("Done!");
}

main()
  .catch(e => console.error(e))
  .finally(async () => prisma.$disconnect());
