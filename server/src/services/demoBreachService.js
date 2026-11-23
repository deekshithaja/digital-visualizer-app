import crypto from 'crypto';
import fs from 'fs';
import { z } from 'zod';
import { BREACH_DATASET_PATH } from '../config/paths.js';
import {
  DemoBreachRecordModel,
  MongooseDemoBreachRecord,
} from '../models/DemoBreachRecord.ts';
import { BreachResultModel, MongooseBreachResult } from '../models/BreachResult.ts';

const breachUserSchema = z.object({
  id: z.string().min(1),
  full_name: z.string().min(1),
  email: z.string().trim().email(),
  username: z.string().min(1),
  password_plaintext_DEMO_ONLY: z.string(),
  password_hash_md5: z.string().min(1),
  password_hash_sha256: z.string().min(1),
  phone: z.string().min(1),
  ip_address_at_breach: z.string().min(1),
  breach_source: z.string().min(1),
  breach_date: z.string().min(1),
  security_question: z.string().min(1),
  security_answer_DEMO_ONLY: z.string(),
  account_status: z.enum(['active', 'deactivated', 'password_reset_required']),
});

const breachDatasetSchema = z
  .object({
    dataset_name: z.string().min(1),
    disclaimer: z.string().min(1),
    generated_at: z.string().min(1),
    record_count: z.number().int().nonnegative(),
    users: z.array(breachUserSchema),
  })
  .refine((data) => data.record_count === data.users.length, {
    message: 'Invalid breach dataset: record_count does not match users.length.',
    path: ['record_count'],
  });

/**
 * Documented Severity Derivation Rule:
 * - high:   Password hash + Phone + Security question are all exposed
 * - medium: Password hash is exposed, OR (Phone + Security question) are exposed
 * - low:    Only Email / Username / IP address metadata are exposed
 */
export function deriveSeverity(exposedDataClasses) {
  const hasPasswordHash = exposedDataClasses.includes('Password hash');
  const hasPhone = exposedDataClasses.includes('Phone');
  const hasSecurityQuestion = exposedDataClasses.includes('Security question');

  if (hasPasswordHash && hasPhone && hasSecurityQuestion) {
    return 'high';
  }
  if (hasPasswordHash || (hasPhone && hasSecurityQuestion)) {
    return 'medium';
  }
  return 'low';
}

export function deriveExposedDataClasses(rawRecord) {
  const classes = [];
  if (rawRecord.email) classes.push('Email');
  if (rawRecord.username) classes.push('Username');
  if (rawRecord.password_hash_md5 || rawRecord.password_hash_sha256) {
    classes.push('Password hash');
  }
  if (rawRecord.phone) classes.push('Phone');
  if (rawRecord.ip_address_at_breach) classes.push('IP address');
  if (rawRecord.security_question) classes.push('Security question');
  return classes;
}

export function maskEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  const atIndex = normalized.indexOf('@');
  if (atIndex <= 0) return '***';
  const local = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);
  return `${local[0]}***@${domain}`;
}

export function maskPhone(phone) {
  const raw = String(phone || '').trim();
  if (!raw) return '***';
  // Preserve country prefix (+91-) and last 3 digits; mask remaining digits with X
  const match = raw.match(/^(\+\d{1,3}-)(.+)$/);
  const prefix = match ? match[1] : '';
  const body = match ? match[2] : raw;

  let digitTotal = 0;
  for (const ch of body) {
    if (/\d/.test(ch)) digitTotal++;
  }
  if (digitTotal <= 3) return `${prefix}${'X'.repeat(body.length)}`;

  let digitsSeen = 0;
  const keepFrom = digitTotal - 3;
  let maskedBody = '';
  for (const ch of body) {
    if (/\d/.test(ch)) {
      maskedBody += digitsSeen < keepFrom ? 'X' : ch;
      digitsSeen++;
    } else {
      maskedBody += ch;
    }
  }
  return `${prefix}${maskedBody}`;
}

export function maskUsername(username) {
  const raw = String(username || '').trim();
  if (raw.length <= 2) return `${raw[0] || '*'}***`;
  if (raw.length <= 4) return `${raw[0]}***${raw[raw.length - 1]}`;
  return `${raw.slice(0, 2)}***${raw.slice(-2)}`;
}

export function maskIp(ip) {
  const parts = String(ip || '').trim().split('.');
  if (parts.length === 4) {
    return `${parts[0]}.xxx.xxx.${parts[3]}`;
  }
  return 'xxx.xxx.xxx';
}

function hashNormalizedEmail(normalizedEmail) {
  return crypto.createHash('sha256').update(normalizedEmail).digest('hex');
}

function stripAndSanitizeRecord(rawUser, meta) {
  // Explicitly omit password_plaintext_DEMO_ONLY and security_answer_DEMO_ONLY;
  // they are never stored in MongoDB or returned to callers.
  const normalizedEmail = rawUser.email.trim().toLowerCase();
  const exposedDataClasses = deriveExposedDataClasses(rawUser);
  const severity = deriveSeverity(exposedDataClasses);

  return {
    id: rawUser.id,
    email: normalizedEmail,
    masked_email: maskEmail(normalizedEmail),
    masked_username: maskUsername(rawUser.username),
    masked_phone: maskPhone(rawUser.phone),
    masked_ip: maskIp(rawUser.ip_address_at_breach),
    breach_source: rawUser.breach_source,
    breach_date: rawUser.breach_date,
    account_status: rawUser.account_status,
    exposed_data_classes: exposedDataClasses,
    severity,
    dataset_name: meta.dataset_name,
    disclaimer: meta.disclaimer,
    generated_at: meta.generated_at,
  };
}

let cachedDatasetMeta = null;

