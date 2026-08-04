---
name: Industrial Intelligence Framework
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#434655'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#005a82'
  on-tertiary: '#ffffff'
  tertiary-container: '#0074a6'
  on-tertiary-container: '#e4f2ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#c9e6ff'
  tertiary-fixed-dim: '#89ceff'
  on-tertiary-fixed: '#001e2f'
  on-tertiary-fixed-variant: '#004c6e'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.02em
  code-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style

The design system is engineered for high-stakes industrial environments where clarity, precision, and cognitive ease are paramount. It targets enterprise decision-makers and technical operators who require an "AI Industrial Knowledge Intelligence System" that feels sophisticated yet approachable.

The aesthetic follows a **Modern Corporate Minimalism** movement. It prioritizes functional density without clutter, utilizing significant whitespace to separate complex data streams. The emotional response is one of "Informed Confidence"—the UI should feel like a powerful, invisible partner that simplifies massive datasets into actionable wisdom. Drawing inspiration from top-tier productivity tools, the system employs a subtle "Layered Utility" approach where the interface recedes to let the AI-generated insights take center stage.

## Colors

The palette is anchored by **Corporate Blue (#2563EB)**, a color that signals reliability and technical authority. 

- **Primary:** Used for main actions, active states, and brand-defining moments.
- **Secondary:** A muted slate blue-gray for supporting UI elements, icons, and non-primary navigation.
- **Background & Surface:** A strict hierarchy of white (#FFFFFF) for the primary content canvas and light gray (#F8FAFC) for secondary containers, sidebars, and background grounding.
- **Text:** Dark Slate (#1E293B) provides optimal contrast for readability while feeling softer and more modern than pure black.
- **Semantic Accents:** Success (Emerald), Warning (Amber), and Error (Rose) should be used sparingly, following the same saturation levels as the primary blue to ensure a cohesive look.

## Typography

This design system utilizes **Inter** as the primary typeface for its exceptional legibility in data-heavy SaaS environments and its neutral, systematic character. For technical data, labels, and AI-generated code or coordinates, **Geist** is introduced to provide a subtle "developer-grade" precision.

- **Scale:** A tight modular scale ensures that information remains dense but readable.
- **Weights:** Use Semi-Bold (600) for headlines to create clear hierarchy against Regular (400) body text.
- **Spacing:** Negative letter-spacing is applied to larger display type to maintain a "tight" professional feel, while positive letter-spacing is used for small labels to ensure legibility.

## Layout & Spacing

The layout philosophy relies on a **Fixed-Fluid Hybrid Grid**. Content is housed within a maximum width of 1440px for readability, but background surfaces and utility bars extend to the full viewport.

- **Rhythm:** An 8px base grid governs all spatial relationships. 
- **Desktop:** A 12-column grid with 24px gutters. Sidebars are fixed at 280px to provide a consistent navigation anchor.
- **Tablet:** A 6-column grid with 16px gutters.
- **Mobile:** A 2-column grid with 16px margins.
- **AI Chat Interface:** Specifically uses a centered "Narrow Column" (max-width: 800px) to mimic the focused reading experience of tools like ChatGPT or Notion.

## Elevation & Depth

To maintain a clean, enterprise-grade feel, this design system uses **Tonal Layering** supplemented by **Ambient Shadows**. Depth is used to communicate functional hierarchy rather than decoration.

- **Level 0 (Base):** White (#FFFFFF) for the primary content area.
- **Level 1 (Surface):** Light Gray (#F8FAFC) for secondary containers, sidebars, and page backgrounds.
- **Elevation-1 (Soft Shadow):** Used for cards and floating menus. The shadow is extremely subtle: `0px 1px 3px rgba(0,0,0,0.05), 0px 4px 12px rgba(0,0,0,0.03)`.
- **Interactivity:** On hover, cards may transition to an "Elevation-2" state with a slightly more pronounced shadow and a 1px border in a slightly darker gray (#E2E8F0).

## Shapes

The shape language is characterized by **Generous Rounding**, which softens the technical nature of industrial data.

- **Standard Elements:** Buttons, inputs, and small cards use a 12px (`rounded-md` equivalent) radius.
- **Large Containers:** Main content areas and large modal overlays use a 16px (`rounded-lg`) radius.
- **Micro Elements:** Checkboxes and tags use a 4px-6px radius to maintain distinctness at small scales.
- **The "AI Bubble":** Chat bubbles and AI-suggested prompts use the maximum `rounded-xl` (24px) to distinguish human/AI interaction from the more rigid industrial data tables.

## Components

- **Buttons:** Primary buttons use the Corporate Blue with white text. Ghost buttons use a subtle gray border (#E2E8F0) that darkens on hover. All buttons feature a 12px corner radius and height of 40px for standard actions.
- **Input Fields:** Use the surface color (#F8FAFC) for the background with a 1px border. On focus, the border transitions to Primary Blue with a 2px soft outer glow.
- **Cards:** White background, Elevation-1 shadow, and 16px padding. Used to group "Knowledge Nuggets" or sensor data modules.
- **Chips/Tags:** Used for industrial categories or AI confidence scores. These should be low-contrast (e.g., Light Blue background with Dark Blue text) with a pill-shaped radius.
- **Knowledge List:** Items feature a 1px bottom border and generous vertical padding (16px) to ensure touch-targets are clear and data is scannable.
- **AI Insight Component:** A special card type with a very subtle gradient border (Primary Blue to Tertiary Cyan) to indicate "Live Intelligence" processing.