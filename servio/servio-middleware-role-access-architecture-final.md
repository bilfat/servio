# SERVIO — MIDDLEWARE & ROLE ACCESS ARCHITECTURE
## Authorization Layer untuk Feature #1–#27

**Status:** 🔒 LOCKED / FINAL  
**Type:** Platform Architecture / Security / Authorization  
**Coverage:** Feature #1–#27  
**Scope:** Role, Permission, Middleware, Resource Access, Organization Context, Multi-Role, Security, Audit

---

# 1. Overview

Servio memiliki 27 feature bisnis yang mencakup:

- Service / Jasa
- Product / Barang
- Payment
- Inventory
- Fulfillment
- Shipping
- Return / Refund
- AI / Recommendation

Karena setiap feature digunakan oleh aktor yang berbeda, Servio membutuhkan authorization architecture yang konsisten.

Authentication hanya menjawab:

> "Siapa user ini?"

Authorization menjawab:

> "User ini boleh melakukan apa terhadap resource tertentu?"

Architecture ini menjadi layer yang menaungi seluruh Feature #1–#27.

---

# 2. Core Principle

Formula authorization final:

```text
AUTHENTICATION
+
ACTIVE ROLE
+
PERMISSION
+
RESOURCE
+
SCOPE
+
RELATION
+
BUSINESS STATE
=
ACCESS DECISION
```

Artinya, role saja tidak cukup.

Contoh:

```text
Worker
+
VIEW
+
Execution
+
ASSIGNED
+
Worker assigned to execution
+
Execution still accessible
=
ALLOW
```

Sedangkan:

```text
Worker
+
VIEW
+
Execution
+
PLATFORM
=
DENY
```

---

# 3. Architecture Position

```text
                    USER REQUEST
                          ↓
                 AUTHENTICATION
                          ↓
                IDENTITY RESOLVER
                          ↓
                 ACTIVE CONTEXT
                          ↓
                  ROLE RESOLUTION
                          ↓
                 ROUTE / MIDDLEWARE
                          ↓
                 PERMISSION CHECK
                          ↓
                  SCOPE CHECK
                          ↓
              RESOURCE RELATION CHECK
                          ↓
               BUSINESS STATE / POLICY
                          ↓
                  ALLOW / DENY
                          ↓
                  DOMAIN SERVICE
                          ↓
                       DATABASE
```

---

# 4. Authentication vs Authorization

## Authentication

Authentication menentukan identitas user.

Contoh:

```text
user_id = usr_123
session_id = sess_456
```

## Authorization

Authorization menentukan akses.

Contoh:

```text
role = WORKER
permission = EXECUTE_SERVICE
resource = SERVICE_EXECUTION
scope = ASSIGNED
```

Authentication tanpa authorization tidak cukup untuk mengamankan resource.

---

# 5. Core / Canonical Roles

Servio memiliki 4 canonical roles:

```text
1. CUSTOMER
2. SERVICE_PROVIDER
3. ADMIN_OPERATIONS
4. CEO_PRODUCT_OWNER
```

Role ini menjadi role utama dalam business architecture Servio.

---

# 6. Additional / Operational Roles

Role tambahan yang dibutuhkan:

```text
5. WORKER_TECHNICIAN
6. CUSTOMER_SUPPORT
7. FINANCE_PAYMENT_OPS
8. MERCHANT
9. SUPPLIER
```

Namun tidak semuanya berada dalam level governance yang sama.

---

# 7. Role Hierarchy

## Platform Core

```text
CUSTOMER
SERVICE_PROVIDER
ADMIN_OPERATIONS
CEO_PRODUCT_OWNER
```

## Operational Sub-Roles

```text
ADMIN_OPERATIONS
├── CUSTOMER_SUPPORT
└── FINANCE_PAYMENT_OPS
```

## Commerce / Supply Roles

```text
MERCHANT
SUPPLIER
```

## Provider Operational Actor

```text
SERVICE_PROVIDER
└── WORKER_TECHNICIAN
```

Worker adalah actor operasional yang menjalankan pekerjaan yang ditugaskan provider.

---

# 8. Why Support and Finance are Sub-Roles

Customer Support dan Finance / Payment Operations berada di bawah operational administration karena:

- keduanya menjalankan operasi platform,
- keduanya memiliki permission khusus,
- keduanya memiliki scope berbeda,
- keduanya membutuhkan dashboard dan workflow berbeda,
- keduanya tidak menjadi governance role.

Sehingga:

```text
ADMIN_OPERATIONS
├── SUPPORT
└── FINANCE
```

lebih konsisten dibanding menjadikannya role governance baru.

---

