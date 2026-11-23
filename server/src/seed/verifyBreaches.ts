import 'dotenv/config';
import { connectDatabase } from '../config/db';
import { seedBreachesDataset, lookupEmailBreach, getDatasetInfo } from '../services/demoBreachService';
import mongoose from 'mongoose';

async function verify() {
  try {
    await connectDatabase();
    console.log('[Verify] Connected to DB for verification.');

    // 1. Idempotency test (seed twice, confirm count is 50)
    console.log('[Verify] Running seed run 1...');
    const count1 = await seedBreachesDataset();
    console.log(`[Verify] Seed run 1 count: ${count1}`);

    console.log('[Verify] Running seed run 2 (idempotency)...');
    const count2 = await seedBreachesDataset();
    console.log(`[Verify] Seed run 2 count: ${count2}`);

    if (count1 !== 50 || count2 !== 50) {
      throw new Error(`Seed count mismatch: Expected 50, got Run 1: ${count1}, Run 2: ${count2}`);
    }

    // 2. Dataset info test
    const info = getDatasetInfo();
    console.log('[Verify] Dataset Info:', JSON.stringify(info, null, 2));
    if (info.record_count !== 50) {
      throw new Error(`Dataset info record_count mismatch: ${info.record_count}`);
    }

    // 3. Email in the file test
    const testEmailIn = '  ANANYA.KUMAR84@FAKEMAIL.EXAMPLE  '; // uppercase & padded
    const resIn = await lookupEmailBreach(testEmailIn);
    console.log('[Verify] Lookup Email In Result:', JSON.stringify(resIn, null, 2));
    if (!resIn.found || !resIn.record) {
      throw new Error('Failed to find email in file with padded/uppercase input.');
    }
    // Check privacy rules: no plaintext password or security answer
    const resString = JSON.stringify(resIn);
    if (resString.includes('password_plaintext') || resString.includes('security_answer') || resString.includes('qwerty123') || resString.includes('Bruno')) {
      throw new Error('Privacy violation: Response contains plaintext password or security answer!');
    }

    // 4. Email not in the file test
    const testEmailOut = 'safe.user999@example.com';
    const resOut = await lookupEmailBreach(testEmailOut);
    console.log('[Verify] Lookup Email Out Result:', JSON.stringify(resOut, null, 2));
    if (resOut.found || !resOut.message?.includes('No record in the demo dataset')) {
      throw new Error('Failed expected negative lookup response.');
    }

    // 5. Invalid email test
    const testEmailInvalid = 'not-an-email';
    const resInvalid = await lookupEmailBreach(testEmailInvalid);
    console.log('[Verify] Lookup Email Invalid Result:', JSON.stringify(resInvalid, null, 2));
    if (resInvalid.found) {
      throw new Error('Invalid email should not be found.');
    }

    console.log('[Verify] ALL BREACH INTEGRATION TESTS PASSED SUCCESSFULLY!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Verify] Verification failed:', err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

void verify();
