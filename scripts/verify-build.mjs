import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const outputDirectory = mkdtempSync(join(tmpdir(), 'una-voce-build-'))

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

try {
  run('./node_modules/.bin/tsc', ['-b', '--pretty', 'false'])
  run('./node_modules/.bin/vite', ['build', '--outDir', outputDirectory])
} finally {
  rmSync(outputDirectory, { recursive: true, force: true })
}
