import { MemoryManager, createMemoryConfig } from '@scout/memory'

let memoryInstance: MemoryManager | null = null
let initializing: Promise<MemoryManager> | null = null

export async function getMemory(): Promise<MemoryManager> {
  if (memoryInstance) return memoryInstance
  if (initializing) return initializing

  initializing = (async () => {
    const collection = process.env.AGENT_MEMORY_COLLECTION || 'agent_langchain'
    const config = createMemoryConfig({ collection_name: collection })
    let mgr = new MemoryManager(config)
    try {
      await mgr.initialize()
      memoryInstance = mgr
      return mgr
    } catch (err) {
      // Fallback to mock vector backend to avoid blocking local runs
      if ((process.env.MEMORY_VECTOR_BACKEND || '').toLowerCase() !== 'mock') {
        // eslint-disable-next-line no-console
        console.warn(
          '[Memory] Initialization failed; retrying with MEMORY_VECTOR_BACKEND=mock',
          err
        )
        process.env.MEMORY_VECTOR_BACKEND = 'mock'
        mgr = new MemoryManager(createMemoryConfig({ collection_name: collection }))
        await mgr.initialize()
        memoryInstance = mgr
        return mgr
      }
      throw err
    } finally {
      initializing = null
    }
  })()

  return initializing
}
