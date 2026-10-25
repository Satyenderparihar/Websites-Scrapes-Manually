# 🎨 CSS Cheat Sheet 2: Modern Selectors, Flexbox, Grid & Responsive Layouts

> **Source**: CheatSheetCSS (23-Page Practical Developer Guide)  
> **Format**: 100% Lightweight Markdown Text & Code Examples  
> **Topic**: Selectors, Positioning, Modern Flexbox Architecture, CSS Grid System, and Media Queries  

---

## 📑 Table of Contents
1. [CSS Selectors Deep Dive](#1-css-selectors-deep-dive)
2. [Display Modes & Box Visibility](#2-display-modes--box-visibility)
3. [CSS Positioning & Z-Index](#3-css-positioning--z-index)
4. [Flexbox Architecture (1D Layout)](#4-flexbox-architecture-1d-layout)
5. [CSS Grid Layout System (2D Layout)](#5-css-grid-layout-system-2d-layout)
6. [CSS Custom Properties (Variables)](#6-css-custom-properties-variables)
7. [Responsive Design & Media Queries](#7-responsive-design--media-queries)
8. [Practical UI Patterns: Centering & Card Grids](#8-practical-ui-patterns-centering--card-grids)

---

## 1. CSS Selectors Deep Dive

| Selector Type | Syntax Pattern | Target Matches |
| :--- | :--- | :--- |
| **Universal** | `*` | Every element in document |
| **Type / Element** | `p`, `h1`, `div` | All tags matching element name |
| **Class** | `.card`, `.active` | Elements containing class name |
| **ID** | `#header`, `#nav` | Element matching unique ID |
| **Attribute** | `input[type="text"]` | Elements with specified attribute |
| **Descendant** | `nav a` | All anchors anywhere inside `<nav>` |
| **Child** | `ul > li` | Direct immediate children only |
| **Adjacent Sibling** | `h2 + p` | First immediate `<p>` right after `<h2>` |
| **General Sibling** | `h2 ~ p` | All sibling `<p>` elements following `<h2>` |
| **Pseudo-Class** | `:hover`, `:focus`, `:nth-child(even)` | Dynamic states and structural positions |
| **Pseudo-Element** | `::before`, `::after`, `::selection` | Inserted cosmetic layers and selected text |

---

## 2. Display Modes & Box Visibility

```css
/* Block: Takes full width, starts on new line */
.block-element { display: block; }

/* Inline: Takes only necessary width, no height/margin-top */
.inline-element { display: inline; }

/* Inline-Block: Flows horizontally but respects width, height, and margins */
.btn { display: inline-block; width: 140px; height: 44px; }

/* Flex & Grid Layouts */
.flex-box { display: flex; }
.grid-box { display: grid; }

/* Removal vs Hiding */
.hidden-layout { display: none; }        /* Completely removed from render tree */
.invisible-box { visibility: hidden; }   /* Invisible, but reserves blank space */
```

---

## 3. CSS Positioning & Z-Index

```css
/* 1. Static (Default) */
.static-box { position: static; }

/* 2. Relative (Offset relative to normal position, creates coordinate context) */
.relative-parent {
  position: relative;
  top: 10px;
  left: 20px;
}

/* 3. Absolute (Positioned relative to closest non-static ancestor) */
.absolute-badge {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 10;
}

/* 4. Fixed (Positioned relative to viewport; stays when scrolling) */
.fixed-navbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
}

/* 5. Sticky (Scrolls normally until scroll threshold, then sticks) */
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 100;
}
```

---

## 4. Flexbox Architecture (1D Layout)

Flexbox aligns items along a single axis (row or column).

```css
/* Parent Flex Container */
.flex-container {
  display: flex;
  flex-direction: row;        /* row | row-reverse | column | column-reverse */
  flex-wrap: wrap;            /* nowrap | wrap | wrap-reverse */
  justify-content: space-between; /* flex-start | flex-end | center | space-between | space-around | space-evenly */
  align-items: center;        /* stretch | flex-start | flex-end | center | baseline */
  align-content: stretch;     /* Spacing between wrapped rows */
  gap: 20px;                  /* Clean spacing without margins */
}

/* Child Flex Items */
.flex-item {
  flex-grow: 1;               /* Ability to expand into available space */
  flex-shrink: 0;             /* Prevents item from shrinking below basis */
  flex-basis: 280px;          /* Initial size before distribution */
  /* Shorthand: flex: grow shrink basis */
  flex: 1 0 280px;
  align-self: flex-start;     /* Overrides container align-items */
  order: 2;                   /* Visual rendering order */
}
```

---

## 5. CSS Grid Layout System (2D Layout)

Grid handles both horizontal rows and vertical columns simultaneously.

```css
.grid-container {
  display: grid;
  
  /* 3 Columns: Flexible fraction (fr) units */
  grid-template-columns: repeat(3, 1fr);
  
  /* Auto-fill responsive grid without media queries! */
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  
  /* Row Heights */
  grid-auto-rows: minmax(150px, auto);
  
  /* Gap between tracks */
  gap: 24px;
}

/* Spanning Grid Items */
.featured-card {
  grid-column: span 2;        /* Spans 2 horizontal columns */
  grid-row: span 2;           /* Spans 2 vertical rows */
}
```

---

## 6. CSS Custom Properties (Variables)

```css
:root {
  /* Brand Theme Variables */
  --primary-color: #3b82f6;
  --secondary-color: #10b981;
  --bg-dark: #0f172a;
  --text-main: #334155;
  --radius-md: 8px;
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

/* Usage */
.button {
  background-color: var(--primary-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}

/* Dark Mode Override */
@media (prefers-color-scheme: dark) {
  :root {
    --primary-color: #60a5fa;
    --text-main: #f1f5f9;
    --bg-dark: #020617;
  }
}
```

---

## 7. Responsive Design & Media Queries

```css
/* Mobile-First Architecture */
.responsive-layout {
  display: flex;
  flex-direction: column; /* Single column on phones */
  padding: 16px;
}

/* Tablet (min-width: 768px) */
@media screen and (min-width: 768px) {
  .responsive-layout {
    flex-direction: row;
    flex-wrap: wrap;
    padding: 24px;
  }
}

/* Desktop (min-width: 1024px) */
@media screen and (min-width: 1024px) {
  .responsive-layout {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px;
  }
}
```

---

## 8. Practical UI Patterns

### Perfect Centering (Flexbox)
```css
.center-flex {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
```

### Perfect Centering (Grid)
```css
.center-grid {
  display: grid;
  place-items: center;
  min-height: 100vh;
}
```

---
*Maintained by Satyender Parihar & Antigravity Autonomous Agent. 100% Lightweight Markdown Text & Links.*
