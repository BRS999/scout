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
    const job = await cronSystem.getJob(id)

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found', timestamp: new Date().toISOString() },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: job,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Error getting job:', error)
    return NextResponse.json(
      {
        error: 'Failed to get job',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cronSystem = await getCronInstance()

    const { id } = await params
    const { action } = (await request.json()) as { action?: string }

    let result: any

    if (action === 'pause') {
      result = await cronSystem.pauseJob(id)
    } else if (action === 'resume') {
      result = await cronSystem.resumeJob(id)
    } else {
      return NextResponse.json(
        {
          error: 'Invalid action. Use "pause" or "resume"',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
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
    console.error('❌ Error updating job:', error)
    return NextResponse.json(
      {
        error: 'Failed to update job',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cronSystem = await getCronInstance()

    const { id } = await params
    const result = await cronSystem.deleteJob(id)

    if (result.success) {
      return NextResponse.json({
        success: true,
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
    console.error('❌ Error deleting job:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete job',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
