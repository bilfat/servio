# SERVIO — DESIGN SYSTEM
## Brand, UI, Glassmorphism, Visual Effects, Motion & Responsive System

**Status:** 🔒 FINAL DESIGN SYSTEM FOUNDATION  
**Product:** SERVIO — *More Than Service, A Better Everyday*  
**Frontend Target:** Next.js + CSS/Tailwind + Framer Motion  
**Logo Source:** `docs/logo.png`  
**Primary Font:** Sora  
**Body Font:** Plus Jakarta Sans  
**Primary Icon Direction:** Phosphor Icons — Regular / Duotone / Fill used selectively  
**Base Background:** White

---

# 1. Design System Goal

Design System SERVIO dibuat untuk menghasilkan interface yang:

- modern,
- warm,
- trustworthy,
- human-centered,
- premium,
- clean,
- ringan,
- mudah dipahami,
- konsisten antar-role,
- responsif pada seluruh ukuran layar.

Visual SERVIO tidak boleh terasa seperti dashboard enterprise yang kaku dan tidak boleh terasa seperti marketplace generik.

Arah visual:

```text
TRUST
+
WARMTH
+
MODERN
+
HUMAN
+
PREMIUM
=
SERVIO
```

---

# 2. Brand Personality

Empat karakter utama:

| Character | Meaning | Visual Direction |
|---|---|---|
| Trusted | Dapat dipercaya | Deep Blue, clean layout, stable motion |
| Human | Berorientasi manusia | Coral, rounded shapes, friendly microcopy |
| Positive | Memberikan dampak baik | Soft Sky, warm light, subtle glow |
| Modern | Inovatif & relevan | Glassmorphism, gradient, smooth motion |

Brand statement:

> **More Than Service, A Better Everyday**

Supporting tone:

> People Home Solution Together

---

# 3. Visual Direction

## 3.1 Overall Look

SERVIO menggunakan kombinasi:

```text
White Base
+
Deep Blue
+
Coral
+
Soft Sky
+
Warm Ivory
+
Subtle Gradient
+
Glassmorphism
+
Soft Shadow
+
Fluid Motion
```

Visual harus terasa:

```text
Clean
    ↓
Soft
    ↓
Layered
    ↓
Premium
    ↓
Human
```

---

# 4. Color Foundation

## 4.1 Main Color Palette

| Token | Hex | Role |
|---|---|---|
| `--color-primary` | `#0F4C81` | Primary / Deep Blue |
| `--color-secondary` | `#F43F5E` | Secondary / Coral |
| `--color-sky` | `#E0F2FE` | Supporting / Soft Sky |
| `--color-ivory` | `#FFF8F1` | Supporting / Warm Ivory |

### Meaning

### Deep Blue — `#0F4C81`

Use for:

- primary CTA,
- navigation,
- headings when emphasis is needed,
- active controls,
- trust-oriented visual.

Meaning:

```text
Kepercayaan
Profesionalisme
Stabilitas
```

### Coral — `#F43F5E`

Use for:

- secondary CTA,
- highlights,
- emotional emphasis,
- promotional surfaces,
- selected states.

Meaning:

```text
Kehangatan
Kepedulian
Energi Positif
```

### Soft Sky — `#E0F2FE`

Use for:

- soft background,
- information area,
- visual breathing space,
- AI/helper context,
- empty-state support.

Meaning:

```text
Ketenangan
Kebersihan
Modern
```

### Warm Ivory — `#FFF8F1`

Use for:

- warm section background,
- hospitality / home-oriented cards,
- service storytelling surfaces.

Meaning:

```text
Kenyamanan
Ramah
Warm
```

---

# 5. Neutral Palette

| Token | Hex | Usage |
|---|---|---|
| `--text-primary` | `#172033` | Headings, key text |
| `--text-secondary` | `#64748B` | Description, supporting text |
| `--border-default` | `#E2E8F0` | Border, divider, input |
| `--background` | `#FFFFFF` | Main background |

Recommended additional derived neutrals:

```text
--surface-subtle: #F8FAFC
--surface-soft: #F1F5F9
--text-muted: #94A3B8
--text-disabled: #CBD5E1
--border-strong: #CBD5E1
```

Derived neutrals are utility shades, not replacements for the primary brand palette.

---

# 6. Semantic Accent Palette

| Token | Hex | Meaning |
|---|---|---|
| `--success` | `#10B981` | Success / completed |
| `--warning` | `#F59E0B` | Warning / attention |
| `--error` | `#EF4444` | Error / failed |
| `--info` | `#8B5CF6` | Information / insight |

Rules:

```text
Success → green only
Warning → amber only
Error → red only
Info → purple only
```

Do not use semantic colors as decorative brand colors.

---

# 7. Color Proportion

Base visual proportion mengikuti direction board:

```text
Background / White     65%
Deep Blue              15%
Coral                   7%
Soft Sky                8%
Warm Ivory              5%
```

Ini bukan hard pixel ratio.

Ini adalah visual guidance agar interface tidak terlalu berwarna.

---

# 8. Background System

## 8.1 Default

Main application background:

```text
#FFFFFF
```

White harus tetap menjadi dominant background.

---

## 8.2 Ambient Gradient

Gradient digunakan sebagai **ambient layer**, bukan menggantikan background putih.

Pattern:

```text
White Background
+
Very Soft Coral Glow
+
Very Soft Blue Glow
```

Contoh visual:

```text
┌────────────────────────────────────────┐
│  soft coral glow       soft blue glow  │
│                                        │
│            WHITE SURFACE               │
│                                        │
│      Content / Cards / Dashboard       │
│                                        │
└────────────────────────────────────────┘
```

Opacity ambient:

```text
6% – 16%
```

---

# 9. Primary Gradient

Primary brand gradient:

```text
#F43F5E
      ↓
#0F4C81
```

Direction default:

```text
135deg
```

Usage:

- hero accent,
- primary promotional CTA,
- logo supporting surface,
- selected highlight,
- premium feature,
- AI highlight,
- empty-state illustration background.

Do not use primary gradient on every button.

---

# 10. Soft Gradient

Soft gradient direction:

```text
Coral at low opacity
        ↓
Soft Sky
        ↓
White
```

Recommended visual effect:

```text
Coral 8–12%
+
Soft Sky 8–14%
+
White
```

Use for:

- hero background,
- dashboard top area,
- AI assistant area,
- onboarding,
- empty state.

