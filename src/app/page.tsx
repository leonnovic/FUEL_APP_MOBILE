'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Fuel, LayoutDashboard, Building2, Droplets, ShoppingCart, Clock, CheckSquare,
  ShieldCheck, Truck, Ticket, Settings, Menu, X, Plus, Download,
  AlertTriangle, TrendingUp, DollarSign, MapPin, Phone, User, Activity,
  Search, Filter, CircleDot, CheckCircle2, XCircle, AlertCircle, Bell,
  FileText, Users, Database, Shield, Zap, ChevronRight, Edit, Trash2,
  Play, Square, BarChart3, ArrowUpRight, ArrowDownRight,
  Gauge, Loader2, Package, Eye, Power, Copy
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend, PieChart, Pie
} from 'recharts'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

type TabId = 'dashboard' | 'stations' | 'inventory' | 'sales' | 'shifts' | 'deliveries' | 'reconciliation' | 'compliance' | 'suppliers' | 'coupons' | 'admin'

interface NavItem {
  id: TabId
  label: string
  icon: React.ReactNode
  group: string
}

// API response types
interface DashboardAPIResponse {
  ok: boolean
  data: {
    totalStations: number
    salesToday: number
    totalRevenue: number
    totalLitersSold: number
    activeShifts: number
    tankAlerts: {
      id: string
      fuelType: string
      currentStock: number
      capacity: number
      alertThreshold: number
      station: { id: string; name: string }
    }[]
    recentSales: {
      id: string
      stationId: string
      userId: string
      fuelType: string
      quantityLiters: number
      pricePerLiter: number
      totalAmount: number
      paymentMethod: string
      mpesaReceipt: string | null
      customerName: string | null
      createdAt: string
      station: { id: string; name: string }
    }[]
  }
}

interface StationAPIResponse {
  ok: boolean
  data: {
    id: string
    name: string
    location: string | null
    phone: string | null
    county: string | null
    status: string
    createdAt: string
    updatedAt: string
    tanks: {
      id: string
      fuelType: string
      currentStock: number
      capacity: number
      pricePerLiter: number
      alertThreshold: number
    }[]
    tankCount: number
    salesCount: number
    shiftsCount: number
  }[]
}

interface SalesAPIResponse {
  ok: boolean
  data: {
    id: string
    stationId: string
    userId: string
    fuelType: string
    quantityLiters: number
    pricePerLiter: number
    totalAmount: number
    paymentMethod: string
    mpesaReceipt: string | null
    customerName: string | null
    createdAt: string
    station: { id: string; name: string }
  }[]
}

interface InventoryAPIResponse {
  ok: boolean
  data: {
    id: string
    stationId: string
    fuelType: string
    currentStock: number
    capacity: number
    pricePerLiter: number
    alertThreshold: number
    station: { id: string; name: string; location: string | null; county: string | null }
    isLow: boolean
    utilizationPct: number
  }[]
}

interface ShiftsAPIResponse {
  ok: boolean
  data: {
    id: string
    stationId: string
    userId: string
    attendantName: string
    fuelType: string
    openingReading: number
    closingReading: number | null
    litersSold: number | null
    cashCollected: number | null
    status: string
    startedAt: string
    endedAt: string | null
    station: { id: string; name: string }
  }[]
}

interface ComplianceAPIResponse {
  ok: boolean
  data: {
    hardcoded: Record<string, Record<string, number>>
    database: {
      id: string
      fuelType: string
      region: string
      maxPrice: number
      effectiveAt: string
    }[]
    lastUpdated: string
    currency: string
    unit: string
  }
}

interface ReconciliationAPIResponse {
  ok: boolean
  data: {
    id: string
    stationId: string
    fuelType: string
    bookStock: number
    physicalStock: number
    deliveryReceived: number
    variance: number
    variancePct: number
    flag: string
    notes: string | null
    station: { id: string; name: string }
    recordedAt: string
  }[]
}

interface SupplierAPIResponse {
  ok: boolean
  data: {
    id: string
    name: string
    contact: string | null
    fuelTypes: string | null
    location: string | null
    status: string
    createdAt: string
    updatedAt: string
  }[]
}

interface CouponAPIResponse {
  ok: boolean
  data: {
    id: string
    code: string
    type: string
    value: number
    maxUses: number
    uses: number
    status: string
    createdAt: string
    updatedAt: string
  }[]
}

interface DeliveryAPIResponse {
  ok: boolean
  data: {
    id: string
    stationId: string
    supplierName: string
    fuelType: string
    volumeLiters: number
    costPerLiter: number | null
    totalCost: number | null
    deliveredAt: string
    station: { id: string; name: string }
  }[]
}

interface AdminData {
  users: { id: number; name: string; email: string; role: string; status: string; lastLogin: string }[]
  auditLogs: { id: number; user: string; action: string; details: string; timestamp: string; severity: string }[]
  config: {
    companyName: string
    currency: string
    timezone: string
    taxRate: number
    epraApiKey: string
    kraEtimsEnabled: boolean
    autoReorderLevel: number
    shiftDuration: number
    receiptFooter: string
  }
}

interface Notification {
  id: string
  title: string
  message: string
  type: 'alert' | 'warning' | 'info' | 'success'
  time: string
  read: boolean
}

// ─── Navigation Config ───────────────────────────────────────────────────────

const navigationItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="size-4" />, group: 'Overview' },
  { id: 'stations', label: 'Stations', icon: <Building2 className="size-4" />, group: 'Operations' },
  { id: 'inventory', label: 'Inventory', icon: <Droplets className="size-4" />, group: 'Operations' },
  { id: 'sales', label: 'Sales', icon: <ShoppingCart className="size-4" />, group: 'Operations' },
  { id: 'shifts', label: 'Shifts', icon: <Clock className="size-4" />, group: 'Operations' },
  { id: 'deliveries', label: 'Deliveries', icon: <Package className="size-4" />, group: 'Operations' },
  { id: 'reconciliation', label: 'Reconciliation', icon: <CheckSquare className="size-4" />, group: 'Finance' },
  { id: 'compliance', label: 'Compliance', icon: <ShieldCheck className="size-4" />, group: 'Finance' },
  { id: 'suppliers', label: 'Suppliers', icon: <Truck className="size-4" />, group: 'Supply Chain' },
  { id: 'coupons', label: 'Coupons', icon: <Ticket className="size-4" />, group: 'Supply Chain' },
  { id: 'admin', label: 'Admin', icon: <Settings className="size-4" />, group: 'System' },
]

const navGroups = ['Overview', 'Operations', 'Finance', 'Supply Chain', 'System']

// ─── Mock data for charts ──────────────────────────────────────────────────

const revenueChartData = [
  { month: 'Jan', revenue: 185000, sales: 1420 },
  { month: 'Feb', revenue: 210000, sales: 1580 },
  { month: 'Mar', revenue: 195000, sales: 1490 },
  { month: 'Apr', revenue: 240000, sales: 1750 },
  { month: 'May', revenue: 225000, sales: 1680 },
  { month: 'Jun', revenue: 260000, sales: 1920 },
  { month: 'Jul', revenue: 280000, sales: 2050 },
  { month: 'Aug', revenue: 275000, sales: 1980 },
  { month: 'Sep', revenue: 290000, sales: 2100 },
  { month: 'Oct', revenue: 310000, sales: 2250 },
  { month: 'Nov', revenue: 295000, sales: 2150 },
  { month: 'Dec', revenue: 320000, sales: 2350 },
]

const fuelTrendData = [
  { day: 'Mon', Petrol: 42, Diesel: 35, Kerosene: 12 },
  { day: 'Tue', Petrol: 48, Diesel: 32, Kerosene: 15 },
  { day: 'Wed', Petrol: 52, Diesel: 38, Kerosene: 11 },
  { day: 'Thu', Petrol: 45, Diesel: 41, Kerosene: 14 },
  { day: 'Fri', Petrol: 61, Diesel: 45, Kerosene: 18 },
  { day: 'Sat', Petrol: 58, Diesel: 42, Kerosene: 16 },
  { day: 'Sun', Petrol: 35, Diesel: 28, Kerosene: 9 },
]

// ─── Helper Functions ────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-KE').format(num)
}

function getFillBarColor(pct: number, isLow: boolean): string {
  if (isLow) return pct <= 20 ? 'bg-red-500' : 'bg-amber-500'
  return 'bg-emerald-500'
}

function getFillBarTrack(pct: number, isLow: boolean): string {
  if (isLow) return pct <= 20 ? 'bg-red-950' : 'bg-amber-950'
  return 'bg-emerald-950'
}

function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  return d.toLocaleDateString()
}

