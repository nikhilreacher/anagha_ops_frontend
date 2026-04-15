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
  const [loadingSelectedShopBills, setLoadingSelectedShopBills] = useState(false)
  const [showSelectedShopBills, setShowSelectedShopBills] = useState(false)

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

  useEffect(() => {
    setSelectedBeat("")
    setSelectedShopId("")
    setShops([])
    loadRoutes(businessType)
    loadRequests(businessType)
  }, [businessType])

  useEffect(() => {
    setSelectedShopId("")
    if (!selectedBeat) {
      setShops([])
      setSelectedShopBills([])
      setShowSelectedShopBills(false)
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
      setShowSelectedShopBills(false)
      return
    }

    setLoadingSelectedShopBills(true)
    axios
      .get(`${API_BASE}/admin/credit/${selectedShopId}/bills`, {
        params: { business_type: businessType },
      })
      .then((res) => {
        setSelectedShopBills(res.data?.bills || [])
        setShowSelectedShopBills(true)
      })
      .finally(() => setLoadingSelectedShopBills(false))
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

    setSubmitting(true)
    try {
      const response = await axios.post(`${API_BASE}/payments`, null, {
        params: {
          shop_id: Number(selectedShopId),
          amount: Number(amount),
          business_type: businessType,
        },
      })

      const applied = response.data.applied_amount || 0
      const unapplied = response.data.unapplied_amount || 0
      const smsStatus = response.data?.sms
      const smsMessage = smsStatus?.sent
        ? " SMS sent to the shop owner."
        : smsStatus?.reason === "sms_not_configured"
          ? " SMS not sent because SMS is not configured yet."
          : smsStatus?.reason === "invalid_shop_phone"
            ? " SMS not sent because the shop phone number is missing or invalid."
            : " SMS could not be sent."

      alert(
        unapplied > 0
          ? `Payment recorded. Applied ${formatCurrency(applied)}. Unapplied ${formatCurrency(unapplied)}.${smsMessage}`
          : `Payment recorded for ${formatCurrency(applied)}.${smsMessage}`
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
                        {shop.shop}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Collection Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                    placeholder="Enter amount"
                  />
                </div>
              </div>

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
                        onClick={() => setShowSelectedShopBills((current) => !current)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        {showSelectedShopBills ? "Hide Bills" : "View Bills"}
                      </button>
                    </div>
                  </div>

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

              <button
                onClick={submit}
                disabled={submitting}
                className="mt-5 inline-flex min-w-[200px] items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {submitting ? "Submitting..." : "Record Collection"}
              </button>
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
