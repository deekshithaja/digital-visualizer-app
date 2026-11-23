import fs from 'fs';
import mongoose from 'mongoose';
import { z } from 'zod';
import { paths } from '../config/paths';
import { DemoBreachRecordModel, DemoBreachRecordDoc } from '../models/DemoBreachRecord';
import { BreachModel } from '../models/Breach';

const rawDatasetSchema = z.object({
  dataset_name: z.string(),
  disclaimer: z.string(),
  generated_at: z.string(),
  record_count: z.number(),
  users: z.array(
    z.object({
      id: z.string(),
      full_name: z.string(),
      email: z.string(),
      username: z.string(),
      password_plaintext_DEMO_ONLY: z.string().optional(),
      password_hash_md5: z.string(),
      password_hash_sha256: z.string(),
      phone: z.string(),
      ip_address_at_breach: z.string(),
      breach_source: z.string(),
      breach_date: z.string(),
      security_question: z.string(),
      security_answer_DEMO_ONLY: z.string().optional(),
      account_status: z.string(),
    })
  ),
});

export interface DatasetInfo {
  dataset_name: string;
  disclaimer: string;
  generated_at: string;
  record_count: number;
  breach_sources: string[];
}

export interface BreachLookupResult {
  found: boolean;
  provenance: 'simulated';
  dataset: string;
  disclaimer: string;
  message?: string;
  record?: {
    breach_source: string;
    breach_date: string;
    account_status: string;
    masked_email: string;
    masked_phone: string;
    masked_username: string;
    exposed_data_classes: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
}

let cachedDataset: z.infer<typeof rawDatasetSchema> | null = null;

function loadAndValidateDataset() {
  if (cachedDataset) return cachedDataset;

  if (!fs.existsSync(paths.breachDataset)) {
    throw new Error(`[BreachService] Fatal startup error: breach dataset file missing at ${paths.breachDataset}`);
  }

  try {
    const fileContent = fs.readFileSync(paths.breachDataset, 'utf8');
    const parsedJson = JSON.parse(fileContent);
    const result = rawDatasetSchema.safeParse(parsedJson);

    if (!result.success) {
      throw new Error(`[BreachService] Fatal startup error: invalid breach dataset structure: ${result.error.message}`);
    }

    const data = result.data;
    if (data.record_count !== data.users.length) {
      throw new Error(
        `[BreachService] Fatal startup error: record_count (${data.record_count}) does not match users.length (${data.users.length})`
      );
    }

    cachedDataset = data;
    return data;
  } catch (err) {
    if (err instanceof Error && err.message.includes('Fatal startup error')) {
      throw err;
    }
    throw new Error(`[BreachService] Fatal startup error parsing breach dataset: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function validateBreachDatasetOnStartup() {
  return loadAndValidateDataset();
}

export function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '***@***';
  const [local, domain] = parts;
  const maskedLocal = local.length > 2 ? local[0] + '***' + local[local.length - 1] : '***';
  return `${maskedLocal}@${domain}`;
}

export function maskPhone(phone: string): string {
  // e.g. +91-81982-86387 -> +91-XXXXX-XX387
  const cleaned = phone.replace(/\s+/g, '');
  if (cleaned.length < 8) return 'XXXXX';
  const prefix = cleaned.slice(0, 4); // +91-
  const suffix = cleaned.slice(-5); // XX387
  return `${prefix}XXXXX-${suffix}`;
}

export function maskUsername(username: string): string {
  if (username.length <= 2) return '***';
  return username[0] + '***' + username[username.length - 1];
}

export function deriveExposedDataClasses(user: any): string[] {
  const classes: string[] = ['Email', 'Username'];
  if (user.password_hash_md5 || user.password_hash_sha256) classes.push('Password hash');
  if (user.phone) classes.push('Phone');
  if (user.ip_address_at_breach) classes.push('IP address');
  if (user.security_question) classes.push('Security question');
  return classes;
}

export function deriveSeverity(exposedClasses: string[]): 'low' | 'medium' | 'high' | 'critical' {
  if (exposedClasses.includes('Password hash') && exposedClasses.includes('Phone') && exposedClasses.includes('Security question')) {
    return 'high';
  }
  if (exposedClasses.length >= 5) return 'high';
  if (exposedClasses.length >= 3) return 'medium';
  return 'low';
}

export async function seedBreachesDataset(): Promise<number> {
  const dataset = loadAndValidateDataset();
  let count = 0;

  for (const user of dataset.users) {
    // Strip plaintext demo only fields
    const { password_plaintext_DEMO_ONLY: _p, security_answer_DEMO_ONLY: _s, ...rest } = user;
    
    await mongoose.model('DemoBreachRecord').updateOne(
      { id: rest.id },
      { $set: rest },
      { upsert: true }
    );
    count++;
  }

  console.log(`[BreachService] Successfully seeded ${count} demo breach records.`);
  return count;
}

export const seedDemoBreachRecords = seedBreachesDataset;

export function getDatasetInfo(): DatasetInfo {
  const dataset = loadAndValidateDataset();
  const sources = Array.from(new Set(dataset.users.map((u) => u.breach_source)));

  return {
    dataset_name: dataset.dataset_name,
    disclaimer: dataset.disclaimer,
    generated_at: dataset.generated_at,
    record_count: dataset.record_count,
    breach_sources: sources,
  };
}

export async function lookupEmailBreach(emailInput: string, userId?: string): Promise<BreachLookupResult> {
  const dataset = loadAndValidateDataset();
  const normalizedEmail = emailInput?.trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return {
      found: false,
      provenance: 'simulated',
      dataset: dataset.dataset_name,
      disclaimer: dataset.disclaimer,
      message: 'Invalid email format provided.',
    };
  }

  const record = await DemoBreachRecordModel.findOne({ email: normalizedEmail });

  if (!record) {
    return {
      found: false,
      provenance: 'simulated',
      dataset: dataset.dataset_name,
      disclaimer: dataset.disclaimer,
      message: 'No record in the demo dataset. This does not mean the email is safe.',
    };
  }

  const exposedClasses = deriveExposedDataClasses(record);
  const severity = deriveSeverity(exposedClasses);

  const resultRecord = {
    breach_source: record.breach_source,
    breach_date: record.breach_date,
    account_status: record.account_status,
    masked_email: maskEmail(record.email),
    masked_phone: maskPhone(record.phone),
    masked_username: maskUsername(record.username),
    exposed_data_classes: exposedClasses,
    severity,
  };

  if (userId) {
    // Mirror into breaches collection if not already present for this user/email/source
    const existingMirror = await BreachModel.findOne({
      userId,
      email: normalizedEmail,
      breach_source: record.breach_source,
    });

    if (!existingMirror) {
      await BreachModel.create({
        userId,
        email: normalizedEmail,
        breach_source: record.breach_source,
        breach_date: record.breach_date,
        account_status: record.account_status,
        exposed_data_classes: exposedClasses,
        severity,
        provenance: 'simulated',
        dataset: dataset.dataset_name,
        disclaimer: dataset.disclaimer,
      });
    }
  }

  return {
    found: true,
    provenance: 'simulated',
    dataset: dataset.dataset_name,
    disclaimer: dataset.disclaimer,
    record: resultRecord,
  };
}
