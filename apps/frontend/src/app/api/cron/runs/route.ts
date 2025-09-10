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

export async function GET(request: NextRequest) {
  try {
    const cronSystem = await getCronInstance()

    const { searchParams } = new URL(request.url)
    const offset = Number.parseInt(searchParams.get('offset') || '0')
    const limit = Number.parseInt(searchParams.get('limit') || '50')

    const runs = await cronSystem.listRuns(undefined, offset, limit)

    return NextResponse.json({
      success: true,
      data: runs,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Error listing runs:', error)
    return NextResponse.json(
      {
        error: 'Failed to list runs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
