// LLM provider abstraction will go here
export class LLMProvider {
  // Placeholder implementation
  async generate(_prompt: string): Promise<string> {
    return 'Mock response from LLM'
  }
}

export default LLMProvider