---

# 11. Background Gradient Rules

### Allowed

```text
White base
+
radial gradient
+
subtle blur
```

### Avoid

```text
Full-screen saturated gradient
```

because it decreases:

- readability,
- trust,
- visual hierarchy.

---

# 12. Mesh / Aurora Background

Optional premium layer:

```text
White
+
Blurred Coral Blob
+
Blurred Deep Blue Blob
+
Soft Sky Blob
```

Characteristics:

```text
blur: 60px–120px
opacity: 4%–12%
pointer-events: none
```

Blob tidak boleh mengganggu text readability.

---

# 13. Typography System

## 13.1 Primary Display Font

### Sora

Digunakan untuk:

- hero heading,
- page heading,
- section heading,
- large numeric KPI,
- strong product/service statement.

Personality:

```text
Geometric
Modern
Confident
Distinctive
```

---

## 13.2 Body Font

### Plus Jakarta Sans

Digunakan untuk:

- paragraph,
- body,
- form,
- table,
- navigation,
- button,
- label,
- helper text.

Personality:

```text
Friendly
Readable
Modern
Indonesian-friendly
```

---

# 14. Typography Scale

| Token | Size | Line Height | Usage |
|---|---:|---:|---|
| Display XL | 56px | 1.05 | Hero |
| Display L | 48px | 1.08 | Major hero |
| H1 | 40px | 1.10 | Page title |
| H2 | 32px | 1.15 | Section title |
| H3 | 24px | 1.20 | Subsection |
| H4 | 20px | 1.25 | Card title |
| Body L | 18px | 1.60 | Intro |
| Body | 16px | 1.55 | Default |
| Body S | 14px | 1.50 | Supporting |
| Caption | 12px | 1.40 | Metadata |

Mobile typography should scale fluidly rather than simply shrinking every value by the same ratio.

---

# 15. Typography Weight

```text
Regular   400
Medium    500
SemiBold  600
Bold      700
```

Recommended:

```text
Hero / H1 → 600–700
H2 / H3   → 600
Body      → 400
Label     → 500–600
Button    → 600
```

---

# 16. Text Color Hierarchy

```text
Primary
#172033

Secondary
#64748B

Muted
#94A3B8

Disabled
#CBD5E1
```

Rule:

> Jangan menggunakan Deep Blue untuk semua teks.

Deep Blue digunakan sebagai brand emphasis; `#172033` tetap menjadi primary text color.

---

# 17. Logo System

## Master Logo

Source:

```text
docs/logo.png
```

Logo tidak boleh:

- direcolor sembarangan,
- diputar,
- diberi shadow berat,
- diberi outline,
- dipisahkan symbol dan wordmark tanpa kebutuhan system,
- ditempatkan di background yang menurunkan kontras.

---

# 18. Logo Usage

Recommended placement:

```text
Navbar
Sidebar
Auth
Landing
Footer
Splash / Loading
```

Minimum clear space:

```text
0.5× tinggi symbol
```

Clear space harus dijaga pada seluruh sisi.

---

# 19. Logo on Background

Best:

```text
White
Very Light Sky
Very Light Ivory
```

Allowed:

```text
Deep Blue / dark surface
```

dengan asset logo variant yang memiliki contrast sesuai.

---

# 20. App Icon

App icon menggunakan symbol SERVIO.

Base:

```text
White / very light surface
+
SERVIO symbol
```

Corner radius mengikuti platform device.

---

# 21. Icon System

## Primary Icon Library

**Phosphor Icons**

Recommended weights:

```text
Regular
Duotone
Fill
```

Penggunaan:

### Regular

Default UI.

### Duotone

Feature cards / premium sections / onboarding.

### Fill

Active navigation / selected / status icon.

---

# 22. Icon Style Rules

Jangan mencampur banyak icon family dalam satu surface.

Avoid:

```text
Lucide
+
Font Awesome
+
Material Icons
+
Random SVG
```

dalam satu halaman.

One visual language:

```text
Phosphor
↓
consistent stroke
↓
consistent geometry
```

---

# 23. Icon Size

| Context | Size |
|---|---:|
| Inline | 16px |
| Small control | 18px |
| Button | 18–20px |
| Navigation | 20–22px |
| Card | 24px |
| Feature | 28–32px |
| Hero | 40–48px |
| Decorative | 56px+ |

Touch target:

```text
minimum 44 × 44px
```

Icon boleh 18–24px di dalam button 44px.

---

# 24. Icon Semantic Mapping

| Context | Recommended visual |
|---|---|
| Service | Tool / Wrench / Gear family |
| Home | House family |
| Cleaning | Sparkles / Spray |
| Automotive | Car / Motorcycle |
| Repair | Wrench / Hammer |
| Maintenance | Gear / Calendar |
| Location | MapPin |
| Schedule | Calendar |
| Payment | CreditCard / Wallet |
| Product | Package |
| Inventory | Boxes / Stack |
| Shipping | Truck |
| Return | ArrowUUpLeft / Package |
| AI | Sparkle / MagicWand |
| Success | CheckCircle |
| Warning | Warning |
| Error | XCircle |
| Info | Info |

Use icons according to semantics, not decoration.

---

# 25. Border Radius System

SERVIO menggunakan rounded visual.

```text
xs   6px
sm   8px
md   12px
lg   16px
xl   20px
2xl  24px
3xl  32px
pill 9999px
```

Usage:

```text
Input          12px
Button         12–14px
Card           16–20px
Large card     20–24px
Modal          24px
Hero           24–32px
Chip           9999px
```

---

# 26. Spacing System

Base:

```text
4px
```

Scale:

```text
4
8
12
16
20
24
32
40
48
64
80
96
120
```

Rules:

```text
Page padding:
16px mobile
24px tablet
32–48px desktop
```

Container content width:

```text
max-width: 1280px
```

for general applications.

---

# 27. Grid System

Desktop:

```text
12-column grid
```

Tablet:

```text
8-column grid
```

Mobile:

```text
4-column grid
```

Gutter:

```text
Desktop: 24px
Tablet: 20px
Mobile: 16px
```

---

# 28. Responsive Breakpoints

Recommended:

```text
xs  360px
sm  640px
md  768px
lg  1024px
xl  1280px
2xl 1536px
```

Primary design decisions:

```text
Mobile
→ single column

Tablet
→ adaptive 2-column

Desktop
→ multi-column / dashboard layout
```

