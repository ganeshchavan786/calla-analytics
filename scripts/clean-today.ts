import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { uniqueCode: "OWN-5250" }
  });
  if (!user) {
    console.error("User with uniqueCode OWN-5250 not found!");
    return;
  }
  
  const todayStart = new Date("2026-05-19T00:00:00.000Z");
  const todayEnd = new Date("2026-05-19T23:59:59.999Z");
  
  const result = await prisma.callLog.deleteMany({
    where: {
      importedById: user.id,
      date: {
        gte: todayStart,
        lte: todayEnd
      }
    }
  });
  
  console.log(`Successfully deleted ${result.count} call logs for user OWN-5250 on 19 May 2026!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
