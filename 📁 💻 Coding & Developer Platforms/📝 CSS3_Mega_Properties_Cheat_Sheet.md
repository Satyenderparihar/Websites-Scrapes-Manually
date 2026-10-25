# 🎨 CSS3 Mega Properties Cheat Sheet: Modern Layouts, Styling & Animations

> **100% Free, Lightweight Text Reference & Syntax Guide**  
> **Extracted & Consolidated from**: The Mega CSS Cheat Sheet (14 Pages) and Complete CSS Properties Guide (23 Pages).  
> **Zero Binary Storage**: Pure GitHub-friendly markdown with direct clickable official documentation links.

---

## 📑 Quick Navigation Table of Contents

- [1. CSS Selectors & Specificity](#1-css-selectors--specificity)
- [2. Box Model & Sizing](#2-box-model--sizing)
- [3. Flexbox Architecture](#3-flexbox-architecture)
- [4. CSS Grid Layout System](#4-css-grid-layout-system)
- [5. Typography & Font Styling](#5-typography--font-styling)
- [6. Backgrounds & Gradients](#6-backgrounds--gradients)
- [7. Borders & Outlines](#7-borders--outlines)
- [8. Positioning & Stacking Context](#8-positioning--stacking-context)
- [9. Transforms & Transitions](#9-transforms--transitions)
- [10. Keyframe Animations](#10-keyframe-animations)
- [11. Responsive Design & Media Queries](#11-responsive-design--media-queries)
- [12. CSS Custom Properties (Variables)](#12-css-custom-properties-variables)

---

## 1. CSS Selectors & Specificity

| Selector | Pattern | Matches |
| :--- | :--- | :--- |
| Universal | `*` | Every element in document |
| Element | `p`, `div`, `section` | All elements of given tag name |
| Class | `.card`, `.btn-primary` | Elements with matching `class` attribute |
| ID | `#main-header` | Element with specific `id` (Highest specificity) |
| Attribute | `input[type="email"]` | Elements with specified attribute and value |
| Child Combinator | `ul > li` | Direct immediate children only |
| Descendant | `nav a` | All nested anchors at any depth inside `nav` |
| Adjacent Sibling | `h2 + p` | Immediate next paragraph following an `h2` |
| General Sibling | `h2 ~ p` | All sibling paragraphs following `h2` |
| Pseudo-class | `:hover`, `:focus`, `:nth-child(2n)` | Dynamic user states and structural index |
| Pseudo-element | `::before`, `::after`, `::selection` | Cosmetic decorative elements and selected text |

---

## 2. Box Model & Sizing

```css
* {
  box-sizing: border-box; /* Crucial: Includes padding and border inside total width */
  margin: 0;
  padding: 0;
}

.box {
  width: 100%;
  max-width: 1200px;
  min-height: 400px;
  
  /* Padding (Inside Spacing): Top Right Bottom Left (Clockwise) */
  padding: 16px 24px;
  
  /* Margin (Outside Spacing): Center block with auto */
  margin: 0 auto;
  
  /* Overflow Management */
  overflow: hidden; /* visible | hidden | scroll | auto */
}
```

---

## 3. Flexbox Architecture

```css
.flex-container {
  display: flex;
  flex-direction: row; /* row | row-reverse | column | column-reverse */
  flex-wrap: wrap;     /* nowrap | wrap | wrap-reverse */
  
  /* Main Axis Alignment */
  justify-content: space-between; /* flex-start | flex-end | center | space-between | space-around | space-evenly */
  
  /* Cross Axis Alignment */
  align-items: center; /* stretch | flex-start | flex-end | center | baseline */
  
  /* Spacing between items without margin hacks */
  gap: 20px;
}

.flex-item {
  flex: 1 1 300px; /* flex-grow | flex-shrink | flex-basis */
  align-self: flex-start; /* Override container align-items */
}
```

---

## 4. CSS Grid Layout System

```css
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); /* Responsive auto-fill */
  grid-template-rows: auto;
  gap: 24px;
}

.featured-card {
  grid-column: span 2; /* Span across 2 grid columns */
  grid-row: span 1;
}
```

---

## 5. Typography & Font Styling

| Property | Example Values | Purpose |
| :--- | :--- | :--- |
| `font-family` | `'Inter', system-ui, sans-serif` | Prioritized typeface font stack |
| `font-size` | `1rem`, `16px`, `clamp(1rem, 2.5vw, 2rem)` | Fluid responsive text scaling |
| `font-weight` | `400` (normal), `600` (semi), `700` (bold) | Thickness of text glyphs |
| `line-height` | `1.5`, `1.6` (Recommended for prose) | Vertical space between text lines |
| `letter-spacing`| `-0.02em`, `0.05em` | Tracking / space between characters |
| `text-transform`| `uppercase`, `lowercase`, `capitalize` | Text capitalization control |
| `text-align` | `left`, `center`, `right`, `justify` | Horizontal text alignment |
| `white-space` | `nowrap`, `pre-wrap`, `normal` | Whitespace handling |

---

## 6. Backgrounds & Gradients

```css
.hero-banner {
  /* Linear & Radial Gradients */
  background: linear-gradient(135deg, #1F497D 0%, #2E75B6 100%);
  
  /* Background Image with Cover Scaling */
  background-image: url('hero-bg.webp');
  background-position: center center;
  background-size: cover; /* cover | contain | auto */
  background-repeat: no-repeat;
  
  /* Parallax Fixed Background */
  background-attachment: fixed;
}
```

---

## 7. Borders, Shadows & Glassmorphism

```css
.card {
  /* Border: width style color */
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 12px;
  
  /* Smooth Elevation Box Shadows */
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 
              0 2px 4px -1px rgba(0, 0, 0, 0.06);
              
  /* Glassmorphism Frosted Glass Blur */
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
}
```

---

## 8. Transitions & Keyframe Animations

```css
/* Smooth Interactive Transition */
.btn {
  background-color: #1F497D;
  color: #FFFFFF;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn:hover {
  background-color: #2E75B6;
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
}

/* Keyframe Pulse Animation */
@keyframes pulseGlow {
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
}

.badge-live {
  animation: pulseGlow 2s infinite ease-in-out;
}
```

---

## 9. Responsive Design & Media Queries

```css
/* Mobile-First Responsive Breakpoints */

/* Tablet & iPad (Min-Width: 768px) */
@media (min-width: 768px) {
  .sidebar { display: block; }
  .grid-container { grid-template-columns: repeat(2, 1fr); }
}

/* Desktop & Laptop (Min-Width: 1024px) */
@media (min-width: 1024px) {
  .grid-container { grid-template-columns: repeat(4, 1fr); }
}

/* Dark Mode Media Query */
@media (prefers-color-scheme: dark) {
  body {
    background-color: #121212;
    color: #E0E0E0;
  }
}
```

---

*Curated & Formatted by Antigravity Autonomous Agent. 100% Zero-Binary & Markdown-Optimized.*