---

# 29. Responsive Principles

Never design:

```text
Desktop
↓
shrink everything
↓
Mobile
```

Instead:

```text
Mobile-first structure
+
Fluid sizing
+
Progressive enhancement
```

---

# 30. Mobile Navigation

Customer:

```text
Home
Explore
Orders
Activity
Profile
```

Provider:

```text
Dashboard
Orders
Services
Messages
Profile
```

Additional role surfaces may use role-specific navigation.

Desktop may use:

```text
Sidebar
+
Topbar
```

Mobile may use:

```text
Bottom Navigation
+
Contextual Header
```

---

# 31. Glassmorphism Foundation

Glassmorphism digunakan sebagai **secondary visual layer**, bukan seluruh interface.

Core recipe:

```text
background:
rgba(255,255,255,0.72–0.84)

backdrop-filter:
blur(18px–28px)

border:
1px solid rgba(255,255,255,0.55)

shadow:
soft / layered
```

---

# 32. Glass Variants

## Glass Light

```text
rgba(255,255,255,0.80)
```

Use:

- navbar,
- floating toolbar,
- cards over gradient.

## Glass Soft

```text
rgba(255,255,255,0.68)
```

Use:

- hero overlays,
- promotional cards.

## Glass Dark

Only for special visual context:

```text
rgba(23,32,51,0.78)
```

Use sparingly.

---

# 33. Glassmorphism Rules

Glass element must sit above a visual context.

Good:

```text
Gradient / Aurora
       ↓
Glass Card
```

Weak:

```text
White Background
       ↓
Glass Card
```

Jika background putih polos, gunakan normal solid surface daripada glass.

---

# 34. Glass Border

Glass border:

```text
rgba(255,255,255,0.50–0.70)
```

Optional colored glow:

```text
Coral 8%
Blue 8%
```

Jangan menggunakan saturated border.

---

# 35. Elevation System

| Level | Shadow | Usage |
|---|---|---|
| E0 | none | Flat |
| E1 | subtle | Card |
| E2 | soft | Dropdown |
| E3 | medium | Modal |
| E4 | strong-soft | Floating panel |

Shadow harus blur dan natural.

Avoid:

```text
hard black shadow
```

---

# 36. Card System

Card hierarchy:

```text
Card / Base
Card / Elevated
Card / Glass
Card / Interactive
Card / Featured
Card / Highlight
```

---

# 37. Service Card

Service Card minimum:

```text
Image / Icon
Service Name
Category
Short Description
Rating
Price / Price Type
Distance / Availability
CTA
```

Optional:

```text
Verified badge
Popular badge
AI Match badge
Favorite
```

---

# 38. Provider Card

Provider Card:

```text
Avatar / Logo
Provider Name
Verified
Rating
Review Count
Primary Service
Distance
Availability
Starting Price
CTA
```

Optional:

```text
Response Time
Experience
Certification
Favorite
```

---

# 39. Product Card

Product Card:

```text
Product Image
Product Name
Brand
Price
Stock Signal
Seller
Rating
Compatibility
```

Service-related context:

```text
Compatible with your service
```

---

# 40. Button System

Variants:

```text
Primary
Secondary
Outline
Ghost
Soft
Danger
Success
Gradient
```

Primary:

```text
Deep Blue
```

Secondary:

```text
Coral
```

Gradient:

```text
Coral → Deep Blue
```

---

# 41. Primary Button

Default:

```text
Background: #0F4C81
Text: #FFFFFF
```

Hover:

```text
slightly darker / lift
```

Active:

```text
scale 0.98
```

Focus:

```text
visible focus ring
```

---

# 42. Coral Button

Use for:

- emotional CTA,
- promotion,
- discovery CTA.

Do not replace primary action with coral everywhere.

---

# 43. Gradient Button

Use for:

- AI,
- featured action,
- premium highlight,
- hero CTA.

Not for:

- every button,
- destructive action.

---

# 44. Input System

Input style:

```text
white surface
border #E2E8F0
radius 12px
```

Focus:

```text
border Deep Blue
+
soft blue ring
```

Error:

```text
border Error
+
error helper text
```

Success:

```text
border Success
```

---

# 45. Search Input

Search is a high-priority control.

Style:

```text
Large radius
soft shadow
subtle gradient halo
```

Placeholder:

> Cari jasa, provider, produk, atau ceritakan masalahmu...

---

# 46. Chip / Tag

Variants:

```text
Neutral
Brand
Soft Blue
Coral
Success
Warning
```

Use pill shape.

Do not use too many colors in one card.

---

# 47. Badge

Examples:

```text
Verified
Recommended
Popular
New
AI Match
Available Now
Low Stock
```

AI badge should visually distinguish itself without looking like an error/status badge.

---

# 48. Status Badge

Semantic mapping:

```text
Success → #10B981
Warning → #F59E0B
Error → #EF4444
Info → #8B5CF6
```

Status text must still be explicit.

Do not communicate state using color only.

---

# 49. Navbar System

Desktop:

```text
Logo
Search
Navigation
Notifications
Context / Role
Avatar
```

Example:

```text
SERVIO
[ Search services... ]

Explore
Orders
Messages

[Notification]
[Avatar]
```

Glass navbar may be used over hero/ambient background.

---

# 50. Sidebar

Dashboard sidebar:

```text
Brand
Workspace / Role
Navigation
Feature Group
Help
User Profile
```

Active item:

```text
Soft blue / Deep Blue emphasis
```

Coral may be used as small active accent.

---

# 51. Dashboard Layout

Desktop:

```text
Sidebar
      ↓
Main Content

Topbar
      ↓
Page Header
      ↓
KPI / Summary
      ↓
Primary Content
      ↓
Secondary Content
```

Mobile:

```text
Top Header
↓
Summary
↓
Primary Content
↓
Bottom Navigation
```

---

# 52. Hero System

Hero should feel premium but lightweight.

Structure:

```text
Eyebrow
Heading
Description
Primary CTA
Secondary CTA
Visual / Illustration
Ambient Gradient
```

Example:

```text
Temukan bantuan yang tepat.

Dari masalah kecil sampai kebutuhan besar,
SERVIO membantu kamu menemukan orang yang tepat.

[ Cari Jasa ]
[ Ceritakan Masalah ]
```

---

# 53. AI Assistant Surface

AI / Smart Discovery uses:

