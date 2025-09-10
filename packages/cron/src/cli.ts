#!/usr/bin/env node

import { createCLI } from './index.js'

const program = createCLI()

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error)
  process.exit(1)
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error)
  process.exit(1)
})

// Parse command line arguments
program.parse(process.argv)
