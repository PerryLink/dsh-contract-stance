#!/usr/bin/env node
/**
 * Fetch and validate the public CUAD v1 archive used by this benchmark.
 *
 * Source: The Atticus Project, CUAD (Contract Understanding Atticus Dataset)
 *         https://github.com/The-Atticus-Project/cuad
 * Data:   data.zip -> CUADv1.json (510 contracts, 41 expert clause categories)
 * License: CC BY 4.0 (the dataset); this repository's code is Apache-2.0.
 *
 * The archive is public and large (~18 MB), so it is never committed. The
 * download resumes from a partial file with `curl -L -C -`; a partial ZIP is
 * not accepted, because Python's zipfile needs the central directory. After a
 * clean ZIP check, CUADv1.json is extracted into .data/.
 *
 * Usage:
 *   node bench/public-cuad/fetch.mjs                  # download/resume + extract
 *   node bench/public-cuad/fetch.mjs --force          # re-download
 *   node bench/public-cuad/fetch.mjs --zip <data.zip> # use an existing archive
 *   node bench/public-cuad/fetch.mjs --json <CUADv1.json> # use an extracted file
 *
 * No token, credential or private data is used. Nothing is written outside
 * bench/public-cuad/.data/ (except the extracted file itself).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, unlinkSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

process.on('uncaughtException', (error) => {
  console.error(`fetch failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = join(here, '.data')
const zipPath = join(dataDir, 'data.zip')
const jsonPath = join(dataDir, 'CUADv1.json')
const archiveUrl = 'https://raw.githubusercontent.com/The-Atticus-Project/cuad/main/data.zip'
const sourceUrl = 'https://github.com/The-Atticus-Project/cuad'
const license = 'CC BY 4.0'

const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log('usage: node bench/public-cuad/fetch.mjs [--force] [--zip <data.zip>] [--json <CUADv1.json>]')
  process.exit(0)
}
const force = args.includes('--force')
function option(name) {
  const at = args.indexOf(name)
  if (at < 0) return undefined
  const value = args[at + 1]
  if (value === undefined || value.startsWith('--')) throw new Error(`${name} needs a path`)
  return resolve(value)
}
const zipOption = option('--zip')
const jsonOption = option('--json')
if (zipOption !== undefined && jsonOption !== undefined) throw new Error('choose either --zip or --json, not both')

mkdirSync(dataDir, { recursive: true })

/** Run a Python snippet, preferring python3 and falling back to python. */
function python(script, scriptArgs) {
  for (const command of ['python3', 'python']) {
    const result = spawnSync(command, ['-c', script, ...scriptArgs], { encoding: 'utf8' })
    if (result.error?.code === 'ENOENT') continue
    if (result.error !== undefined) throw new Error(`${command}: ${result.error.message}`)
    return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' }
  }
  throw new Error('Python 3 is required to verify the ZIP and extract CUADv1.json (python3 or python not found)')
}

const ZIP_CHECK = `
import json, sys, zipfile
try:
    with zipfile.ZipFile(sys.argv[1]) as archive:
        names = archive.namelist()
        info = archive.getinfo('CUADv1.json')
    print(json.dumps({"ok": True, "entries": len(names), "names": names, "size": info.file_size}))
except Exception as exc:
    print(json.dumps({"ok": False, "error": str(exc)}))
    sys.exit(1)
`
const EXTRACT = `
import sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as archive:
    data = archive.read('CUADv1.json')
with open(sys.argv[2], 'wb') as handle:
    handle.write(data)
print(len(data))
`

/** Validate a ZIP with Python's zipfile and return its CUADv1.json metadata. */
function validateZip(path) {
  if (!existsSync(path)) throw new Error(`ZIP not found: ${path}`)
  const result = python(ZIP_CHECK, [path])
  let parsed
  try {
    parsed = JSON.parse(result.stdout.trim().split('\n').pop() ?? '')
  } catch {
    throw new Error(`Python ZIP check did not return JSON for ${path}: ${result.stderr || result.stdout}`)
  }
  if (parsed.ok !== true) {
    const bytes = statSync(path).size
    throw new Error(
      `Not a valid ZIP: ${path} (${bytes} bytes). ` +
        `A partial download is expected to fail the central-directory check; re-run without --force to resume with curl -C -. ` +
        `Python said: ${parsed.error}`,
    )
  }
  return parsed
}

