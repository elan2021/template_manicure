---
name: L'Émail Studio
colors:
  surface: '#fff7fa'
  surface-dim: '#e1d8dc'
  surface-bright: '#fff7fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fbf1f5'
  surface-container: '#f5ebef'
  surface-container-high: '#efe6ea'
  surface-container-highest: '#e9e0e4'
  on-surface: '#1e1a1d'
  on-surface-variant: '#594046'
  inverse-surface: '#342f32'
  inverse-on-surface: '#f8eef2'
  outline: '#8d7075'
  outline-variant: '#e0bec4'
  surface-tint: '#b81059'
  primary: '#970046'
  on-primary: '#ffffff'
  primary-container: '#be185d'
  on-primary-container: '#ffd5dd'
  inverse-primary: '#ffb1c3'
  secondary: '#845326'
  on-secondary: '#ffffff'
  secondary-container: '#febc85'
  on-secondary-container: '#78491d'
  tertiary: '#9a002d'
  on-tertiary: '#ffffff'
  tertiary-container: '#c3143f'
  on-tertiary-container: '#ffd6d8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd9e0'
  primary-fixed-dim: '#ffb1c3'
  on-primary-fixed: '#3f0019'
  on-primary-fixed-variant: '#8f0042'
  secondary-fixed: '#ffdcc2'
  secondary-fixed-dim: '#fab983'
  on-secondary-fixed: '#2e1500'
  on-secondary-fixed-variant: '#683c11'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b7'
  on-tertiary-fixed: '#40000d'
  on-tertiary-fixed-variant: '#92002a'
  background: '#fff7fa'
  on-background: '#1e1a1d'
  surface-variant: '#e9e0e4'
typography:
  display-lg:
    fontFamily: Epilogue
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Epilogue
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Epilogue
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Epilogue
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.005em
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

The design system embodies a serene, high-touch luxury atelier aesthetic tailored specifically for premier nail art salons, independent nail designers, and boutique beauty lounges. It balances editorial polish with seamless operational clarity, projecting warmth, meticulous craft, and modern luxury.

### Emotional Tone & Brand Pillars
- **Intimate Refinement:** Elevated without feeling distant or intimidating; warm blush tones evoke relaxation and pampering.
- **Craftsmanship & Precision:** Structured micro-typography and micro-interactions mimic the precise artistry of nail design.
- **Effortless Flow:** Low cognitive friction for busy beauty professionals juggling schedules, client preferences, and inventory.

### Aesthetic Direction: Modern Warm Glass & Tactile Serenity
The design merges modern minimalism with subtle warm-glass overlays and tactile surfaces. It avoids stark corporate neutrals in favor of cashmere warm-whites, powdered rose tints, and warm champagne metallic accents. Elevation is expressed via soft ambient color dispersion rather than heavy dropped shadows.

## Colors

The palette draws inspiration from lacquers, tinted serums, and warm champagne metals. Surfaces use high-luminance warm tones to feel airy and pristine.

### Palette Hierarchy & Intent
- **Primary (`#BE185D` / Deep Velvet Rose):** The core active color for primary CTAs, active segmented controls, focused states, and prominent status flags. High accessibility contrast against off-white surfaces.
- **Secondary (`#C68B59` / Burnished Champagne):** Applied to VIP tags, financial metrics, premium loyalty badges, and subtle decorative accents.
- **Tertiary (`#F43F5E` / Modern Coral Rose):** Vibrant accent for notifications, dynamic live calendar blocks, alerts, and instant booking highlights.
- **Neutral (`#1F1B1E` / Warm Espresso Charcoal):** Grounded text neutral ensuring high legibility without the harshness of pitch black.

### Surface System
- **Canvas Base:** `#FAF9F6` (Alabaster Warm White)
- **Surface Level 1 (Cards & Lists):** `#FFFFFF` with 70% opacity and 16px blur over blush glows.
- **Surface Level 2 (Inputs & Secondary Containers):** `#FDF2F4` (Blush Silk)
- **Surface Level 3 (Selected Toggles, Chips):** `#FCE7EB` (Powder Rose)
- **Subtle Hairline Border:** `rgba(31, 27, 30, 0.06)` or `rgba(198, 139, 89, 0.18)` on luxury tiers.

## Typography

The type pairing pairs the editorial, sculptured architecture of **Epilogue** for major titles and numbers with the humanistic, legible warmth of **Plus Jakarta Sans** for interface mechanics, agenda slots, and client notes.

### Styling & Optical Hierarchy
- **Editorial Headings:** Use `Epilogue` with tight negative letter tracking to give studio dashboards an art-book feel.
- **Numbers & Currencies:** Formatted using `Epilogue` semibold for balance totals and appointment start times.
- **Micro-Copy & Micro-Labels:** `label-sm` utilizes an uppercase posture with `+0.04em` tracking for professional service classifications (e.g., "GEL EXTENSION", "RUSSIAN MANICURE", "CONFIRMED").

## Layout & Spacing

