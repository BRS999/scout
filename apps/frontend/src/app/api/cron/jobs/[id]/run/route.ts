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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cronSystem = await getCronInstance()

    const { id } = await params
    const { dryRun = false, inputs } = (await request.json()) as {
      dryRun?: boolean
      inputs?: Record<string, unknown>
    }

    const result = dryRun ? await cronSystem.dryRun(id) : await cronSystem.runJobNow(id, inputs)

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        message: result.message,
        timestamp: new Date().toISOString(),
      })
    }
    return NextResponse.json(
      {
        success: false,
        error: result.message,
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('❌ Error running job:', error)
    return NextResponse.json(
      {
        error: 'Failed to run job',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
