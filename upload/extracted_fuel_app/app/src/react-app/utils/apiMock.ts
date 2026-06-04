// Local API mock for offline/localhost mode
// This module provides fallback data when server APIs are unavailable

import { useFuel } from '@/react-app/context/FuelContext';

// Generic fetch wrapper that falls back to local data on failure
export async function localFetch<T>(
  url: string,
  options?: RequestInit,
  fallback?: T
): Promise<T> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch {
    console.warn(`API unavailable (${url}), using local fallback`);
    if (fallback !== undefined) return fallback;
    throw new Error(`API unavailable and no fallback provided for ${url}`);
  }
}

// Mock data generators
export const mockEmployees = () => [
  {
    id: '1',
    name: 'John Kamau',
    phone: '0712345678',
    email: 'john@fuelstation.co.ke',
    position: 'Station Manager',
    basicSalary: 45000,
    allowances: { house: 8000, transport: 5000 },
    deductions: { nhif: 1400, nssf: 200 },
    paymentMethod: 'Bank Transfer',
    isActive: true,
    dateJoined: '2023-01-15'
  },
  {
    id: '2',
    name: 'Mary Wanjiku',
    phone: '0723456789',
    email: 'mary@fuelstation.co.ke',
    position: 'Cashier',
    basicSalary: 28000,
    allowances: { house: 5000, transport: 3000 },
    deductions: { nhif: 1200, nssf: 200 },
    paymentMethod: 'M-Pesa',
    isActive: true,
    dateJoined: '2023-03-20'
  },
  {
    id: '3',
    name: 'Peter Ochieng',
    phone: '0734567890',
    email: 'peter@fuelstation.co.ke',
    position: 'Pump Attendant',
    basicSalary: 22000,
    allowances: { house: 4000, transport: 2500 },
    deductions: { nhif: 1000, nssf: 200 },
    paymentMethod: 'Cash',
    isActive: true,
    dateJoined: '2023-06-10'
  }
];

export const mockTransactions = () => [
  {
    id: 'txn-001',
    receiptNumber: 'FP-24001',
    invoiceNumber: 'INV001',
    items: [{ name: 'Super Petrol (PMS)', quantity: 1, unitPrice: 5000, total: 5000, fuelType: 'PMS', litres: 27.78 }],
    total: 5000,
    paymentMethod: 'mpesa',
    customerPhone: '0712345678',
    timestamp: new Date().toISOString(),
    cashier: 'Cashier 1',
    cuInvoiceNo: 'CU-001',
    cuSignature: 'SIG001',
    fiscalCounter: 1
  },
  {
    id: 'txn-002',
    receiptNumber: 'FP-24002',
    invoiceNumber: 'INV002',
    items: [{ name: 'Diesel (AGO)', quantity: 1, unitPrice: 8500, total: 8500, fuelType: 'AGO', litres: 50 }],
    total: 8500,
    paymentMethod: 'cash',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    cashier: 'Cashier 1',
    cuInvoiceNo: 'CU-002',
    cuSignature: 'SIG002',
    fiscalCounter: 2
  }
];

export const mockMPESATransactions = () => [
  {
    id: 'mpesa-1',
    date: new Date().toISOString().split('T')[0],
    time: '09:30',
    type: 'Received',
    amount: 5000,
    reference: 'SABC12DEF',
    description: 'Payment for fuel',
    balance: 150000,
    phoneNumber: '254712345678'
  },
  {
    id: 'mpesa-2',
    date: new Date().toISOString().split('T')[0],
    time: '10:15',
    type: 'Received',
    amount: 3500,
    reference: 'TGHI34JKL',
    description: 'Fuel payment - KCA 123A',
    balance: 153500,
    phoneNumber: '254723456789'
  },
  {
    id: 'mpesa-3',
    date: new Date().toISOString().split('T')[0],
    time: '11:45',
    type: 'Paid',
    amount: -2800,
    reference: 'MNOP56QRS',
    description: 'Stationery purchase',
    balance: 150700,
    phoneNumber: '254734567890'
  }
];

export const mockDocuments = () => [
  {
    id: 'doc-1',
    name: 'Fuel License 2025.pdf',
    type: 'application/pdf',
    size: '245 KB',
    folder: 'licenses',
    uploadedAt: new Date().toISOString(),
    url: '#'
  },
  {
    id: 'doc-2',
    name: 'KRA Certificate.pdf',
    type: 'application/pdf',
    size: '120 KB',
    folder: 'compliance',
    uploadedAt: new Date().toISOString(),
    url: '#'
  },
  {
    id: 'doc-3',
    name: 'Supplier Contract - Total.pdf',
    type: 'application/pdf',
    size: '520 KB',
    folder: 'contracts',
    uploadedAt: new Date().toISOString(),
    url: '#'
  }
];

export const mockContacts = () => [
  {
    id: '1',
    name: 'ABC Transport Ltd',
    phone: '0720123456',
    email: 'accounts@abctransport.co.ke',
    type: 'customer',
    balance: 45000
  },
  {
    id: '2',
    name: 'XYZ Logistics',
    phone: '0730234567',
    email: 'info@xyzlogistics.co.ke',
    type: 'customer',
    balance: 23000
  },
  {
    id: '3',
    name: 'Total Kenya',
    phone: '0201234567',
    email: 'supply@totalkenya.co.ke',
    type: 'supplier',
    balance: 0
  }
];

export const mockMessageTemplates = () => [
  {
    id: '1',
    name: 'Payment Reminder',
    content: 'Dear {name}, this is a friendly reminder that your balance of Ksh {amount} is due. Please make payment at your earliest convenience.',
    category: 'payment'
  },
  {
    id: '2',
    name: 'Delivery Confirmation',
    content: 'Dear {name}, your fuel order of {litres}L has been delivered. Total: Ksh {amount}. Thank you for your business!',
    category: 'delivery'
  },
  {
    id: '3',
    name: 'Thank You',
    content: 'Dear {name}, thank you for your payment of Ksh {amount}. Your balance is now {balance}. We appreciate your business!',
    category: 'general'
  }
];
