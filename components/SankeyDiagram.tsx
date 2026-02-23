'use client'

import { useMemo } from 'react'

interface JobApplication {
  id: string
  status: 'applied' | 'interview' | 'offer' | 'rejected' | 'rejected_after_interview'
}

interface SankeyDiagramProps {
  applications: JobApplication[]
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
}

const statusConfig = {
  applied: { color: '#ff6b35', label: 'Applied' },
  interview: { color: '#ff8c5a', label: 'Interview' },
  offer: { color: '#10b981', label: 'Offer' },
  rejected: { color: '#6b7280', label: 'Rejected' },
}

export default function SankeyDiagram({ applications }: SankeyDiagramProps) {
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
    const stillApplied = statusCounts.applied || 0

    // Create nodes in order: Applied, Interview, Offer, Rejected
    // Note: Interview node shows count of those currently in interview (not including offers)
    const nodeList: SankeyNode[] = [
      { name: 'Applied', value: appliedCount, color: statusConfig.applied.color },
      { name: 'Interview', value: interviewCount + offerCount, color: statusConfig.interview.color }, // Include offers since they went through interview
      { name: 'Offer', value: offerCount, color: statusConfig.offer.color },
      { name: 'Rejected', value: totalRejectedCount, color: statusConfig.rejected.color },
    ]

    // Create links with proper flow
    const linkList: SankeyLink[] = []
    
    // Applied -> Interview (all that got interviews, including those who got offers)
    if (interviewCount > 0 || offerCount > 0) {
      linkList.push({
        source: appliedIndex,
        target: interviewIndex,
        value: interviewCount + offerCount, // All interviews + offers (since offers require interviews)
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
      })
    }

    return { nodes: nodeList, links: linkList }
  }, [applications])

  const totalApplications = applications.length
  if (totalApplications === 0) return null

  const nodeHeight = 40
  const nodeSpacing = 20
  const nodeWidth = 120
  const svgWidth = 800
  const svgHeight = 300
  const startX = 50
  const midX = svgWidth / 2
  const endX = svgWidth - 50
  const topY = 80
  const bottomY = 220

  // Calculate node positions
  // Applied, Interview, Offer on top row, Rejected on bottom
  const nodePositions = nodes.map((node, index) => {
    const maxValue = Math.max(...nodes.map(n => n.value), 1)
    const height = node.value > 0 ? Math.max((node.value / maxValue) * nodeHeight, 20) : 0
    
    let x, y
    if (index === 0) {
      // Applied - left
      x = startX
      y = topY + (nodeHeight - height) / 2
    } else if (index === 1) {
      // Interview - middle
      x = midX - nodeWidth / 2
      y = topY + (nodeHeight - height) / 2
    } else if (index === 2) {
      // Offer - right
      x = endX - nodeWidth
      y = topY + (nodeHeight - height) / 2
    } else {
      // Rejected - bottom center
      x = midX - nodeWidth / 2
      y = bottomY + (nodeHeight - height) / 2
    }
    
    return {
      x,
      y,
      width: nodeWidth,
      height,
      value: node.value,
      name: node.name,
      color: node.color,
    }
  })

  // Calculate link paths
  const linkPaths = links.map(link => {
    const source = nodePositions[link.source]
    const target = nodePositions[link.target]
    
    if (!source || !target || source.value === 0 || target.value === 0) return null

    const sourceY = source.y + source.height / 2
    const targetY = target.y + target.height / 2
    const sourceX = source.x + source.width
    const targetX = target.x
    const maxValue = Math.max(...nodes.map(n => n.value), 1)
    const linkWidth = Math.max((link.value / maxValue) * 15, 2)

    // Create curved path - horizontal flow for top row, vertical for rejections
    let path = ''
    if (link.target === rejectedIndex) {
      // Flow to rejected (bottom) - curve down
      const controlY = sourceY + (targetY - sourceY) / 2
      path = `M ${sourceX} ${sourceY} 
              C ${sourceX + 50} ${sourceY}, ${targetX - 50} ${targetY}, ${targetX} ${targetY}`
    } else {
      // Horizontal flow (Applied -> Interview -> Offer)
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
    }
  }).filter(Boolean) as Array<{
    path: string
    width: number
    value: number
    color: string
    opacity: number
  }>

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Application Flow</h3>
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
                rx={4}
                className="transition-all duration-300"
              />
              <text
                x={node.x + node.width / 2}
                y={node.y + node.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs font-semibold fill-white"
              >
                {node.name}
              </text>
              <text
                x={node.x + node.width / 2}
                y={node.y + node.height / 2 + 16}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs fill-gray-300"
              >
                {node.value}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <p className="text-xs text-gray-400 mt-4 text-center">
        Total: {totalApplications} application{totalApplications !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
