import { config } from 'dotenv';
import { resolve } from 'node:path';

let loaded = false;

export function loadApiEnvironment() {
  if (loaded) return;

  for (const path of [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
  ]) {
    config({ path, quiet: true });
  }

  loaded = true;
}