The layout is built for fluid mobile-first thumb ergonomics, respecting iOS and Android dynamic safe zones.

### Grid & Composition Rules
- **Canvas Margins:** Fixed `1.25rem` (20px) horizontal inset for mobile viewports, expanding to `1.5rem` on larger handsets and foldables.
- **Vertical Flow:** Stack layout uses `space-md` (16px) for item grouping inside cards, and `space-xl` (36px) between major functional zones (e.g., Daily Calendar vs. Quick Actions).
- **Horizontal Carousels:** Professional roster cards and service category pills peek off the right margin with `space-sm` offset to encourage edge-swipe discovery.

## Elevation & Depth

Visual hierarchy employs translucent frosted surfaces, warm diffuse ambient drops, and satin inner glows rather than heavy drop shadows.

### Elevation Levels
- **Level 0 (Flat Canvas):** `#FAF9F6` without shadows.
- **Level 1 (Appointment Cards & Service Panels):** Translucent `#FFFFFF` (85% opacity) over a subtle ambient shadow: `box-shadow: 0 4px 20px -2px rgba(190, 24, 93, 0.05), 0 2px 6px -1px rgba(31, 27, 30, 0.03)`. Backing filter: `backdrop-filter: blur(12px)`. Outlined with `1px solid rgba(255, 255, 255, 0.8)`.
- **Level 2 (Floating Action Buttons & Booking Drawers):** `box-shadow: 0 12px 32px -4px rgba(190, 24, 93, 0.12), 0 4px 12px -2px rgba(31, 27, 30, 0.04)`.
- **Level 3 (Modal Sheets & Contextual Overlays):** Full backdrop scrim `rgba(31, 27, 30, 0.35)` with `backdrop-filter: blur(8px)`, sheet container rendered in solid `#FFFFFF` with top edge inner highlight `inset 0 1px 0 rgba(255, 255, 255, 0.9)`.

## Shapes

The design system embraces voluptuous, sculpted silhouettes matching organic nail curves and cosmetic packaging.

### Shape Geometry Rules
- **Base Components (Inputs, Small Badges, Chips):** `1rem` (16px) border radius for an ergonomic, pillow-like tactile response.
- **Cards & Schedule Units:** `1.5rem` (24px) border radius (`rounded-2xl` equivalent).
- **Bottom Drawers & Hero Action Panels:** `2rem` (32px) top-left and top-right radii (`rounded-3xl` equivalent).
- **Avatar Badges & Icon Buttons:** Full continuous pill / circle (`9999px`).

## Components

### Buttons
- **Primary Action Button:** Gradient background from `#BE185D` to `#9D174D`, text in `#FFFFFF`, height `54px`, `rounded-full`, soft drop shadow `0 6px 18px rgba(190, 24, 93, 0.28)`.
- **Secondary Button:** Champagne tint background `#FCE7EB`, text `#BE185D`, border `1px solid rgba(190, 24, 93, 0.15)`, height `50px`.
- **Ghost/Tertiary:** Plain `#1F1B1E` text with subtle hover/active background `rgba(253, 242, 244, 0.6)`.

### Appointment Cards
- Card surface composed of frosted white (`rgba(255, 255, 255, 0.9)`), with a vertical 4px color indicator on the leading edge (Rose for Confirmed, Champagne for VIP, Warm Gray for Pending).
- Displays client thumbnail, client name in `title-md`, time duration pill (`label-sm`), service name (e.g., "Fiberglass Sculpting + Nail Art"), and professional avatar.

### Chips & Filter Pills
- Unselected state: Solid `#FFFFFF`, border `1px solid rgba(31, 27, 30, 0.08)`, text `#1F1B1E`.
- Selected state: Background `#FDF2F4`, border `1.5px solid #BE185D`, text `#BE185D`, accompanied by an optional micro dot icon.

### Form Inputs & OTP PIN Fields
- **Single-line Inputs:** Height `52px`, background `#FDF2F4`, zero outer shadow, border `1px solid transparent`, corner radius `1rem`. On focus: background `#FFFFFF`, border `1.5px solid #BE185D`, subtle outer ring `0 0 0 4px rgba(190, 24, 93, 0.08)`.
- **OTP Verification Inputs:** 4 to 6 square modules (`52px` x `56px`), rounded `1rem`, centered `headline-md` type in `#1F1B1E`, with an active rhythmic pulse caret in `#BE185D`.

### Professional Specialist Tags
- Horizontal pills containing a circular `32px` artist photo, artist first name in `label-md`, micro-rating star (`#C68B59`), and a small specialty dot (e.g., "Hard Gel Specialist").

### Toggles & Controls
- **Modern Switch:** Track width `50px`, height `28px`, track inactive `#E5E2E4`, track active `#BE185D`. Handle `22px` diameter in pristine white with tactile depth `0 2px 6px rgba(0,0,0,0.15)`.
- **Checkboxes & Radios:** Curved organic checks (`rounded-md`), switching from light blush fill to solid `#BE185D` with an animated white check vector.