```text
Soft Sky
+
Coral-to-Blue subtle gradient
+
Glass panel
+
Sparkle icon
```

Input flow:

```text
Tell us your problem
        ↓
AI questions
        ↓
Structured understanding
        ↓
Recommended service
        ↓
Recommended provider
```

AI UI must communicate recommendation, not certainty.

---

# 54. Page Background Pattern

Recommended:

```text
<body>
    white
    + very subtle ambient gradient
</body>
```

Hero may use:

```text
radial coral
+
radial sky
+
white
```

Dashboard pages mostly:

```text
white
+
soft sky section
```

---

# 55. Section Background

Alternating section surfaces:

```text
White
Soft Sky
White
Warm Ivory
White
```

Do not create colorful stripes everywhere.

---

# 56. Visual Effects

Allowed visual effects:

```text
Ambient Glow
Mesh Gradient
Glassmorphism
Soft Blur
Card Elevation
Gradient Border
Gradient Text
Spotlight
Shimmer
Micro Glow
```

---

# 57. Gradient Border

Premium card can use:

```text
1px gradient border
```

Implementation approach:

```text
pseudo-element
+
gradient background
+
inner white surface
```

Use sparingly.

---

# 58. Spotlight Effect

Interactive card:

```text
mouse position
↓
soft radial highlight
```

Constraints:

```text
opacity low
pointer-events none
mobile disabled
```

The effect must never distract from information.

---

# 59. Shimmer

Use for:

```text
skeleton
AI processing
loading content
premium loading
```

Shimmer should be subtle.

---

# 60. Noise Texture

Optional ultra-light texture:

```text
opacity: 1–2%
```

Use only on premium hero or special surfaces.

Avoid strong grain.

---

# 61. Animation System

Primary animation library:

```text
Framer Motion
```

CSS remains responsible for:

```text
simple hover
color transition
focus
transform
non-layout micro interactions
```

Framer Motion handles:

```text
page transition
layout animation
stagger
modal
drawer
shared layout
complex interaction
scroll reveal
```

---

# 62. Motion Principles

SERVIO animation must feel:

```text
Smooth
Soft
Purposeful
Fast enough
Not distracting
```

Avoid:

```text
Excessive bounce
Long entrance animation
Random spinning
Constant movement
```

---

# 63. Motion Duration

```text
Instant      80ms
Micro       120ms
Fast        180ms
Default     220ms
Comfort     280ms
Complex     360ms
Hero        450–600ms
```

---

# 64. Motion Easing

Recommended:

```text
Ease Out
Ease In Out
Custom cubic-bezier
```

Default:

```text
cubic-bezier(0.22, 1, 0.36, 1)
```

For exit:

```text
cubic-bezier(0.4, 0, 1, 1)
```

Avoid overly springy motion for professional UI.

---

# 65. Page Entrance

Pattern:

```text
opacity 0
y 16
↓
opacity 1
y 0
```

Duration:

```text
220–360ms
```

Hero may use:

```text
stagger 60–90ms
```

---

# 66. Stagger System

Example:

```text
Heading
↓
Description
↓
CTA
↓
Visual
```

Stagger:

```text
50–80ms
```

Card grid:

```text
max 40–60ms stagger
```

Never delay large lists excessively.

---

# 67. Card Hover

Desktop:

```text
y: -3px
scale: 1.01
shadow increase
```

Duration:

```text
180–220ms
```

Mobile:

```text
disable hover-only movement
```

---

# 68. Button Interaction

Hover:

```text
brightness / shadow / translateY(-1px)
```

Press:

```text
scale(0.98)
```

Duration:

```text
100–150ms
```

---

# 69. Modal Animation

Enter:

```text
opacity 0 → 1
scale 0.97 → 1
y 8 → 0
```

Backdrop:

```text
opacity 0 → 1
```

Exit:

```text
reverse
```

Duration:

```text
180–240ms
```

---

# 70. Drawer Animation

Desktop:

```text
x ± 100% → 0
```

Mobile:

```text
y 100% → 0
```

Use bottom sheet behavior on mobile where appropriate.

---

# 71. Accordion

```text
height auto
opacity
```

Do not animate enormous content containers if unnecessary.

---

# 72. Skeleton Loading

Skeleton should use:

```text
surface subtle
+
soft shimmer
```

Skeleton shape must mimic final content.

Bad:

```text
one generic rectangle
```

Good:

```text
avatar
title
metadata
button
image
```

---

# 73. Toast

Toast entry:

```text
opacity
y 12 → 0
```

Success:

```text
green accent
```

Error:

```text
red accent
```

Information:

```text
purple accent
```

Toast must not block critical actions.

---

# 74. Progress Animation

For multi-step processes:

```text
Booking
→ Payment
→ Execution
→ Completion
```

use:

```text
stepper
+
progress
+
micro transition
```

Never rely on animation alone to communicate status.

---

# 75. Skeleton → Content Transition

Do not abruptly replace skeleton.

Use:

```text
Skeleton fade
+
content fade/slide
```

Keep transition short.

---

# 76. AI Processing Animation

AI processing can use:

```text
Sparkle
+
soft pulse
+
gradient glow
```

Example:

```text
Understanding your problem...
✦
```

The AI animation must stop immediately after result.

---

# 77. Real-Time State Animation

For tracking:

```text
status update
↓
soft pulse
↓
new status
```

No flashing.

---

# 78. Notification Animation

Unread dot:

```text
subtle pulse
```

Avoid continuous motion after notification has been seen.

---

# 79. Reduced Motion

Must support:

```text
prefers-reduced-motion
```

When enabled:

```text
disable large transform
disable parallax
disable spotlight
reduce stagger
reduce duration
```

---

# 80. Scroll Reveal

Use for:

- marketing sections,
- landing,
- onboarding,
- feature showcase.

Do not use for:

- every table row,
- every dashboard element,
- long lists.

---

# 81. Interaction Feedback

Every meaningful interaction should have:

```text
Hover
Focus
Pressed
Loading
Success
Error
Disabled
```

For touch devices, replace hover dependence with:

```text
press
selected
active
```

---

# 82. Accessibility

## Contrast

Text must maintain accessible contrast.

Primary text:

```text
#172033 on #FFFFFF
```

Secondary text:

```text
#64748B on #FFFFFF
```

Use semantic colors carefully on white backgrounds.

---

# 83. Focus State