# 9. Worker / Technician Definition

Worker / Technician adalah person yang menjalankan pekerjaan jasa.

Contoh:

```text
Service Provider
        ↓
Assign Technician
        ↓
Worker
        ↓
Service Execution
```

Worker bukan otomatis owner dari provider organization.

---

# 10. Worker Access Principle

Prinsip utama worker:

> **ASSIGNED WORK ONLY**

Worker hanya mengakses resource yang:

- ditugaskan,
- relevan dengan assignment,
- diperlukan untuk execution.

Contoh:

```text
Execution #EX-001
assigned_worker = Worker A
```

Maka:

```text
Worker A → ALLOW
Worker B → DENY
```

---

# 11. Worker Access

Worker dapat memiliki akses ke:

```text
#7  Service Execution
    VIEW / EXECUTE

#8  Tracking Detail
    VIEW / UPDATE terkait assignment

#9  Proof of Service
    CREATE / SUBMIT

#10 Completion
    VIEW / SUBMIT execution input

#14 Service History
    VIEW relevant history

#15 Asset
    VIEW relevant asset context

#18 Smart Recommendation / AI
    INPUT / RECEIVE ASSISTANCE

#19 Service + Product
    VIEW / USE authorized product context

#26 Shipping
    VIEW assigned service-related shipment
```

---

# 12. Worker Restrictions

Worker tidak boleh secara default:

```text
❌ Change platform pricing
❌ Execute refund
❌ Manage financial transactions
❌ Change platform fee
❌ Manage all provider workers
❌ Approve dispute
❌ Change product taxonomy
❌ Change service taxonomy
❌ Access unrelated customer data
❌ Access unrelated execution
❌ Configure platform policy
```

---

# 13. Worker + Provider Relationship

Contoh:

```text
Provider A
├── Worker A
├── Worker B
└── Worker C
```

Worker memiliki membership / relationship terhadap provider organization.

Jika worker berpindah provider:

```text
Old Provider Membership
        ↓
Access Revoked

New Provider Membership
        ↓
New Access
```

Historical execution tetap tersimpan.

---

# 14. Customer Support Definition

Customer Support menangani:

- customer inquiry,
- communication support,
- booking issue,
- order issue,
- complaint support,
- dispute assistance,
- return assistance,
- warranty assistance,
- operational escalation.

Support tidak mengambil alih finance atau governance.

---

# 15. Customer Support Scope

Scope utama:

```text
ASSIGNED
RELATED
SUPPORT_CASE
```

Contoh:

```text
Customer
↓
Complaint
↓
Support Agent Assigned
↓
Support Agent accesses related resources
```

Support tidak otomatis dapat melihat seluruh data customer.

---

# 16. Customer Support Access

Support dapat memiliki akses:

```text
#2  Booking
    VIEW related

#3  Order
    VIEW related

#4  Pricing
    VIEW

#5  Communication
    MANAGE support communication

#6  Payment
    LIMITED VIEW

#10 Completion
    VIEW related

#11 Rating
    VIEW related

#12 Complaint / Dispute
    MANAGE assigned cases

#13 Warranty
    ASSIST related claims

#14 Service History
    LIMITED VIEW

#15 Asset
    LIMITED RELATED VIEW

#18 AI
    USE support assistant

#22 Order Barang
    VIEW / SUPPORT context

#23 Payment Barang
    LIMITED VIEW

#26 Shipping
    VIEW / INVESTIGATE related

#27 Return / Refund
    VIEW / ASSIST related
```

---

# 17. Customer Support Restrictions

Support tidak otomatis boleh:

```text
❌ Execute refund
❌ Change payment transaction
❌ Change inventory quantity
❌ Change platform pricing
❌ Change service policy
❌ Change category taxonomy
❌ Change AI model
❌ Approve CEO policy
```

Untuk financial action:

```text
Support
↓
Escalation
↓
Finance / Payment Ops
```

---

# 18. Finance / Payment Operations Definition

Finance fokus pada money movement dan financial operations.

Primary domains:

```text
Payment
Refund
Payout
Reconciliation
Transaction
Financial Audit
```

---

# 19. Finance Access

Finance dapat memiliki akses:

```text
#6  Payment & Protection
    MANAGE / OPERATE

#22 Order Barang
    VIEW financial context

#23 Payment Barang
    MANAGE payment operations

#27 Return / Refund
    MANAGE refund operations

Payout
    MANAGE

Reconciliation
    MANAGE

Financial Reports
    VIEW / ANALYZE
```

---

# 20. Finance Restrictions

Finance tidak otomatis boleh:

