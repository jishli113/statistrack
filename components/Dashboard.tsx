'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import statisTrackLogo from '@/static/statis_track.png'
import { Plus, Briefcase, Building2, Calendar, MapPin, Trash2, Edit2, ArrowUpDown, ArrowUp, ArrowDown, Filter, Search } from 'lucide-react'
import SankeyDiagram from './SankeyDiagram'

interface DashboardProps {
  onSignOut?: () => void
}

interface JobApplication {
  id: string
  company: string
  position: string
  status: 'applied' | 'interview' | 'offer' | 'rejected' | 'rejected_after_interview'
  appliedDate: string
  location?: string
  notes?: string
}
function dbStatusToUi(db: string): JobApplication['status'] {
  switch (db) {
    case 'Applied':
      return 'applied'
    case 'Interview':
      return 'interview'
    case 'Offer':
      return 'offer'
    case 'Rejected_Direct':
      return 'rejected'
    case 'Rejected_After_Interview':
      return 'rejected_after_interview'
    default:
      return 'applied'
  }
}
function uiStatusToDb(ui: JobApplication['status']): string {
  switch (ui) {
    case 'applied':
      return 'Applied'
    case 'interview':
      return 'Interview'
    case 'offer':
      return 'Offer'
    case 'rejected':
      return 'Rejected_Direct'
    case 'rejected_after_interview':
      return 'Rejected_After_Interview'
    default:
      return 'Applied'
  }
}

function toDateInputValue(isoOrDate: string): string {
  if (!isoOrDate) return ''
  return isoOrDate.includes('T') ? isoOrDate.split('T')[0] : isoOrDate.slice(0, 10)
}

const statusColors = {
  applied: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  interview: 'bg-orange-500/30 text-orange-300 border border-orange-500/40',
  offer: 'bg-green-500/20 text-green-400 border border-green-500/30',
  rejected: 'bg-gray-700/50 text-gray-400 border border-gray-600/50',
  rejected_after_interview: 'bg-red-500/20 text-red-400 border border-red-500/30',
}

const statusLabels = {
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  rejected_after_interview: 'Rejected (After Interview)',
}

type SortOrder = 'asc' | 'desc' | null
type StatusFilter = 'all' | 'applied' | 'interview' | 'offer' | 'rejected' | 'rejected_after_interview'

