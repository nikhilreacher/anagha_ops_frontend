import { useEffect, useMemo, useState } from "react"
import axios from "axios"

const API_BASE = "http://127.0.0.1:8000"

const PIE_COLORS = [
  "#0f766e",
  "#0284c7",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#65a30d",
  "#b45309",
]

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

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  }
}

function describePieSlice(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle)
  const end = polarToCartesian(cx, cy, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ")
}

function buildPieSlices(items) {
  const total = items.reduce((sum, item) => sum + (item.amount || 0), 0)
  if (!total) {
    return []
  }

  let currentAngle = 0
  return items.map((item, index) => {
    const angle = ((item.amount || 0) / total) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle
    return {
      ...item,
      color: PIE_COLORS[index % PIE_COLORS.length],
      path: describePieSlice(120, 120, 100, startAngle, endAngle),
    }
  })
}

function formatExpenseDate(value) {
  return new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" })
}

function EditIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25Zm2.92 2.33H5v-.92l8.06-8.06.92.92ZM20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.3a1 1 0 0 0-1.41 0L15.13 5.12l3.75 3.75Z" />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M9 3h6l1 2h4v2H4V5h4Zm1 6h2v8h-2Zm4 0h2v8h-2ZM6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z" />
    </svg>
  )
}

function TrendUpIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M5 15.5 6.4 17 15 8.4V13h2V5h-8v2h4.6z" />
    </svg>
  )
}

function TrendDownIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M19 8.5 17.6 7 9 15.6V11H7v8h8v-2h-4.6z" />
    </svg>
  )
}