```text
❌ Edit service execution
❌ Assign worker
❌ Change service scope
❌ Moderate rating
❌ Change product specification
❌ Change service taxonomy
❌ Execute unrelated inventory changes
❌ Change AI model
❌ Configure CEO policy
```

Finance hanya menjalankan fungsi finansial yang telah diberi permission.

---

# 21. Merchant Definition

Merchant adalah pihak yang menjual product kepada customer.

Merchant dapat mempunyai:

```text
Merchant Organization
        ↓
Merchant Account
        ↓
Staff / Operators
```

---

# 22. Merchant Access

Merchant dapat memiliki akses:

```text
#20 Product Discovery / Product Catalog
    CREATE / UPDATE own products

#22 Order Barang
    VIEW / MANAGE own seller orders

#23 Payment Barang
    VIEW settlement / financial context

#24 Inventory
    MANAGE own inventory

#25 Fulfillment
    MANAGE own fulfillment

#26 Shipping
    MANAGE own shipment

#27 Return / Refund
    MANAGE own returns

#19 Service + Product
    VIEW / MANAGE related product context
```

---

# 23. Merchant Scope

Default scope:

```text
OWN
ORGANIZATION
```

Contoh:

```text
Merchant A
→ Merchant A Inventory = ALLOW

Merchant B Inventory
→ DENY
```

URL parameter atau resource ID tidak boleh digunakan untuk melewati organization boundary.

---

# 24. Supplier Definition

Supplier adalah pihak yang menyuplai product / material kepada merchant, provider, atau platform.

Supplier lebih supply-chain oriented.

Primary domains:

```text
#20 Product
#24 Inventory
#25 Fulfillment
#26 Shipping
#27 Return
```

---

# 25. Supplier Restrictions

Supplier tidak otomatis dapat melihat:

```text
❌ Customer Profile
❌ Customer Payment
❌ Customer Asset
❌ Customer Service History
❌ Unrelated Customer Orders
```

Akses hanya diberikan jika relationship dan business process memang membutuhkan.

---

# 26. CEO / Product Owner

CEO / Product Owner berfokus pada:

```text
GOVERNANCE
CONFIGURATION
ANALYTICS
POLICY
```

Bukan operational execution harian.

Contoh:

```text
Category Governance
Platform Fee
Product Policy
Shipping Policy
Return Policy
Analytics
```

---

# 27. Admin / Operations

Admin / Operations menjalankan:

```text
VIEW PLATFORM
MANAGE OPERATIONS
INVESTIGATE
MODERATE
CONTROLLED OVERRIDE
```

Admin bukan berarti unlimited.

---

# 28. Admin ≠ Unlimited

Jangan menggunakan:

```text
if role === ADMIN:
    allow_everything
```

Sebaliknya:

```text
ADMIN
+
PERMISSION
+
RESOURCE
+
SCOPE
=
ACCESS
```

Bahkan Admin harus tetap dibatasi dan diaudit.

---

# 29. Active Role Context

Satu user dapat mempunyai lebih dari satu role.

Contoh:

```text
User
├── CUSTOMER
└── SERVICE_PROVIDER
```

Saat berada pada customer dashboard:

```text
ACTIVE_CONTEXT = CUSTOMER
```

Saat switch:

```text
ACTIVE_CONTEXT = SERVICE_PROVIDER
```

---

# 30. Why Active Context is Necessary

Tanpa active context, user multi-role berpotensi:

- salah melihat dashboard,
- salah menggunakan permission,
- salah mengakses organization,
- salah menjalankan action.

Active context membuat authorization lebih eksplisit.

---

# 31. Multi-Role Account

Contoh:

```text
User
├── Customer
└── Provider
```

atau:

```text
User
├── Provider
└── Worker
```

atau:

```text
User
├── Merchant
└── Customer
```

Setiap membership tetap harus tervalidasi.

---

# 32. Role Switching Flow

```text
Login
↓
Load Role Memberships
↓
Select Active Role
↓
Resolve Organization Context
↓
Issue / Refresh Active Context
↓
Dashboard
```

Switch role tidak harus login ulang.

---

# 33. Organization Context

Role bisnis dapat terkait organization.

Contoh:

```text
user_id
+
SERVICE_PROVIDER
+
provider_org_A
```

berbeda dengan:

```text
user_id
+
MERCHANT
+
merchant_org_B
```

Organization context wajib divalidasi.

---

# 34. Active Context Structure

Conceptual:

```text
active_context = {
    user_id,
    role,
    organization_id,
    session_id,
    permissions_version
}
```

Permission detail tidak harus seluruhnya dimasukkan ke token.

Backend dapat melakukan permission resolution.

---

