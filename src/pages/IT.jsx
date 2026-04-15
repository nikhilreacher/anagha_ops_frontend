import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import API_BASE from "../config/api"
const AUTH_STORAGE_KEY = "anagha_ops_auth"

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  }
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle)
  const end = polarToCartesian(cx, cy, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
}

function ComplianceDonut({ completed, missed }) {
  const total = completed + missed
  const completedAngle = total ? (completed / total) * 360 : 0
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const completedOffset = circumference - (completed / (total || 1)) * circumference

  return (
    <div className="relative h-44 w-44 shrink-0">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="16" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="#0f766e"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={completedOffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-3xl font-semibold text-slate-900">{total}</p>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Checks</p>
      </div>
      {total > 0 && missed > 0 ? (
        <div className="pointer-events-none absolute inset-0">
          <svg viewBox="0 0 140 140" className="h-full w-full">
            <path
              d={describeArc(70, 70, radius, completedAngle, 360)}
              fill="none"
              stroke="#ef4444"
              strokeWidth="16"
              strokeLinecap="round"
            />
          </svg>
        </div>
      ) : null}
    </div>
  )
}

function formatTimestamp(value) {
  return value
    ? new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "NA"
}

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString("en-IN", {
        dateStyle: "medium",
      })
    : "NA"
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0)
}

function currentDateInput() {
  return new Date().toISOString().slice(0, 10)
}

function monthStartInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}-01`
}

function monthEndInput(date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
}

function getCurrentMonthRange() {
  const now = new Date()
  return {
    from: monthStartInput(now),
    to: monthEndInput(now),
  }
}

function getPreviousMonthRange() {
  const now = new Date()
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return {
    from: monthStartInput(previous),
    to: monthEndInput(previous),
  }
}

function startOfCurrentWeek(date) {
  const next = new Date(date)
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + diff)
  next.setHours(0, 0, 0, 0)
  return next
}

function formatShortDate(value) {
  return value.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })
}

function dayDifference(startValue, endValue) {
  const start = new Date(startValue)
  const end = new Date(endValue)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

function getTaskLabel(taskType) {
  return taskType === "expiry" ? "Expiry" : "Return"
}

export default function IT() {
  const [authRole, setAuthRole] = useState("")
  const [returns, setReturns] = useState([])
  const [stockEntries, setStockEntries] = useState([])
  const [icdBeats, setIcdBeats] = useState([])
  const [icdShops, setIcdShops] = useState([])
  const [recentIcdCredits, setRecentIcdCredits] = useState([])
  const [showIcdCreditForm, setShowIcdCreditForm] = useState(false)
  const [showRecentIcdCredits, setShowRecentIcdCredits] = useState(false)
  const [icdCreditForm, setIcdCreditForm] = useState({
    beat: "",
    shop_id: "",
    bill_no: "",
    bill_date: currentDateInput(),
    delivery_date: currentDateInput(),
    bill_amt: "",
    paid_amt: "",
    remarks: "",
  })
  const [mocMeta, setMocMeta] = useState({
    allowed: false,
    target_month: "",
    moc_month: "",
    entry: null,
  })
  const [mocHistory, setMocHistory] = useState([])
  const [showMocHistory, setShowMocHistory] = useState(false)
  const [showMocSection, setShowMocSection] = useState(false)
  const [mocForm, setMocForm] = useState({
    moc_month: "",
    total_sales: "",
    total_icd_sales: "",
    total_discount: "",
    closing_stock_value: "",
  })
  const [stockForm, setStockForm] = useState({
    stock_date: currentDateInput(),
    stock_count: "",
  })
  const [showStockHistory, setShowStockHistory] = useState(false)
  const [showResolvedReturns, setShowResolvedReturns] = useState(false)
  const currentMonthRange = getCurrentMonthRange()
  const [stockFilters, setStockFilters] = useState({
    from: currentMonthRange.from,
    to: currentMonthRange.to,
  })

  const loadReturns = () => {
    axios.get(`${API_BASE}/shops/returns`).then((res) => setReturns(res.data))
  }

  const loadStockEntries = () => {
    axios.get(`${API_BASE}/shops/stock`).then((res) => setStockEntries(res.data))
  }

  const loadMocMeta = () => {
    axios.get(`${API_BASE}/shops/moc`).then((res) => {
      setMocMeta(res.data)
      setMocForm({
        moc_month: res.data.moc_month.slice(0, 7),
        total_sales: res.data.entry?.total_sales ?? "",
        total_icd_sales: res.data.entry?.total_icd_sales ?? "",
        total_discount: res.data.entry?.total_discount ?? "",
        closing_stock_value: res.data.entry?.closing_stock_value ?? "",
      })
    })
  }

  const loadMocHistory = () => {
    axios.get(`${API_BASE}/shops/moc/history`).then((res) => setMocHistory(res.data))
  }

  const loadIcdBeats = () => {
    axios.get(`${API_BASE}/routes`, { params: { business_type: "icd" } }).then((res) => setIcdBeats(res.data))
  }

  const loadIcdShops = (beat = "") => {
    axios
      .get(`${API_BASE}/shops/icd-credit/shops`, { params: { beat } })
      .then((res) => setIcdShops(res.data))
  }

  const loadRecentIcdCredits = () => {
    axios.get(`${API_BASE}/shops/icd-credit/recent`, { params: { limit: 2 } }).then((res) => setRecentIcdCredits(res.data))
  }

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(AUTH_STORAGE_KEY)
      const parsed = stored ? JSON.parse(stored) : null
      setAuthRole(parsed?.role || "")
    } catch {
      setAuthRole("")
    }

    loadReturns()
    loadStockEntries()
    loadMocMeta()
    loadMocHistory()
    loadIcdBeats()
    loadIcdShops()
    loadRecentIcdCredits()
  }, [])

  const updateReturn = async (taskId, action) => {
    await axios.post(`${API_BASE}/shops/returns/${taskId}?action=${action}`)
    loadReturns()
  }

  const saveStock = async () => {
    if (!stockForm.stock_date || stockForm.stock_count === "") {
      alert("Please enter stock date and stock count")
      return
    }

    await axios.post(`${API_BASE}/shops/stock`, null, {
      params: {
        stock_date: stockForm.stock_date,
        stock_count: Number(stockForm.stock_count),
      },
    })

    alert("Stock updated")
    setStockForm((current) => ({ ...current, stock_count: "" }))
    loadStockEntries()
  }

  const saveMoc = async () => {
    if (mocForm.total_sales === "") {
      alert("Please enter total sales")
      return
    }

    await axios.post(`${API_BASE}/shops/moc`, null, {
      params: {
        moc_month: authRole === "admin" ? mocForm.moc_month : undefined,
        total_sales: Number(mocForm.total_sales),
        total_icd_sales: Number(mocForm.total_icd_sales || 0),
        total_discount: Number(mocForm.total_discount || 0),
        closing_stock_value: Number(mocForm.closing_stock_value || 0),
      },
    })
    alert("MOC data updated")
    loadMocMeta()
    loadMocHistory()
  }

  const saveIcdCredit = async () => {
    if (!icdCreditForm.shop_id || icdCreditForm.bill_amt === "") {
      alert("Please select an ICD shop and enter the bill amount")
      return
    }

    await axios.post(`${API_BASE}/shops/icd-credit`, null, {
      params: {
        shop_id: Number(icdCreditForm.shop_id),
        bill_no: icdCreditForm.bill_no,
        bill_date: icdCreditForm.bill_date,
        delivery_date: icdCreditForm.delivery_date,
        bill_amt: Number(icdCreditForm.bill_amt),
        paid_amt: Number(icdCreditForm.paid_amt || 0),
        remarks: icdCreditForm.remarks,
        created_by: authRole === "admin" ? "Admin" : "IT",
      },
    })

    alert("ICD credit added")
    setIcdCreditForm((current) => ({
      ...current,
      shop_id: "",
      bill_no: "",
      bill_amt: "",
      paid_amt: "",
      remarks: "",
    }))
    loadRecentIcdCredits()
  }

  const applyCurrentMonthFilter = () => {
    const range = getCurrentMonthRange()
    setStockFilters(range)
  }

  const applyPreviousMonthFilter = () => {
    const range = getPreviousMonthRange()
    setStockFilters(range)
  }

  const clearStockFilter = () => {
    setStockFilters({ from: "", to: "" })
  }

  const filteredStockEntries = useMemo(() => {
    return stockEntries.filter((item) => {
      const stockDate = item.stock_date?.slice(0, 10) || ""
      if (stockFilters.from && stockDate < stockFilters.from) {
        return false
      }
      if (stockFilters.to && stockDate > stockFilters.to) {
        return false
      }
      return true
    })
  }, [stockEntries, stockFilters])

  const pendingReturns = returns.filter((item) => item.status === "pending")
  const resolvedReturns = returns.filter((item) => item.status !== "pending")
  const canManageMoc = mocMeta.allowed || authRole === "admin"
  const currentMocLocked = Boolean(mocMeta.entry)
  const complianceSummary = useMemo(() => {
    const today = new Date()
    const weekStart = startOfCurrentWeek(today)
    const weekDays = []
    const cursor = new Date(weekStart)
    while (cursor <= today) {
      if (cursor.getDay() !== 0) {
        weekDays.push(new Date(cursor))
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    const stockDates = new Set(
      stockEntries.map((entry) => {
        const key = entry.stock_date?.slice(0, 10)
        return key
      })
    )
    const stockCompleted = weekDays.filter((day) => stockDates.has(day.toISOString().slice(0, 10))).length
    const stockExpected = weekDays.length
    const stockMissed = Math.max(stockExpected - stockCompleted, 0)

    const todayMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
    const mocMonthKey = mocMeta.moc_month?.slice(0, 7) || todayMonthKey
    const mocIsDue = today.getDate() >= 21 || authRole === "admin"
    const mocExpected = mocIsDue ? 1 : 0
    const mocCompleted = mocMeta.entry ? 1 : 0
    const mocMissed = Math.max(mocExpected - mocCompleted, 0)

    const dispatchChecks = returns.filter((item) => item.created_at)
    const returnCompleted = dispatchChecks.filter((item) => {
      if (item.status === "pending" || !item.resolved_at) {
        return false
      }
      return dayDifference(item.created_at, item.resolved_at) <= 1
    }).length
    const returnMissed = dispatchChecks.filter((item) => {
      if (item.status === "pending") {
        return dayDifference(item.created_at, today) > 1
      }
      if (!item.resolved_at) {
        return false
      }
      return dayDifference(item.created_at, item.resolved_at) > 1
    }).length

    return {
      completed: stockCompleted + mocCompleted + returnCompleted,
      missed: stockMissed + mocMissed + returnMissed,
      stockCompleted,
      stockExpected,
      stockMissed,
      mocCompleted,
      mocExpected,
      mocMissed,
      returnCompleted,
      returnMissed,
      returnExpected: dispatchChecks.length,
      stockRangeLabel:
        weekDays.length > 0
          ? `${formatShortDate(weekDays[0])} - ${formatShortDate(weekDays[weekDays.length - 1])}`
          : "This week",
      mocMonthKey,
    }
  }, [authRole, mocMeta.entry, mocMeta.moc_month, returns, stockEntries])

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[1.5rem] border border-cyan-100 bg-gradient-to-br from-white via-cyan-50/80 to-teal-100/60 shadow-[0_18px_45px_-30px_rgba(8,145,178,0.4)]">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
          <div className="space-y-5">
            <div className="inline-flex w-fit rounded-full border border-white/70 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-800/80 shadow-sm backdrop-blur">
              IT Compliance
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-slate-900">IT Panel</h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Track dispatch returns, daily stock updates, and MOC discipline from one place.
                The compliance chart shows how many expected IT checks were completed versus missed.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Daily Stock Compliance</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">
                  {complianceSummary.stockCompleted}/{complianceSummary.stockExpected}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {complianceSummary.stockMissed === 0
                    ? `All expected entries completed for ${complianceSummary.stockRangeLabel}.`
                    : `${complianceSummary.stockMissed} day(s) missed in ${complianceSummary.stockRangeLabel}.`}
                </p>
              </div>

              <div className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Return Age Compliance</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">
                  {complianceSummary.returnCompleted}/{complianceSummary.returnExpected}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {complianceSummary.returnExpected === 0
                    ? "No return checks created yet."
                    : complianceSummary.returnMissed === 0
                      ? "All return checks were closed within one day."
                      : `${complianceSummary.returnMissed} return(s) crossed the one-day limit.`}
                </p>
              </div>

              <div className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">MOC Compliance</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">
                  {complianceSummary.mocCompleted}/{complianceSummary.mocExpected || 1}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {complianceSummary.mocExpected === 0
                    ? "MOC entry is not due yet for this cycle."
                    : complianceSummary.mocMissed === 0
                      ? `MOC entry recorded for ${mocMeta.target_month || complianceSummary.mocMonthKey}.`
                      : `MOC entry is pending for ${mocMeta.target_month || complianceSummary.mocMonthKey}.`}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-between lg:flex-col lg:justify-center">
              <ComplianceDonut completed={complianceSummary.completed} missed={complianceSummary.missed} />
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-teal-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Compliant</p>
                    <p className="text-xs text-slate-500">{complianceSummary.completed} completed checks</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-rose-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Non-Compliant</p>
                    <p className="text-xs text-slate-500">{complianceSummary.missed} missed checks</p>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  More compliance modules can be added here later without redesigning the panel.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[1.35rem] border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">Add ICD Credit</h3>
            <p className="text-sm text-slate-500">Use this when ICD credit needs to be added directly without creating a dispatch.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowIcdCreditForm((current) => !current)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm"
          >
            {showIcdCreditForm ? "Hide Form" : "Show Form"}
          </button>
        </div>

        {showIcdCreditForm ? (
          <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.12em] text-gray-600">Beat</label>
                <select
                  value={icdCreditForm.beat}
                  onChange={(e) => {
                    const nextBeat = e.target.value
                    setIcdCreditForm((current) => ({ ...current, beat: nextBeat, shop_id: "" }))
                    loadIcdShops(nextBeat)
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">All ICD beats</option>
                  {icdBeats.map((beat) => (
                    <option key={beat.id} value={beat.beat_value ?? beat.id}>
                      {beat.name}{beat.route_name ? ` - ${beat.route_name}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 xl:col-span-2">
                <label className="text-xs font-medium uppercase tracking-[0.12em] text-gray-600">ICD Shop</label>
                <select
                  value={icdCreditForm.shop_id}
                  onChange={(e) => setIcdCreditForm((current) => ({ ...current, shop_id: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select ICD shop</option>
                  {icdShops.map((shop) => (
                    <option key={shop.shop_id} value={shop.shop_id}>
                      {shop.shop}{shop.beat ? ` - ${shop.beat}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.12em] text-gray-600">Bill No</label>
                <input
                  value={icdCreditForm.bill_no}
                  onChange={(e) => setIcdCreditForm((current) => ({ ...current, bill_no: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.12em] text-gray-600">Bill Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={icdCreditForm.bill_amt}
                  onChange={(e) => setIcdCreditForm((current) => ({ ...current, bill_amt: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder="Amount"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.12em] text-gray-600">Paid Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={icdCreditForm.paid_amt}
                  onChange={(e) => setIcdCreditForm((current) => ({ ...current, paid_amt: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.12em] text-gray-600">Bill Date</label>
                <input
                  type="date"
                  value={icdCreditForm.bill_date}
                  onChange={(e) => setIcdCreditForm((current) => ({ ...current, bill_date: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.12em] text-gray-600">Delivery Date</label>
                <input
                  type="date"
                  value={icdCreditForm.delivery_date}
                  onChange={(e) => setIcdCreditForm((current) => ({ ...current, delivery_date: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2 md:col-span-2 xl:col-span-4">
                <label className="text-xs font-medium uppercase tracking-[0.12em] text-gray-600">Remarks</label>
                <textarea
                  value={icdCreditForm.remarks}
                  onChange={(e) => setIcdCreditForm((current) => ({ ...current, remarks: e.target.value }))}
                  className="min-h-[72px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder="Optional note"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={saveIcdCredit}
              className="mt-4 inline-flex h-[40px] items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
            >
              Add ICD Credit
            </button>
          </div>
        ) : (
          <div className="rounded-[1rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            The ICD credit form is hidden. Use Show Form when you need to add a new entry.
          </div>
        )}

        <div className="border-t border-slate-200 pt-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="font-semibold">Recent ICD Credits</h4>
              <p className="text-sm text-gray-500">Latest 2 ICD credit rows added to the ledger.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadRecentIcdCredits}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setShowRecentIcdCredits((current) => !current)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm"
              >
                {showRecentIcdCredits ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {!showRecentIcdCredits ? (
            <div className="rounded-[1rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Recent ICD credits are hidden. Use Show when you want to review the latest 2 entries.
            </div>
          ) : recentIcdCredits.length === 0 ? (
            <p className="text-sm text-gray-500">No ICD credits found yet.</p>
          ) : (
            <div className="space-y-3">
              {recentIcdCredits.map((item) => (
                <div key={item.bill_no} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{item.shop}</p>
                      <p className="text-sm text-gray-500">{item.beat || "No beat"}</p>
                      <p className="text-xs text-gray-500">
                        Bill No: {item.bill_no} | Bill Date: {formatDate(item.bill_date)} | Delivery: {formatDate(item.delivery_date)}
                      </p>
                      {item.remarks ? (
                        <p className="text-xs text-gray-500">Remarks: {item.remarks}</p>
                      ) : null}
                    </div>
                    <div className="grid gap-1 text-left md:text-right">
                      <p className="text-sm text-gray-500">Bill {formatCurrency(item.bill_amt)}</p>
                      <p className="text-sm text-gray-500">Paid {formatCurrency(item.paid_amt)}</p>
                      <p className="font-semibold text-rose-600">Balance {formatCurrency(item.balance)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[1.35rem] border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">Daily Stock Update</h3>
          <p className="text-sm text-slate-500">Capture today’s stock and keep the IT log up to date.</p>
        </div>

        <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Stock Date</label>
            <input
              type="date"
              value={stockForm.stock_date}
              onChange={(e) => setStockForm((current) => ({ ...current, stock_date: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Current Stock</label>
            <input
              type="number"
              min="0"
              value={stockForm.stock_count}
              onChange={(e) => setStockForm((current) => ({ ...current, stock_count: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
              placeholder="Enter stock amount"
            />
          </div>

          <button
            onClick={saveStock}
            className="inline-flex h-[42px] items-center justify-center rounded-xl bg-slate-950 px-4 py-2 font-semibold text-white"
          >
            Update Stock
          </button>
        </div>
        </div>

        <div className="border-t border-slate-200 pt-4 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h4 className="font-semibold">Stock History</h4>
              <p className="text-sm text-gray-500">
                View current month, previous month, or any custom date range.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-500">{filteredStockEntries.length} entries</p>
              <button
                type="button"
                onClick={() => setShowStockHistory((current) => !current)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm"
              >
                {showStockHistory ? "Hide History" : "View History"}
              </button>
            </div>
          </div>

          {showStockHistory && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={applyCurrentMonthFilter}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm"
                >
                  Current Month
                </button>
                <button
                  type="button"
                  onClick={applyPreviousMonthFilter}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm"
                >
                  Previous Month
                </button>
                <button
                  type="button"
                  onClick={clearStockFilter}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm"
                >
                  All Entries
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">From Date</label>
                  <input
                    type="date"
                    value={stockFilters.from}
                    onChange={(e) => setStockFilters((current) => ({ ...current, from: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">To Date</label>
                  <input
                    type="date"
                    value={stockFilters.to}
                    onChange={(e) => setStockFilters((current) => ({ ...current, to: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>

              {filteredStockEntries.length === 0 ? (
                <p className="text-sm text-gray-500">No stock entries found for the selected date range.</p>
              ) : (
                <div className="space-y-3">
                  {filteredStockEntries.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1"
                    >
                      <p className="font-semibold">Stock: {Number(item.stock_count).toLocaleString("en-IN")}</p>
                      <p className="text-sm text-gray-600">Stock Date: {formatDate(item.stock_date)}</p>
                      <p className="text-sm text-gray-600">Last Updated: {formatTimestamp(item.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {canManageMoc ? (
        <div className="rounded-[1.35rem] border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">MOC Closing Entry</h3>
              <p className="text-sm text-gray-500">
                Enter final sales and cumulative discount for {mocMeta.target_month}.
                {authRole === "admin" && !mocMeta.allowed ? " Admin override is enabled." : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowMocSection((current) => !current)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm"
            >
              {showMocSection ? "Hide Section" : "Show Section"}
            </button>
          </div>

          {!showMocSection ? (
            <div className="rounded-[1rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              MOC closing is hidden. Use Show Section when you want to enter or review MOC details.
            </div>
          ) : (
            <>
              {currentMocLocked ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  MOC entry already added for {mocMeta.target_month}. This cycle is now locked.
                </div>
              ) : null}

              <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                {authRole === "admin" ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">MOC Month</label>
                    <input
                      type="month"
                      value={mocForm.moc_month}
                      onChange={(e) => setMocForm((current) => ({ ...current, moc_month: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500"
                      disabled={currentMocLocked}
                    />
                  </div>
                ) : null}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Total Sales</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={mocForm.total_sales}
                    onChange={(e) => setMocForm((current) => ({ ...current, total_sales: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500"
                    placeholder="Enter total sales"
                    disabled={currentMocLocked}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Cumulative Discount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={mocForm.total_discount}
                    onChange={(e) => setMocForm((current) => ({ ...current, total_discount: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500"
                    placeholder="Enter total discount"
                    disabled={currentMocLocked}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Total ICD Sales</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={mocForm.total_icd_sales}
                    onChange={(e) => setMocForm((current) => ({ ...current, total_icd_sales: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500"
                    placeholder="Enter total ICD sales"
                    disabled={currentMocLocked}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">MOC Closing Stock Value</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={mocForm.closing_stock_value}
                    onChange={(e) => setMocForm((current) => ({ ...current, closing_stock_value: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500"
                    placeholder="Enter MOC closing stock value"
                    disabled={currentMocLocked}
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={saveMoc}
                    disabled={currentMocLocked}
                    className="inline-flex h-[42px] items-center justify-center rounded-xl bg-slate-950 px-4 py-2 font-semibold text-white disabled:bg-slate-300 disabled:text-slate-600"
                  >
                    {currentMocLocked ? "MOC Entry Already Added" : "Save MOC"}
                  </button>
                </div>
              </div>
              </div>

              {authRole === "admin" ? (
                <div className="border-t border-slate-200 pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">MOC History</h4>
                      <p className="text-sm text-gray-500">View and reuse past MOC entries.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMocHistory((current) => !current)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm"
                    >
                      {showMocHistory ? "Hide History" : "View History"}
                    </button>
                  </div>

                  {showMocHistory ? (
                    mocHistory.length === 0 ? (
                      <p className="text-sm text-gray-500">No MOC history available yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {mocHistory.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              setMocForm({
                                moc_month: item.moc_month.slice(0, 7),
                                total_sales: item.total_sales,
                                total_icd_sales: item.total_icd_sales ?? "",
                                total_discount: item.total_discount,
                                closing_stock_value: item.closing_stock_value ?? "",
                              })
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left"
                          >
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="font-semibold">{item.target_month}</p>
                                <p className="text-sm text-gray-500">Click to edit this MOC</p>
                              </div>
                              <div className="text-left md:text-right">
                                <p className="text-sm text-gray-500">Sales {Number(item.total_sales).toLocaleString("en-IN")}</p>
                                <p className="text-sm text-gray-500">ICD Sales {Number(item.total_icd_sales || 0).toLocaleString("en-IN")}</p>
                                <p className="text-sm text-gray-500">Discount {Number(item.total_discount).toLocaleString("en-IN")}</p>
                                <p className="text-sm text-gray-500">Closing Stock {Number(item.closing_stock_value || 0).toLocaleString("en-IN")}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Pending Dispatch Checks</h3>
          <p className="text-sm text-gray-500">{pendingReturns.length} pending</p>
        </div>

        {pendingReturns.length === 0 ? (
          <p className="text-sm text-gray-500">No pending return or expiry checks right now.</p>
        ) : (
          <div className="space-y-3">
            {pendingReturns.map((item) => (
              <div key={item.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{item.route_label || item.beat || "Dispatch Check"}</p>
                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
                      {getTaskLabel(item.task_type)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">Dispatch ID: {item.dispatch_id}</p>
                  <div className="grid gap-2 text-sm text-gray-600 md:grid-cols-2">
                    <p className="rounded-md bg-white/60 px-3 py-2">
                      <span className="font-medium text-gray-700">Dispatch:</span>{" "}
                      {formatTimestamp(item.dispatch_created_at)}
                    </p>
                    <p className="rounded-md bg-white/60 px-3 py-2 md:text-right">
                      <span className="font-medium text-gray-700">Return:</span>{" "}
                      {formatTimestamp(item.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => updateReturn(item.id, "completed")}
                    className="bg-green-700 text-white px-4 py-2 rounded"
                  >
                    {getTaskLabel(item.task_type)} Complete
                  </button>
                  <button
                    onClick={() => updateReturn(item.id, "discarded")}
                    className="bg-red-700 text-white px-4 py-2 rounded"
                  >
                    Discard {getTaskLabel(item.task_type)}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-slate-200 pt-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="font-semibold">Resolved Dispatch Check History</h4>
              <p className="text-sm text-gray-500">
                Review completed and discarded return and expiry actions here.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-500">{resolvedReturns.length} resolved</p>
              <button
                type="button"
                onClick={() => setShowResolvedReturns((current) => !current)}
                className="rounded border border-slate-300 bg-white px-4 py-2 text-sm"
              >
                {showResolvedReturns ? "Hide History" : "View History"}
              </button>
            </div>
          </div>

          {showResolvedReturns && (
            <>
              {resolvedReturns.length === 0 ? (
                <p className="text-sm text-gray-500">No resolved dispatch checks yet.</p>
              ) : (
                <div className="space-y-3">
                  {resolvedReturns.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{item.route_label || item.beat || "Dispatch Check"}</p>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                          {getTaskLabel(item.task_type)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
                        <p>Dispatch ID: {item.dispatch_id}</p>
                        <p className="font-medium capitalize text-slate-700">{item.status}</p>
                      </div>
                      <p className="text-sm text-gray-600">
                        Resolved on {formatTimestamp(item.resolved_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
