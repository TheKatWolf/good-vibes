import { useState, useEffect, useCallback } from 'react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts'
import { db } from './firebase'
import cityLogo from './assets/cityofmontgomery.png'
import './App.css'

const DATE_RANGES = [
  { id: '7', label: 'Last 7 Days', workforce: 8, ripple: 3 },
  { id: '30', label: 'Last 30 Days', workforce: 31, ripple: 11 },
  { id: '90', label: 'Last 90 Days', workforce: 58, ripple: 24 },
  { id: 'all', label: 'All Time', workforce: 194, ripple: 34 },
]

const WORKFORCE_TREND = [18, 24, 31, 38, 49, 58, 65, 73]
const RIPPLE_TREND = [5, 8, 11, 14, 18, 22, 28, 34]
const TREND_LABELS = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']

const FALLBACK_JOBS = [
  { title: 'Lead Software Engineer', company: 'Tyler Technologies', location: 'Montgomery, AL', posted: '7 hours ago', type: 'Full-time' },
  { title: 'Enterprise Data Architect - AI & Cloud', company: 'St. George Tanaq Corporation', location: 'Montgomery, AL', posted: '2 weeks ago', type: 'Full-time' },
  { title: 'Cloud Engineer', company: 'TechFlow, Inc.', location: 'Montgomery, AL', posted: '2 months ago', type: 'Full-time' },
  { title: 'Senior IT Infrastructure Engineer', company: 'EDB', location: 'Montgomery, AL', posted: '3 weeks ago', type: 'Full-time' },
  { title: 'Cloud Services Engineer', company: 'PGTEK', location: 'Montgomery, AL', posted: '4 weeks ago', type: 'Full-time' },
  { title: 'Manager of Cybersecurity', company: 'Hyundai Motor Company', location: 'Montgomery, AL', posted: '3 weeks ago', type: 'Full-time' },
  { title: 'Network Security Engineer', company: 'Peregrine Technical Solutions', location: 'Montgomery, AL', posted: '1 week ago', type: 'Full-time' },
  { title: 'Senior Data Engineer', company: 'St. George Tanaq Corporation', location: 'Montgomery, AL', posted: '5 days ago', type: 'Full-time' },
  { title: 'Solution Architect', company: 'Pearson', location: 'Montgomery, AL', posted: '20 hours ago', type: 'Full-time' },
  { title: 'IT Network Technician', company: 'Hyundai AutoEver America', location: 'Montgomery, AL', posted: '1 week ago', type: 'Full-time' },
  { title: 'System Administrator II', company: 'Sumaria Systems LLC', location: 'Montgomery, AL', posted: '1 day ago', type: 'Full-time' },
  { title: 'Cybersecurity Principal', company: 'Torch Technologies Inc.', location: 'Montgomery, AL', posted: '2 weeks ago', type: 'Full-time' },
]

const JOBS_VISIBLE_INITIAL = 9
const API_BASE = import.meta.env.VITE_API_BASE ?? ''
const STATUS_POLL_INTERVAL_MS = 5000
const STATUS_POLL_TIMEOUT_MS = 3 * 60 * 1000

function normalizeJob(raw) {
  return {
    title: raw.job_title ?? raw.title ?? '',
    company: raw.company_name ?? raw.company ?? '',
    location: raw.job_location ?? raw.location ?? 'Montgomery, AL',
    posted: raw.job_posted_time ?? raw.posted ?? '',
    type: raw.job_employment_type ?? raw.type ?? 'Full-time',
  }
}

function useCountUp(target) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    if (target == null || !Number.isFinite(target)) {
      setDisplayed(0)
      return
    }
    let start = 0
    const end = target
    const duration = 1500
    const increment = end / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= end) {
        setDisplayed(end)
        clearInterval(timer)
      } else {
        setDisplayed(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target])

  return displayed
}