function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return
  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = row[h]
      const str = String(val ?? '')
      return str.includes(',') ? `"${str}"` : str
    }).join(','))
  ]
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success(`Exported ${data.length} records`)
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function FuelProDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Data states
  const [dashboardData, setDashboardData] = useState<DashboardAPIResponse['data'] | null>(null)
  const [stations, setStations] = useState<StationAPIResponse['data']>([])
  const [sales, setSales] = useState<SalesAPIResponse['data']>([])
  const [inventory, setInventory] = useState<InventoryAPIResponse['data']>([])
  const [shifts, setShifts] = useState<ShiftsAPIResponse['data']>([])
  const [complianceData, setComplianceData] = useState<ComplianceAPIResponse['data'] | null>(null)
  const [adminData, setAdminData] = useState<AdminData | null>(null)
  const [suppliers, setSuppliers] = useState<SupplierAPIResponse['data']>([])
  const [coupons, setCoupons] = useState<CouponAPIResponse['data']>([])
  const [reconciliations, setReconciliations] = useState<ReconciliationAPIResponse['data']>([])
  const [deliveries, setDeliveries] = useState<DeliveryAPIResponse['data']>([])

  // Loading states
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  // Dialog states
  const [stationDialogOpen, setStationDialogOpen] = useState(false)
  const [saleDialogOpen, setSaleDialogOpen] = useState(false)
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false)
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false)
  const [couponDialogOpen, setCouponDialogOpen] = useState(false)
  const [reconciliationDialogOpen, setReconciliationDialogOpen] = useState(false)
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false)
  const [stationDetailDialogOpen, setStationDetailDialogOpen] = useState(false)
  const [selectedStation, setSelectedStation] = useState<StationAPIResponse['data'][number] | null>(null)

  // Form states
  const [newStation, setNewStation] = useState({ name: '', location: '', manager: '', phone: '', county: '' })
  const [newSale, setNewSale] = useState({ stationId: '', fuelType: 'Petrol', quantityLiters: 0, pricePerLiter: 199.63, paymentMethod: 'cash', userId: 'demo-user' })
  const [newShift, setNewShift] = useState({ stationId: '', attendantName: '', fuelType: 'Petrol', openingReading: 0, userId: 'demo-user' })
  const [newSupplier, setNewSupplier] = useState({ name: '', contact: '', fuelTypes: '', location: '' })
  const [newCoupon, setNewCoupon] = useState({ code: '', type: 'percentage', value: 0, maxUses: 100 })
  const [newReconciliation, setNewReconciliation] = useState({ stationId: '', fuelType: 'Petrol', bookStock: 0, physicalStock: 0, deliveryReceived: 0, notes: '' })
  const [newDelivery, setNewDelivery] = useState({ stationId: '', supplierName: '', fuelType: 'Petrol', volumeLiters: 0, costPerLiter: 0 })

  // Filter states
  const [salesFilter, setSalesFilter] = useState('all')
  const [salesSearch, setSalesSearch] = useState('')

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifOpen, setNotifOpen] = useState(false)

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    setLoading(prev => ({ ...prev, dashboard: true }))
    try {
      const res = await fetch('/api/dashboard')
      const json = await res.json()
      if (json.ok) {
        setDashboardData(json.data)
        // Build notifications from tank alerts
        const alerts: Notification[] = (json.data.tankAlerts || []).map((a: { id: string; fuelType: string; currentStock: number; alertThreshold: number; station: { name: string } }) => ({
          id: a.id,
          title: 'Low Tank Alert',
          message: `${a.fuelType} at ${a.station.name}: ${formatNumber(a.currentStock)}L (min: ${formatNumber(a.alertThreshold)}L)`,
          type: a.currentStock <= a.alertThreshold * 0.5 ? 'alert' : 'warning',
          time: new Date().toISOString(),
          read: false,
        }))
        setNotifications(alerts)
      }
    } catch { toast.error('Failed to load dashboard data') }
    finally { setLoading(prev => ({ ...prev, dashboard: false })) }
  }, [])

  const fetchStations = useCallback(async () => {
    setLoading(prev => ({ ...prev, stations: true }))
    try {
      const res = await fetch('/api/stations')
      const json = await res.json()
      if (json.ok) setStations(json.data)
    } catch { toast.error('Failed to load stations') }
    finally { setLoading(prev => ({ ...prev, stations: false })) }
  }, [])

  const fetchSales = useCallback(async () => {
    setLoading(prev => ({ ...prev, sales: true }))
    try {
      const res = await fetch('/api/sales')
      const json = await res.json()
      if (json.ok) setSales(json.data)
    } catch { toast.error('Failed to load sales') }
    finally { setLoading(prev => ({ ...prev, sales: false })) }
  }, [])

  const fetchInventory = useCallback(async () => {
    setLoading(prev => ({ ...prev, inventory: true }))
    try {
      const res = await fetch('/api/inventory')
      const json = await res.json()
      if (json.ok) setInventory(json.data)
    } catch { toast.error('Failed to load inventory') }
    finally { setLoading(prev => ({ ...prev, inventory: false })) }
  }, [])

  const fetchShifts = useCallback(async () => {
    setLoading(prev => ({ ...prev, shifts: true }))
    try {
      const res = await fetch('/api/shifts')
      const json = await res.json()
      if (json.ok) setShifts(json.data)
    } catch { toast.error('Failed to load shifts') }
    finally { setLoading(prev => ({ ...prev, shifts: false })) }
  }, [])

  const fetchCompliance = useCallback(async () => {
    setLoading(prev => ({ ...prev, compliance: true }))
    try {
      const res = await fetch('/api/compliance')
      const json = await res.json()
      if (json.ok) setComplianceData(json.data)
    } catch { toast.error('Failed to load compliance data') }
    finally { setLoading(prev => ({ ...prev, compliance: false })) }
  }, [])

  const fetchAdmin = useCallback(async () => {
    setLoading(prev => ({ ...prev, admin: true }))
    try {
      const res = await fetch('/api/admin')
      const data = await res.json()
      setAdminData(data)
    } catch { toast.error('Failed to load admin data') }
    finally { setLoading(prev => ({ ...prev, admin: false })) }
  }, [])

  const fetchSuppliers = useCallback(async () => {
    setLoading(prev => ({ ...prev, suppliers: true }))
    try {
      const res = await fetch('/api/suppliers')
      const json = await res.json()
      if (json.ok) setSuppliers(json.data)
    } catch { toast.error('Failed to load suppliers') }
    finally { setLoading(prev => ({ ...prev, suppliers: false })) }
  }, [])

  const fetchCoupons = useCallback(async () => {
    setLoading(prev => ({ ...prev, coupons: true }))
    try {
      const res = await fetch('/api/coupons')
      const json = await res.json()
      if (json.ok) setCoupons(json.data)
    } catch { toast.error('Failed to load coupons') }
    finally { setLoading(prev => ({ ...prev, coupons: false })) }
  }, [])

  const fetchReconciliations = useCallback(async () => {
    setLoading(prev => ({ ...prev, reconciliation: true }))
    try {
      const res = await fetch('/api/reconciliation')
      const json = await res.json()
      if (json.ok) setReconciliations(json.data)
    } catch { toast.error('Failed to load reconciliation data') }
    finally { setLoading(prev => ({ ...prev, reconciliation: false })) }
  }, [])

  const fetchDeliveries = useCallback(async () => {
    setLoading(prev => ({ ...prev, deliveries: true }))
    try {
      const res = await fetch('/api/deliveries')
      const json = await res.json()
      if (json.ok) setDeliveries(json.data)
    } catch { toast.error('Failed to load deliveries') }
    finally { setLoading(prev => ({ ...prev, deliveries: false })) }
  }, [])

  // Load data when tab changes
  useEffect(() => {
    switch (activeTab) {
      case 'dashboard': fetchDashboard(); break
      case 'stations': fetchStations(); break
      case 'inventory': fetchInventory(); break
      case 'sales': fetchSales(); break
      case 'shifts': fetchShifts(); break
      case 'compliance': fetchCompliance(); break
      case 'admin': fetchAdmin(); break
      case 'suppliers': fetchSuppliers(); break
      case 'coupons': fetchCoupons(); break
      case 'reconciliation': fetchReconciliations(); break
      case 'deliveries': fetchDeliveries(); break
    }
  }, [activeTab, fetchDashboard, fetchStations, fetchInventory, fetchSales, fetchShifts, fetchCompliance, fetchAdmin, fetchSuppliers, fetchCoupons, fetchReconciliations, fetchDeliveries])

  // Initial load
  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  // ─── Action Handlers ───────────────────────────────────────────────────────

  const handleAddStation = async () => {
    if (!newStation.name) { toast.error('Please fill in station name'); return }
    try {
      const res = await fetch('/api/stations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newStation) })
      const json = await res.json()
      if (json.ok) {
        setStations(prev => [json.data, ...prev])
        setStationDialogOpen(false)
        setNewStation({ name: '', location: '', manager: '', phone: '', county: '' })
        toast.success(`Station "${json.data.name}" added successfully`)
      } else { toast.error(json.error || 'Failed to add station') }
    } catch { toast.error('Failed to add station') }
  }

  const handleAddSale = async () => {
    if (!newSale.stationId || !newSale.quantityLiters) { toast.error('Please fill in station and quantity'); return }
    try {
      const res = await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSale) })
      const json = await res.json()
      if (json.ok) {
        setSales(prev => [json.data, ...prev])
        setSaleDialogOpen(false)
        setNewSale({ stationId: '', fuelType: 'Petrol', quantityLiters: 0, pricePerLiter: 199.63, paymentMethod: 'cash', userId: 'demo-user' })
        toast.success('Sale recorded successfully')
      } else { toast.error(json.error || 'Failed to record sale') }
    } catch { toast.error('Failed to record sale') }
  }

  const handleStartShift = async () => {
    if (!newShift.stationId || !newShift.attendantName) { toast.error('Please fill in station and attendant name'); return }
    try {
      const res = await fetch('/api/shifts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newShift) })
      const json = await res.json()
      if (json.ok) {
        setShifts(prev => [json.data, ...prev])
        setShiftDialogOpen(false)
        setNewShift({ stationId: '', attendantName: '', fuelType: 'Petrol', openingReading: 0, userId: 'demo-user' })
        toast.success(`Shift started for ${json.data.attendantName}`)
      } else { toast.error(json.error || 'Failed to start shift') }
    } catch { toast.error('Failed to start shift') }
  }

  const handleEndShift = async (shiftId: string) => {
    try {
      const shift = shifts.find(s => s.id === shiftId)
      if (!shift) return
      const closingReading = shift.openingReading + Math.floor(Math.random() * 500 + 100)
      const litersSold = closingReading - shift.openingReading
      const res = await fetch('/api/shifts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: shiftId, closingReading, litersSold, cashCollected: litersSold * 195, status: 'completed' }) })
      const json = await res.json()
      if (json.ok) { setShifts(prev => prev.map(s => s.id === shiftId ? json.data : s)); toast.success('Shift ended successfully') }
      else { toast.error(json.error || 'Failed to end shift') }
    } catch { toast.error('Failed to end shift') }
  }

  const handleAddSupplier = async () => {
    if (!newSupplier.name) { toast.error('Supplier name is required'); return }
    try {
      const res = await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSupplier) })
      const json = await res.json()
      if (json.ok) {
        setSuppliers(prev => [json.data, ...prev])
        setSupplierDialogOpen(false)
        setNewSupplier({ name: '', contact: '', fuelTypes: '', location: '' })
        toast.success(`Supplier "${json.data.name}" added successfully`)
      } else { toast.error(json.error || 'Failed to add supplier') }
    } catch { toast.error('Failed to add supplier') }
  }

  const handleAddCoupon = async () => {
    if (!newCoupon.code || !newCoupon.value) { toast.error('Coupon code and value are required'); return }
    try {
      const res = await fetch('/api/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCoupon) })
      const json = await res.json()
      if (json.ok) {
        setCoupons(prev => [json.data, ...prev])
        setCouponDialogOpen(false)
        setNewCoupon({ code: '', type: 'percentage', value: 0, maxUses: 100 })
        toast.success(`Coupon "${json.data.code}" created successfully`)
      } else { toast.error(json.error || 'Failed to create coupon') }
    } catch { toast.error('Failed to create coupon') }
  }

  const handleAddReconciliation = async () => {
    if (!newReconciliation.stationId) { toast.error('Please select a station'); return }
    try {
      const res = await fetch('/api/reconciliation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newReconciliation) })
      const json = await res.json()
      if (json.ok) {
        setReconciliations(prev => [json.data, ...prev])
        setReconciliationDialogOpen(false)
        setNewReconciliation({ stationId: '', fuelType: 'Petrol', bookStock: 0, physicalStock: 0, deliveryReceived: 0, notes: '' })
        toast.success('Reconciliation record created')
      } else { toast.error(json.error || 'Failed to create reconciliation') }
    } catch { toast.error('Failed to create reconciliation') }
  }

  const handleAddDelivery = async () => {
    if (!newDelivery.stationId || !newDelivery.supplierName || !newDelivery.volumeLiters) { toast.error('Station, supplier and volume are required'); return }
    try {
      const res = await fetch('/api/deliveries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newDelivery) })
      const json = await res.json()
      if (json.ok) {
        setDeliveries(prev => [json.data, ...prev])
        setDeliveryDialogOpen(false)
        setNewDelivery({ stationId: '', supplierName: '', fuelType: 'Petrol', volumeLiters: 0, costPerLiter: 0 })
        toast.success('Delivery recorded and tank stock updated')
      } else { toast.error(json.error || 'Failed to record delivery') }
    } catch { toast.error('Failed to record delivery') }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  // ─── Sidebar Component ─────────────────────────────────────────────────────

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
        <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 shrink-0">
          <Fuel className="size-5 text-amber-500" />
        </div>
        {(sidebarOpen || mobileSidebarOpen) && (
          <div className="flex flex-col">
            <span className="text-lg font-bold text-white tracking-tight">FuelPro</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Station Manager</span>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-6">
          {navGroups.map(group => (
            <div key={group}>
              {(sidebarOpen || mobileSidebarOpen) && (
                <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">{group}</p>
              )}
              <div className="space-y-1">
                {navigationItems.filter(item => item.group === group).map(item => {
                  const isActive = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setMobileSidebarOpen(false) }}
                      className={`flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive ? 'bg-amber-500/15 text-amber-400 shadow-sm shadow-amber-500/5' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}
                    >
                      <span className={isActive ? 'text-amber-500' : 'text-slate-500'}>{item.icon}</span>
                      {(sidebarOpen || mobileSidebarOpen) && <span>{item.label}</span>}
                      {isActive && (sidebarOpen || mobileSidebarOpen) && <ChevronRight className="size-3 ml-auto text-amber-500/60" />}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {(sidebarOpen || mobileSidebarOpen) && (
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50">
            <div className="flex items-center justify-center size-9 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-600/10 text-amber-500 font-semibold text-sm">AD</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">Admin User</p>
              <p className="text-xs text-slate-500 truncate">admin@fuelpro.ke</p>
            </div>
            <Badge variant="secondary" className="text-[9px] bg-emerald-500/15 text-emerald-400 border-0">
              <div className="size-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />Online
            </Badge>
          </div>
        </div>
      )}
    </div>
  )

  // ─── Tab Content Renderers ─────────────────────────────────────────────────

  const renderDashboard = () => {
    if (loading.dashboard) return <DashboardSkeletons />
    if (!dashboardData) return null
    const d = dashboardData

    return (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard title="Total Stations" value={d.totalStations} icon={<Building2 className="size-5" />} color="amber" trend="+2 this quarter" trendUp />
          <KPICard title="Today's Sales" value={formatNumber(d.totalLitersSold)} subtitle="litres" icon={<Droplets className="size-5" />} color="emerald" trend={`${d.salesToday} transactions`} trendUp />
          <KPICard title="Total Revenue" value={formatCurrency(d.totalRevenue)} subtitle="today" icon={<DollarSign className="size-5" />} color="emerald" trend="+8.3%" trendUp />
          <KPICard title="Tank Alerts" value={d.tankAlerts.length} icon={<AlertTriangle className="size-5" />} color="red" trend="Below threshold" trendUp={false} />
          <KPICard title="Active Shifts" value={d.activeShifts} icon={<Clock className="size-5" />} color="violet" trend="Running" trendUp />
        </div>

        {/* Revenue Chart + Tank Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-900/95 border-slate-800 rounded-xl">
            <CardHeader>
              <CardTitle className="text-slate-100">Revenue Overview</CardTitle>
              <CardDescription>Monthly revenue performance for 2026</CardDescription>
              <CardAction>
                <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-0"><TrendingUp className="size-3 mr-1" /> +8.3% YoY</Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueChartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#e2e8f0' }} formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {revenueChartData.map((_, index) => (
                        <Cell key={index} fill={index === revenueChartData.length - 1 ? '#f59e0b' : '#334155'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 rounded-xl">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2"><AlertTriangle className="size-4 text-red-400" /> Tank Alerts</CardTitle>
              <CardDescription>Low inventory warnings</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-72">
                {d.tankAlerts.length === 0 ? (
                  <div className="text-center py-8"><CheckCircle2 className="size-10 text-emerald-500 mx-auto mb-3" /><p className="text-slate-300">All tanks at safe levels</p></div>
                ) : (
                  <div className="space-y-3">
                    {d.tankAlerts.map((alert) => {
                      const pct = alert.capacity > 0 ? Math.round((alert.currentStock / alert.capacity) * 100) : 0
                      const isCritical = alert.currentStock <= alert.alertThreshold * 0.5
                      return (
                        <div key={alert.id} className={`p-3 rounded-lg border transition-all duration-200 hover:scale-[1.01] ${isCritical ? 'bg-red-950/30 border-red-900/50' : 'bg-amber-950/30 border-amber-900/50'}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-sm font-medium text-slate-200">{alert.station.name}</p>
                              <p className="text-xs text-slate-500">{alert.fuelType} — {formatNumber(alert.currentStock)}L / {formatNumber(alert.alertThreshold)}L min</p>
                            </div>
                            <Badge variant={isCritical ? 'destructive' : 'secondary'} className="text-[10px]">{isCritical ? 'Critical' : 'Low'}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-1.5 flex-1" />
                            <span className="text-xs text-slate-400">{pct}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Fuel Price Trends */}
        <Card className="bg-gradient-to-br from-slate-900 to-slate-900/95 border-slate-800 rounded-xl">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2"><TrendingUp className="size-4 text-amber-400" /> Fuel Sales Trends</CardTitle>
            <CardDescription>Daily sales volume by fuel type (litres)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fuelTrendData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#e2e8f0' }} />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                  <Line type="monotone" dataKey="Petrol" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Diesel" stroke="#64748b" strokeWidth={2} dot={{ fill: '#64748b', r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Kerosene" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="bg-slate-900 border-slate-800 rounded-xl">
          <CardHeader>
            <CardTitle className="text-slate-100">Recent Sales</CardTitle>
            <CardDescription>Latest transactions across all stations</CardDescription>
            <CardAction>
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => setActiveTab('sales')}>View All <ChevronRight className="size-3 ml-1" /></Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Station</TableHead>
                  <TableHead className="text-slate-400">Product</TableHead>
                  <TableHead className="text-slate-400 text-right">Quantity (L)</TableHead>
                  <TableHead className="text-slate-400 text-right">Unit Price</TableHead>
                  <TableHead className="text-slate-400 text-right">Amount</TableHead>
                  <TableHead className="text-slate-400">Payment</TableHead>
                  <TableHead className="text-slate-400 text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.recentSales.map((sale) => (
                  <TableRow key={sale.id} className="border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <TableCell className="text-slate-200">{sale.station.name}</TableCell>
                    <TableCell><Badge variant="secondary" className="bg-slate-800 text-slate-300 border-0">{sale.fuelType}</Badge></TableCell>
                    <TableCell className="text-right text-slate-300">{formatNumber(sale.quantityLiters)}</TableCell>
                    <TableCell className="text-right text-slate-400">{formatCurrency(sale.pricePerLiter)}</TableCell>
                    <TableCell className="text-right text-slate-200 font-medium">{formatCurrency(sale.totalAmount)}</TableCell>
                    <TableCell><Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px] capitalize">{sale.paymentMethod}</Badge></TableCell>
                    <TableCell className="text-right text-slate-400 text-xs">{formatTimeAgo(sale.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderStations = () => {
    if (loading.stations) return <TableSkeletons cols={5} rows={4} />
    const activeStations = stations.filter(s => s.status === 'active').length
    const maintenanceStations = stations.filter(s => s.status === 'maintenance').length

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Stations</h2>
            <p className="text-sm text-slate-400 mt-1">{stations.length} stations · {activeStations} active · {maintenanceStations} maintenance</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800"><Download className="size-4 mr-2" /> Export</Button>
            <Dialog open={stationDialogOpen} onOpenChange={setStationDialogOpen}>
              <DialogTrigger asChild><Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"><Plus className="size-4 mr-2" /> Add Station</Button></DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800">
                <DialogHeader><DialogTitle className="text-slate-100">Add New Station</DialogTitle><DialogDescription className="text-slate-400">Register a new fuel station to the system</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2"><Label className="text-slate-300">Station Name</Label><Input value={newStation.name} onChange={e => setNewStation(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Nairobi Central" className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                  <div className="grid gap-2"><Label className="text-slate-300">Location</Label><Input value={newStation.location} onChange={e => setNewStation(p => ({ ...p, location: e.target.value }))} placeholder="e.g., Kenyatta Avenue, Nairobi" className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label className="text-slate-300">County</Label><Input value={newStation.county} onChange={e => setNewStation(p => ({ ...p, county: e.target.value }))} placeholder="e.g., Nairobi" className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                    <div className="grid gap-2"><Label className="text-slate-300">Phone</Label><Input value={newStation.phone} onChange={e => setNewStation(p => ({ ...p, phone: e.target.value }))} placeholder="+254 7XX XXX XXX" className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setStationDialogOpen(false)} className="border-slate-700 text-slate-300">Cancel</Button>
                  <Button onClick={handleAddStation} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">Add Station</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {stations.map(station => (
            <Card key={station.id} className="bg-slate-900 border-slate-800 rounded-xl hover:border-slate-700 transition-all duration-200 hover:scale-[1.01] cursor-pointer" onClick={() => { setSelectedStation(station); setStationDetailDialogOpen(true) }}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-slate-100 text-base">{station.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1"><MapPin className="size-3" /> {station.location || 'No location'}</CardDescription>
                  </div>
                  <Badge className={station.status === 'active' ? 'bg-emerald-500/15 text-emerald-400 border-0' : station.status === 'maintenance' ? 'bg-amber-500/15 text-amber-400 border-0' : 'bg-slate-700 text-slate-400'}>{station.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-400"><Phone className="size-3.5" /> <span className="truncate">{station.phone || 'N/A'}</span></div>
                  <div className="flex items-center gap-2 text-slate-400"><Fuel className="size-3.5" /> {station.tankCount} tanks</div>
                  <div className="flex items-center gap-2 text-slate-400"><ShoppingCart className="size-3.5" /> {station.salesCount} sales</div>
                  <div className="flex items-center gap-2 text-slate-400"><Clock className="size-3.5" /> {station.shiftsCount} shifts</div>
                </div>
                {station.tanks.length > 0 && (
                  <>
                    <Separator className="bg-slate-800" />
                    <div className="space-y-2">
                      {station.tanks.map(tank => {
                        const pct = tank.capacity > 0 ? Math.round((tank.currentStock / tank.capacity) * 100) : 0
                        const isLow = tank.currentStock <= tank.alertThreshold
                        return (
                          <div key={tank.id} className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 w-14">{tank.fuelType}</span>
                            <div className={`h-1.5 rounded-full flex-1 ${isLow ? 'bg-red-950' : 'bg-emerald-950'}`}>
                              <div className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Station Detail Dialog */}
        <Dialog open={stationDetailDialogOpen} onOpenChange={setStationDetailDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-800 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-slate-100 flex items-center gap-2"><Building2 className="size-5 text-amber-400" /> {selectedStation?.name}</DialogTitle>
              <DialogDescription className="text-slate-400">Station details and tank information</DialogDescription>
            </DialogHeader>
            {selectedStation && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-400"><MapPin className="size-4" /> <span>{selectedStation.location || 'No location'}</span></div>
                  <div className="flex items-center gap-2 text-slate-400"><Phone className="size-4" /> <span>{selectedStation.phone || 'N/A'}</span></div>
                  <div className="flex items-center gap-2 text-slate-400"><Building2 className="size-4" /> <span>{selectedStation.county || 'N/A'}</span></div>
                  <div className="flex items-center gap-2"><Badge className={selectedStation.status === 'active' ? 'bg-emerald-500/15 text-emerald-400 border-0' : 'bg-amber-500/15 text-amber-400 border-0'}>{selectedStation.status}</Badge></div>
                </div>
                <Separator className="bg-slate-800" />
                <div>
                  <h4 className="text-sm font-medium text-slate-200 mb-3">Tanks ({selectedStation.tanks.length})</h4>
                  <div className="space-y-3">
                    {selectedStation.tanks.map(tank => {
                      const pct = tank.capacity > 0 ? Math.round((tank.currentStock / tank.capacity) * 100) : 0
                      const isLow = tank.currentStock <= tank.alertThreshold
                      return (
                        <div key={tank.id} className={`p-3 rounded-lg border ${isLow ? 'bg-red-950/20 border-red-900/30' : 'bg-slate-800/50 border-slate-700'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-200">{tank.fuelType}</span>
                            <span className="text-xs text-slate-400">{formatNumber(Math.round(tank.currentStock))}L / {formatNumber(tank.capacity)}L</span>
                          </div>
                          <Progress value={pct} className="h-2" />
                          <div className="flex justify-between mt-1">
                            <span className="text-xs text-slate-500">Price: {formatCurrency(tank.pricePerLiter)}/L</span>
                            <span className={`text-xs font-medium ${isLow ? 'text-red-400' : 'text-emerald-400'}`}>{isLow ? 'Low Stock' : 'Good'}</span>
                          </div>
                        </div>
                      )
                    })}
                    {selectedStation.tanks.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No tanks configured</p>}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setStationDetailDialogOpen(false)} className="border-slate-700 text-slate-300">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {stations.length === 0 && (
          <Card className="bg-slate-900 border-slate-800 rounded-xl">
            <CardContent className="py-12 text-center">
              <div className="flex items-center justify-center size-16 rounded-full bg-slate-800/50 mx-auto mb-4"><Building2 className="size-8 text-slate-500" /></div>
              <h3 className="text-lg font-medium text-slate-300">No stations yet</h3>
              <p className="text-sm text-slate-500 mt-1">Add your first station to get started</p>
              <Button onClick={() => setStationDialogOpen(true)} className="mt-4 bg-amber-500 hover:bg-amber-600 text-black font-semibold"><Plus className="size-4 mr-2" /> Add Station</Button>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  const renderInventory = () => {
    if (loading.inventory) return <TableSkeletons cols={7} rows={6} />
    const totalCapacity = inventory.reduce((sum, t) => sum + t.capacity, 0)
    const totalCurrent = inventory.reduce((sum, t) => sum + t.currentStock, 0)
    const lowTanks = inventory.filter(t => t.isLow).length

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Tank Inventory</h2>
            <p className="text-sm text-slate-400 mt-1">Overall: {formatNumber(totalCurrent)} / {formatNumber(totalCapacity)} litres ({totalCapacity > 0 ? Math.round((totalCurrent / totalCapacity) * 100) : 0}%) · {lowTanks} low stock</p>
          </div>
          <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800 self-start" onClick={() => exportToCSV(inventory.map(t => ({ Station: t.station.name, FuelType: t.fuelType, CurrentStock: Math.round(t.currentStock), Capacity: t.capacity, PricePerLiter: t.pricePerLiter, Status: t.isLow ? 'Low' : 'Good' })), 'fuelpro_inventory') }>
            <Download className="size-4 mr-2" /> Export CSV
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-900/95 border-slate-800 rounded-xl border-l-4 border-l-emerald-500">
            <CardContent className="pt-6"><div className="flex items-center gap-3"><div className="flex items-center justify-center size-10 rounded-lg bg-emerald-500/15"><Droplets className="size-5 text-emerald-400" /></div><div><p className="text-2xl font-bold text-slate-100">{formatNumber(totalCurrent)}</p><p className="text-xs text-slate-400">Total Current Stock (L)</p></div></div></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900 to-slate-900/95 border-slate-800 rounded-xl border-l-4 border-l-red-500">
            <CardContent className="pt-6"><div className="flex items-center gap-3"><div className="flex items-center justify-center size-10 rounded-lg bg-red-500/15"><AlertTriangle className="size-5 text-red-400" /></div><div><p className="text-2xl font-bold text-slate-100">{lowTanks}</p><p className="text-xs text-slate-400">Low Stock Tanks</p></div></div></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-slate-900 to-slate-900/95 border-slate-800 rounded-xl border-l-4 border-l-amber-500">
            <CardContent className="pt-6"><div className="flex items-center gap-3"><div className="flex items-center justify-center size-10 rounded-lg bg-amber-500/15"><Gauge className="size-5 text-amber-400" /></div><div><p className="text-2xl font-bold text-slate-100">{totalCapacity > 0 ? Math.round((totalCurrent / totalCapacity) * 100) : 0}%</p><p className="text-xs text-slate-400">Average Fill Level</p></div></div></CardContent>
          </Card>
        </div>

        <Card className="bg-slate-900 border-slate-800 rounded-xl">
          <CardHeader><CardTitle className="text-slate-100">Tank Details</CardTitle><CardDescription>Real-time tank levels across all stations</CardDescription></CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Station</TableHead>
                    <TableHead className="text-slate-400">Product</TableHead>
                    <TableHead className="text-slate-400">Fill Level</TableHead>
                    <TableHead className="text-slate-400 text-right">Current (L)</TableHead>
                    <TableHead className="text-slate-400 text-right">Capacity (L)</TableHead>
                    <TableHead className="text-slate-400 text-right">Min Level</TableHead>
                    <TableHead className="text-slate-400 text-right">Price/L</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map(tank => (
                    <TableRow key={tank.id} className="border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <TableCell className="text-slate-200 font-medium">{tank.station.name}</TableCell>
                      <TableCell><Badge variant="secondary" className="bg-slate-800 text-slate-300 border-0">{tank.fuelType}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 min-w-[140px]">
                          <div className={`h-2.5 rounded-full flex-1 ${getFillBarTrack(tank.utilizationPct, tank.isLow)}`}>
                            <div className={`h-full rounded-full ${getFillBarColor(tank.utilizationPct, tank.isLow)} transition-all duration-500`} style={{ width: `${tank.utilizationPct}%` }} />
                          </div>
                          <span className="text-xs font-medium text-slate-300 w-8">{tank.utilizationPct}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-slate-300">{formatNumber(Math.round(tank.currentStock))}</TableCell>
                      <TableCell className="text-right text-slate-400">{formatNumber(tank.capacity)}</TableCell>
                      <TableCell className="text-right text-slate-400">{formatNumber(tank.alertThreshold)}</TableCell>
                      <TableCell className="text-right text-slate-300">{formatCurrency(tank.pricePerLiter)}</TableCell>
                      <TableCell><Badge className={tank.isLow ? 'bg-red-500/15 text-red-400 border-0' : 'bg-emerald-500/15 text-emerald-400 border-0'}>{tank.isLow ? 'Low' : 'Good'}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderSales = () => {
    if (loading.sales) return <TableSkeletons cols={7} rows={6} />
    const filteredSales = sales.filter(s => {
      const matchesSearch = !salesSearch || s.station.name.toLowerCase().includes(salesSearch.toLowerCase()) || s.id.toLowerCase().includes(salesSearch.toLowerCase())
      const matchesFilter = salesFilter === 'all' || s.fuelType === salesFilter || s.paymentMethod === salesFilter
      return matchesSearch && matchesFilter
    })
    const totalAmount = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0)
    const totalQty = filteredSales.reduce((sum, s) => sum + s.quantityLiters, 0)

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Sales Log</h2>
            <p className="text-sm text-slate-400 mt-1">{filteredSales.length} transactions · {formatNumber(Math.round(totalQty))}L total · {formatCurrency(totalAmount)} total</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => exportToCSV(filteredSales.map(s => ({ Station: s.station.name, FuelType: s.fuelType, Quantity: s.quantityLiters, PricePerLiter: s.pricePerLiter, TotalAmount: s.totalAmount, Payment: s.paymentMethod, Date: s.createdAt })), 'fuelpro_sales')}>
              <Download className="size-4 mr-2" /> Export CSV
            </Button>
            <Dialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
              <DialogTrigger asChild><Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"><Plus className="size-4 mr-2" /> Record Sale</Button></DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800">
                <DialogHeader><DialogTitle className="text-slate-100">Record New Sale</DialogTitle><DialogDescription className="text-slate-400">Add a new fuel sale transaction</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label className="text-slate-300">Station</Label><Select value={newSale.stationId} onValueChange={v => setNewSale(p => ({ ...p, stationId: v }))}><SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100"><SelectValue placeholder="Select station" /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700">{stations.filter(s => s.status === 'active').map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="grid gap-2"><Label className="text-slate-300">Product</Label><Select value={newSale.fuelType} onValueChange={v => setNewSale(p => ({ ...p, fuelType: v }))}><SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="Petrol">Petrol</SelectItem><SelectItem value="Diesel">Diesel</SelectItem><SelectItem value="Kerosene">Kerosene</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label className="text-slate-300">Quantity (Litres)</Label><Input type="number" value={newSale.quantityLiters || ''} onChange={e => setNewSale(p => ({ ...p, quantityLiters: parseFloat(e.target.value) || 0 }))} placeholder="0" className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                    <div className="grid gap-2"><Label className="text-slate-300">Unit Price (KES)</Label><Input type="number" value={newSale.pricePerLiter} onChange={e => setNewSale(p => ({ ...p, pricePerLiter: parseFloat(e.target.value) || 0 }))} className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                  </div>
                  <div className="grid gap-2"><Label className="text-slate-300">Payment Method</Label><Select value={newSale.paymentMethod} onValueChange={v => setNewSale(p => ({ ...p, paymentMethod: v }))}><SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="cash">Cash</SelectItem><SelectItem value="mpesa">M-Pesa</SelectItem><SelectItem value="card">Card</SelectItem></SelectContent></Select></div>
                  {newSale.quantityLiters > 0 && <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"><p className="text-sm text-amber-400 font-medium">Total: {formatCurrency(newSale.quantityLiters * newSale.pricePerLiter)}</p></div>}
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setSaleDialogOpen(false)} className="border-slate-700 text-slate-300">Cancel</Button><Button onClick={handleAddSale} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">Record Sale</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="bg-slate-900 border-slate-800 rounded-xl">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" /><Input placeholder="Search by station or ID..." value={salesSearch} onChange={e => setSalesSearch(e.target.value)} className="pl-9 bg-slate-800 border-slate-700 text-slate-100" /></div>
              <Select value={salesFilter} onValueChange={setSalesFilter}>
                <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-slate-100"><Filter className="size-4 mr-2" /><SelectValue placeholder="Filter" /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="all">All Sales</SelectItem><SelectItem value="Petrol">Petrol</SelectItem><SelectItem value="Diesel">Diesel</SelectItem><SelectItem value="Kerosene">Kerosene</SelectItem><SelectItem value="cash">Cash</SelectItem><SelectItem value="mpesa">M-Pesa</SelectItem><SelectItem value="card">Card</SelectItem></SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 rounded-xl">
          <CardContent className="pt-6">
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader><TableRow className="border-slate-800 hover:bg-transparent"><TableHead className="text-slate-400">Station</TableHead><TableHead className="text-slate-400">Product</TableHead><TableHead className="text-slate-400 text-right">Qty (L)</TableHead><TableHead className="text-slate-400 text-right">Unit Price</TableHead><TableHead className="text-slate-400 text-right">Amount</TableHead><TableHead className="text-slate-400">Payment</TableHead><TableHead className="text-slate-400 text-right">Date</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredSales.map(sale => (
                    <TableRow key={sale.id} className="border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <TableCell className="text-slate-200">{sale.station.name}</TableCell>
                      <TableCell><Badge variant="secondary" className="bg-slate-800 text-slate-300 border-0">{sale.fuelType}</Badge></TableCell>
                      <TableCell className="text-right text-slate-300">{formatNumber(sale.quantityLiters)}</TableCell>
                      <TableCell className="text-right text-slate-400">{formatCurrency(sale.pricePerLiter)}</TableCell>
                      <TableCell className="text-right text-slate-200 font-medium">{formatCurrency(sale.totalAmount)}</TableCell>
                      <TableCell><Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px] capitalize">{sale.paymentMethod}</Badge></TableCell>
                      <TableCell className="text-right text-slate-400 text-xs">{formatTimeAgo(sale.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderShifts = () => {
    if (loading.shifts) return <TableSkeletons cols={6} rows={5} />
    const activeShiftsList = shifts.filter(s => s.status === 'active')
    const completedShiftsList = shifts.filter(s => s.status === 'completed')

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h2 className="text-2xl font-bold text-slate-100">Shift Management</h2><p className="text-sm text-slate-400 mt-1">{activeShiftsList.length} active · {completedShiftsList.length} completed</p></div>
          <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
            <DialogTrigger asChild><Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"><Play className="size-4 mr-2" /> Start Shift</Button></DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800">
              <DialogHeader><DialogTitle className="text-slate-100">Start New Shift</DialogTitle><DialogDescription className="text-slate-400">Begin a new shift at a station</DialogDescription></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2"><Label className="text-slate-300">Station</Label><Select value={newShift.stationId} onValueChange={v => setNewShift(p => ({ ...p, stationId: v }))}><SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100"><SelectValue placeholder="Select station" /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700">{stations.filter(s => s.status === 'active').map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label className="text-slate-300">Attendant Name</Label><Input value={newShift.attendantName} onChange={e => setNewShift(p => ({ ...p, attendantName: e.target.value }))} placeholder="Full name" className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                  <div className="grid gap-2"><Label className="text-slate-300">Fuel Type</Label><Select value={newShift.fuelType} onValueChange={v => setNewShift(p => ({ ...p, fuelType: v }))}><SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="Petrol">Petrol</SelectItem><SelectItem value="Diesel">Diesel</SelectItem><SelectItem value="Kerosene">Kerosene</SelectItem></SelectContent></Select></div>
                </div>
                <div className="grid gap-2"><Label className="text-slate-300">Opening Pump Reading</Label><Input type="number" value={newShift.openingReading || ''} onChange={e => setNewShift(p => ({ ...p, openingReading: parseFloat(e.target.value) || 0 }))} placeholder="0" className="bg-slate-800 border-slate-700 text-slate-100" /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setShiftDialogOpen(false)} className="border-slate-700 text-slate-300">Cancel</Button><Button onClick={handleStartShift} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">Start Shift</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-slate-900 border-slate-800 rounded-xl">
          <CardHeader><CardTitle className="text-slate-100 flex items-center gap-2"><CircleDot className="size-4 text-emerald-400 animate-pulse" /> Active Shifts</CardTitle></CardHeader>
          <CardContent>
            {activeShiftsList.length === 0 ? (
              <div className="text-center py-8"><div className="flex items-center justify-center size-14 rounded-full bg-slate-800/50 mx-auto mb-3"><Clock className="size-7 text-slate-500" /></div><p className="text-slate-400">No active shifts</p><p className="text-sm text-slate-500">Start a new shift to begin tracking</p></div>
            ) : (
              <Table>
                <TableHeader><TableRow className="border-slate-800 hover:bg-transparent"><TableHead className="text-slate-400">Station</TableHead><TableHead className="text-slate-400">Attendant</TableHead><TableHead className="text-slate-400">Fuel</TableHead><TableHead className="text-slate-400 text-right">Opening</TableHead><TableHead className="text-slate-400">Started</TableHead><TableHead className="text-slate-400 text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {activeShiftsList.map(shift => (
                    <TableRow key={shift.id} className="border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <TableCell className="text-slate-200 font-medium">{shift.station.name}</TableCell>
                      <TableCell className="text-slate-300">{shift.attendantName}</TableCell>
                      <TableCell><Badge variant="secondary" className="bg-slate-800 text-slate-300 border-0">{shift.fuelType}</Badge></TableCell>
                      <TableCell className="text-right text-slate-300 font-mono">{shift.openingReading.toLocaleString()}</TableCell>
                      <TableCell className="text-slate-400 text-xs">{formatTimeAgo(shift.startedAt)}</TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-950/30 h-8" onClick={() => handleEndShift(shift.id)}><Square className="size-3.5 mr-1" /> End</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {completedShiftsList.length > 0 && (
          <Card className="bg-slate-900 border-slate-800 rounded-xl">
            <CardHeader><CardTitle className="text-slate-100 flex items-center gap-2"><CheckCircle2 className="size-4 text-slate-400" /> Completed Shifts</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[400px]">
                <Table>
                  <TableHeader><TableRow className="border-slate-800 hover:bg-transparent"><TableHead className="text-slate-400">Station</TableHead><TableHead className="text-slate-400">Attendant</TableHead><TableHead className="text-slate-400">Fuel</TableHead><TableHead className="text-slate-400 text-right">Opening</TableHead><TableHead className="text-slate-400 text-right">Closing</TableHead><TableHead className="text-slate-400 text-right">Litres Sold</TableHead><TableHead className="text-slate-400 text-right">Cash Collected</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {completedShiftsList.map(shift => (
                      <TableRow key={shift.id} className="border-slate-800/50">
                        <TableCell className="text-slate-200 font-medium">{shift.station.name}</TableCell>
                        <TableCell className="text-slate-300">{shift.attendantName}</TableCell>
                        <TableCell><Badge variant="secondary" className="bg-slate-800 text-slate-300 border-0">{shift.fuelType}</Badge></TableCell>
                        <TableCell className="text-right text-slate-400 font-mono text-xs">{shift.openingReading.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-slate-300 font-mono text-xs">{shift.closingReading?.toLocaleString() || '-'}</TableCell>
                        <TableCell className="text-right text-slate-300">{shift.litersSold ? formatNumber(shift.litersSold) : '-'}</TableCell>
                        <TableCell className="text-right text-amber-400 font-medium">{shift.cashCollected ? formatCurrency(shift.cashCollected) : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  const renderDeliveries = () => {
    if (loading.deliveries) return <TableSkeletons cols={6} rows={5} />

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h2 className="text-2xl font-bold text-slate-100">Deliveries</h2><p className="text-sm text-slate-400 mt-1">{deliveries.length} delivery records · Tank stock auto-updated on delivery</p></div>
          <Dialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
            <DialogTrigger asChild><Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"><Plus className="size-4 mr-2" /> Record Delivery</Button></DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800">
              <DialogHeader><DialogTitle className="text-slate-100">Record Delivery</DialogTitle><DialogDescription className="text-slate-400">Log a fuel delivery — tank stock will be updated automatically</DialogDescription></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label className="text-slate-300">Station</Label><Select value={newDelivery.stationId} onValueChange={v => setNewDelivery(p => ({ ...p, stationId: v }))}><SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100"><SelectValue placeholder="Select station" /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700">{stations.filter(s => s.status === 'active').map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="grid gap-2"><Label className="text-slate-300">Fuel Type</Label><Select value={newDelivery.fuelType} onValueChange={v => setNewDelivery(p => ({ ...p, fuelType: v }))}><SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="Petrol">Petrol</SelectItem><SelectItem value="Diesel">Diesel</SelectItem><SelectItem value="Kerosene">Kerosene</SelectItem></SelectContent></Select></div>
                </div>
                <div className="grid gap-2"><Label className="text-slate-300">Supplier Name</Label><Input value={newDelivery.supplierName} onChange={e => setNewDelivery(p => ({ ...p, supplierName: e.target.value }))} placeholder="e.g., TotalEnergies Kenya" className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label className="text-slate-300">Volume (Litres)</Label><Input type="number" value={newDelivery.volumeLiters || ''} onChange={e => setNewDelivery(p => ({ ...p, volumeLiters: parseFloat(e.target.value) || 0 }))} placeholder="0" className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                  <div className="grid gap-2"><Label className="text-slate-300">Cost/L (KES)</Label><Input type="number" value={newDelivery.costPerLiter || ''} onChange={e => setNewDelivery(p => ({ ...p, costPerLiter: parseFloat(e.target.value) || 0 }))} placeholder="0" className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                </div>
                {newDelivery.volumeLiters > 0 && newDelivery.costPerLiter > 0 && <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"><p className="text-sm text-amber-400 font-medium">Total Cost: {formatCurrency(newDelivery.volumeLiters * newDelivery.costPerLiter)}</p></div>}
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setDeliveryDialogOpen(false)} className="border-slate-700 text-slate-300">Cancel</Button><Button onClick={handleAddDelivery} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">Record Delivery</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-slate-900 border-slate-800 rounded-xl">
          <CardHeader><CardTitle className="text-slate-100">Delivery History</CardTitle><CardDescription>All fuel deliveries with automatic tank stock updates</CardDescription></CardHeader>
          <CardContent>
            {deliveries.length === 0 ? (
              <div className="text-center py-12"><div className="flex items-center justify-center size-14 rounded-full bg-slate-800/50 mx-auto mb-3"><Package className="size-7 text-slate-500" /></div><p className="text-slate-400">No deliveries recorded</p><p className="text-sm text-slate-500 mt-1">Record a delivery to add fuel stock</p></div>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader><TableRow className="border-slate-800 hover:bg-transparent"><TableHead className="text-slate-400">Station</TableHead><TableHead className="text-slate-400">Supplier</TableHead><TableHead className="text-slate-400">Fuel</TableHead><TableHead className="text-slate-400 text-right">Volume (L)</TableHead><TableHead className="text-slate-400 text-right">Cost/L</TableHead><TableHead className="text-slate-400 text-right">Total Cost</TableHead><TableHead className="text-slate-400 text-right">Date</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {deliveries.map(d => (
                      <TableRow key={d.id} className="border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <TableCell className="text-slate-200 font-medium">{d.station.name}</TableCell>
                        <TableCell className="text-slate-300">{d.supplierName}</TableCell>
                        <TableCell><Badge variant="secondary" className="bg-slate-800 text-slate-300 border-0">{d.fuelType}</Badge></TableCell>
                        <TableCell className="text-right text-slate-300">{formatNumber(d.volumeLiters)}</TableCell>
                        <TableCell className="text-right text-slate-400">{d.costPerLiter ? formatCurrency(d.costPerLiter) : '-'}</TableCell>
                        <TableCell className="text-right text-amber-400 font-medium">{d.totalCost ? formatCurrency(d.totalCost) : '-'}</TableCell>
                        <TableCell className="text-right text-slate-400 text-xs">{formatTimeAgo(d.deliveredAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderReconciliation = () => {
    if (loading.reconciliation) return <TableSkeletons cols={6} rows={4} />
    const reconciled = reconciliations.filter(r => r.flag === 'normal').length
    const warnings = reconciliations.filter(r => r.flag === 'warning').length
    const critical = reconciliations.filter(r => r.flag === 'critical').length

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h2 className="text-2xl font-bold text-slate-100">Reconciliation</h2><p className="text-sm text-slate-400 mt-1">Match shift sales with cash and digital payments</p></div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => exportToCSV(reconciliations.map(r => ({ Station: r.station.name, FuelType: r.fuelType, BookStock: r.bookStock, PhysicalStock: r.physicalStock, Delivery: r.deliveryReceived, Variance: r.variance, VariancePct: r.variancePct.toFixed(2), Flag: r.flag, Notes: r.notes || '' })), 'fuelpro_reconciliation')}>
              <Download className="size-4 mr-2" /> Export CSV
            </Button>
            <Dialog open={reconciliationDialogOpen} onOpenChange={setReconciliationDialogOpen}>
              <DialogTrigger asChild><Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"><Plus className="size-4 mr-2" /> New Reconciliation</Button></DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800">
                <DialogHeader><DialogTitle className="text-slate-100">Create Reconciliation</DialogTitle><DialogDescription className="text-slate-400">Record tank stock reconciliation</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label className="text-slate-300">Station</Label><Select value={newReconciliation.stationId} onValueChange={v => setNewReconciliation(p => ({ ...p, stationId: v }))}><SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100"><SelectValue placeholder="Select station" /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700">{stations.filter(s => s.status === 'active').map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="grid gap-2"><Label className="text-slate-300">Fuel Type</Label><Select value={newReconciliation.fuelType} onValueChange={v => setNewReconciliation(p => ({ ...p, fuelType: v }))}><SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="Petrol">Petrol</SelectItem><SelectItem value="Diesel">Diesel</SelectItem><SelectItem value="Kerosene">Kerosene</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2"><Label className="text-slate-300">Book Stock (L)</Label><Input type="number" value={newReconciliation.bookStock || ''} onChange={e => setNewReconciliation(p => ({ ...p, bookStock: parseFloat(e.target.value) || 0 }))} className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                    <div className="grid gap-2"><Label className="text-slate-300">Physical Stock (L)</Label><Input type="number" value={newReconciliation.physicalStock || ''} onChange={e => setNewReconciliation(p => ({ ...p, physicalStock: parseFloat(e.target.value) || 0 }))} className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                    <div className="grid gap-2"><Label className="text-slate-300">Delivery (L)</Label><Input type="number" value={newReconciliation.deliveryReceived || ''} onChange={e => setNewReconciliation(p => ({ ...p, deliveryReceived: parseFloat(e.target.value) || 0 }))} className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                  </div>
                  <div className="grid gap-2"><Label className="text-slate-300">Notes</Label><Input value={newReconciliation.notes} onChange={e => setNewReconciliation(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes..." className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setReconciliationDialogOpen(false)} className="border-slate-700 text-slate-300">Cancel</Button><Button onClick={handleAddReconciliation} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">Create Record</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-900/95 border-slate-800 rounded-xl border-l-4 border-l-emerald-500"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="flex items-center justify-center size-10 rounded-lg bg-emerald-500/15"><CheckCircle2 className="size-5 text-emerald-400" /></div><div><p className="text-2xl font-bold text-slate-100">{reconciled}</p><p className="text-xs text-slate-400">Normal</p></div></div></CardContent></Card>
          <Card className="bg-gradient-to-br from-slate-900 to-slate-900/95 border-slate-800 rounded-xl border-l-4 border-l-amber-500"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="flex items-center justify-center size-10 rounded-lg bg-amber-500/15"><AlertCircle className="size-5 text-amber-400" /></div><div><p className="text-2xl font-bold text-slate-100">{warnings}</p><p className="text-xs text-slate-400">Warnings</p></div></div></CardContent></Card>
          <Card className="bg-gradient-to-br from-slate-900 to-slate-900/95 border-slate-800 rounded-xl border-l-4 border-l-red-500"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="flex items-center justify-center size-10 rounded-lg bg-red-500/15"><XCircle className="size-5 text-red-400" /></div><div><p className="text-2xl font-bold text-slate-100">{critical}</p><p className="text-xs text-slate-400">Critical</p></div></div></CardContent></Card>
        </div>

        <Card className="bg-slate-900 border-slate-800 rounded-xl">
          <CardHeader><CardTitle className="text-slate-100">Reconciliation Records</CardTitle><CardDescription>Daily shift cash-up and stock verification</CardDescription></CardHeader>
          <CardContent>
            {reconciliations.length === 0 ? (
              <div className="text-center py-12"><div className="flex items-center justify-center size-14 rounded-full bg-slate-800/50 mx-auto mb-3"><CheckSquare className="size-7 text-slate-500" /></div><p className="text-slate-400">No reconciliation records</p><p className="text-sm text-slate-500 mt-1">Create your first reconciliation entry</p></div>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader><TableRow className="border-slate-800 hover:bg-transparent"><TableHead className="text-slate-400">Station</TableHead><TableHead className="text-slate-400">Fuel</TableHead><TableHead className="text-slate-400 text-right">Book Stock</TableHead><TableHead className="text-slate-400 text-right">Physical</TableHead><TableHead className="text-slate-400 text-right">Delivery</TableHead><TableHead className="text-slate-400 text-right">Variance</TableHead><TableHead className="text-slate-400 text-right">Variance %</TableHead><TableHead className="text-slate-400">Flag</TableHead><TableHead className="text-slate-400 text-right">Date</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {reconciliations.map(r => (
                      <TableRow key={r.id} className="border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <TableCell className="text-slate-200 font-medium">{r.station.name}</TableCell>
                        <TableCell><Badge variant="secondary" className="bg-slate-800 text-slate-300 border-0">{r.fuelType}</Badge></TableCell>
                        <TableCell className="text-right text-slate-300">{formatNumber(Math.round(r.bookStock))}</TableCell>
                        <TableCell className="text-right text-slate-300">{formatNumber(Math.round(r.physicalStock))}</TableCell>
                        <TableCell className="text-right text-slate-400">{formatNumber(Math.round(r.deliveryReceived))}</TableCell>
                        <TableCell className={`text-right font-medium ${r.variance === 0 ? 'text-emerald-400' : 'text-red-400'}`}>{r.variance > 0 ? '+' : ''}{r.variance.toFixed(1)}</TableCell>
                        <TableCell className="text-right text-slate-300">{r.variancePct.toFixed(2)}%</TableCell>
                        <TableCell><Badge className={r.flag === 'normal' ? 'bg-emerald-500/15 text-emerald-400 border-0' : r.flag === 'warning' ? 'bg-amber-500/15 text-amber-400 border-0' : 'bg-red-500/15 text-red-400 border-0'}>{r.flag}</Badge></TableCell>
                        <TableCell className="text-right text-slate-400 text-xs">{formatTimeAgo(r.recordedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderCompliance = () => {
    if (loading.compliance) return <TableSkeletons cols={6} rows={4} />
    if (!complianceData) return null
    const priceCapRows: { region: string; product: string; maxPrice: number }[] = []
    Object.entries(complianceData.hardcoded).forEach(([region, products]) => { Object.entries(products).forEach(([product, price]) => { priceCapRows.push({ region, product, maxPrice: price }) }) })
    const priceValidations = inventory.map(tank => {
      const stationRegion = tank.station.county || 'Nairobi'
      const regionPrices = complianceData.hardcoded[stationRegion] || complianceData.hardcoded['Nairobi']
      const maxPrice = regionPrices[tank.fuelType] || 0
      const valid = tank.pricePerLiter <= maxPrice
      return { ...tank, maxPrice, valid }
    })

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h2 className="text-2xl font-bold text-slate-100">Compliance & Regulatory</h2><p className="text-sm text-slate-400 mt-1">EPRA price caps and KRA eTIMS integration</p></div>
          <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800 self-start"><FileText className="size-4 mr-2" /> Compliance Report</Button>
        </div>

        <Card className="bg-slate-900 border-slate-800 rounded-xl">
          <CardHeader><CardTitle className="text-slate-100 flex items-center gap-2"><Shield className="size-4 text-amber-400" /> KRA eTIMS Status</CardTitle><CardDescription>Electronic Tax Invoice Management System</CardDescription></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-slate-800/50"><div className="flex items-center justify-center gap-2 mb-2"><div className="size-2.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-xs text-slate-400 uppercase tracking-wider">Status</span></div><p className="text-lg font-bold text-emerald-400">Connected</p></div>
              <div className="text-center p-4 rounded-lg bg-slate-800/50"><p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Submitted</p><p className="text-lg font-bold text-slate-100">847</p></div>
              <div className="text-center p-4 rounded-lg bg-slate-800/50"><p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Pending</p><p className="text-lg font-bold text-amber-400">12</p></div>
              <div className="text-center p-4 rounded-lg bg-slate-800/50"><p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Score</p><p className="text-lg font-bold text-emerald-400">98.6%</p></div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><Activity className="size-3" /> Last synced: {complianceData.lastUpdated}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 rounded-xl">
          <CardHeader><CardTitle className="text-slate-100 flex items-center gap-2"><ShieldCheck className="size-4 text-amber-400" /> EPRA Maximum Prices</CardTitle><CardDescription>Energy & Petroleum Regulatory Authority — per litre in KES</CardDescription></CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader><TableRow className="border-slate-800 hover:bg-transparent"><TableHead className="text-slate-400">Region</TableHead><TableHead className="text-slate-400">Product</TableHead><TableHead className="text-slate-400 text-right">Max Price (KES/L)</TableHead><TableHead className="text-slate-400">Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {priceCapRows.map((row, i) => (
                    <TableRow key={i} className="border-slate-800/50"><TableCell className="text-slate-200">{row.region}</TableCell><TableCell><Badge variant="secondary" className="bg-slate-800 text-slate-300 border-0">{row.product}</Badge></TableCell><TableCell className="text-right text-slate-200 font-medium">{formatCurrency(row.maxPrice)}</TableCell><TableCell><Badge className="bg-emerald-500/15 text-emerald-400 border-0"><CheckCircle2 className="size-3 mr-1" /> Active</Badge></TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 rounded-xl">
          <CardHeader><CardTitle className="text-slate-100 flex items-center gap-2"><AlertCircle className="size-4 text-amber-400" /> Price Validation</CardTitle><CardDescription>Verify station prices comply with EPRA regulations</CardDescription></CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader><TableRow className="border-slate-800 hover:bg-transparent"><TableHead className="text-slate-400">Station</TableHead><TableHead className="text-slate-400">Product</TableHead><TableHead className="text-slate-400 text-right">Set Price</TableHead><TableHead className="text-slate-400 text-right">Max Allowed</TableHead><TableHead className="text-slate-400 text-right">Margin</TableHead><TableHead className="text-slate-400">Result</TableHead></TableRow></TableHeader>
                <TableBody>
                  {priceValidations.map(pv => {
                    const margin = pv.maxPrice - pv.pricePerLiter
                    return (
                      <TableRow key={pv.id} className="border-slate-800/50"><TableCell className="text-slate-200 font-medium">{pv.station.name}</TableCell><TableCell><Badge variant="secondary" className="bg-slate-800 text-slate-300 border-0">{pv.fuelType}</Badge></TableCell><TableCell className="text-right text-slate-200">{formatCurrency(pv.pricePerLiter)}</TableCell><TableCell className="text-right text-slate-300">{formatCurrency(pv.maxPrice)}</TableCell><TableCell className={`text-right font-medium ${pv.valid ? 'text-emerald-400' : 'text-red-400'}`}>{margin >= 0 ? '+' : ''}{margin.toFixed(2)}</TableCell><TableCell>{pv.valid ? <Badge className="bg-emerald-500/15 text-emerald-400 border-0"><CheckCircle2 className="size-3 mr-1" /> Valid</Badge> : <Badge className="bg-red-500/15 text-red-400 border-0"><XCircle className="size-3 mr-1" /> Over Cap</Badge>}</TableCell></TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderSuppliers = () => {
    if (loading.suppliers) return <TableSkeletons cols={5} rows={4} />

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h2 className="text-2xl font-bold text-slate-100">Suppliers</h2><p className="text-sm text-slate-400 mt-1">{suppliers.length} suppliers · {suppliers.filter(s => s.status === 'active').length} active</p></div>
          <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
            <DialogTrigger asChild><Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"><Plus className="size-4 mr-2" /> Add Supplier</Button></DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800">
              <DialogHeader><DialogTitle className="text-slate-100">Add New Supplier</DialogTitle><DialogDescription className="text-slate-400">Register a new fuel supply partner</DialogDescription></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2"><Label className="text-slate-300">Supplier Name *</Label><Input value={newSupplier.name} onChange={e => setNewSupplier(p => ({ ...p, name: e.target.value }))} placeholder="e.g., TotalEnergies Kenya" className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label className="text-slate-300">Contact</Label><Input value={newSupplier.contact} onChange={e => setNewSupplier(p => ({ ...p, contact: e.target.value }))} placeholder="+254 7XX XXX XXX" className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                  <div className="grid gap-2"><Label className="text-slate-300">Location</Label><Input value={newSupplier.location} onChange={e => setNewSupplier(p => ({ ...p, location: e.target.value }))} placeholder="e.g., Nairobi" className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                </div>
                <div className="grid gap-2"><Label className="text-slate-300">Fuel Types (comma separated)</Label><Input value={newSupplier.fuelTypes} onChange={e => setNewSupplier(p => ({ ...p, fuelTypes: e.target.value }))} placeholder="e.g., Petrol, Diesel" className="bg-slate-800 border-slate-700 text-slate-100" /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setSupplierDialogOpen(false)} className="border-slate-700 text-slate-300">Cancel</Button><Button onClick={handleAddSupplier} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">Add Supplier</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {suppliers.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800 rounded-xl"><CardContent className="py-12 text-center"><div className="flex items-center justify-center size-16 rounded-full bg-slate-800/50 mx-auto mb-4"><Truck className="size-8 text-slate-500" /></div><h3 className="text-lg font-medium text-slate-300">No suppliers yet</h3><p className="text-sm text-slate-500 mt-1">Add your first fuel supplier</p></CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {suppliers.map(supplier => (
              <Card key={supplier.id} className="bg-slate-900 border-slate-800 rounded-xl hover:border-slate-700 transition-all duration-200 hover:scale-[1.01]">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div><CardTitle className="text-slate-100 text-base">{supplier.name}</CardTitle><CardDescription className="mt-1">{supplier.location || 'No location'}</CardDescription></div>
                    <Badge className={supplier.status === 'active' ? 'bg-emerald-500/15 text-emerald-400 border-0' : 'bg-slate-700 text-slate-400'}>{supplier.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {supplier.fuelTypes && (
                    <div className="flex flex-wrap gap-1.5">{supplier.fuelTypes.split(',').map(p => <Badge key={p} variant="secondary" className="bg-slate-800 text-slate-300 border-0 text-xs">{p.trim()}</Badge>)}</div>
                  )}
                  <Separator className="bg-slate-800" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Contact</span>
                    <span className="text-slate-300">{supplier.contact || 'N/A'}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderCoupons = () => {
    if (loading.coupons) return <TableSkeletons cols={6} rows={4} />

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h2 className="text-2xl font-bold text-slate-100">Coupons & Promotions</h2><p className="text-sm text-slate-400 mt-1">{coupons.length} coupons · {coupons.filter(c => c.status === 'active').length} active</p></div>
          <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
            <DialogTrigger asChild><Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"><Plus className="size-4 mr-2" /> Create Coupon</Button></DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800">
              <DialogHeader><DialogTitle className="text-slate-100">Create Coupon</DialogTitle><DialogDescription className="text-slate-400">Create a new discount coupon or promotion</DialogDescription></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label className="text-slate-300">Coupon Code *</Label><Input value={newCoupon.code} onChange={e => setNewCoupon(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g., FUEL10" className="bg-slate-800 border-slate-700 text-slate-100 font-mono uppercase" /></div>
                  <div className="grid gap-2"><Label className="text-slate-300">Type</Label><Select value={newCoupon.type} onValueChange={v => setNewCoupon(p => ({ ...p, type: v }))}><SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="percentage">Percentage (%)</SelectItem><SelectItem value="fixed">Fixed Amount (KES)</SelectItem></SelectContent></Select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label className="text-slate-300">Value *</Label><Input type="number" value={newCoupon.value || ''} onChange={e => setNewCoupon(p => ({ ...p, value: parseFloat(e.target.value) || 0 }))} placeholder="0" className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                  <div className="grid gap-2"><Label className="text-slate-300">Max Uses</Label><Input type="number" value={newCoupon.maxUses} onChange={e => setNewCoupon(p => ({ ...p, maxUses: parseInt(e.target.value) || 100 }))} className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                </div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setCouponDialogOpen(false)} className="border-slate-700 text-slate-300">Cancel</Button><Button onClick={handleAddCoupon} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">Create Coupon</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-slate-900 border-slate-800 rounded-xl">
          <CardHeader><CardTitle className="text-slate-100">All Coupons</CardTitle><CardDescription>Promotional coupons and their usage</CardDescription></CardHeader>
          <CardContent>
            {coupons.length === 0 ? (
              <div className="text-center py-12"><div className="flex items-center justify-center size-14 rounded-full bg-slate-800/50 mx-auto mb-3"><Ticket className="size-7 text-slate-500" /></div><p className="text-slate-400">No coupons created</p></div>
            ) : (
              <Table>
                <TableHeader><TableRow className="border-slate-800 hover:bg-transparent"><TableHead className="text-slate-400">Code</TableHead><TableHead className="text-slate-400">Discount</TableHead><TableHead className="text-slate-400">Type</TableHead><TableHead className="text-slate-400 text-right">Usage</TableHead><TableHead className="text-slate-400">Status</TableHead><TableHead className="text-slate-400 text-right">Created</TableHead></TableRow></TableHeader>
                <TableBody>
                  {coupons.map(coupon => (
                    <TableRow key={coupon.id} className="border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <TableCell className="font-mono text-amber-400 font-bold">{coupon.code}</TableCell>
                      <TableCell className="text-slate-200 font-medium">{coupon.type === 'percentage' ? `${coupon.value}%` : formatCurrency(coupon.value)}</TableCell>
                      <TableCell className="text-slate-400 capitalize">{coupon.type}</TableCell>
                      <TableCell className="text-right"><div className="flex items-center justify-end gap-2"><Progress value={(coupon.uses / coupon.maxUses) * 100} className="h-1.5 w-16" /><span className="text-xs text-slate-400">{coupon.uses}/{coupon.maxUses}</span></div></TableCell>
                      <TableCell><Badge className={coupon.status === 'active' ? 'bg-emerald-500/15 text-emerald-400 border-0' : 'bg-slate-700 text-slate-400'}>{coupon.status}</Badge></TableCell>
                      <TableCell className="text-right text-slate-400 text-xs">{new Date(coupon.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderAdmin = () => {
    if (loading.admin) return <TableSkeletons cols={5} rows={4} />
    if (!adminData) return null

    return (
      <div className="space-y-6">
        <div><h2 className="text-2xl font-bold text-slate-100">Administration</h2><p className="text-sm text-slate-400 mt-1">System configuration, user management, and audit logs</p></div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="users" className="data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-400">Users</TabsTrigger>
            <TabsTrigger value="audit" className="data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-400">Audit Logs</TabsTrigger>
            <TabsTrigger value="config" className="data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-400">Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="bg-slate-900 border-slate-800 rounded-xl">
              <CardHeader><div className="flex items-center justify-between"><div><CardTitle className="text-slate-100 flex items-center gap-2"><Users className="size-4 text-amber-400" /> User Management</CardTitle><CardDescription>Manage system users and permissions</CardDescription></div><Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"><Plus className="size-4 mr-2" /> Add User</Button></div></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow className="border-slate-800 hover:bg-transparent"><TableHead className="text-slate-400">Name</TableHead><TableHead className="text-slate-400">Email</TableHead><TableHead className="text-slate-400">Role</TableHead><TableHead className="text-slate-400">Status</TableHead><TableHead className="text-slate-400">Last Login</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {adminData.users.map(user => (
                      <TableRow key={user.id} className="border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <TableCell className="text-slate-200 font-medium">{user.name}</TableCell>
                        <TableCell className="text-slate-400">{user.email}</TableCell>
                        <TableCell><Badge variant="secondary" className="bg-slate-800 text-slate-300 border-0 capitalize">{user.role}</Badge></TableCell>
                        <TableCell><Badge className={user.status === 'active' ? 'bg-emerald-500/15 text-emerald-400 border-0' : 'bg-red-500/15 text-red-400 border-0'}>{user.status}</Badge></TableCell>
                        <TableCell className="text-slate-400 text-xs">{formatTimeAgo(user.lastLogin)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card className="bg-slate-900 border-slate-800 rounded-xl">
              <CardHeader><CardTitle className="text-slate-100 flex items-center gap-2"><FileText className="size-4 text-amber-400" /> Audit Logs</CardTitle><CardDescription>System activity and security events</CardDescription></CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader><TableRow className="border-slate-800 hover:bg-transparent"><TableHead className="text-slate-400">User</TableHead><TableHead className="text-slate-400">Action</TableHead><TableHead className="text-slate-400">Details</TableHead><TableHead className="text-slate-400">Severity</TableHead><TableHead className="text-slate-400 text-right">Timestamp</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {adminData.auditLogs.map(log => (
                        <TableRow key={log.id} className="border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                          <TableCell className="text-slate-200">{log.user}</TableCell>
                          <TableCell className="text-slate-300">{log.action}</TableCell>
                          <TableCell className="text-slate-400 text-xs max-w-[200px] truncate">{log.details}</TableCell>
                          <TableCell><Badge className={log.severity === 'error' ? 'bg-red-500/15 text-red-400 border-0 text-[10px]' : log.severity === 'warning' ? 'bg-amber-500/15 text-amber-400 border-0 text-[10px]' : 'bg-slate-700 text-slate-400 text-[10px]'}>{log.severity}</Badge></TableCell>
                          <TableCell className="text-right text-slate-400 text-xs">{formatTimeAgo(log.timestamp)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config">
            <Card className="bg-slate-900 border-slate-800 rounded-xl">
              <CardHeader><CardTitle className="text-slate-100 flex items-center gap-2"><Settings className="size-4 text-amber-400" /> System Configuration</CardTitle><CardDescription>Application settings and integrations</CardDescription></CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="text-slate-300">Company Name</Label><Input defaultValue={adminData.config.companyName} className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                    <div className="space-y-2"><Label className="text-slate-300">Currency</Label><Input defaultValue={adminData.config.currency} className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                    <div className="space-y-2"><Label className="text-slate-300">Timezone</Label><Input defaultValue={adminData.config.timezone} className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                    <div className="space-y-2"><Label className="text-slate-300">Tax Rate (%)</Label><Input type="number" defaultValue={adminData.config.taxRate} className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                    <div className="space-y-2"><Label className="text-slate-300">Auto Reorder Level (L)</Label><Input type="number" defaultValue={adminData.config.autoReorderLevel} className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                    <div className="space-y-2"><Label className="text-slate-300">Shift Duration (hrs)</Label><Input type="number" defaultValue={adminData.config.shiftDuration} className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                  </div>
                  <Separator className="bg-slate-800" />
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-medium text-slate-200">KRA eTIMS Integration</p><p className="text-xs text-slate-500">Enable electronic tax invoice management</p></div>
                    <Switch defaultChecked={adminData.config.kraEtimsEnabled} />
                  </div>
                  <div className="space-y-2"><Label className="text-slate-300">Receipt Footer</Label><Input defaultValue={adminData.config.receiptFooter} className="bg-slate-800 border-slate-700 text-slate-100" /></div>
                  <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold w-fit">Save Configuration</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // ─── Tab Content Router ─────────────────────────────────────────────────────

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard()
      case 'stations': return renderStations()
      case 'inventory': return renderInventory()
      case 'sales': return renderSales()
      case 'shifts': return renderShifts()
      case 'deliveries': return renderDeliveries()
      case 'reconciliation': return renderReconciliation()
      case 'compliance': return renderCompliance()
      case 'suppliers': return renderSuppliers()
      case 'coupons': return renderCoupons()
      case 'admin': return renderAdmin()
      default: return renderDashboard()
    }
  }

  // ─── Main Layout ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col border-r border-slate-800 bg-slate-950 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800 transform transition-transform duration-300 lg:hidden ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-200 lg:hidden" onClick={() => setMobileSidebarOpen(true)}><Menu className="size-5" /></Button>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-200 hidden lg:flex" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu className="size-5" /></Button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
              <Input placeholder="Search anything..." className="pl-9 w-64 bg-slate-900 border-slate-800 text-slate-200 text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <Popover open={notifOpen} onOpenChange={setNotifOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-slate-200">
                  <Bell className="size-5" />
                  {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center size-4 rounded-full bg-red-500 text-[10px] text-white font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-slate-900 border-slate-800 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-100">Notifications</h3>
                  {unreadCount > 0 && <Button variant="ghost" size="sm" className="text-xs text-slate-400 h-auto p-0" onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}>Mark all read</Button>}
                </div>
                <ScrollArea className="max-h-[320px]">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center"><Bell className="size-8 text-slate-600 mx-auto mb-2" /><p className="text-sm text-slate-400">No notifications</p></div>
                  ) : (
                    <div className="divide-y divide-slate-800">
                      {notifications.map(n => (
                        <div key={n.id} className={`p-3 flex gap-3 transition-colors ${n.read ? 'bg-transparent' : 'bg-slate-800/30'}`} onClick={() => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}>
                          <div className={`mt-0.5 flex items-center justify-center size-8 rounded-lg shrink-0 ${n.type === 'alert' ? 'bg-red-500/15' : n.type === 'warning' ? 'bg-amber-500/15' : 'bg-slate-800'}`}>
                            {n.type === 'alert' ? <AlertTriangle className="size-4 text-red-400" /> : n.type === 'warning' ? <AlertCircle className="size-4 text-amber-400" /> : <CheckCircle2 className="size-4 text-slate-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200">{n.title}</p>
                            <p className="text-xs text-slate-400 truncate">{n.message}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{formatTimeAgo(n.time)}</p>
                          </div>
                          {!n.read && <div className="mt-1 size-2 rounded-full bg-amber-400 shrink-0" />}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-800">
              <div className="flex items-center justify-center size-8 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-600/10 text-amber-500 font-semibold text-xs">AD</div>
              <div className="hidden sm:block"><p className="text-xs font-medium text-slate-200">Admin</p><p className="text-[10px] text-slate-500">Super Admin</p></div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {renderContent()}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800 bg-slate-950 px-4 py-3 text-center">
          <p className="text-xs text-slate-600">© 2026 FuelPro Station Manager · All rights reserved · v2.1.0</p>
        </footer>
      </div>
    </div>
  )
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function KPICard({ title, value, subtitle, icon, color, trend, trendUp }: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color: string
  trend: string
  trendUp: boolean
}) {
  const colorMap: Record<string, string> = {
    amber: 'border-l-amber-500 from-amber-500/5',
    emerald: 'border-l-emerald-500 from-emerald-500/5',
    red: 'border-l-red-500 from-red-500/5',
    violet: 'border-l-violet-500 from-violet-500/5',
  }
  const iconBgMap: Record<string, string> = {
    amber: 'bg-amber-500/15 text-amber-400',
    emerald: 'bg-emerald-500/15 text-emerald-400',
    red: 'bg-red-500/15 text-red-400',
    violet: 'bg-violet-500/15 text-violet-400',
  }

  return (
    <Card className={`bg-gradient-to-br ${colorMap[color] || ''} to-slate-900 border-slate-800 rounded-xl border-l-4 hover:scale-[1.02] transition-transform duration-200`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-slate-100">{value}</p>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          <div className={`flex items-center justify-center size-10 rounded-lg ${iconBgMap[color] || 'bg-slate-800 text-slate-400'}`}>
            {icon}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          {trendUp ? <ArrowUpRight className="size-3.5 text-emerald-400" /> : <ArrowDownRight className="size-3.5 text-red-400" />}
          <span className={`text-xs font-medium ${trendUp ? 'text-emerald-400' : 'text-red-400'}`}>{trend}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardSkeletons() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl bg-slate-900" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-80 rounded-xl bg-slate-900" />
        <Skeleton className="h-80 rounded-xl bg-slate-900" />
      </div>
      <Skeleton className="h-64 rounded-xl bg-slate-900" />
      <Skeleton className="h-48 rounded-xl bg-slate-900" />
    </div>
  )
}

function TableSkeletons({ cols, rows }: { cols: number; rows: number }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48 bg-slate-900" />
        <Skeleton className="h-9 w-32 bg-slate-900" />
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
        <div className="flex gap-4">{Array.from({ length: cols }).map((_, i) => <Skeleton key={i} className="h-4 flex-1 bg-slate-800" />)}</div>
        {Array.from({ length: rows }).map((_, i) => <div key={i} className="flex gap-4">{Array.from({ length: cols }).map((_, j) => <Skeleton key={j} className="h-4 flex-1 bg-slate-800/50" />)}</div>)}
      </div>
    </div>
  )
}
