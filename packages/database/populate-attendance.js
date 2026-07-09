const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('--- Database Attendance Population Started ---');

  const members = await prisma.member.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      organizationId: true,
      homeGymId: true,
    }
  });

  console.log(`Found ${members.length} members in the database.`);

  if (members.length === 0) {
    console.log('No members found. Please run the main populate script first.');
    return;
  }

  let totalRecordsCreated = 0;

  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    const memberName = `${member.firstName} ${member.lastName}`;
    
    // Generate between 8 to 22 attendance logs for each member over the last 30 days
    const numLogs = getRandomInt(8, 22);
    
    // Choose random dates in the past 30 days
    const dates = [];
    const usedDays = new Set();
    
    while (dates.length < numLogs) {
      const dayOffset = getRandomInt(0, 30);
      if (!usedDays.has(dayOffset)) {
        usedDays.add(dayOffset);
        dates.push(dayOffset);
      }
    }
    
    // Sort so records are generated somewhat chronologically
    dates.sort((a, b) => b - a);

    const attendanceData = [];

    for (const offset of dates) {
      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() - offset);
      
      // Random hour between 6am and 9pm
      const hour = getRandomInt(6, 21);
      const minute = getRandomInt(0, 59);
      checkInDate.setHours(hour, minute, 0, 0);

      // Duration between 45 mins to 120 mins
      const durationMins = getRandomInt(45, 120);
      const checkOutDate = new Date(checkInDate.getTime() + durationMins * 60 * 1000);

      const method = getRandomInt(0, 2) === 0 ? 'RFID' : getRandomInt(0, 1) === 0 ? 'Scan' : 'Manual';
      const status = getRandomInt(0, 20) === 0 ? 'Denied' : 'Granted';
      const reason = status === 'Denied' ? 'No Active Plan' : null;

      attendanceData.push({
        organizationId: member.organizationId,
        gymId: member.homeGymId,
        memberId: member.id,
        memberName: memberName,
        checkInTime: checkInDate,
        checkOutTime: checkOutDate,
        method: method,
        status: status,
        reason: reason,
        recordedBy: getRandomInt(0, 1) === 0 ? 'Front Desk' : 'Scanner Terminal',
        deviceUsed: getRandomInt(0, 1) === 0 ? 'Front Desk Kiosk' : 'Main Access Gate',
        checkoutMethod: 'Scan',
        visitLimitType: 'Unlimited'
      });
    }

    // Insert attendance records for the member
    await prisma.attendance.createMany({
      data: attendanceData
    });

    totalRecordsCreated += attendanceData.length;

    if ((i + 1) % 20 === 0 || i === members.length - 1) {
      console.log(`Generated attendance logs for ${i + 1} / ${members.length} members...`);
    }
  }

  console.log(`--- Seeding Complete: Created ${totalRecordsCreated} attendance logs! ---`);
}

main()
  .catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
