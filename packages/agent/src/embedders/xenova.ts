import { pipeline } from '@xenova/transformers'

// Type for the feature extraction pipeline
type FeatureExtractionPipeline = Awaited<ReturnType<typeof pipeline<'feature-extraction'>>>

let extractor: FeatureExtractionPipeline | null = null

/**
 * Initialize the Xenova embeddings extractor
 */
async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractor) {
    // Use a lightweight model that's good for semantic similarity
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  }
  return extractor
}

/**
 * Custom embedder using @xenova/transformers for ARM64 compatibility
 * Implements the EmbeddingModelV1<string> interface
 */
class XenovaEmbedder {
  /**
   * The embedding model specification version
   */
  readonly specificationVersion = 'v1' as const

  /**
   * Name of the provider for logging purposes
   */
  readonly provider = 'xenova'

  /**
   * Provider-specific model ID for logging purposes
   */
  readonly modelId = 'all-MiniLM-L6-v2'

  /**
   * Limit of how many embeddings can be generated in a single API call
   */
  readonly maxEmbeddingsPerCall = 10

  /**
   * True if the model can handle multiple embedding calls in parallel
   */
  readonly supportsParallelCalls = true

  /**
   * Generate embeddings for the given input values
   */
  async doEmbed({
    values,
    abortSignal,
  }: {
    values: string[]
    abortSignal?: AbortSignal
  }) {
    try {
      const extractor = await getExtractor()

      // Check if operation was aborted
      if (abortSignal?.aborted) {
        throw new Error('Embedding operation was aborted')
      }

      const embeddings: number[][] = []

      // Process texts in batches to avoid memory issues
      const batchSize = 10
      for (let i = 0; i < values.length; i += batchSize) {
        // Check if operation was aborted between batches
        if (abortSignal?.aborted) {
          throw new Error('Embedding operation was aborted')
        }

        const batch = values.slice(i, i + batchSize)
        const outputs = await Promise.all(
          batch.map(async (text) => {
            const output = await extractor(text, { pooling: 'mean', normalize: true })
            if (output && 'data' in output && output.data) {
              return Array.from(output.data as number[])
            }
            throw new Error('Failed to generate embedding')
          })
        )
        embeddings.push(...outputs)
      }

      return {
        embeddings,
        usage: {
          tokens: values.length * 50, // Rough estimate for token usage
        },
      }
    } catch (error) {
      console.error('Xenova embedder error:', error)
      // Fallback: return zero embeddings if everything fails
      const fallbackEmbeddings = values.map(() => new Array(384).fill(0))
      return {
        embeddings: fallbackEmbeddings,
        usage: {
          tokens: values.length * 50,
        },
      }
    }
  }
}

// Export a singleton instance
export const xenovaEmbedder = new XenovaEmbedder()
