import { useEffect, useState } from "react"
import axios from "axios"
import API_BASE from "../config/api"

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0)
}

function formatTimestamp(value) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function NavigationIcon() {
  return (
    <svg
      aria-hidden="true"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      className="block"
    >
      <path fill="#EA4335" d="M4.9 9.3A7.5 7.5 0 0 1 12 2v8.2Z" />
      <path fill="#4285F4" d="M12 2a7.5 7.5 0 0 1 6.5 3.8L12 10.2Z" />
      <path fill="#0F9D58" d="M18.5 5.8A7.5 7.5 0 0 1 18 14l-6 8-6-8 6-3.8Z" />
      <path fill="#FBBC04" d="M6 14a7.5 7.5 0 0 1-1.1-4.7L12 10.2Z" />
      <circle cx="12" cy="9.6" r="3.2" fill="#fff" />
    </svg>
  )
}

function getNavigationUrl(shop) {
  if (shop.lat && shop.lon) {
    return `https://www.google.com/maps/search/?api=1&query=${shop.lat},${shop.lon}`
  }

  const query = encodeURIComponent(shop.address || shop.shop)
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

export default function Delivery() {
  const [dispatches, setDispatches] = useState([])
  const [selectedDispatchId, setSelectedDispatchId] = useState(null)
  const [shops, setShops] = useState([])
  const [expandedShopId, setExpandedShopId] = useState(null)

  useEffect(() => {
    axios.get(`${API_BASE}/dispatch`).then((res) => {
      setDispatches(res.data.filter((dispatch) => dispatch.status === "active"))
    })
  }, [])

  const openDispatch = async (dispatchId) => {
    if (selectedDispatchId === dispatchId) {
      setSelectedDispatchId(null)
      setShops([])
      setExpandedShopId(null)
      return
    }

    const response = await axios.get(`${API_BASE}/dispatch/${dispatchId}/shops`)
    setSelectedDispatchId(dispatchId)
    setShops(response.data.filter((shop) => shop.outstanding > 0))
    setExpandedShopId(null)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-lg">Current Dispatches</h2>
          <p className="text-sm text-gray-500">{dispatches.length} active</p>
        </div>

        {dispatches.length === 0 ? (
          <p className="text-sm text-gray-500">No active dispatches available.</p>
        ) : (
          <div className="space-y-3">
            {dispatches.map((dispatch) => (
              <button
                key={dispatch.id}
                type="button"
                onClick={() => openDispatch(dispatch.id)}
                className={`w-full text-left rounded-xl border p-4 ${
                  selectedDispatchId === dispatch.id
                    ? "border-green-400 bg-green-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold">{dispatch.beat}</p>
                    <p className="text-sm text-gray-500">
                      Created on {formatTimestamp(dispatch.created_at)}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm md:text-right">
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
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedDispatchId && (
        <div className="bg-white p-6 rounded-xl shadow space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Shops In This Dispatch</h3>
            <p className="text-sm text-gray-500">{shops.length} shops with pending credit</p>
          </div>

          {shops.length === 0 ? (
            <p className="text-sm text-gray-500">No shops with pending credit in this dispatch.</p>
          ) : (
            <div className="space-y-3">
              {shops.map((shop) => {
                const isExpanded = expandedShopId === shop.shop_id

                return (
                  <div key={shop.shop_id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold">{shop.shop}</p>
                        <p className="text-sm text-gray-500">{shop.phone || "No phone"}</p>
                        {shop.address && (
                          <p className="text-xs text-gray-500 mt-1">{shop.address}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 md:justify-end">
                        <p className="font-semibold text-red-600">
                          {formatCurrency(shop.outstanding)}
                        </p>
                        <button
                          type="button"
                          onClick={() => setExpandedShopId(isExpanded ? null : shop.shop_id)}
                          className="px-3 py-2 rounded border bg-white text-sm"
                        >
                          {isExpanded ? "Hide Bills" : "View Bills"}
                        </button>
                        <a
                          href={getNavigationUrl(shop)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                          title="Navigate"
                          aria-label={`Navigate to ${shop.shop}`}
                        >
                          <NavigationIcon />
                        </a>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 border-t pt-4 space-y-2">
                        {shop.bills.map((bill) => (
                          <div
                            key={bill.bill_no}
                            className="flex flex-col gap-1 rounded-lg border bg-white px-3 py-2 md:flex-row md:items-center md:justify-between"
                          >
                            <div>
                              <p className="font-medium text-sm">{bill.bill_no}</p>
                              <p className="text-xs text-gray-500">Bill Date: {bill.bill_date || "NA"}</p>
                              <p className="text-xs text-gray-500">
                                Delivery Date: {bill.delivery_date || "NA"}
                              </p>
                              {bill.remarks && (
                                <p className="text-xs text-gray-500">Remarks: {bill.remarks}</p>
                              )}
                            </div>

                            <p className="font-semibold text-sm text-red-600">
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
          )}
        </div>
      )}
    </div>
  )
}
