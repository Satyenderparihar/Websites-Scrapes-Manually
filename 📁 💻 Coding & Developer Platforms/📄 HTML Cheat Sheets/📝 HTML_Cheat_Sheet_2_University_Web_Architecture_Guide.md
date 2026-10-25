# 📄 HTML Cheat Sheet 2: Stony Brook University Web Architecture & HTML/CSS Guide

> **Source**: Stony Brook University (CSE316: Fundamentals of Software Development by Prof. Paul Fodor - 65 Lecture Pages)  
> **Format**: 100% Lightweight Markdown Text & Clickable Computer Science References  
> **Topic**: Client-Server Architecture, DOM Tree Hierarchy, HTML History, Parsing Rules, CSS Specificity Math  

---

## 📑 Table of Contents
1. [Web Architecture & The HTTP Lifecycle](#1-web-architecture--the-http-lifecycle)
2. [A Brief History of HTML (1989 to HTML5)](#2-a-brief-history-of-html-1989-to-html5)
3. [The Document Object Model (DOM) Tree Hierarchy](#3-the-document-object-model-dom-tree-hierarchy)
4. [HTML Parsing & Syntactic Rules](#4-html-parsing--syntactic-rules)
5. [CSS Cascade, Inheritance & Specificity Calculation](#5-css-cascade-inheritance--specificity-calculation)
6. [Visual Formatting Model & Box Geometry](#6-visual-formatting-model--box-geometry)
7. [Modern Layout Models: Normal Flow, Flexbox & Grid](#7-modern-layout-models-normal-flow-flexbox--grid)
8. [Responsive Viewport & Critical Rendering Path](#8-responsive-viewport--critical-rendering-path)

---

## 1. Web Architecture & The HTTP Lifecycle

```
[Web Browser / Client]
       │
       │ 1. HTTP GET Request (URL, Headers, Cookies)
       ▼
[DNS Server] ──► Resolves Domain to IP Address
       │
       ▼
[Web Server / CDN] (Nginx, Apache, Cloudflare)
       │
       │ 2. HTTP 200 OK Response (HTML Payload, MIME: text/html)
       ▼
[Browser Rendering Engine] (Blink, WebKit, Gecko)
       ├── a. Parse HTML Bytes ──► Tokens ──► Construct DOM Tree
       ├── b. Parse CSS Bytes  ──► Tokens ──► Construct CSSOM Tree
       ├── c. Combine DOM + CSSOM          ──► Render Tree
       ├── d. Layout Calculation (Reflow)  ──► Calculate Exact Box Dimensions
       └── e. Paint (Rasterization)        ──► Draw Pixels onto GPU / Screen
```

---

## 2. A Brief History of HTML (1989 to HTML5)

- **1989**: Tim Berners-Lee proposes an Internet-based hypertext system at CERN.
- **1991**: First release of HTML with 18 original tags (`<title>`, `<p>`, `<a>`, `<h1>`...`<h6>`, `<ul>`, `<li>`, etc.).
- **1995 (HTML 2.0)**: Published as [RFC 1866](https://tools.ietf.org/html/rfc1866) by the Internet Engineering Task Force (IETF). Introduced form-based file uploads and tables.
- **1997 (HTML 3.2 & 4.0)**: Published by W3C; separated presentational styling from structure via CSS.
- **2000 (XHTML 1.0)**: Strict XML reformulation of HTML requiring closing tags and lowercase element names.
- **2014 (HTML5)**: Published as official W3C Recommendation. Native `<video>`, `<audio>`, `<canvas>`, semantic elements (`<article>`, `<section>`, `<header>`, `<nav>`), and rich client storage APIs.

---

## 3. The Document Object Model (DOM) Tree Hierarchy

The browser parses HTML markup into an in-memory, object-oriented tree structure:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>CS Lecture</title>
  </head>
  <body>
    <div id="wrapper">
      <h1>Computer Science</h1>
      <p>Web Development Fundamentals</p>
    </div>
  </body>
</html>
```

```
Hierarchical In-Memory DOM Tree:
               Document
                  │
             <html> Element
             ├── <head> Element
             │     └── <title> Element
             │           └── "CS Lecture" (Text Node)
             └── <body> Element
                   └── <div id="wrapper"> Element
                         ├── <h1> Element
                         │     └── "Computer Science" (Text Node)
                         └── <p> Element
                               └── "Web Development Fundamentals" (Text Node)
```

### DOM Node Types:
1. **Document Node**: Root container (`document`).
2. **Element Nodes**: HTML tags (`<div>`, `<p>`).
3. **Attribute Nodes**: Modifiers (`id="wrapper"`, `class="btn"`).
4. **Text Nodes**: Raw leaf text inside tags.
5. **Comment Nodes**: Hidden comments (`<!-- comment -->`).

---

## 4. HTML Parsing & Syntactic Rules

1. **Proper Nesting**: Tags must be closed in reverse order of opening (LIFO stack):
   - Correct: `<strong><em>Highlighted</em></strong>`
   - Incorrect: `<strong><em>Highlighted</strong></em>`
2. **Case Insensitivity vs Convention**: HTML5 tags are case-insensitive, but lower-case is industry standard convention.
3. **Void / Self-Closing Elements**: Elements without child nodes cannot have closing tags (`<img>`, `<input>`, `<meta>`, `<link>`, `<hr>`, `<br>`).

---

## 5. CSS Cascade, Inheritance & Specificity Calculation

When multiple conflicting CSS declarations target an element, the browser computes the winner using **Specificity Math**:

$$\text{Specificity} = (a, b, c, d)$$

| Level | Component | Weight | Target Examples |
| :---: | :--- | :---: | :--- |
| **a** | Inline Style Attribute | `1, 0, 0, 0` | `<h1 style="color: blue;">` |
| **b** | ID Selectors | `0, 1, 0, 0` | `#main-header`, `#nav-bar` |
| **c** | Classes, Attributes & Pseudo-classes | `0, 0, 1, 0` | `.card`, `[type="text"]`, `:hover` |
| **d** | Type Selectors & Pseudo-elements | `0, 0, 0, 1` | `h1`, `p`, `div`, `::before` |

> **Comparison Rule**: Specificity vectors are compared from left to right ($a \to b \to c \to d$). Higher level wins unconditionally. For example, `(0, 1, 0, 0)` beats `(0, 0, 15, 20)`.

---

## 6. Visual Formatting Model & Box Geometry

Every rendered HTML element generates a rectangular box:

```
+---------------------------------------------------------+
|                        MARGIN                           |
|   +-------------------------------------------------+   |
|   |                    BORDER                       |   |
|   |   +-----------------------------------------+   |   |
|   |   |                PADDING                  |   |   |
|   |   |   +---------------------------------+   |   |   |
|   |   |   |            CONTENT              |   |   |   |
|   |   |   |       (width x height)          |   |   |   |
|   |   |   +---------------------------------+   |   |   |
|   |   +-----------------------------------------+   |   |
|   +-------------------------------------------------+   |
+---------------------------------------------------------+
```

### Modern CSS Reset:
```css
*, *::before, *::after {
  box-sizing: border-box; /* Includes padding and border in total width/height */
  margin: 0;
  padding: 0;
}
```

---

## 7. Modern Layout Models: Normal Flow, Flexbox & Grid

- **Normal Flow**: Block elements stack vertically; inline elements flow horizontally along line boxes.
- **Flexbox (1D Layout)**: Distributes space along a single axis (row or column). Ideal for navigation bars, button groups, and vertical centering.
- **CSS Grid (2D Layout)**: Arranges elements across intersecting horizontal rows and vertical columns simultaneously. Ideal for full-page dashboards and complex cards.

---

## 8. Responsive Viewport & Critical Rendering Path

```html
<!-- Mandatory HTML5 Mobile Viewport Declaration -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

### Performance Optimization Rules:
1. **Critical CSS Inlining**: Place critical above-the-fold CSS inside `<style>` in `<head>`.
2. **Asynchronous Scripting**: Use `<script src="..." defer>` so JavaScript parsing does not block DOM construction.
3. **Modern Image Formats**: Serve WebP/AVIF with `<picture>` element and `loading="lazy"`.

---
*Maintained by Satyender Parihar & Antigravity Autonomous Agent. 100% Lightweight Markdown Text & Links.*
