# SERVIO
# ROLE & ACCESS ARCHITECTURE — FEATURE #1–#19
## CONSOLIDATED BUSINESS FLOW, RESPONSIBILITY, AUTHORITY & PERMISSION SPECIFICATION

> **Status: CONSOLIDATED / LOCKED BASELINE**
>
> Dokumen ini menggabungkan dimensi **Role, Responsibility, Access, Authority, dan Business Flow** untuk Feature #1–#19 Servio.
>
> Dokumen ini **tidak menggantikan** dokumen final masing-masing feature. Fungsinya adalah menjadi **master role architecture** agar setiap feature mempunyai pembagian tanggung jawab yang konsisten antar aktor.

---

# 1. Tujuan Dokumen

Dokumen ini dibuat untuk memastikan seluruh Feature #1–#19 memiliki jawaban yang jelas:

```text
Siapa yang menggunakan feature?
Siapa yang membuat data?
Siapa yang mengubah data?
Siapa yang menyetujui?
Siapa yang menjalankan pekerjaan?
Siapa yang memonitor?
Siapa yang mengatur policy?
Siapa yang hanya bisa melihat?
```

Output akhirnya menjadi baseline untuk:

- RBAC
- permission matrix
- dashboard per role
- API authorization
- backend policy
- frontend navigation
- notification
- audit trail
- PRD
- database relationship
- admin operation
- governance

---

# 2. Canonical Roles

Baseline Servio yang sudah ditetapkan memiliki empat role utama:

```text
1. CUSTOMER
2. SERVICE PROVIDER
3. ADMIN / OPERATIONS
4. CEO / PRODUCT OWNER
```

Keempat role tersebut merupakan role utama platform.

---

# 3. Operational Actors

Dalam beberapa feature muncul aktor operasional tambahan.

```text
5. WORKER / TECHNICIAN
6. CUSTOMER SUPPORT
7. MERCHANT
8. SUPPLIER
9. FINANCE / PAYMENT OPERATIONS
```

Namun statusnya dibedakan:

```text
CUSTOMER
PROVIDER
ADMIN / OPERATIONS
CEO / PRODUCT OWNER
= Canonical Role

WORKER / TECHNICIAN
CUSTOMER SUPPORT
MERCHANT
SUPPLIER
FINANCE / PAYMENT OPS
= Operational Actor / Candidate Sub-role
```

Artinya actor tersebut **sudah diperlukan oleh alur tertentu**, tetapi belum otomatis dianggap sebagai top-level account role sebelum RBAC final ditetapkan.

---

# 4. Principle Role Architecture

```text
ROLE
↓
PERMISSION
↓
ACTION
↓
AUTHORIZATION
↓
AUDIT
```

Role tidak boleh otomatis berarti memiliki seluruh akses.

Contoh:

```text
Provider
≠
boleh mengubah semua data customer
```

---

# 5. Access Level

Permission Servio menggunakan konsep:

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

---

# 6. VIEW

Membaca data yang memang diizinkan.

Contoh:

```text
Customer:
View own order

Provider:
View assigned order

Admin:
View operational orders

CEO:
View aggregate business data
```

---

# 7. CREATE

Membuat record baru.

Contoh:

```text
Customer:
Create booking

Provider:
Create quotation

Admin:
Create controlled adjustment

CEO:
Create platform policy
```

---

# 8. UPDATE

Mengubah data yang masih editable dan sesuai authority.

Tidak semua record boleh diedit setelah finalized.

---

# 9. SUBMIT

Mengirim sesuatu untuk diproses/disetujui.

Contoh:

```text
Provider
→ Submit quotation

Customer
→ Submit complaint

Provider
→ Submit category request
```

---

# 10. APPROVE

Menyetujui perubahan/transaksi tertentu.

Approval harus dibatasi sesuai authority.

---

# 11. REJECT

Menolak submission/requirement/request tertentu sesuai authority.

---

# 12. EXECUTE

Melakukan aktivitas operasional.

Contoh:

```text
Worker
→ Execute service

Provider
→ Manage execution
```

---

# 13. MANAGE

Memiliki operational control terhadap data/feature dalam scope role.

---

# 14. CONFIGURE

Mengatur policy atau configuration.

Umumnya:

```text
CEO / Product Owner
+
Admin / Operations
```

sesuai domain.

---

# 15. ANALYZE

Melihat analytics/insight.

Akses analytics bergantung pada scope.

---

# 16. Ownership Principle

Data memiliki owner/source of truth.

Contoh:

```text
Customer Data
→ Customer / Platform Identity

Provider Offering
→ Provider

Platform Policy
→ CEO/Product Owner

Operational State
→ Relevant Domain Engine

Historical Record
→ Service History
```

---

# 17. Role Scope Principle

```text
Customer
= own data / own transaction

Provider
= own business / assigned work

Admin
= platform operations / controlled intervention

CEO
= policy / strategic control / aggregate analytics
```

---

# 18. Customer Role

Customer adalah pihak yang mencari, memilih, memesan, menggunakan, membayar, mengonfirmasi, memberikan feedback, dan mengelola asset/service relationship miliknya.

---

# 19. Customer Core Actions

Customer dapat:

- discover service
- describe problem
- select provider
- create booking
- review quotation
- communicate with provider
- pay
- track service
- review proof
- confirm completion
- rate/review
- create complaint
- submit warranty claim
- view service history
- manage asset
- manage maintenance
- rebook
- favorite
- use loyalty
- receive recommendation
- approve product requirement

---

# 20. Customer Ownership

Customer terutama memiliki kontrol atas:

```text
Own Profile
Own Booking
Own Order
Own Payment View
Own Asset
Own History Access
Own Favorite
Own Loyalty
Own Maintenance Preferences
Own Recommendation Preferences
```

---

# 21. Service Provider Role

Provider adalah pihak yang menawarkan jasa dan bertanggung jawab terhadap business/service offering serta pekerjaan yang diterima.

Provider dapat:

- manage provider profile
- define skills
- select taxonomy
- create service offering
- set availability
- define pricing supported
- accept/reject booking
- issue quotation
- communicate
- assign workers
- execute or supervise service
- upload execution/proof data
- submit completion
- respond to complaint
- manage warranty responsibility
- recommend maintenance
- recommend material/product
- see business analytics

---

# 22. Provider Ownership

Provider terutama memiliki:

```text
Provider Profile
Service Offering
Availability
Provider-side Pricing Configuration
Worker Assignment
Provider-side Service Data
Provider Earnings View
```

dengan batasan platform policy.

---

# 23. Admin / Operations Role

Admin/Operations mengelola operasional harian platform.

Dapat:

- verify provider
- manage taxonomy operationally
- monitor orders
- monitor tracking
- handle complaints/disputes
- handle operational exceptions
- manage refunds according to policy
- monitor fraud/abuse
- manage controlled corrections
- monitor warranty cases
- manage maintenance operations
- manage loyalty operations
- manage product-service relation operations
- view operational analytics

---

# 24. CEO / Product Owner Role

CEO/Product Owner memiliki kontrol strategic/product governance.

Dapat:

- define taxonomy
- approve taxonomy changes
- define platform policy
- define platform fee configuration
- define maintenance policy
- define loyalty rules
- define recommendation policy
- define service-product governance
- review aggregate business analytics
- review demand/supply
- review revenue
- review service/category performance

---

# 25. Worker / Technician Actor

Worker/Technician adalah operational actor yang menjalankan pekerjaan.

Worker dapat, sesuai assignment:

- view assigned job
- view relevant customer/service context
- check-in
- start execution
- update task
- upload proof
- record issue
- record material used
- record testing result
- submit service completion context

Worker tidak otomatis mendapatkan akses penuh ke:

```text
Customer account
Payment management
Platform policy
Other customer transactions
Provider financial data
```

---

# 26. Customer Support

Customer Support pada baseline dapat berada di bawah Admin/Operations.

Tanggung jawab:

- assist customer
- assist provider
- handle ticket
- communicate case status
- help dispute/warranty/payment cases
- escalate to operations

---

# 27. Merchant

Merchant muncul terutama pada Product ecosystem dan Service + Product Integration.

Merchant dapat:

- manage product offering
- receive product order
- fulfill product
- provide product data
- handle product issue
- manage applicable product warranty

Detail product role akan diperdalam di #20–#27.

---

# 28. Supplier

Supplier digunakan terutama untuk:

- sourcing material
- provider procurement
- product supply

Supplier tidak otomatis memiliki akses ke customer service history.

---

# 29. Finance / Payment Operations

Finance/Payment Operations dapat menjadi sub-role Admin.

Dapat menangani:

- reconciliation
- payment investigation
- payout issue
- refund operations
- financial exception
- payment audit

Tidak otomatis mengubah business service state.

---

# 30. Role Hierarchy

```text
                    CEO / PRODUCT OWNER
                           │
                           ▼
                    ADMIN / OPERATIONS
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       CUSTOMER SUPPORT  FINANCE   PRODUCT OPS
                           │
                           │
        ┌──────────────────┴─────────────────┐
        ▼                                    ▼
     CUSTOMER                           PROVIDER
                                             │
                                             ▼
                                    WORKER / TECHNICIAN
```

