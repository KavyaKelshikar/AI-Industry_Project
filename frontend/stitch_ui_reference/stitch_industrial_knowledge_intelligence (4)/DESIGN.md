---
name: InsightX Enterprise Intelligence
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#434655'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#515c8c'
  on-secondary: '#ffffff'
  secondary-container: '#bcc7fe'
  on-secondary-container: '#475281'
  tertiary: '#4c546f'
  on-tertiary: '#ffffff'
  tertiary-container: '#656c89'
  on-tertiary-container: '#eeefff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#dde1ff'
  secondary-fixed-dim: '#b9c4fb'
  on-secondary-fixed: '#0b1745'
  on-secondary-fixed-variant: '#394473'
  tertiary-fixed: '#dbe1ff'
  tertiary-fixed-dim: '#bec5e5'
  on-tertiary-fixed: '#131a33'
  on-tertiary-fixed-variant: '#3e4660'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.025em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: -0.01em
  label-mono-xs:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0em
  caption-xs:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system is engineered for industrial-grade knowledge intelligence platforms serving mission-critical plant operations, asset integrity monitoring, and enterprise telemetry. The aesthetic balances high-density operational telemetry with architectural restraint. 

The visual style is **Corporate Modern Minimalist** infused with high-precision engineering cues. It employs an intentional duality: an authoritative, deep navy navigation console representing operational stability, juxtaposed against an ultra-clean, clinical light canvas designed for rapid visual parsing, analytical auditability, and zero cognitive fatigue during extended operational monitoring.

Key tenets:
- **Precision over Decoration:** Eliminates gratuitous gradients or decorative skeuomorphism in favor of clear structural boundaries, precise alignment, and metric visibility.
- **Immediate State Cognition:** System health, data lineage, and machine telemetry communicate priority through calibrated semantic signaling (emerald, amber, rose) without overwhelming visual real estate.
- **Technical Rigor:** Monospaced identifiers, data density, structural tabular formats, and crisp geometric framing project institutional reliability appropriate for enterprise-level defense, industrial manufacturing, and engineering validation.

## Colors

The system uses a calibrated dual-surface architecture. Navigation surfaces live in deep-spectrum navy, while analytical and transactional working environments live on clinical neutral slates.

### Core Palette
- **Primary (`#2563EB`):** Royal Blue. Used for focused interactions, primary triggers, active selection states, and brand telemetry accents.
- **Secondary (`#111D4A`):** Deep Indigo Navy. Governs secondary navigation panels, flyouts, and elevated dark-mode headers.
- **Tertiary (`#0B132B`):** Dark Navy Obsidian. Anchors the primary persistent enterprise sidebar and high-level shell framework.
- **Neutral Canvas (`#F8FAFC`):** Slate 50. The foundational viewport background for data grids, telemetry matrices, and analytic workboards.

### Surface & Border Hierarchy
- **Canvas Base:** `#F8FAFC`
- **Surface Elevation 01 (Panels, Cards, Modals):** `#FFFFFF`
- **Surface Elevation 02 (Sub-cards, Table Headers, Metric Trays):** `#F1F5F9`
- **Structural Outlines / Dividers:** `#E2E8F0` (Slate 200)
- **Deep Sidebar Outline:** `#1E293B` (Slate 800)

### Semantic & Operational Telemetry
- **Positive / Verified / Healthy:** Surface `#ECFDF5`, Border `#A7F3D0`, Text `#047857`
- **Warning / Degraded / Pipeline Throttle:** Surface `#FFFBEB`, Border `#FDE68A`, Text `#B45309`
- **Critical / Suspended / Anomaly:** Surface `#FFF1F2`, Border `#FECDD3`, Text `#BE123C`
- **Informational / Syncing:** Surface `#EFF6FF`, Border `#BFDBFE`, Text `#1D4ED8`

### Typography Neutral Ramp
- **Text Primary (High Emphasis):** `#0F172A` (Slate 900)
- **Text Secondary (Medium Emphasis):** `#475569` (Slate 600)
- **Text Muted (Low Emphasis, Captions):** `#94A3B8` (Slate 400)
- **Text Inverted (On Dark Navy Surfaces):** `#F8FAFC` with `#94A3B8` secondary

