import { ScoutCron } from '@scout/cron'
import { type NextRequest, NextResponse } from 'next/server'

let cronInstance: ScoutCron | null = null

async function getCronInstance(): Promise<ScoutCron> {
  if (!cronInstance) {
    cronInstance = new ScoutCron()
    await cronInstance.initialize()
  }
  return cronInstance
}

export async function POST(_request: NextRequest) {
  try {
    const cronSystem = await getCronInstance()

    await cronSystem.processPendingRuns()

    return NextResponse.json({
      success: true,
      message: 'Pending runs processed',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Error processing pending runs:', error)
    return NextResponse.json(
      {
        error: 'Failed to process pending runs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
