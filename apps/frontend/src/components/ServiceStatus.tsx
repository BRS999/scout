'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Cpu,
  Database,
  Globe,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface Service {
  name: string
  status: 'online' | 'offline' | 'error'
  type: 'browser' | 'search' | 'database' | 'cache'
  port: number
  lastChecked: string
  url?: string
}

interface ServiceStatusData {
  services: Service[]
  overall: 'healthy' | 'degraded'
  timestamp: string
}

const getServiceIcon = (type: string) => {
  switch (type) {
    case 'browser':
      return Globe
    case 'search':
      return Search
    case 'database':
      return Database
    case 'cache':
      return Cpu
    default:
      return Activity
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'online':
      return 'bg-green-500'
    case 'offline':
      return 'bg-red-500'
    case 'error':
      return 'bg-orange-500'
    default:
      return 'bg-gray-500'
  }
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'online':
      return 'default' as const
    case 'offline':
      return 'destructive' as const
    case 'error':
      return 'secondary' as const
    default:
      return 'outline' as const
  }
}

export function ServiceStatus() {
  const [services, setServices] = useState<Service[]>([])
  const [overallStatus, setOverallStatus] = useState<'healthy' | 'degraded'>('healthy')
  const [isLoading, setIsLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const fetchServiceStatus = useCallback(async () => {
    setIsLoading(true)
    try {
      // Use the current origin since API is now part of the same Next.js app
      const baseUrl =
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'
      const response = await fetch(`${baseUrl}/api/services/status`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ServiceStatusData = await response.json()
      setServices(data.services)
      setOverallStatus(data.overall)
      setLastChecked(new Date())
    } catch (error) {
      console.error('Failed to fetch service status:', error)
      // Set error state for all services
      setServices((prev) => prev.map((service) => ({ ...service, status: 'error' as const })))
      setOverallStatus('degraded')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch and periodic updates
  useEffect(() => {
    fetchServiceStatus()

    // Update every 30 seconds
    const interval = setInterval(fetchServiceStatus, 30000)

    return () => clearInterval(interval)
  }, [fetchServiceStatus])

  const onlineCount = services.filter((s) => s.status === 'online').length
  const totalCount = services.length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative hover:bg-muted/50 h-8 px-3"
          onClick={fetchServiceStatus}
          disabled={isLoading}
        >
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                overallStatus === 'healthy' ? 'bg-green-500' : 'bg-orange-500'
              } ${isLoading ? 'animate-pulse' : ''}`}
            />
            <span className="hidden sm:inline text-sm">Status</span>
          </div>
          <span className="sr-only">Service Status</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Service Status</span>
              <div className="flex items-center space-x-2">
                <Badge
                  variant={overallStatus === 'healthy' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {onlineCount}/{totalCount} Online
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={fetchServiceStatus}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardTitle>
            {lastChecked && (
              <p className="text-xs text-muted-foreground">
                Last checked: {lastChecked.toLocaleTimeString()}
              </p>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {services.map((service) => {
                const Icon = getServiceIcon(service.type)
                const statusColor = getStatusColor(service.status)

                return (
                  <div
                    key={service.name}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{service.name}</span>
                          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                        </div>
                        <p className="text-xs text-muted-foreground">Port {service.port}</p>
                      </div>
                    </div>
                    <Badge variant={getStatusBadgeVariant(service.status)} className="text-xs">
                      {service.status === 'online' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {service.status === 'offline' && <XCircle className="h-3 w-3 mr-1" />}
                      {service.status === 'error' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {service.status}
                    </Badge>
                  </div>
                )
              })}
            </div>
            {services.length === 0 && !isLoading && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No services found
              </div>
            )}
            {isLoading && (
              <div className="text-center py-4">
                <RefreshCw className="h-4 w-4 animate-spin mx-auto" />
                <p className="text-xs text-muted-foreground mt-2">Checking services...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
