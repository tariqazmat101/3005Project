// cli.js
// Simple interactive CLI for Health & Fitness Club Management System
const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();



async function seed() {
    // prevent duplicate seeding
    const exists = await prisma.member.findFirst({
        where: { email: "demo@member.com" }
    });

    if (exists) {
        return; // already seeded, don't do it again
    }

    console.log("Seeding demo data...");

    const user = await prisma.user.create({ data: {} });

    await prisma.member.create({
        data: {
            userId: user.id,
            fullName: "Demo Member",
            dob: new Date("1990-01-01"),
            gender: "M",
            email: "demo@member.com",
            phone: "555-1111"
        }
    });

    console.log("Seed complete.");
}

// ---------- READLINE SETUP ----------

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

async function askInt(question, allowedValues = null) {
    while (true) {
        const ans = await ask(question);
        const num = parseInt(ans, 10);
        if (!Number.isNaN(num)) {
            if (!allowedValues || allowedValues.includes(num)) {
                return num;
            }
        }
        console.log("Please enter a valid number" + (allowedValues ? ` (${allowedValues.join(", ")})` : "") + ".");
    }
}

// ---------- MAIN MENUS ----------

async function mainMenu() {
    while (true) {
        console.log("\n=== Health & Fitness Club Management System ===");
        console.log("1) Member");
        console.log("2) Trainer");
        console.log("3) Administrative Staff");
        console.log("0) Exit");

        const choice = await askInt("> ", [0, 1, 2, 3]);

        if (choice === 0) {
            await shutdown();
            return;
        }

        switch (choice) {
            case 1:
                await memberMenu();
                break;
            case 2:
                await trainerMenu();
                break;
            case 3:
                await adminMenu();
                break;
        }
    }
}

// ---------- MEMBER MENU & FUNCTIONS ----------

async function memberMenu() {
    while (true) {
        console.log("\n=== Member Menu ===");
        console.log("1) Register new member");
        console.log("2) Update profile / goals");
        console.log("3) Add health metric entry");
        console.log("4) View member dashboard");
        console.log("0) Back");

        const choice = await askInt("> ", [0, 1, 2, 3, 4]);

        if (choice === 0) {
            return;
        }

        switch (choice) {
            case 1:
                await memberRegister();
                break;
            case 2:
                await memberUpdateProfileGoals();
                break;
            case 3:
                await memberAddMetric();
                break;
            case 4:
                await memberDashboard();
                break;
        }
    }
}

async function memberRegister() {
    console.log("\n-- Register New Member --");
    const fullName = await ask("Full name: ");
    const dob = await ask("Date of birth (YYYY-MM-DD): ");
    const gender = await ask("Gender: ");
    const email = await ask("Email (must be unique): ");
    const phone = await ask("Phone number: ");

    try {
        // 1. First create the User identity row
        const user = await prisma.user.create({
            data: {}
        });

        // 2. Then create the Member row linked via userId
        const member = await prisma.member.create({
            data: {
                userId: user.id,
                fullName,
                dob: new Date(dob),
                gender,
                email,
                phone
            }
        });

        console.log("\n✓ Member registered successfully!");
        console.log("User ID:   ", user.id);
        console.log("Member ID: ", member.id);
    } catch (error) {
        console.error("\n✗ Error registering member:", error.message);
    }
}

async function memberUpdateProfileGoals() {
    console.log("\n-- Add Fitness Goal --");
    const fullName = await ask("Member full name: ");
    const goalText = await ask("Fitness goal (text): ");

    if (!goalText) {
        console.log("\n✗ Fitness goal cannot be empty.");
        return;
    }

    try {
        const member = await prisma.member.findFirst({
            where: { fullName }
            // uses the same @@index([fullName]) on Member
        });

        if (!member) {
            console.log("\n✗ Member not found");
            return;
        }

        const goal = await prisma.fitnessGoal.create({
            data: {
                memberId: member.id,
                goalText
            }
        });

        console.log("\n✓ Fitness goal recorded:");
        console.log(goal);
    } catch (error) {
        console.error("\n✗ Error adding fitness goal:", error.message);
    }
}