function App() {
  const [dateRangeId, setDateRangeId] = useState('30')
  const [jobsVisible, setJobsVisible] = useState(JOBS_VISIBLE_INITIAL)
  const [jobsList, setJobsList] = useState(FALLBACK_JOBS)
  const [syncedTotalCount, setSyncedTotalCount] = useState(null)
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [syncStatus, setSyncStatus] = useState('idle') // idle | syncing | success | error
  const [syncError, setSyncError] = useState(null)
  const [syncPhase, setSyncPhase] = useState('')
  const [unemploymentRate, setUnemploymentRate] = useState(null)
  const [montgomeryLicenseData, setMontgomeryLicenseData] = useState(null)
  const [salaryData, setSalaryData] = useState(null)
  const [wagesData, setWagesData] = useState(null)
  const [synthesisText, setSynthesisText] = useState(null)
  const [synthesisLoading, setSynthesisLoading] = useState(true)
  const [constructionData, setConstructionData] = useState(null)

  const [fredLoaded, setFredLoaded] = useState(false)
  const [montLoaded, setMontLoaded] = useState(false)
  const [salaryLoaded, setSalaryLoaded] = useState(false)
  const [wagesLoaded, setWagesLoaded] = useState(false)
  const [synthesisLoaded, setSynthesisLoaded] = useState(false)
  const [constructionLoaded, setConstructionLoaded] = useState(false)

  const formatLastUpdated = (iso) => {
    if (!iso) return null
    const d = new Date(iso)
    if (!Number.isFinite(d.getTime())) return null
    return d.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }

  const currentRange = DATE_RANGES.find((r) => r.id === dateRangeId) ?? DATE_RANGES[1]
  const workforceTotal = 194
  const rippleTarget = 60
  const maxTrend = Math.max(...WORKFORCE_TREND)
  const maxRippleTrend = Math.max(...RIPPLE_TREND)
  const hasSyncedData = syncedTotalCount != null
  const liveTotalJobs = salaryData?.totalJobs ?? null
  const workforceDisplayNumber = hasSyncedData ? syncedTotalCount : (liveTotalJobs ?? currentRange.workforce)
  const heroJobsCount = syncedTotalCount ?? liveTotalJobs ?? 194

  const investment2026Cost = constructionData?.fy2026?.totalCost ?? null
  const investment2025Cost = constructionData?.fy2025?.totalCost ?? null
  const totalFilteredJobs = salaryData?.totalJobs ?? null

  const displayedInvestmentB = useCountUp(1630)
  const displayedUnemploymentTenth = useCountUp(unemploymentRate != null ? Math.round(parseFloat(unemploymentRate) * 10) : null)
  const displayedLicenses2026 = useCountUp(montgomeryLicenseData?.licenses2026 != null ? Number(montgomeryLicenseData.licenses2026) : null)
  const displayedPremiumPercent = useCountUp(salaryData?.premiumPercent != null ? Number(salaryData.premiumPercent) : null)
  const displayedConstructionM = useCountUp(875)
  const displayedPermits = useCountUp(constructionData?.fy2026?.permitCount != null ? Number(constructionData.fy2026.permitCount) : null)
  const displayedRecentJobs = useCountUp(salaryData?.recentJobs != null ? Number(salaryData.recentJobs) : null)
  const displayedAvgSalaryK = useCountUp(salaryData?.avgSalary != null ? Math.round(Number(salaryData.avgSalary) / 1000) : null)
  const displayedDegreeJobs = useCountUp(salaryData?.degreeJobs != null ? Number(salaryData.degreeJobs) : null)
  const displayedTotalJobs = useCountUp(totalFilteredJobs != null ? Number(totalFilteredJobs) : null)

  const constructionTrend = [
    { year: '2023', value: 289 },
    { year: '2024', value: 1260 },
    { year: '2025', value: 431 },
    { year: '2026', value: 875 },
  ]

  const fmtConstructionValue = (v) => {
    if (v == null || !Number.isFinite(v)) return '--'
    if (v >= 1000) return `$${(v / 1000).toFixed(2)}B`
    return `$${Math.round(v)}M`
  }

  const distributionDots = (() => {
    const jobs = Array.isArray(salaryData?.allJobs) ? salaryData.allJobs : []
    const mids = jobs
      .map((j) => {
        const s = j?.salary
        const min = s?.min_amount
        const max = s?.max_amount
        if (!Number.isFinite(min) || !Number.isFinite(max) || max <= 1000) return null
        return (min + max) / 2
      })
      .filter((n) => n != null)

    if (!mids.length) return []
    const minV = Math.min(...mids)
    const maxV = Math.max(...mids)
    const denom = maxV - minV || 1

    return mids
      .slice(0, 28)
      .map((v) => Math.max(0, Math.min(100, ((v - minV) / denom) * 100)))
  })()

  const jobFeed = (salaryData?.allJobs && salaryData.allJobs.length > 0) ? salaryData.allJobs : jobsList
  const visibleJobs = jobFeed.slice(0, jobsVisible)
  const hasMoreJobs = jobsVisible < jobFeed.length

  // Firestore listener: most recent job_syncs doc
  useEffect(() => {
    const q = query(
      collection(db, 'job_syncs'),
      orderBy('synced_at', 'desc'),
      limit(1)
    )
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0]
          const data = doc.data()
          const jobs = (data.jobs ?? []).map(normalizeJob).filter((j) => j.title)
          if (jobs.length > 0) {
            setJobsList(jobs)
            setSyncedTotalCount(data.total_count ?? jobs.length)
            const at = data.synced_at
            if (at?.toDate) setLastSyncedAt(at.toDate())
            else if (at) setLastSyncedAt(new Date(at))
          }
        }
      },
      (err) => console.warn('Firestore job_syncs listener error:', err)
    )
    return () => unsub()
  }, [])

  useEffect(() => {
    const loadFred = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/fred`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load FRED data')
        setUnemploymentRate(data.rate)
      } catch {
        setUnemploymentRate(null)
      } finally {
        setFredLoaded(true)
      }
    }
    loadFred()
  }, [])

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/status`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load status')
        const formatted = formatLastUpdated(data.lastSyncTime)
        if (formatted) setLastUpdated(formatted)
      } catch {
        // leave lastUpdated as-is
      }
    }
    loadStatus()
  }, [])

  useEffect(() => {
    const loadMontgomery = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/montgomery`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load Montgomery data')
        setMontgomeryLicenseData(data)
      } catch {
        setMontgomeryLicenseData(null)
      } finally {
        setMontLoaded(true)
      }
    }
    loadMontgomery()
  }, [])

  useEffect(() => {
    const loadSalary = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/salary`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load salary data')
        setSalaryData(data)
      } catch {
        setSalaryData(null)
      } finally {
        setSalaryLoaded(true)
      }
    }
    loadSalary()
  }, [])

  useEffect(() => {
    const loadWages = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/wages`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load wages data')
        setWagesData(data)
      } catch {
        setWagesData(null)
      } finally {
        setWagesLoaded(true)
      }
    }
    loadWages()
  }, [])

  useEffect(() => {
    const loadSynthesis = async () => {
      setSynthesisLoading(true)
      try {
        const res = await fetch(`${API_BASE}/api/synthesis`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load synthesis')
        setSynthesisText(data.synthesis)
      } catch {
        setSynthesisText("Montgomery's data center investment is generating measurable economic signals — 55+ tech roles tracked at an average salary of $141K, 171% above the local median, alongside $875M in commercial construction activity in the first 5 months of 2026.")
      } finally {
        setSynthesisLoading(false)
        setSynthesisLoaded(true)
      }
    }
    loadSynthesis()
  }, [])

  useEffect(() => {
    const loadConstruction = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/construction`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load construction data')
        setConstructionData(data)
      } catch {
        setConstructionData(null)
      } finally {
        setConstructionLoaded(true)
      }
    }
    loadConstruction()
  }, [])

  useEffect(() => {
    if (!fredLoaded || !montLoaded || !salaryLoaded || !wagesLoaded || !synthesisLoaded || !constructionLoaded) return
  }, [fredLoaded, montLoaded, salaryLoaded, wagesLoaded, synthesisLoaded, constructionLoaded])

  const fmtMoney0 = (n) => {
    if (n == null || !Number.isFinite(n)) return '--'
    return `$${Math.round(n).toLocaleString('en-US')}`
  }

  const fmtAnnualK = ({ weekly, annual }) => {
    const w = weekly != null ? Number(weekly) : null
    const a = annual != null ? Number(annual) : null
    const derivedAnnual = Number.isFinite(w) ? w * 52 : (Number.isFinite(a) ? a : null)
    if (derivedAnnual == null) return '--'
    return `~$${Math.round(derivedAnnual / 1000)}K`
  }

  const runSync = useCallback(async () => {
    setSyncStatus('syncing')
    setSyncError(null)
    setSyncPhase('Syncing...')

    try {
      const statusRes = await fetch(`${API_BASE}/api/status`)
      const statusData = await statusRes.json()
      const prevLastSyncTime = statusRes.ok ? statusData.lastSyncTime : null

      const syncRes = await fetch(`${API_BASE}/api/sync`, { method: 'POST' })
      const syncData = await syncRes.json()
      if (!syncRes.ok) throw new Error(syncData.error || 'Sync trigger failed')

      if (syncData.status === 'already_syncing') {
        setSyncPhase('Sync already running...')
      }

      const pollStart = Date.now()
      while (Date.now() - pollStart < STATUS_POLL_TIMEOUT_MS) {
        const pollRes = await fetch(`${API_BASE}/api/status`)
        const pollData = await pollRes.json()
        if (!pollRes.ok) throw new Error(pollData.error || 'Status poll failed')

        if (pollData.lastSyncTime && pollData.lastSyncTime !== prevLastSyncTime) {
          const formatted = formatLastUpdated(pollData.lastSyncTime)
          if (formatted) setLastUpdated(formatted)

          try {
            const res = await fetch(`${API_BASE}/api/salary`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to load salary data')
            setSalaryData(data)
          } catch {
            setSalaryData(null)
          }

          setSyncStatus('success')
          setSyncPhase('Updated!')
          setTimeout(() => {
            setSyncStatus('idle')
            setSyncPhase('')
          }, 3000)
          return
        }

        setSyncPhase('Syncing...')
        await new Promise((r) => setTimeout(r, STATUS_POLL_INTERVAL_MS))
      }

      setSyncPhase('Running in background...')
    } catch (err) {
      setSyncError(err.message || 'Sync failed')
      setSyncStatus('error')
    }
  }, [jobsList])

  const formatLastSynced = (d) => {
    if (!d) return null
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const syncBtnClass = [
    'sync-btn',
    syncStatus === 'syncing' && 'syncing',
    syncStatus === 'success' && 'success',
    syncStatus === 'error' && 'error',
  ].filter(Boolean).join(' ')

  const syncButtonLabel =
    syncStatus === 'syncing'
      ? syncPhase || 'Syncing...'
      : syncStatus === 'success'
        ? 'Live Data Updated'
        : syncStatus === 'error'
          ? 'Sync Failed'
          : 'Sync Live Engine'

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="brand-wrap" aria-label="Montgomery Data Center Transparency Gap">
            <img
              className="brand-logo"
              src={cityLogo}
              alt="City of Montgomery"
              loading="lazy"
              decoding="async"
            />
            <div className="brand">
              <div className="brand-line brand-line-1">MONTGOMERY</div>
              <div className="brand-line brand-line-2">DATA CENTER</div>
              <div className="brand-line brand-line-3">TRANSPARENCY GAP</div>
            </div>
          </div>
          <div className="header-right">
            <span className="header-muted">Last updated: {lastUpdated ?? '--'}</span>
          </div>
        </div>
      </header>

      <div className="container">
        <main>
        <section className="hero">
          <p className="hero-kicker">CITY ECONOMIC ENGINE (CEE)</p>
          <h1>TRACKING THE PROMISES</h1>
          <div className="hero-divider" aria-hidden />
          <div className="hero-stats">
            <div className="hero-stat">
              <p className="hero-stat-value font-mono">{`$${(displayedInvestmentB / 1000).toFixed(2)}B`}</p>
              <p className="hero-stat-label">Total Investment Committed by</p>
              <p className="hero-stat-label">Meta, AWS, DC BLOX</p>
            </div>
            <div className="hero-stat">
              <p className="hero-stat-value font-mono">
                {salaryData?.avgSalary && salaryData?.totalJobs
                  ? `$${((salaryData.avgSalary * salaryData.totalJobs) / 1000000).toFixed(1)}M`
                  : '--'}
              </p>
              <p className="hero-stat-label">VERIFIED ANNUAL PAYROLL</p>
              <p className="hero-stat-subtitle source-line">Source: Bright Data · Live job data</p>
            </div>
            <div className="hero-stat">
              <p className="hero-stat-value font-mono">{montgomeryLicenseData?.licenses2026 != null ? displayedLicenses2026.toLocaleString('en-US') : '--'}</p>
              <p className="hero-stat-label">New Business Licenses (2026)</p>
              <p className="hero-stat-subtitle source-line">Source: Montgomery Open Data · Live</p>
            </div>
          </div>
        </section>

        <section className="cards-grid top-cards">
          <div className="card card--feature workforce-card">
            <div className="card-header">
              <div>
                <div className="card-title">WORKFORCE VITALITY</div>
                <p className="card-stats card-subline" style={{ margin: '8px 0 0' }}>Promise: Add 100 new high-quality jobs</p>
              </div>
            </div>
            <div className="workforce-salary-compare" aria-label="Salary comparison">
              <div className="card-section-label card-section-label--prominent">SALARY COMPARISON</div>

              <div className="salary-bar-row">
                <div className="salary-bar-left">Montgomery Median</div>
                <div className="salary-bar-track" aria-hidden>
                  <div
                    className="salary-bar-fill salary-bar-fill-mont"
                    style={{
                      width: salaryData?.avgSalary
                        ? `${Math.round((52000 / salaryData.avgSalary) * 100)}%`
                        : '34%'
                    }}
                  />
                </div>
                <div className="salary-bar-right font-mono">$52K</div>
              </div>

              <div className="salary-bar-row">
                <div className="salary-bar-left">Data Center Avg</div>
                <div className="salary-bar-track" aria-hidden>
                  <div className="salary-bar-fill salary-bar-fill-gold" style={{ width: '100%' }} />
                </div>
                <div className="salary-bar-right font-mono">
                  {salaryData?.avgSalary ? `$${Math.round(salaryData.avgSalary / 1000)}K` : '--'}
                </div>
              </div>

              <p className="workforce-premium-line">
                <span className="workforce-premium-number font-mono">{salaryData?.premiumPercent != null ? `${Math.round(Number(salaryData.premiumPercent))}%` : '--'}</span>
                <span className="workforce-premium-text"> above Montgomery median income</span>
              </p>
            </div>

            <div className="workforce-spotlight" aria-label="Meta spotlight">
              <div className="card-section-label">TOP POSTING</div>
              <p className="spotlight-company">Meta</p>
              <p className="spotlight-title">Data Center Network Engineer</p>
              <p className="spotlight-salary font-mono">$193K – $271K</p>
              <p className="spotlight-tag">Highest paying tracked role</p>
            </div>

            {/* Payroll Progress — Option C */}
            <div style={{ marginTop: '20px', marginBottom: '12px' }}>
              <p style={{ color: '#8A9BB5', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px', fontFamily: 'DM Sans' }}>
                Annual Payroll Progress
              </p>

              {/* Two number callout */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
                <div>
                  <div style={{ color: '#C9A84C', fontSize: '28px', fontFamily: 'DM Mono', fontWeight: 'bold', lineHeight: 1 }}>
                    ${salaryData?.avgSalary && salaryData?.totalJobs
                      ? ((salaryData.avgSalary * salaryData.totalJobs) / 1000000).toFixed(1)
                      : '--'}M
                  </div>
                  <div style={{ color: '#F0EDE6', fontSize: '11px', fontFamily: 'DM Sans', marginTop: '4px' }}>
                    verified today
                  </div>
                </div>

                {/* Percentage in the middle */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#F0EDE6', fontSize: '13px', fontFamily: 'DM Mono' }}>
                    {salaryData?.avgSalary && salaryData?.totalJobs
                      ? `${Math.round((salaryData.totalJobs / 100) * 100)}%`
                      : '--%'}
                  </div>
                  <div style={{ color: '#8A9BB5', fontSize: '10px', fontFamily: 'DM Sans', marginTop: '2px' }}>
                    of promise
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#F0EDE6', fontSize: '28px', fontFamily: 'DM Mono', fontWeight: 'bold', lineHeight: 1 }}>
                    ${salaryData?.avgSalary
                      ? ((salaryData.avgSalary * 100) / 1000000).toFixed(1)
                      : '--'}M
                  </div>
                  <div style={{ color: '#F0EDE6', fontSize: '11px', fontFamily: 'DM Sans', marginTop: '4px' }}>
                    promised goal
                  </div>
                </div>
              </div>

              {/* Single progress bar */}
              <div style={{ background: '#1A2F4A', borderRadius: '4px', height: '8px', width: '100%', position: 'relative' }}>
                {/* Gold filled portion */}
                <div style={{
                  background: 'linear-gradient(90deg, #C9A84C, #E8C46A)',
                  borderRadius: '4px',
                  height: '8px',
                  width: salaryData?.totalJobs
                    ? `${Math.min((salaryData.totalJobs / 100) * 100, 100)}%`
                    : '0%',
                  transition: 'width 0.6s ease'
                }} />
                {/* Goal marker line at 100% */}
                <div style={{
                  position: 'absolute',
                  right: '0',
                  top: '-4px',
                  width: '2px',
                  height: '16px',
                  background: '#F0EDE6',
                  opacity: 0.4,
                  borderRadius: '1px'
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                <span style={{ color: '#8A9BB5', fontSize: '10px', fontFamily: 'DM Sans' }}>
                  {salaryData?.totalJobs ?? '--'} jobs tracked
                </span>
                <span style={{ color: '#8A9BB5', fontSize: '10px', fontFamily: 'DM Sans' }}>
                  100 jobs promised
                </span>
              </div>
            </div>

            <p className="card-stats source-line">
              Source: Bright Data · LinkedIn + Indeed · {salaryData?.jobsWithSalary != null ? salaryData.jobsWithSalary : '--'} of {salaryData?.totalJobs ?? '--'} jobs include salary data
            </p>
          </div>

          <div className="card card--feature ripple-card">
            <div className="card-header">
              <div>
                <div className="card-title">ECONOMIC RIPPLE EFFECT</div>
                <p className="card-stats card-subline" style={{ margin: '8px 0 0' }}>Promise: Drive Montgomery&apos;s business growth</p>
              </div>
            </div>
            <p className="card-big-number card-anchor-number font-mono" style={{ marginTop: 6 }}>{`$${displayedConstructionM}M`}</p>
            <p className="card-label">Commercial construction investment in 2026</p>

            <div style={{ marginTop: 14 }}>
              <div className="card-section-label card-section-label--prominent" style={{ marginBottom: 10 }}>
                COMMERCIAL CONSTRUCTION YEAR COMPARISON
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                    <p className="card-stats" style={{ margin: 0, opacity: 0.9 }}>FY2025 (full year)</p>
                    <p className="card-stats bar-value" style={{ margin: 0 }}>{constructionData?.fy2025?.formatted ?? '$648.5M'}</p>
                  </div>
                  <div className="year-bar-track" aria-hidden>
                    <div className="year-bar-fill year-bar-fill--compare" style={{ width: '74%' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                    <p className="card-stats" style={{ margin: 0, opacity: 0.9 }}>FY2026 (5 months)</p>
                    <p className="card-stats bar-value" style={{ margin: 0 }}>{constructionData?.fy2026?.formatted ?? '$879.9M'}</p>
                  </div>
                  <div className="year-bar-track" aria-hidden>
                    <div className="year-bar-fill year-bar-fill--primary" style={{ width: '100%' }}>
                      <span className="bar-growth-badge">▲36%</span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="card-stats" style={{ marginTop: 10, opacity: 0.85 }}>
                On pace for {constructionData?.pacedFormatted ?? '--'} this fiscal year
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
              <div>
                <p className="support-stat-number font-mono" style={{ marginBottom: 6 }}>{constructionData?.fy2026?.permitCount != null ? displayedPermits : '--'}</p>
                <p className="card-stats">commercial permits</p>
              </div>
              <div>
                <p className="support-stat-number font-mono" style={{ marginBottom: 6 }}>{montgomeryLicenseData?.licenses2026 != null ? displayedLicenses2026 : '--'}</p>
                <p className="card-stats">new business licenses (2026)</p>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div className="card-section-label card-section-label--prominent" style={{ color: '#8A9BB5', textAlign: 'center' }}>CONSTRUCTION INVESTMENT TREND</div>
              <div className="sparkline-wrap" style={{ width: '100%', height: 100, marginTop: 8 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={constructionTrend} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                    <XAxis
                      dataKey="year"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#8A9BB5', fontSize: 11 }}
                      height={18}
                    />
                    <Tooltip
                      cursor={false}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const p = payload[0]?.payload
                        const year = p?.year
                        const value = fmtConstructionValue(p?.value)
                        return (
                          <div
                            style={{
                              background: '#0D1B2E',
                              border: '1px solid #1A2F4A',
                              color: '#C9A84C',
                              fontFamily: 'DM Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                              fontSize: 12,
                              padding: '8px 10px',
                              borderRadius: 10,
                            }}
                          >
                            {year} · {value}
                          </div>
                        )
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#4A9EFF"
                      strokeWidth={2}
                      fill="#4A9EFF"
                      fillOpacity={0.08}
                      dot={{ r: 3, fill: '#4A9EFF', stroke: '#4A9EFF' }}
                      activeDot={{ r: 4, fill: '#4A9EFF', stroke: '#4A9EFF' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <p className="card-stats source-line" style={{ marginTop: 12 }}>Source: Bright Data · Montgomery Open Data · Live · Fiscal year Oct–Sep</p>
          </div>
        </section>

        <section className="cards-grid" style={{ marginTop: 0 }}>
          <div className="card card-full">
            <div className="card-header">
              <span className="card-badge synthesis">
                LIVE AI SYNTHESIS
              </span>
            </div>

            {synthesisLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 90 }}>
                <span className="sync-spinner" aria-hidden />
                <p className="card-stats" style={{ margin: 0 }}>Generating synthesis…</p>
              </div>
            ) : (
              <div className={['synthesis-body', synthesisText ? '' : 'synthesis-body-empty'].filter(Boolean).join(' ')} style={{ minHeight: synthesisText ? 90 : 60 }}>
                <p className={['synthesis-text', synthesisText ? '' : 'synthesis-unavailable'].filter(Boolean).join(' ')} style={{ margin: 0 }}>
                  {synthesisText ?? 'Live synthesis unavailable.'}
                </p>
                {!synthesisText && (
                  <p className="synthesis-empty-note">Signal summary will appear here when the engine refreshes.</p>
                )}
              </div>
            )}

            <p className="powered-by source-line" style={{ marginTop: synthesisText ? 12 : 8 }}>Powered by Claude</p>
          </div>
        </section>

        <section className="date-range">
          <p className="date-range-label">Date range</p>
          <div className="date-range-btns">
            {DATE_RANGES.map((range) => (
              <button
                key={range.id}
                type="button"
                className={`date-btn ${dateRangeId === range.id ? 'active' : ''}`}
                onClick={() => setDateRangeId(range.id)}
              >
                {range.label}
              </button>
            ))}
          </div>
        </section>

        <section className="cards-grid" style={{ marginTop: 0 }}>
          <div className="job-stats-bar card-full" role="group" aria-label="Live job stats">
            <div className="job-stat">
              <span className="job-stat-number font-mono">{salaryData?.recentJobs != null ? displayedRecentJobs : '--'}</span>
              <span className="job-stat-label">NEW JOBS THIS WEEK</span>
            </div>
            <div className="job-stat-divider" aria-hidden />
            <div className="job-stat">
              <span className="job-stat-number font-mono">{salaryData?.avgSalary != null ? `$${displayedAvgSalaryK}K` : '--'}</span>
              <span className="job-stat-label">AVG SALARY</span>
            </div>
            <div className="job-stat-divider" aria-hidden />
            <div className="job-stat">
              <span className="job-stat-number font-mono">{salaryData?.degreeJobs != null ? `${displayedDegreeJobs}` : '--'}</span>
              <span className="job-stat-label">jobs that REQUIRE DEGREE</span>
            </div>
          </div>
        </section>

        <section className="cards-grid" style={{ marginTop: 0 }}>
          <div className="card card-full wage-card">
            <div className="card-header">
              <span className="card-badge wage">WAGE INTELLIGENCE</span>
            </div>

            <p className="card-label" style={{ marginBottom: 20 }}>
              How data center salaries compare to Montgomery, Alabama, and the U.S. annually.
            </p>

            <div className="wage-grid" role="group" aria-label="Wage comparisons">
              <div className="wage-row">
                <span className="wage-name">Montgomery</span>
                <span className="wage-value-wrap">
                  <span className="wage-annual font-mono">{fmtAnnualK({ weekly: wagesData?.montgomery?.weekly, annual: wagesData?.montgomery?.annual })}</span>
                  <span className="wage-unit">annual salary</span>
                </span>
              </div>
              <div className="wage-row">
                <span className="wage-name">Alabama</span>
                <span className="wage-value-wrap">
                  <span className="wage-annual font-mono">{fmtAnnualK({ weekly: wagesData?.alabama?.weekly, annual: wagesData?.alabama?.annual })}</span>
                  <span className="wage-unit">annual salary</span>
                </span>
              </div>
              <div className="wage-row">
                <span className="wage-name">National</span>
                <span className="wage-value-wrap">
                  <span className="wage-annual font-mono">{fmtAnnualK({ weekly: wagesData?.national?.weekly, annual: wagesData?.national?.annual })}</span>
                  <span className="wage-unit">annual salary</span>
                </span>
              </div>
            </div>

            <div className="wage-premium" aria-label="Premium vs benchmarks">
              <div className="wage-premium-stat">
                <span className="wage-premium-label">DATA CENTER JOB AVG</span>
                <span className="wage-premium-value font-mono">{salaryData?.avgSalary != null ? `$${Math.round(Number(salaryData.avgSalary) / 1000)}K` : '--'}</span>
              </div>
              <div className="wage-premium-stat">
                <span className="wage-premium-label">VS NATIONAL</span>
                <span className="wage-premium-value font-mono">
                  {(() => {
                    const avg = salaryData?.avgSalary != null ? Number(salaryData.avgSalary) : null
                    const weekly = wagesData?.national?.weekly != null ? Number(wagesData.national.weekly) : null
                    const annual = wagesData?.national?.annual != null ? Number(wagesData.national.annual) : null
                    const benchmark = Number.isFinite(weekly) ? weekly * 52 : (Number.isFinite(annual) ? annual : null)
                    if (!Number.isFinite(avg) || !Number.isFinite(benchmark) || benchmark <= 0) return '--'
                    return `${Math.round(((avg / benchmark) - 1) * 100)}%`
                  })()}
                </span>
              </div>
              <div className="wage-premium-stat">
                <span className="wage-premium-label">VS ALABAMA</span>
                <span className="wage-premium-value font-mono">
                  {(() => {
                    const avg = salaryData?.avgSalary != null ? Number(salaryData.avgSalary) : null
                    const weekly = wagesData?.alabama?.weekly != null ? Number(wagesData.alabama.weekly) : null
                    const annual = wagesData?.alabama?.annual != null ? Number(wagesData.alabama.annual) : null
                    const benchmark = Number.isFinite(weekly) ? weekly * 52 : (Number.isFinite(annual) ? annual : null)
                    if (!Number.isFinite(avg) || !Number.isFinite(benchmark) || benchmark <= 0) return '--'
                    return `${Math.round(((avg / benchmark) - 1) * 100)}%`
                  })()}
                </span>
              </div>
            </div>

            <p className="card-stats source-line" style={{ marginTop: 12 }}>
              Source: FRED · {wagesData?.national?.date ?? '--'} (latest)
            </p>
          </div>
        </section>

        <section className="jobs-section">
          <div className="jobs-header">
            <h2 className="jobs-title">Live Job Postings</h2>
            <span className="live-badge">
              <span className="pulse" aria-hidden />
              Powered by Bright Data · {totalFilteredJobs != null ? displayedTotalJobs : '--'} tracked
            </span>
          </div>

          <div className="jobs-grid">
            {visibleJobs.map((job, i) => (
              <article key={i} className="job-card">
                <h3 className="job-title">{job.title ?? job.job_title}</h3>
                <p className="job-company">{job.company ?? job.company_name}</p>
                <div className="job-meta">
                  <span>{job.location ?? job.job_location}</span>
                  <span>{job.job_seniority_level ?? ''}</span>
                  <span className="job-type">{job.job_employment_type ?? job.type ?? 'Full-time'}</span>
                  {(job.source ?? '').toLowerCase() === 'linkedin' && (
                    <span className="job-type job-type-linkedin">LinkedIn</span>
                  )}
                  {(job.source ?? '').toLowerCase() === 'indeed' && (
                    <span className="job-type job-type-indeed">Indeed</span>
                  )}
                </div>

                {(job.salary ?? job.base_salary) && ((job.salary ?? job.base_salary).min_amount || (job.salary ?? job.base_salary).max_amount) && (
                  <p className="job-salary font-mono">
                    {(job.salary ?? job.base_salary).min_amount != null ? `$${Math.round((job.salary ?? job.base_salary).min_amount).toLocaleString('en-US')}` : '--'}
                    {' - '}
                    {(job.salary ?? job.base_salary).max_amount != null ? `$${Math.round((job.salary ?? job.base_salary).max_amount).toLocaleString('en-US')}` : '--'}
                  </p>
                )}
              </article>
            ))}
          </div>
          {hasMoreJobs && (
            <div className="load-more-wrap">
              <button
                type="button"
                className="load-more-btn"
                onClick={() => setJobsVisible((v) => Math.min(v + 9, jobFeed.length))}
              >
                Load More
              </button>
            </div>
          )}
        </section>

        {/* Community Investment Card */}
        <div style={{
          background: '#0D1B2E',
          border: '1px solid #1A2F4A',
          borderLeft: '3px solid #C9A84C',
          borderRadius: '8px',
          padding: '28px',
          width: '100%',
          marginTop: '24px',
          boxSizing: 'border-box',
          overflow: 'hidden',
          maxWidth: '100%'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <p style={{ color: '#8A9BB5', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px', fontFamily: 'DM Sans' }}>
                Community Impact
              </p>
              <h3 style={{ color: '#F0EDE6', fontSize: '22px', fontFamily: 'Bebas Neue', letterSpacing: '0.05em', margin: 0 }}>
                COMMUNITY INVESTMENT TRACKING
              </h3>
              <p style={{ color: '#F0EDE6', fontSize: '13px', fontFamily: 'DM Sans', marginTop: '4px' }}>
                Community grants awarded as part of tech companies' data center investment commitments
              </p>
            </div>
            <div style={{
              background: 'rgba(201, 168, 76, 0.1)',
              border: '1px solid rgba(201, 168, 76, 0.3)',
              borderRadius: '20px',
              padding: '4px 12px',
              color: '#C9A84C',
              fontSize: '11px',
              fontFamily: 'DM Mono',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap'
            }}>
              8 Organizations Funded
            </div>
          </div>

          <div style={{ borderBottom: '1px solid #1A2F4A', marginBottom: '20px' }} />

          {[
            {
              org: 'Girl Scouts of Southern Alabama',
              detail: 'Dedicated STEM Lab providing no-cost robotics, coding, and engineering programs to 500+ girls from rural and underserved areas.'
            },
            {
              org: 'Brewbaker Primary School',
              detail: 'Early-learning STEM classroom introducing primary students to foundational robotics and problem-solving for future career readiness.'
            },
            {
              org: "Brantwood Children's Home",
              detail: 'Centralized case management software to modernize child welfare services and better track medical, educational, and therapeutic data.'
            },
            {
              org: 'Alabama Shakespeare Festival',
              detail: 'Grant recipient supporting arts and community programming as part of Meta\'s 2026 Montgomery Community Action Grants cycle.'
            },
            {
              org: 'MAP360',
              detail: 'Grant recipient supporting community development and local programming in Montgomery.'
            },
            {
              org: 'Montgomery Preparatory Academy for Career Technologies',
              detail: 'Supporting career and technology education for Montgomery students.'
            },
            {
              org: 'Percy Julian High School',
              detail: 'Grant funding supporting STEAM education and student programming.'
            },
            {
              org: 'Peter Crump Elementary School',
              detail: 'Grant funding supporting early STEAM education and classroom resources.'
            }
          ].map((item, i) => (
            <div key={i} style={{
              borderLeft: '2px solid #C9A84C',
              paddingLeft: '14px',
              marginBottom: '18px'
            }}>
              <h4 style={{ color: '#F0EDE6', fontSize: '14px', fontFamily: 'DM Sans', fontWeight: 600, margin: '0 0 4px 0' }}>
                {item.org}
              </h4>
              <p style={{ color: '#F0EDE6', fontSize: '12px', fontFamily: 'DM Sans', lineHeight: '1.6', margin: 0 }}>
                {item.detail}
              </p>
            </div>
          ))}

          <p style={{ color: '#8A9BB5', fontSize: '10px', fontFamily: 'DM Sans', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '20px', marginBottom: 0 }}>
            Source: Meta Data Center Community Action Grants · 2026 Cycle
          </p>
        </div>
        </main>

        <section className="stakeholder-section">
          <div className="stakeholder-inner">
            <h3 className="stakeholder-title">BUILT FOR EVERY STAKEHOLDER</h3>
            <div className="stakeholder-grid">
              <div className="stakeholder-card">
                <span className="stakeholder-icon stakeholder-icon-square" aria-hidden />
                <div>
                  <p className="stakeholder-label">CITY PLANNERS</p>
                  <p className="stakeholder-sub">Track investment accountability</p>
                </div>
              </div>
              <div className="stakeholder-card">
                <span className="stakeholder-icon stakeholder-icon-circle" aria-hidden />
                <div>
                  <p className="stakeholder-label">ECONOMIC DEVELOPMENT ORGS</p>
                  <p className="stakeholder-sub">Benchmark growth signals</p>
                </div>
              </div>
              <div className="stakeholder-card">
                <span className="stakeholder-icon stakeholder-icon-square" aria-hidden />
                <div>
                  <p className="stakeholder-label">JOURNALISTS</p>
                  <p className="stakeholder-sub">Access live civic data</p>
                </div>
              </div>
              <div className="stakeholder-card">
                <span className="stakeholder-icon stakeholder-icon-circle" aria-hidden />
                <div>
                  <p className="stakeholder-label">INVESTORS</p>
                  <p className="stakeholder-sub">Monitor market indicators</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="footer">
          <div className="footer-inner">
            <span className="footer-left">Data sources: Bright Data · Montgomery Open Data · FRED · Data refreshed every 3 hours · Built for GenAI Works · World Wide Vibes Hackathon 2026 · Created by Jennifer Watters & Kat Wolfe (Good Vibes)</span>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App
