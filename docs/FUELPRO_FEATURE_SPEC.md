# FuelPro — Comprehensive Feature Specification
> Fuel Station Management System for African Markets (Kenya, Nigeria, etc.)
> With MPESA, Mobile Money & Multi-Country Payment Integration

---

## 1. CORE FUEL STATION MANAGEMENT FEATURES

### 1.1 Real-Time Fuel Inventory Tracking
- **Priority:** Must-Have
- **Description:** Live monitoring of fuel levels across all underground/above-ground tanks using automated tank gauging (ATG) integration and manual dipstick readings. Detects leaks, theft, and discrepancies between book stock and physical stock.
- **Key Data Points:**
  - `tank_id`, `station_id`, `fuel_type` (Petrol/Super, Diesel, Kerosene, Premium)
  - `current_level_litres`, `capacity_litres`, `min_threshold_litres`
  - `temperature`, `water_detected` (boolean + volume)
  - `last_dipstick_reading`, `last_atg_reading`, `reading_timestamp`
  - `book_stock_vs_physical_variance`
  - `delivery_pending` (boolean), `estimated_runout_datetime`

### 1.2 Wet Stock Management (Fuel-Specific)
- **Priority:** Must-Have
- **Description:** End-to-end tracking of fuel from delivery to dispensing. Includes delivery reconciliation, tank-to-pump mapping, and variance analysis. Supports the standard African fuel reconciliation: Opening Stock + Deliveries - Sales = Closing Stock.
- **Key Data Points:**
  - `delivery_id`, `supplier_name`, `delivery_note_number`
  - `fuel_type`, `volume_delivered_litres`, `volume_invoiced_litres`
  - `delivery_temperature`, `density`
  - `receiving_tank_id`, `pre_delivery_dip`, `post_delivery_dip`
  - `variance_litres`, `variance_percentage`, `variance_status` (acceptable/flagged)
  - `grade_certification_number`

### 1.3 Dry Stock / Shop Inventory Management
- **Priority:** Should-Have
- **Description:** Track convenience store/forecourt shop items — lubricants, snacks, beverages, car accessories. Manages reorder levels, supplier management, and margin tracking.
- **Key Data Points:**
  - `product_id`, `product_name`, `category`, `sku`
  - `current_stock`, `reorder_level`, `reorder_quantity`
  - `cost_price`, `selling_price`, `margin_percentage`
  - `supplier_id`, `last_restock_date`, `expiry_date`
  - `stock_value` (current_stock x cost_price)

### 1.4 Pump-Level Monitoring & Control
- **Priority:** Must-Have
- **Description:** Real-time monitoring of every pump/nozzle at the station. Track volumes dispensed, transaction counts, and nozzle status. Support for remote price changes and pump locking/unlocking. Compatible with major dispenser protocols (Gilbarco, Wayne, Tatsuno, etc.).
- **Key Data Points:**
  - `pump_id`, `nozzle_id`, `station_id`
  - `fuel_type_per_nozzle`
  - `current_price_per_litre`, `previous_price`, `price_change_effective_time`
  - `cumulative_volume_dispensed`, `transaction_count`
  - `pump_status` (idle/dispensing/locked/offline/error)
  - `totalizer_reading` (electronic), `totalizer_reading_manual`
  - `last_calibration_date`

### 1.5 Sales Recording & Transaction Management
- **Priority:** Must-Have
- **Description:** Automated recording of every fuel and shop sale. Supports cash, MPESA, card, fleet card, and credit account payments. Links transactions to specific pumps, nozzles, and attendants.
- **Key Data Points:**
  - `transaction_id`, `timestamp`, `station_id`, `pump_id`, `nozzle_id`
  - `attendant_id`, `customer_type` (walk-in/fleet/credit)
  - `fuel_type`, `volume_litres`, `price_per_litre`, `total_amount`
  - `payment_method` (cash/mpesa/card/fleet_card/credit/mobile_money/ussd)
  - `payment_reference`, `payment_status` (pending/confirmed/failed)
  - `vehicle_registration` (optional), `odometer_reading` (optional)
  - `shift_id`, `receipt_number`

### 1.6 Dynamic Pricing Engine
- **Priority:** Must-Have
- **Description:** Update fuel prices across all pumps in real-time from the app. Supports EPRA-mandated maximum price enforcement (Kenya) and flexible pricing for deregulated markets (Nigeria). Price change audit trail and scheduled price updates.
- **Key Data Points:**
  - `price_id`, `fuel_type`, `station_id`, `region`
  - `new_price`, `old_price`, `effective_datetime`
  - `epra_maximum_price` (Kenya-specific), `is_capped`
  - `authorized_by`, `authorization_timestamp`
  - `margin_per_litre`, `competitor_price_reference`
  - `change_reason` (regulatory/market/volume_promo)

### 1.7 Delivery Management
- **Priority:** Must-Have
- **Description:** Track fuel deliveries from suppliers. Schedule expected deliveries, record actual deliveries, and reconcile against purchase orders and delivery notes.
- **Key Data Points:**
  - `delivery_order_id`, `purchase_order_id`
  - `supplier_id`, `supplier_name`
  - `expected_delivery_datetime`, `actual_arrival_datetime`
  - `driver_name`, `vehicle_registration`, `seal_numbers`
  - `fuel_type`, `ordered_volume`, `delivered_volume`, `billed_volume`
  - `delivery_note_number`, `invoice_number`
  - `reconciliation_status`, `quality_certification`

---

## 2. ADMIN / FOUNDER BACKEND FEATURES (FULL SYSTEM CONTROL)

### 2.1 Multi-Tenant Organization Management
- **Priority:** Must-Have
- **Description:** The founder/admin controls the entire FuelPro platform. Manage multiple companies (fuel station brands), each with multiple stations. Full hierarchical control: Platform -> Company -> Region -> Station -> Shift.
- **Key Data Points:**
  - `platform_id`, `organization_id`, `organization_name`
  - `subscription_plan`, `subscription_status`, `billing_cycle`
  - `country`, `currency`, `timezone`, `locale`
  - `max_stations_allowed`, `active_stations_count`
  - `onboarding_status`, `onboarding_date`
  - `primary_contact_name`, `primary_contact_email`, `primary_contact_phone`
  - `business_registration_number`, `tax_identification_number`

### 2.2 Super Admin Dashboard (God Mode)
- **Priority:** Must-Have
- **Description:** Single-pane-of-glass view across the entire FuelPro platform. See real-time revenue across all organizations, total volume dispensed, active users, system health, and key KPIs. Drill-down from platform level to individual nozzle level.
- **Key Data Points:**
  - Platform-level KPIs:
    - `total_revenue_all_orgs`, `total_volume_dispensed`, `total_transactions`
    - `active_organizations`, `active_stations`, `active_users`
    - `mrr` (monthly recurring revenue), `arr`
    - `churn_rate`, `net_promoter_score`
  - System health:
    - `api_uptime_percentage`, `active_connections`, `queue_depth`
    - `failed_transactions_count`, `error_rate`
  - Drill-down filters: `by_organization`, `by_country`, `by_region`, `by_station`, `by_date_range`

