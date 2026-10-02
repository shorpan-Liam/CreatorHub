import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import openapiTS, { astToString } from 'openapi-typescript';
import { writeFile } from 'node:fs/promises';

const frontend = fileURLToPath(new URL('..', import.meta.url));
const root = path.dirname(frontend);
const python = path.join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const result = spawnSync(python, [path.join(root, 'scripts/export_openapi.py')], { cwd: root, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
const ast = await openapiTS(new URL('../openapi.json', import.meta.url));
await writeFile(new URL('../src/client/schema.gen.ts', import.meta.url), astToString(ast));
console.log('TypeScript client contract generated.');
