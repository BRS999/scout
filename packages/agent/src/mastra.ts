import { Mastra } from '@mastra/core'
import { scoutAgent } from './agents/scout'

export const mastra = new Mastra({
  agents: { scoutAgent },
})