## Typography

The typography architecture uses a dual-engine pairing: **Inter** for all narrative, hierarchical, and analytical UI text, alongside **JetBrains Mono** for raw industrial data points.

### Usage Standards
- **Inter:** Chosen for neutral neo-grotesque structural clarity, vertical metrics consistency, and exceptional micro-legibility at 12px–14px within compact enterprise table layouts. All uppercase section labels must use `caption-xs` with `letter-spacing: 0.05em`.
- **JetBrains Mono:** Strictly reserved for technical primitives—UUIDs, knowledge node hashes, vector pipeline durations, IPv4/IPv6 addresses, asset tags, schema model keys, and query logs. Monospaced elements maintain a fixed character box to ensure tabular columns do not oscillate during live web-socket streaming.
- **Numbers & KPI Delta Metrics:** Numerical metrics in dashboard overview cards render using tabular numerals (`font-feature-settings: "tnum"`), ensuring visual parity across fast-changing analytical dashboards.

## Layout & Spacing

The platform is structured on an asymmetric, fixed-nav / fluid-canvas architecture designed for 1080p and 1440p enterprise workstation viewports.

### Architectural Framing
- **Command Sidebar:** Fixed width at `280px` (`w-70`) on desktop viewports; collapsible into a `64px` icon-only precision strip. Built with `#0B132B`.
- **Primary Content Viewport:** Fluid 12-column grid utilizing `1.25rem` gutters and `1.5rem` canvas edge padding. Max-width constraints are lifted (`max-w-none`) inside authenticated views to maximize data density across widescreen panels.
- **Secondary Context Inspector (Slide-over / Drawer):** Fixed `420px` right-hand inspector anchored to the canvas edge for entity knowledge graphs and JSON telemetry payload inspectors.

### Breakpoint Matrix
- **Desktop (1280px and above):** Expanded 280px primary dark sidebar, dual-pane layout capability, full 12-column analytical grid with unconstrained telemetry tables.
- **Laptop / Tablet Landscape (1024px – 1279px):** Auto-collapsed 64px icon bar, 8-column layout, contextual panels default to overlays rather than split views.
- **Mobile / Compact (under 1024px):** Off-canvas drawer navigation triggered via top operational bar, single-column stack, horizontal scrolling tables with sticky primary identification columns.

## Elevation & Depth

Visual hierarchy does not rely on heavy drop shadows or blurred glass layers. Instead, depth is achieved through **structural planar containment and low-contrast borders**.

### Layering Rules
- **Base Tier (Canvas):** Tone `#F8FAFC`. Zero elevation, zero shadows.
- **Structural Tier (Work Surface Cards & Tables):** `#FFFFFF` framed by a 1px solid border in `#E2E8F0`. Flat elevation (`box-shadow: none`) or subtle grounding shadow (`0 1px 2px 0 rgba(15, 23, 42, 0.04)`).
- **Interactive Tier (Hovered Table Rows, Dropdown Menus, Popovers):** `#FFFFFF` paired with an elevated directional shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`, framed with `#CBD5E1`.
- **Command Tier (Dark Sidebar Elements):** Deep obsidian `#0B132B`. Internal separations use `#1E293B`. Selected navigation anchors use `#111D4A` with a high-contrast `3px` primary royal blue (`#2563EB`) vertical indicator on the leading edge.
- **Modal Overlay Tier:** Clean high-opacity backing (`rgba(11, 19, 43, 0.65)`) with cards sitting at `0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)`.

## Shapes

The design system enforces a **Soft Structural (Level 1)** geometry. 

All primary structural entities—data containers, table frames, form controls, button components, and tab matrices—adhere to `0.25rem` (4px) or `0.375rem` (6px) radiuses. Sharp right-angled geometric precision communicates industrial reliability, avoiding consumer-oriented roundedness while softening stark raw-brutalist edges.