### 2.3 Organization Management & Provisioning
- **Priority:** Must-Have
- **Description:** Create, suspend, and manage organizations on the platform. Control feature flags per organization, manage subscription tiers, and handle onboarding workflows.
- **Key Data Points:**
  - `organization_id`, `status` (active/suspended/trial/churned)
  - `feature_flags` (JSON object - per-org feature toggles)
  - `subscription_tier` (starter/pro/enterprise)
  - `trial_start_date`, `trial_end_date`, `conversion_date`
  - `data_retention_policy`, `custom_branding_enabled`
  - `api_key`, `api_rate_limit`, `webhook_url`
  - `support_tier` (community/priority/dedicated)

### 2.4 Revenue & Billing Management
- **Priority:** Must-Have
- **Description:** Manage the FuelPro SaaS billing. Track subscription payments, transaction-based fees, and usage-based billing. Generate invoices and handle payment failures.
- **Key Data Points:**
  - `invoice_id`, `organization_id`, `billing_period`
  - `subscription_fee`, `transaction_fees`, `usage_fees`, `total_amount`
  - `payment_status`, `payment_method`, `payment_reference`
  - `due_date`, `paid_date`, `overdue_days`
  - `line_items` (JSON array of billable items)
  - `tax_amount`, `tax_breakdown`

### 2.5 Platform-Wide Analytics & Business Intelligence
- **Priority:** Must-Have
- **Description:** Cross-organization analytics for the founder. Compare performance across organizations, identify trends, and surface insights. Fuel market intelligence (average prices, volumes by region).
- **Key Data Points:**
  - `report_type` (revenue/volume/usage/retention/growth)
  - `time_period`, `granularity` (hourly/daily/weekly/monthly)
  - `filter_dimensions` (organization/country/region/station/fuel_type)
  - `comparison_period` (vs last week/month/year)
  - `metric_values` (JSON array of time-series data)
  - `benchmarks` (industry averages, peer comparison)

### 2.6 System Configuration Management
- **Priority:** Must-Have
- **Description:** Global platform configuration. Manage default settings, payment gateway configurations, SMS/email provider settings, feature rollouts, and compliance rule engines per country.
- **Key Data Points:**
  - `config_key`, `config_value`, `scope` (global/country/organization)
  - `country_code`, `regulatory_framework`
  - `payment_gateways_enabled` (JSON: mpesa/stripe/flutterwave/paystack)
  - `sms_provider`, `email_provider`, `push_provider`
  - `fuel_types_supported` (per country: e.g., Kenya = [Super Petrol, Premium Petrol, Diesel, Kerosene])
  - `default_currency`, `tax_rate`, `vat_enabled`
  - `epra_integration_enabled` (Kenya), `kra_etims_enabled` (Kenya)
  - `pricing_regulation_mode` (capped/regulated/free_market)

### 2.7 User & Role Management (Platform Level)
- **Priority:** Must-Have
- **Description:** Manage all platform users including super admins, org admins, and support staff. Role-based access control with granular permissions at every level.
- **Key Data Points:**
  - `user_id`, `email`, `phone`, `name`, `role`
  - `platform_role` (super_admin/admin/support/viewer)
  - `organization_roles` (JSON: [{org_id, role}])
  - `permissions` (JSON: granular permission matrix)
  - `mfa_enabled`, `last_login`, `login_history`
  - `account_status`, `suspension_reason`

### 2.8 Audit Trail & Compliance (Platform Level)
- **Priority:** Must-Have
- **Description:** Complete audit trail of all actions on the platform. Every data change, login, configuration update, and financial transaction is logged with who, what, when, and from where.
- **Key Data Points:**
  - `audit_id`, `timestamp`, `actor_id`, `actor_email`
  - `action_type` (create/read/update/delete/login/logout/config_change)
  - `resource_type`, `resource_id`
  - `old_value`, `new_value`, `change_description`
  - `ip_address`, `device_info`, `geo_location`
  - `organization_id`, `station_id`

### 2.9 Support & Ticket Management
- **Priority:** Should-Have
- **Description:** Built-in support ticket system for organizations to report issues. Admin can assign, track, and resolve tickets. Integration with WhatsApp for support.
- **Key Data Points:**
  - `ticket_id`, `organization_id`, `station_id`
  - `reported_by`, `assigned_to`, `priority`, `status`
  - `category` (technical/billing/training/feature_request)
  - `description`, `attachments`
  - `sla_response_deadline`, `sla_resolution_deadline`
  - `resolution_notes`, `customer_satisfaction_rating`

### 2.10 Feature Flag & A/B Testing Engine
- **Priority:** Should-Have
- **Description:** Roll out new features gradually. Test features with specific organizations before full deployment. Manage feature flags per org, per country, or per station.
- **Key Data Points:**
  - `flag_id`, `flag_name`, `flag_key`
  - `description`, `default_value` (boolean)
  - `targeting_rules` (JSON: conditions for feature activation)
  - `rollout_percentage`, `affected_organizations`
  - `created_date`, `last_modified`, `status` (active/paused/retired)

### 2.11 Data Export & API Management
- **Priority:** Should-Have
- **Description:** Allow organizations to export data and access FuelPro APIs. Manage API keys, rate limits, and webhook configurations. Provide data export in CSV, Excel, and JSON formats.
- **Key Data Points:**
  - `api_key_id`, `organization_id`, `key_hash`
  - `permissions` (read/write/admin), `rate_limit_rpm`
  - `webhook_endpoints` (JSON array of URLs + events)
  - `export_job_id`, `export_type`, `date_range`
  - `export_format`, `export_status`, `download_url`
  - `data_retention_days`

### 2.12 Platform Health & Monitoring
- **Priority:** Must-Have
- **Description:** Real-time monitoring of all system components. Uptime tracking, performance metrics, alerting for outages, and capacity planning.
- **Key Data Points:**
  - `service_name`, `status` (healthy/degraded/down)
  - `uptime_percentage_24h`, `uptime_percentage_30d`
  - `response_time_p50`, `response_time_p99`
  - `error_rate`, `active_alerts_count`
  - `last_incident_datetime`, `mttr` (mean time to recovery)
  - `database_size`, `storage_utilization`

---

## 3. PAYMENT INTEGRATION FEATURES

### 3.1 MPESA Integration (Kenya - Primary)
- **Priority:** Must-Have
- **Description:** Full Safaricom Daraja API integration. Support STK Push (customer-initiated), C2B (Paybill/Till number), and B2C (disbursements). Real-time payment confirmation via callbacks.
- **Key Data Points:**
  - `mpesa_transaction_id`, `merchant_request_id`, `checkout_request_id`
  - `phone_number`, `amount`, `account_reference`
  - `transaction_type` (stk_push/c2b_paybill/c2b_till/b2c)
  - `paybill_number`, `till_number`
  - `result_code`, `result_description`
  - `mpesa_receipt_number`, `balance`
  - `callback_received`, `callback_timestamp`
  - `reconciliation_status`, `reconciled_with_sale_id`

