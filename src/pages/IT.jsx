import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import API_BASE from "../config/api"
const AUTH_STORAGE_KEY = "anagha_ops_auth"

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

export default function IT() {
  const [authRole, setAuthRole] = useState("")
  const [returns, setReturns] = useState([])
  const [stockEntries, setStockEntries] = useState([])
  const [mocMeta, setMocMeta] = useState({
    allowed: false,
    target_month: "",
    moc_month: "",
    entry: null,
  })
  const [mocHistory, setMocHistory] = useState([])
  const [showMocHistory, setShowMocHistory] = useState(false)
  const [mocForm, setMocForm] = useState({
    moc_month: "",
    total_sales: "",
    total_discount: "",
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
        total_discount: res.data.entry?.total_discount ?? "",
      })
    })
  }

  const loadMocHistory = () => {
    axios.get(`${API_BASE}/shops/moc/history`).then((res) => setMocHistory(res.data))
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
        total_discount: Number(mocForm.total_discount || 0),
      },
    })
    alert("MOC data updated")
    loadMocMeta()
    loadMocHistory()
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

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow space-y-2">
        <h2 className="font-semibold text-lg">IT Panel</h2>
        <p className="text-sm text-gray-500">
          Track dispatch returns and update daily stock from here.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <h3 className="font-semibold">Daily Stock Update</h3>

        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Stock Date</label>
            <input
              type="date"
              value={stockForm.stock_date}
              onChange={(e) => setStockForm((current) => ({ ...current, stock_date: e.target.value }))}
              className="border p-2 w-full rounded"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Current Stock</label>
            <input
              type="number"
              min="0"
              value={stockForm.stock_count}
              onChange={(e) => setStockForm((current) => ({ ...current, stock_count: e.target.value }))}
              className="border p-2 w-full rounded"
              placeholder="Enter stock amount"
            />
          </div>

          <button
            onClick={saveStock}
            className="bg-black text-white px-4 py-2 rounded h-[42px]"
          >
            Update Stock
          </button>
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
                className="rounded border border-slate-300 bg-white px-4 py-2 text-sm"
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
                  className="rounded border border-slate-300 bg-white px-4 py-2 text-sm"
                >
                  Current Month
                </button>
                <button
                  type="button"
                  onClick={applyPreviousMonthFilter}
                  className="rounded border border-slate-300 bg-white px-4 py-2 text-sm"
                >
                  Previous Month
                </button>
                <button
                  type="button"
                  onClick={clearStockFilter}
                  className="rounded border border-slate-300 bg-white px-4 py-2 text-sm"
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
                    className="border p-2 w-full rounded"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">To Date</label>
                  <input
                    type="date"
                    value={stockFilters.to}
                    onChange={(e) => setStockFilters((current) => ({ ...current, to: e.target.value }))}
                    className="border p-2 w-full rounded"
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
        <div className="bg-white p-6 rounded-xl shadow space-y-4">
          <div>
            <h3 className="font-semibold">MOC Closing Entry</h3>
            <p className="text-sm text-gray-500">
              Enter final sales and cumulative discount for {mocMeta.target_month}.
              {authRole === "admin" && !mocMeta.allowed ? " Admin override is enabled." : ""}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            {authRole === "admin" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">MOC Month</label>
                <input
                  type="month"
                  value={mocForm.moc_month}
                  onChange={(e) => setMocForm((current) => ({ ...current, moc_month: e.target.value }))}
                  className="border p-2 w-full rounded"
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
                className="border p-2 w-full rounded"
                placeholder="Enter total sales"
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
                className="border p-2 w-full rounded"
                placeholder="Enter total discount"
              />
            </div>

            <button
              type="button"
              onClick={saveMoc}
              className="bg-black text-white px-4 py-2 rounded h-[42px]"
            >
              Save MOC
            </button>
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
                  className="rounded border border-slate-300 bg-white px-4 py-2 text-sm"
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
                            total_discount: item.total_discount,
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
                            <p className="text-sm text-gray-500">Discount {Number(item.total_discount).toLocaleString("en-IN")}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Pending Returns</h3>
          <p className="text-sm text-gray-500">{pendingReturns.length} pending</p>
        </div>

        {pendingReturns.length === 0 ? (
          <p className="text-sm text-gray-500">No pending returns right now.</p>
        ) : (
          <div className="space-y-3">
            {pendingReturns.map((item) => (
              <div key={item.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <div className="space-y-2">
                  <p className="font-semibold">{item.route_label || item.beat || "Dispatch Return"}</p>
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
                    Return Complete
                  </button>
                  <button
                    onClick={() => updateReturn(item.id, "discarded")}
                    className="bg-red-700 text-white px-4 py-2 rounded"
                  >
                    Discard
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-slate-200 pt-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="font-semibold">Resolved Return History</h4>
              <p className="text-sm text-gray-500">
                Review completed and discarded return actions here.
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
                <p className="text-sm text-gray-500">No resolved return records yet.</p>
              ) : (
                <div className="space-y-3">
                  {resolvedReturns.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                      <p className="font-semibold">{item.route_label || item.beat || "Dispatch Return"}</p>
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