Merchant/Supplier:

```text
PRODUCT ECOSYSTEM
      ↓
MERCHANT / SUPPLIER
```

---

# 31. Canonical Role Matrix Overview

| Role | Primary Purpose |
|---|---|
| Customer | Consume service and manage own transaction/asset relationship |
| Provider | Sell and deliver service |
| Admin/Operations | Run and control operational platform activities |
| CEO/Product Owner | Define product/platform policy and business governance |
| Worker/Technician | Execute assigned work |
| Customer Support | Assist users and resolve operational cases |
| Merchant | Sell/provide product |
| Supplier | Supply products/materials |
| Finance Ops | Handle financial operations/reconciliation |

---

# 32. Feature #1 — Discovery

## Customer

```text
VIEW
CREATE SEARCH
FILTER
SELECT
DESCRIBE PROBLEM
SUBMIT SMART DISCOVERY INPUT
```

Customer:

```text
Home
↓
Search / Category
↓
Service
↓
Provider
↓
Service Detail
```

---

# 33. Feature #1 — Provider

Provider:

```text
CREATE
Service Offering

UPDATE
Profile
Skills
Availability

VIEW
Discovery presentation
```

Provider memilih taxonomy yang sudah tersedia.

---

# 34. Feature #1 — Admin

Admin:

```text
MANAGE
Category
Subcategory
Service
Provider visibility
```

Admin menjalankan operational taxonomy berdasarkan platform governance.

---

# 35. Feature #1 — CEO

CEO:

```text
CONFIGURE
Taxonomy Policy

APPROVE
Category changes

ANALYZE
Demand
Supply
Revenue
Orders
```

---

# 36. Feature #1 Role Flow

```text
CEO
↓
Define Taxonomy
↓
Admin
↓
Manage / Publish
↓
Provider
↓
Select Service
↓
Customer
↓
Search / Discover
```

---

# 37. Feature #2 — Booking Jasa

## Customer

```text
CREATE BOOKING
SELECT SERVICE
SELECT LOCATION
SELECT TIME
SELECT BOOKING TYPE
REVIEW
CONFIRM
CANCEL
```

---

# 38. Feature #2 — Provider

Provider dapat:

```text
VIEW BOOKING REQUEST
ACCEPT
REJECT
PROPOSE / ADJUST
CONFIRM SCHEDULE
```

sesuai booking type/policy.

---

# 39. Feature #2 — Worker

Worker belum otomatis menerima booking request.

Worker menerima assignment setelah provider melakukan assignment.

---

# 40. Feature #2 — Admin

Admin dapat:

```text
MONITOR
BOOKINGS

INTERVENE
exception

REASSIGN / CORRECT
sesuai authority
```

---

# 41. Feature #2 — CEO

CEO lebih fokus:

```text
ANALYZE
Booking volume
Conversion
Demand
```

bukan mengoperasikan booking harian satu per satu.

---

# 42. Feature #2 Flow

```text
Customer
↓
Create Booking
↓
Provider
↓
Accept / Reject
↓
Admin monitors exceptions
↓
Booking confirmed
```

---

# 43. Feature #3 — Order Jasa

## Customer

```text
VIEW
CREATE through booking
CANCEL according to policy
VIEW ORDER STATUS
VIEW ORDER HISTORY
```

---

# 44. Feature #3 — Provider

```text
VIEW ASSIGNED ORDER
UPDATE PROVIDER-SIDE STATUS
EXECUTE
SUBMIT OUTCOME
```

---

# 45. Feature #3 — Admin

```text
MONITOR ORDER
HANDLE OPERATIONAL EXCEPTION
CONTROLLED CORRECTION
```

---

# 46. Feature #3 — CEO

```text
ANALYZE
Orders
Revenue
Category
Provider
Customer
```

---

# 47. Feature #3 Flow

```text
Booking
↓
Order Created
↓
Customer sees order
↓
Provider sees assigned order
↓
Admin monitors exception
↓
CEO sees aggregate analytics
```

---

# 48. Feature #4 — Pricing & Quotation

## Customer

```text
VIEW PRICE
VIEW ESTIMATE
VIEW QUOTATION
ACCEPT
REJECT
REQUEST REVISION
NEGOTIATE
APPROVE ADDITIONAL COST
```

---

# 49. Feature #4 — Provider

```text
CONFIGURE SUPPORTED PRICING MODEL
CREATE QUOTATION
REVISE QUOTATION
NEGOTIATE
ADD SCOPE
ADD COST
SUBMIT QUOTATION
```

---

# 50. Feature #4 — Admin

```text
MONITOR QUOTATION ISSUE
HANDLE EXCEPTION
AUDIT PRICE CHANGES
```

---

# 51. Feature #4 — CEO

CEO controls platform-level policy such as:

```text
Pricing governance
Fee policy
Allowed configuration
```

---

# 52. Feature #4 Flow

```text
Customer Request
↓
Provider Reviews
↓
Provider creates Quotation
↓
Customer reviews
↓
Accept / Reject / Revision / Negotiation
↓
Agreed scope + price
```

---

# 53. Feature #5 — Communication

## Customer

```text
CHAT
SEND MESSAGE
SEND RELEVANT FILE/MEDIA
CALL / CONTACT
```

---

# 54. Feature #5 — Provider

```text
RESPOND
CHAT
SEND SERVICE INFORMATION
COMMUNICATE SCHEDULE
```

---

# 55. Feature #5 — Worker

Worker can communicate only within assigned/relevant work context.

---

# 56. Feature #5 — Admin

Admin/Support can access communication relevant to:

- support
- dispute
- operational investigation

subject to permission/privacy.

---

# 57. Feature #5 — CEO

CEO generally receives aggregate communication metrics, not unrestricted private chat access.

---

# 58. Feature #5 Flow

```text
Customer ↔ Provider
        │
        └── Worker (when assigned)
        │
        └── Admin / Support (when necessary)
```

---

# 59. Feature #6 — Payment & Protection

## Customer

```text
VIEW PAYMENT
PAY
VIEW INVOICE
VIEW RECEIPT
VIEW REFUND
VIEW PAYMENT HISTORY
```

---

# 60. Feature #6 — Provider

```text
VIEW PAYOUT
VIEW EARNINGS
VIEW PAYMENT STATUS RELEVANT TO ORDER
```

Provider tidak melihat payment details customer yang tidak diperlukan.

---

# 61. Feature #6 — Admin / Finance

```text
MONITOR PAYMENT
RECONCILE
HANDLE REFUND
HANDLE PAYOUT
HANDLE ESCROW
HANDLE FINANCIAL EXCEPTION
```

---

# 62. Feature #6 — CEO

CEO dapat mengatur:

```text
Platform/Application Fee
Fee hierarchy
Payer policy
```

dan melihat aggregate financial analytics.

---

# 63. Feature #6 Flow

```text
Customer
↓
Payment
↓
Payment Engine
↓
Order
↓
Provider Payout
↓
Admin / Finance Reconciliation
↓
CEO Aggregate Analytics
```

---

# 64. Feature #7 — Service Execution

## Customer

Customer primarily:

```text
VIEW EXECUTION CONTEXT
VIEW STATUS
REPORT ISSUE
```

---

# 65. Feature #7 — Provider

Provider:

```text
ASSIGN WORKER
PREPARE
START
MANAGE EXECUTION
HANDLE ISSUE
SUBMIT COMPLETION
```

Provider dapat menjadi worker bila provider adalah individual worker.

---

# 66. Feature #7 — Worker

Worker:

```text
VIEW ASSIGNED JOB
CHECK-IN
START
EXECUTE TASK
UPDATE PROGRESS
PAUSE / RESUME
REPORT ISSUE
TEST
SUBMIT COMPLETION
```

---

# 67. Feature #7 — Admin

Admin:

```text
MONITOR EXECUTION
HANDLE EXCEPTION
REASSIGN / INTERVENE
AUDIT
```

---

# 68. Feature #7 — CEO

CEO melihat:

```text
Aggregate execution metrics
Service performance
Failure
Completion
```

---

# 69. Feature #7 Flow

```text
Provider
↓
Assign Worker
↓
Worker
↓
Execute
↓
Provider supervises
↓
Admin handles exceptions
↓
Customer observes relevant status
```

---

# 70. Feature #8 — Tracking Detail

## Customer

```text
VIEW LOCATION
VIEW ETA
VIEW STATUS
VIEW TIMELINE
SHARE TRACKING
REPORT PROBLEM
```

---

# 71. Feature #8 — Provider / Worker

```text
START TRIP
SEND LOCATION
ARRIVE
END TRACKING
```

Tracking hanya digunakan bila service mode membutuhkan.

---

# 72. Feature #8 — Admin

```text
MONITOR ACTIVE TRACKING
MONITOR DELAY
MONITOR OFFLINE
HANDLE EXCEPTION
```

---

# 73. Feature #8 — CEO

Aggregate:

```text
Tracking utilization
Delay trends
Operational performance
```

