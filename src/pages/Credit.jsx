import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import API_BASE from "../config/api"
import { useLocation } from "react-router-dom"

const BUSINESS_OPTIONS = [
  { value: "mainline", label: "Mainline" },
  { value: "icd", label: "ICD" },
]

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

export default function Credit({ auth }) {
  const location = useLocation()
  const [data, setData] = useState([])
  const [beats, setBeats] = useState([])
  const initialBusinessType = useMemo(() => {
    const params = new URLSearchParams(location.search)
    const requestedBusiness = params.get("business")
    if (requestedBusiness === "icd" || requestedBusiness === "mainline") {
      return requestedBusiness
    }
    return auth?.business_type === "icd" ? "icd" : "mainline"
  }, [auth?.business_type, location.search])
  const [businessType, setBusinessType] = useState(initialBusinessType)
  const [selectedBeat, setSelectedBeat] = useState("")
  const [search, setSearch] = useState("")
  const [expandedShopId, setExpandedShopId] = useState(null)
  const [shopBillsById, setShopBillsById] = useState({})
  const [paymentDraftsByShopId, setPaymentDraftsByShopId] = useState({})
  const [loadingBillsShopId, setLoadingBillsShopId] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [submittingShopId, setSubmittingShopId] = useState(null)
  const isSalesman = auth?.role === "salesman"

  useEffect(() => {
    setLoadingSummary(true)
    setExpandedShopId(null)
    setShopBillsById({})
    setSelectedBeat("")
    axios
      .get(`${API_BASE}/admin/credit`, { params: { business_type: businessType } })
      .then((res) => setData(res.data))
      .finally(() => setLoadingSummary(false))
    axios
      .get(`${API_BASE}/routes`, { params: { business_type: businessType } })
      .then((res) => setBeats(res.data))
  }, [businessType])

  useEffect(() => {
    if (!isSalesman) {
      return
    }
    setBusinessType("icd")
  }, [isSalesman])

  useEffect(() => {
    setBusinessType(initialBusinessType)
  }, [initialBusinessType])

  const toggleShop = async (shopId) => {
    if (expandedShopId === shopId) {
      setExpandedShopId(null)
      return
    }

    setExpandedShopId(shopId)
    if (shopBillsById[shopId]) {
      return
    }

    setLoadingBillsShopId(shopId)
    try {
      const response = await axios.get(`${API_BASE}/admin/credit/${shopId}/bills`, {
        params: { business_type: businessType },
      })
      setShopBillsById((current) => ({
        ...current,
        [shopId]: response.data.bills || [],
      }))
    } finally {
      setLoadingBillsShopId(null)
    }
  }

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

  const selectedBeatLabel = useMemo(() => {
    if (!selectedBeat) {
      return "All Beats"
    }

    const matchedBeat = beats.find((beat) => (beat.beat_value ?? beat.id) === selectedBeat)
    return matchedBeat?.name || selectedBeat
  }, [beats, selectedBeat])

  const filteredOutstandingTotal = useMemo(
    () => filteredData.reduce((sum, shop) => sum + Number(shop.outstanding || 0), 0),
    [filteredData]
  )

  const submitPaymentRequest = async (shop) => {
    const rawAmount = paymentDraftsByShopId[shop.shop_id] || ""
    const amount = Number(rawAmount)
    if (!amount || amount <= 0) {
      alert("Please enter a valid payment amount")
      return
    }

    setSubmittingShopId(shop.shop_id)
    try {
      await axios.post(`${API_BASE}/payments/requests`, null, {
        params: {
          shop_id: shop.shop_id,
          amount,
          requested_by: auth?.label || auth?.username || "Salesman",
          business_type: businessType,
        },
      })
      setPaymentDraftsByShopId((current) => ({
        ...current,
        [shop.shop_id]: "",
      }))
      alert("Payment request sent to admin")
    } finally {
      setSubmittingShopId(null)
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow space-y-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 xl:min-w-[18rem]">
          <p className="text-sm font-medium text-slate-500">
            {!selectedBeat ? "Total Credit" : `${selectedBeatLabel} Credit`}
          </p>
          <p className="mt-2 text-2xl font-semibold text-red-600">
            {formatCurrency(filteredOutstandingTotal)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Based on the current filter selection.
          </p>
        </div>

        <div className="flex flex-col gap-3 xl:w-[34rem]">
          <h2 className="font-semibold text-lg">Credit Report</h2>

          <div className="grid gap-3 md:grid-cols-2">
            {!isSalesman ? (
              <div className="md:col-span-2 flex flex-wrap gap-2">
                {BUSINESS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setBusinessType(option.value)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      businessType === option.value
                        ? "bg-slate-950 text-white"
                        : "border border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="md:col-span-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                ICD credit view only. Raise collected payments here for admin confirmation.
              </div>
            )}

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
      </div>

      {loadingSummary ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-500">
          Loading credit summary...
        </div>
      ) : filteredData.length === 0 ? (
        <p className="text-sm text-gray-500">No credit data found for the selected beat.</p>
      ) : (
        <div className="space-y-3">
          {filteredData.map((shop) => {
            const isExpanded = expandedShopId === shop.shop_id

            return (
              <div key={shop.shop_id} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <button
                  type="button"
                  onClick={() => toggleShop(shop.shop_id)}
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
                    <p className="text-[11px] text-slate-500">{shop.bill_count || 0} bills</p>
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-3 border-t pt-3 space-y-2">
                    {loadingBillsShopId === shop.shop_id ? (
                      <p className="text-sm text-slate-500">Loading bill details...</p>
                    ) : (shopBillsById[shop.shop_id] || []).map((bill) => (
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

                    {isSalesman ? (
                      <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3">
                        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Collected Payment Amount</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={paymentDraftsByShopId[shop.shop_id] || ""}
                              onChange={(e) =>
                                setPaymentDraftsByShopId((current) => ({
                                  ...current,
                                  [shop.shop_id]: e.target.value,
                                }))
                              }
                              className="w-full rounded border border-slate-300 px-3 py-2"
                              placeholder="Enter collected amount"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => submitPaymentRequest(shop)}
                            disabled={submittingShopId === shop.shop_id}
                            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            {submittingShopId === shop.shop_id ? "Sending..." : "Send To Admin"}
                          </button>
                        </div>
                      </div>
                    ) : null}
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