# 35. Middleware Layer 1 — Authentication

Tugas:

```text
Is user authenticated?
```

Jika tidak:

```text
401 Unauthorized
```

atau redirect ke login pada route UI yang sesuai.

---

# 36. Middleware Layer 2 — Identity Resolver

Resolve:

```text
user_id
session_id
account status
```

Contoh:

```text
user_id = usr_123
session = sess_456
```

---

# 37. Middleware Layer 3 — Active Context Resolver

Resolve:

```text
active_role
organization_id
membership
permissions_version
```

Backend harus memverifikasi bahwa context memang dimiliki user.

---

# 38. Middleware Layer 4 — Route Guard

Route dapat mempunyai required role/context.

Contoh:

```text
/dashboard/customer
→ CUSTOMER

/dashboard/provider
→ SERVICE_PROVIDER

/dashboard/worker
→ WORKER_TECHNICIAN

/dashboard/support
→ CUSTOMER_SUPPORT

/dashboard/finance
→ FINANCE_PAYMENT_OPS

/dashboard/merchant
→ MERCHANT

/dashboard/supplier
→ SUPPLIER

/dashboard/admin
→ ADMIN_OPERATIONS

/dashboard/ceo
→ CEO_PRODUCT_OWNER
```

---

# 39. Route Guard vs API Guard

Keduanya wajib.

```text
Frontend Route Middleware
→ UX / route protection

Backend API Authorization
→ actual security
```

Frontend route guard tidak boleh dianggap sebagai security boundary.

---

# 40. Middleware Layer 5 — Permission Check

Role saja tidak cukup.

Contoh:

```text
Worker
```

boleh:

```text
EXECUTE_SERVICE
```

tetapi tidak:

```text
REFUND_PAYMENT
```

Permission harus diverifikasi pada request yang relevan.

---

# 41. Middleware Layer 6 — Scope Check

Scope:

```text
OWN
ASSIGNED
RELATED
ORGANIZATION
PLATFORM
AGGREGATE
```

Contoh:

```text
Worker
+
VIEW_EXECUTION
+
ASSIGNED
```

berarti hanya execution yang assigned kepada worker.

---

# 42. Resource Relation Check

Resource harus memiliki hubungan yang valid dengan actor.

Contoh:

```text
GET /executions/999
```

Backend harus memeriksa:

```text
execution.worker_id == current_worker
```

bukan hanya:

```text
role == WORKER
```

---

# 43. Organization Relation Check

Merchant:

```text
GET /orders/ORD-001
```

harus memastikan:

```text
order.seller_organization_id
==
current_merchant.organization_id
```

Jika tidak:

```text
403 Forbidden
```

---

# 44. Business State Check

Authorization tidak hanya masalah role.

Action juga dapat bergantung pada state.

Contoh:

```text
Customer
+
REQUEST_RETURN
+
Order
```

Tetapi:

```text
Return Window Expired
```

maka action dapat ditolak berdasarkan domain policy.

---

# 45. Middleware Tidak Menangani Semua Business Logic

Middleware sebaiknya tidak melakukan seluruh business rule.

Jangan:

```text
Middleware
→ check inspection
→ calculate refund
→ validate inventory
→ resolve warranty
→ decide dispute
```

Lebih baik:

```text
Middleware
→ coarse access

Authorization Policy
→ resource access

Domain Service
→ business rules
```

---

# 46. Final Authorization Layers

```text
REQUEST
  ↓
Authentication
  ↓
Identity
  ↓
Active Context
  ↓
Route Guard
  ↓
Permission
  ↓
Scope
  ↓
Relation
  ↓
Business Policy / State
  ↓
Domain Service
  ↓
Database
```

---

# 47. Permission Naming

Pattern yang disarankan:

```text
ACTION_RESOURCE
```

Contoh:

```text
VIEW_ORDER
CREATE_ORDER
UPDATE_ORDER
CANCEL_ORDER

VIEW_PAYMENT
MANAGE_PAYMENT
REFUND_PAYMENT

VIEW_EXECUTION
EXECUTE_SERVICE

CREATE_PROOF
SUBMIT_PROOF

VIEW_RETURN
APPROVE_RETURN
INSPECT_RETURN

VIEW_SHIPMENT
MANAGE_SHIPMENT
```

---

# 48. Permission Actions

Action utama:

```text
VIEW
CREATE
UPDATE
SUBMIT
APPROVE
REJECT
EXECUTE
CANCEL
MANAGE
CONFIGURE
ANALYZE
```

Tidak semua resource membutuhkan semua action.

---

# 49. Example Worker Permissions