export function loadValidatedBreachDataset() {
  if (!fs.existsSync(BREACH_DATASET_PATH)) {
    throw new Error(
      `Startup Error: Required breach dataset file is missing at "${BREACH_DATASET_PATH}".`
    );
  }

  let parsedJson;
  try {
    const rawText = fs.readFileSync(BREACH_DATASET_PATH, 'utf8');
    parsedJson = JSON.parse(rawText);
  } catch (err) {
    throw new Error(
      `Startup Error: Failed to parse breach dataset JSON at "${BREACH_DATASET_PATH}": ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  const validation = breachDatasetSchema.safeParse(parsedJson);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0];
    throw new Error(
      `Startup Error: Invalid breach dataset schema (${firstIssue?.path?.join('.') || 'root'}: ${
        firstIssue?.message || 'validation failed'
      }).`
    );
  }

  const data = validation.data;
  const meta = {
    dataset_name: data.dataset_name,
    disclaimer: data.disclaimer,
    generated_at: data.generated_at,
    record_count: data.record_count,
    breach_sources: Array.from(new Set(data.users.map((u) => u.breach_source))).sort(),
  };

  cachedDatasetMeta = meta;
  const sanitizedRecords = data.users.map((u) => stripAndSanitizeRecord(u, meta));

  return { meta, records: sanitizedRecords };
}

export function validateBreachDatasetOnStartup() {
  const { meta } = loadValidatedBreachDataset();
  return meta;
}

export async function seedDemoBreachRecords() {
  const { meta, records } = loadValidatedBreachDataset();

  const ops = records.map((rec) => ({
    updateOne: {
      filter: { id: rec.id },
      update: { $set: rec },
      upsert: true,
    },
  }));

  const bulkResult = await MongooseDemoBreachRecord.bulkWrite(ops, { ordered: false });
  const totalCount = await DemoBreachRecordModel.countDocuments();

  return {
    dataset_name: meta.dataset_name,
    record_count: meta.record_count,
    upserted: bulkResult.upsertedCount ?? 0,
    modified: bulkResult.modifiedCount ?? 0,
    matched: bulkResult.matchedCount ?? 0,
    totalCount,
  };
}

export async function getDatasetInfo() {
  const meta = cachedDatasetMeta || validateBreachDatasetOnStartup();
  const seededCount = await DemoBreachRecordModel.countDocuments();
  return {
    provenance: 'simulated',
    badge: 'SIMULATED DEMO DATA',
    dataset_name: meta.dataset_name,
    disclaimer: meta.disclaimer,
    record_count: meta.record_count,
    seeded_record_count: seededCount,
    generated_at: meta.generated_at,
    breach_sources: meta.breach_sources,
  };
}

export async function checkEmailBreach(userId, rawEmail) {
  const normalizedEmail = String(rawEmail || '').trim().toLowerCase();
  const meta = cachedDatasetMeta || validateBreachDatasetOnStartup();
  const emailHash = hashNormalizedEmail(normalizedEmail);
  const maskedInputEmail = maskEmail(normalizedEmail);
  const checkedAt = new Date().toISOString();

  // Single source of truth: query ONLY demo_breach_records in MongoDB
  const match = await DemoBreachRecordModel.findOne({ email: normalizedEmail });

  const resultPayload = match
    ? {
        found: true,
        provenance: 'simulated',
        badge: 'SIMULATED DEMO DATA',
        dataset: match.dataset_name,
        disclaimer: match.disclaimer,
        breach_source: match.breach_source,
        breach_date: match.breach_date,
        account_status: match.account_status,
        exposed_data_classes: match.exposed_data_classes,
        severity: match.severity,
        masked_fields: {
          email: match.masked_email,
          username: match.masked_username,
          phone: match.masked_phone,
          ip_address: match.masked_ip,
        },
        message: 'Simulated demo breach record matched.',
        checkedAt,
      }
    : {
        found: false,
        provenance: 'simulated',
        badge: 'SIMULATED DEMO DATA',
        dataset: meta.dataset_name,
        disclaimer: meta.disclaimer,
        breach_source: null,
        breach_date: null,
        account_status: null,
        exposed_data_classes: [],
        severity: 'none',
        masked_fields: {
          email: maskedInputEmail,
        },
        message: 'No record in the demo dataset. This does not mean the email is safe.',
        checkedAt,
      };

  // Mirror result into the "breaches" collection with provenance "simulated" preserved
  const mirrored = await MongooseBreachResult.findOneAndUpdate(
    { userId, emailHash },
    {
      $set: {
        userId,
        emailHash,
        found: resultPayload.found,
        recordId: match ? match.id : null,
        breach_source: resultPayload.breach_source,
        breach_date: resultPayload.breach_date,
        account_status: resultPayload.account_status,
        exposed_data_classes: resultPayload.exposed_data_classes,
        severity: resultPayload.severity,
        masked_fields: resultPayload.masked_fields,
        message: resultPayload.message,
        provenance: 'simulated',
        badge: 'SIMULATED DEMO DATA',
        dataset: resultPayload.dataset,
        disclaimer: resultPayload.disclaimer,
        checkedAt,
      },
    },
    { upsert: true, returnDocument: 'after' }
  ).lean();

  return {
    _id: mirrored ? String(mirrored._id) : undefined,
    ...resultPayload,
  };
}

export async function listUserBreachChecks(userId) {
  const rows = await BreachResultModel.find({ userId }, { sort: { checkedAt: -1 } });
  const meta = cachedDatasetMeta || validateBreachDatasetOnStartup();
  return {
    provenance: 'simulated',
    badge: 'SIMULATED DEMO DATA',
    dataset: meta.dataset_name,
    disclaimer: meta.disclaimer,
    breaches: rows,
  };
}