Every interactive element needs visible focus.

Recommended:

```text
2px focus ring
+
2px offset
```

Primary focus:

```text
Soft Blue / Deep Blue
```

---

# 84. Touch Target

Minimum:

```text
44 × 44px
```

Preferred:

```text
48 × 48px
```

especially for mobile navigation.

---

# 85. Form UX

Forms should provide:

```text
Label
Input
Helper
Error
Success
Loading
```

Never rely only on placeholder text.

---

# 86. Empty State

Empty state:

```text
Icon / Illustration
Title
Explanation
Primary CTA
Optional secondary action
```

Example:

```text
Belum ada pesanan

Pesanan jasa atau barang kamu akan muncul di sini.

[ Cari Jasa ]
```

---

# 87. Error State

Error state:

```text
Icon
Title
Clear explanation
Retry
Support / alternative
```

Never show raw API error.

Bad:

```text
500 INTERNAL SERVER ERROR
```

Better:

```text
Data belum dapat dimuat.
Coba lagi dalam beberapa saat.

[ Coba Lagi ]
```

---

# 88. Offline State

For mobile / network-sensitive flows:

```text
Connection Lost
↓
Last Known State
↓
Retry
```

Tracking:

```text
Last updated 10:42
```

Do not fake real-time state.

---

# 89. Stale Data

When data is old but usable:

```text
Last updated
```

and optionally:

```text
Refresh
```

Do not silently present stale tracking as live.

---

# 90. Loading Hierarchy

Use the smallest appropriate loading surface.

```text
Button action
→ Button spinner

Card
→ Card skeleton

Page
→ Page skeleton

Route transition
→ subtle top progress / transition
```

Do not block the entire page for a tiny action.

---

# 91. Component Architecture

No page should contain all UI in one huge file.

Structure:

```text
Page
 ↓
Section
 ↓
Feature Component
 ↓
Shared Component
 ↓
Primitive
```

Example:

```text
ServiceDetailPage
├── ServiceHero
│   ├── ServiceBadge
│   ├── RatingSummary
│   └── PrimaryCTA
│
├── ServiceOverview
├── ServicePricing
├── ServiceAvailability
├── ServiceProviderCard
├── ServiceGallery
├── ServiceFAQ
└── BookingCTA
```

---

# 92. Component Layers

## Layer 1 — UI Primitives

```text
Button
Input
Textarea
Select
Checkbox
Radio
Switch
Badge
Avatar
Icon
Tooltip
Dialog
Drawer
Tabs
Accordion
Skeleton
Separator
```

---

# 93. Layer 2 — Shared Components

```text
AppShell
Topbar
Sidebar
BottomNav
PageHeader
SectionHeader
SearchBar
FilterBar
DataTable
EmptyState
ErrorState
LoadingState
StatusBadge
PriceDisplay
RatingDisplay
LocationDisplay
UserAvatar
```

---

# 94. Layer 3 — Domain Components

```text
ServiceCard
ProviderCard
ProductCard
BookingCard
OrderCard
QuotationCard
PaymentCard
ExecutionTimeline
TrackingMap
ProofGallery
CompletionCard
WarrantyCard
AssetCard
MaintenanceCard
ReturnCard
RefundCard
```

---

# 95. Layer 4 — Feature Compositions

Example:

```text
DiscoveryPanel
BookingFlow
QuotationWorkspace
PaymentSummary
ExecutionWorkspace
TrackingWorkspace
ReturnWorkspace
AIServiceMatcher
```

---

# 96. Page Composition Rule

A page should be composed.

Bad:

```text
page.tsx
2000 lines
```

Good:

```text
page.tsx
├── Header
├── MainSection
├── Sidebar
├── FeaturePanel
└── CTA
```

Each complex area becomes its own component.

---

# 97. Component File Rule

Recommended:

```text
ComponentName.tsx
ComponentName.types.ts
ComponentName.test.tsx
```

Only create additional files when complexity requires them.

---

# 98. Feature Folder Pattern

Example:

```text
features/
└── booking/
    ├── components/
    │   ├── BookingForm.tsx
    │   ├── BookingSummary.tsx
    │   └── BookingStep.tsx
    ├── hooks/
    ├── lib/
    ├── types/
    └── index.ts
```

---

# 99. Next.js Application Structure

Recommended App Router architecture:

```text
src/
├── app/
│   ├── (marketing)/
│   ├── (auth)/
│   ├── (customer)/
│   ├── (provider)/
│   ├── (worker)/
│   ├── (support)/
│   ├── (finance)/
│   ├── (merchant)/
│   ├── (supplier)/
│   ├── (admin)/
│   ├── (ceo)/
│   ├── layout.tsx
│   ├── not-found.tsx
│   └── error.tsx
│
├── components/
│   ├── ui/
│   ├── shared/
│   ├── layout/
│   └── visual/
│
├── features/
│   ├── discovery/
│   ├── booking/
│   ├── order/
│   ├── pricing/
│   ├── communication/
│   ├── payment/
│   ├── execution/
│   ├── tracking/
│   ├── proof/
│   ├── completion/
│   ├── rating/
│   ├── dispute/
│   ├── warranty/
│   ├── service-history/
│   ├── asset/
│   ├── maintenance/
│   ├── loyalty/
│   ├── ai/
│   ├── service-product/
│   ├── product/
│   ├── cart/
│   ├── product-order/
│   ├── inventory/
│   ├── fulfillment/
│   ├── shipping/
│   └── return/
│
├── hooks/
├── lib/
├── providers/
├── config/
├── types/
├── mocks/
├── styles/
└── utils/
```

---

# 100. Styling Architecture

Recommended:

```text
Tailwind CSS
+
CSS Variables
+
small amount of component-scoped CSS when necessary
```

Design tokens should be defined as CSS variables.

Example categories:

```text
colors
spacing
radius
shadow
motion
typography
z-index
```

---

# 101. CSS Token Principle

Do not repeatedly hardcode:

```text
#0F4C81
#F43F5E
```

inside components.

Use tokens:

```text
var(--color-primary)
var(--color-secondary)
```

This keeps the design system maintainable.

---

# 102. Z-Index System

Recommended levels:

```text
base        0
raised      10
dropdown    100
sticky      200
header      300
overlay     500
modal       600
toast       700
tooltip     800
```

Keep z-index values centralized.

---

# 103. Layering

Visual hierarchy:

