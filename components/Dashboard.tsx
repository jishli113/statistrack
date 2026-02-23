'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Briefcase, Building2, Calendar, MapPin, Trash2, Edit2, ArrowUpDown, ArrowUp, ArrowDown, Filter, Search } from 'lucide-react'

interface DashboardProps {
  onSignOut?: () => void
}

interface JobApplication {
  id: string
  company: string
  position: string
  status: 'applied' | 'interview' | 'offer' | 'rejected'
  appliedDate: string
  location?: string
  notes?: string
}

const statusColors = {
  applied: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  interview: 'bg-orange-500/30 text-orange-300 border border-orange-500/40',
  offer: 'bg-green-500/20 text-green-400 border border-green-500/30',
  rejected: 'bg-gray-700/50 text-gray-400 border border-gray-600/50',
}

const statusLabels = {
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
}

// Mock data for demonstration
const mockApplications: JobApplication[] = [
  {
    id: 'mock-1',
    company: 'Google',
    position: 'Software Engineer',
    status: 'interview',
    appliedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    location: 'Mountain View, CA',
    notes: 'Technical interview scheduled for next week. Focus on algorithms and system design.',
  },
  {
    id: 'mock-2',
    company: 'Microsoft',
    position: 'Full Stack Developer',
    status: 'applied',
    appliedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    location: 'Seattle, WA',
    notes: 'Applied through company website. Waiting for response.',
  },
  {
    id: 'mock-3',
    company: 'Apple',
    position: 'iOS Developer',
    status: 'offer',
    appliedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    location: 'Cupertino, CA',
    notes: 'Received offer! $150k base + stock options. Considering...',
  },
  {
    id: 'mock-4',
    company: 'Amazon',
    position: 'Cloud Solutions Architect',
    status: 'rejected',
    appliedDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    location: 'Seattle, WA',
    notes: 'Not selected after final round. Will reapply in 6 months.',
  },
  {
    id: 'mock-5',
    company: 'Meta',
    position: 'Frontend Engineer',
    status: 'interview',
    appliedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    location: 'Menlo Park, CA',
    notes: 'Passed phone screen. On-site interview next month.',
  },
]

type SortOrder = 'asc' | 'desc' | null
type StatusFilter = 'all' | JobApplication['status']

