import path from 'path';

export const paths = {
  root: process.cwd(),
  breachDataset: path.resolve(process.cwd(), 'server', 'data', 'breach_dataset.json'),
};
