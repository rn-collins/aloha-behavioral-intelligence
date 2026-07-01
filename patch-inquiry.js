#!/usr/bin/env node
// patch-inquiry.js
// Run from any OK COOL project directory:
//   node patch-inquiry.js <source-slug>
// Example:
//   node patch-inquiry.js third-asset
//
// What it does:
//   1. Reads pages/index.js
//   2. Adds the InquiryModal import after the last existing import line
//   3. Adds <InquiryModal source="..." /> before the final closing return tag
//   4. Writes the file back

const fs = require('fs');
const path = require('path');

const source = process.argv[2];
if (!source) {
  console.error('ERROR: provide a source slug.\nUsage: node patch-inquiry.js third-asset');
  process.exit(1);
}

const filePath = path.join(process.cwd(), 'pages', 'index.js');
if (!fs.existsSync(filePath)) {
  console.error(`ERROR: pages/index.js not found in ${process.cwd()}`);
  process.exit(1);
}

let code = fs.readFileSync(filePath, 'utf8');

// ── CHECK: already patched? ───────────────────────────────────────────────────
if (code.includes('InquiryModal')) {
  console.log('⚠️  InquiryModal already present in pages/index.js — skipping patch.');
  process.exit(0);
}

// ── STEP 1: Add import after the last import line ────────────────────────────
const importLine = `import InquiryModal from '../components/InquiryModal';`;
const lines = code.split('\n');
let lastImportIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trimStart().startsWith('import ')) {
    lastImportIdx = i;
  }
}
if (lastImportIdx === -1) {
  // No imports found — add at line 0
  lines.unshift(importLine);
} else {
  lines.splice(lastImportIdx + 1, 0, importLine);
}
code = lines.join('\n');

// ── STEP 2: Add <InquiryModal /> before the closing return ───────────────────
// Strategy: find the last occurrence of </main>, </div>, or </> before the
// final closing ); of the default export, and insert just before it.
const component = `      <InquiryModal source="${source}" />`;

// Try </main> first, then </div>, then </>
const closingTags = ['</main>', '</div>', '</>'];
let inserted = false;
for (const tag of closingTags) {
  const lastIdx = code.lastIndexOf(tag);
  if (lastIdx !== -1) {
    code = code.slice(0, lastIdx) + component + '\n    ' + code.slice(lastIdx);
    inserted = true;
    break;
  }
}

if (!inserted) {
  // Fallback: insert before the final ); line
  const finalClose = code.lastIndexOf('\n  );\n}');
  if (finalClose !== -1) {
    code = code.slice(0, finalClose) + '\n' + component + code.slice(finalClose);
    inserted = true;
  }
}

if (!inserted) {
  console.error('ERROR: Could not find a safe insertion point in pages/index.js.');
  console.error('Add manually: import InquiryModal from \'../components/InquiryModal\';');
  console.error(`And add: <InquiryModal source="${source}" /> before the last closing tag.`);
  process.exit(1);
}

// ── WRITE BACK ────────────────────────────────────────────────────────────────
fs.writeFileSync(filePath, code, 'utf8');
console.log(`✓ Patched pages/index.js with InquiryModal source="${source}"`);
console.log('Next step: vercel --prod --yes');
