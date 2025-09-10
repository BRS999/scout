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

    await cronSystem.updateSchedules()

    return NextResponse.json({
      success: true,
      message: 'Schedules updated',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Error updating schedules:', error)
    return NextResponse.json(
      {
        error: 'Failed to update schedules',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
