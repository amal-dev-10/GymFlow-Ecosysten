const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const firstNames = [
  'Arjun', 'Priya', 'Rohan', 'Neha', 'Karan', 'Simran', 'Rahul', 'Ananya', 'Kabir', 'Divya',
  'Aditya', 'Pooja', 'Vikram', 'Sneha', 'Dev', 'Riya', 'Yash', 'Tanya', 'Manish', 'Shruti',
  'Ravi', 'Tina', 'Gaurav', 'Meera', 'Kunal', 'Alisha', 'Sameer', 'Ritu', 'Vijay', 'Preeti',
  'Sanjay', 'Kavita', 'Anil', 'Sunita', 'Deepak', 'Geeta', 'Rajesh', 'Maya', 'Suresh', 'Hema',
  'Amit', 'Anita', 'Harish', 'Rekha', 'Ramesh', 'Jyoti', 'Dinesh', 'Shanti', 'Mahesh', 'Lata'
];

const lastNames = [
  'Patel', 'Sharma', 'Mehta', 'Verma', 'Nair', 'Iyer', 'Kapoor', 'Joshi', 'Sen', 'Gupta',
  'Roy', 'Rao', 'Reddy', 'Gowda', 'Bhat', 'Mishra', 'Pandey', 'Trivedi', 'Shah', 'Saxena',
  'Malhotra', 'Oberoi', 'Choudhury', 'Das', 'Banerjee', 'Mukherjee', 'Chatterjee', 'Bose',
  'Gill', 'Sodhi', 'Ahluwalia', 'Sethi', 'Grover', 'Bajaj', 'Singhal', 'Mittal', 'Bansal',
  'Goel', 'Singhania', 'Birla', 'Tata', 'Ambani', 'Jindal', 'Munjal', 'Adani', 'Premji',
  'Hinduja', 'Murthy', 'Nilekani', 'Prem'
];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('--- Database Population Script Started ---');

  // 1. Find the target owner user
  const ownerPhoneNumber = '7902992446';
  const owner = await prisma.user.findFirst({
    where: {
      phoneNumber: {
        contains: ownerPhoneNumber
      }
    }
  });

  if (!owner) {
    throw new Error(`Owner user with phone number containing '${ownerPhoneNumber}' not found in the database. Please create it first.`);
  }

  console.log(`Found Owner User: ${owner.fullName} (ID: ${owner.id}, Phone: ${owner.phoneNumber})`);

  // 2. Define unique slugs and create Organization
  const randSuffix = getRandomInt(100, 999);
  const orgName = `Titan Fitness Group ${randSuffix}`;
  const orgSlug = `titan-fitness-group-${randSuffix}`;

  const organization = await prisma.organization.create({
    data: {
      name: orgName,
      slug: orgSlug,
      businessType: 'Gym & Fitness Center',
      phone: '+919988776655',
      email: `contact@titanfit-${randSuffix}.com`,
      website: `www.titanfit-${randSuffix}.com`,
      addressLine1: 'Titan Plaza, Main Avenue',
      city: 'Trivandrum',
      state: 'Kerala',
      country: 'India',
      postalCode: '695001',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      settings: {
        theme: 'dark',
        billingCycle: 'monthly',
        allowedPaymentMethods: ['cash', 'card', 'upi']
      }
    }
  });

  console.log(`Created Organization: ${organization.name} (ID: ${organization.id}, Slug: ${organization.slug})`);

  // 3. Link Owner to the Organization
  const ownerRoleId = '55a40c43-3493-4629-8eb7-0cd144507925'; // Organization Owner
  const orgUserOwner = await prisma.organizationUser.create({
    data: {
      userId: owner.id,
      organizationId: organization.id,
      roleId: ownerRoleId,
      isActive: true
    }
  });

  console.log(`Linked Owner user to Organization as Owner (Role ID: ${ownerRoleId})`);

  // 4. Create 2 Gyms under the Organization
  const gym1Settings = {
    capacity: 400,
    currency: 'INR',
    services: ['gym_access', 'personal_training', 'group_classes'],
    timezone: 'Asia/Kolkata',
    amenities: ['lockers', 'showers', 'parking', 'wifi'],
    logoOption: 'preset-red',
    accentColor: '#ef4444',
    primaryColor: '#dc2626',
    secondaryColor: '#f97316',
    memberPrefix: 'TITAN-DT-',
    invoicePrefix: 'INV-DT-',
    receiptPrefix: 'REC-DT-',
    attendanceMode: 'QR Code Scan',
    operatingHours: {
      monday: { open: '06:00', close: '22:00', closed: false },
      tuesday: { open: '06:00', close: '22:00', closed: false },
      wednesday: { open: '06:00', close: '22:00', closed: false },
      thursday: { open: '06:00', close: '22:00', closed: false },
      friday: { open: '06:00', close: '22:00', closed: false },
      saturday: { open: '08:00', close: '20:00', closed: false },
      sunday: { open: '08:00', close: '14:00', closed: false }
    }
  };

  const gym2Settings = {
    capacity: 600,
    currency: 'INR',
    services: ['gym_access', 'personal_training', 'group_classes', 'yoga', 'crossfit'],
    timezone: 'Asia/Kolkata',
    amenities: ['lockers', 'showers', 'parking', 'wifi', 'steam_room', 'cafe'],
    logoOption: 'preset-orange',
    accentColor: '#f97316',
    primaryColor: '#ea580c',
    secondaryColor: '#ef4444',
    memberPrefix: 'TITAN-UT-',
    invoicePrefix: 'INV-UT-',
    receiptPrefix: 'REC-UT-',
    attendanceMode: 'QR Code Scan',
    operatingHours: {
      monday: { open: '05:30', close: '22:30', closed: false },
      tuesday: { open: '05:30', close: '22:30', closed: false },
      wednesday: { open: '05:30', close: '22:30', closed: false },
      thursday: { open: '05:30', close: '22:30', closed: false },
      friday: { open: '05:30', close: '22:30', closed: false },
      saturday: { open: '07:00', close: '21:00', closed: false },
      sunday: { open: '08:00', close: '16:00', closed: false }
    }
  };

  const gym1 = await prisma.gym.create({
    data: {
      organizationId: organization.id,
      name: 'Titan Fitness Downtown',
      code: 'TITAN-DT',
      address: '12 Health Street, Downtown, Trivandrum',
      latitude: 8.5241,
      longitude: 76.9366,
      contactPhone: '+919988776601',
      contactEmail: 'downtown@titanfit.com',
      settings: gym1Settings
    }
  });

  const gym2 = await prisma.gym.create({
    data: {
      organizationId: organization.id,
      name: 'Titan Fitness Uptown',
      code: 'TITAN-UT',
      address: '45 Heights Road, Uptown, Trivandrum',
      latitude: 8.5422,
      longitude: 76.9455,
      contactPhone: '+919988776602',
      contactEmail: 'uptown@titanfit.com',
      settings: gym2Settings
    }
  });

  console.log(`Created Gym 1: ${gym1.name} (ID: ${gym1.id}, Code: ${gym1.code})`);
  console.log(`Created Gym 2: ${gym2.name} (ID: ${gym2.id}, Code: ${gym2.code})`);

  // 5. Create 5 Staff Users (with roles: Manager, Receptionist, Trainer, Dietitian)
  const roleIds = {
    manager: 'c3d5ce27-cab2-446f-9c18-260108fe4cbd',
    receptionist: '576b68c9-1982-4807-ba69-ec1dd98ab69c',
    trainer: '86f52630-c197-4648-9608-b375f525aaf2',
    dietitian: '186ff98a-242e-402d-ac31-4a6dda14c0e7'
  };

  const staffDetails = [
    { name: 'Arjun Mehta', role: 'manager', designation: 'General Branch Manager', phone: `+9177000${randSuffix}01`, email: `arjun.mehta.${randSuffix}@titanfit.com`, gymAssignments: [gym1.id, gym2.id] },
    { name: 'Priya Sharma', role: 'receptionist', designation: 'Front Desk Officer', phone: `+9177000${randSuffix}02`, email: `priya.sharma.${randSuffix}@titanfit.com`, gymAssignments: [gym1.id] },
    { name: 'David Kim', role: 'trainer', designation: 'Senior Strength Coach', phone: `+9177000${randSuffix}03`, email: `david.kim.${randSuffix}@titanfit.com`, gymAssignments: [gym1.id] },
    { name: 'Sarah Connor', role: 'trainer', designation: 'Cardio & HIIT Coach', phone: `+9177000${randSuffix}04`, email: `sarah.connor.${randSuffix}@titanfit.com`, gymAssignments: [gym2.id] },
    { name: 'John Doe', role: 'dietitian', designation: 'Certified Nutrition Consultant', phone: `+9177000${randSuffix}05`, email: `john.doe.${randSuffix}@titanfit.com`, gymAssignments: [gym2.id] }
  ];

  for (const staff of staffDetails) {
    const user = await prisma.user.create({
      data: {
        fullName: staff.name,
        phoneNumber: staff.phone,
        email: staff.email,
        isVerified: true
      }
    });

    await prisma.organizationUser.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        roleId: roleIds[staff.role],
        isActive: true
      }
    });

    const employee = await prisma.employee.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        employeeIdNumber: `EMP-${staff.role.toUpperCase()}-${randSuffix}-${getRandomInt(10, 99)}`,
        designation: staff.designation
      }
    });

    for (const gymId of staff.gymAssignments) {
      await prisma.employeeGymAssignment.create({
        data: {
          employeeId: employee.id,
          gymId: gymId,
          isPrimary: gymId === staff.gymAssignments[0],
          isBranchManager: staff.role === 'manager'
        }
      });
    }

    console.log(`Created Staff User: ${staff.name} as ${staff.role.toUpperCase()} (ID: ${user.id}, Phone: ${staff.phone})`);
  }

  // 6. Create 4 Membership Plans
  const plansData = [
    { name: 'Elite Monthly', code: `ELITE-1M-${randSuffix}`, category: 'Fitness', durationType: 'Months', durationValue: 1, basePrice: 2500, joiningFee: 500, taxPercentage: 18 },
    { name: 'Standard Quarterly', code: `STD-3M-${randSuffix}`, category: 'Fitness', durationType: 'Months', durationValue: 3, basePrice: 6000, joiningFee: 500, taxPercentage: 18 },
    { name: 'Premium Half-Yearly', code: `PREM-6M-${randSuffix}`, category: 'Fitness', durationType: 'Months', durationValue: 6, basePrice: 10000, joiningFee: 0, taxPercentage: 18 },
    { name: 'VIP Annual', code: `VIP-12M-${randSuffix}`, category: 'Fitness', durationType: 'Months', durationValue: 12, basePrice: 18000, joiningFee: 0, taxPercentage: 18 }
  ];

  const membershipPlans = [];
  for (const plan of plansData) {
    const dbPlan = await prisma.membershipPlan.create({
      data: {
        organizationId: organization.id,
        name: plan.name,
        code: plan.code,
        category: plan.category,
        status: 'Active',
        durationType: plan.durationType,
        durationValue: plan.durationValue,
        basePrice: plan.basePrice,
        joiningFee: plan.joiningFee,
        taxPercentage: plan.taxPercentage,
        branchAccess: 'all',
        benefits: {
          lockerAccess: true,
          ptAssistance: plan.basePrice >= 10000,
          steamBath: plan.basePrice >= 18000
        }
      }
    });
    membershipPlans.push(dbPlan);
    console.log(`Created Membership Plan: ${plan.name} (Price: ₹${plan.basePrice}, Duration: ${plan.durationValue} ${plan.durationType})`);
  }

  // 7. Add 120 Members under the Organization (60 to Gym 1, 60 to Gym 2)
  console.log('Generating 120 members...');
  const totalMembers = 120;
  const numActiveMemberships = 100;
  const numExpiredMemberships = 10;
  const numNoMemberships = 10;

  let activeCount = 0;
  let expiredCount = 0;
  let noneCount = 0;

  for (let i = 1; i <= totalMembers; i++) {
    // Alternate gym assignment
    const isGym1 = i % 2 !== 0;
    const targetGym = isGym1 ? gym1 : gym2;
    const gymCode = targetGym.code;

    const firstName = getRandomElement(firstNames);
    const lastName = getRandomElement(lastNames);
    const fullName = `${firstName} ${lastName}`;
    
    // Unique phone number generator
    const phoneIndexStr = String(i).padStart(3, '0');
    const phoneNumber = `+9195000${randSuffix}${phoneIndexStr}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${randSuffix}.${phoneIndexStr}@gmail.com`;

    // Gender & DOB
    const gender = getRandomElement(['Male', 'Female', 'Other']);
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - getRandomInt(18, 50));
    dob.setMonth(getRandomInt(0, 11));
    dob.setDate(getRandomInt(1, 28));

    // Determine membership status for this member
    let memberStatus = 'Inactive';
    let assignedPlan = null;
    let startDate = null;
    let endDate = null;
    let amountPaid = 0;

    if (activeCount < numActiveMemberships) {
      memberStatus = 'Active';
      activeCount++;
      
      assignedPlan = getRandomElement(membershipPlans);
      // start date is a random date in the last 15 days
      startDate = new Date();
      startDate.setDate(startDate.getDate() - getRandomInt(1, 15));
      
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + assignedPlan.durationValue);
      amountPaid = assignedPlan.basePrice;
    } else if (expiredCount < numExpiredMemberships) {
      memberStatus = 'Expired';
      expiredCount++;
      
      assignedPlan = getRandomElement(membershipPlans);
      // start date in the past, e.g. 45 days ago, end date 15 days ago
      startDate = new Date();
      startDate.setDate(startDate.getDate() - getRandomInt(35, 60));
      
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + assignedPlan.durationValue);
      amountPaid = assignedPlan.basePrice;
    } else {
      memberStatus = 'Pending'; // without membership
      noneCount++;
    }

    // Build aiInsights JSON properties matching frontend requirements
    const memberIdString = `${gymCode}-${1000 + i}`;
    
    const membershipsListArray = [];
    const invoicesListArray = [];

    if (assignedPlan) {
      const membershipId = `mem-sub-${randSuffix}-${i}`;
      membershipsListArray.push({
        id: membershipId,
        plan: assignedPlan.name,
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        amount: String(amountPaid),
        status: memberStatus
      });

      const taxAmount = Math.round((assignedPlan.basePrice * assignedPlan.taxPercentage) / 100);
      const totalAmount = assignedPlan.basePrice + taxAmount + assignedPlan.joiningFee;

      invoicesListArray.push({
        id: `INV-2026-${10000 + i}`,
        invoiceNumber: `INV-2026-${10000 + i}`,
        amount: String(assignedPlan.basePrice),
        tax: String(taxAmount),
        discount: '0',
        total: String(totalAmount),
        status: memberStatus === 'Active' ? 'Paid' : 'Overdue',
        dueDate: startDate.toISOString().split('T')[0],
        createdAt: startDate.toISOString().split('T')[0],
        branchName: targetGym.name,
        source: 'Membership'
      });
    }

    const aiInsights = {
      memberNumber: memberIdString,
      status: memberStatus,
      onboardingCompleted: true,
      fitnessGoal: getRandomElement(['Weight Loss', 'Muscle Gain', 'General Fitness', 'Athletic Performance', 'Cardio Endurance']),
      bodyDimensions: {
        chest: String(getRandomInt(32, 46)),
        waist: String(getRandomInt(26, 40)),
        hip: String(getRandomInt(30, 44)),
        arm: String(getRandomInt(10, 18)),
        thigh: String(getRandomInt(18, 28))
      },
      staffNotes: [
        {
          id: `note-${randSuffix}-${i}-1`,
          author: 'Arjun Mehta',
          role: 'manager',
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          content: `${fullName} is registered at ${targetGym.name}. Target goals set.`,
          type: 'General'
        }
      ],
      timelineEvents: [
        {
          id: `t-created-${i}`,
          type: 'Member Created',
          timestamp: new Date().toLocaleString(),
          user: 'Priya Sharma'
        }
      ],
      membershipsList: membershipsListArray,
      invoicesList: invoicesListArray,
      assignedTrainerName: memberStatus === 'Active' && i % 4 === 0 ? 'David Kim' : (memberStatus === 'Active' && i % 4 === 1 ? 'Sarah Connor' : null),
      assignedDietitianName: memberStatus === 'Active' && i % 4 === 2 ? 'John Doe' : null,
      email: email
    };

    // Create Member in DB
    const dbMember = await prisma.member.create({
      data: {
        organizationId: organization.id,
        homeGymId: targetGym.id,
        firstName: firstName,
        lastName: lastName,
        phoneNumber: phoneNumber,
        dob: dob,
        gender: gender,
        aiInsights: aiInsights
      }
    });

    // Create DB MemberMembership entry if they have one
    if (assignedPlan) {
      await prisma.memberMembership.create({
        data: {
          memberId: dbMember.id,
          membershipPlanId: assignedPlan.id,
          startDate: startDate,
          endDate: endDate,
          status: memberStatus,
          amountPaid: amountPaid
        }
      });
    }

    if (i % 20 === 0) {
      console.log(`Generated ${i} / 120 members...`);
    }
  }

  console.log('--- Population Summary ---');
  console.log(`Total Members Created: ${totalMembers}`);
  console.log(`Active Memberships: ${activeCount}`);
  console.log(`Expired Memberships: ${expiredCount}`);
  console.log(`Without Memberships: ${noneCount}`);
  console.log(`Organization ID: ${organization.id}`);
  console.log(`Downtown Gym ID: ${gym1.id}`);
  console.log(`Uptown Gym ID: ${gym2.id}`);
  console.log('--- Database Population Completed Successfully ---');
}

main()
  .catch(err => {
    console.error('Population script failed with error:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