---

# 74. Feature #8 Flow

```text
Worker / Provider
↓
Start Trip
↓
Tracking Session
↓
Customer Views
↓
Arrived
↓
Tracking Ends
```

---

# 75. Feature #9 — Proof of Service

## Customer

```text
VIEW PROOF
REVIEW
REQUEST REVISION
ACCEPT
```

---

# 76. Feature #9 — Provider / Worker

```text
CREATE PROOF
UPLOAD MEDIA
COMPLETE CHECKLIST
RECORD MEASUREMENT
RECORD TEST
SUBMIT PROOF
RESPOND TO REVISION
```

---

# 77. Feature #9 — Admin

```text
REVIEW EXCEPTION
AUDIT
MODERATE
HANDLE ACCESS ISSUE
```

---

# 78. Feature #9 — CEO

CEO mainly sees aggregate proof/service-quality analytics as permitted.

---

# 79. Feature #9 Flow

```text
Worker / Provider
↓
Collect Proof
↓
Submit Package
↓
Customer Review
↓
Accepted / Revision Required
↓
Completion
```

---

# 80. Feature #10 — Completion & Customer Confirmation

## Customer

```text
REVIEW COMPLETION
CONFIRM
REPORT ISSUE
REQUEST REWORK
```

---

# 81. Feature #10 — Provider

```text
SUBMIT COMPLETION
RESPOND TO ISSUE
REWORK
RESUBMIT
```

---

# 82. Feature #10 — Worker

Worker provides execution outcome/evidence but final customer-facing completion depends on completion rules.

---

# 83. Feature #10 — Admin

```text
MONITOR
HANDLE EXCEPTION
ADMIN OVERRIDE when policy allows
```

---

# 84. Feature #10 — CEO

Aggregate:

```text
Completion rate
Auto completion
Customer confirmation
Rework
```

---

# 85. Feature #10 Flow

```text
Execution
↓
Proof
↓
Completion Submitted
↓
Customer Review
↓
Confirm / Report Issue
↓
Completed
```

---

# 86. Feature #11 — Rating & Review

## Customer

```text
CREATE RATING
CREATE REVIEW
EDIT/DELETE only according to review policy
REPORT REVIEW
```

---

# 87. Feature #11 — Provider

```text
VIEW PUBLIC REVIEW
RESPOND
REPORT / APPEAL
```

Provider does not edit customer review.

---

# 88. Feature #11 — Worker

Worker rating is not the public MVP.

Worker performance can be internal signal where policy allows.

---

# 89. Feature #11 — Admin

```text
MODERATE
REVIEW REPORT
HIDE / REMOVE
HANDLE APPEAL
```

---

# 90. Feature #11 — CEO

```text
VIEW AGGREGATE RATING
VIEW SERVICE PERFORMANCE
```

---

# 91. Feature #11 Flow

```text
Completed
↓
Customer rates
↓
Review published
↓
Provider can respond
↓
Admin moderates when necessary
↓
Rating aggregate updates
```

---

# 92. Feature #12 — Complaint / Dispute

## Customer

```text
CREATE COMPLAINT
SUBMIT EVIDENCE
RESPOND
ACCEPT / REJECT PROPOSAL
APPEAL
```

---

# 93. Feature #12 — Provider

```text
RECEIVE CASE
RESPOND
SUBMIT EVIDENCE
PROPOSE RESOLUTION
ACCEPT / REJECT
APPEAL
```

---

# 94. Feature #12 — Worker

Worker may provide work evidence/statement when requested and authorized.

---

# 95. Feature #12 — Admin

Admin:

```text
TRIAGE
REQUEST INFO
INVESTIGATE
NEGOTIATE
PROPOSE RESOLUTION
ESCALATE
CLOSE
```

---

# 96. Feature #12 — CEO

CEO mainly:

```text
View aggregate dispute trends
Service risk
Category/provider patterns
```

Individual case intervention follows special governance, not normal CEO workflow.

---

# 97. Feature #12 Flow

```text
Customer / Provider
↓
Complaint
↓
Triage
↓
Evidence
↓
Provider / Customer Response
↓
Investigation
↓
Resolution
↓
Accepted
↓
Closed
```

---

# 98. Feature #13 — Warranty

## Customer

```text
VIEW WARRANTY
SUBMIT CLAIM
SUBMIT EVIDENCE
RESPOND
APPEAL
```

---

# 99. Feature #13 — Provider

For service warranty:

```text
REVIEW CLAIM
INSPECT
RESPOND
PERFORM REWORK
PROPOSE RESOLUTION
```

---

# 100. Feature #13 — Worker

Worker may execute warranty rework.

---

# 101. Feature #13 — Admin

```text
TRIAGE
VERIFY POLICY
REVIEW CLAIM
HANDLE ESCALATION
AUDIT
```

---

# 102. Feature #13 — CEO

CEO:

```text
DEFINE / APPROVE PLATFORM WARRANTY POLICY
VIEW AGGREGATE WARRANTY PERFORMANCE
```

---

# 103. Feature #13 Flow

```text
Completed
↓
Warranty Active
↓
Customer Claim
↓
Review
↓
Inspection
↓
Eligible / Partial / Not Eligible
↓
Resolution
↓
Fulfilled / Closed
```

---

# 104. Feature #14 — Service History

## Customer

```text
VIEW OWN HISTORY
SEARCH
FILTER
ADD PERSONAL NOTE
ADD PERSONAL LABEL
SHARE AUTHORIZED HISTORY
```

---

# 105. Feature #14 — Provider

```text
VIEW RELEVANT AUTHORIZED HISTORY
CREATE RELEVANT SERVICE RECORD
```

Provider tidak otomatis melihat all customer history.

---

# 106. Feature #14 — Worker

Worker dapat view only relevant authorized context needed for assigned service.

---

# 107. Feature #14 — Admin

```text
CONTROLLED CORRECTION
AUDIT
SUPPORT INVESTIGATION
```

---

# 108. Feature #14 — CEO

Aggregate/historical analytics:

```text
Service history trends
Repeat patterns
Category trends
```

---

# 109. Feature #14 Flow

```text
Completed Service
↓
System Generates History
↓
Customer Views
↓
Provider sees relevant context when authorized
↓
History becomes input for Maintenance / Rebooking / Recommendation
```

---

# 110. Feature #15 — Asset

## Customer

```text
CREATE ASSET
UPDATE OWN ASSET
UPLOAD DOCUMENT
MANAGE OWNER/USER
TRANSFER
SHARE
ARCHIVE
```

---

# 111. Feature #15 — Provider

Provider can:

```text
VIEW RELEVANT ASSET
ADD SERVICE CONTEXT
ASSIST IDENTIFICATION
```

with authorization.

---

# 112. Feature #15 — Worker

Worker can:

```text
VIEW ASSIGNED ASSET
ADD INSPECTION / CONDITION DATA
VIEW NECESSARY CONTEXT
```

---

# 113. Feature #15 — Admin

```text
MANAGE MASTER TAXONOMY
VERIFY
AUDIT
HANDLE EXCEPTION
```

---

# 114. Feature #15 — CEO

```text
ANALYZE ASSET / SERVICE DEMAND
```

and define relevant platform governance.

---

# 115. Feature #15 Flow

```text
Customer
↓
Create Asset
↓
Asset Active
↓
Service
↓
Worker sees assigned context
↓
Service History updates
↓
Maintenance / Recommendation use asset context
```

---

# 116. Feature #16 — Maintenance & Reminder

## Customer

```text
CREATE PERSONAL PLAN
VIEW OFFICIAL PLAN
VIEW SCHEDULE
SNOOZE REMINDER
RESCHEDULE
SKIP
BOOK MAINTENANCE
SET REMINDER PREFERENCE
```

---

# 117. Feature #16 — Provider

```text
CREATE SERVICE MAINTENANCE RECOMMENDATION
SET SUPPORTED MAINTENANCE OFFERING
SET AVAILABILITY
MANAGE PACKAGE / CONTRACT
```

---

# 118. Feature #16 — Worker

Worker may:

```text
RECOMMEND MAINTENANCE
RECORD FINDING
EXECUTE MAINTENANCE
RECORD RESULT
```

---

# 119. Feature #16 — Admin

```text
MANAGE OPERATION
MONITOR DUE / OVERDUE
MANAGE TEMPLATE
HANDLE EXCEPTION
```

---

# 120. Feature #16 — CEO

```text
DEFINE MAINTENANCE POLICY
DEFINE DEFAULTS
DEFINE COMPLIANCE RULE
VIEW ANALYTICS
```

---

# 121. Feature #16 Flow

```text
Asset
↓
Maintenance Plan
↓
Schedule
↓
Reminder
↓
Due
↓
Book
↓
Order
↓
Execution
↓
Proof
↓
Completion
↓
History
↓
Next Schedule
```

---

# 122. Feature #17 — Rebooking / Favorite / Loyalty

## Customer

```text
BOOK AGAIN
FAVORITE PROVIDER
FAVORITE SERVICE
VIEW POINTS
REDEEM REWARD
VIEW LOYALTY HISTORY
```

