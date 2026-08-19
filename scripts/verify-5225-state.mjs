import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const statePath = new URL('../REPO_5225_STATE.md', import.meta.url)
const state = readFileSync(statePath, 'utf8')

function field(name) {
  const match = state.match(new RegExp(`^- ${name}: (.+)$`, 'm'))
  if (!match) throw new Error(`Missing state field: ${name}`)
  return match[1].trim()
}

const claimedCommit = field('Last verified commit').replaceAll('`', '')
const verifiedDate = field('Last verified').replaceAll('`', '')
const completedSprint = field('Last completed sprint')
const qa = field('QA')

if (!/^[0-9a-f]{40}$/.test(claimedCommit)) throw new Error('Last verified commit must be a full Git SHA')
if (!/^\d{4}-\d{2}-\d{2}$/.test(verifiedDate)) throw new Error('Last verified must be an ISO date')
if (/pending/i.test(completedSprint)) throw new Error('Last completed sprint is still pending')
if (!/^PASS\b/.test(qa)) throw new Error('QA must start with PASS')

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const head = git('rev-parse', 'HEAD')

if (claimedCommit !== head) {
  const parent = git('rev-parse', 'HEAD^')
  const changed = git('diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD')
    .split('\n')
    .filter(Boolean)

  if (claimedCommit !== parent || changed.length !== 1 || changed[0] !== 'REPO_5225_STATE.md') {
    throw new Error(`State commit ${claimedCommit} does not match HEAD or an allowed state-only parent checkpoint`)
  }
}

console.log(`5225 state verified for ${claimedCommit}`)