/** Validate that a file is CUADv1.json, not merely any JSON. */
function validateJson(path) {
  if (!existsSync(path)) throw new Error(`JSON not found: ${path}`)
  const parsed = JSON.parse(readFileSync(path, 'utf8'))
  if (!Array.isArray(parsed.data) || parsed.data.length === 0) throw new Error(`${path}: expected an object with a non-empty data array`)
  const categories = new Set()
  for (const contract of parsed.data) {
    for (const paragraph of Array.isArray(contract?.paragraphs) ? contract.paragraphs : []) {
      for (const qa of Array.isArray(paragraph?.qas) ? paragraph.qas : []) {
        const id = String(qa?.id ?? '')
        const at = id.lastIndexOf('__')
        if (at >= 0) categories.add(id.slice(at + 2))
      }
    }
  }
  if (categories.size !== 41) throw new Error(`${path}: expected 41 CUAD categories, found ${categories.size}`)
  return { contracts: parsed.data.length, categories: categories.size, bytes: statSync(path).size }
}

function download() {
  const curlArgs = [
    '--location',
    '--fail',
    '--show-error',
    '--retry',
    '10',
    '--retry-all-errors',
    '--retry-delay',
    '2',
    '--connect-timeout',
    '30',
  ]
  if (existsSync(zipPath) && statSync(zipPath).size > 0) curlArgs.push('--continue-at', '-')
  curlArgs.push('--output', zipPath, archiveUrl)
  console.log(`downloading/resuming ${archiveUrl}`)
  console.log(`target: ${zipPath}`)
  const result = spawnSync('curl', curlArgs, { stdio: 'inherit' })
  if (result.error?.code === 'ENOENT') throw new Error('curl is required for the download path (or pass --zip/--json)')
  if (result.error !== undefined) throw new Error(`curl: ${result.error.message}`)
  if (result.status !== 0) {
    const bytes = existsSync(zipPath) ? statSync(zipPath).size : 0
    throw new Error(
      `curl failed with status ${result.status}; partial file is ${bytes} bytes. ` +
        'Re-run the same command to resume; do not delete the partial file. ' +
        'For a slow network, pass an already-downloaded archive with --zip or an extracted file with --json.',
    )
  }
}

function extract(zip) {
  const result = python(EXTRACT, [zip, jsonPath])
  if (result.status !== 0) throw new Error(`extract failed: ${result.stderr || result.stdout}`)
  console.log(`extracted CUADv1.json (${result.stdout.trim()} bytes)`)
}

console.log(`source: ${sourceUrl}`)
console.log(`license: ${license}`)

if (jsonOption !== undefined) {
  const info = validateJson(jsonOption)
  if (resolve(jsonOption) !== resolve(jsonPath)) copyFileSync(jsonOption, jsonPath)
  console.log(`using extracted JSON: ${jsonPath} (${info.contracts} contracts, ${info.categories} categories, ${info.bytes} bytes)`)
} else {
  const zip = zipOption ?? zipPath
  if (force && zipOption === undefined) {
    for (const path of [zipPath, jsonPath]) if (existsSync(path)) unlinkSync(path)
  }
  let zipInfo
  if (existsSync(zip) && statSync(zip).size > 0) {
    try {
      zipInfo = validateZip(zip)
      console.log(`ZIP valid: ${zip} (${zipInfo.entries} entries, CUADv1.json ${zipInfo.size} bytes)`)
    } catch (error) {
      if (zipOption !== undefined) throw error
      console.log(String(error instanceof Error ? error.message : error))
      console.log('resuming the partial archive instead of deleting it')
    }
  }
  if (zipInfo === undefined) {
    download()
    zipInfo = validateZip(zip)
    console.log(`ZIP valid: ${zip} (${zipInfo.entries} entries, CUADv1.json ${zipInfo.size} bytes)`)
  }
  extract(zip)
  const info = validateJson(jsonPath)
  console.log(`ready: ${jsonPath} (${info.contracts} contracts, ${info.categories} categories, ${info.bytes} bytes)`)
  console.log(`not committed; .data/ is gitignored`)
}
