'use client'

import { useMemo } from 'react'

interface JobApplication {
  id: string
  status: 'applied' | 'interview' | 'offer' | 'rejected' | 'rejected_after_interview'
}

interface SankeyDiagramProps {
  applications: JobApplication[]
  /** Tighter layout for viewport-constrained dashboards */
  compact?: boolean
}

interface SankeyNode {
  name: string
  value: number
  color: string
}

interface SankeyLink {
  source: number
  target: number
  value: number
  /** Mid-curve label (e.g. count on Interview → Rejected) */
  label?: string
}

const statusConfig = {
  applied: { color: '#ff6b35', label: 'Applied' },
  interview: { color: '#ff8c5a', label: 'Interview' },
  offer: { color: '#10b981', label: 'Offer' },
  rejected: { color: '#6b7280', label: 'Rejected' },
}

export default function SankeyDiagram({ applications, compact = false }: SankeyDiagramProps) {
  // Node indices (Applied, Interview, Offer, Rejected)
  const appliedIndex = 0
  const interviewIndex = 1
  const offerIndex = 2
  const rejectedIndex = 3

  const { nodes, links } = useMemo(() => {
    // Count applications by status
    const statusCounts = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const total = applications.length
    const appliedCount = total // All applications start as applied
    const interviewCount = statusCounts.interview || 0
    const offerCount = statusCounts.offer || 0
    const directRejectedCount = statusCounts.rejected || 0
    const interviewRejectedCount = statusCounts.rejected_after_interview || 0
    const totalRejectedCount = directRejectedCount + interviewRejectedCount
    /** Anyone who reached interview stage: active interview, offer (post-interview), or rejected after interview */
    const reachedInterviewCount =
      interviewCount + offerCount + interviewRejectedCount

    // Create nodes in order: Applied, Interview, Offer, Rejected
    const nodeList: SankeyNode[] = [
      { name: 'Applied', value: appliedCount, color: statusConfig.applied.color },
      {
        name: 'Interview',
        value: reachedInterviewCount,
        color: statusConfig.interview.color,
      },
      { name: 'Offer', value: offerCount, color: statusConfig.offer.color },
      { name: 'Rejected', value: totalRejectedCount, color: statusConfig.rejected.color },
    ]

    // Create links with proper flow
    const linkList: SankeyLink[] = []

    // Applied -> Interview (all that got interviews, including offers and post-interview rejections)
    if (reachedInterviewCount > 0) {
      linkList.push({
        source: appliedIndex,
        target: interviewIndex,
        value: reachedInterviewCount,
      })
    }

    // Interview -> Offer (all offers come from interviews)
    if (offerCount > 0) {
      linkList.push({
        source: interviewIndex,
        target: offerIndex,
        value: offerCount,
      })
    }

    // Applied -> Rejected (direct rejections without interview)
    if (directRejectedCount > 0) {
      linkList.push({
        source: appliedIndex,
        target: rejectedIndex,
        value: directRejectedCount,
      })
    }

    // Interview -> Rejected (rejections after interview)
    if (interviewRejectedCount > 0) {
      linkList.push({
        source: interviewIndex,
        target: rejectedIndex,
        value: interviewRejectedCount,
        label: String(interviewRejectedCount),
      })
    }

    return { nodes: nodeList, links: linkList }
  }, [applications])

  const totalApplications = applications.length
  if (totalApplications === 0) return null

  const appliedBarMax = compact ? 36 : 46
  /** Taller / wider rects for Interview, Offer, Rejected */
  const stageBarMax = compact ? 58 : 82
  const stageMinHeight = compact ? 34 : 48
  const appliedMinHeight = 20
  const appliedNodeWidth = compact ? 108 : 132
  const stageNodeWidth = compact ? 162 : 208
  const rowBand = Math.max(appliedBarMax, stageBarMax)
  const svgWidth = compact ? 840 : 1080
  const svgHeight = compact ? 288 : 420
  const startX = compact ? 32 : 44
  const midX = svgWidth / 2
  const endX = svgWidth - (compact ? 32 : 44)
  const topY = compact ? 44 : 92
  const bottomY = compact ? 176 : 292

  // Calculate node positions
  // Applied, Interview, Offer on top row, Rejected on bottom
  const nodePositions = nodes.map((node, index) => {
    const maxValue = Math.max(...nodes.map(n => n.value), 1)
    const isApplied = index === 0
    const barMax = isApplied ? appliedBarMax : stageBarMax
    const minH = isApplied ? appliedMinHeight : stageMinHeight
    const width = isApplied ? appliedNodeWidth : stageNodeWidth
    const height = node.value > 0 ? Math.max((node.value / maxValue) * barMax, minH) : 0

    let x, y
    if (index === 0) {
      // Applied - left
      x = startX
      y = topY + (rowBand - height) / 2
    } else if (index === 1) {
      // Interview - middle
      x = midX - width / 2
      y = topY + (rowBand - height) / 2
    } else if (index === 2) {
      // Offer - right
      x = endX - width
      y = topY + (rowBand - height) / 2
    } else {
      // Rejected - bottom center
      x = midX - width / 2
      y = bottomY + (rowBand - height) / 2
    }

    return {
      x,
      y,
      width,
      height,
      value: node.value,
      name: node.name,
      color: node.color,
    }
  })

  // Cubic Bézier point at t (for label placement on curved links)
  const cubicPoint = (
    t: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number
  ) => {
    const mt = 1 - t
    const mt2 = mt * mt
    const t2 = t * t
    const x = mt2 * mt * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t2 * t * x3
    const y = mt2 * mt * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t2 * t * y3
    return { x, y }
  }

  // Calculate link paths
  const linkPaths = links
    .map((link) => {
      const source = nodePositions[link.source]
      const target = nodePositions[link.target]

      if (!source || !target || source.value === 0 || target.value === 0) return null

      const sourceY = source.y + source.height / 2
      const targetY = target.y + target.height / 2
      const sourceX = source.x + source.width
      const targetX = target.x
      const maxValue = Math.max(...nodes.map((n) => n.value), 1)
      const linkWidth = Math.max((link.value / maxValue) * 18, 2)

      // Create curved path - horizontal flow for top row, vertical for rejections
      let path = ''
      let labelPoint: { x: number; y: number } | undefined
      if (link.target === rejectedIndex) {
        const x0 = sourceX
        const y0 = sourceY
        const x1 = sourceX + 64
        const y1 = sourceY
        const x2 = targetX - 64
        const y2 = targetY
        const x3 = targetX
        const y3 = targetY
        path = `M ${x0} ${y0} 
              C ${x1} ${y1}, ${x2} ${y2}, ${x3} ${y3}`
        if (link.label) {
          labelPoint = cubicPoint(0.5, x0, y0, x1, y1, x2, y2, x3, y3)
        }
      } else {
        const controlX = sourceX + (targetX - sourceX) / 2
        path = `M ${sourceX} ${sourceY} 
              C ${controlX} ${sourceY}, ${controlX} ${targetY}, ${targetX} ${targetY}`
      }

      return {
        path,
        width: linkWidth,
        value: link.value,
        color: source.color,
        opacity: 0.6,
        label: link.label,
        labelX: labelPoint?.x,
        labelY: labelPoint?.y,
      }
    })
    .filter(Boolean) as Array<{
      path: string
      width: number
      value: number
      color: string
      opacity: number
      label?: string
      labelX?: number
      labelY?: number
    }>

  return (
    <div
      className={`min-w-0 max-w-full bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 ${compact ? 'p-3' : 'p-6'}`}
    >
      <h3 className={`font-semibold text-white ${compact ? 'text-sm mb-2' : 'text-lg mb-4'}`}>
        Application Flow
      </h3>
      <div className="overflow-x-auto">
        <svg width={svgWidth} height={svgHeight} className="w-full">
          {/* Render links */}
          {linkPaths.map((link, index) => (
            <g key={index}>
              <path
                d={link.path}
                stroke={link.color}
                strokeWidth={link.width}
                fill="none"
                opacity={link.opacity}
                strokeLinecap="round"
              />
              {link.label != null && link.labelX != null && link.labelY != null && (
                <text
                  x={link.labelX}
                  y={link.labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={`fill-white font-bold ${compact ? 'text-[10px]' : 'text-xs'}`}
                  style={{ paintOrder: 'stroke', stroke: 'rgb(17 24 39)', strokeWidth: compact ? 3 : 4 }}
                >
                  {link.label}
                </text>
              )}
            </g>
          ))}
          
          {/* Render nodes */}
          {nodePositions.map((node, index) => (
            <g key={index}>
              <rect
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                fill={node.color}
                rx={6}
                className="transition-all duration-300"
              />
              <text
                x={node.x + node.width / 2}
                y={node.y + node.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className={`font-semibold fill-white ${compact ? 'text-xs' : 'text-sm'}`}
              >
                {node.name}
              </text>
              <text
                x={node.x + node.width / 2}
                y={node.y + node.height / 2 + (compact ? 15 : 18)}
                textAnchor="middle"
                dominantBaseline="middle"
                className={compact ? 'text-xs fill-gray-300' : 'text-sm fill-gray-300'}
              >
                {node.value}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <p className={`text-xs text-gray-400 text-center ${compact ? 'mt-2' : 'mt-4'}`}>
        Total: {totalApplications} application{totalApplications !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
