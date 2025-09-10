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

    const jobs = await cronSystem.listJobs(offset, limit)

    return NextResponse.json({
      success: true,
      data: jobs,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Error listing jobs:', error)
    return NextResponse.json(
      {
        error: 'Failed to list jobs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cronSystem = await getCronInstance()

    const jobDef = await request.json()
    const result = await cronSystem.addJob(jobDef)

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          data: result.data,
          message: result.message,
          timestamp: new Date().toISOString(),
        },
        { status: 201 }
      )
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
    console.error('❌ Error creating job:', error)
    return NextResponse.json(
      {
        error: 'Failed to create job',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
