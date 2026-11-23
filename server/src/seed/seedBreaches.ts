import 'dotenv/config';
import { connectDatabase } from '../config/db';
import { seedBreachesDataset } from '../services/demoBreachService';
import mongoose from 'mongoose';

async function run() {
  try {
    await connectDatabase();
    console.log('[Seed] Seeding breach dataset (Run 1)...');
    const count1 = await seedBreachesDataset();
    console.log(`[Seed] Run 1 seeded ${count1} records.`);

    console.log('[Seed] Seeding breach dataset (Run 2 - Idempotency test)...');
    const count2 = await seedBreachesDataset();
    console.log(`[Seed] Run 2 seeded ${count2} records.`);

    if (count1 !== 50 || count2 !== 50) {
      console.error(`[Seed] Error: Expected 50 records, got Run 1: ${count1}, Run 2: ${count2}`);
      process.exit(1);
    }

    console.log('[Seed] Breach dataset seed completed successfully and verified idempotent.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Seed] Fatal error seeding breaches:', err);
    process.exit(1);
  }
}

void run();