async function memberAddMetric() {
    console.log("\n-- Add Health Metric Entry --");
    const fullName = await ask("Member full name: ");
    const metricType = await ask("Metric type (e.g., weight, heart_rate): ");
    const metricValueStr = await ask("Metric value (numeric, e.g., 72.5): ");

    const metricValue = parseFloat(metricValueStr);
    if (Number.isNaN(metricValue)) {
        console.log("\n✗ Metric value must be a number.");
        return;
    }

    try {
        const member = await prisma.member.findFirst({
            where: { fullName }
            // the @@index on fullName will help this query
        });

        if (!member) {
            console.log("\n✗ Member not found");
            return;
        }

        const metric = await prisma.healthMetric.create({
            data: {
                memberId: member.id,
                metricType,
                value: metricValue
            }
        });

        console.log("\n✓ Health metric recorded:");
        console.log(metric);
    } catch (error) {
        console.error("\n✗ Error adding metric:", error.message);
    }
}

async function trainerMemberLookup() {
    console.log("\n-- Member Lookup (Read-Only) --");

    const member = await selectMemberByName();
    if (!member) return;

    try {
        const rows = await getMemberDashboardRows(member.id);
        printMemberDashboard(member, rows);
    } catch (error) {
        console.error("\n✗ Error loading member dashboard:", error.message);
    }
}


// ---------- TRAINER MENU & STUBS ----------

async function trainerMenu() {
    while (true) {
        console.log("\n=== Trainer Menu ===");
        console.log("1) Set availability slot");
        console.log("2) View my schedule");
        console.log("3) Lookup member (read-only)");
        console.log("0) Back");

        const choice = await askInt("> ", [0, 1, 2, 3]);

        if (choice === 0) return;

        switch (choice) {
            case 1: await trainerSetAvailability(); break;
            case 2: await trainerViewSchedule(); break;
            case 3: await trainerMemberLookup(); break;
        }
    }
}

async function trainerSetAvailability() {
    console.log("\n-- Set Availability Slot --");
    const email = await ask("Trainer email: ");
    const startTime = await ask("Availability start (YYYY-MM-DD HH:MM): ");
    const endTime = await ask("Availability end (YYYY-MM-DD HH:MM): ");

    console.log("[STUB] Would set trainer availability");
}

async function trainerViewSchedule() {
    console.log("\n-- View Trainer Schedule --");
    const email = await ask("Trainer email: ");

    console.log("[STUB] Would show trainer schedule");
}


// ---------- ADMIN MENU & STUBS ----------

async function adminMenu() {
    while (true) {
        console.log("\n=== Admin Menu ===");
        console.log("1) Create & schedule group class");
        console.log("2) Assign room / room booking");
        console.log("3) Log equipment issue");
        console.log("4) View equipment issues");
        console.log("5) Generate bill / record payment");
        console.log("0) Back");

        const choice = await askInt("> ", [0, 1, 2, 3, 4, 5]);

        if (choice === 0) return;

        switch (choice) {
            case 1: await adminCreateClass(); break;
            case 2: await adminRoomBooking(); break;
            case 3: await adminLogEquipmentIssue(); break;
            case 4: await adminViewEquipmentIssues(); break;
            case 5: await adminBillingPayment(); break;
        }
    }
}

async function selectMemberByName() {
    const searchName = await ask("Search member by name (or part of it): ");

    const members = await prisma.member.findMany({
        where: {
            fullName: {
                contains: searchName,
                mode: "insensitive"
            }
        },
        orderBy: { fullName: "asc" }
    });

    if (!members.length) {
        console.log("\n✗ No members found with that name.");
        return null;
    }

    // If exactly one match, auto-select it
    if (members.length === 1) {
        const m = members[0];
        console.log(`\nFound member: ${m.fullName} — ${m.email ?? "no email"}`);
        return m;
    }

    // Otherwise, let the user choose by index
    console.log("\nMatching Members:");
    members.forEach((m, i) => {
        console.log(`${i}) ${m.fullName} — ${m.email ?? "no email"}`);
    });

    const allowedIndexes = members.map((_, i) => i);
    const index = await askInt("Select member by index: ", allowedIndexes);

    return members[index];
}

