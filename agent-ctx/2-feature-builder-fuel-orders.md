# Task ID: 2 — Fuel Order & Delivery Request Component

## Work Log

- Created FuelOrderRequest component (`src/components/fuel/fuel-order-request.tsx`) with:
  - **Summary Cards**: Active Orders (amber), Pending Deliveries (blue), Total Volume Ordered (green), Orders This Month (purple) — responsive grid (1-col mobile, 2-col sm, 4-col xl)
  - **Active Orders Section**: Cards showing each active order with supplier, fuel type, quantity, cost, delivery info; inline StatusStepper component with colored circles and connecting lines; Advance/Cancel/Details actions
  - **StatusStepper**: Visual timeline with 4 steps (pending → confirmed → in-transit → delivered); completed steps green, current step amber with glow, future steps slate; cancelled orders show separate X icon; colored connecting lines between steps
  - **Order History Table**: Filterable by status, supplier, and fuel type; columns for Order ID, Supplier, Fuel Type, Quantity, Total Cost, Delivery Date/Time, Status Badge, Actions (View Details, Quick Reorder)
  - **New Order Dialog**: Supplier select, Fuel Type select (PMS/AGO/DPK), Quantity input, auto-populated Unit Price from EPRA rates, Delivery Date/Time, Location, Special Instructions; Estimated cost calculation (quantity × current price); disabled submit until required fields filled
  - **Quick Reorder Dialog**: Pre-fills from past order, shows reference card, new delivery date required, estimated cost preview
  - **Order Detail Dialog**: Full status stepper, info grid (supplier, fuel type, quantity, unit price), total cost highlight, delivery details, special instructions, Advance Status and Cancel Order actions
  - **8 mock past orders** with realistic Kenyan fuel data (KenolKobil, Total Energies, Vivo Energy, OLA Energy suppliers; PMS/AGO/DPK fuel types; Kenyan locations; EPRA-approximate pricing)
  - **formatKsh(val)** helper for currency formatting
  - All styling: dark theme (bg-slate-800/60, border-slate-700/50, text-white), amber/gold accents (amber-400, amber-500), green for positive values, glassmorphism (backdrop-blur-sm), hover:border-amber-500/30, animate-fade-in
  - Uses 'use client' directive, shadcn/ui components (Card, Button, Input, Label, Select, Dialog, Textarea, Table, Badge), lucide-react icons
  - Internal useState for all order data management

- Updated `page.tsx`:
  - Added import: `import { FuelOrderRequest } from '@/components/fuel/fuel-order-request';`
  - Added case: `case 'fuel-orders': return <FuelOrderRequest />;`

## Stage Summary

- Fuel Order & Delivery Request component fully implemented with all 6 required features
- Status stepper with colored circles and connecting lines for visual order tracking
- 8 mock orders with realistic Kenyan fuel supplier data
- Estimated cost calculation based on current EPRA prices
- Quick reorder functionality from past orders
- Component follows all mandatory styling requirements (dark theme, amber accents, glassmorphism, responsive)
- Import and case statement added to page.tsx without modifying any other parts
