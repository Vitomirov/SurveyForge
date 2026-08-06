import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import fs from 'fs'

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src')

function resolveAlias(specifier) {
  if (!specifier.startsWith('@/')) return null
  const rel = specifier.slice(2)
  const base = path.join(srcRoot, rel)
  if (fs.existsSync(base + '.js')) return pathToFileURL(base + '.js').href
  if (fs.existsSync(base + '/index.js')) return pathToFileURL(base + '/index.js').href
  return pathToFileURL(base).href
}

export async function resolve(specifier, context, nextResolve) {
  const aliased = resolveAlias(specifier)
  if (aliased) return nextResolve(aliased, context)
  return nextResolve(specifier, context)
}
