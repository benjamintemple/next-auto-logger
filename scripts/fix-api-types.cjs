#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix TypeScript declaration files for API module
const apiDts = path.join(__dirname, '../dist/api.d.ts');
const apiDcts = path.join(__dirname, '../dist/api.d.cts');

function fixDeclarations(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace problematic export = syntax with proper exports
  content = content.replace(
    /\/\/ @ts-ignore\nexport = handler;\nexport \{ OPTIONS, POST \};/,
    'export { POST, OPTIONS };\nexport default handler;'
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed TypeScript declarations in ${path.basename(filePath)}`);
}

fixDeclarations(apiDts);
fixDeclarations(apiDcts);