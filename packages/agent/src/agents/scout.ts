import { Agent } from '@mastra/core'
import { makeModel } from '../model'
import { SYSTEM_PROMPT } from '../prompts/system'
import { searxSearchTool } from '../tools/search.tool'

export const scoutAgent = new Agent({
  name: 'Scout Agent',
  instructions: SYSTEM_PROMPT,
  model: makeModel(),
  tools: {
    searxSearch: searxSearchTool,
  },
})
