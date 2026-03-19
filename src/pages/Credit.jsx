import { useEffect, useMemo, useState } from "react"
import axios from "axios"

const API_BASE = "http://127.0.0.1:8000"

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0)
}

function agePillStyle(days) {
  if (days < 8) {
    return {
      backgroundColor: "#16a34a",
      color: "#ffffff",
      borderColor: "#15803d",
    }
  }
  if (days <= 15) {
    return {
      backgroundColor: "#facc15",
      color: "#1f2937",
      borderColor: "#eab308",
    }
  }
  return {
    backgroundColor: "#dc2626",
    color: "#ffffff",
    borderColor: "#b91c1c",
  }
}

export default function Credit() {
  const [data, setData] = useState([])
  const [beats, setBeats] = useState([])
  const [selectedBeat, setSelectedBeat] = useState("")
  const [search, setSearch] = useState("")
  const [expandedShopId, setExpandedShopId] = useState(null)

  useEffect(() => {
    axios.get(`${API_BASE}/admin/credit`).then((res) => setData(res.data))
    axios.get(`${API_BASE}/routes`).then((res) => setBeats(res.data))
  }, [])

  const filteredData = useMemo(() => {
    return data.filter((shop) => {
      const matchesBeat = !selectedBeat || shop.beat === selectedBeat
      const matchesSearch =
        !search ||
        shop.shop.toLowerCase().includes(search.toLowerCase()) ||
        shop.beat.toLowerCase().includes(search.toLowerCase())
      return matchesBeat && matchesSearch
    })
  }, [data, selectedBeat, search])

  return (
    <div className="bg-white p-6 rounded-xl shadow space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="font-semibold text-lg">Credit Report</h2>

        <div className="grid gap-3 md:grid-cols-2 md:w-[34rem]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shop or beat"
            className="border p-2 w-full rounded"
          />

          <select
            value={selectedBeat}
            onChange={(e) => setSelectedBeat(e.target.value)}
            className="border p-2 w-full rounded"
          >
            <option value="">All Beats</option>
            {beats.map((beat) => (
              <option key={beat.id} value={beat.beat_value ?? beat.id}>
                {beat.name}{beat.route_name ? ` - ${beat.route_name}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredData.length === 0 ? (
        <p className="text-sm text-gray-500">No credit data found for the selected beat.</p>
      ) : (
        <div className="space-y-3">
          {filteredData.map((shop) => {
            const isExpanded = expandedShopId === shop.shop_id

            return (
              <div key={shop.shop_id} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setExpandedShopId(isExpanded ? null : shop.shop_id)}
                  className="w-full text-left flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1 text-left flex flex-col items-start">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold leading-tight">{shop.shop}</p>
                      <span
                        className="inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-semibold"
                        style={agePillStyle(shop.max_age)}
                      >
                        {shop.max_age}d
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-none pl-0 ml-0">
                      {shop.beat}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 text-xs md:text-right">
                    <div>
                      <p className="text-gray-500">Total Credit</p>
                      <p className="font-semibold text-red-600">{formatCurrency(shop.outstanding)}</p>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-3 border-t pt-3 space-y-2">
                    {shop.bills.map((bill) => (
                      <div
                        key={bill.bill_no}
                        className="flex flex-col gap-1 rounded-lg border bg-white px-3 py-2 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="font-medium text-sm">{bill.bill_no}</p>
                          <p className="text-xs text-gray-500">Bill Date: {bill.bill_date || "NA"}</p>
                          <p className="text-xs text-gray-500">Delivery Date: {bill.delivery_date || "NA"}</p>
                          {bill.remarks && (
                            <p className="text-xs text-gray-500">Remarks: {bill.remarks}</p>
                          )}
                        </div>

                        <p className="font-semibold text-sm text-red-600">{formatCurrency(bill.balance)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