```text
VIEW_EXECUTION
EXECUTE_SERVICE
CREATE_EXECUTION_PROOF
SUBMIT_EXECUTION
VIEW_ASSIGNED_ASSET
VIEW_SERVICE_RELATED_PRODUCT
VIEW_ASSIGNED_SHIPMENT
```

---

# 50. Example Customer Support Permissions

```text
VIEW_SUPPORT_CASE
MANAGE_SUPPORT_CASE
VIEW_RELATED_ORDER
VIEW_RELATED_PAYMENT
VIEW_RETURN_CASE
VIEW_WARRANTY_CASE
CREATE_SUPPORT_MESSAGE
ESCALATE_CASE
```

---

# 51. Example Finance Permissions

```text
VIEW_PAYMENT
MANAGE_PAYMENT
RECONCILE_PAYMENT
VIEW_PAYOUT
MANAGE_PAYOUT
VIEW_REFUND
EXECUTE_REFUND
VIEW_FINANCIAL_REPORT
```

---

# 52. Example Merchant Permissions

```text
MANAGE_PRODUCT
VIEW_SELLER_ORDER
MANAGE_SELLER_ORDER
MANAGE_INVENTORY
MANAGE_FULFILLMENT
MANAGE_SHIPMENT
VIEW_SETTLEMENT
MANAGE_RETURN
```

---

# 53. Example Supplier Permissions

```text
MANAGE_SUPPLY_PRODUCT
VIEW_SUPPLY_ORDER
MANAGE_SUPPLY_INVENTORY
MANAGE_SUPPLY_FULFILLMENT
MANAGE_SUPPLY_SHIPMENT
MANAGE_SUPPLY_RETURN
```

---

# 54. Role × Scope

| Role | Primary Scope |
|---|---|
| Customer | OWN |
| Service Provider | ORGANIZATION + ASSIGNED |
| Worker | ASSIGNED |
| Customer Support | ASSIGNED + RELATED |
| Finance | PLATFORM financial resources |
| Merchant | OWN + ORGANIZATION |
| Supplier | OWN + ORGANIZATION / SUPPLY |
| Admin / Operations | PLATFORM, controlled |
| CEO / Product Owner | AGGREGATE / PLATFORM governance |

---

# 55. Worker Feature Matrix

| Feature | Worker |
|---|---|
| #1 Discovery | Limited |
| #2 Booking | View related |
| #3 Order Jasa | View related |
| #4 Pricing | View relevant |
| #5 Communication | Create / Update related |
| #6 Payment | ❌ |
| #7 Execution | Execute |
| #8 Tracking | View / Update assignment |
| #9 Proof | Create / Submit |
| #10 Completion | View / Submit related |
| #11 Rating | ❌ |
| #12 Dispute | Limited / requested |
| #13 Warranty | View relevant |
| #14 History | View relevant |
| #15 Asset | View relevant |
| #16 Maintenance | Execute relevant |
| #17 Loyalty | ❌ |
| #18 AI | Input / Assist |
| #19 Service + Product | Use relevant |
| #20 Product | Limited |
| #21 Cart | ❌ / special procurement |
| #22 Product Order | View related |
| #23 Payment | ❌ |
| #24 Inventory | Consume / related |
| #25 Fulfillment | Execute related |
| #26 Shipping | View / execute related |
| #27 Return | View related |

---

# 56. Customer Support Feature Matrix

| Feature | Customer Support |
|---|---|
| #1 Discovery | View |
| #2 Booking | View related |
| #3 Order Jasa | View related |
| #4 Pricing | View |
| #5 Communication | Manage |
| #6 Payment | Limited |
| #7 Execution | View related |
| #8 Tracking | View related |
| #9 Proof | View related |
| #10 Completion | View / support |
| #11 Rating | View related |
| #12 Dispute | Manage assigned |
| #13 Warranty | Assist |
| #14 History | Limited related |
| #15 Asset | Limited related |
| #16 Maintenance | View related |
| #17 Loyalty | View support context |
| #18 AI | Support assistant |
| #19 Service + Product | View related |
| #20 Product | View |
| #21 Cart | Limited support view |
| #22 Order Barang | Manage support context |
| #23 Payment Barang | Limited |
| #24 Inventory | ❌ |
| #25 Fulfillment | View related |
| #26 Shipping | View / investigate |
| #27 Return | Manage support context |

---

# 57. Finance Feature Matrix

