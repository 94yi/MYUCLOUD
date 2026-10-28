import { execFileSync } from 'node:child_process'
import { cpSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))
execFileSync(process.execPath, [vite, 'build', '--mode', 'snoval'], { cwd: root, stdio: 'inherit' })
const geportVite = fileURLToPath(new URL('../geport/node_modules/vite/bin/vite.js', import.meta.url))
execFileSync(process.execPath, [geportVite, 'build', '--base=/geport/'], { cwd: new URL('../geport/', import.meta.url), stdio: 'inherit' })
cpSync(new URL('../geport/dist/', import.meta.url), new URL('../dist/geport/', import.meta.url), { recursive: true })