---

# 123. Feature #17 — Provider

Provider may:

```text
VIEW REPEAT CUSTOMER AGGREGATE
PARTICIPATE IN CAMPAIGN
CONFIGURE ALLOWED PROVIDER BENEFITS
```

---

# 124. Feature #17 — Admin

```text
MANAGE REWARDS
MANAGE CAMPAIGNS
ADJUST POINTS WITH AUTHORITY
REVIEW ABUSE
HANDLE REWARD ISSUE
```

---

# 125. Feature #17 — CEO

```text
DEFINE LOYALTY RULE
DEFINE REWARD
DEFINE CAMPAIGN
DEFINE EXPIRY
ANALYZE RETENTION
```

---

# 126. Feature #17 Flow

```text
Completed Order
↓
History
↓
Book Again / Favorite
↓
Repeat Order
↓
Eligible Loyalty Event
↓
Points
↓
Reward
↓
Repeat Usage
```

---

# 127. Feature #18 — Smart Recommendation & AI Agent

## Customer

```text
VIEW RECOMMENDATION
PROVIDE INTENT
ASK AI AGENT
ACCEPT / IGNORE RECOMMENDATION
CONFIRM ACTION
GIVE FEEDBACK
```

---

# 128. Feature #18 — Provider

Provider data becomes recommendation input.

Provider can:

```text
MANAGE OFFERING
AVAILABILITY
SERVICE CONFIGURATION
```

Recommendation system uses provider data.

---

# 129. Feature #18 — Worker

Worker may contribute structured findings/maintenance/service execution data that later become context for recommendation.

---

# 130. Feature #18 — Admin

```text
MONITOR RECOMMENDATION
MANAGE POLICY
MONITOR MODEL
HANDLE INCIDENT
PAUSE MODEL
REVIEW QUALITY
```

---

# 131. Feature #18 — CEO

```text
SET RECOMMENDATION POLICY
REVIEW BUSINESS IMPACT
REVIEW MODEL PERFORMANCE
APPROVE GOVERNANCE
```

---

# 132. Feature #18 — AI Agent

AI Agent can:

```text
UNDERSTAND INTENT
GET CONTEXT
CALL TOOLS
CALL RECOMMENDATION ENGINE
EXPLAIN
ASK CONFIRMATION
```

AI Agent cannot:

```text
invent
bypass
silent transaction
override policy
```

---

# 133. Feature #18 Flow

```text
Customer
↓
Intent
↓
AI Agent / App Context
↓
Data #1–#17
↓
Recommendation Engine
↓
Hard Rules
↓
ML Ranking
↓
Explanation
↓
Customer Decision
↓
Booking / Other Existing Flow
```

---

# 134. Feature #18 Automated Learning

```text
User Interaction
↓
Event Data
↓
Training Dataset
↓
Automated Training
↓
Evaluation
↓
Model Registry
↓
Canary
↓
Production
↓
Monitoring
↓
Retraining / Rollback
```

---

# 135. Feature #19 — Service + Product Integration

## Customer

```text
VIEW PRODUCT REQUIREMENT
VIEW WHY NEEDED
VIEW COMPATIBILITY
APPROVE
REJECT
SELECT PRODUCT
PROVIDE OWN PRODUCT
BUY PRODUCT
```

---

# 136. Feature #19 — Provider

Provider can:

```text
IDENTIFY PRODUCT NEED
RECOMMEND PRODUCT
SELECT SOURCE
USE OWN MATERIAL
REQUEST SUPPLIER
SUBMIT ADDITIONAL COST
RECOMMEND SUBSTITUTE
RECORD PRODUCT USED
```

---

# 137. Feature #19 — Worker

Worker can:

```text
IDENTIFY FINDING
RECORD MATERIAL NEED
RECORD MATERIAL USED
INSTALL PRODUCT
RECORD SERIAL
SUBMIT PROOF CONTEXT
```

---

# 138. Feature #19 — Admin

Admin can:

```text
AUDIT PRODUCT-SERVICE RELATION
HANDLE EXCEPTION
REVIEW COMMERCIAL ISSUE
MANAGE GOVERNANCE
```

---

# 139. Feature #19 — CEO

CEO/Product Owner can define:

```text
Product-service governance
Affiliate policy
Disclosure policy
Approval policy
Compatibility governance
```

---

# 140. Feature #19 — Merchant

Merchant can:

```text
SUPPLY PRODUCT
MANAGE PRODUCT DATA
FULFILL PRODUCT ORDER
HANDLE PRODUCT ISSUE
```

---

# 141. Feature #19 — Supplier

Supplier can:

```text
SUPPLY PRODUCT
SUPPORT PROCUREMENT
PROVIDE PRODUCT INFORMATION
```

---

# 142. Feature #19 Flow

```text
Service
↓
Product Requirement
↓
Compatibility
↓
Source
↓
Price
↓
Customer Approval
↓
Product Purchase / Procurement
↓
Product Received
↓
Service Execution
↓
Product Used / Installed
↓
Proof
↓
Asset / History
```

---

# 143. Master Feature-by-Role Matrix

Legend:

```text
V = View
C = Create
U = Update
A = Approve
X = Execute
M = Manage
G = Governance / Configure
N = Analyze
S = Submit
```

| Feature | Customer | Provider | Worker | Admin/Ops | CEO/PO | Merchant/Supplier |
|---|---|---|---|---|---|---|
| #1 Discovery | V/C/S | C/U/V | - | M | G/N | - |
| #2 Booking | C/U/A | V/A/U | V | M | N | - |
| #3 Order | V/C/U | V/U/X | V/X | M | N | - |
| #4 Pricing | V/A/S | C/U/S | V | M | G/N | - |
| #5 Communication | C/U | C/U | C/U | M | N | - |
| #6 Payment | C/A/V | V | - | M/X | G/N | V where relevant |
| #7 Execution | V/issue | M/X | X | M | N | - |
| #8 Tracking | V/share | X | X | M | N | - |
| #9 Proof | V/A/revise | C/S/U | C/S/X | M | N | - |
| #10 Completion | A/report | S/U/X | X | M/A exception | N | - |
| #11 Rating | C | V/respond | - | M/moderate | N | - |
| #12 Dispute | C/S/A | S/A | S when requested | M/A | N | - |
| #13 Warranty | C/S/A | S/U/X | X | M/A | G/N | V where relevant |
| #14 History | V/U personal | V/S | V relevant | M/correct | N | - |
| #15 Asset | C/U/M | V/context | V/context | M/verify | N | - |
| #16 Maintenance | C/U/A | C/U/X | X/S | M | G/N | - |
| #17 Rebooking | C/U | V/C/U | - | M | G/N | - |
| #18 Recommendation | V/C/A | V/input | input | M | G/N | input |
| #19 Service+Product | A/C/S/U | C/S/U/X | C/S/X | M | G/N | C/U/X |

---

# 144. Customer Access Pattern

```text
Customer
↓
Own Scope
↓
Own Transaction
↓
Own Asset
↓
Own History
↓
Own Preference
```

Customer tidak otomatis mendapatkan:

```text
Provider internal data
Platform policy
Other customer data
Admin controls
```

---

# 145. Provider Access Pattern

```text
Provider
↓
Own Business
↓
Own Offering
↓
Assigned / Related Orders
↓
Relevant Customer Context
↓
Assigned Asset Context
```

Provider tidak otomatis mendapatkan:

```text
All customer history
All customer payments
Platform-wide analytics
Other provider data
CEO policy controls
```

---

# 146. Worker Access Pattern

```text
Worker
↓
Assigned Work
↓
Relevant Asset
↓
Relevant Customer Context
↓
Execution
↓
Proof
```

Worker access harus lebih sempit daripada full Provider account bila worker merupakan sub-role.

---

# 147. Admin Access Pattern

```text
Admin
↓
Operational Scope
↓
Cross-feature Monitoring
↓
Exception Handling
↓
Controlled Intervention
↓
Audit
```

Admin tidak otomatis sama dengan CEO authority.

---

# 148. CEO Access Pattern

```text
CEO
↓
Policy
↓
Governance
↓
Aggregate Analytics
↓
Strategic Configuration
```

CEO tidak perlu menjalankan setiap operational action harian.

---

# 149. Approval Authority

Approval harus dibedakan:

```text
Customer Approval
= own transaction / own cost / own scope

Provider Approval
= provider-side acceptance / execution

Admin Approval
= operational intervention

CEO Approval
= platform governance
```

---

# 150. Financial Approval

```text
Customer
→ approve charge / quotation / additional cost

Provider
→ submit amount / quotation

Admin / Finance
→ operational financial handling

CEO
→ fee policy
```

---

# 151. Scope Approval

```text
Provider
→ propose scope

Customer
→ approve scope

Admin
→ investigate exception

CEO
→ define platform rules
```

---

# 152. Product Approval

```text
Provider/Worker
→ identify requirement

System
→ compatibility

Customer
→ approve purchase/additional cost
```

---

# 153. Warranty Authority

