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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cronSystem = await getCronInstance()

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get('limit') || '100')

    const events = await cronSystem.getRunEvents(id, limit)

    return NextResponse.json({
      success: true,
      data: events,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Error getting run events:', error)
    return NextResponse.json(
      {
        error: 'Failed to get run events',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
