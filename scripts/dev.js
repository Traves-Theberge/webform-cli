#!/usr/bin/env node

// This is a development helper script that works like the bin/webform script
// but runs the TypeScript source directly without compilation

// Check if any arguments were provided, if not, add 'help' command
if (process.argv.length <= 2) {
  process.argv.push('help');
}

// Run the CLI directly from TypeScript source
require('ts-node').register();
require('../src/cli');