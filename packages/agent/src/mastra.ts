import { Mastra } from '@mastra/core'
import { PinoLogger } from '@mastra/loggers'
import { scoutAgent } from './agents/scout-agent'

export const mastra = new Mastra({
  agents: { scoutAgent },
  logger: new PinoLogger({
    name: 'Scout',
    level: (process.env.LOG_LEVEL as 'info' | 'debug' | 'warn' | 'error') || 'info',
  }),
})
