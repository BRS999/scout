import { ScoutCron } from '@scout/cron'
import { NextResponse } from 'next/server'

let cronInstance: ScoutCron | null = null

async function getCronInstance(): Promise<ScoutCron> {
  if (!cronInstance) {
    cronInstance = new ScoutCron()
    await cronInstance.initialize()
  }
  return cronInstance
}

export async function GET() {
  try {
    await getCronInstance()
    return NextResponse.json({
      status: 'ok',
      message: 'Cron system ready',
      processId: process.pid,
      uptime: process.uptime(),
    })
  } catch (error) {
    console.error('❌ Cron initialization failed:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Cron system initialization failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}