```text
Customer
→ submit claim

Provider
→ respond/service warranty action

Admin
→ review/escalate

CEO
→ policy
```

---

# 154. Dispute Authority

```text
Customer / Provider
→ submit case

Admin/Ops
→ investigate / resolve

CEO
→ aggregate oversight / exceptional governance
```

---

# 155. Rating Authority

```text
Customer
→ create review

Provider
→ respond

Admin
→ moderate

CEO
→ analyze
```

---

# 156. Maintenance Authority

```text
Customer
→ personal plan/preferences

Provider
→ service recommendation/config

Worker
→ technical finding

Admin
→ operational management

CEO
→ policy
```

---

# 157. Loyalty Authority

```text
Customer
→ earn / redeem

Provider
→ participate

Admin
→ operate

CEO
→ rule/governance
```

---

# 158. Recommendation Authority

```text
Customer
→ decide

AI
→ suggest

ML
→ rank

Rules
→ validate

Backend
→ enforce

CEO
→ govern
```

---

# 159. Product Integration Authority

```text
Worker / Provider
→ identify need

System
→ validate compatibility

Customer
→ approve purchase/additional cost

Merchant/Supplier
→ supply

Admin
→ audit

CEO
→ govern
```

---

# 160. Notification Responsibility

Notifications should be sent based on role-relevant events.

Examples:

```text
Customer:
booking confirmed
payment
provider on the way
completion
maintenance due
reward

Provider:
new booking
payment status
customer message
dispute
warranty claim
product requirement

Worker:
assignment
schedule
execution update

Admin:
exception
dispute
fraud
payment issue
system issue

CEO:
aggregate alerts
business KPI
policy issue
```

---

# 161. Privacy Principle

Role access must follow:

```text
Need to know
+
Authorized relationship
+
Business purpose
```

---

# 162. Customer Privacy

Provider hanya melihat:

```text
Relevant customer identity
Service address when needed
Relevant service context
Relevant asset
Relevant history
```

---

# 163. Provider Privacy

Customer tidak otomatis melihat:

```text
Provider internal costs
Provider internal operations
Other customers
Internal scoring
```

---

# 164. Internal Analytics Privacy

Internal ranking/ML signals tidak otomatis ditampilkan ke customer.

---

# 165. Cross-Role Data Visibility

Data visibility bergantung pada:

```text
Role
+
Relationship
+
Transaction
+
Authorization
+
Privacy
```

---

# 166. Audit Principle

Semua action kritis harus memiliki:

```text
actor
action
target
timestamp
result
reason when needed
```

---

# 167. Critical Actions

Contoh critical actions:

- price change
- quotation acceptance
- additional cost approval
- payment adjustment
- refund
- payout hold
- completion override
- complaint decision
- warranty decision
- loyalty adjustment
- product substitution
- admin correction
- model deployment

---

# 168. No Silent Administrative Change

Admin tidak boleh melakukan perubahan kritis tanpa audit trail.

---

# 169. No Silent Provider Change

Provider changes to:

- price
- scope
- availability
- material

harus mengikuti approval/policy bila transaction-impacting.

---

# 170. No Silent AI Action

AI Agent tidak boleh membuat transaction-impacting change tanpa authorization/confirmation sesuai action type.

---

# 171. No Silent Customer Charge

Customer tidak boleh dibebankan additional charge tanpa applicable approval.

---

# 172. Delegation Principle

Provider business account dapat mendelegasikan execution ke Worker.

```text
Provider
↓
Assign Worker
↓
Worker Executes
```

Namun Provider tetap menjadi business/provider entity.

---

# 173. Provider Individual

Jika Provider merupakan individual:

```text
Provider = Worker
```

Tidak perlu membuat worker account terpisah untuk kasus ini.

---

# 174. Provider Business

Jika Provider adalah business:

```text
Provider Organization
↓
Workers
```

Worker account/sub-role dapat digunakan.

---

# 175. Customer Shared Asset

Jika asset shared:

```text
Owner
User
Manager
Viewer
Technician
```

access mengikuti Asset #15.

---

# 176. Shared Maintenance

Shared asset dapat memiliki maintenance visibility berdasarkan permission.

---

# 177. Shared Service History

History access mengikuti asset/customer relationship.

---

# 178. Role + Asset Permission

Provider/Worker tidak otomatis dapat mengakses asset hanya karena berada di platform.

Harus ada:

```text
assignment
+
authorization
```

---

# 179. Role + Service Permission

Worker hanya menjalankan service yang:

```text
assigned
+
eligible
```

---

# 180. Role + Product Permission

Provider/Worker dapat melihat product requirement yang memang terkait job.

---

# 181. Merchant Isolation

Merchant hanya melihat product transaction/supply information yang relevan.

---

# 182. Supplier Isolation

Supplier hanya melihat procurement/product data yang relevan.

---

# 183. Admin Isolation

Admin domain tertentu dapat dibatasi sesuai duty.

Misalnya:

```text
Support Admin
≠
Finance Admin
```

bisa diterapkan sebagai sub-role.

---

# 184. Suggested Admin Sub-Roles

Scale-up:

```text
ADMIN / OPERATIONS
├── Customer Support
├── Service Operations
├── Finance Operations
├── Trust & Safety
├── Product Operations
└── Content / Catalog Operations
```

Ini belum harus menjadi top-level customer-facing role.

---

# 185. Suggested Provider Sub-Roles

```text
PROVIDER
├── Owner
├── Manager
├── Dispatcher
└── Worker / Technician
```

---

# 186. Suggested Enterprise Customer Roles

Scale-up:

```text
CUSTOMER ORGANIZATION
├── Owner
├── Admin
├── Manager
├── Employee
└── Viewer
```

---

# 187. Role-Based Dashboard

## Customer Dashboard

```text
Home
Orders
Bookings
Maintenance
Assets
History
Favorites
Loyalty
Messages
Recommendations
```

---

# 188. Provider Dashboard

```text
Overview
Orders
Calendar
Workers
Services
Pricing
Quotations
Execution
Proof
Customers
Maintenance
Products
Earnings
Analytics
```

---

# 189. Worker Dashboard

```text
Today's Jobs
Assignments
Navigation / Tracking
Execution
Checklist
Proof
Materials
Issues
```

---

# 190. Admin Dashboard

```text
Operations
Providers
Customers
Orders
Payments
Disputes
Warranty
Maintenance
Loyalty
Products
Tracking
Analytics
Audit
```

---

# 191. CEO Dashboard

```text
Executive Overview
Revenue
Orders
Customers
Providers
Demand
Supply
Category
Service
Retention
Quality
Financial
Product Analytics
AI / Recommendation Analytics
```

---

# 192. Merchant Dashboard

Product domain scale-up:

```text
Products
Orders
Inventory
Fulfillment
Shipping
Returns
Analytics
```

---

# 193. Supplier Dashboard

```text
Supply Requests
Procurement
Products
Availability
Orders
```

---

# 194. Role Navigation Principle

User hanya melihat navigation yang relevan dengan role dan permission.

---

# 195. Role Permission ≠ UI Visibility Only

Hidden button bukan security.

Security harus berada di backend authorization.

---

# 196. Backend Authorization

Every protected action:

```text
authenticate
↓
authorize
↓
validate resource relation
↓
execute
↓
audit
```

---

# 197. Resource-Based Authorization

Selain role:

```text
customer_id
provider_id
worker_assignment_id
asset_id
order_id
```

harus dicek.

---

# 198. Example: Provider Access to Order

```text
Role = Provider
+
Order.provider_id = current_provider_id
```

baru boleh view/act.

---

# 199. Example: Worker Access to Job

```text
Role = Worker
+
Execution.assignment.worker_id = current_worker_id
```

baru boleh execute.

---

# 200. Example: Customer Access

```text
Role = Customer
+
Order.customer_id = current_customer_id
```

baru boleh view.

---

# 201. Example: Admin Access

```text
Role = Admin
+
Permission Scope = relevant domain
```

---

# 202. Example: CEO Access

```text
Role = CEO
+
Business Analytics scope
```

Tidak berarti CEO mempunyai access untuk mengubah customer transaction sesuka hati.

---

# 203. Approval + Authorization

```text
User may see
≠
User may edit
≠
User may approve
```

Ini harus dipisahkan.

---

# 204. State Machine + Role

Status transition harus memiliki allowed actor.

Contoh:

```text
BOOKING REQUESTED
→ Provider accepts
```

Customer tidak bisa mengubah langsung menjadi:

```text
PROVIDER_CONFIRMED
```

---

# 205. Example State Authority

```text
Quotation:
DRAFT → Provider
SENT → Provider
ACCEPTED → Customer
REVISED → Provider
```

---

# 206. Example Completion Authority

```text
COMPLETION_SUBMITTED → Provider/Worker
CUSTOMER_CONFIRMED → Customer
ADMIN_OVERRIDE → Admin
AUTO_COMPLETED → System
```

---

# 207. Example Dispute Authority

```text
SUBMITTED → Customer/Provider
TRIAGING → Admin
RESOLUTION_PROPOSED → Admin
ACCEPTED → Case party
```