export default function Dashboard({ onSignOut }: DashboardProps = {}) {
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc') // Default: newest first
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]) // Default to today
  const [formData, setFormData] = useState({
    company: '',
    position: '',
    status: 'applied' as JobApplication['status'],
    appliedDate: new Date().toISOString().split('T')[0],
    location: '',
    notes: '',
  })

  useEffect(() => {
    fetchApplications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus()
    }
  }, [searchOpen])

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/applications')
      if (res.ok) {
        const data = await res.json()
        const normalized: JobApplication[] = data.map(
          (row: JobApplication & { status: string }) => ({
            ...row,
            status: dbStatusToUi(row.status),
            appliedDate: toDateInputValue(String(row.appliedDate)),
          })
        )
        setApplications(normalized)
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingApp ? `/api/applications/${editingApp.id}` : '/api/applications'
      const method = editingApp ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: uiStatusToDb(formData.status),
        }),
      })

      if (res.ok) {
        await fetchApplications()
        setShowModal(false)
        setEditingApp(null)
        setFormData({
          company: '',
          position: '',
          status: 'applied',
          appliedDate: new Date().toISOString().split('T')[0],
          location: '',
          notes: '',
        })
      }
    } catch (error) {
      console.error('Failed to save application:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this application?')) return

    try {
      const res = await fetch(`/api/applications/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchApplications()
      }
    } catch (error) {
      console.error('Failed to delete application:', error)
    }
  }

  const handleEdit = (app: JobApplication) => {
    setEditingApp(app)
    setFormData({
      company: app.company,
      position: app.position,
      status: app.status,
      appliedDate: toDateInputValue(app.appliedDate),
      location: app.location || '',
      notes: app.notes || '',
    })
    setShowModal(true)
  }

  const openNewModal = () => {
    setEditingApp(null)
    setFormData({
      company: '',
      position: '',
      status: 'applied',
      appliedDate: new Date().toISOString().split('T')[0],
      location: '',
      notes: '',
    })
    setShowModal(true)
  }

  // Calculate status counts (combine both rejection types for metrics)
  const statusCounts = applications.reduce((acc, app) => {
    const status = app.status === 'rejected_after_interview' ? 'rejected' : app.status
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  // Separate counts for filtering
  const detailedStatusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Filter and sort applications
  const filteredAndSortedApplications = useMemo(() => {
    let filtered = applications

    // Apply search filter (company or position)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(app => 
        app.company.toLowerCase().includes(query) ||
        app.position.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'rejected') {
        // Show both rejection types when filtering by 'rejected'
        filtered = filtered.filter(app => app.status === 'rejected' || app.status === 'rejected_after_interview')
      } else {
        filtered = filtered.filter(app => app.status === statusFilter)
      }
    }

    // Apply date range filter
    if (startDate || endDate) {
      filtered = filtered.filter(app => {
        const appDate = new Date(app.appliedDate).getTime()
        const start = startDate ? new Date(startDate).getTime() : 0
        const end = endDate ? new Date(endDate).getTime() + 86400000 : Infinity // Add 1 day to include end date
        
        return appDate >= start && appDate < end
      })
    }

    // Apply date sorting
    if (sortOrder) {
      filtered = [...filtered].sort((a, b) => {
        const dateA = new Date(a.appliedDate).getTime()
        const dateB = new Date(b.appliedDate).getTime()
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
      })
    }

    return filtered
  }, [applications, searchQuery, statusFilter, startDate, endDate, sortOrder])

  const toggleSortOrder = () => {
    if (sortOrder === 'desc') {
      setSortOrder('asc')
    } else if (sortOrder === 'asc') {
      setSortOrder(null)
    } else {
      setSortOrder('desc')
    }
  }

  return (
    <div className="fixed inset-0 z-0 flex min-h-0 min-w-0 flex-col overflow-hidden overflow-x-hidden overscroll-none bg-black">
      {/* Header — single row so nothing clips vertically */}
      <header className="z-40 shrink-0 border-b border-gray-900 bg-black/80 backdrop-blur-lg">
        <div className="mx-auto box-border flex w-full max-w-[1600px] items-center justify-start gap-4 px-4 py-2.5 sm:gap-6 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <h1 className="m-0 shrink-0">
              <Image
                src={statisTrackLogo}
                alt="StatisTrack"
                className="h-7 w-auto object-contain object-left sm:h-8"
                priority
              />
            </h1>
            <span className="truncate text-base font-bold tracking-tight text-gray-200 sm:text-lg">
              StatisTrack
            </span>
          </div>
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="ml-1 shrink-0 rounded-lg border border-gray-800 px-3 py-2 text-sm font-medium text-gray-300 transition-all duration-200 hover:border-orange-500/50 hover:bg-gray-900/50 hover:text-white sm:ml-2 sm:px-4"
            >
              Sign Out
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto box-border flex min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-hidden px-4 py-1.5 sm:px-6 lg:px-8">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]">
          {/* Stats — compact horizontal row above applications */}
          <div className="w-full min-w-0 shrink-0">
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-gray-500 sm:text-[10px]">
              Stats
            </p>
            <div className="grid w-full min-w-0 grid-cols-4 gap-1.5 sm:gap-2">
              <div className="flex min-w-0 items-center gap-1.5 rounded-md border border-gray-800 bg-gray-900/50 px-1.5 py-1.5 backdrop-blur-sm sm:gap-2 sm:rounded-lg sm:px-2 sm:py-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-orange-500/20 bg-orange-500/10 sm:h-7 sm:w-7">
                  <Briefcase className="h-3 w-3 text-orange-400 sm:h-3.5 sm:w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-medium uppercase leading-none tracking-wider text-gray-500 sm:text-[9px]">
                    Total
                  </p>
                  <p className="text-sm font-bold leading-none text-white sm:text-base">{applications.length}</p>
                </div>
              </div>
              <div className="flex min-w-0 items-center gap-1.5 rounded-md border border-gray-800 bg-gray-900/50 px-1.5 py-1.5 backdrop-blur-sm sm:gap-2 sm:rounded-lg sm:px-2 sm:py-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-orange-500/20 bg-orange-500/10 sm:h-7 sm:w-7">
                  <div className="h-2.5 w-2.5 rounded bg-orange-400 sm:h-3 sm:w-3" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-medium uppercase leading-none tracking-wider text-gray-500 sm:text-[9px]">
                    Applied
                  </p>
                  <p className="text-sm font-bold leading-none text-white sm:text-base">{statusCounts.applied || 0}</p>
                </div>
              </div>
              <div className="flex min-w-0 items-center gap-1.5 rounded-md border border-gray-800 bg-gray-900/50 px-1.5 py-1.5 backdrop-blur-sm sm:gap-2 sm:rounded-lg sm:px-2 sm:py-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-orange-500/30 bg-orange-500/20 sm:h-7 sm:w-7">
                  <div className="h-2.5 w-2.5 rounded bg-orange-300 sm:h-3 sm:w-3" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-medium uppercase leading-none tracking-wider text-gray-500 sm:text-[9px]">
                    Interview
                  </p>
                  <p className="text-sm font-bold leading-none text-white sm:text-base">{statusCounts.interview || 0}</p>
                </div>
              </div>
              <div className="flex min-w-0 items-center gap-1.5 rounded-md border border-gray-800 bg-gray-900/50 px-1.5 py-1.5 backdrop-blur-sm sm:gap-2 sm:rounded-lg sm:px-2 sm:py-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-green-500/20 bg-green-500/10 sm:h-7 sm:w-7">
                  <div className="h-2.5 w-2.5 rounded bg-green-400 sm:h-3 sm:w-3" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-medium uppercase leading-none tracking-wider text-gray-500 sm:text-[9px]">
                    Offers
                  </p>
                  <p className="text-sm font-bold leading-none text-white sm:text-base">{statusCounts.offer || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Applications — full width */}
          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-1.5 overflow-x-hidden">
        {/* Actions and Filters */}
        <div className="shrink-0">
          <h2 className="mb-3 text-xl font-bold tracking-tight text-white sm:text-2xl">Applications</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 sm:gap-x-5 sm:gap-y-3.5 lg:gap-x-6">
            {/* Status Filter */}
            <div className="relative shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="h-9 pl-3 pr-8 py-0 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none cursor-pointer"
              >
                <option value="all" className="bg-gray-900">All Statuses</option>
                <option value="applied" className="bg-gray-900">Applied</option>
                <option value="interview" className="bg-gray-900">Interview</option>
                <option value="offer" className="bg-gray-900">Offer</option>
                <option value="rejected" className="bg-gray-900">Rejected (Direct)</option>
                <option value="rejected_after_interview" className="bg-gray-900">Rejected (After Interview)</option>
              </select>
              <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            {/* Sort by applied date */}
            <button
              type="button"
              onClick={toggleSortOrder}
              className="flex h-9 items-center gap-2 shrink-0 px-3 bg-gray-900 border border-gray-700 rounded-lg hover:bg-gray-800 hover:border-orange-500/50 text-white text-sm transition-all duration-200"
              title="Sort by applied date"
            >
              {sortOrder === 'desc' && <ArrowDown className="h-4 w-4 text-orange-400" />}
              {sortOrder === 'asc' && <ArrowUp className="h-4 w-4 text-orange-400" />}
              {sortOrder === null && <ArrowUpDown className="h-4 w-4 text-gray-400" />}
              <span className="hidden sm:inline">Date</span>
            </button>
            {/* Date range — same row */}
            <div className="relative shrink-0">
              <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label="Start date"
                title="Start date"
                className="h-9 w-[140px] sm:w-[148px] rounded-lg border border-gray-700 bg-gray-900/50 pl-8 pr-2 text-sm text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="relative shrink-0">
              <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                aria-label="End date"
                title="End date"
                className="h-9 w-[140px] sm:w-[148px] rounded-lg border border-gray-700 bg-gray-900/50 pl-8 pr-2 text-sm text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500"
              />
            </div>
            {(startDate || endDate !== new Date().toISOString().split('T')[0]) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate('')
                  setEndDate(new Date().toISOString().split('T')[0])
                }}
                className="h-9 shrink-0 px-2.5 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg hover:bg-gray-800 hover:border-orange-500/50 transition-all duration-200"
                title="Reset date range"
              >
                Clear dates
              </button>
            )}
            {/* Search: button toggles field */}
            <button
              type="button"
              onClick={() => setSearchOpen((o) => !o)}
              aria-expanded={searchOpen}
              aria-pressed={searchOpen}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 ${
                searchQuery
                  ? 'border-orange-500/50 bg-orange-500/10 text-orange-400'
                  : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-orange-500/50 hover:bg-gray-800'
              } ${searchOpen ? 'ring-2 ring-orange-500/40' : ''}`}
              title={searchOpen ? 'Close search' : 'Search company or position'}
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={openNewModal}
              className="flex h-9 shrink-0 items-center gap-2 px-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all duration-200 font-medium text-sm shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>
          {searchOpen ? (
            <div className="mt-4 flex max-w-xl items-center gap-3">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Company or position…"
                  className="h-9 w-full rounded-lg border border-gray-700 bg-gray-900/80 py-0 pl-9 pr-8 text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-white"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="h-9 shrink-0 px-3 text-sm text-gray-400 hover:text-white"
              >
                Done
              </button>
            </div>
          ) : null}
        </div>

        {/* Applications Table — scrolls inside viewport */}
        {applications.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center backdrop-blur-sm">
            <Briefcase className="mx-auto mb-4 h-14 w-14 text-gray-700" />
            <h3 className="mb-2 text-lg font-semibold text-white">No applications yet</h3>
            <p className="mb-4 text-gray-400">Get started by adding your first job application.</p>
            <div className="flex justify-center">
              <button
                onClick={openNewModal}
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 font-medium text-white shadow-lg shadow-orange-500/20 transition-all duration-200 hover:bg-orange-600"
              >
                <Plus className="h-5 w-5" />
                Add Application
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm min-h-[min(52vh,720px)] sm:min-h-[min(58vh,800px)]">
            <div className="min-h-0 min-w-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
              <table className="w-full min-w-[900px] table-fixed">
                <colgroup>
                  <col className="w-[7%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[11%]" />
                  <col className="w-[10%]" />
                  <col className="w-[11%]" />
                  <col className="w-[30%]" />
                  <col className="w-[7%]" />
                </colgroup>
                <thead className="sticky top-0 z-10 border-b border-gray-800 bg-gray-950/95 backdrop-blur-sm shadow-[0_1px_0_0_rgba(31,41,55,0.9)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Job ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Position</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      <button
                        onClick={toggleSortOrder}
                        className="flex items-center gap-1 hover:text-orange-400 transition-colors"
                      >
                        Applied Date
                        {sortOrder === 'desc' && <ArrowDown className="h-3 w-3 text-orange-400" />}
                        {sortOrder === 'asc' && <ArrowUp className="h-3 w-3 text-orange-400" />}
                        {sortOrder === null && <ArrowUpDown className="h-3 w-3" />}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Notes</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredAndSortedApplications.map((app, index) => (
                    <tr key={app.id} className="hover:bg-gray-900/50 transition-colors group">
                      <td className="px-4 py-3 whitespace-nowrap align-top">
                        <span className="text-xs text-gray-500 font-mono">{app.id.slice(0, 8)}</span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex min-w-0 items-start gap-2">
                          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-500/60" />
                          <span className="text-sm font-medium text-white break-words">{app.company}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="text-sm text-gray-300 break-words">{app.position}</span>
                      </td>
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[app.status]}`}>
                          {statusLabels[app.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 shrink-0 text-orange-500/60" />
                          <span className="text-sm text-gray-400">{new Date(app.appliedDate).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {app.location ? (
                          <div className="flex min-w-0 items-start gap-1.5">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-500/60" />
                            <span className="text-sm text-gray-400 break-words">{app.location}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-sm text-gray-300 whitespace-normal break-words">
                        {app.notes || <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right align-top">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(app)}
                            className="p-2 text-gray-400 transition-all duration-200 hover:bg-gray-800 hover:text-orange-400 rounded-lg"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(app.id)}
                            className="p-2 text-gray-400 transition-all duration-200 hover:bg-gray-800 hover:text-red-400 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredAndSortedApplications.length === 0 && (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-400">No applications match the selected filter.</p>
              </div>
            )}
          </div>
        )}

        {applications.length > 0 ? (
          <div className="min-w-0 max-w-full shrink-0 overflow-x-auto pt-4">
            <SankeyDiagram applications={filteredAndSortedApplications} compact />
          </div>
        ) : null}
          </div>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowModal(false); setEditingApp(null); }}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6 text-white">
              {editingApp ? 'Edit Application' : 'Add New Application'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Company *
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white placeholder-gray-500 transition-all"
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Position *
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white placeholder-gray-500 transition-all"
                  placeholder="Enter position title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as JobApplication['status'] })}
                  className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white transition-all"
                >
                  <option value="applied" className="bg-gray-900">Applied</option>
                  <option value="interview" className="bg-gray-900">Interview</option>
                  <option value="offer" className="bg-gray-900">Offer</option>
                  <option value="rejected" className="bg-gray-900">Rejected (Direct)</option>
                  <option value="rejected_after_interview" className="bg-gray-900">Rejected (After Interview)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Applied Date *
                </label>
                <input
                  type="date"
                  value={formData.appliedDate}
                  onChange={(e) => setFormData({ ...formData, appliedDate: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white placeholder-gray-500 transition-all"
                  placeholder="City, State"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white placeholder-gray-500 transition-all resize-none"
                  placeholder="Add any notes about this application..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium transition-all duration-200 shadow-lg shadow-orange-500/20"
                >
                  {editingApp ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingApp(null)
                  }}
                  className="flex-1 px-6 py-3 border border-gray-700 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
