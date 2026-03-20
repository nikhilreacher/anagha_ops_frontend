import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import API_BASE from "../config/api"

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0)
}

export default function Payments() {
  const [beats, setBeats] = useState([])
  const [shops, setShops] = useState([])
  const [selectedBeat, setSelectedBeat] = useState("")
  const [selectedShopId, setSelectedShopId] = useState("")
  const [amount, setAmount] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    axios.get(`${API_BASE}/routes`).then((res) => setBeats(res.data))
  }, [])

  useEffect(() => {
    setSelectedShopId("")
    if (!selectedBeat) {
      setShops([])
      return
    }

    axios
      .get(`${API_BASE}/payments/shops`, {
        params: { beat: selectedBeat },
      })
      .then((res) => setShops(res.data))
  }, [selectedBeat])

  const selectedShop = useMemo(
    () => shops.find((shop) => String(shop.shop_id) === String(selectedShopId)),
    [shops, selectedShopId]
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
        params: { beat: selectedBeat },
      })
      setShops(shopsResponse.data)

      if (!shopsResponse.data.some((shop) => String(shop.shop_id) === String(selectedShopId))) {
        setSelectedShopId("")
      }
    } finally {
      setSubmitting(false)
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
              <h2 className="text-2xl font-semibold text-slate-900">Collection Entry</h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Record owner collections against pending credit with a cleaner workflow. Payments are applied FIFO to the oldest bills first.
              </p>
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur">
            <div className="mb-4 space-y-1">
              <h3 className="text-lg font-semibold text-slate-900">Record Payment</h3>
              <p className="text-sm text-slate-500">Choose a beat, select the shop, and submit the collected amount.</p>
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

            {selectedShop && (
              <div className="mt-5 rounded-[1rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{selectedShop.shop}</p>
                    <p className="text-sm text-gray-500">{selectedShop.beat}</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-sm text-gray-500">Pending Credit</p>
                    <p className="font-semibold text-rose-600">{formatCurrency(selectedShop.outstanding)}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={submit}
              disabled={submitting}
              className="mt-5 inline-flex min-w-[200px] items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {submitting ? "Submitting..." : "Record Collection"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
