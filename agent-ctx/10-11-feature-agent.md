# Task 10-11: Company Profile & Permissions/RBAC Sub-Tabs

## Summary
Added 2 new sub-tabs to the Admin tab in page.tsx: Company Profile and Permissions/RBAC.

## Changes Made

### 1. Icon Imports (line 14)
- Added `Building` and `Info` to lucide-react imports

### 2. State Variables (lines 710-711)
- `companyProfile` - stores the full company profile from API
- `companyForm` - controlled form state for editing company info

### 3. Fetch Callback (lines 918-939)
- `fetchCompany` - calls GET /api/company, populates both state variables

### 4. Tab Loading (line 1088)
- Added `fetchCompany()` to admin tab case
- Added `fetchCompany` to useEffect dependency array

### 5. Save Handler (lines 1624-1631)
- `handleSaveCompany` - calls PUT /api/company with companyForm data

### 6. TabsTrigger Elements (lines 4387-4388)
- Added "company" and "permissions" tab triggers

### 7. Company Profile TabsContent (lines 4642-4734)
- Company Information Card with all form fields
- Bank Details Card with info notice
- Document Preview Card (sticky sidebar)
- Save Company Profile button

### 8. Permissions/RBAC TabsContent (lines 4736-4870)
- Permission Matrix table (9 data types × 4 roles)
- Action legend (6 action types)
- Role Descriptions Card (4 color-coded cards)
- Station Access Card (user table with role badges)
- Save Permissions button

## Lint Result
0 errors, 2 pre-existing warnings (in upload directory)
