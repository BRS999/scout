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

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cronSystem = await getCronInstance()

    const { id } = await params
    const run = await cronSystem.getRun(id)

    if (!run) {
      return NextResponse.json(
        { error: 'Run not found', timestamp: new Date().toISOString() },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: run,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Error getting run:', error)
    return NextResponse.json(
      {
        error: 'Failed to get run',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
