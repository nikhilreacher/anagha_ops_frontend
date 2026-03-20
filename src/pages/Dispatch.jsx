import { useEffect, useState } from "react"
import axios from "axios"
import API_BASE from "../config/api"
const SHOPS_PER_PAGE = 10

function formatTimestamp(value) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function formatDateInput(value) {
  return new Date(value).toISOString().slice(0, 10)
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0)
}

export default function Dispatch() {
  const [beats, setBeats] = useState([])
  const [dispatches, setDispatches] = useState([])
  const [openShopsDispatchId, setOpenShopsDispatchId] = useState(null)
  const [openCloseDispatchId, setOpenCloseDispatchId] = useState(null)
  const [dispatchShopsMap, setDispatchShopsMap] = useState({})
  const [expandedShopId, setExpandedShopId] = useState(null)
  const [shopPageByDispatch, setShopPageByDispatch] = useState({})
  const [loadingDispatchId, setLoadingDispatchId] = useState(null)
  const [isClosing, setIsClosing] = useState(false)
  const [isSavingCredit, setIsSavingCredit] = useState(false)
  const [form, setForm] = useState({
    beat: [],
    total_bills: "",
    total_cases: "",
    star_bags_boxes: "",
  })
  const [closeFormByDispatch, setCloseFormByDispatch] = useState({})
  const [creditFormByDispatch, setCreditFormByDispatch] = useState({})
  const [isSaving, setIsSaving] = useState(false)

  const activeDispatchCount = dispatches.filter((dispatch) => dispatch.status === "active").length
  const closedDispatchCount = dispatches.filter((dispatch) => dispatch.status === "closed").length

  useEffect(() => {
    axios.get(`${API_BASE}/routes`).then((res) => setBeats(res.data))
    axios.get(`${API_BASE}/dispatch`).then((res) => setDispatches(res.data))
  }, [])

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const toggleBeatSelection = (beatValue) => {
    setForm((current) => {
      const exists = current.beat.includes(beatValue)
      return {
        ...current,
        beat: exists
          ? current.beat.filter((item) => item !== beatValue)
          : [...current.beat, beatValue],
      }
    })
  }

  const getCloseForm = (dispatch) =>
    closeFormByDispatch[dispatch.id] || {
      returns_checked: Boolean(dispatch.returns_checked),
      new_credits_checked: Boolean(dispatch.new_credits_checked),
    }

  const getCreditForm = (dispatchId) =>
    creditFormByDispatch[dispatchId] || {
      shop_id: "",
      bill_no: "",
      bill_amt: "",
      paid_amt: "",
    }

  const updateCloseForm = (dispatchId, key, value) => {
    setCloseFormByDispatch((current) => ({
      ...current,
      [dispatchId]: {
        ...(current[dispatchId] || { returns_checked: false, new_credits_checked: false }),
        [key]: value,
      },
    }))
  }

  const updateCreditForm = (dispatchId, key, value) => {
    setCreditFormByDispatch((current) => ({
      ...current,
      [dispatchId]: {
        ...(current[dispatchId] || {
          shop_id: "",
          bill_no: "",
          bill_amt: "",
          paid_amt: "",
        }),
        [key]: value,
      },
    }))
  }

  const resetCreditForm = (dispatchId) => {
    setCreditFormByDispatch((current) => ({
      ...current,
      [dispatchId]: {
        shop_id: "",
        bill_no: "",
        bill_amt: "",
        paid_amt: "",
      },
    }))
  }

  const loadDispatchShops = async (dispatchId) => {
    const response = await axios.get(`${API_BASE}/dispatch/${dispatchId}/shops`)
    setDispatchShopsMap((current) => ({ ...current, [dispatchId]: response.data }))
  }

  const createDispatch = async () => {
    const { beat, total_bills, total_cases, star_bags_boxes } = form

    if (!beat.length || !total_bills || !total_cases || !star_bags_boxes) {
      alert("Please fill all dispatch details")
      return
    }

    setIsSaving(true)

    try {
      const response = await axios.post(`${API_BASE}/dispatch`, null, {
        params: {
          beat: beat.join(","),
          total_bills: Number(total_bills),
          total_cases: Number(total_cases),
          star_bags_boxes: Number(star_bags_boxes),
        },
      })

      setDispatches((current) => [response.data.dispatch, ...current])
      setForm({
        beat: [],
        total_bills: "",
        total_cases: "",
        star_bags_boxes: "",
      })
      alert("Dispatch created")
    } finally {
      setIsSaving(false)
    }
  }

  const toggleShops = async (dispatchId) => {
    if (openShopsDispatchId === dispatchId) {
      setOpenShopsDispatchId(null)
      setExpandedShopId(null)
      return
    }

    if (!dispatchShopsMap[dispatchId]) {
      setLoadingDispatchId(dispatchId)
      try {
        await loadDispatchShops(dispatchId)
      } finally {
        setLoadingDispatchId(null)
      }
    }

    setShopPageByDispatch((current) => ({ ...current, [dispatchId]: 1 }))
    setOpenShopsDispatchId(dispatchId)
    setExpandedShopId(null)
  }

  const toggleClosePanel = async (dispatchId) => {
    if (openCloseDispatchId === dispatchId) {
      setOpenCloseDispatchId(null)
      return
    }

    if (!dispatchShopsMap[dispatchId]) {
      setLoadingDispatchId(dispatchId)
      try {
        await loadDispatchShops(dispatchId)
      } finally {
        setLoadingDispatchId(null)
      }
    }

    setOpenCloseDispatchId(dispatchId)
  }

  const addCredit = async (dispatch) => {
    const creditForm = getCreditForm(dispatch.id)
    const { shop_id, bill_no, bill_amt, paid_amt } = creditForm

    if (!shop_id || !bill_no || bill_amt === "") {
      alert("Please fill store name, bill no, and bill amount")
      return
    }

    setIsSavingCredit(true)

    try {
      const billAmount = Number(bill_amt || 0)
      const paidAmount = Number(paid_amt || 0)
      const balance = billAmount - paidAmount

      const response = await axios.post(`${API_BASE}/dispatch/${dispatch.id}/ledger`, null, {
        params: {
          shop_id: Number(shop_id),
          bill_no,
          bill_date: formatDateInput(dispatch.created_at),
          salesman: "",
          bill_amt: billAmount,
          paid_amt: paidAmount,
          balance,
          paid_date: "",
          remarks: "",
        },
      })

      await loadDispatchShops(dispatch.id)
      setOpenShopsDispatchId(dispatch.id)
      setDispatches((current) =>
        current.map((item) =>
          item.id === dispatch.id
            ? { ...item, new_credit_total: response.data.new_credit_total }
            : item
        )
      )
      resetCreditForm(dispatch.id)
      const smsStatus = response.data?.sms
      if (smsStatus?.sent) {
        alert("Credit entry added and SMS sent to the shop owner")
      } else if (smsStatus?.reason === "sms_not_configured") {
        alert("Credit entry added. SMS not sent because SMS is not configured yet")
      } else if (smsStatus?.reason === "invalid_shop_phone") {
        alert("Credit entry added. SMS not sent because the shop phone number is missing or invalid")
      } else {
        alert("Credit entry added. SMS could not be sent")
      }
    } finally {
      setIsSavingCredit(false)
    }
  }

  const closeDispatch = async (dispatch) => {
    const closeForm = getCloseForm(dispatch)
    if (!closeForm.returns_checked) {
      alert("Please check returns before closing dispatch")
      return
    }

    setIsClosing(true)

    try {
      const response = await axios.post(`${API_BASE}/dispatch/${dispatch.id}/close`, null, {
        params: {
          returns_checked: closeForm.returns_checked,
          new_credits_checked: closeForm.new_credits_checked,
          close_notes: "",
        },
      })

      setDispatches((current) =>
        current.map((item) => (item.id === dispatch.id ? response.data.dispatch : item))
      )
      setOpenShopsDispatchId((current) => (current === dispatch.id ? null : current))
      setOpenCloseDispatchId((current) => (current === dispatch.id ? null : current))
      alert("Dispatch closed")
    } finally {
      setIsClosing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[1.5rem] border border-amber-100 bg-gradient-to-br from-white via-amber-50/70 to-orange-100/55 shadow-[0_18px_45px_-30px_rgba(217,119,6,0.35)]">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="space-y-5">
            <div className="inline-flex w-fit rounded-full border border-white/70 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800/80 shadow-sm backdrop-blur">
              Dispatch Control
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-slate-900">Create Dispatch</h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Build new dispatches, manage credit additions, and close delivery runs with a clearer operational snapshot.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Active Dispatches</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{activeDispatchCount}</p>
                <p className="mt-1 text-sm text-slate-600">Open runs that can still collect updates and close checks.</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Closed Dispatches</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{closedDispatchCount}</p>
                <p className="mt-1 text-sm text-slate-600">Completed runs already archived with their final credit totals.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur">
            <div className="mb-4 space-y-1">
              <h3 className="text-lg font-semibold text-slate-900">New Dispatch Details</h3>
              <p className="text-sm text-slate-500">Select beats and enter summary counts to start a new dispatch.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Beat</label>
                <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {form.beat.length === 0 ? (
                      <p className="text-sm text-gray-500">No beats selected yet.</p>
                    ) : (
                      form.beat.map((selectedBeat) => (
                        <span
                          key={selectedBeat}
                          className="rounded-full bg-slate-900 px-3 py-1 text-sm text-white"
                        >
                          {selectedBeat}
                        </span>
                      ))
                    )}
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {beats.map((beat) => {
                      const beatValue = beat.beat_value ?? beat.id
                      const isSelected = form.beat.includes(beatValue)

                      return (
                        <label
                          key={beat.id}
                          className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                            isSelected
                              ? "border-slate-900 bg-slate-50 shadow-sm"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleBeatSelection(beatValue)}
                            className="mt-1"
                          />
                          <span className="text-sm text-gray-700">
                            {beat.name}{beat.route_name ? ` - ${beat.route_name}` : ""}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
                <p className="text-xs text-gray-500">Tap one or more beats to include them in the dispatch.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Total No. of Bills</label>
                <input
                  type="number"
                  min="0"
                  value={form.total_bills}
                  onChange={(e) => updateField("total_bills", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="Enter total bills"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Total Cases</label>
                <input
                  type="number"
                  min="0"
                  value={form.total_cases}
                  onChange={(e) => updateField("total_cases", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="Enter total cases"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Star Bags/Boxes</label>
                <input
                  type="number"
                  min="0"
                  value={form.star_bags_boxes}
                  onChange={(e) => updateField("star_bags_boxes", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="Enter star bags/boxes"
                />
              </div>
            </div>

            <button
              onClick={createDispatch}
              disabled={isSaving}
              className="mt-5 inline-flex min-w-[180px] items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? "Creating..." : "Create Dispatch"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Created Dispatches</h3>
          <p className="text-sm text-gray-500">{dispatches.length} total</p>
        </div>

        {dispatches.length === 0 ? (
          <p className="text-sm text-gray-500">No dispatches created yet.</p>
        ) : (
          <div className="space-y-3">
            {dispatches.map((dispatch) => {
              const isActive = dispatch.status === "active"
              const closeForm = getCloseForm(dispatch)
              const creditForm = getCreditForm(dispatch.id)
              const dispatchShops = dispatchShopsMap[dispatch.id] || []
              const shopsWithCredit = dispatchShops.filter((shop) => shop.outstanding > 0)
              const shopPage = shopPageByDispatch[dispatch.id] || 1
              const totalShopPages = Math.max(1, Math.ceil(shopsWithCredit.length / SHOPS_PER_PAGE))
              const paginatedShops = shopsWithCredit.slice(
                (shopPage - 1) * SHOPS_PER_PAGE,
                shopPage * SHOPS_PER_PAGE
              )

              return (
                <div
                  key={dispatch.id}
                  className={`rounded-[1.25rem] p-4 space-y-4 border shadow-sm ${
                    isActive
                      ? "border-emerald-200 bg-gradient-to-br from-white via-emerald-50/70 to-green-100/55"
                      : "border-rose-200 bg-gradient-to-br from-white via-rose-50/70 to-red-100/55"
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-[1rem] border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{dispatch.beat}</p>
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                            isActive ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                          }`}
                        >
                          {isActive ? "Active" : "Closed"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Created on {formatTimestamp(dispatch.created_at)}
                      </p>
                      {!isActive && dispatch.closed_at && (
                        <p className="text-sm text-red-700">
                          Closed on {formatTimestamp(dispatch.closed_at)}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm md:text-right">
                      <div>
                        <p className="text-gray-500">Bills</p>
                        <p className="font-semibold">{dispatch.total_bills}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Cases</p>
                        <p className="font-semibold">{dispatch.total_cases}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Star Bags/Boxes</p>
                        <p className="font-semibold">{dispatch.star_bags_boxes}</p>
                      </div>
                    </div>
                  </div>

                  {isActive ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => toggleShops(dispatch.id)}
                          className="inline-flex min-w-[220px] items-center justify-center rounded-xl border border-slate-900 bg-slate-950 px-4 py-2.5 font-semibold text-white shadow-sm"
                        >
                          {openShopsDispatchId === dispatch.id
                            ? "Hide Shops In This Beat"
                            : "Show Shops In This Beat"}
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleClosePanel(dispatch.id)}
                          className="inline-flex min-w-[220px] items-center justify-center rounded-xl border border-emerald-700 bg-emerald-700 px-4 py-2.5 font-semibold text-white shadow-sm"
                        >
                          {openCloseDispatchId === dispatch.id ? "Hide Close Dispatch" : "Close Dispatch"}
                        </button>
                      </div>

                      {loadingDispatchId === dispatch.id && (
                        <p className="text-sm text-gray-600">Loading dispatch data...</p>
                      )}

                      {openShopsDispatchId === dispatch.id && loadingDispatchId !== dispatch.id && (
                        <div className="space-y-3">
                          <h4 className="font-semibold">Shops With Credit In This Beat</h4>

                          {shopsWithCredit.length === 0 ? (
                            <p className="text-sm text-gray-600">No shops with credits.</p>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-sm text-gray-600">
                                <p>
                                  Showing {Math.min((shopPage - 1) * SHOPS_PER_PAGE + 1, shopsWithCredit.length)}-
                                  {Math.min(shopPage * SHOPS_PER_PAGE, shopsWithCredit.length)} of {shopsWithCredit.length} shops
                                </p>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShopPageByDispatch((current) => ({
                                        ...current,
                                        [dispatch.id]: Math.max(1, shopPage - 1),
                                      }))
                                    }
                                    disabled={shopPage === 1}
                                    className="px-3 py-1 rounded border disabled:opacity-40"
                                  >
                                    {"<"}
                                  </button>
                                  <span>
                                    {shopPage} / {totalShopPages}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShopPageByDispatch((current) => ({
                                        ...current,
                                        [dispatch.id]: Math.min(totalShopPages, shopPage + 1),
                                      }))
                                    }
                                    disabled={shopPage === totalShopPages}
                                    className="px-3 py-1 rounded border disabled:opacity-40"
                                  >
                                    {">"}
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-3">
                                {paginatedShops.map((shop) => {
                                  const shopExpanded = expandedShopId === `${dispatch.id}-${shop.shop_id}`

                                  return (
                                    <div key={shop.shop_id} className="rounded-[1rem] border border-slate-200 bg-white/90 p-4 shadow-sm">
                                      <div className="flex justify-between items-start gap-4">
                                        <div>
                                          <p className="font-semibold">{shop.shop}</p>
                                          <p className="text-sm text-gray-500">{shop.phone || "No phone"}</p>
                                        </div>

                                        <div className="text-right">
                                          <p className="font-semibold text-red-600">
                                            {formatCurrency(shop.outstanding)}
                                          </p>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setExpandedShopId(
                                                shopExpanded ? null : `${dispatch.id}-${shop.shop_id}`
                                              )
                                            }
                                            className="text-sm font-medium text-blue-600"
                                          >
                                            {shopExpanded ? "Hide bills" : "View bills"}
                                          </button>
                                        </div>
                                      </div>

                                      {shopExpanded && (
                                        <div className="mt-4 border-t pt-4 space-y-2">
                                          {shop.bills.map((bill) => (
                                            <div
                                              key={bill.bill_no}
                                              className="flex flex-col gap-1 rounded-lg border bg-slate-50 p-3 md:flex-row md:items-center md:justify-between"
                                            >
                                              <div>
                                                <p className="font-medium">{bill.bill_no}</p>
                                                <p className="text-sm text-gray-500">
                                                  Bill Date: {bill.bill_date || "NA"}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                  Delivery Date: {bill.delivery_date || "NA"}
                                                </p>
                                                {bill.remarks && (
                                                  <p className="text-sm text-gray-500">
                                                    Remarks: {bill.remarks}
                                                  </p>
                                                )}
                                              </div>

                                              <p className="font-semibold text-red-600">
                                                {formatCurrency(bill.balance)}
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {openCloseDispatchId === dispatch.id && (
                        <div className="rounded-[1rem] border border-slate-200 bg-white/90 p-4 space-y-4 shadow-sm">
                          <h4 className="font-semibold">Close Dispatch</h4>

                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={closeForm.returns_checked}
                              onChange={(e) =>
                                updateCloseForm(dispatch.id, "returns_checked", e.target.checked)
                              }
                            />
                            Returns
                          </label>

                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={closeForm.new_credits_checked}
                              onChange={(e) =>
                                updateCloseForm(dispatch.id, "new_credits_checked", e.target.checked)
                              }
                            />
                            New Credits
                          </label>

                          {closeForm.new_credits_checked && (
                            <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-4 space-y-4">
                              <h5 className="font-semibold">Add Credit Entry</h5>

                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Bill No</label>
                                  <input
                                    value={creditForm.bill_no}
                                    onChange={(e) => updateCreditForm(dispatch.id, "bill_no", e.target.value)}
                                    className="border p-2 w-full rounded"
                                    placeholder="Enter bill number"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Store Name</label>
                                  <select
                                    value={creditForm.shop_id}
                                    onChange={(e) => updateCreditForm(dispatch.id, "shop_id", e.target.value)}
                                    className="border p-2 w-full rounded"
                                  >
                                    <option value="">Select Store</option>
                                    {dispatchShops.map((shop) => (
                                      <option key={shop.shop_id} value={shop.shop_id}>
                                        {shop.shop}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Bill Amount</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={creditForm.bill_amt}
                                    onChange={(e) => updateCreditForm(dispatch.id, "bill_amt", e.target.value)}
                                    className="border p-2 w-full rounded"
                                    placeholder="Enter bill amount"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Paid Amount</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={creditForm.paid_amt}
                                    onChange={(e) => updateCreditForm(dispatch.id, "paid_amt", e.target.value)}
                                    className="border p-2 w-full rounded"
                                    placeholder="Enter paid amount"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Beat</label>
                                  <input
                                    value={dispatch.beat}
                                    disabled
                                    className="border p-2 w-full rounded bg-gray-100 text-gray-500"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Delivery Date</label>
                                  <input
                                    value={formatDateInput(dispatch.created_at)}
                                    disabled
                                    className="border p-2 w-full rounded bg-gray-100 text-gray-500"
                                  />
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => addCredit(dispatch)}
                                disabled={isSavingCredit}
                                className="inline-flex min-w-[220px] items-center justify-center rounded-xl border border-blue-700 bg-blue-600 px-4 py-2.5 font-semibold text-white shadow-sm disabled:opacity-60"
                              >
                                {isSavingCredit ? "Saving..." : "Save And Add Entry"}
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => closeDispatch(dispatch)}
                            disabled={isClosing}
                            className="inline-flex min-w-[220px] items-center justify-center rounded-xl border border-emerald-700 bg-emerald-700 px-4 py-2.5 font-semibold text-white shadow-sm disabled:opacity-60"
                          >
                            {isClosing ? "Closing..." : "Close Dispatch"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-red-800 bg-white rounded-lg p-3 border border-red-200">
                      This dispatch is closed. New credit added during this dispatch: {formatCurrency(dispatch.new_credit_total)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