export default function Dashboard() {
  const [data, setData] = useState({
    total_outstanding: 0,
    average_stock_7_days: 0,
    previous_day_closing_stock: 0,
    active_dispatches: 0,
    current_month_expenses: 0,
    previous_month_expenses: 0,
    prev_moc_month: "",
    prev_moc_sales: 0,
    prev_moc_discount: 0,
    prev_moc_margin: 0,
    prev_moc_profit: 0,
    prev_moc_growth_percent: null,
    prev_moc_profit_growth_percent: null,
    expense_breakdown: [],
    recent_expenses: [],
    expense_types: [],
    employee_roles: [],
    employees: [],
    recent_advances: [],
    salary_window_open: false,
    salary_target_month: "",
    salary_total_days: 0,
    salary_working_days: 0,
    paid_leave_days: 1,
  })
  const [expenseForm, setExpenseForm] = useState({
    expense_date: currentDateInput(),
    expense_type: "Fuel",
    note: "",
    amount: "",
  })
  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    role: "Sales",
    phone: "",
    salary: "",
  })
  const [advanceForm, setAdvanceForm] = useState({
    employee_id: "",
    advance_date: currentDateInput(),
    amount: "",
    note: "",
  })
  const [salaryForm, setSalaryForm] = useState({
    employee_id: "",
    payment_date: currentDateInput(),
    absent_days: "",
  })
  const [savingExpense, setSavingExpense] = useState(false)
  const [savingEmployee, setSavingEmployee] = useState(false)
  const [savingAdvance, setSavingAdvance] = useState(false)
  const [payingSalary, setPayingSalary] = useState(false)
  const [showExpenseSection, setShowExpenseSection] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showEmployeesCorner, setShowEmployeesCorner] = useState(false)
  const [showEmployeeForm, setShowEmployeeForm] = useState(false)
  const [showAdvanceForm, setShowAdvanceForm] = useState(false)
  const [showEmployeesList, setShowEmployeesList] = useState(true)
  const [showSalaryCalculator, setShowSalaryCalculator] = useState(false)
  const [editingEmployeeId, setEditingEmployeeId] = useState(null)
  const [hoveredExpenseIndex, setHoveredExpenseIndex] = useState(null)

  const loadDashboard = () => {
    axios.get(`${API_BASE}/admin/dashboard`).then((res) => {
      setData(res.data)
      setExpenseForm((current) => ({
        ...current,
        expense_type: current.expense_type || res.data.expense_types?.[0] || "Fuel",
      }))
      setEmployeeForm((current) => ({
        ...current,
        role: current.role || res.data.employee_roles?.[0] || "Sales",
      }))
    })
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const pieSlices = useMemo(
    () => buildPieSlices(data.expense_breakdown),
    [data.expense_breakdown]
  )

  const selectedEmployee = useMemo(
    () => data.employees.find((employee) => String(employee.id) === String(salaryForm.employee_id)),
    [data.employees, salaryForm.employee_id]
  )

  const salaryPreview = useMemo(() => {
    if (!selectedEmployee) {
      return null
    }

    const monthlySalary = Number(selectedEmployee.salary || 0)
    const absentDays = Number(salaryForm.absent_days || 0)
    const workingDays = Number(data.salary_working_days || 0)
    const totalDays = Number(data.salary_total_days || 0)
    const paidLeaveDays = Number(data.paid_leave_days || 1)
    if (workingDays && absentDays > workingDays) {
      return {
        invalid: true,
        message: "Absent days exceed previous month's working days.",
      }
    }
    const presentDays = Math.max(workingDays - absentDays, 0)
    const deductibleAbsentDays = Math.max(absentDays - paidLeaveDays, 0)
    const dailySalary = totalDays ? monthlySalary / totalDays : 0
    const absentDeduction = dailySalary * deductibleAbsentDays
    const previousMonthAdvance = Number(selectedEmployee.previous_month_advance || 0)
    const netBeforeAdvance = Math.max(monthlySalary - absentDeduction, 0)
    const advanceDeduction = Math.min(previousMonthAdvance, netBeforeAdvance)
    const remainingSalary = Math.max(netBeforeAdvance - advanceDeduction, 0)

    return {
      monthlySalary,
      totalDays,
      workingDays,
      paidLeaveDays,
      presentDays,
      absentDays,
      deductibleAbsentDays,
      absentDeduction,
      previousMonthAdvance,
      advanceDeduction,
      remainingSalary,
    }
  }, [selectedEmployee, salaryForm.absent_days, data.salary_total_days, data.salary_working_days, data.paid_leave_days])

  const saveExpense = async () => {
    if (!expenseForm.expense_date || !expenseForm.expense_type || expenseForm.amount === "") {
      alert("Please fill expense date, type and amount")
      return
    }

    setSavingExpense(true)
    try {
      await axios.post(`${API_BASE}/admin/expenses`, null, {
        params: {
          expense_date: expenseForm.expense_date,
          expense_type: expenseForm.expense_type,
          note: expenseForm.note,
          amount: Number(expenseForm.amount),
        },
      })

      setExpenseForm({
        expense_date: currentDateInput(),
        expense_type: expenseForm.expense_type,
        note: "",
        amount: "",
      })
      loadDashboard()
    } finally {
      setSavingExpense(false)
    }
  }

  const saveEmployee = async () => {
    if (!employeeForm.name || !employeeForm.role || employeeForm.salary === "") {
      alert("Please fill employee name, role and salary")
      return
    }

    setSavingEmployee(true)
    try {
      await axios.post(`${API_BASE}/admin/employees`, null, {
        params: {
          name: employeeForm.name,
          role: employeeForm.role,
          phone: employeeForm.phone,
          salary: Number(employeeForm.salary),
        },
      })
      setEmployeeForm((current) => ({ ...current, name: "", phone: "", salary: "" }))
      setEditingEmployeeId(null)
      setShowEmployeeForm(false)
      loadDashboard()
    } finally {
      setSavingEmployee(false)
    }
  }

  const startEditEmployee = (employee) => {
    setEditingEmployeeId(employee.id)
    setEmployeeForm({
      name: employee.name,
      role: employee.role,
      phone: employee.phone || "",
      salary: employee.salary,
    })
    setShowEmployeeForm(true)
  }

  const updateEmployee = async () => {
    if (!editingEmployeeId || !employeeForm.name || !employeeForm.role || employeeForm.salary === "") {
      alert("Please fill employee name, role and salary")
      return
    }

    setSavingEmployee(true)
    try {
      await axios.post(`${API_BASE}/admin/employees/${editingEmployeeId}`, null, {
        params: {
          name: employeeForm.name,
          role: employeeForm.role,
          phone: employeeForm.phone,
          salary: Number(employeeForm.salary),
        },
      })
      setEmployeeForm((current) => ({ ...current, name: "", phone: "", salary: "" }))
      setEditingEmployeeId(null)
      setShowEmployeeForm(false)
      loadDashboard()
    } finally {
      setSavingEmployee(false)
    }
  }

  const removeEmployee = async (employee) => {
    const confirmed = window.confirm(`Delete ${employee.name}?`)
    if (!confirmed) {
      return
    }

    try {
      await axios.post(`${API_BASE}/admin/employees/${employee.id}/delete`)
      loadDashboard()
    } catch (error) {
      alert(error?.response?.data?.detail || "Unable to delete employee")
    }
  }

  const saveAdvance = async () => {
    if (!advanceForm.employee_id || !advanceForm.advance_date || advanceForm.amount === "") {
      alert("Please select employee, date and amount")
      return
    }

    setSavingAdvance(true)
    try {
      await axios.post(`${API_BASE}/admin/employees/${advanceForm.employee_id}/advances`, null, {
        params: {
          advance_date: advanceForm.advance_date,
          amount: Number(advanceForm.amount),
          note: advanceForm.note,
        },
      })
      setAdvanceForm({
        employee_id: advanceForm.employee_id,
        advance_date: currentDateInput(),
        amount: "",
        note: "",
      })
      setShowAdvanceForm(false)
      loadDashboard()
    } finally {
      setSavingAdvance(false)
    }
  }

  const paySalary = async () => {
    if (!salaryForm.employee_id || salaryForm.absent_days === "") {
      alert("Please select employee and enter absent days")
      return
    }
    if (!data.salary_window_open) {
      alert("Salary payment is allowed only from 1st to 20th for now")
      return
    }
    if (salaryPreview?.invalid) {
      alert(salaryPreview.message)
      return
    }

    setPayingSalary(true)
    try {
      const response = await axios.post(`${API_BASE}/admin/salary/pay`, null, {
        params: {
          employee_id: Number(salaryForm.employee_id),
          payment_date: salaryForm.payment_date,
          absent_days: Number(salaryForm.absent_days),
        },
      })
      alert(`Salary paid: ${formatCurrency(response.data.payment.paid_amount)}`)
      setSalaryForm((current) => ({
        ...current,
        payment_date: currentDateInput(),
        absent_days: "",
      }))
      loadDashboard()
    } finally {
      setPayingSalary(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 2xl:grid-cols-6 xl:grid-cols-3 md:grid-cols-2">
        <div className="min-w-0 bg-white p-5 rounded-xl shadow">
          <h2 className="text-base font-semibold leading-snug text-slate-800 md:text-lg">Total Outstanding</h2>
          <p className="mt-3 overflow-hidden text-ellipsis whitespace-nowrap text-lg font-semibold leading-tight text-red-500 md:text-xl xl:text-2xl 2xl:text-[1.75rem]">
            {formatCurrency(data.total_outstanding)}
          </p>
        </div>

        <div className="min-w-0 bg-white p-5 rounded-xl shadow">
          <h2 className="text-base font-semibold leading-snug text-slate-800 md:text-lg">Avg. Stock (7 Days)</h2>
          <p className="mt-3 overflow-hidden text-ellipsis whitespace-nowrap text-lg font-semibold leading-tight text-slate-800 md:text-xl xl:text-2xl 2xl:text-[1.75rem]">
            {formatCurrency(data.average_stock_7_days)}
          </p>
        </div>

        <div className="min-w-0 bg-white p-5 rounded-xl shadow">
          <h2 className="text-base font-semibold leading-snug text-slate-800 md:text-lg">Prev. Day Stock</h2>
          <p className="mt-3 overflow-hidden text-ellipsis whitespace-nowrap text-lg font-semibold leading-tight text-slate-800 md:text-xl xl:text-2xl 2xl:text-[1.75rem]">
            {formatCurrency(data.previous_day_closing_stock)}
          </p>
        </div>

        <div className="min-w-0 bg-white p-5 rounded-xl shadow">
          <h2 className="text-base font-semibold leading-snug text-slate-800 md:text-lg">Active Dispatches</h2>
          <p className="mt-3 overflow-hidden text-ellipsis whitespace-nowrap text-lg font-semibold leading-tight text-slate-800 md:text-xl xl:text-2xl 2xl:text-[1.75rem]">
            {data.active_dispatches}
          </p>
        </div>

        <div className="min-w-0 bg-white p-5 rounded-xl shadow space-y-2">
          <p className="truncate text-sm font-medium text-slate-500">{data.prev_moc_month || "Prev. MOC"}</p>
          <h2 className="text-base font-semibold leading-snug text-slate-800 md:text-lg">Prev. MOC Sales</h2>
          <p className="overflow-hidden text-ellipsis whitespace-nowrap text-lg font-semibold leading-tight text-slate-900 md:text-xl xl:text-2xl 2xl:text-[1.75rem]">
            {formatCurrency(data.prev_moc_sales)}
          </p>
          {data.prev_moc_growth_percent === null ? (
            <p className="text-sm text-slate-500">Growth not available yet</p>
          ) : (
            <div
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ${
                data.prev_moc_growth_percent >= 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {data.prev_moc_growth_percent >= 0 ? <TrendUpIcon /> : <TrendDownIcon />}
              {Math.abs(data.prev_moc_growth_percent).toFixed(2)}%
            </div>
          )}
          <p className="text-xs text-slate-500">Margin {formatCurrency(data.prev_moc_margin)}</p>
        </div>

        <div className="min-w-0 bg-white p-5 rounded-xl shadow space-y-2">
          <p className="truncate text-sm font-medium text-slate-500">{data.prev_moc_month || "Prev. MOC"}</p>
          <h2 className="text-base font-semibold leading-snug text-slate-800 md:text-lg">Prev. MOC Profit</h2>
          <p className="overflow-hidden text-ellipsis whitespace-nowrap text-lg font-semibold leading-tight text-slate-900 md:text-xl xl:text-2xl 2xl:text-[1.75rem]">
            {formatCurrency(data.prev_moc_profit)}
          </p>
          {data.prev_moc_profit_growth_percent === null ? (
            <p className="text-sm text-slate-500">Profit growth not available yet</p>
          ) : (
            <div
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ${
                data.prev_moc_profit_growth_percent >= 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {data.prev_moc_profit_growth_percent >= 0 ? <TrendUpIcon /> : <TrendDownIcon />}
              {Math.abs(data.prev_moc_profit_growth_percent).toFixed(2)}%
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow">
            <button
              type="button"
              onClick={() => setShowExpenseSection((current) => !current)}
              className="flex w-full items-center justify-between px-6 py-5 text-left"
            >
              <div>
                <h3 className="text-lg font-semibold">Expenses</h3>
                <p className="text-sm text-gray-500">
                  Track day-to-day operating expenses directly from the dashboard.
                </p>
              </div>
              <span className="text-sm font-medium text-slate-600">
                {showExpenseSection ? "Hide" : "Show"}
              </span>
            </button>

            {showExpenseSection && (
              <div className="border-t border-slate-200 p-6 pt-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Current Month</p>
                    <p className="text-2xl font-semibold text-rose-600">
                      {formatCurrency(data.current_month_expenses)}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-wide text-gray-500">Previous Month</p>
                    <p className="text-lg font-semibold text-slate-700">
                      {formatCurrency(data.previous_month_expenses)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowExpenseForm((current) => !current)}
                    className="rounded bg-black px-4 py-2 text-white"
                  >
                    {showExpenseForm ? "Hide Expense Form" : "Add Expense"}
                  </button>
                </div>

                {showExpenseForm && (
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Date</label>
                        <input
                          type="date"
                          value={expenseForm.expense_date}
                          onChange={(e) =>
                            setExpenseForm((current) => ({ ...current, expense_date: e.target.value }))
                          }
                          className="w-full rounded border border-slate-300 px-3 py-2"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Expense Type</label>
                        <select
                          value={expenseForm.expense_type}
                          onChange={(e) =>
                            setExpenseForm((current) => ({ ...current, expense_type: e.target.value }))
                          }
                          className="w-full rounded border border-slate-300 px-3 py-2 bg-white"
                        >
                          {(data.expense_types.length
                            ? data.expense_types
                            : ["Stationary", "Fuel", "Wifi", "Electricity Bill", "Misc", "Salary", "Water", "Rent"]
                          ).map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-gray-700">Note / Remark</label>
                        <input
                          type="text"
                          value={expenseForm.note}
                          onChange={(e) =>
                            setExpenseForm((current) => ({ ...current, note: e.target.value }))
                          }
                          className="w-full rounded border border-slate-300 px-3 py-2"
                          placeholder="Optional note"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Amount</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={expenseForm.amount}
                          onChange={(e) =>
                            setExpenseForm((current) => ({ ...current, amount: e.target.value }))
                          }
                          className="w-full rounded border border-slate-300 px-3 py-2"
                          placeholder="Enter amount"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={saveExpense}
                      disabled={savingExpense}
                      className="rounded bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {savingExpense ? "Saving..." : "Save Expense"}
                    </button>
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Recent Expenses</h4>
                    <p className="text-sm text-gray-500">{data.recent_expenses.length} items</p>
                  </div>

                  {data.recent_expenses.length === 0 ? (
                    <p className="mt-3 text-sm text-gray-500">No expenses added for the current month yet.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {data.recent_expenses.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="font-medium">{item.expense_type}</p>
                            <p className="text-sm text-gray-500">
                              {formatExpenseDate(item.expense_date)}
                              {item.note ? ` • ${item.note}` : ""}
                            </p>
                          </div>
                          <p className="font-semibold text-rose-600">{formatCurrency(item.amount)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow">
            <button
              type="button"
              onClick={() => setShowEmployeesCorner((current) => !current)}
              className="flex w-full items-center justify-between px-6 py-5 text-left"
            >
              <div>
                <h3 className="text-lg font-semibold">Employees Corner</h3>
                <p className="text-sm text-gray-500">
                  See all employees, add new employees, and record salary advances.
                </p>
              </div>
              <span className="text-sm font-medium text-slate-600">
                {showEmployeesCorner ? "Hide" : "Show"}
              </span>
            </button>

            {showEmployeesCorner && (
              <div className="border-t border-slate-200 px-6 py-5 space-y-4">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAdvanceForm((current) => !current)}
                    className="rounded bg-black px-4 py-2 text-white"
                  >
                    {showAdvanceForm ? "Hide Advance Form" : "Record Advance Salary"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEmployeeForm((current) => !current)}
                    className="rounded border border-slate-300 bg-white px-4 py-2 text-slate-700"
                  >
                    {showEmployeeForm ? "Hide Employee Form" : "Add New Employee"}
                  </button>
                </div>

                {showEmployeeForm && (
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Employee Name</label>
                        <input
                          type="text"
                          value={employeeForm.name}
                          onChange={(e) => setEmployeeForm((current) => ({ ...current, name: e.target.value }))}
                          className="w-full rounded border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Role</label>
                        <select
                          value={employeeForm.role}
                          onChange={(e) => setEmployeeForm((current) => ({ ...current, role: e.target.value }))}
                          className="w-full rounded border border-slate-300 px-3 py-2 bg-white"
                        >
                          {(data.employee_roles.length
                            ? data.employee_roles
                            : ["Sales", "Picker", "Driver", "Helper", "IT"]
                          ).map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Phone Number</label>
                        <input
                          type="text"
                          value={employeeForm.phone}
                          onChange={(e) => setEmployeeForm((current) => ({ ...current, phone: e.target.value }))}
                          className="w-full rounded border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Salary</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={employeeForm.salary}
                          onChange={(e) => setEmployeeForm((current) => ({ ...current, salary: e.target.value }))}
                          className="w-full rounded border border-slate-300 px-3 py-2"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={editingEmployeeId ? updateEmployee : saveEmployee}
                      disabled={savingEmployee}
                      className="rounded bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {savingEmployee ? "Saving..." : editingEmployeeId ? "Update Employee" : "Save Employee"}
                    </button>
                  </div>
                )}

                {showAdvanceForm && (
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Employee</label>
                        <select
                          value={advanceForm.employee_id}
                          onChange={(e) => setAdvanceForm((current) => ({ ...current, employee_id: e.target.value }))}
                          className="w-full rounded border border-slate-300 px-3 py-2 bg-white"
                        >
                          <option value="">Select employee</option>
                          {data.employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Advance Date</label>
                        <input
                          type="date"
                          value={advanceForm.advance_date}
                          onChange={(e) => setAdvanceForm((current) => ({ ...current, advance_date: e.target.value }))}
                          className="w-full rounded border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Amount</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={advanceForm.amount}
                          onChange={(e) => setAdvanceForm((current) => ({ ...current, amount: e.target.value }))}
                          className="w-full rounded border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Remark</label>
                        <input
                          type="text"
                          value={advanceForm.note}
                          onChange={(e) => setAdvanceForm((current) => ({ ...current, note: e.target.value }))}
                          className="w-full rounded border border-slate-300 px-3 py-2"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={saveAdvance}
                      disabled={savingAdvance}
                      className="rounded bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {savingAdvance ? "Saving..." : "Save Advance"}
                    </button>
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-semibold">All Employees</h4>
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-gray-500">{data.employees.length} total</p>
                      <button
                        type="button"
                        onClick={() => setShowEmployeesList((current) => !current)}
                        className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
                      >
                        {showEmployeesList ? "Hide List" : "View List"}
                      </button>
                    </div>
                  </div>

                  {showEmployeesList ? data.employees.length === 0 ? (
                    <p className="mt-3 text-sm text-gray-500">No employees added yet.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {data.employees.map((employee) => (
                        <div
                          key={employee.id}
                          className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-sm text-gray-500">
                              {employee.role}
                              {employee.phone ? ` • ${employee.phone}` : ""}
                            </p>
                          </div>
                          <div className="text-left md:text-right">
                            <p className="text-sm text-gray-500">Salary {formatCurrency(employee.salary)}</p>
                            <p className="text-sm font-semibold text-amber-700">
                              Advance Due {formatCurrency(employee.outstanding_advance)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditEmployee(employee)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600"
                              title={`Edit ${employee.name}`}
                            >
                              <EditIcon />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeEmployee(employee)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-600"
                              title={`Delete ${employee.name}`}
                            >
                              <DeleteIcon />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Recent Advances</h4>
                    <p className="text-sm text-gray-500">{data.recent_advances.length} items</p>
                  </div>
                  {data.recent_advances.length === 0 ? (
                    <p className="mt-3 text-sm text-gray-500">No advance salary entries yet.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {data.recent_advances.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="font-medium">{item.employee_name}</p>
                            <p className="text-sm text-gray-500">
                              {formatExpenseDate(item.advance_date)}
                              {item.note ? ` • ${item.note}` : ""}
                            </p>
                          </div>
                          <p className="font-semibold text-amber-700">{formatCurrency(item.amount)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow">
            <button
              type="button"
              onClick={() => setShowSalaryCalculator((current) => !current)}
              className="flex w-full items-center justify-between px-6 py-5 text-left"
            >
              <div>
                <h3 className="text-lg font-semibold">Salary Calculator</h3>
                <p className="text-sm text-gray-500">
                  Salary after deductions.
                </p>
              </div>
              <span className="text-sm font-medium text-slate-600">
                {showSalaryCalculator ? "Hide" : "Show"}
              </span>
            </button>

            {showSalaryCalculator && (
              <div className="border-t border-slate-200 px-6 py-5 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-gray-600">
                    Salary month: <span className="font-semibold text-slate-900">{data.salary_target_month || "Previous Month"}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Total days in month: <span className="font-semibold text-slate-900">{data.salary_total_days}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Working days excluding Sundays: <span className="font-semibold text-slate-900">{data.salary_working_days}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Paid leave allowed: <span className="font-semibold text-slate-900">{data.paid_leave_days} day</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Payment window: <span className="font-semibold text-slate-900">1st to 20th</span>
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Employee</label>
                    <select
                      value={salaryForm.employee_id}
                      onChange={(e) => setSalaryForm((current) => ({ ...current, employee_id: e.target.value }))}
                      className="w-full rounded border border-slate-300 px-3 py-2 bg-white"
                    >
                      <option value="">Select employee</option>
                      {data.employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Payment Date</label>
                    <input
                      type="date"
                      value={salaryForm.payment_date}
                      onChange={(e) => setSalaryForm((current) => ({ ...current, payment_date: e.target.value }))}
                      className="w-full rounded border border-slate-300 px-3 py-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Days Absent</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={salaryForm.absent_days}
                      onChange={(e) => setSalaryForm((current) => ({ ...current, absent_days: e.target.value }))}
                      className="w-full rounded border border-slate-300 px-3 py-2"
                    />
                  </div>
                </div>

                {salaryPreview && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    {salaryPreview.invalid ? (
                      <p className="text-sm font-medium text-rose-600">{salaryPreview.message}</p>
                    ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-sm text-gray-500">Monthly Salary</p>
                        <p className="font-semibold">{formatCurrency(salaryPreview.monthlySalary)}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-sm text-gray-500">Per Day Salary Base</p>
                        <p className="font-semibold">{formatCurrency(salaryPreview.totalDays ? salaryPreview.monthlySalary / salaryPreview.totalDays : 0)}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-sm text-gray-500">Working Days</p>
                        <p className="font-semibold">{salaryPreview.workingDays}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-sm text-gray-500">Present Days</p>
                        <p className="font-semibold">{salaryPreview.presentDays}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-sm text-gray-500">Absent Days</p>
                        <p className="font-semibold">{salaryPreview.absentDays}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-sm text-gray-500">Previous Month Advance</p>
                        <p className="font-semibold text-amber-700">{formatCurrency(salaryPreview.previousMonthAdvance)}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-sm text-gray-500">Absent Deduction</p>
                        <p className="font-semibold text-rose-600">{formatCurrency(salaryPreview.absentDeduction)}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-sm text-gray-500">Deducted Leave Days</p>
                        <p className="font-semibold">{salaryPreview.deductibleAbsentDays}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-sm text-gray-500">Advance Deduction</p>
                        <p className="font-semibold text-amber-700">{formatCurrency(salaryPreview.advanceDeduction)}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 md:col-span-2">
                        <p className="text-sm text-gray-500">Remaining Salary To Pay</p>
                        <p className="text-xl font-semibold text-emerald-700">
                          {formatCurrency(salaryPreview.remainingSalary)}
                        </p>
                      </div>
                    </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={paySalary}
                  disabled={payingSalary || !data.salary_window_open || salaryPreview?.invalid}
                  className="rounded bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {payingSalary ? "Paying..." : data.salary_window_open ? "Pay" : "Pay Disabled"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow space-y-5">
          <div>
            <h3 className="text-lg font-semibold">Expense Split</h3>
            <p className="text-sm text-gray-500">
              Current month category-wise expense distribution.
            </p>
          </div>

          <div className="flex flex-col items-center gap-5">
            {data.expense_breakdown.length === 0 ? (
              <p className="text-sm text-gray-500">No expense data available for the current month.</p>
            ) : (
              <div className="relative flex flex-col items-center gap-4">
                <div className="relative h-64 w-64">
                  <svg
                    viewBox="0 0 240 240"
                    className="h-full w-full drop-shadow-sm"
                    onMouseLeave={() => setHoveredExpenseIndex(null)}
                  >
                    {pieSlices.map((slice, index) => (
                      <path
                        key={slice.type}
                        d={slice.path}
                        fill={slice.color}
                        className="cursor-pointer transition duration-150 hover:opacity-90"
                        onMouseEnter={() => setHoveredExpenseIndex(index)}
                      />
                    ))}
                    <circle cx="120" cy="120" r="48" fill="#fff" />
                  </svg>

                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="max-w-[8rem] text-center">
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        {hoveredExpenseIndex !== null ? pieSlices[hoveredExpenseIndex]?.type : "This Month"}
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {hoveredExpenseIndex !== null
                          ? formatCurrency(pieSlices[hoveredExpenseIndex]?.amount)
                          : formatCurrency(data.current_month_expenses)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  {pieSlices.map((slice, index) => (
                    <button
                      key={slice.type}
                      type="button"
                      onMouseEnter={() => setHoveredExpenseIndex(index)}
                      onMouseLeave={() => setHoveredExpenseIndex(null)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                        hoveredExpenseIndex === index
                          ? "border-slate-400 bg-slate-100 text-slate-900"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: slice.color }}
                      />
                      {slice.type}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