### 3.2 MPESA STK Push (Customer-Initiated Payment)
- **Priority:** Must-Have
- **Description:** Initiate payment from the app/POS by sending an STK push to the customer's phone. Customer enters PIN on their phone to confirm. Best for attended fuel sales.
- **Key Data Points:**
  - Same as 3.1 plus:
  - `initiated_by` (attendant_id), `initiation_timestamp`
  - `customer_phone`, `amount_requested`
  - `stk_push_status` (sent/completed/failed/timeout)
  - `timeout_duration_seconds` (configurable, default 90)

### 3.3 MPESA C2B (Paybill/Till)
- **Priority:** Must-Have
- **Description:** Customers pay directly to the station's Paybill or Till number. System auto-matches incoming payments to pending sales using account references. Essential for unattended/self-service scenarios.
- **Key Data Points:**
  - `paybill_number`, `till_number`, `account_reference`
  - `validation_url_response`, `confirmation_url_response`
  - `auto_reconciliation_enabled` (boolean)
  - `unmatched_payments_queue` (payments without matching sales)

### 3.4 Flutterwave Integration (Pan-Africa - Nigeria Primary)
- **Priority:** Must-Have
- **Description:** Flutterwave for Nigerian and pan-African payments. Supports cards, bank transfers, USSD, and mobile money across 34+ African countries.
- **Key Data Points:**
  - `flw_transaction_id`, `flw_ref`, `amount`, `currency` (NGN/KES/GHS/etc.)
  - `payment_type` (card/bank_transfer/ussd/mobile_money/account)
  - `customer_email`, `customer_phone`
  - `status` (successful/failed/pending)
  - `narration`, `meta` (JSON: custom fields)
  - `reconciliation_status`

### 3.5 Paystack Integration (Nigeria/West Africa)
- **Priority:** Should-Have
- **Description:** Paystack for Nigerian businesses. Supports card payments, bank transfers, USSD, Apple Pay, and mobile money. Known for excellent developer experience.
- **Key Data Points:**
  - `paystack_reference`, `authorization_code`
  - `channel` (card/bank/ussd/mobile_money/qr)
  - `amount_kobo`, `currency`, `fees`
  - `customer_code`, `plan_code`
  - `status`, `paid_at`

### 3.6 Stripe Integration (International/Corporate)
- **Priority:** Should-Have
- **Description:** Stripe for international card payments, fleet cards, and corporate accounts. Essential for multinational oil companies and expat-managed stations.
- **Key Data Points:**
  - `stripe_payment_intent_id`, `stripe_charge_id`
  - `amount_cents`, `currency`, `description`
  - `payment_method_type`, `last4`, `brand`
  - `status`, `receipt_url`, `refund_id`

### 3.7 Fleet Card Integration
- **Priority:** Should-Have
- **Description:** Support for fleet management cards (Vivo Energy, Total, Oando fleet cards). Corporate customers manage fuel budgets for their vehicle fleets.
- **Key Data Points:**
  - `fleet_card_number`, `fleet_provider`, `vehicle_registration`
  - `driver_id`, `odometer_reading`
  - `authorized_volume`, `authorized_amount`
  - `fuel_type_restriction`, `daily_limit`, `monthly_limit`
  - `transaction_approved`, `approval_code`