### Radius Assignments
- **Inputs, Buttons, Badges, Table Rows:** `4px` (`rounded`)
- **Metric Cards, Modals, Flyout Panels:** `6px` to `8px` (`rounded-md`)
- **Telemetry Pills & Real-Time Connection Badges:** Fully circular (`rounded-full`) to contrast status capsules against rectangular data cells.

## Components

### Buttons
- **Primary:** Solid Royal Blue (`#2563EB`), text `#FFFFFF`, 4px radius, 36px standard height (`px-3.5 py-1.5`). Hover: `#1D4ED8`. Active: `#1E40AF`. Focus ring: 2px `#2563EB` offset by 2px white.
- **Secondary:** Surface `#FFFFFF`, border 1px solid `#E2E8F0`, text `#0F172A`. Hover: `#F8FAFC` and border `#CBD5E1`.
- **Destructive:** Surface `#FFF1F2`, border 1px solid `#FECDD3`, text `#BE123C`. Hover: `#FEE2E2`.
- **Dark Navigation Action (Sidebar):** Surface transparent, text `#94A3B8`. Hover: `#111D4A`, text `#FFFFFF`. Active state: Surface `#111D4A`, text `#FFFFFF`, left border 3px solid `#2563EB`.

### Tables (Data-Dense Analytical Grids)
- **Container:** Bordered 1px `#E2E8F0`, background `#FFFFFF`, overflow hidden.
- **Header (`<thead>`):** Height 36px, background `#F1F5F9`, border-bottom 1px `#CBD5E1`. Text: `11px`, Inter Medium, uppercase, tracking `0.05em`, color `#475569`.
- **Rows (`<tr>`):** Height 44px (compact mode: 36px), border-bottom 1px solid `#F1F5F9`. Hover: background `#F8FAFC`.
- **Cells (`<td>`):** Padding horizontal 12px, vertical 8px. Text: `13px` Inter (`body-sm`). Numerical or identity data switches strictly to `label-mono-sm` (`JetBrains Mono`).

### Metric Cards & Delta Indicators
- **Card Shell:** Background `#FFFFFF`, 1px solid `#E2E8F0`, padding `1.25rem`.
- **Metric Title:** 12px Inter medium uppercase, color `#64748B`.
- **Value:** 28px Inter Bold (`tnum`), color `#0F172A`.
- **Delta Indicator Badge:** Height 20px, inline-flex, padding `2px 6px`, radius 4px.
  - *Positive/Up:* Background `#ECFDF5`, text `#047857`, prefix arrow `↑`.
  - *Negative/Down:* Background `#FFF1F2`, text `#BE123C`, prefix arrow `↓`.
  - *Neutral/Idle:* Background `#F1F5F9`, text `#475569`, prefix dash `—`.

### Status Pills
- **Geometry:** Height 22px, `rounded-full`, horizontal padding 8px, font `11px`, JetBrains Mono or Inter medium.
- **Verified / Operational:** `#ECFDF5` background, `#A7F3D0` outline, `#047857` text, with a 6px solid emerald dot.
- **Degraded / High Latency:** `#FFFBEB` background, `#FDE68A` outline, `#B45309` text, with a 6px solid amber dot.
- **Critical / Offline:** `#FFF1F2` background, `#FECDD3` outline, `#BE123C` text, with a 6px solid rose dot.

### Form Inputs & Code Filters
- **Text Inputs:** Height 36px, background `#FFFFFF`, border 1px solid `#CBD5E1`, text `#0F172A`, placeholder `#94A3B8`, radius 4px. Focus: border 1px solid `#2563EB`, box-shadow `0 0 0 1px #2563EB`.
- **Monospace Search/Query Inputs:** As above, with `JetBrains Mono` 13px, leading icon (magnifying glass/terminal symbol), trailing shortcut indicator (e.g., `⌘K` in `#F1F5F9` badge).

### Checkboxes & Toggle Controls
- **Checkbox:** 16x16px, radius 3px, border 1px solid `#CBD5E1`. Checked state: background `#2563EB`, border `#2563EB`, white checkmark stroke.
- **Switch/Toggle:** Width 36px, height 20px, radius 10px. Track: `#CBD5E1` (off), `#2563EB` (on). Thumb: 16px white circle with 2px inset.