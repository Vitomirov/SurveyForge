#!/usr/bin/env node
/**
 * Registry parity check — run before/after refactors that touch question types.
 *
 * Ensures every entry in QUESTION_TYPES is handled by:
 *   - builder: editorLoaders.js  (choice types via loadChoiceEditor + isChoiceType)
 *   - taker:   questionLoaders.js
 *
 * Usage: npm run check:registries
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { QUESTION_TYPES, QUESTION_TYPE_KEYS, isChoiceType, TYPE_COLORS, TYPE_ICONS } from '../src/utils/questionHelpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const BUILDER_LOADERS = join(ROOT, 'src/components/builder/editors/editorLoaders.js')
const TAKER_LOADERS   = join(ROOT, 'src/components/taker/questions/questionLoaders.js')

function extractLoaderKeys(source) {
  const keys = new Set()
  const re = /^\s+([a-z_]+):\s*\(\)\s*=>\s*import/gm
  let match
  while ((match = re.exec(source)) !== null) {
    keys.add(match[1])
  }
  return keys
}

function getBuilderTypes(source) {
  const types = new Set(extractLoaderKeys(source))
  for (const { type } of QUESTION_TYPES) {
    if (isChoiceType(type)) types.add(type)
  }
  return types
}

function diff(label, expected, actual) {
  const missing = [...expected].filter(t => !actual.has(t)).sort()
  const extra   = [...actual].filter(t => !expected.has(t)).sort()
  if (missing.length === 0 && extra.length === 0) return true

  console.error(`\n✗ ${label}`)
  if (missing.length) {
    console.error(`  Missing (${missing.length}): ${missing.join(', ')}`)
  }
  if (extra.length) {
    console.error(`  Extra (${extra.length}):   ${extra.join(', ')}`)
  }
  return false
}

const canonical = new Set(QUESTION_TYPE_KEYS)

const iconKeys = new Set(Object.keys(TYPE_ICONS))
const colorKeys = new Set(Object.keys(TYPE_COLORS))

const builderSource = readFileSync(BUILDER_LOADERS, 'utf8')
const takerSource   = readFileSync(TAKER_LOADERS, 'utf8')

const builderTypes = getBuilderTypes(builderSource)
const takerTypes   = extractLoaderKeys(takerSource)

console.log('Question type registry parity check')
console.log('─'.repeat(40))
console.log(`Canonical types (QUESTION_TYPES): ${canonical.size}`)
console.log(`Builder registry:                 ${builderTypes.size}`)
console.log(`Taker registry:                   ${takerTypes.size}`)

let ok = true
ok = diff('Builder vs QUESTION_TYPES', canonical, builderTypes) && ok
ok = diff('Taker vs QUESTION_TYPES', canonical, takerTypes) && ok
ok = diff('Builder vs Taker (must match)', builderTypes, takerTypes) && ok
ok = diff('TYPE_ICONS vs QUESTION_TYPES', canonical, iconKeys) && ok
ok = diff('TYPE_COLORS vs QUESTION_TYPES', canonical, colorKeys) && ok

if (ok) {
  console.log('\n✓ All registries are in sync.\n')
  process.exit(0)
}

console.error('\nRegistry mismatch — update editorLoaders.js, questionLoaders.js, and/or QUESTION_TYPES together.\n')
process.exit(1)
