/* Simple local runner to exercise the LangChain agent */
/* eslint-disable no-console */

async function main() {
  const question = process.argv.slice(2).join(' ') || 'What is the latest Node.js LTS?'

  // Ensure env defaults for LM Studio
  process.env.LMSTUDIO_URL = process.env.LMSTUDIO_URL || 'http://127.0.0.1:1234/v1'
  process.env.LMSTUDIO_API_KEY = process.env.LMSTUDIO_API_KEY || 'lm-studio'
  process.env.LOCAL_MODEL = process.env.LOCAL_MODEL || 'Llama-3.1-8B-Instruct'

  const { makeAgent } = require('../dist/index.js')

  const agent = await makeAgent()
  const res = await agent.invoke({ input: question })
  if (res.intermediateSteps?.length) {
  }
}

main().catch((err) => {
  console.error('Runner error:', err)
  process.exit(1)
})