export default function Dashboard({ onSignOut }: DashboardProps = {}) {
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [showMockData, setShowMockData] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc') // Default: newest first
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
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
  }, [])

  const loadMockData = () => {
    setApplications(mockApplications)
    setShowMockData(true)
  }

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/applications')
      if (res.ok) {
        const data = await res.json()
        setApplications(data)
        // If no real data and mock data is showing, keep mock data
        if (data.length === 0 && showMockData) {
          setApplications(mockApplications)
        } else if (data.length > 0) {
          setShowMockData(false)
        }
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error)
      // On error, show mock data if enabled
      if (showMockData) {
        setApplications(mockApplications)
      }
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
        body: JSON.stringify(formData),
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
      appliedDate: app.appliedDate,
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

  const statusCounts = applications.reduce((acc, app) => {
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
      filtered = filtered.filter(app => app.status === statusFilter)
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
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-lg border-b border-gray-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Job Tracker</h1>
            <p className="text-sm text-gray-400 mt-1">
              Professional Application Management
            </p>
          </div>
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white border border-gray-800 rounded-lg hover:bg-gray-900/50 hover:border-orange-500/50 transition-all duration-200"
            >
              Sign Out
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 p-6 hover:border-orange-500/30 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <Briefcase className="h-6 w-6 text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Total</p>
                <p className="text-3xl font-bold text-white mt-1">{applications.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 p-6 hover:border-orange-500/30 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <div className="h-6 w-6 bg-orange-400 rounded"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Applied</p>
                <p className="text-3xl font-bold text-white mt-1">{statusCounts.applied || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 p-6 hover:border-orange-500/30 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-3 bg-orange-500/20 rounded-lg border border-orange-500/30">
                <div className="h-6 w-6 bg-orange-300 rounded"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Interview</p>
                <p className="text-3xl font-bold text-white mt-1">{statusCounts.interview || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 p-6 hover:border-green-500/30 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="h-6 w-6 bg-green-400 rounded"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Offers</p>
                <p className="text-3xl font-bold text-white mt-1">{statusCounts.offer || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Applications</h2>
              {showMockData && (
                <p className="text-sm text-gray-400">
                  Showing sample data • <button onClick={() => { setApplications([]); setShowMockData(false); }} className="text-orange-400 hover:text-orange-300 underline transition-colors">Clear</button>
                </p>
              )}
            </div>
            <div className="flex gap-3 items-center">
            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none cursor-pointer pr-8"
              >
                <option value="all" className="bg-gray-900">All Statuses</option>
                <option value="applied" className="bg-gray-900">Applied</option>
                <option value="interview" className="bg-gray-900">Interview</option>
                <option value="offer" className="bg-gray-900">Offer</option>
                <option value="rejected" className="bg-gray-900">Rejected</option>
              </select>
              <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            {/* Sort Button */}
            <button
              onClick={toggleSortOrder}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg hover:bg-gray-800 hover:border-orange-500/50 text-white text-sm transition-all duration-200"
              title="Sort by date"
            >
              {sortOrder === 'desc' && <ArrowDown className="h-4 w-4 text-orange-400" />}
              {sortOrder === 'asc' && <ArrowUp className="h-4 w-4 text-orange-400" />}
              {sortOrder === null && <ArrowUpDown className="h-4 w-4 text-gray-400" />}
              <span className="hidden sm:inline">Date</span>
            </button>
            {/* Add Button */}
            <button
              onClick={openNewModal}
              className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all duration-200 font-medium shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by company or position..."
              className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* Date Range Filter */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 sm:flex-none sm:w-48">
              <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                />
              </div>
            </div>
            <div className="flex-1 sm:flex-none sm:w-48">
              <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                />
              </div>
            </div>
            {(startDate || endDate !== new Date().toISOString().split('T')[0]) && (
              <button
                onClick={() => {
                  setStartDate('')
                  setEndDate(new Date().toISOString().split('T')[0])
                }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg hover:bg-gray-800 hover:border-orange-500/50 transition-all duration-200"
              >
                Clear Dates
              </button>
            )}
          </div>
        </div>

        {/* Applications Table */}
        {applications.length === 0 ? (
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 p-12 text-center">
            <Briefcase className="h-16 w-16 text-gray-700 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-white mb-2">No applications yet</h3>
            <p className="text-gray-400 mb-6">Get started by adding your first job application or view sample data</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={openNewModal}
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all duration-200 font-medium shadow-lg shadow-orange-500/20"
              >
                <Plus className="h-5 w-5" />
                Add Application
              </button>
              <button
                onClick={loadMockData}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 border border-gray-700 hover:border-orange-500/50 transition-all duration-200"
              >
                <Briefcase className="h-5 w-5" />
                View Sample Data
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/80 border-b border-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Job ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Position</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
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
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Notes</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredAndSortedApplications.map((app, index) => (
                    <tr key={app.id} className="hover:bg-gray-900/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500 font-mono">{app.id.slice(0, 8)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 mr-2 text-orange-500/60" />
                          <span className="text-sm font-medium text-white">{app.company}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-300">{app.position}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${statusColors[app.status]}`}>
                          {statusLabels[app.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-orange-500/60" />
                          <span className="text-sm text-gray-400">{new Date(app.appliedDate).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {app.location ? (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-orange-500/60" />
                            <span className="text-sm text-gray-400">{app.location}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-400 line-clamp-1 max-w-xs">{app.notes || '—'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(app)}
                            className="p-2 text-gray-400 hover:text-orange-400 hover:bg-gray-800 rounded-lg transition-all duration-200"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(app.id)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-all duration-200"
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
              <div className="px-6 py-12 text-center">
                <p className="text-gray-400">No applications match the selected filter.</p>
              </div>
            )}
          </div>
        )}
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
                  <option value="rejected" className="bg-gray-900">Rejected</option>
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