| Feature | Finance |
|---|---|
| #1 Discovery | ❌ |
| #2 Booking | Financial context |
| #3 Order Jasa | Financial view |
| #4 Pricing | Financial view |
| #5 Communication | Limited |
| #6 Payment | Manage |
| #7 Execution | ❌ |
| #8 Tracking | ❌ |
| #9 Proof | ❌ |
| #10 Completion | Financial trigger view |
| #11 Rating | ❌ |
| #12 Dispute | Financial aspect |
| #13 Warranty | Financial context |
| #14 History | Limited |
| #15 Asset | ❌ |
| #16 Maintenance | ❌ |
| #17 Loyalty | Financial reward context |
| #18 AI | Analytics |
| #19 Product Integration | Cost context |
| #20 Product | ❌ |
| #21 Cart | ❌ |
| #22 Order Barang | Financial view |
| #23 Payment Barang | Full operational |
| #24 Inventory | Financial report context |
| #25 Fulfillment | Cost context |
| #26 Shipping | Shipping cost context |
| #27 Return | Refund operation |

---

# 58. Merchant Feature Matrix

| Feature | Merchant |
|---|---|
| #1 Discovery | Product / relevant discovery |
| #2 Booking | Limited service-related |
| #3 Order Jasa | Related only |
| #4 Pricing | Own pricing |
| #5 Communication | Own transaction |
| #6 Payment | Settlement view |
| #7 Execution | Related only |
| #8 Tracking | Own shipment |
| #9 Proof | Related |
| #10 Completion | Related |
| #11 Rating | Own review |
| #12 Dispute | Own cases |
| #13 Warranty | Own product context |
| #14 History | Related |
| #15 Asset | ❌ / related |
| #16 Maintenance | ❌ / related |
| #17 Loyalty | Campaign context |
| #18 AI | Seller assistance |
| #19 Service + Product | Related |
| #20 Product | Manage own |
| #21 Cart | Procurement context |
| #22 Order Barang | Own seller orders |
| #23 Payment Barang | Settlement |
| #24 Inventory | Manage own |
| #25 Fulfillment | Manage own |
| #26 Shipping | Manage own |
| #27 Return | Manage own |

---

# 59. Frontend Access

Frontend dapat menggunakan authorization state untuk:

- route navigation,
- dashboard selection,
- action visibility,
- disabled state,
- UI projection.

Tetapi frontend tidak menjadi security authority.

---

# 60. Backend API Authorization

Backend API wajib melakukan:

```text
Authenticate
↓
Resolve Context
↓
Authorize
↓
Validate Resource
↓
Validate State
↓
Execute
```

Contoh:

```text
POST /api/refunds
```

harus memiliki permission:

```text
EXECUTE_REFUND
```

dan relation/policy yang sesuai.

---

# 61. IDOR Protection

Servio harus mencegah kasus:

```text
/api/orders/123
```

diubah menjadi:

```text
/api/orders/124
```

lalu user mendapatkan order user lain.

Backend harus memeriksa:

```text
resource
+
ownership / relationship
+
scope
```

sebelum mengembalikan data.

---

# 62. Organization Isolation

Untuk organization role:

```text
Provider A
Merchant A
Supplier A
```

tidak boleh membaca resource:

```text
Provider B
Merchant B
Supplier B
```

tanpa explicit authorized relationship.

---

# 63. Field-Level Authorization

Tidak semua role boleh melihat semua field dari resource yang sama.

Contoh Payment:

```text
Customer
→ Own payment information

Customer Support
→ Limited payment status

Finance
→ Financial details

Worker
→ No payment details
```

---

# 64. Data Projection

Resource sebaiknya disajikan dalam role-aware projection.

Contoh:

```text
Customer Order View
Provider Order View
Worker Order View
Finance Order View
Support Order View
Admin Order View
CEO Aggregate View
```

Projection mencegah data internal yang tidak relevan ikut dikembalikan.

---

# 65. Multi-Tenant / Organization Boundary

Organization-aware resource harus membawa relation seperti:

```text
organization_id
provider_id
merchant_id
supplier_id
```

Authorization harus memvalidasi relation tersebut.

---

# 66. Session Security

Session harus dapat dibatalkan ketika:

- user logout all devices,
- role revoked,
- organization membership removed,
- account compromised,
- security incident.

---

# 67. Permission Version

Permission dapat mempunyai version.

Concept:

```text
permissions_version = 17
```

Saat policy berubah:

```text
permissions_version = 18
```

Session/context dapat diwajibkan refresh.

---

# 68. Role Change Audit

Perubahan role harus diaudit.

Contoh:

```text
Actor
↓
Grant / Revoke Role
↓
Target User
↓
Organization
↓
Reason
↓
Timestamp
```

---

# 69. Critical Action Audit

Action kritis:

```text
Refund
Payment Adjustment
Role Change
Policy Override
Return Approval
Dispute Resolution
Manual Shipping Override
Inventory Adjustment
```