### 3.8 USSD Payment Support
- **Priority:** Must-Have
- **Description:** USSD-based payment for feature phone users. Critical for rural African markets where smartphones are less prevalent. Supports MPESA USSD (*334#), bank USSD codes.
- **Key Data Points:**
  - `ussd_code`, `bank_code`, `session_id`
  - `payment_initiated_via` (app/ussd/sms)
  - `user_phone_number`, `amount`
  - `verification_method` (auto/manual)

### 3.9 Multi-Currency & Cross-Border
- **Priority:** Should-Have
- **Description:** Support for KES, NGN, GHS, TZS, UGX, and other African currencies. Auto-conversion for cross-border operations. Country-specific tax handling.
- **Key Data Points:**
  - `base_currency`, `transaction_currency`
  - `exchange_rate`, `exchange_rate_source`, `rate_timestamp`
  - `amount_in_base_currency`, `amount_in_transaction_currency`
  - `tax_amount`, `tax_type` (VAT/sales_tax/excise)

### 3.10 Automated Payment Reconciliation
- **Priority:** Must-Have
- **Description:** Auto-match payments to sales. Reconcile MPESA, card, and cash transactions against POS records. Flag unmatched payments and sales for manual review.
- **Key Data Points:**
  - `reconciliation_batch_id`, `reconciliation_date`
  - `total_sales_amount`, `total_payments_received`, `variance`
  - `matched_count`, `unmatched_payments_count`, `unmatched_sales_count`
  - `auto_matched_count`, `manually_matched_count`
  - `flagged_items` (JSON array of exceptions)

---

## 4. ANALYTICS & REPORTING FEATURES

### 4.1 Daily/Weekly/Monthly Sales Reports
- **Priority:** Must-Have
- **Description:** Comprehensive sales reports broken down by fuel type, payment method, pump, attendant, and shift. Compare against targets and historical periods.
- **Key Data Points:**
  - `report_period`, `station_id`, `fuel_type`
  - `total_volume_sold`, `total_revenue`, `average_price_per_litre`
  - `transactions_count`, `average_transaction_value`
  - `payment_method_breakdown` (JSON)
  - `vs_previous_period_percentage`, `vs_same_period_last_year`
  - `margin_analysis` (gross_margin_per_litre)

### 4.2 Inventory & Stock Reconciliation Reports
- **Priority:** Must-Have
- **Description:** Pump-to-tank reconciliation comparing electronic totalizer readings against tank dip readings and delivery records. The single most critical report for fuel station owners to detect losses.
- **Key Data Points:**
  - `reconciliation_date`, `station_id`, `tank_id`, `fuel_type`
  - `opening_stock_litres`, `deliveries_received_litres`
  - `sales_per_totalizer_litres`, `closing_stock_litres`
  - `physical_dip_litres`, `variance_litres`, `variance_percentage`
  - `variance_category` (acceptable/leak_suspected/theft_suspected/evaporation)
  - `action_required` (none/investigate/escalate)

### 4.3 Profitability & Margin Analysis
- **Priority:** Must-Have
- **Description:** Track profitability per litre, per fuel type, per station. Factor in purchase costs, operating expenses, and payment processing fees.
- **Key Data Points:**
  - `period`, `station_id`, `fuel_type`
  - `cost_per_litre`, `selling_price_per_litre`, `gross_margin_per_litre`
  - `total_volume`, `gross_profit`, `payment_processing_fees`
  - `operational_cost_allocation`, `net_profit`
  - `break_even_volume`, `contribution_margin_percentage`

### 4.4 Attendant Performance Reports
- **Priority:** Must-Have
- **Description:** Track individual attendant metrics - sales volume, transaction count, average transaction value, upsell rate, and shift performance.
- **Key Data Points:**
  - `attendant_id`, `attendant_name`, `period`
  - `total_volume_sold`, `total_revenue`, `transactions_count`
  - `average_transaction_value`, `upsell_count`
  - `shift_hours`, `revenue_per_hour`
  - `customer_complaints`, `customer_compliments`
  - `variance_on_shift` (stock discrepancy during their shift)

### 4.5 EPRA Compliance Reports (Kenya)
- **Priority:** Must-Have
- **Description:** Automated generation of reports required by EPRA. Monthly price compliance, stock movement records, and quality certification tracking.
- **Key Data Points:**
  - `report_type` (price_compliance/stock_movement/quality_cert)
  - `reporting_period`, `station_license_number`
  - `epra_max_prices` (JSON: fuel type -> max price)
  - `actual_prices_charged` (JSON: fuel type -> price)
  - `compliance_status` (compliant/overcharged/undercharged)
  - `total_volume_imported`, `total_volume_sold`
  - `fuel_quality_certificates` (JSON array)

### 4.6 KRA eTIMS Tax Reports (Kenya)
- **Priority:** Must-Have
- **Description:** Automated generation of electronic tax invoices compliant with KRA's eTIMS system. VAT calculations, tax returns data, and transaction-level reporting.
- **Key Data Points:**
  - `etims_cu_serial`, `etims_invoice_number`
  - `vat_registration_number`, `pin_number`
  - `taxable_amount`, `vat_amount`, `total_amount`
  - `exempt_amount`, `zero_rated_amount`
  - `fiscal_day_number`, `z_report_data`

### 4.7 Trend Analysis & Forecasting
- **Priority:** Should-Have
- **Description:** AI-powered demand forecasting based on historical sales, day-of-week patterns, seasonal trends, and local events. Predict stock-out dates and suggest optimal order quantities.
- **Key Data Points:**
  - `forecast_period`, `fuel_type`, `station_id`
  - `predicted_volume`, `confidence_interval_lower`, `confidence_interval_upper`
  - `historical_basis_days`, `model_accuracy_score`
  - `seasonal_factors` (JSON), `trend_direction`
  - `suggested_order_quantity`, `suggested_order_date`

### 4.8 Custom Report Builder
- **Priority:** Nice-to-Have
- **Description:** Drag-and-drop report builder allowing admins to create custom reports with any combination of metrics, dimensions, and filters.
- **Key Data Points:**
  - `report_template_id`, `report_name`, `created_by`
  - `dimensions` (JSON array), `metrics` (JSON array)
  - `filters` (JSON), `sort_order`, `chart_type`
  - `schedule` (none/daily/weekly/monthly), `recipients`
  - `export_formats` (pdf/excel/csv)

---

## 5. TEAM & STAFF MANAGEMENT FEATURES

### 5.1 Staff Registration & Profiles
- **Priority:** Must-Have
- **Description:** Register all station staff with their roles, qualifications, and personal details. Track employment history and certifications.
- **Key Data Points:**
  - `staff_id`, `full_name`, `employee_number`
  - `role` (manager/supervisor/attendant/cashier/security/maintenance)
  - `phone_number`, `email`, `national_id_number`
  - `station_id`, `hire_date`, `employment_status`
  - `qualifications` (JSON array), `certifications` (JSON array)
  - `emergency_contact`, `next_of_kin`
  - `photo_url`, `fingerprint_hash` (biometric)

### 5.2 Shift Management
- **Priority:** Must-Have
- **Description:** Create and manage shifts. Assign attendants to pumps and cashiers to POS terminals. Track shift handover with opening/closing readings.
- **Key Data Points:**
  - `shift_id`, `station_id`, `shift_date`
  - `shift_type` (morning/afternoon/night/custom)
  - `start_time`, `end_time`, `actual_start`, `actual_end`
  - `shift_supervisor_id`, `assigned_attendants` (JSON array)
  - `opening_pump_readings` (JSON: pump_id -> totalizer)
  - `closing_pump_readings` (JSON: pump_id -> totalizer)
  - `opening_cash_float`, `closing_cash_amount`
  - `shift_status` (planned/active/completed/disputed)

### 5.3 Attendance & Clock-In/Out
- **Priority:** Must-Have
- **Description:** Track staff attendance with GPS-verified clock-in/out. Support biometric (fingerprint), QR code, and manual clock-in methods. Flag late arrivals and early departures.
- **Key Data Points:**
  - `attendance_id`, `staff_id`, `station_id`
  - `clock_in_time`, `clock_out_time`, `scheduled_start`, `scheduled_end`
  - `clock_in_method` (biometric/qr/gps/manual)
  - `gps_location_clock_in`, `gps_location_clock_out`
  - `is_late`, `late_minutes`, `is_early_departure`
  - `total_hours_worked`, `overtime_hours`
  - `device_id_used`

### 5.4 Payroll Integration
- **Priority:** Should-Have
- **Description:** Calculate staff pay based on hours worked, overtime, and commissions. Export payroll data for processing. Support for MPESA B2C salary disbursement.
- **Key Data Points:**
  - `payroll_period`, `staff_id`
  - `base_salary`, `hours_worked`, `overtime_hours`, `overtime_pay`
  - `commission_earned`, `deductions` (JSON array)
  - `net_pay`, `payment_method`, `mpesa_phone`
  - `payroll_status` (calculated/approved/disbursed)

### 5.5 Performance Metrics & KPIs
- **Priority:** Should-Have
- **Description:** Individual and team performance dashboards. Gamification elements to drive healthy competition among attendants.
- **Key Data Points:**
  - `staff_id`, `period`, `kpi_type`
  - `target_value`, `actual_value`, `achievement_percentage`
  - `ranking` (within station), `ranking` (within organization)
  - `badges_earned` (JSON array), `rewards_earned`

### 5.6 Training & Certification Tracker
- **Priority:** Nice-to-Have
- **Description:** Track staff training completion and certification expiry dates. Send reminders for upcoming renewals (e.g., fire safety, first aid, EPRA certifications).
- **Key Data Points:**
  - `training_id`, `staff_id`, `training_type`
  - `completion_date`, `expiry_date`, `certification_number`
  - `provider`, `status` (valid/expired/expiring_soon)
  - `reminder_sent`, `reminder_date`

---

## 6. CUSTOMER-FACING FEATURES

### 6.1 Digital Receipts
- **Priority:** Must-Have
- **Description:** Send digital receipts via SMS, WhatsApp, or email after every transaction. Receipts include eTIMS-compliant tax information (Kenya), QR code for verification, and loyalty points earned.
- **Key Data Points:**
  - `receipt_id`, `transaction_id`, `receipt_number`
  - `delivery_method` (sms/whatsapp/email/print/all)
  - `customer_phone`, `customer_email`
  - `receipt_url`, `qr_code_url`
  - `etims_compliant` (boolean), `etims_cu_invoice_number`
  - `delivery_status`, `delivery_timestamp`

### 6.2 Loyalty & Rewards Program
- **Priority:** Must-Have
- **Description:** Points-based loyalty program. Customers earn points per litre purchased. Redeemable for fuel discounts, free car wash, shop items, or cashback. Tiered membership (Bronze/Silver/Gold/Platinum).
- **Key Data Points:**
  - `loyalty_account_id`, `customer_phone`, `customer_name`
  - `tier` (bronze/silver/gold/platinum), `total_points`
  - `points_earned_this_transaction`, `points_redeemed`
  - `earn_rate` (points per litre), `redemption_value`
  - `lifetime_volume_purchased`, `lifetime_visits`
  - `last_visit_date`, `next_tier_progress_percentage`
  - `available_rewards` (JSON array)

### 6.3 Customer Mobile App / PWA
- **Priority:** Should-Have
- **Description:** Lightweight PWA for customers to find nearby FuelPro stations, check real-time fuel prices, pre-order fuel, pay via MPESA, track loyalty points, and view transaction history.
- **Key Data Points:**
  - `customer_id`, `phone_number`, `name`
  - `preferred_station_id`, `preferred_fuel_type`
  - `saved_vehicles` (JSON array: registration, fuel_type, tank_capacity)
  - `transaction_history` (paginated), `loyalty_balance`
  - `push_notification_token`, `notification_preferences`

### 6.4 Station Locator & Price Checker
- **Priority:** Should-Have
- **Description:** Map-based station finder showing all FuelPro-enabled stations with real-time prices, services available (car wash, ATM, shop), and directions.
- **Key Data Points:**
  - `station_id`, `station_name`, `latitude`, `longitude`
  - `fuel_prices` (JSON: fuel_type -> price)
  - `services_available` (JSON array: car_wash/atm/air/shop/restaurant)
  - `operating_hours`, `is_24_hour`
  - `distance_from_user_km`, `estimated_drive_time`
  - `average_rating`, `review_count`

### 6.5 Pre-Order Fuel
- **Priority:** Nice-to-Have
- **Description:** Customers pre-order and pay for fuel before arriving. Reduces queue times and guarantees price. Station is notified of incoming prepaid customer.
- **Key Data Points:**
  - `pre_order_id`, `customer_id`, `station_id`
  - `fuel_type`, `volume_litres`, `amount`
  - `payment_status`, `payment_reference`
  - `valid_from`, `valid_until` (price guarantee window)
  - `fulfillment_status` (pending/fulfilled/expired/refunded)
  - `pump_assigned`, `attended_by`

### 6.6 Customer Feedback & Ratings
- **Priority:** Should-Have
- **Description:** Post-transaction feedback collection via SMS/WhatsApp link. Star rating + optional comment. Auto-escalation of negative feedback.
- **Key Data Points:**
  - `feedback_id`, `transaction_id`, `customer_phone`
  - `rating` (1-5 stars), `comment`, `feedback_category`
  - `station_id`, `attendant_id`, `timestamp`
  - `escalated`, `escalation_reason`, `resolution_status`

---

## 7. COMPLIANCE FEATURES (EPRA / KRA / COUNTRY-SPECIFIC)

### 7.1 EPRA Price Compliance Engine (Kenya)
- **Priority:** Must-Have
- **Description:** Automatically enforce EPRA-mandated maximum pump prices. When EPRA announces new price caps (monthly cycle), system auto-updates or alerts if current prices exceed caps. Prevents overcharging violations under Petroleum Act 2019 Section 101(y).
- **Key Data Points:**
  - `epra_price_id`, `fuel_type`, `town`, `max_retail_price`
  - `effective_from`, `effective_to`
  - `source` (epra_gazette/api/manual)
  - `station_current_price`, `compliance_status`
  - `auto_update_enabled` (boolean)
  - `violation_alert_sent` (boolean)

### 7.2 EPRA License & Permit Management
- **Priority:** Must-Have
- **Description:** Track all EPRA-required licenses and permits per station. Alert on upcoming expirations. Store digital copies of certificates.
- **Key Data Points:**
  - `license_id`, `station_id`, `license_type`
  - Types: `retail_license`, `storage_license`, `construction_permit`, `environmental_license`, `fire_safety_certificate`
  - `license_number`, `issued_date`, `expiry_date`
  - `issuing_authority`, `document_url`
  - `status` (valid/expired/expiring_soon/pending_renewal)
  - `renewal_reminder_days` (configurable)

### 7.3 Fuel Quality Tracking
- **Priority:** Must-Have
- **Description:** Track fuel quality certifications from suppliers. Record density, flash point, and other parameters per delivery. Required by EPRA to prevent adulteration under Petroleum Act 2019 Section 92.
- **Key Data Points:**
  - `quality_cert_id`, `delivery_id`, `supplier_id`
  - `fuel_type`, `density`, `flash_point`, `distillation_point`
  - `sulphur_content`, `octane_rating`, `colour`
  - `sample_date`, `lab_name`, `cert_document_url`
  - `compliant` (boolean), `epra_standard_reference`

### 7.4 KRA eTIMS Integration (Kenya)
- **Priority:** Must-Have
- **Description:** Direct integration with KRA's electronic Tax Invoice Management System. Auto-generate compliant e-invoices for every transaction. Required for all Kenyan fuel stations by law (deadline: June 30, 2025).
- **Key Data Points:**
  - `etims_cu_device_id`, `etims_cu_serial_number`
  - `kra_pin`, `vat_registration_number`
  - `invoice_number_etims`, `fiscal_day_number`
  - `z_report_data` (end-of-day fiscal report)
  - `sync_status`, `last_sync_timestamp`
  - `error_log` (JSON: failed transmissions)

### 7.5 DPR/NMDPRA Compliance (Nigeria)
- **Priority:** Should-Have
- **Description:** Department of Petroleum Resources / NMDPRA compliance features for Nigerian stations. Track licenses, retail outlet permits, and regulatory submissions.
- **Key Data Points:**
  - `dpr_license_number`, `license_type`, `expiry_date`
  - `retail_outlet_permit_number`, `permit_expiry`
  - `monthly_returns_data` (JSON), `submission_status`
  - `inspection_records` (JSON array)

### 7.6 Environmental & Safety Compliance
- **Priority:** Must-Have
- **Description:** Track environmental compliance - vapor recovery systems, spill containment, fire safety equipment inspections, and NEMA (National Environment Management Authority) requirements.
- **Key Data Points:**
  - `compliance_item_id`, `station_id`, `category`
  - `item_type` (fire_extinguisher/spill_kit/vapor_recovery/leak_detector)
  - `last_inspection_date`, `next_inspection_date`
  - `inspection_status` (pass/fail/due/overdue)
  - `inspector_name`, `certificate_url`

### 7.7 Automated Regulatory Reporting
- **Priority:** Must-Have
- **Description:** Auto-generate and submit required regulatory reports (monthly returns to EPRA, quarterly VAT returns to KRA, annual DPR returns). Schedule submissions and track acknowledgment receipts.
- **Key Data Points:**
  - `report_submission_id`, `report_type`, `regulatory_body`
  - `reporting_period`, `submission_date`, `acknowledgment_reference`
  - `submission_status` (draft/submitted/acknowledged/rejected)
  - `data_payload` (JSON: report content), `attachment_urls`

---

## 8. MOBILE-SPECIFIC FEATURES

### 8.1 Offline-First Architecture
- **Priority:** Must-Have
- **Description:** Full offline capability for core operations (sales recording, shift management, basic inventory). Data syncs automatically when connectivity is restored. Critical for African markets with unreliable internet.
- **Key Data Points:**
  - `local_db_version`, `last_sync_timestamp`
  - `pending_uploads_count`, `pending_downloads_count`
  - `sync_conflict_resolution_strategy` (server_wins/local_wins/manual)
  - `offline_transactions` (local queue)
  - `data_size_mb`, `max_offline_days` (configurable)

### 8.2 Progressive Web App (PWA)
- **Priority:** Must-Have
- **Description:** Installable PWA that works on any device. Low storage footprint (~5MB vs 50MB+ native app). Works on Android Go devices. Installable from browser without app store.
- **Key Data Points:**
  - `service_worker_version`, `cache_manifest_version`
  - `install_prompt_shown`, `is_installed`
  - `app_shell_cached`, `static_assets_cached`
  - `manifest_theme_color`, `manifest_display` (standalone)

### 8.3 Push Notifications
- **Priority:** Must-Have
- **Description:** Real-time push notifications for critical events: low stock alerts, price changes, payment confirmations, shift reminders, compliance deadlines.
- **Key Data Points:**
  - `notification_id`, `user_id`, `device_token`
  - `notification_type`, `priority` (critical/high/normal/low)
  - `title`, `body`, `data_payload` (JSON)
  - `delivered`, `read`, `action_taken`
  - `scheduled_at`, `delivered_at`, `read_at`

### 8.4 Low-Bandwidth Optimization
- **Priority:** Must-Have
- **Description:** Optimize all data transfers for 2G/3G networks common in rural Africa. Image compression, delta sync (only changed data), pagination, and minimal payload sizes.
- **Key Data Points:**
  - `average_payload_size_kb`, `compression_ratio`
  - `delta_sync_enabled` (boolean), `batch_size`
  - `image_quality_percentage`, `max_image_size_kb`
  - `connection_type` (2g/3g/4g/wifi/offline)

### 8.5 Multi-Language Support (i18n)
- **Priority:** Must-Have
- **Description:** Support for English, Swahili, French, Yoruba, Hausa, Igbo, and Amharic. Auto-detect based on device locale. Right-to-left support for future Arabic markets.
- **Key Data Points:**
  - `locale_code`, `language_name`
  - `date_format`, `number_format`, `currency_format`
  - `translation_coverage_percentage`
  - `fallback_locale` (default: en)

### 8.6 Biometric Authentication
- **Priority:** Should-Have
- **Description:** Fingerprint and face recognition login for attendants and managers. Faster than PIN/password. Uses device-native biometric APIs.
- **Key Data Points:**
  - `biometric_type` (fingerprint/face/iris)
  - `device_biometric_capability`, `enrolled_biometrics_count`
  - `biometric_auth_token`, `token_expiry`
  - `fallback_method` (pin/password)

### 8.7 QR Code Scanner
- **Priority:** Should-Have
- **Description:** In-app QR scanner for scanning customer loyalty cards, fleet cards, delivery notes, and equipment tags. Also generates QR codes for receipts.
- **Key Data Points:**
  - `scan_type` (loyalty_card/fleet_card/delivery_note/equipment_tag/receipt)
  - `scanned_data`, `parsed_result` (JSON)
  - `scan_timestamp`, `scanned_by_user_id`

---

## 9. SECURITY FEATURES

### 9.1 Two-Factor Authentication (2FA)
- **Priority:** Must-Have
- **Description:** Enforce 2FA for all admin and manager accounts. Support SMS OTP, MPESA STK-based verification, and TOTP (Google Authenticator). Mandatory for financial operations.
- **Key Data Points:**
  - `user_id`, `2fa_method` (sms_otp/totp/mpesa_stk)
  - `2fa_enabled`, `2fa_enforced_by_policy`
  - `otp_code_hash`, `otp_expiry`, `otp_attempts`
  - `backup_codes` (JSON array, hashed)
  - `last_verified_timestamp`

### 9.2 Role-Based Access Control (RBAC)
- **Priority:** Must-Have
- **Description:** Granular role-based permissions system. Pre-defined roles (Super Admin, Org Admin, Station Manager, Supervisor, Attendant, Cashier, Viewer) with custom role creation. Permission matrix controls access to every feature.
- **Key Data Points:**
  - `role_id`, `role_name`, `role_level` (platform/org/station)
  - `permissions` (JSON: {resource: action[]} e.g., {"pricing": ["read", "update"], "reports": ["read"]})
  - `is_custom_role`, `created_by`, `applicable_scope`
  - `max_role_assignment_per_user`

### 9.3 Comprehensive Audit Trail
- **Priority:** Must-Have
- **Description:** Every action is logged - data changes, logins, permission changes, price updates, payment operations. Immutable audit log with tamper detection via chained hashing.
- **Key Data Points:**
  - `audit_id`, `timestamp`, `user_id`, `session_id`
  - `action`, `resource_type`, `resource_id`
  - `old_value`, `new_value`
  - `ip_address`, `device_fingerprint`, `geo_location`
  - `tamper_hash` (chained hash for integrity verification)

### 9.4 Data Encryption
- **Priority:** Must-Have
- **Description:** AES-256 encryption at rest, TLS 1.3 in transit. Encrypted local storage for offline data. Key management with automatic rotation.
- **Key Data Points:**
  - `encryption_standard`, `key_rotation_days`
  - `at_rest_encrypted`, `in_transit_encrypted`
  - `local_db_encrypted`, `backup_encrypted`
  - `key_management_service`

### 9.5 Session Management
- **Priority:** Must-Have
- **Description:** Secure session handling with configurable timeout. Automatic logout on inactivity. Concurrent session control. Device management (logout from other devices).
- **Key Data Points:**
  - `session_id`, `user_id`, `device_id`
  - `login_timestamp`, `last_activity_timestamp`
  - `session_timeout_minutes`, `max_concurrent_sessions`
  - `active_sessions_count`, `revoked_sessions`
  - `device_fingerprint`, `trusted_device` (boolean)

### 9.6 Fraud Detection
- **Priority:** Must-Have
- **Description:** ML-powered fraud detection for anomalous transactions. Detect pump manipulation, phantom sales, cash skimming, and duplicate payments.
- **Key Data Points:**
  - `fraud_alert_id`, `alert_type`, `severity`
  - `detected_patterns` (JSON), `confidence_score`
  - `affected_transactions` (JSON array)
  - `investigation_status`, `resolution`
  - `false_positive` (boolean), `model_version`

### 9.7 Payment Security
- **Priority:** Must-Have
- **Description:** PCI DSS compliance for card payments. Tokenization of card data. Secure credential storage for payment APIs. Transaction signing and verification.
- **Key Data Points:**
  - `pci_compliance_level`, `tokenization_enabled`
  - `card_data_tokenized` (boolean, always true)
  - `transaction_signature`, `signature_algorithm`
  - `secure_key_storage` (HSM/vault)
  - `fraud_score_per_transaction`

---

## 10. INTEGRATION FEATURES

### 10.1 Accounting Software Integration
- **Priority:** Must-Have
- **Description:** Sync financial data with popular accounting platforms used in Africa: QuickBooks, Xero, Sage, and Tally. Auto-post daily sales, expenses, and payment records.
- **Key Data Points:**
  - `integration_id`, `platform` (quickbooks/xero/sage/tally)
  - `sync_frequency`, `last_sync_timestamp`
  - `sync_status`, `records_synced`, `errors_count`
  - `mapping_config` (JSON: FuelPro field -> Accounting field)
  - `oauth_tokens` (encrypted), `webhook_config`

### 10.2 WhatsApp Business API Integration
- **Priority:** Must-Have
- **Description:** Send receipts, loyalty updates, and promotions via WhatsApp. Two-way communication for customer support. WhatsApp-based station management alerts for owners via Africa's Talking / Beem / Africala providers.
- **Key Data Points:**
  - `whatsapp_business_id`, `phone_number_id`
  - `template_id`, `template_name`, `template_language`
  - `message_type` (receipt/loyalty/promotion/alert/support)
  - `recipient_phone`, `message_status`, `delivery_timestamp`
  - `interactive_buttons` (JSON), `media_url`

### 10.3 SMS Integration (Africa's Talking / Beem / Africala)
- **Priority:** Must-Have
- **Description:** Bulk SMS for receipts, alerts, and marketing. USSD integration for feature phone users. OTP delivery via SMS. Critical for reaching non-smartphone users.
- **Key Data Points:**
  - `sms_provider`, `sender_id`, `message_id`
  - `recipient_phone`, `message_content`, `message_type`
  - `delivery_status`, `cost_per_sms`, `delivery_timestamp`
  - `bulk_batch_id`, `total_sent`, `total_delivered`

### 10.4 Fuel Dispenser / ATG Integration
- **Priority:** Must-Have
- **Description:** Direct integration with fuel dispensers and Automatic Tank Gauges via serial/ethernet protocols. Supports: Gilbarco, Wayne, Tatsuno, Piusi, OPW, Veeder-Root, Franklin.
- **Key Data Points:**
  - `device_id`, `device_type` (dispenser/atg/pos)
  - `manufacturer`, `model`, `protocol` (IFSF/PID/ATG_SERIAL/OPW_TLS)
  - `connection_type` (serial/rs485/ethernet/tcp)
  - `connection_params` (JSON: port/baud_rate/ip/etc.)
  - `last_poll_timestamp`, `poll_interval_seconds`
  - `device_status`, `firmware_version`

### 10.5 Fleet Management System Integration
- **Priority:** Should-Have
- **Description:** Integrate with fleet management platforms (Cartrack, MiX Telematics, Tracker) for automated fuel authorization and mileage tracking.
- **Key Data Points:**
  - `fleet_provider`, `integration_type` (api/webhook/file)
  - `vehicle_database` (JSON array), `driver_database` (JSON array)
  - `authorization_protocol`, `real_time_enabled`
  - `transaction_matching_rule`

### 10.6 Banking & ERP Integration
- **Priority:** Should-Have
- **Description:** Direct bank integration for reconciliation (Safaricom, Equity Bank, KCB, GTBank, Access Bank). SAP/Oracle ERP integration for large oil companies.
- **Key Data Points:**
  - `bank_name`, `account_number`, `integration_type`
  - `statement_import_frequency`, `auto_reconciliation_enabled`
  - `erp_system`, `erp_module`, `sync_config`

### 10.7 Maps & Location Services
- **Priority:** Should-Have
- **Description:** Google Maps / OpenStreetMap integration for station locator, delivery tracking, and geo-fenced attendance verification.
- **Key Data Points:**
  - `map_provider`, `api_key_configured`
  - `station_geofence_radius_meters`
  - `geofence_events` (enter/exit), `delivery_tracking_enabled`

### 10.8 IoT & Sensor Integration
- **Priority:** Nice-to-Have
- **Description:** Support for IoT sensors - tank level sensors, environmental sensors (temperature, humidity), security cameras, and smart meters.
- **Key Data Points:**
  - `sensor_id`, `sensor_type`, `location`
  - `reading_value`, `reading_unit`, `reading_timestamp`
  - `alert_threshold`, `alert_triggered`
  - `battery_level`, `firmware_version`

---

## PRIORITY MATRIX SUMMARY

### Must-Have (MVP - Phase 1) — 48 Features
| # | Feature | Category |
|---|---------|----------|
| 1.1 | Real-Time Fuel Inventory Tracking | Core |
| 1.2 | Wet Stock Management | Core |
| 1.4 | Pump-Level Monitoring & Control | Core |
| 1.5 | Sales Recording & Transaction Management | Core |
| 1.6 | Dynamic Pricing Engine | Core |
| 1.7 | Delivery Management | Core |
| 2.1 | Multi-Tenant Organization Management | Admin |
| 2.2 | Super Admin Dashboard | Admin |
| 2.3 | Organization Management & Provisioning | Admin |
| 2.4 | Revenue & Billing Management | Admin |
| 2.5 | Platform-Wide Analytics | Admin |
| 2.6 | System Configuration Management | Admin |
| 2.7 | User & Role Management (Platform Level) | Admin |
| 2.8 | Audit Trail & Compliance (Platform Level) | Admin |
| 2.12 | Platform Health & Monitoring | Admin |
| 3.1 | MPESA Integration | Payment |
| 3.2 | MPESA STK Push | Payment |
| 3.3 | MPESA C2B | Payment |
| 3.4 | Flutterwave Integration | Payment |
| 3.8 | USSD Payment Support | Payment |
| 3.10 | Automated Payment Reconciliation | Payment |
| 4.1 | Daily/Weekly/Monthly Sales Reports | Analytics |
| 4.2 | Inventory & Stock Reconciliation Reports | Analytics |
| 4.3 | Profitability & Margin Analysis | Analytics |
| 4.4 | Attendant Performance Reports | Analytics |
| 4.5 | EPRA Compliance Reports | Analytics |
| 4.6 | KRA eTIMS Tax Reports | Analytics |
| 5.1 | Staff Registration & Profiles | Team |
| 5.2 | Shift Management | Team |
| 5.3 | Attendance & Clock-In/Out | Team |
| 6.1 | Digital Receipts | Customer |
| 6.2 | Loyalty & Rewards Program | Customer |
| 7.1 | EPRA Price Compliance Engine | Compliance |
| 7.2 | EPRA License & Permit Management | Compliance |
| 7.3 | Fuel Quality Tracking | Compliance |
| 7.4 | KRA eTIMS Integration | Compliance |
| 7.6 | Environmental & Safety Compliance | Compliance |
| 7.7 | Automated Regulatory Reporting | Compliance |
| 8.1 | Offline-First Architecture | Mobile |
| 8.2 | Progressive Web App | Mobile |
| 8.3 | Push Notifications | Mobile |
| 8.4 | Low-Bandwidth Optimization | Mobile |
| 8.5 | Multi-Language Support | Mobile |
| 9.1 | Two-Factor Authentication | Security |
| 9.2 | Role-Based Access Control | Security |
| 9.3 | Comprehensive Audit Trail | Security |
| 9.4 | Data Encryption | Security |
| 9.5 | Session Management | Security |
| 9.6 | Fraud Detection | Security |
| 9.7 | Payment Security | Security |
| 10.1 | Accounting Software Integration | Integration |
| 10.2 | WhatsApp Business API Integration | Integration |
| 10.3 | SMS Integration | Integration |
| 10.4 | Fuel Dispenser / ATG Integration | Integration |

### Should-Have (Phase 2) — 19 Features
| # | Feature | Category |
|---|---------|----------|
| 1.3 | Dry Stock / Shop Inventory Management | Core |
| 2.9 | Support & Ticket Management | Admin |
| 2.10 | Feature Flag & A/B Testing Engine | Admin |
| 2.11 | Data Export & API Management | Admin |
| 3.5 | Paystack Integration | Payment |
| 3.6 | Stripe Integration | Payment |
| 3.7 | Fleet Card Integration | Payment |
| 3.9 | Multi-Currency & Cross-Border | Payment |
| 4.7 | Trend Analysis & Forecasting | Analytics |
| 5.4 | Payroll Integration | Team |
| 5.5 | Performance Metrics & KPIs | Team |
| 6.3 | Customer Mobile App / PWA | Customer |
| 6.4 | Station Locator & Price Checker | Customer |
| 6.6 | Customer Feedback & Ratings | Customer |
| 7.5 | DPR/NMDPRA Compliance (Nigeria) | Compliance |
| 8.6 | Biometric Authentication | Mobile |
| 8.7 | QR Code Scanner | Mobile |
| 10.5 | Fleet Management System Integration | Integration |
| 10.6 | Banking & ERP Integration | Integration |
| 10.7 | Maps & Location Services | Integration |

### Nice-to-Have (Phase 3) — 4 Features
| # | Feature | Category |
|---|---------|----------|
| 4.8 | Custom Report Builder | Analytics |
| 5.6 | Training & Certification Tracker | Team |
| 6.5 | Pre-Order Fuel | Customer |
| 10.8 | IoT & Sensor Integration | Integration |

---

## AFRICAN MARKET-SPECIFIC CONSIDERATIONS

### Kenya-Specific
- EPRA monthly price cap enforcement (Petroleum Act 2019, Section 101(y))
- KRA eTIMS mandatory for all fuel stations (deadline: June 30, 2025)
- MPESA is dominant (>90% digital payment share)
- KES currency, 16% VAT on fuel
- Safaricom Daraja API 2.0/3.0
- Swahili + English bilingual requirement

### Nigeria-Specific
- DPR/NMDPRA licensing and compliance
- Deregulated fuel pricing (market-driven)
- Flutterwave + Paystack dominant payment gateways
- NGN currency, 7.5% VAT
- Multi-lingual: English, Yoruba, Hausa, Igbo

### Cross-Cutting African Requirements
- Offline-first is non-negotiable (intermittent connectivity)
- Low-bandwidth optimization (2G/3G networks)
- Feature phone support via USSD
- Mobile money is primary digital payment method
- WhatsApp is the #1 communication platform
- Multi-currency support essential for cross-border operations
- Informal sector accounting practices need flexible workflows
- Corruption/fraud detection is a high-value feature
- Power outages require data persistence and recovery

---

## ADMIN/FOUNDER BACKEND - DETAILED ARCHITECTURE

The Admin/Founder backend is the **most critical** part of FuelPro as it's the platform control center.

### Platform Hierarchy
```
FuelPro Platform (Super Admin)
  +-- Organization A (e.g., Shell Kenya franchisee)
  |     +-- Region: Nairobi
  |     |     +-- Station: Shell Kenyatta Avenue
  |     |     |     +-- Shift: Morning (6am-2pm)
  |     |     |     |     +-- Attendant: John Mwangi
  |     |     |     |     +-- Attendant: Jane Wanjiku
  |     |     |     +-- Shift: Afternoon (2pm-10pm)
  |     |     +-- Station: Shell Moi Avenue
  |     +-- Region: Mombasa
  |           +-- Station: Shell Digo Road
  +-- Organization B (e.g., TotalEnergies Nigeria)
  |     +-- Region: Lagos
  |     +-- Region: Abuja
  +-- Organization C (e.g., Independent station owner)
        +-- Station: Joe's Filling Station
```

### Admin Dashboard Sections
1. **Command Center** - Real-time overview of all orgs, revenue, alerts
2. **Organization Manager** - CRUD for orgs, subscription management
3. **Station Monitor** - Live view of every station's operations
4. **Financial Hub** - Revenue, billing, payment reconciliation
5. **Compliance Center** - EPRA/KRA/DPR compliance status across all orgs
6. **User Admin** - All platform users, roles, permissions
7. **System Config** - Global settings, feature flags, integrations
8. **Audit Log** - Complete audit trail with search/filter
9. **Support Desk** - Ticket management, customer success
10. **Analytics Studio** - Custom reports, BI dashboards, data export

---

## COMPETITIVE LANDSCAPE (Research-Based)

| Competitor | Market | Key Differentiator | FuelPro Advantage |
|------------|--------|--------------------|-------------------|
| Epump (Fuelmetrics) | Nigeria | Pump automation, real-time tracking | Multi-country, MPESA, EPRA compliance |
| Pesapal Forecourt | Kenya/Uganda/TZ | Integrated payments + monitoring | Deeper analytics, loyalty, eTIMS native |
| Rockeye Smart Station | Africa-wide | Multi-outlet chain management | Better mobile UX, offline-first PWA |
| Orpak ForeSite | Africa | BOS back-office system | Modern tech stack, API-first, affordable |
| Codelab Kenya | Kenya | Cloud-based management | Broader payment integration, pan-African |

---

*Document generated: 2026-03-04*
*Based on research of: Epump.africa, Pesapal Forecourt, Rockeye Smart Station, Safaricom Daraja API, EPRA regulations, KRA eTIMS, Flutterwave, Paystack, and African fuel market analysis*