---

# 208. Example Warranty Authority

```text
CLAIM_SUBMITTED → Customer
UNDER_REVIEW → Admin/Provider
REPAIR_IN_PROGRESS → Provider/Worker
FULFILLED → Relevant authority/system
```

---

# 209. Example Loyalty Authority

```text
EARN → System
REDEEM → Customer
ADJUST → Admin
RULE_CONFIG → CEO/authorized admin
```

---

# 210. Example Recommendation Authority

```text
GENERATED → System
VIEWED → Customer
FEEDBACK → Customer
MODEL_CONFIG → Authorized Ops/CEO
DEPLOY → ML Ops/Admin according to governance
```

---

# 211. Cross-Feature End-to-End — Customer

```text
Discovery
↓
Booking
↓
Order
↓
Payment
↓
Tracking
↓
Execution
↓
Proof
↓
Completion
↓
Rating
↓
History
↓
Asset
↓
Maintenance
↓
Rebooking
↓
Recommendation
↓
Product Integration
```

---

# 212. Cross-Feature End-to-End — Provider

```text
Provider Onboarding
↓
Service Offering
↓
Discovery Visibility
↓
Booking Request
↓
Order
↓
Quotation / Pricing
↓
Communication
↓
Assignment
↓
Execution
↓
Tracking
↓
Proof
↓
Completion
↓
Rating
↓
Warranty
↓
History
↓
Maintenance Recommendation
↓
Product Requirement
```

---

# 213. Cross-Feature End-to-End — Worker

```text
Assignment
↓
Job Context
↓
Navigation / Tracking
↓
Arrival
↓
Execution
↓
Material Finding
↓
Product Requirement
↓
Proof
↓
Testing
↓
Completion Submission
↓
Warranty Rework when assigned
```

---

# 214. Cross-Feature End-to-End — Admin

```text
Platform Operation
↓
Provider Verification
↓
Order Monitoring
↓
Payment Exception
↓
Execution Exception
↓
Proof / Completion Issue
↓
Complaint / Dispute
↓
Warranty
↓
Maintenance Monitoring
↓
Loyalty Operations
↓
Product-Service Audit
↓
Analytics
```

---

# 215. Cross-Feature End-to-End — CEO

```text
Taxonomy
↓
Policy
↓
Pricing Governance
↓
Fee
↓
Warranty Policy
↓
Maintenance Policy
↓
Loyalty Policy
↓
Recommendation Governance
↓
Product Integration Governance
↓
Aggregate Analytics
↓
Strategic Decision
```

---

# 216. Cross-Feature End-to-End — Merchant/Supplier

```text
Product Catalog
↓
Product-Service Relation
↓
Product Requirement
↓
Supply
↓
Product Order
↓
Fulfillment
↓
Product Delivery
↓
Product Issue / Warranty
```

---

# 217. Role Handoff Principle

Satu feature dapat melibatkan beberapa role secara berurutan.

Contoh:

```text
Provider
→ submit quotation

Customer
→ approve quotation

Payment
→ process transaction

Provider
→ execute

Customer
→ confirm completion

Admin
→ handle dispute if needed
```

---

# 218. Role Handoff Tidak Menghapus Ownership

Walaupun action berpindah role:

```text
Order
```

tetap memiliki source of truth yang sama.

---

# 219. Customer ↔ Provider Boundary

```text
Customer
= demand side

Provider
= supply side
```

---

# 220. Provider ↔ Worker Boundary

```text
Provider
= business/service owner

Worker
= executor
```

---

# 221. Admin ↔ CEO Boundary

```text
Admin
= operational control

CEO
= strategic/product governance
```

---

# 222. Merchant ↔ Supplier Boundary

```text
Merchant
= sells product

Supplier
= supplies product / procurement
```

Role bisa overlap tergantung business model tetapi tetap dipisahkan secara concept.

---

# 223. Data Classification

Data Servio dapat dikelompokkan:

```text
Customer Data
Provider Data
Operational Data
Financial Data
Historical Data
Platform Policy
Analytics
AI/ML Data
```

---

# 224. Customer Data

Contoh:

- profile
- address
- preferences
- asset
- favorite
- loyalty

Access restricted.

---

# 225. Provider Data

Contoh:

- provider profile
- skills
- availability
- service offering
- earnings
- internal configuration

---

# 226. Operational Data

Contoh:

- booking
- order
- execution
- tracking
- proof
- dispute
- warranty

---

# 227. Financial Data

Contoh:

- payment
- invoice
- payout
- refund
- fee
- escrow

---

# 228. Historical Data

Contoh:

- service history
- completed records
- asset history

---

# 229. Platform Policy Data

Contoh:

- taxonomy
- platform fees
- loyalty rule
- maintenance policy
- warranty policy
- recommendation policy

---

# 230. Analytics Data

Aggregate business insights.

CEO/Admin access differs.

---

# 231. AI / ML Data

Training data and model signals harus memiliki governance.

---

# 232. AI Data Access

AI/ML systems hanya boleh menggunakan data yang:

```text
relevant
+
authorized
+
governed
```

---

# 233. Role and AI Agent

AI Agent harus bertindak atas behalf of authenticated user.

```text
Customer Agent
≠
Provider Agent
```

Context/permission berbeda.

---

# 234. Customer AI Agent

Boleh:

```text
read own context
recommend
assist booking
assist product discovery
explain maintenance
```

---

# 235. Provider AI Agent

Dapat:

```text
summarize jobs
summarize customer need
suggest material
suggest maintenance
draft quotation
```

tetap sesuai provider authority.

---

# 236. Admin AI Agent

Dapat:

```text
summarize cases
assist triage
summarize operations
assist analytics
```

---

# 237. CEO AI Assistant

Dapat:

```text
summarize KPIs
summarize trends
answer business analytics questions
```

---

# 238. AI Agent Must Respect Role

AI tidak boleh memperluas user permission.

---

# 239. Example

Jika Worker bertanya:

```text
"tampilkan semua histori customer ini"
```

Agent harus tetap membatasi pada authorized relevant history.

---

# 240. System of Record Principle

AI bukan source of truth.

```text
Database / Domain Service
= actual state

AI
= assistant
```

---

# 241. Role-Based Notification

Notification recipient ditentukan oleh:

```text
event
+
role
+
relationship
```

---

# 242. Notification Example — Booking

```text
Customer:
Booking submitted

Provider:
New booking request

Admin:
Exception only

CEO:
Aggregate analytics
```

---

# 243. Notification Example — Payment

```text
Customer:
Payment status

Provider:
Payout / payment relevant status

Finance:
Exception/reconciliation

CEO:
Aggregate financial alert
```

---

# 244. Notification Example — Dispute

```text
Customer:
Case update

Provider:
Response required

Admin:
Action required

CEO:
Only strategic/aggregate alert
```

---

# 245. Notification Example — Maintenance

```text
Customer:
Reminder

Provider:
Upcoming maintenance relevant to them

Admin:
Operational issue

CEO:
Aggregate KPI
```

---

# 246. Notification Example — Product

```text
Customer:
Product approval/order

Provider:
Product requirement

Merchant:
Product order

Supplier:
Procurement request
```

---

# 247. RBAC Baseline

Core roles:

```text
ROLE_CUSTOMER
ROLE_PROVIDER
ROLE_ADMIN
ROLE_CEO
```

Candidate sub-roles:

```text
ROLE_WORKER
ROLE_SUPPORT
ROLE_FINANCE
ROLE_MERCHANT
ROLE_SUPPLIER
```

---

# 248. Permission Naming Concept

Contoh:

```text
booking.view.own
booking.create
booking.update.own
booking.approve.provider
booking.manage.admin

execution.view.assigned
execution.execute.assigned
execution.manage.provider

payment.view.own
payment.manage.admin
payment.configure.ceo
```

---

# 249. Permission Scope

Permission dapat memiliki scope:

```text
OWN
ASSIGNED
RELATED
ORGANIZATION
PLATFORM
AGGREGATE
```

---

# 250. Scope Example

```text
Customer:
order.view.own

Provider:
order.view.related

Worker:
execution.view.assigned

Admin:
order.view.platform_operational

CEO:
order.analytics.aggregate
```

---

# 251. Ownership Validation

Backend harus memvalidasi relationship sebelum action.

---

# 252. Role Escalation

Jika membutuhkan authority lebih tinggi:

```text
Worker
↓
Provider
↓
Admin
↓
CEO
```

Tidak boleh role rendah spoof role tinggi.

---

# 253. Approval Escalation

Contoh:

```text
Provider cannot resolve platform policy
↓
Admin

Admin cannot change CEO-level policy
↓
CEO / Product Owner
```

---

# 254. Exception Escalation

```text
Normal
↓
Operational Exception
↓
Admin
↓
Strategic / Policy Exception
↓
CEO
```

---

# 255. Dispute Escalation

```text
Customer / Provider
↓
Complaint
↓
Admin Investigation
↓
Escalation / Appeal
```

---

# 256. Warranty Escalation

```text
Provider
↓
Admin
↓
Policy / Complex case
```

---

