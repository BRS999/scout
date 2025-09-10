// Global cron instance (persists across requests in local dev)
export let cronSystem: any = null

export async function initializeCronIfNeeded() {
  if (!cronSystem) {
    console.log('🚀 Initializing cron job system...')
    const { ScoutCron } = await import('@scout/cron')
    cronSystem = new ScoutCron()
    await cronSystem.initialize()
    console.log('✅ Cron job system ready')
  }
}

// Helper function to get cron instance
export async function getCronSystem(): Promise<any> {
  await initializeCronIfNeeded()
  return cronSystem
}
