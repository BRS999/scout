import { Agent } from '@mastra/core'
import { fastembed } from '@mastra/fastembed'
import { Memory } from '@mastra/memory'
import { PgVector, PostgresStore } from '@mastra/pg'
import { makeModel } from '../model'
import { SYSTEM_PROMPT } from '../prompts/system'
import { searxSearchTool } from '../tools/searx-search.tool'
import { steelScrapeTool } from '../tools/steel-scrape.tool'

// Use a separate database for agent memory (not the cron jobs database)
const memoryConnectionString =
  process.env.AGENT_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://scout:scout_password@postgres:5432/scout_agent'

export const scoutAgent = new Agent({
  name: 'Scout Agent',
  instructions: SYSTEM_PROMPT,
  model: makeModel(),
  tools: {
    searxSearch: searxSearchTool,
    steelScrape: steelScrapeTool,
  },
  memory: new Memory({
    storage: new PostgresStore({
      connectionString: memoryConnectionString,
    }),
    vector: new PgVector({ connectionString: memoryConnectionString }),
    embedder: fastembed,
    options: {
      lastMessages: 10,
      semanticRecall: {
        topK: 3,
        messageRange: 2,
      },
      threads: {
        generateTitle: true,
      },
    },
  }),
})
