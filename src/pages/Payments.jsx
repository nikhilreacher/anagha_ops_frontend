import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import API_BASE from "../config/api"

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

function formatTimestamp(value) {
  if (!value) {
    return "NA"
  }
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function formatDate(value) {
  if (!value) {
    return "NA"
  }
  return new Date(value).toLocaleDateString("en-IN", {
    dateStyle: "medium",
  })
}

function safeText(value, fallback = "") {
  return typeof value === "string" ? value : fallback
}

export default function Payments({ auth }) {
  const [beats, setBeats] = useState([])
  const [shops, setShops] = useState([])
  const [businessType, setBusinessType] = useState(auth?.business_type === "icd" ? "icd" : "mainline")
  const [selectedBeat, setSelectedBeat] = useState("")
  const [selectedShopId, setSelectedShopId] = useState("")
  const [amount, setAmount] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [requests, setRequests] = useState([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [processingRequestId, setProcessingRequestId] = useState(null)
  const [selectedShopBills, setSelectedShopBills] = useState([])
  const [allocationMode, setAllocationMode] = useState("oldest")
  const [selectedBillNo, setSelectedBillNo] = useState("")
  const [recentPayments, setRecentPayments] = useState([])
  const [loadingSelectedShopBills, setLoadingSelectedShopBills] = useState(false)
  const [loadingRecentPayments, setLoadingRecentPayments] = useState(false)
  const [showSelectedShopBills, setShowSelectedShopBills] = useState(false)
  const [showRecentPayments, setShowRecentPayments] = useState(true)

  const loadRoutes = async (nextBusinessType) => {
    const response = await axios.get(`${API_BASE}/routes`, {
      params: { business_type: nextBusinessType },
    })
    setBeats(response.data)
  }

  const loadRequests = async (nextBusinessType) => {
    setLoadingRequests(true)
    try {
      const response = await axios.get(`${API_BASE}/payments/requests`, {
        params: { business_type: nextBusinessType },
      })
      setRequests(response.data)
    } finally {
      setLoadingRequests(false)
    }
  }

  const loadSelectedShopBills = async (shopId, nextBusinessType) => {
    if (!shopId) {
      setSelectedShopBills([])
      setSelectedBillNo("")
      return
    }
    setLoadingSelectedShopBills(true)
    try {
      const response = await axios.get(`${API_BASE}/admin/credit/${shopId}/bills`, {
        params: { business_type: nextBusinessType },
      })
      setSelectedShopBills(response.data?.bills || [])
    } finally {
      setLoadingSelectedShopBills(false)
    }
  }

  const loadRecentPayments = async (shopId, nextBusinessType) => {
    if (!shopId) {
      setRecentPayments([])
      return
    }
    setLoadingRecentPayments(true)
    try {
      const response = await axios.get(`${API_BASE}/payments/history/${shopId}`, {
        params: { business_type: nextBusinessType, limit: 2 },
      })
      setRecentPayments(response.data?.history || [])
    } finally {
      setLoadingRecentPayments(false)
    }
  }

  useEffect(() => {
    setSelectedBeat("")
    setSelectedShopId("")
    setShops([])
    loadRoutes(businessType)
    loadRequests(businessType)
  }, [businessType])

  useEffect(() => {
    setSelectedShopId("")
    setSelectedBillNo("")
    if (!selectedBeat) {
      setShops([])
      setSelectedShopBills([])
      setRecentPayments([])
      setShowSelectedShopBills(false)
      setShowRecentPayments(true)
      return
    }

    axios
      .get(`${API_BASE}/payments/shops`, {
        params: { beat: selectedBeat, business_type: businessType },
      })
      .then((res) => setShops(res.data))
  }, [selectedBeat, businessType])

  useEffect(() => {
    if (!selectedShopId) {
      setSelectedShopBills([])
      setSelectedBillNo("")
      setRecentPayments([])
      setShowSelectedShopBills(false)
      setShowRecentPayments(true)
      return
    }

    loadSelectedShopBills(selectedShopId, businessType)
    loadRecentPayments(selectedShopId, businessType)
    setShowSelectedShopBills(true)
    setShowRecentPayments(true)
  }, [selectedShopId, businessType])

  const selectedShop = useMemo(
    () => shops.find((shop) => String(shop.shop_id) === String(selectedShopId)),
    [shops, selectedShopId]
  )

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests]
  )

  const completedRequests = useMemo(
    () => requests.filter((request) => request.status === "received"),
    [requests]
  )

  const submit = async () => {
    if (!selectedBeat || !selectedShopId || !amount) {
      alert("Please select beat, shop and amount")
      return
    }
    if (allocationMode === "selected_bill" && !selectedBillNo) {
      alert("Please select a bill")
      return
    }

    setSubmitting(true)
    try {
      const response = await axios.post(`${API_BASE}/payments`, null, {
        params: {
          shop_id: Number(selectedShopId),
          amount: Number(amount),
          allocation_mode: allocationMode,
          bill_no: allocationMode === "selected_bill" ? selectedBillNo : "",
          business_type: businessType,
        },
      })

      const applied = response.data.applied_amount || 0
      const unapplied = response.data.unapplied_amount || 0

      alert(
        unapplied > 0
          ? `Payment recorded. Applied ${formatCurrency(applied)}. Unapplied ${formatCurrency(unapplied)}.`
          : `Payment recorded for ${formatCurrency(applied)}.`
      )

      setAmount("")
      const shopsResponse = await axios.get(`${API_BASE}/payments/shops`, {
        params: { beat: selectedBeat, business_type: businessType },
      })
      setShops(shopsResponse.data)

      if (!shopsResponse.data.some((shop) => String(shop.shop_id) === String(selectedShopId))) {
        setSelectedShopId("")
      }
      await loadRequests(businessType)
    } finally {
      setSubmitting(false)
    }
  }

  const markReceived = async (request) => {
    setProcessingRequestId(request.id)
    try {
      const response = await axios.post(`${API_BASE}/payments/requests/${request.id}/receive`, null, {
        params: {
          received_by: auth?.label || auth?.username || "Admin",
          business_type: businessType,
        },
      })
      const applied = response.data.applied_amount || 0
      const unapplied = response.data.unapplied_amount || 0
      alert(
        unapplied > 0
          ? `Payment marked received. Applied ${formatCurrency(applied)} and ${formatCurrency(unapplied)} could not be matched.`
          : `Payment marked received for ${formatCurrency(applied)}.`
      )
      await loadRequests(businessType)
      if (selectedBeat) {
        const shopsResponse = await axios.get(`${API_BASE}/payments/shops`, {
          params: { beat: selectedBeat, business_type: businessType },
        })
        setShops(shopsResponse.data)
      }
    } finally {
      setProcessingRequestId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[1.5rem] border border-blue-100 bg-gradient-to-br from-white via-sky-50/75 to-blue-100/60 shadow-[0_18px_45px_-30px_rgba(37,99,235,0.35)]">
        <div className="space-y-6 p-6">
          <div className="space-y-5">
            <div className="inline-flex w-fit rounded-full border border-white/70 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-800/80 shadow-sm backdrop-blur">
              Collections
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-slate-900">Payments And Confirmations</h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Record direct collections, or confirm ICD payment requests raised by the salesman before credit is reduced.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
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

          <div className="space-y-6">
            <div className="rounded-[1.35rem] border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur">
              <div className="mb-4 space-y-1">
                <h3 className="text-lg font-semibold text-slate-900">Record Payment Directly</h3>
                <p className="text-sm text-slate-500">Admin can still post received cash directly to the ledger.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Beat</label>
                  <select
                    value={selectedBeat}
                    onChange={(e) => setSelectedBeat(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="">Select beat</option>
                    {beats.map((beat) => (
                      <option key={beat.id} value={beat.beat_value ?? beat.id}>
                        {beat.name}{beat.route_name ? ` - ${beat.route_name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Shop With Pending Credit</label>
                  <select
                    value={selectedShopId}
                    onChange={(e) => setSelectedShopId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                    disabled={!selectedBeat}
                  >
                    <option value="">{selectedBeat ? "Select shop" : "Select beat first"}</option>
                    {shops.map((shop) => (
                      <option key={shop.shop_id} value={shop.shop_id}>
                        {safeText(shop.shop, "Unnamed shop")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Collection Amount</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                    placeholder="Enter amount"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Apply Amount To</label>
                  <select
                    value={allocationMode}
                    onChange={(e) => setAllocationMode(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="oldest">Oldest pending bills</option>
                    <option value="selected_bill">Selected bill</option>
                  </select>
                </div>
              </div>

              {allocationMode === "selected_bill" ? (
                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium text-gray-700">Select Bill</label>
                  <select
                    value={selectedBillNo}
                    onChange={(e) => setSelectedBillNo(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                    disabled={!selectedShopId}
                  >
                    <option value="">{selectedShopId ? "Select bill" : "Select shop first"}</option>
                    {selectedShopBills.map((bill) => (
                      <option key={bill.bill_no} value={bill.bill_no}>
                        {bill.bill_no} - {formatCurrency(bill.balance)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <button
                onClick={submit}
                disabled={submitting}
                className="mt-5 inline-flex min-w-[200px] items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {submitting ? "Submitting..." : "Record Collection"}
              </button>

              {selectedShop ? (
                <div className="mt-5 rounded-[1rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{selectedShop.shop}</p>
                      <p className="text-sm text-gray-500">{selectedShop.beat}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-left md:text-right">
                        <p className="text-sm text-gray-500">Pending Credit</p>
                        <p className="font-semibold text-rose-600">{formatCurrency(selectedShop.outstanding)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => loadRecentPayments(selectedShopId, businessType)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        Refresh Payments
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSelectedShopBills((current) => !current)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        {showSelectedShopBills ? "Hide Bills" : "View Bills"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRecentPayments((current) => !current)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        {showRecentPayments ? "Hide Payments" : "View Payments"}
                      </button>
                    </div>
                  </div>

                  {showRecentPayments ? (
                    <div className="mt-4 border-t border-slate-200 pt-4">
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-slate-900">Recent Payments</p>
                        <p className="text-xs text-slate-500">Last 2 recorded payments for this shop.</p>
                      </div>

                      {loadingRecentPayments ? (
                        <p className="text-sm text-slate-500">Loading payment history...</p>
                      ) : recentPayments.length === 0 ? (
                        <p className="text-sm text-slate-500">No recorded payments found for this shop yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {recentPayments.map((payment) => (
                            <div
                              key={payment.paid_at || `${payment.amount}`}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-3"
                            >
                              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    Paid on {formatTimestamp(payment.paid_at)}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {payment.bills.length} bill{payment.bills.length === 1 ? "" : "s"} adjusted
                                  </p>
                                </div>
                                <p className="font-semibold text-emerald-700">{formatCurrency(payment.amount)}</p>
                              </div>

                              <div className="mt-3 space-y-2">
                                {payment.bills.map((bill) => (
                                  <div
                                    key={`${payment.paid_at}-${bill.bill_no}`}
                                    className="flex flex-col gap-1 rounded-md bg-slate-50 px-3 py-2 md:flex-row md:items-center md:justify-between"
                                  >
                                    <div>
                                      <p className="text-sm font-medium text-slate-900">{bill.bill_no}</p>
                                      <p className="text-xs text-slate-500">Bill Date: {formatDate(bill.bill_date)}</p>
                                    </div>
                                    <div className="text-left md:text-right">
                                      <p className="text-sm font-medium text-emerald-700">
                                        Applied {formatCurrency(bill.applied_amount)}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        Balance left {formatCurrency(bill.remaining_balance)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {showSelectedShopBills ? (
                    <div className="mt-4 border-t border-slate-200 pt-4">
                      {loadingSelectedShopBills ? (
                        <p className="text-sm text-slate-500">Loading pending bills...</p>
                      ) : selectedShopBills.length === 0 ? (
                        <p className="text-sm text-slate-500">No pending bills found for this shop.</p>
                      ) : (
                        <div className="space-y-2">
                          {selectedShopBills.map((bill) => (
                            <div
                              key={bill.bill_no}
                              className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white px-3 py-3 md:flex-row md:items-center md:justify-between"
                            >
                              <div>
                                <p className="font-medium text-slate-900">{bill.bill_no}</p>
                                <p className="text-xs text-slate-500">Bill Date: {formatDate(bill.bill_date)}</p>
                                <p className="text-xs text-slate-500">Delivery Date: {formatDate(bill.delivery_date)}</p>
                                {bill.remarks ? (
                                  <p className="text-xs text-slate-500">Remarks: {bill.remarks}</p>
                                ) : null}
                              </div>
                              <p className="font-semibold text-rose-600">{formatCurrency(bill.balance)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}

            </div>

            {businessType === "icd" ? (
              <div className="rounded-[1.35rem] border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Pending Requests</h3>
                    <p className="text-sm text-slate-500">Raised from the ICD credit page by the salesman.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadRequests(businessType)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                  >
                    Refresh
                  </button>
                </div>

                {loadingRequests ? (
                  <p className="text-sm text-slate-500">Loading payment requests...</p>
                ) : pendingRequests.length === 0 ? (
                  <p className="text-sm text-slate-500">No pending payment requests for this business.</p>
                ) : (
                  <div className="space-y-3">
                    {pendingRequests.map((request) => (
                      <div key={request.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{request.shop}</p>
                            <p className="text-sm text-slate-500">{request.beat || "No beat"}</p>
                            <p className="text-xs text-slate-500">
                              Raised by {request.requested_by} on {formatTimestamp(request.created_at)}
                            </p>
                            <p className="text-xs text-slate-500">
                              Applied to {request.allocation_mode === "selected_bill"
                                ? request.bill_no || "selected bill"
                                : "oldest pending bills"}
                            </p>
                          </div>
                          <div className="text-left md:text-right">
                            <p className="text-sm text-slate-500">Requested Amount</p>
                            <p className="font-semibold text-emerald-700">{formatCurrency(request.amount)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => markReceived(request)}
                          disabled={processingRequestId === request.id}
                          className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {processingRequestId === request.id ? "Processing..." : "Mark Received"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {businessType === "icd" ? (
        <div className="rounded-xl bg-white p-6 shadow">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Received Request History</h3>
            <p className="text-sm text-slate-500">Admin-confirmed salesman requests appear here.</p>
          </div>

          {completedRequests.length === 0 ? (
            <p className="text-sm text-slate-500">No confirmed requests yet.</p>
          ) : (
            <div className="space-y-3">
              {completedRequests.map((request) => (
                <div key={request.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{request.shop}</p>
                      <p className="text-sm text-slate-500">
                        Raised by {request.requested_by}, received by {request.received_by || "Admin"}
                      </p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="font-semibold text-emerald-700">{formatCurrency(request.amount)}</p>
                      <p className="text-xs text-slate-500">{formatTimestamp(request.received_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
