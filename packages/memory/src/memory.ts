import { MemoryManager, createMemoryConfig } from './index'
import type { MemoryConfig } from './types'

let memoryInstance: MemoryManager | null = null
let initializing: Promise<MemoryManager> | null = null

export async function getMemory(config?: MemoryConfig): Promise<MemoryManager> {
  if (memoryInstance) {
    return memoryInstance
  }

  if (initializing) {
    return initializing
  }

  const collection = process.env.AGENT_MEMORY_COLLECTION || 'scout_memory'
  const memoryConfig = config || createMemoryConfig({ collection_name: collection })

  initializing = (async () => {
    const mgr = new MemoryManager(memoryConfig)
    try {
      await mgr.initialize()
      memoryInstance = mgr
      return mgr
    } catch (err) {
      console.error('[Memory] Failed to initialize ChromaDB connection:', err)
      throw err
    } finally {
      initializing = null
    }
  })()

  return initializing
}
