import { Agent } from '@mastra/core'
import { Memory } from '@mastra/memory'
import { PgVector, PostgresStore } from '@mastra/pg'

import { xenovaEmbedder } from '../embedders/xenova'
import { makeModel } from '../model'
import { SYSTEM_PROMPT } from '../prompts/system'
import { searxSearchTool } from '../tools/search.tool'
import { steelScrapeTool } from '../tools/steel-scrape.tool'

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
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/scout',
    }),
    vector: new PgVector({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/scout',
    }),
    embedder: xenovaEmbedder,
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
