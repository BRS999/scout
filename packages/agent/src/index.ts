import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { AgentExecutor, createOpenAIToolsAgent, createToolCallingAgent } from 'langchain/agents'

// Import memory tools
import { MemSearchTool, MemUpsertTool } from '@scout/memory'
// Import tools
import { SearchRunTool } from './tools/search.tool'
// Import streamlined Steel Browser tools
import {
  SteelAdvancedScrapeTool,
  SteelHealthCheckTool,
  SteelPdfTool,
  SteelScreenshotTool,
} from './tools/steel.tool'

// Import model and prompts
import { makeModel } from './model'
import { SYSTEM_PROMPT } from './prompts/system'

/**
 * Create and configure the LangChain agent with all tools
 */
export type ToolUsage = {
  tool: string
  input: unknown
  output: unknown
  timestamp: Date
  duration?: number
  log?: string
}

export type IntermediateStep = {
  action?: { tool?: string; toolInput?: unknown; input?: unknown }
  observation?: unknown
  log?: string
}

export type AgentInvokeResult = {
  output: string
  intermediateSteps: unknown[]
  toolUsage: ToolUsage[]
  executionTime: number
  toolsUsed: number
}

export async function makeAgent() {
  const llm = makeModel()

  // Initialize minimal, focused tool set
  const tools = [
    // Search
    new SearchRunTool(), // Searx web search

    // Steel Browser (primary web interaction)
    new SteelAdvancedScrapeTool(), // Main web scraping/navigation/parsing tool
    new SteelScreenshotTool(), // Visual capture
    new SteelPdfTool(), // Document generation
    new SteelHealthCheckTool(), // Service monitoring

    // Memory & Persistence
    new MemSearchTool(), // Recall stored information
    new MemUpsertTool(), // Store findings
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
      maxIterations: 8, // Match system prompt maximum tool calls
      verbose: true, // Always verbose for debugging
      returnIntermediateSteps: true, // Explicitly enable intermediate steps
      handleParsingErrors: true,
    })

    // Add tool usage tracking
    const toolUsageTracker: ToolUsage[] = []
    // Helper functions for tool usage extraction and loop detection
    const extractToolUsage = (intermediateSteps: IntermediateStep[]): ToolUsage[] => {
      const extractedToolUsage: ToolUsage[] = []

      if (intermediateSteps) {
        console.info(`📊 [Agent] Found ${intermediateSteps.length} intermediate steps`)

        intermediateSteps.forEach((step: IntermediateStep, index: number) => {
          const observationLength =
            typeof step.observation === 'string'
              ? step.observation.length
              : Array.isArray(step.observation)
                ? step.observation.length
                : 0
          console.info(`🔍 [Agent] Step ${index}:`, {
            hasAction: !!step.action,
            actionKeys: step.action ? Object.keys(step.action) : [],
            observationLength,
          })

          if (step.action?.tool) {
            const toolCall: ToolUsage = {
              tool: step.action.tool,
              input: step.action.toolInput || step.action.input,
              output: step.observation,
              timestamp: new Date(),
              log: step.log,
            }
            extractedToolUsage.push(toolCall)
            console.info(`🔧 [Agent] Tool called: ${toolCall.tool}`)
          }
        })
      }

      return extractedToolUsage
    }

    const logToolUsageSummary = (extractedToolUsage: ToolUsage[]) => {
      console.info(`📊 [Agent] Tools used: ${extractedToolUsage.length}`)

      if (extractedToolUsage.length > 0 && extractedToolUsage.length <= 10) {
        console.info('🔧 Tool Usage Summary:')
        extractedToolUsage.slice(0, 5).forEach((usage, index) => {
          console.info(`  ${index + 1}. ${usage.tool}`)
          console.info(`     Input: ${JSON.stringify(usage.input).substring(0, 100)}...`)
        })
        if (extractedToolUsage.length > 5) {
          console.info(`  ... and ${extractedToolUsage.length - 5} more tools`)
        }
      } else if (extractedToolUsage.length > 10) {
        console.warn(
          `⚠️ [Agent] High tool usage detected (${extractedToolUsage.length} tools) - possible retry loop`
        )
      }
    }

    const detectLoops = (extractedToolUsage: ToolUsage[]) => {
      const recentTools = extractedToolUsage.slice(-3)
      const steelAPIFailures = extractedToolUsage.filter(
        (tool) =>
          tool.tool.startsWith('steel.') &&
          String(tool.output).includes('"success":false') &&
          String(tool.output).includes('Steel Browser API is not available')
      )

      const hasRepeatedCalls =
        recentTools.length >= 3 &&
        recentTools.every(
          (tool, index) =>
            index === 0 ||
            JSON.stringify(tool.input) === JSON.stringify(recentTools[index - 1].input)
        )

      const hasRepeatedSteelFailures = steelAPIFailures.length >= 2

      return { hasRepeatedCalls, hasRepeatedSteelFailures }
    }

    const createFallbackResult = async (input: string | { input: string }) => {
      console.warn('[Agent] Tool-calling runtime failed; falling back to LLM-only.')
      const toolsDescription = tools.map((t) => `${t.name}: ${t.description}`).join('\n')
      const escapedSystem = `${SYSTEM_PROMPT}\n\nAvailable tools (disabled):\n${toolsDescription}`
        .replace(/\{/g, '{{')
        .replace(/\}/g, '}}')
      const prompt = ChatPromptTemplate.fromMessages([
        ['system', escapedSystem],
        ['human', '{input}'],
      ])
      const chain = prompt.pipe(llm)
      const inputText = typeof input === 'string' ? input : input.input
      const res = await chain.invoke({ input: inputText })
      return {
        output: typeof res === 'string' ? res : String(res),
        intermediateSteps: [],
        toolUsage: [],
        executionTime: 0,
        toolsUsed: 0,
      }
    }

    // Wrap to catch runtime tool-calling errors and fall back gracefully
    return {
      invoke: async (input: string | { input: string }): Promise<AgentInvokeResult> => {
        // Reset tool usage tracker for this request
        toolUsageTracker.length = 0

        try {
          const chainValues = typeof input === 'string' ? { input } : input
          const startTime = Date.now()

          console.info(
            `🤖 [Agent] Starting request: "${typeof input === 'string' ? input : input.input}"`
          )

          // Execute with tool usage tracking
          const result = (await executor.invoke(chainValues)) as {
            output?: string
            intermediateSteps: IntermediateStep[]
          }
          const endTime = Date.now()

          console.info(`✅ [Agent] Request completed in ${endTime - startTime}ms`)

          // Extract tool usage from intermediate steps
          const extractedToolUsage = extractToolUsage(result.intermediateSteps)

          logToolUsageSummary(extractedToolUsage)

          // Check for loops and add warnings if needed
          const { hasRepeatedCalls, hasRepeatedSteelFailures } = detectLoops(extractedToolUsage)

          if (hasRepeatedCalls || hasRepeatedSteelFailures) {
            const loopType = hasRepeatedSteelFailures ? 'Steel API failures' : 'repeated tool calls'
            console.warn(
              `⚠️ [Agent] Detected ${loopType} - forcing termination to prevent infinite loops`
            )

            const appendLoopWarning = (content: string, hasSteelFailures: boolean) => {
              let warningMessage =
                '\\n\\n⚠️ **Loop detected**: The agent terminated early to prevent infinite loops.'
              if (hasSteelFailures) {
                warningMessage +=
                  ' Steel Browser API appears to be unavailable. Try using search.run or research.web tools instead.'
              }
              return content + warningMessage
            }

            result.output = appendLoopWarning(result.output || '', hasRepeatedSteelFailures)
          }

          // Add tool usage to the result
          return {
            output: result.output ?? '',
            intermediateSteps: (result.intermediateSteps as unknown[]) ?? [],
            toolUsage: extractedToolUsage,
            executionTime: endTime - startTime,
            toolsUsed: extractedToolUsage.length,
          }
        } catch (_err) {
          return await createFallbackResult(input)
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
      invoke: async (input: { input: string }): Promise<AgentInvokeResult> => {
        try {
          const result = await chain.invoke({ input: input.input })
          const maybeObj = result as Record<string, unknown>
          const contentVal = 'content' in maybeObj ? maybeObj.content : result
          return {
            output: String(contentVal),
            intermediateSteps: [],
            toolUsage: [],
            executionTime: 0,
            toolsUsed: 0,
          }
        } catch (error) {
          console.error('[Agent] Error:', error)
          return {
            output: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            intermediateSteps: [],
            toolUsage: [],
            executionTime: 0,
            toolsUsed: 0,
          }
        }
      },
    }
    return executor
  }
}