```text
Base
↓
Ambient Background
↓
Content
↓
Cards
↓
Sticky Header
↓
Dropdown
↓
Overlay
↓
Modal
↓
Toast
```

---

# 104. Page Shells

Core shells:

```text
MarketingShell
AuthShell
CustomerShell
ProviderShell
WorkerShell
SupportShell
FinanceShell
MerchantShell
SupplierShell
AdminShell
CEOShell
```

Each shell reuses:

```text
Topbar
Sidebar
Content Container
Responsive Navigation
```

but has role-specific navigation.

---

# 105. Customer Visual Language

Customer interface should feel:

```text
Warm
Simple
Helpful
Mobile-first
Discoverable
```

Prioritize:

```text
Search
Discovery
Recommendations
Orders
Tracking
History
Maintenance
Return
```

---

# 106. Provider Visual Language

Provider interface should feel:

```text
Operational
Professional
Fast
Action-oriented
```

Prioritize:

```text
Orders
Bookings
Quotations
Execution
Proof
Product
Earnings / Payment context
Warranty
```

---

# 107. Worker Visual Language

Worker interface should feel:

```text
Focused
Large touch targets
Minimal distractions
Task-oriented
```

Prioritize:

```text
Today's Jobs
Current Execution
Navigation
Checklist
Proof
Status
Communication
```

---

# 108. Support Visual Language

Support:

```text
Information-dense
Clear
Searchable
Operational
```

Prioritize:

```text
Cases
Customer
Order
Communication
Dispute
Return
Warranty
```

---

# 109. Finance Visual Language

Finance:

```text
Dense but calm
Precise
Data-oriented
```

Prioritize:

```text
Payments
Refunds
Payout
Reconciliation
Financial reports
```

Avoid excessive decorative gradients.

---

# 110. Merchant Visual Language

Merchant:

```text
Commerce
Catalog
Inventory
Fulfillment
Shipping
Return
```

Visual:

```text
Clean
Data-rich
Action-oriented
```

---

# 111. Supplier Visual Language

Supplier:

```text
Supply-chain
Inventory
Order
Fulfillment
Shipping
Return
```

Keep the same SERVIO identity but avoid unnecessary customer-facing marketing decoration.

---

# 112. Admin Visual Language

Admin:

```text
Operational
Dense
Structured
```

Use:

```text
Table
Filter
Status
Timeline
Audit
```

---

# 113. CEO Visual Language

CEO:

```text
Strategic
High-level
Premium
Calm
```

Prioritize:

```text
KPI
Trend
Category
Revenue
Demand
Supply
Performance
```

Use gradient sparingly for strategic highlight cards.

---

# 114. Service Discovery UI

Recommended hierarchy:

```text
Hero Search
↓
Category
↓
Smart Discovery
↓
Recommended Services
↓
Nearby Providers
↓
Popular
↓
Recent
```

Primary interaction:

```text
Search
```

---

# 115. Booking UI

Booking should minimize friction.

```text
Service
↓
Location
↓
Schedule / Mode
↓
Requirements
↓
Price / Quotation
↓
Confirmation
```

Use a progressive form.

Do not show every advanced field at once.

---

# 116. Quotation UI

Quotation must feel formal and clear.

Show:

```text
Provider
Scope
Included
Excluded
Price
Fee
Validity
Revision
Actions
```

Important CTA:

```text
Accept Quote
Request Revision
Reject
```

---

# 117. Payment UI

Payment:

```text
Summary
Amount
Payment Method
Deadline
Countdown
Protection
Confirm
```

Countdown must visually emphasize deadline but must not use alarmist animation.

---

# 118. Service Execution UI

Worker-focused:

```text
Job Header
Customer / Location
Task
Checklist
Materials
Progress
Proof
Issue
Complete
```

Use large controls.

---

# 119. Tracking UI

Customer:

```text
Provider
Status
ETA
Map
Timeline
Contact
Share
```

Do not make the map dominate if the actual business state is more important.

---

# 120. Proof UI

Structure:

```text
Before
During
After
Checklist
Measurements
Tests
Report
Customer Review
```

Use gallery cards.

---

# 121. Completion UI

Customer must explicitly distinguish:

```text
CONFIRM COMPLETION
```

from:

```text
REPORT AN ISSUE
```

Buttons should be visually clear but balanced.

---

# 122. Rating UI

Rating:

```text
5-star
+
optional dimensions
+
review text
+
media
```

Use warm feedback interaction.

Do not pressure positive rating.

---

# 123. Dispute UI

Dispute should feel:

```text
calm
evidence-based
transparent
```

Timeline:

```text
Issue
↓
Evidence
↓
Response
↓
Investigation
↓
Resolution
```

Avoid visually aggressive red everywhere.

---

# 124. Warranty UI

Show:

```text
Coverage
Start
End
Conditions
Claim
Status
History
```

Use green/blue for active protection, not excessive gradients.

---

# 125. Service History UI

Use a timeline:

```text
Asset
↓
Service
↓
Date
↓
Provider
↓
Work
↓
Result
↓
Warranty
```

Digital logbook feeling.

---

# 126. Asset UI

Asset page:

```text
Asset Identity
Condition
Components
Service History
Warranty
Maintenance
Documents
```

Use strong hierarchy around asset identity.

---

# 127. Maintenance UI

Primary components:

```text
Next Maintenance
Due Date
Overdue
Reminder
Maintenance Plan
Book Service
```

Important:

```text
OVERDUE ≠ BROKEN
```

Avoid alarmist red for every overdue item.

---

# 128. Loyalty UI

Loyalty surface:

```text
Point Balance
Progress
Reward
History
Redeem
```

Gamification should remain premium and not childish.

---

# 129. AI Recommendation UI

Recommendation card:

```text
Why this is recommended
+
Match reason
+
Relevant data
+
Action
```

Example:

```text
Recommended for your AC issue

AC Diagnosis & Repair

Why:
✓ matches your symptoms
✓ available near you
✓ supports home service

[ Lihat Layanan ]
```

---

# 130. Product Discovery UI

Product card should clearly separate:

```text
Product
Variant
Seller
Price
Stock
Compatibility
```

Compatibility should be explicit.

---

# 131. Cart UI

Cart:

```text
Seller
Product
Variant
Quantity
Price
Validation
Context
```

Validation state:

```text
Price Changed
Out of Stock
Requires Approval
Compatibility Conflict
```

