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

      alert(
        unapplied > 0
          ? `Payment recorded. Applied ${formatCurrency(applied)}. Unapplied ${formatCurrency(unapplied)}.`
          : `Payment recorded for ${formatCurrency(applied)}.`
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
    <div className="bg-white p-6 rounded-xl shadow space-y-5">
      <div>
        <h2 className="font-semibold text-lg">Collection Entry</h2>
        <p className="text-sm text-gray-500">
          Record owner collections against pending credit. Payments are applied FIFO to the oldest bills first.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Beat</label>
          <select
            value={selectedBeat}
            onChange={(e) => setSelectedBeat(e.target.value)}
            className="border p-2 w-full rounded bg-white"
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
            className="border p-2 w-full rounded bg-white"
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
            className="border p-2 w-full rounded"
            placeholder="Enter amount"
          />
        </div>
      </div>

      {selectedShop && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">{selectedShop.shop}</p>
              <p className="text-sm text-gray-500">{selectedShop.beat}</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-sm text-gray-500">Pending Credit</p>
              <p className="font-semibold text-red-600">{formatCurrency(selectedShop.outstanding)}</p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={submit}
        disabled={submitting}
        className="bg-black text-white px-4 py-2 rounded disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {submitting ? "Submitting..." : "Record Collection"}
      </button>
    </div>
  )
}