harus memiliki audit trail.

---

# 70. Audit Fields

Minimal:

```text
actor_id
actor_role
organization_id
action
resource_type
resource_id
timestamp
result
reason
session_context
```

---

# 71. Emergency Access

Emergency access dapat digunakan oleh role yang diberi permission khusus.

Harus:

```text
Explicit Permission
+
Reason
+
Minimal Scope
+
Audit
+
Expiry
```

Tidak boleh menjadi unlimited permanent access.

---

# 72. Deny by Default

Rule:

```text
Permission Undefined
=
DENY
```

Bukan:

```text
Permission Undefined
=
ALLOW
```

---

# 73. Least Privilege

Setiap role hanya memperoleh permission minimum yang dibutuhkan.

Contoh:

```text
Worker
→ Execution

Support
→ Support Case

Finance
→ Payment

Merchant
→ Own Commerce

CEO
→ Governance / Analytics
```

---

# 74. No Self Role Escalation

User tidak boleh mengubah role dirinya sendiri.

Contoh berbahaya:

```text
PATCH /api/me
{
    "role": "ADMIN"
}
```

harus:

```text
DENY
```

Role management harus dilakukan melalui authorized governance workflow.

---

# 75. System / Automation Actor

Servio juga membutuhkan non-human actor:

```text
SYSTEM / AUTOMATION
```

Tetapi ini bukan selectable user role.

Digunakan untuk:

- auto completion,
- reminders,
- payment reconciliation,
- shipment synchronization,
- loyalty expiry,
- maintenance schedule,
- notifications,
- AI pipeline.

Contoh audit:

```text
actor = SYSTEM
action = AUTO_COMPLETE_ORDER
```

---

# 76. AI Authorization

AI Agent dari #18 tidak mendapatkan superuser.

AI bertindak dalam user context.

```text
Customer
    ↓
AI Agent
    ↓
Tool
    ↓
Same Authorization
```

Contoh:

```text
Customer
↓
Ask AI to book service
↓
AI checks permission
↓
AI asks confirmation
↓
Backend authorization
↓
Booking
```

---

# 77. AI Tool Authorization

Setiap AI tool harus memiliki authorization.

Contoh tools:

```text
tool.view_order
tool.view_tracking
tool.create_booking
tool.create_return
tool.request_refund
```

AI hanya dapat menggunakan tool yang diizinkan dalam active context.

---

# 78. Financial AI Action

Action berdampak finansial:

```text
Purchase
Refund
Booking Fee
Payment
Cancellation
```

mengikuti:

```text
Recommendation
↓
User Confirmation
↓
Authorization
↓
Transaction
```

AI tidak boleh melakukan silent transaction.

---

# 79. Cross-Role Data View

Resource yang sama dapat memiliki projection berbeda.

Contoh Order:

### Customer

```text
Price
Provider
Status
Delivery
```

### Worker

```text
Service
Address
Task
```

### Finance

```text
Payment
Fee
Payout
```

### Support

```text
Customer issue
Communication
```

### CEO

```text
Aggregate KPI
```

---

# 80. Authorization and Domain Service

Contoh return:

```text
Request
↓
Middleware
    → authenticated
    → active role
    → permission
↓
Resource Authorization
    → customer owns return
↓
Domain Service
    → eligibility
    → policy
    → state
↓
Payment
    → refund execution
```

---

# 81. Final Layer Responsibility

## Middleware

```text
Authentication
Route Guard
Active Role
Organization Context
Basic Permission
Session Validation
```

## Authorization Service / Policy

```text
Permission
Resource Scope
Ownership
Organization Relation
Assignment
Field Visibility
Business Access Policy
```

## Domain Service

```text
Business Rules
Eligibility
State Transition
Validation
Transaction
Side Effects
```

---

# 82. Role Access Architecture

```text
                         SERVIO USER
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
      CUSTOMER            BUSINESS           OPERATIONS
                              │                   │
                 ┌────────────┼────────────┐      ├── ADMIN
                 │            │            │      ├── SUPPORT
                 ▼            ▼            ▼      └── FINANCE
              PROVIDER     MERCHANT      SUPPLIER
                 │
                 ▼
              WORKER
```

Governance layer:

```text
CEO / PRODUCT OWNER
        ↓
Policy
Configuration
Analytics
Governance
```

---

# 83. Final Middleware Architecture

