# 🎨 CSS Cheat Sheet 1: The Mega Properties & Syntax Reference

> **Source**: The Mega CSS Cheat Sheet (14-Page Comprehensive Properties Guide)  
> **Format**: 100% Lightweight Markdown Text & Property Reference Tables  
> **Topic**: Backgrounds, Borders, Box Model, Typography, Fonts, Columns, Flexbox, Transforms, and Animations  

---

## 📑 Table of Contents
1. [Background Properties](#1-background-properties)
2. [Border & Outline Properties](#2-border--outline-properties)
3. [Box Model & Dimension Properties](#3-box-model--dimension-properties)
4. [Font & Typography Properties](#4-font--typography-properties)
5. [Text Formatting & Spacing](#5-text-formatting--spacing)
6. [Color, Opacity & Gradients](#6-color-opacity--gradients)
7. [Multi-Column Layout Properties](#7-multi-column-layout-properties)
8. [Table Formatting Properties](#8-table-formatting-properties)
9. [2D & 3D Transform Properties](#9-2d--3d-transform-properties)
10. [Transitions & Keyframe Animations](#10-transitions--keyframe-animations)

---

## 1. Background Properties

| Property | Values | Syntax Example |
| :--- | :--- | :--- |
| `background` | Shorthand for all background properties | `background: #f8f9fa url('img.png') no-repeat center / cover;` |
| `background-color` | Color name, Hex, RGB, HSL, `transparent` | `background-color: #1e293b;` |
| `background-image` | `url(...)`, `none`, CSS Gradients | `background-image: linear-gradient(135deg, #667eea, #764ba2);` |
| `background-position` | `top`, `bottom`, `left`, `right`, `center`, percentages, length | `background-position: center center;` |
| `background-size` | `auto`, `cover`, `contain`, length, % | `background-size: cover;` |
| `background-repeat` | `repeat`, `repeat-x`, `repeat-y`, `no-repeat`, `space`, `round` | `background-repeat: no-repeat;` |
| `background-attachment` | `scroll`, `fixed`, `local` | `background-attachment: fixed;` |
| `background-origin` | `border-box`, `padding-box`, `content-box` | `background-origin: padding-box;` |
| `background-clip` | `border-box`, `padding-box`, `content-box`, `text` | `background-clip: text;` |

---

## 2. Border & Outline Properties

```css
/* Shorthand Border */
.card {
  border: 1px solid #e2e8f0;
  border-radius: 8px; /* Rounded corners */
  outline: 2px solid #3b82f6; /* Outside border without affecting layout geometry */
  outline-offset: 4px;
}

/* Individual Sides */
.border-custom {
  border-top: 3px solid #ef4444;
  border-right: 2px dashed #f59e0b;
  border-bottom: 3px double #10b981;
  border-left: 4px dotted #6366f1;
}

/* Box Shadow Elevation */
.shadow-elevation {
  /* x-offset | y-offset | blur-radius | spread-radius | color */
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}
```

---

## 3. Box Model & Dimension Properties

```css
.box {
  /* Box Sizing: Crucial modern reset */
  box-sizing: border-box;

  /* Dimensions */
  width: 100%;
  max-width: 1200px;
  min-width: 320px;
  height: auto;
  min-height: 400px;

  /* Spacing */
  margin: 0 auto;       /* Outer spacing (centered) */
  padding: 24px 32px;   /* Inner spacing */

  /* Overflow Management */
  overflow: hidden;     /* visible | hidden | scroll | auto */
  overflow-x: auto;     /* Horizontal scrolling */

  /* Visibility */
  visibility: visible;  /* visible | hidden (retains DOM space) | collapse */
  display: block;       /* none (removes from DOM layout) */
}
```

---

## 4. Font & Typography Properties

| Property | Values | Example |
| :--- | :--- | :--- |
| `font-family` | Font name, fallback generic family | `font-family: 'Inter', system-ui, sans-serif;` |
| `font-size` | `px`, `rem`, `em`, `%`, keywords | `font-size: 1.125rem;` |
| `font-weight` | `100` to `900`, `normal`, `bold`, `lighter` | `font-weight: 600;` |
| `font-style` | `normal`, `italic`, `oblique` | `font-style: italic;` |
| `font-variant` | `normal`, `small-caps` | `font-variant: small-caps;` |
| `line-height` | Unitless multiplier, `px`, `%` | `line-height: 1.6;` |
| `font` | Shorthand: `style weight size/line-height family` | `font: italic bold 1rem/1.5 sans-serif;` |

---

## 5. Text Formatting & Spacing

```css
.typography {
  text-align: left;           /* left | center | right | justify */
  text-decoration: underline; /* none | underline | line-through | overline */
  text-transform: capitalize; /* none | uppercase | lowercase | capitalize */
  text-indent: 2em;           /* Indents first line of paragraph */
  letter-spacing: 0.05em;     /* Spacing between characters */
  word-spacing: 0.15em;       /* Spacing between words */
  white-space: nowrap;        /* normal | nowrap | pre | pre-wrap */
  word-break: break-word;     /* normal | break-all | keep-all | break-word */
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
}
```

---

## 6. Color, Opacity & Gradients

```css
.colors {
  /* Hex, RGB, RGBA, HSL */
  color: #1e293b;
  background-color: rgba(30, 41, 59, 0.95);
  opacity: 0.9; /* Affects entire element and child tree */

  /* Linear Gradient */
  background: linear-gradient(90deg, #4f46e5, #06b6d4);

  /* Radial Gradient */
  background: radial-gradient(circle at center, #3b82f6, #1e1b4b);
}
```

---

## 7. Multi-Column Layout Properties

```css
.newspaper-layout {
  column-count: 3;          /* Divide content into 3 columns */
  column-gap: 30px;         /* Space between columns */
  column-rule: 1px solid #cbd5e1; /* Divider line between columns */
  column-width: 280px;      /* Responsive optimal width */
}

.headline-span {
  column-span: all;         /* Spans across all columns */
}
```

---

## 8. Table Formatting Properties

| Property | Values | Description |
| :--- | :--- | :--- |
| `border-collapse` | `collapse`, `separate` | Joins adjacent borders into single border |
| `border-spacing` | Length (e.g., `10px 15px`) | Spacing between cells when borders separate |
| `table-layout` | `auto`, `fixed` | `fixed` speeds up rendering and respects widths |
| `caption-side` | `top`, `bottom` | Positions table caption |
| `empty-cells` | `show`, `hide` | Hides borders on cells with no content |

---

## 9. 2D & 3D Transform Properties

```css
.interactive-card {
  /* Translate: Moves element on X, Y, Z axes */
  transform: translate(10px, -15px);

  /* Rotate: Spins element */
  transform: rotate(45deg);

  /* Scale: Zooms in/out */
  transform: scale(1.05);

  /* Skew: Distorts angle */
  transform: skew(5deg, 5deg);

  /* Multi-transform Combination */
  transform: translateY(-5px) scale(1.02);
  transform-origin: center center;
}
```

---

## 10. Transitions & Keyframe Animations

```css
/* Smooth CSS Transition */
.btn-interactive {
  background-color: #3b82f6;
  transition-property: background-color, transform, box-shadow;
  transition-duration: 0.3s;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: 0s;
  /* Shorthand */
  transition: all 0.3s ease-in-out;
}

.btn-interactive:hover {
  background-color: #1d4ed8;
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(59, 130, 246, 0.3);
}

/* Keyframe Pulse Animation */
@keyframes pulseGlow {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
  }
  70% {
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
}

.pulse-badge {
  animation: pulseGlow 2s infinite ease-in-out;
}
```

---
*Maintained by Satyender Parihar & Antigravity Autonomous Agent. 100% Lightweight Markdown Text & Links.*