# 257. Payment Escalation

```text
Customer / Provider
↓
Support
↓
Finance Ops
↓
Admin
↓
CEO only if governance/strategic issue
```

---

# 258. Product Escalation

```text
Worker / Provider
↓
Product Operations
↓
Merchant / Supplier
↓
Admin
```

---

# 259. Audit Trail by Role

For critical action:

```text
Who
What
When
On which resource
Why
Result
```

---

# 260. History of Admin Action

Admin correction should store:

```text
previous
new
reason
actor
timestamp
```

---

# 261. Financial Audit

Financial actions should store:

```text
transaction
actor
action
reason
amount
reference
timestamp
```

---

# 262. Product Audit

Product relation actions should store:

```text
requirement
product
source
selected by
approval
timestamp
```

---

# 263. Model Audit

AI/ML model actions should store:

```text
model version
dataset version
feature version
training run
deployment
actor / automation
timestamp
```

---

# 264. Security Baseline

Role architecture harus memiliki:

```text
Authentication
Authorization
Resource Ownership
Least Privilege
Audit
Rate Limiting
Session Security
```

---

# 265. Least Privilege

Role hanya mendapat akses minimum yang dibutuhkan.

---

# 266. Customer Least Privilege

Customer tidak mendapat provider/admin functions.

---

# 267. Provider Least Privilege

Provider tidak mendapat platform governance.

---

# 268. Worker Least Privilege

Worker hanya mendapat assigned execution access.

---

# 269. Admin Least Privilege

Admin diberi domain scope sesuai responsibility.

---

# 270. CEO Least Privilege

CEO mendapat strategic/configuration access yang memang diperlukan; tidak berarti unlimited technical/database access.

---

# 271. Final Role Map

```text
                         SERVIO
                           │
                  ┌────────┴────────┐
                  ▼                 ▼
              CUSTOMER           PROVIDER
                  │                 │
         Own Transaction     Own Service Business
                  │                 │
                  │             ┌───┴───┐
                  │             ▼       ▼
                  │          MANAGER   WORKER
                  │
                  └──────────┬──────────┘
                             │
                             ▼
                     ADMIN / OPERATIONS
                     ├── Support
                     ├── Finance
                     ├── Trust & Safety
                     └── Product Ops
                             │
                             ▼
                     CEO / PRODUCT OWNER

PRODUCT SIDE
     │
     ├── Merchant
     └── Supplier
```

---

# 272. Final Role-to-Feature Coverage

```text
#1 Discovery
Customer + Provider + Admin + CEO

#2 Booking
Customer + Provider + Admin

#3 Order
Customer + Provider + Worker + Admin + CEO

#4 Pricing
Customer + Provider + Admin + CEO

#5 Communication
Customer + Provider + Worker + Admin/Support

#6 Payment
Customer + Provider + Admin/Finance + CEO

#7 Execution
Customer + Provider + Worker + Admin

#8 Tracking
Customer + Provider/Worker + Admin

#9 Proof
Customer + Provider/Worker + Admin

#10 Completion
Customer + Provider/Worker + Admin

#11 Rating
Customer + Provider + Admin + CEO

#12 Complaint
Customer + Provider + Admin + Worker when needed

#13 Warranty
Customer + Provider + Worker + Admin + CEO

#14 History
Customer + Provider + Worker + Admin + CEO

#15 Asset
Customer + Provider + Worker + Admin + CEO

#16 Maintenance
Customer + Provider + Worker + Admin + CEO

#17 Rebooking / Favorite / Loyalty
Customer + Provider + Admin + CEO

#18 Recommendation / AI Agent
Customer + Provider + Worker + Admin + CEO

#19 Service + Product
Customer + Provider + Worker + Admin + CEO + Merchant/Supplier
```

---

# 273. Role Flow Principle per Feature

Setiap feature harus mempunyai minimal:

```text
Primary User
Supporting Actor
Operational Actor
Governance Actor
```

Tidak semua feature membutuhkan semua role.

---

# 274. Feature Ownership

Feature domain ownership dapat dipetakan:

| Feature | Primary Operational Owner |
|---|---|
| #1 Discovery | Product/Admin + Provider content |
| #2 Booking | Operations / Booking |
| #3 Order | Operations |
| #4 Pricing | Provider + Product/Policy |
| #5 Communication | Platform Operations |
| #6 Payment | Finance/Payment Ops |
| #7 Execution | Provider / Worker |
| #8 Tracking | Provider/Worker + Operations |
| #9 Proof | Provider/Worker |
| #10 Completion | Customer + Provider |
| #11 Rating | Customer + Moderation |
| #12 Dispute | Admin/Operations |
| #13 Warranty | Provider + Admin |
| #14 History | Platform + Customer |
| #15 Asset | Customer + Platform |
| #16 Maintenance | Customer + Provider |
| #17 Retention | Customer + Product |
| #18 Intelligence | Product/ML/AI |
| #19 Integration | Service/Product Operations |

---

# 275. Governance Ownership

```text
CEO / Product Owner
↓
Platform Rules
↓
Admin / Operations
↓
Operational Management
↓
Provider
↓
Service Delivery
↓
Worker
↓
Execution
↓
Customer
↓
Consumption / Decision
```

---

# 276. Customer Decision Principle

Customer menjadi pihak yang mengambil keputusan atas:

```text
Booking
Quotation
Additional Cost
Product Selection
Completion
Review
Complaint
Warranty Claim
Reward Redemption
```

selama action memang berada pada customer domain.

---

# 277. Provider Decision Principle

Provider mengambil keputusan atas:

```text
Service Offering
Availability
Provider-side execution
Worker assignment
Provider quotation
Provider operational response
```

dengan batas platform policy.

---

# 278. Admin Decision Principle

Admin menangani:

```text
Operations
Exceptions
Moderation
Dispute
Controlled Corrections
Support
```

---

# 279. CEO Decision Principle

CEO/Product Owner menangani:

```text
Governance
Policy
Strategic Configuration
Business Analytics
```

---

# 280. Worker Decision Principle

Worker menjalankan:

```text
Assigned Work
Technical Finding
Execution Input
Proof
Material Usage
Testing
```

sesuai authority.

---

# 281. Merchant Decision Principle

Merchant:

```text
Product Offering
Availability
Fulfillment
Product-side issue
```

---

# 282. Supplier Decision Principle

Supplier:

```text
Supply Availability
Procurement
Product information
```

---

# 283. No Role Overlap Without Rule

Jika satu actor punya lebih dari satu role:

```text
user
+
provider
```

system harus menentukan context active.

---

# 284. Multi-Role Account

A person may potentially have:

```text
Customer
+
Provider
```

tetapi permissions tetap dipisahkan berdasarkan role/context.

---

# 285. Provider-Worker Multi-Role

Individual provider dapat bertindak sebagai worker terhadap own jobs.

---

# 286. Admin-CEO Separation

CEO account tidak boleh otomatis dipakai untuk operational support.

---

# 287. Organization Context

Untuk organization/provider:

```text
organization_id
+
user_id
+
role
```

dapat digunakan.

---

# 288. Resource Context

Authorization dapat memakai:

```text
organization
provider
customer
asset
order
execution
```

sebagai relation.

---

# 289. Role-Based API Pattern

Contoh:

```text
GET /orders/:id
```

Backend:

```text
authenticate
↓
identify role
↓
check resource relationship
↓
check permission
↓
return allowed data
```

---

# 290. Role-Based Frontend Pattern

Frontend:

```text
role
+
permissions
↓
navigation
↓
page access
↓
action visibility
```

Tetapi backend tetap enforcement point.

---

# 291. Final Permission Matrix Principle

```text
ROLE
+
PERMISSION
+
RESOURCE
+
SCOPE
=
ACCESS
```

---

# 292. Example Permission

```text
Provider
+
quotation.approve
+
own quotation
```

belum tentu valid karena quotation acceptance adalah customer action.

Role tetap harus mengikuti domain authority.

---

# 293. State Transition Authority

Setiap state transition akan memiliki:

```text
allowed_role
allowed_condition
required_permission
```

---

# 294. Audit Requirement

Semua role-based state transition penting harus tercatat.

---

# 295. Final Cross-Role Lifecycle

```text
             CUSTOMER
                 │
              DISCOVERY
                 │
               BOOKING
                 │
                ORDER
                 │
          PRICING / PAYMENT
                 │
                 ▼
             PROVIDER
                 │
          ACCEPT / ASSIGN
                 │
                 ▼
              WORKER
                 │
             EXECUTION
                 │
             TRACKING
                 │
                PROOF
                 │
                 ▼
             CUSTOMER
                 │
             CONFIRM
                 │
             RATING
                 │
             HISTORY
                 │
       MAINTENANCE / REBOOK
                 │
           RECOMMENDATION
                 │
          PRODUCT INTEGRATION
                 │
       MERCHANT / SUPPLIER
                 │
                 ▼
              PRODUCT
```

Exception paths:

```text
Customer / Provider
↓
Complaint
↓
Admin
↓
Resolution
```

```text
Customer
↓
Warranty
↓
Provider / Admin
```

