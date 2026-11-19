const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const targetFilePath = path.resolve('c:/Users/PCv/Desktop/Gift/Gifting_Website/client/src/pages/owner/OrderManagement.jsx');
let code = fs.readFileSync(targetFilePath, 'utf8');

const isCrlf = code.includes('\r\n');
const nl = isCrlf ? '\r\n' : '\n';

function applyStep(stepNum, name, replacer) {
  const prev = code;
  code = replacer(code);
  if (code === prev) {
    throw new Error(`Step ${stepNum} (${name}) made no change!`);
  }
  try {
    esbuild.transformSync(code, { loader: 'jsx' });
  } catch (err) {
    throw new Error(`Step ${stepNum} (${name}) failed syntax validation: ${err.message}`);
  }
  console.log(`Step ${stepNum} (${name}) passed.`);
}

console.log("Testing base code syntax...");
esbuild.transformSync(code, { loader: 'jsx' });
console.log("Base code syntax valid.");
