import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
export const BREACH_DATASET_PATH = path.resolve(PROJECT_ROOT, 'server', 'data', 'breach_dataset.json');
