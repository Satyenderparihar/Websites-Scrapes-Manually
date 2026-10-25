# 🎓 Web Development Architecture: HTML5 & CSS Complete Computer Science Guide

> **100% Free, Lightweight Text Reference & University Lecture Notes**  
> **Extracted & Consolidated from**: Stony Brook University (CSE316: Fundamentals of Software Development by Prof. Paul Fodor - 65 Pages).  
> **Zero Binary Storage**: Pure GitHub-friendly markdown with direct clickable academic & technical references.

---

## 📑 Core Computer Science Topics Covered

- [1. Web Architecture & Client-Server Model](#1-web-architecture--client-server-model)
- [2. The Document Object Model (DOM)](#2-the-document-object-model-dom)
- [3. HTML Semantics & Parsing Rules](#3-html-semantics--parsing-rules)
- [4. CSS Cascade, Inheritance & Specificity Math](#4-css-cascade-inheritance--specificity-math)
- [5. Visual Formatting Model & Box Sizing](#5-visual-formatting-model--box-sizing)
- [6. Modern Layout Strategies: Flow, Flexbox & Grid](#6-modern-layout-strategies-flow-flexbox--grid)
- [7. Responsive Web Architecture & Media Queries](#7-responsive-web-architecture--media-queries)
- [8. Web Performance & Asset Loading Optimization](#8-web-performance--asset-loading-optimization)

---

## 1. Web Architecture & Client-Server Model

```
[Web Browser / Client]
       │
       │ HTTP GET Request (URL, Headers, Cookies)
       ▼
[Web Server / CDN] (Apache, Nginx, Cloudflare)
       │
       │ HTTP 200 OK Response (HTML, CSS, JS, Media Assets)
       ▼
[Browser Rendering Engine] (Blink, WebKit, Gecko)
       ├── 1. Parse HTML ────► Construct DOM Tree
       ├── 2. Parse CSS  ────► Construct CSSOM Tree
       ├── 3. Combine    ────► Render Tree
       ├── 4. Layout     ────► Calculate Box Geometry (Reflow)
       └── 5. Paint      ────► Rasterize Pixels to GPU
```

---

## 2. The Document Object Model (DOM)

HTML elements are not just text; they are parsed into an in-memory hierarchical tree of node objects:

- **Document**: The root entry point (`document`).
- **Element Nodes**: HTML tags (`<div>`, `<p>`, `<a>`).
- **Text Nodes**: Literal string content inside elements.
- **Attribute Nodes**: Modifiers like `id`, `class`, `src`, `href`.

```html
<!-- HTML Source -->
<div id="container">
  <h1>Welcome</h1>
  <p>Learn Web Development</p>
</div>
```

```
DOM Tree Representation:
       document
          │
      <html>
          │
       <body>
          │
    div#container
       ├── h1 ─── [Text: "Welcome"]
       └── p  ─── [Text: "Learn Web Development"]
```

---

## 3. CSS Cascade, Inheritance & Specificity Math

When multiple conflicting CSS rules target the same element, the browser resolves the winning declaration using **Specificity Weight Calculation**:

$$	ext{Specificity} = (a, b, c, d)$$

| Level | Selector Type | Weight | Example |
| :---: | :--- | :---: | :--- |
| **a** | Inline Styles | `1, 0, 0, 0` | `<div style="color: red;">` |
| **b** | ID Selectors | `0, 1, 0, 0` | `#header`, `#nav-menu` |
| **c** | Classes, Attributes & Pseudo-classes | `0, 0, 1, 0` | `.card`, `[type="text"]`, `:hover` |
| **d** | Type Selectors & Pseudo-elements | `0, 0, 0, 1` | `h1`, `p`, `div`, `::after` |

> **Rule**: An ID selector (`0, 1, 0, 0`) will override any number of class selectors combined. `!important` should only be used as a last resort because it breaks natural cascade flow.

---

## 4. Visual Formatting Model & Box Sizing

Every element on a web page generates a rectangular box consisting of four concentric layers:

```
+-------------------------------------------------+
|                   MARGIN                        |
|   +-----------------------------------------+   |
|   |               BORDER                    |   |
|   |   +---------------------------------+   |   |
|   |   |           PADDING               |   |   |
|   |   |   +-------------------------+   |   |   |
|   |   |   |         CONTENT         |   |   |   |
|   |   |   |   (Width x Height)      |   |   |   |
|   |   |   +-------------------------+   |   |   |
|   |   +---------------------------------+   |   |
|   +-----------------------------------------+   |
+-------------------------------------------------+
```

- **Content**: The actual text, image, or video.
- **Padding**: Transparent clear space between content and border.
- **Border**: Rendered outline surrounding padding.
- **Margin**: Transparent space outside border separating it from neighbors.

### Recommended Universal Reset:
```css
*, *::before, *::after {
  box-sizing: border-box;
}
```

---

## 5. Web Performance & Critical Rendering Path

1. **Minify & Compress**: Gzip / Brotli compression for text assets.
2. **Non-blocking CSS**: Load critical CSS inline, defer non-critical CSS.
3. **Async / Defer Scripts**:
   - `<script defer src="app.js">`: Executes after HTML parsing is complete.
   - `<script async src="analytics.js">`: Executes immediately when downloaded.
4. **Responsive Images**: Use modern WebP/AVIF formats with `srcset` and `loading="lazy"`.

---

*Extracted & Formatted from Stony Brook University CSE316 Lecture Series. 100% Zero-Binary Markdown Guide.*