Do not silently modify cart.

---

# 132. Product Order UI

Order detail:

```text
Order Number
Seller
Items
Price
Payment
Fulfillment
Shipment
ETA
Return
```

Keep domain states visually separated.

---

# 133. Inventory UI

Merchant/provider/admin inventory:

```text
Product
Location
On Hand
Reserved
Allocated
Available
Unavailable
```

Use numeric clarity.

---

# 134. Fulfillment UI

Fulfillment timeline:

```text
Ready to Pick
↓
Picking
↓
Verification
↓
Packing
↓
Quality Check
↓
Ready
↓
Handover
```

Task-oriented visual.

---

# 135. Shipping UI

Customer:

```text
Shipment
Carrier
Tracking
ETA
Timeline
POD
```

Merchant:

```text
Shipment
Package
Carrier
Exception
SLA
```

---

# 136. Return UI

Return flow:

```text
Select Item
↓
Quantity
↓
Reason
↓
Evidence
↓
Eligibility
↓
Resolution
↓
Return Tracking
↓
Inspection
↓
Refund / Replacement
```

Do not combine every step into one huge form.

---

# 137. Responsive Tables

On mobile, avoid forcing desktop tables.

Patterns:

```text
Table
→ Card List
```

or:

```text
Table
→ Horizontal Scroll
```

depending on data density.

---

# 138. Responsive Forms

Desktop:

```text
2 columns
```

Mobile:

```text
1 column
```

Complex stepper:

```text
Desktop:
horizontal

Mobile:
vertical / compact progress
```

---

# 139. Responsive Modals

Desktop:

```text
center modal
```

Mobile:

```text
bottom sheet
```

for action-oriented flows.

Confirmation dialogs may remain centered when appropriate.

---

# 140. Responsive Sidebar

Desktop:

```text
expanded
```

Medium:

```text
collapsed
```

Mobile:

```text
hidden
→ bottom navigation / drawer
```

---

# 141. Performance

Visual effects must not destroy performance.

Rules:

```text
Blur only where needed
Large backdrop-filter surfaces limited
Animations GPU-friendly
Avoid layout thrashing
Lazy-load heavy visuals
Disable expensive effects on low-power/mobile contexts
```

---

# 142. Image Strategy

Use:

```text
Next.js Image
```

for product/service/provider images.

Use:

```text
blur placeholder
aspect ratio
lazy loading
```

Avoid layout shift.

---

# 143. Animation Performance

Prefer:

```text
transform
opacity
```

Avoid animating:

```text
width
height
top
left
box-shadow
filter
```

continuously when transform alternatives exist.

Layout animations should be used intentionally.

---

# 144. Glass Performance

`backdrop-filter` is expensive.

Rules:

```text
Use on small/medium surfaces
Avoid huge full-screen glass layers
Fallback to semi-transparent solid background
```

---

# 145. Design Tokens — CSS Variable Groups

```text
--color-*
--text-*
--surface-*
--border-*
--radius-*
--shadow-*
--space-*
--font-*
--motion-*
--z-*
```

---

# 146. Recommended Token Map

```text
Colors
--------
primary
secondary
sky
ivory
success
warning
error
info

Text
--------
primary
secondary
muted
disabled

Surface
--------
base
subtle
soft
glass

Border
--------
default
strong
focus

Radius
--------
sm
md
lg
xl
2xl
pill

Shadow
--------
sm
md
lg
xl
glow

Motion
--------
fast
default
comfort
complex
hero
```

---

# 147. Component Naming

Use semantic naming:

```text
ServiceCard
ProviderCard
BookingSummary
PaymentDeadline
TrackingTimeline
ReturnStatus
```

Avoid:

```text
BlueBox
BigCard
FancyButton
NewCard2
```

---

# 148. Folder Naming

Use kebab-case for feature folders:

```text
service-history/
smart-recommendation/
product-discovery/
return-refund/
```

Component files may use PascalCase:

```text
ServiceHistoryTimeline.tsx
ReturnSummary.tsx
```

---

# 149. Frontend Feature Mapping #1–#27

| # | Feature | Primary UI Surface |
|---:|---|---|
| 1 | Discovery | Search, Categories, Results, Smart Discovery |
| 2 | Booking Jasa | Booking Flow, Schedule, Requirements |
| 3 | Order Jasa | Order Detail, Status |
| 4 | Pricing & Quotation | Quote Workspace, Price Breakdown |
| 5 | Communication | Chat / Conversation |
| 6 | Payment & Protection Jasa | Payment, Invoice, Protection |
| 7 | Service Execution | Worker Workspace, Job Progress |
| 8 | Tracking Detail Jasa | Provider/Service Tracking |
| 9 | Proof of Service | Proof Gallery, Checklist, Report |
| 10 | Completion & Confirmation | Completion Review / Confirm |
| 11 | Rating & Review | Rating Sheet / Review |
| 12 | Complaint / Dispute | Case Workspace |
| 13 | Warranty | Warranty Detail / Claim |
| 14 | Service History | Timeline / Digital Logbook |
| 15 | Asset | Asset Detail |
| 16 | Maintenance & Reminder | Maintenance Dashboard |
| 17 | Rebooking / Favorite / Loyalty | Book Again / Favorites / Rewards |
| 18 | Smart Recommendation & AI | AI Assistant / Recommendation |
| 19 | Service + Product Integration | Product Requirement / Compatibility |
| 20 | Product Discovery | Product Search / Detail |
| 21 | Cart | Cart / Validation |
| 22 | Order / Booking Barang | Product Order / Booking |
| 23 | Payment Barang | Product Payment / Countdown |
| 24 | Inventory | Stock Dashboard |
| 25 | Fulfillment Barang | Picking / Packing / Handover |
| 26 | Shipping & Tracking Barang | Shipment / Tracking |
| 27 | Return / Refund Barang | Return Request / Inspection / Refund |

---

# 150. Core Shared Components Across #1–#27

```text
AppShell
Topbar
Sidebar
BottomNav
SearchBar
PageHeader
SectionHeader
Button
IconButton
Input
Textarea
Select
DatePicker
TimePicker
Tabs
Accordion
Dialog
Drawer
Toast
Tooltip
Badge
StatusBadge
Avatar
Rating
Price
Currency
Location
Timeline
Stepper
Progress
Skeleton
EmptyState
ErrorState
ConfirmationDialog
FileUploader
ImageGallery
ChatPanel
DataTable
FilterBar
Pagination
```

