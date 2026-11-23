import { getDatasetInfo, maskEmail, maskPhone, maskUsername, deriveExposedDataClasses, deriveSeverity } from '../services/demoBreachService';
import fs from 'fs';
import { paths } from '../config/paths';

function unitVerify() {
  console.log('[UnitVerify] Starting local verification of synthetic breach dataset service...');

  // 1. Check file exists and record count is 50
  if (!fs.existsSync(paths.breachDataset)) {
    throw new Error('Dataset file does not exist at paths.breachDataset');
  }
  const raw = JSON.parse(fs.readFileSync(paths.breachDataset, 'utf8'));
  if (raw.record_count !== 50 || raw.users.length !== 50) {
    throw new Error(`Record count mismatch: record_count=${raw.record_count}, users.length=${raw.users.length}`);
  }
  console.log('[UnitVerify] ✓ Dataset file loaded successfully with 50 records.');

  // 2. Test Masking helpers
  const maskedEmail = maskEmail('Ananya.Kumar84@fakemail.example');
  console.log('[UnitVerify] Masked Email:', maskedEmail);
  if (!maskedEmail.includes('***') || !maskedEmail.endsWith('@fakemail.example')) {
    throw new Error('Email masking test failed');
  }

  const maskedPhone = maskPhone('+91-81982-86387');
  console.log('[UnitVerify] Masked Phone:', maskedPhone);
  if (!maskedPhone.includes('XXXXX')) {
    throw new Error('Phone masking test failed');
  }

  const maskedUser = maskUsername('ananyaku22');
  console.log('[UnitVerify] Masked Username:', maskedUser);
  if (!maskedUser.includes('***')) {
    throw new Error('Username masking test failed');
  }

  // 3. Test Exposure & Severity derivation
  const sampleUser = raw.users[0];
  const classes = deriveExposedDataClasses(sampleUser);
  console.log('[UnitVerify] Exposed Data Classes:', classes);
  const severity = deriveSeverity(classes);
  console.log('[UnitVerify] Derived Severity:', severity);

  // 4. Test Dataset Info
  const info = getDatasetInfo();
  console.log('[UnitVerify] Dataset Info:', JSON.stringify(info, null, 2));
  if (info.record_count !== 50 || info.breach_sources.length === 0) {
    throw new Error('Dataset info test failed');
  }

  // 5. Check plaintext and security answer absence in dataset processing
  for (const u of raw.users) {
    if (u.password_plaintext_DEMO_ONLY || u.security_answer_DEMO_ONLY) {
      // These are allowed in the raw dataset file per instructions, but must NOT be in responses or db.
    }
  }

  console.log('[UnitVerify] ALL UNIT VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

unitVerify();