async function getMemberDashboardRows(memberId) {
    const rows = await prisma.$queryRaw`
        SELECT *
        FROM member_dashboard_view
        WHERE "memberId" = ${memberId}
        ORDER BY "metricRecordedAt" DESC NULLS LAST,
                 "goalCreatedAt" DESC NULLS LAST
    `;
    return rows;
}

async function memberDashboard() {
    console.log("\n-- Member Dashboard --");

    // 1) Pick member by name + index
    const member = await selectMemberByName();
    if (!member) {
        return;
    }

    try {
        // 2) Load rows from the raw SQL VIEW
        const rows = await getMemberDashboardRows(member.id);

        // 3) Render dashboard
        printMemberDashboard(member, rows);
    } catch (error) {
        console.error("\n✗ Error loading dashboard:", error.message);
    }
}


function printMemberDashboard(member, rows) {
    const latestHealthStats = {};
    const goals = [];

    for (const row of rows) {
        // row.metricType etc come from the VIEW columns
        if (row.metricType && !latestHealthStats[row.metricType]) {
            latestHealthStats[row.metricType] = {
                value: row.metricValue,
                recordedAt: row.metricRecordedAt
            };
        }

        if (row.goalText) {
            goals.push({
                goalText: row.goalText,
                createdAt: row.goalCreatedAt
            });
        }
    }

    console.log("\n=== MEMBER DASHBOARD (from SQL VIEW) ===");
    console.log(`Name:  ${member.fullName}`);
    console.log(`Email: ${member.email}`);
    console.log(`Phone: ${member.phone}`);

    console.log("\nLatest Health Stats:");
    if (!Object.keys(latestHealthStats).length) {
        console.log("  (none)");
    } else {
        for (const [type, stat] of Object.entries(latestHealthStats)) {
            const dateStr = stat.recordedAt
                ? stat.recordedAt.toLocaleDateString()
                : "unknown date";
            console.log(`  - ${type}: ${stat.value} (${dateStr})`);
        }
    }

    console.log("\nFitness Goals:");
    if (!goals.length) {
        console.log("  (none)");
    } else {
        goals.forEach((g, i) => {
            const dateStr = g.createdAt
                ? g.createdAt.toLocaleDateString()
                : "unknown date";
            console.log(`  ${i + 1}) ${g.goalText} [${dateStr}]`);
        });
    }

    // Stubs you can later wire to more views/tables
    console.log("\nPast Class Count: (stub) 0");
    console.log("Upcoming Sessions: (stub) none");
}


async function adminCreateClass() {
    console.log("\n-- Create & Schedule Group Class --");
    console.log("[STUB] Would create group class");
}



async function adminRoomBooking() {
    console.log("\n-- Room Booking --");
    console.log("[STUB] Would book room");
}

async function adminLogEquipmentIssue() {
    console.log("\n-- Log Equipment Issue --");
    console.log("[STUB] Would log equipment issue");
}

async function adminViewEquipmentIssues() {
    console.log("\n-- View Equipment Issues --");
    console.log("[STUB] Would view equipment issues");
}

async function adminBillingPayment() {
    console.log("\n-- Billing & Payment --");
    console.log("[STUB] Would handle billing/payment");
}

// ---------- SHUTDOWN ----------

async function shutdown() {
    console.log("\nExiting...");
    rl.close();
    await prisma.$disconnect();
    process.exit(0);
}

// ---------- START APP ----------

(async () => {
    await seed();
    await mainMenu();
})();