```text
Customer / Provider
↓
Payment issue
↓
Finance / Admin
```

---

# 296. Final Platform Governance Loop

```text
CEO / Product Owner
        ↓
Policy
        ↓
Admin / Operations
        ↓
System Configuration
        ↓
Provider
        ↓
Service Delivery
        ↓
Customer Experience
        ↓
Analytics
        ↓
CEO / Product Owner
```

---

# 297. Final Intelligence Loop

```text
Customer / Provider / Worker
        ↓
Transactions
        ↓
Data
        ↓
Feature #18
        ↓
Recommendation
        ↓
User Action
        ↓
New Data
        ↓
ML Training
```

---

# 298. Final Product Loop

```text
Service
↓
Product Requirement
↓
Product
↓
Installation / Use
↓
Asset
↓
History
↓
Maintenance
↓
Recommendation
```

---

# 299. Final Role Architecture Statement

> **Servio menggunakan empat canonical roles — Customer, Service Provider, Admin/Operations, dan CEO/Product Owner — dengan operational actors seperti Worker/Technician, Customer Support, Finance Operations, Merchant, dan Supplier yang dapat menjadi sub-role atau role tambahan sesuai kebutuhan implementasi. Setiap feature #1–#19 memiliki pembagian access berdasarkan ownership, relationship, responsibility, authority, dan business state.**

---

# 300. FINAL LOCKED PRINCIPLES

1. Customer, Provider, Admin/Operations, dan CEO/Product Owner adalah canonical roles Servio.
2. Worker/Technician adalah operational actor penting untuk service execution.
3. Customer Support dapat menjadi sub-role Admin/Operations.
4. Finance/Payment Operations dapat menjadi sub-role Admin/Operations.
5. Merchant dan Supplier terutama berada di Product ecosystem.
6. Role tidak otomatis berarti unlimited access.
7. Permission dipisahkan dari role.
8. Permission dipisahkan dari UI visibility.
9. Backend adalah enforcement point.
10. Resource ownership harus selalu divalidasi.
11. Customer hanya boleh mengakses own/authorized customer data.
12. Provider hanya boleh mengakses own business dan relevant assigned context.
13. Worker hanya boleh mengakses assigned/relevant execution context.
14. Admin memiliki operational scope.
15. CEO memiliki governance/strategic scope.
16. Customer mengambil keputusan atas own transaction-impacting actions.
17. Provider mengelola provider-side service business.
18. Worker menjalankan assigned service.
19. Admin menangani exception dan operational control.
20. CEO/Product Owner mengatur policy/governance.
21. State transition memiliki allowed actor.
22. Critical actions memiliki audit trail.
23. Additional cost approval adalah customer authority ketika customer dikenai biaya.
24. Platform policy adalah CEO/Product Owner governance.
25. Taxonomy management dilakukan melalui governance flow.
26. Provider tidak membuat arbitrary platform taxonomy.
27. AI Agent tidak dapat memperluas user permission.
28. AI bukan source of truth.
29. ML bukan source of truth.
30. Recommendation bukan booking guarantee.
31. Recommendation bukan payment authority.
32. Recommendation bukan warranty authority.
33. Recommendation bukan dispute authority.
34. Product requirement bukan product order.
35. Service order dan product order dapat berhubungan tetapi tetap domain berbeda.
36. Customer approval harus tercatat jika transaction-impacting.
37. Provider/worker actions harus memiliki scope.
38. Admin interventions harus dapat diaudit.
39. CEO configuration harus dapat diaudit.
40. Loyalty adjustment harus dapat diaudit.
41. Financial actions harus dapat diaudit.
42. Product substitution harus dapat diaudit.
43. Completion override harus dapat diaudit.
44. Warranty decision harus dapat diaudit.
45. Dispute resolution harus dapat diaudit.
46. Model deployment harus dapat diaudit.
47. Privacy mengikuti role + relationship + authorization.
48. Least privilege diterapkan.
49. Cross-role data access mengikuti need-to-know.
50. Private customer data tidak otomatis terlihat provider.
51. Provider internal data tidak otomatis terlihat customer.
52. CEO access tidak otomatis berarti unrestricted operational access.
53. Worker access tidak otomatis berarti Provider access.
54. Merchant access tidak otomatis berarti service access.
55. Supplier access tidak otomatis berarti customer access.
56. Role hierarchy tidak menggantikan business relationship check.
57. Multi-role account harus menjaga separation of context.
58. Provider dapat sekaligus worker bila individual provider.
59. Business provider dapat memiliki workers.
60. Admin dapat memiliki sub-roles.
61. Customer organization dapat memiliki sub-roles pada scale-up.
62. Shared asset membutuhkan access control.
63. History access mengikuti authorization.
64. Asset access mengikuti asset permission.
65. Execution access mengikuti assignment.
66. Product access mengikuti relation/order/procurement scope.
67. Notification recipient berdasarkan role + event + relationship.
68. Critical state changes membutuhkan audit trail.
69. Silent administrative mutation tidak diperbolehkan.
70. Silent customer charge tidak diperbolehkan.
71. Silent AI transaction tidak diperbolehkan.
72. Provider cannot bypass customer approval where required.
73. Worker cannot bypass provider authority where required.
74. Admin cannot bypass platform policy without authorized exception.
75. CEO policy cannot silently alter historical transaction records.
76. Historical data tetap dipertahankan.
77. Correction menggunakan audited action.
78. Transaction source of truth tetap berada pada domain feature masing-masing.
79. Role architecture menjadi dasar RBAC.
80. Role architecture menjadi dasar API authorization.
81. Role architecture menjadi dasar frontend route/action guards.
82. Role architecture menjadi dasar dashboard segmentation.
83. Role architecture menjadi dasar notification routing.
84. Role architecture menjadi dasar audit trail.
85. Role architecture menjadi dasar PRD.
86. Role architecture menjadi dasar database relationship.
87. Role architecture menjadi dasar integration design.
88. Feature-specific rules tetap menjadi authority untuk domain masing-masing.
89. Cross-feature handoff tidak menghapus source of truth.
90. **Role & Access Architecture #1–#19 menjadi master baseline sebelum masuk tahap Product #20–#27 dan implementasi RBAC/PRD/backend/frontend.**

---

# 301. FINAL MASTER MAP

```text
                         SERVIO
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
          CUSTOMER                   PROVIDER
              │                         │
              │                    ┌────┴────┐
              │                    ▼         ▼
              │                 MANAGER    WORKER
              │                              │
              └──────────────┬───────────────┘
                             │
                             ▼
                     SERVICE LIFECYCLE
                             │
     ┌───────────────────────┼────────────────────────┐
     ▼                       ▼                        ▼
 Discovery                Transaction              Execution
 #1–#6                     #7–#13                  #7–#10
     │                       │                        │
     └───────────────────────┼────────────────────────┘
                             ▼
                      History / Asset
                         #14–#15
                             │
                             ▼
                    Retention / Intelligence
                         #16–#18
                             │
                             ▼
                 Service + Product Integration
                           #19
                             │
                  ┌──────────┴──────────┐
                  ▼                     ▼
               MERCHANT              SUPPLIER
                  │                     │
                  └──────────┬──────────┘
                             ▼
                      PRODUCT #20–#27

                    OPERATIONAL CONTROL
                             │
                             ▼
                    ADMIN / OPERATIONS
                             │
                             ▼
                  CEO / PRODUCT OWNER
```

---

# 302. FINAL STATUS

```text
ROLE & ACCESS ARCHITECTURE
FEATURE #1–#19

STATUS:
████████████████████ LOCKED BASELINE

CANONICAL:
✅ CUSTOMER
✅ SERVICE PROVIDER
✅ ADMIN / OPERATIONS
✅ CEO / PRODUCT OWNER

OPERATIONAL ACTORS:
✅ WORKER / TECHNICIAN
✅ CUSTOMER SUPPORT
✅ FINANCE / PAYMENT OPERATIONS
✅ MERCHANT
✅ SUPPLIER

CORE FOUNDATION:
✅ Role
✅ Permission
✅ Scope
✅ Ownership
✅ Approval
✅ State Transition
✅ Privacy
✅ Audit
✅ Notification
✅ Dashboard
✅ API Authorization
✅ Cross-Feature Handoff
```

---

# 303. FINAL RULE

> **Tidak ada feature #1–#19 yang berdiri sendiri dari sisi role. Setiap feature memiliki user, operational actor, authority, supporting role, governance, access scope, dan escalation path yang harus konsisten dengan source of truth domain-nya.**

---

# 304. NEXT IMPLEMENTATION BASELINE

Urutan setelah dokumen ini:

```text
ROLE & ACCESS ARCHITECTURE #1–#19
                ↓
RBAC / Permission Matrix
                ↓
PRD per Role
                ↓
Database / ERD
                ↓
API Authorization
                ↓
Frontend Route & Dashboard
                ↓
Feature #20–#27 Product
```

**Dokumen ini menjadi master referensi role-based architecture Servio untuk seluruh Service/Jasa Feature #1–#19.**