---

# 151. Domain Shared Components

```text
ServiceCard
ProviderCard
ProductCard
BookingCard
OrderCard
QuotationCard
PaymentSummary
ExecutionChecklist
TrackingTimeline
TrackingMap
ProofGallery
CompletionPanel
RatingForm
DisputeTimeline
WarrantySummary
ServiceHistoryTimeline
AssetSummary
MaintenanceScheduleCard
LoyaltyCard
AIRecommendationCard
ProductCompatibilityCard
CartItem
InventoryRow
FulfillmentTimeline
ShipmentCard
ReturnCard
RefundSummary
```

---

# 152. Design Review Checklist

Before a page is declared ready:

```text
□ Correct role
□ Correct permission state
□ Correct data hierarchy
□ Primary CTA obvious
□ Secondary CTA clear
□ Loading state
□ Empty state
□ Error state
□ Disabled state
□ Mobile layout
□ Tablet layout
□ Desktop layout
□ Focus state
□ Reduced motion
□ Contrast
□ Animation purposeful
□ No excessive gradient
□ No excessive glass
□ Icons consistent
□ Typography consistent
```

---

# 153. Visual Consistency Rule

Every page should feel like:

```text
SERVIO
```

even when role changes.

Role changes:

```text
information density
navigation
component composition
```

Role does NOT change:

```text
brand
typography
core palette
icon language
motion language
border radius
interaction principles
```

---

# 154. Visual Quality Gate

A page should pass these questions:

### Hierarchy

> Apa yang harus dilihat user terlebih dahulu?

### Action

> Apa tindakan utama?

### Context

> Apakah user tahu sedang berada di mana?

### State

> Apakah user tahu status proses?

### Feedback

> Apakah sistem menjawab aksi user?

### Trust

> Apakah informasi penting terlihat jelas?

### Motion

> Apakah animasi membantu atau hanya dekorasi?

---

# 155. Anti-Pattern

Hindari:

```text
❌ Gradient everywhere
❌ Glass everywhere
❌ Too many floating elements
❌ Excessive shadows
❌ Excessive animation
❌ Random icon families
❌ Tiny touch targets
❌ Dense desktop layout on mobile
❌ Huge page components
❌ Color-only status
❌ Hidden errors
❌ Long blocking loaders
```

---

# 156. Premium Feel Formula

Premium Servio bukan berarti banyak efek.

```text
Premium
=
Good Typography
+
Strong Spacing
+
Consistent Color
+
Subtle Depth
+
Purposeful Motion
+
Good Microcopy
+
High Quality Imagery
+
Clear Information Hierarchy
```

---

# 157. Core Brand Interaction

Default feel:

```text
Hover
→ subtle lift

Click
→ soft press

Open
→ smooth reveal

Success
→ gentle confirmation

Error
→ clear feedback

AI
→ subtle intelligent motion

Tracking
→ live but calm

Payment
→ clear and trustworthy
```

---

# 158. Frontend Technology Stack

Recommended:

```text
Framework
→ Next.js (App Router)

Language
→ TypeScript

Styling
→ Tailwind CSS + CSS Variables

Animation
→ Framer Motion

Icons
→ Phosphor Icons

Fonts
→ Sora + Plus Jakarta Sans

Images
→ Next.js Image

Component Architecture
→ Feature-based + reusable component layers
```

---

# 159. Architecture Principle

```text
Page
↓
Feature Composition
↓
Domain Component
↓
Shared Component
↓
Primitive
```

Never:

```text
One Page
↓
Everything
↓
2000+ lines
```

---

# 160. Implementation Order

Design system implementation:

```text
1. Tokens
2. Fonts
3. Global background
4. Typography
5. Button
6. Input
7. Card
8. Badge
9. Navigation
10. Layout
11. Motion primitives
12. Feedback states
13. Domain components
14. Role shells
15. Feature pages
```

---

# 161. Foundation First

Before building feature pages, lock:

```text
Brand
Colors
Typography
Icon
Spacing
Radius
Shadow
Motion
Glass
Responsive
Accessibility
```

Then feature pages consume the system.

---

# 162. Token Governance

No feature team should invent arbitrary:

```text
color
radius
shadow
motion duration
font size
```

inside a page.

New token request:

```text
Need identified
↓
Check existing token
↓
Reuse if possible
↓
Create new token only if justified
↓
Add to design system
```

---

# 163. Logo Asset Rule

Source of truth:

```text
docs/logo.png
```

For Next.js rendering, recommended production asset location:

```text
public/brand/logo.png
```

or static import from a project-controlled asset path.

Do not duplicate manually across feature folders.

---

# 164. Final Design System Philosophy

SERVIO harus terlihat:

```text
NOT:
"dashboard yang kebetulan punya warna biru-merah"

BUT:
"super app yang punya visual language konsisten
dari discovery sampai service, commerce, tracking,
AI, dan operations."
```

---

# 165. Final Visual Recipe

```text
WHITE BACKGROUND
        +
DEEP BLUE
        +
CORAL
        +
SOFT SKY
        +
WARM IVORY
        +
SUBTLE GRADIENT
        +
SELECTIVE GLASSMORPHISM
        +
SOFT ELEVATION
        +
SORA
        +
PLUS JAKARTA SANS
        +
PHOSPHOR ICONS
        +
FRAMER MOTION
        +
RESPONSIVE LAYOUT
        +
ACCESSIBILITY
        ↓
SERVIO VISUAL LANGUAGE
```

---

# 166. Final Status

```text
Brand Colors              ✅
Neutral Colors            ✅
Semantic Colors           ✅
White Background          ✅
Ambient Gradient          ✅
Primary Gradient          ✅
Typography                ✅
Icon System               ✅
Glassmorphism             ✅
Visual Effects            ✅
Motion System             ✅
Framer Motion             ✅
Responsive                ✅
Accessibility             ✅
Component Architecture    ✅
Next.js Architecture      ✅
Role-aware Surfaces       ✅
Feature #1–#27 Mapping   ✅
Logo Source               ✅
```

# 🔒 DESIGN SYSTEM FOUNDATION — LOCKED

Core rule:

> **White remains the dominant background. Brand gradients and glassmorphism are supporting layers used to create depth, premium feel, and visual personality without sacrificing clarity or performance.**

**END OF SERVIO DESIGN SYSTEM**