```text
                     REQUEST
                        │
                        ▼
               ┌────────────────┐
               │ Authentication │
               └───────┬────────┘
                       ▼
               ┌────────────────┐
               │ Identity       │
               └───────┬────────┘
                       ▼
               ┌────────────────┐
               │ Active Context │
               │ Role + Org     │
               └───────┬────────┘
                       ▼
               ┌────────────────┐
               │ Route Guard    │
               └───────┬────────┘
                       ▼
               ┌────────────────┐
               │ Permission     │
               └───────┬────────┘
                       ▼
               ┌────────────────┐
               │ Scope          │
               └───────┬────────┘
                       ▼
               ┌────────────────┐
               │ Relation       │
               └───────┬────────┘
                       ▼
               ┌────────────────┐
               │ Business State │
               └───────┬────────┘
                       ▼
                  ALLOW / DENY
                       │
                       ▼
                DOMAIN SERVICE
                       │
                       ▼
                      DB
```

---

# 84. Final Security Rules

Security rules yang **LOCKED**:

```text
1. Authentication ≠ Authorization
2. Middleware ≠ Complete Security Layer
3. Backend authorization wajib
4. Deny by default
5. Least privilege
6. Role ≠ Permission
7. Role ≠ Scope
8. Active role harus tervalidasi
9. Multi-role account didukung
10. Organization context didukung
11. Resource ownership harus divalidasi
12. Assignment harus divalidasi
13. Business state harus divalidasi
14. Sensitive fields harus dibatasi
15. Frontend hiding ≠ security
16. API harus authorization-aware
17. Critical action harus diaudit
18. Role changes harus diaudit
19. Emergency access harus terkontrol
20. AI tidak memiliki superuser
21. System actor bukan selectable user role
22. Permission tidak boleh self-escalated
23. Cross-organization access harus ditolak
24. Financial action membutuhkan authorization khusus
25. Historical access tetap mengikuti authorization policy
26. Audit trail tidak boleh dihilangkan
27. Critical operations harus idempotent
```

---

# 85. Final Access Formula

```text
USER
 ↓
IDENTITY
 ↓
ACTIVE ROLE
 ↓
PERMISSION
 ↓
RESOURCE
 ↓
SCOPE
 ↓
RELATION
 ↓
BUSINESS STATE
 ↓
POLICY
 ↓
ACCESS DECISION
```

---

# 86. Coverage terhadap Feature #1–#27

Authorization architecture ini menaungi seluruh feature:

```text
#1  Discovery
#2  Booking Jasa
#3  Order Jasa
#4  Pricing & Quotation
#5  Communication
#6  Payment & Protection
#7  Service Execution
#8  Tracking Detail
#9  Proof of Service
#10 Completion & Confirmation
#11 Rating & Review
#12 Complaint / Dispute
#13 Warranty
#14 Service History
#15 Asset
#16 Maintenance & Reminder
#17 Rebooking / Favorite / Loyalty
#18 Smart Recommendation & AI Agent
#19 Service + Product Integration
#20 Product Discovery
#21 Cart
#22 Order / Booking Barang
#23 Payment Barang
#24 Inventory
#25 Fulfillment Barang
#26 Shipping & Tracking
#27 Return / Refund
```

---

# 87. Final Blueprint

Secara keseluruhan:

```text
                    SERVIO
                       │
            ┌──────────┴──────────┐
            │                     │
      BUSINESS DOMAIN        AUTHORIZATION
            │                     │
      Feature #1–#27          Role / Permission
            │                     │
            └──────────┬──────────┘
                       ↓
                 DOMAIN SERVICE
                       ↓
                    DATABASE
```

---

# 88. LOCK Status

# 🔒 MIDDLEWARE & ROLE ACCESS — LOCKED / FINAL

## Canonical Roles

```text
CUSTOMER
SERVICE_PROVIDER
ADMIN_OPERATIONS
CEO_PRODUCT_OWNER
```

## Additional Roles

```text
WORKER_TECHNICIAN
CUSTOMER_SUPPORT
FINANCE_PAYMENT_OPS
MERCHANT
SUPPLIER
```

## Core Authorization Formula

```text
ROLE
+
PERMISSION
+
RESOURCE
+
SCOPE
+
RELATION
+
BUSINESS STATE
=
ACCESS
```

## Security Principle

```text
Middleware
→ Route / Context Protection

Authorization
→ Actual Resource Access

Domain Service
→ Business Rules

Database
→ Persistence
```

## Overall Status

```text
Feature #1–#27          ✅ LOCKED
Role Architecture       ✅ LOCKED
Additional Roles        ✅ LOCKED
Middleware Architecture ✅ LOCKED
Authorization Model     ✅ LOCKED
Security Rules          ✅ LOCKED
```

**END OF SERVIO MIDDLEWARE & ROLE ACCESS ARCHITECTURE**
