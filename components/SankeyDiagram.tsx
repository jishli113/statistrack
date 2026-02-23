'use client'

import { useMemo } from 'react'

interface JobApplication {
  id: string
  status: 'applied' | 'interview' | 'offer' | 'rejected'
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
  const { nodes, links } = useMemo(() => {
    // Count applications by status
    const statusCounts = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Create nodes
    const nodeList: SankeyNode[] = [
      { name: 'Applied', value: statusCounts.applied || 0, color: statusConfig.applied.color },
      { name: 'Interview', value: statusCounts.interview || 0, color: statusConfig.interview.color },
      { name: 'Offer', value: statusCounts.offer || 0, color: statusConfig.offer.color },
      { name: 'Rejected', value: statusCounts.rejected || 0, color: statusConfig.rejected.color },
    ]

    // Create links (flow from Applied to other statuses)
    const linkList: SankeyLink[] = []
    const appliedIndex = 0
    const interviewIndex = 1
    const offerIndex = 2
    const rejectedIndex = 3

    if (statusCounts.applied) {
      // Applied -> Interview
      if (statusCounts.interview) {
        linkList.push({
          source: appliedIndex,
          target: interviewIndex,
          value: Math.min(statusCounts.applied, statusCounts.interview),
        })
      }
      // Applied -> Offer (direct offers without interview)
      if (statusCounts.offer && !statusCounts.interview) {
        linkList.push({
          source: appliedIndex,
          target: offerIndex,
          value: statusCounts.offer,
        })
      }
      // Applied -> Rejected
      if (statusCounts.rejected) {
        linkList.push({
          source: appliedIndex,
          target: rejectedIndex,
          value: statusCounts.rejected,
        })
      }
    }

    // Interview -> Offer
    if (statusCounts.interview && statusCounts.offer) {
      linkList.push({
        source: interviewIndex,
        target: offerIndex,
        value: statusCounts.offer,
      })
    }

    // Interview -> Rejected
    if (statusCounts.interview && statusCounts.rejected) {
      linkList.push({
        source: interviewIndex,
        target: rejectedIndex,
        value: statusCounts.rejected,
      })
    }

    return { nodes: nodeList, links: linkList }
  }, [applications])

  const totalApplications = applications.length
  if (totalApplications === 0) return null

  const nodeHeight = 40
  const nodeSpacing = 20
  const nodeWidth = 120
  const svgHeight = nodes.length * (nodeHeight + nodeSpacing) + nodeSpacing
  const svgWidth = 600
  const startX = 50
  const endX = svgWidth - 50

  // Calculate node positions
  const nodePositions = nodes.map((node, index) => {
    const y = nodeSpacing + index * (nodeHeight + nodeSpacing)
    const maxValue = Math.max(...nodes.map(n => n.value), 1)
    const height = node.value > 0 ? Math.max((node.value / maxValue) * nodeHeight, 20) : 0
    
    return {
      x: startX,
      y: y + (nodeHeight - height) / 2,
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
    const maxValue = Math.max(...nodes.map(n => n.value), 1)
    const linkWidth = (link.value / maxValue) * 20

    // Create curved path
    const midX = (startX + endX) / 2
    const path = `M ${startX + nodeWidth} ${sourceY} 
                  C ${midX} ${sourceY}, ${midX} ${targetY}, ${endX} ${targetY}`

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
