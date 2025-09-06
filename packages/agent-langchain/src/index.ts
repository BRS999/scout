import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { AgentExecutor, createOpenAIToolsAgent, createToolCallingAgent } from 'langchain/agents'

import { BrowserGetHtmlTool, BrowserNavigateTool } from './tools/browser.tool'
import { MemSearchTool } from './tools/mem-search.tool'
import { MemUpsertTool } from './tools/mem-upsert.tool'
import { ParserReadTool } from './tools/parser.tool'
import { ResearchWebTool } from './tools/research-web.tool'
// Import tools
import { SearchRunTool } from './tools/search.tool'

// Import model and prompts
import { makeModel } from './model'
import { SYSTEM_PROMPT } from './prompts/system'

/**
 * Create and configure the LangChain agent with all tools
 */
export async function makeAgent() {
  const llm = makeModel()

  // Initialize all tools
  const tools = [
    new SearchRunTool(),
    new BrowserNavigateTool(),
    new BrowserGetHtmlTool(),
    new ParserReadTool(),
    new MemSearchTool(),
    new MemUpsertTool(),
    new ResearchWebTool(),
  ]

  // Use tool-calling agent; prefer provider-agnostic ToolCalling agent
  try {
    // Provide required prompt including agent_scratchpad placeholder
    const escapedSystem = SYSTEM_PROMPT.replace(/\{/g, '{{').replace(/\}/g, '}}')
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', escapedSystem],
      ['human', '{input}'],
      new MessagesPlaceholder('agent_scratchpad'),
    ])

    // Try generic ToolCalling agent first, then fall back to OpenAI-specific
    let agent: Awaited<ReturnType<typeof createToolCallingAgent>>
    try {
      agent = await createToolCallingAgent({ llm, tools, prompt })
    } catch (e) {
      console.warn('[Agent] ToolCalling agent init failed; trying OpenAI-tools agent', e)
      agent = await createOpenAIToolsAgent({ llm, tools, prompt })
    }

    const executor = new AgentExecutor({
      agent,
      tools,
      maxIterations: 20,
      verbose: process.env.NODE_ENV === 'development',
      handleParsingErrors: true,
    })
    // Wrap to catch runtime tool-calling errors and fall back gracefully
    return {
      invoke: async (input: string | { input: string }) => {
        try {
          const chainValues = typeof input === 'string' ? { input } : input
          return await executor.invoke(chainValues)
        } catch (err) {
          console.warn('[Agent] Tool-calling runtime failed; falling back to LLM-only.', err)
          const toolsDescription = tools.map((t) => `${t.name}: ${t.description}`).join('\n')
          const escapedSystem =
            `${SYSTEM_PROMPT}\n\nAvailable tools (disabled):\n${toolsDescription}`
              .replace(/\{/g, '{{')
              .replace(/\}/g, '}}')
          const prompt = ChatPromptTemplate.fromMessages([
            ['system', escapedSystem],
            ['human', '{input}'],
          ])
          const chain = prompt.pipe(llm)
          const inputText = typeof input === 'string' ? input : input.input
          const res = await chain.invoke({ input: inputText })
          return { output: typeof res === 'string' ? res : String(res), intermediateSteps: [] }
        }
      },
    }
  } catch (err) {
    console.warn(
      '[Agent] Tool-calling agent init failed; falling back to simple LLM-only chain.',
      err
    )

    // Fallback: simple LLM chain that returns plain responses (no tools)
    const toolsDescription = tools.map((t) => `${t.name}: ${t.description}`).join('\n')
    const escapedSystem = `${SYSTEM_PROMPT}\n\nAvailable tools:\n${toolsDescription}`
      .replace(/\{/g, '{{')
      .replace(/\}/g, '}}')
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', escapedSystem],
      ['human', '{input}'],
    ])
    const chain = prompt.pipe(llm)

    const executor = {
      invoke: async (input: { input: string }) => {
        try {
          const result = await chain.invoke({ input: input.input })
          return { output: result.content, intermediateSteps: [] }
        } catch (error) {
          console.error('[Agent] Error:', error)
          return {
            output: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            intermediateSteps: [],
          }
        }
      },
    }
    return executor
  }
}
