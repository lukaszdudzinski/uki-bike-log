import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const packagePath = path.resolve(process.cwd(), 'package.json');

// Get current date
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');

const prefix = `${year}.${month}.${day}`;

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const currentVersion = packageJson.version;

let newVersion;
if (currentVersion.startsWith(prefix)) {
  const parts = currentVersion.split('.');
  const rev = parseInt(parts[3] || '0', 10);
  newVersion = `${prefix}.${String(rev + 1).padStart(2, '0')}`;
} else {
  newVersion = `${prefix}.01`;
}

packageJson.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`Version bumped to ${newVersion}`);
