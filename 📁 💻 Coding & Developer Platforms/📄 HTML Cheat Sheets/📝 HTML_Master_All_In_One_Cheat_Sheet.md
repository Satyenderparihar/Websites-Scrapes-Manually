# 📄 HTML Master All-In-One Cheat Sheet & Web Architecture Guide

> **Unified Single Master Guide**: Consolidated from all 5 specialized HTML Cheat Sheets (Hostinger, Stony Brook University, Core Attributes, Visual Syntax, and HTML5 A-Z Encyclopedia).  
> **Zero-Storage Architecture**: 100% lightweight, full-text searchable Markdown with instant 1-click jump navigation.  
> **100% Complete & Un-truncated**: Every single tag, attribute, HTTP lifecycle diagram, DOM tree explanation, event handler, and HTML5 element is preserved in this single file.

---

## 📑 Master Navigation & Module Index

1. [🌐 Module 1: Web Architecture, HTTP Lifecycle & DOM Tree](#-module-1-web-architecture-http-lifecycle--dom-tree)
2. [📋 Module 2: Core Document Structure, Multimedia, Tables & Forms](#-module-2-core-document-structure-multimedia-tables--forms)
3. [🔑 Module 3: Core Attributes, Keyboard Access & Browser Event Handlers](#-module-3-core-attributes-keyboard-access--browser-event-handlers)
4. [🎨 Module 4: Essential Tags, Formatting, Alignment & Email Compatibility](#-module-4-essential-tags-formatting-alignment--email-compatibility)
5. [📚 Module 5: Complete HTML5 Elements Encyclopedia (A–Z Exhaustive Reference)](#-module-5-complete-html5-elements-encyclopedia-a-z-exhaustive-reference)

---


# 🚀 Module 1: Web Architecture, HTTP Lifecycle & DOM Tree (University CS Guide)

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

---


# 🚀 Module 2: Core Document Structure, Multimedia, Tables & Forms (Hostinger Guide)

## 📑 Table of Contents
1. [Document Summary & Root Structure](#1-document-summary--root-structure)
2. [Document Information & Metadata](#2-document-information--metadata)
3. [Text Formatting Tags](#3-text-formatting-tags)
4. [Links & Anchors](#4-links--anchors)
5. [Images & Multimedia](#5-images--multimedia)
6. [Lists (Ordered, Unordered, Definition)](#6-lists)
7. [Forms & Input Type Attributes](#7-forms--input-type-attributes)
8. [Select & Option Dropdowns](#8-select--option-dropdowns)
9. [Table Formatting](#9-table-formatting)
10. [Objects, iFrames & Embeds](#10-objects-iframes--embeds)
11. [HTML5 New Semantic Tags](#11-html5-new-semantic-tags)
12. [Common Character Entities](#12-common-character-entities)

---

## 1. Document Summary & Root Structure

| Element | Description | Syntax Example | MDN Documentation |
| :--- | :--- | :--- | :-: |
| `<!DOCTYPE html>` | Specifies document type (HTML5 standard) | `<!DOCTYPE html>` | [MDN Docs](https://developer.mozilla.org/en-US/docs/Glossary/Doctype) |
| `<html>` | Root element of the HTML document | `<html lang="en">...</html>` | [MDN Docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/html) |
| `<head>` | Container for metadata, scripts, styles | `<head>...</head>` | [MDN Docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/head) |
| `<body>` | Container for all visible web page content | `<body>...</body>` | [MDN Docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body) |

---

## 2. Document Information & Metadata

```html
<head>
  <!-- Character Encoding (UTF-8 standard) -->
  <meta charset="UTF-8">

  <!-- Responsive Mobile Viewport -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Search Engine Title (Shows on browser tab) -->
  <title>Your Web Page Title</title>

  <!-- SEO Description -->
  <meta name="description" content="Concise description of the web page for search engines.">

  <!-- External Stylesheet -->
  <link rel="stylesheet" href="style.css">

  <!-- Favicon Icon -->
  <link rel="icon" type="image/x-icon" href="favicon.ico">

  <!-- JavaScript Link (Deferred Execution) -->
  <script src="app.js" defer></script>
</head>
```

---

## 3. Text Formatting Tags

| Tag | Purpose | Output Style / Semantic Meaning |
| :--- | :--- | :--- |
| `<h1>` to `<h6>` | Headings | Hierarchical section titles (`<h1>` largest, `<h6>` smallest) |
| `<p>` | Paragraph | Standard text paragraph with automatic margin |
| `<b>` / `<strong>` | Bold / Important | `<b>` is visual bold; `<strong>` adds strong semantic importance |
| `<i>` / `<em>` | Italic / Emphasis | `<i>` is visual italic; `<em>` adds semantic stress emphasis |
| `<mark>` | Highlighted Text | Yellow highlighter background for relevance |
| `<small>` | Fine Print | Smaller font for copyright, legal disclaimers |
| `<del>` / `<ins>` | Strikethrough / Inserted | Displays deleted (`<del>`) and added (`<ins>`) text edits |
| `<sub>` / `<sup>` | Subscript / Superscript | Formulas ($H_2O$) and exponents ($x^2$) |
| `<pre>` | Preformatted Text | Preserves exact spaces, tabs, and line breaks |
| `<blockquote>` | Block Quote | Indented quotation from external source |
| `<code>` | Inline Code | Monospaced font for code snippets |
| `<hr>` | Thematic Divider | Horizontal line separating sections |
| `<br>` | Line Break | Forces text to next line without paragraph spacing |

---

## 4. Links & Anchors

```html
<!-- External Hyperlink (Opens in new tab securely) -->
<a href="https://www.example.com" target="_blank" rel="noopener noreferrer">Visit Example</a>

<!-- Internal Bookmark Navigation -->
<a href="#features">Jump to Features Section</a>

<!-- Direct Email Link -->
<a href="mailto:support@example.com?subject=Inquiry">Send Email</a>

<!-- Direct Phone Dial Link -->
<a href="tel:+1234567890">Call Support</a>

<!-- File Download Link -->
<a href="document.pdf" download="CheatSheet.pdf">Download PDF</a>
```

---

## 5. Images & Multimedia

```html
<!-- Responsive Image with Lazy Loading & Alt Text -->
<img src="banner.webp" alt="Detailed accessible description" width="800" height="400" loading="lazy">

<!-- Native HTML5 Video Player -->
<video controls poster="preview.jpg" width="640">
  <source src="movie.mp4" type="video/mp4">
  <source src="movie.webm" type="video/webm">
  Your browser does not support video playback.
</video>

<!-- Native HTML5 Audio Player -->
<audio controls>
  <source src="track.mp3" type="audio/mpeg">
  <source src="track.ogg" type="audio/ogg">
</audio>
```

---

## 6. Lists

```html
<!-- Unordered List (Bulleted) -->
<ul>
  <li>HTML5 Core Concepts</li>
  <li>CSS3 Responsive Layouts</li>
  <li>JavaScript Interactivity</li>
</ul>

<!-- Ordered List (Numbered) -->
<ol type="1" start="1">
  <li>Step 1: Setup Environment</li>
  <li>Step 2: Write Semantic Code</li>
  <li>Step 3: Deploy to GitHub</li>
</ol>

<!-- Description List (Dictionary Key-Value) -->
<dl>
  <dt>HTML</dt>
  <dd>HyperText Markup Language</dd>
  <dt>CSS</dt>
  <dd>Cascading Style Sheets</dd>
</dl>
```

---

## 7. Forms & Input Type Attributes

```html
<form action="/submit" method="POST" enctype="multipart/form-data">
  <!-- Text Input -->
  <label for="username">Username:</label>
  <input type="text" id="username" name="username" placeholder="Enter username" required>

  <!-- Email Input -->
  <label for="email">Email Address:</label>
  <input type="email" id="email" name="email" autocomplete="email" required>

  <!-- Password Input -->
  <label for="pwd">Password:</label>
  <input type="password" id="pwd" name="pwd" minlength="8" required>

  <!-- Number Input -->
  <label for="age">Age (18-99):</label>
  <input type="number" id="age" name="age" min="18" max="99">

  <!-- Range Slider -->
  <label for="volume">Volume:</label>
  <input type="range" id="volume" name="volume" min="0" max="100">

  <!-- Date Picker -->
  <label for="dob">Date of Birth:</label>
  <input type="date" id="dob" name="dob">

  <!-- Checkbox -->
  <input type="checkbox" id="terms" name="terms" required>
  <label for="terms">I accept the terms and conditions</label>

  <!-- Radio Group -->
  <input type="radio" id="free" name="plan" value="free" checked>
  <label for="free">Free</label>
  <input type="radio" id="pro" name="plan" value="pro">
  <label for="pro">Pro</label>

  <!-- File Upload -->
  <label for="resume">Upload Resume:</label>
  <input type="file" id="resume" name="resume" accept=".pdf,.docx">

  <!-- Color Picker -->
  <label for="theme">Brand Color:</label>
  <input type="color" id="theme" name="theme" value="#0055ff">

  <!-- Multi-line Text Area -->
  <label for="comments">Comments:</label>
  <textarea id="comments" name="comments" rows="4" cols="50"></textarea>

  <!-- Submit & Reset Buttons -->
  <button type="submit">Submit Form</button>
  <button type="reset">Clear Form</button>
</form>
```

---

## 8. Select & Option Dropdowns

```html
<label for="country">Choose Country:</label>
<select id="country" name="country">
  <optgroup label="North America">
    <option value="us">United States</option>
    <option value="ca">Canada</option>
  </optgroup>
  <optgroup label="Asia">
    <option value="in" selected>India</option>
    <option value="jp">Japan</option>
  </optgroup>
</select>
```

---

## 9. Table Formatting

```html
<table border="1">
  <caption>Developer Cheat Sheets Overview</caption>
  <thead>
    <tr>
      <th>Cheat Sheet #</th>
      <th>Resource Title</th>
      <th>Format</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>Hostinger HTML Reference</td>
      <td>Markdown (.md)</td>
      <td>Active</td>
    </tr>
    <tr>
      <td>2</td>
      <td>Stony Brook CSE316 Web Guide</td>
      <td>Markdown (.md)</td>
      <td>Active</td>
    </tr>
    <tr>
      <td>3</td>
      <td>Core Attributes & Quick Ref</td>
      <td>Markdown (.md)</td>
      <td>Active</td>
    </tr>
    <tr>
      <td>4</td>
      <td>Essential Tags & Visual Ref</td>
      <td>Markdown (.md)</td>
      <td>Active</td>
    </tr>
    <tr>
      <td>5</td>
      <td>HTML5 Comprehensive Elements</td>
      <td>Markdown (.md)</td>
      <td>Active</td>
    </tr>
  </tbody>
</table>
```

---

## 10. Objects, iFrames & Embeds

```html
<!-- Responsive iFrame with Security Sandbox -->
<iframe src="https://example.com" width="600" height="400" title="Embedded Webpage" loading="lazy" sandbox="allow-scripts allow-same-origin"></iframe>

<!-- Embedded Media Object -->
<object data="presentation.pdf" type="application/pdf" width="600" height="400">
  <p>Alternative text if object cannot be displayed.</p>
</object>
```

---

## 11. HTML5 New Semantic Tags

| Semantic Tag | Purpose & Location |
| :--- | :--- |
| `<header>` | Site banner, branding, top navigation |
| `<nav>` | Main website navigation links |
| `<main>` | Core unique content of the page (1 per page) |
| `<article>` | Independent self-contained blog post or card |
| `<section>` | Thematic chapter or content segment |
| `<aside>` | Sidebar, related links, or advertisements |
| `<footer>` | Copyright, legal links, back to top |
| `<figure>` / `<figcaption>` | Self-contained graphic or photo with caption |
| `<details>` / `<summary>` | Native accordion toggle without JavaScript |

---

## 12. Common Character Entities

| Symbol | Entity Name | Entity Number | Description |
| :---: | :--- | :--- | :--- |
| ` ` | `&nbsp;` | `&#160;` | Non-breaking space |
| `<` | `&lt;` | `&#60;` | Less than |
| `>` | `&gt;` | `&#62;` | Greater than |
| `&` | `&amp;` | `&#38;` | Ampersand |
| `"` | `&quot;` | `&#34;` | Quotation mark |
| `'` | `&apos;` | `&#39;` | Apostrophe |
| `©` | `&copy;` | `&#169;` | Copyright symbol |
| `®` | `&reg;` | `&#174;` | Registered trademark |
| `™` | `&trade;` | `&#8482;` | Trademark symbol |
| `₹` | `&#8377;` | `&#8377;` | Indian Rupee |
| `€` | `&euro;` | `&#8364;` | Euro symbol |

---
*Maintained by Satyender Parihar & Antigravity Autonomous Agent. 100% Lightweight Markdown Text & Links.*

---


# 🚀 Module 3: Core Attributes, Keyboard Access & Browser Event Handlers

## 📑 Quick Navigation
1. [Core Attributes](#1-core-attributes)
2. [Language & Direction Attributes](#2-language--direction-attributes)
3. [Keyboard & Focus Attributes](#3-keyboard--focus-attributes)
4. [Standard Browser Event Handlers](#4-standard-browser-event-handlers)
5. [Document Outline & Empty Elements](#5-document-outline--empty-elements)
6. [Common Character Entities Table](#6-common-character-entities-table)

---

## 1. Core Attributes

*Note: Core attributes may be used on almost all HTML elements, except `<base>`, `<head>`, `<html>`, `<meta>`, `<param>`, `<script>`, `<style>`, and `<title>`.*

| Attribute | Meaning | Purpose & Example |
| :--- | :--- | :--- |
| `id` | Unique ID | Identifier unique to a single element (`id="main-nav"`) |
| `class` | Class Name | Space-separated list of styling classes (`class="btn active"`) |
| `style` | Inline CSS | Direct CSS rules applied to element (`style="color: red;"`) |
| `title` | Tooltip Title | Advisory text displayed on hover tooltip (`title="Click to submit"`) |

---

## 2. Language & Direction Attributes

*Note: May not be used on `<base>`, `<br>`, `<frame>`, `<frameset>`, `<hr>`, `<iframe>`, `<param>`, or `<script>`.*

| Attribute | Permitted Values | Purpose |
| :--- | :--- | :--- |
| `lang` | `en`, `hi`, `fr`, `es`, `de` | Sets ISO language code for pronunciation/readers |
| `dir` | `ltr` (Left-to-Right), `rtl` (Right-to-Left) | Sets text direction for scripts like Arabic/Hebrew |

---

## 3. Keyboard & Focus Attributes

| Attribute | Purpose & Usage |
| :--- | :--- |
| `accesskey` | Keyboard shortcut trigger (e.g., `accesskey="s"` activates with Alt+S or Cmd+S) |
| `tabindex` | Controls tabbing order: `0` (natural flow), `-1` (programmatic only), `>0` (explicit order) |

---

## 4. Standard Browser Event Handlers

### 🪟 Window Events
- `onload`: Fires when page has completely loaded (DOM + images).
- `onunload`: Fires when user navigates away or closes tab.

### 📝 Form Events
- `onblur`: Element loses focus.
- `onfocus`: Element gains focus.
- `onchange`: Element value changes and loses focus.
- `onselect`: User highlights text inside input.
- `onsubmit`: Form submission attempt.
- `onreset`: Form reset trigger.

### ⌨️ Keyboard Events
- `onkeydown`: Key is pressed down.
- `onkeypress`: Key is held down producing character (legacy).
- `onkeyup`: Key is released.

### 🖱️ Mouse Events
- `onclick`: Primary mouse button clicked.
- `ondblclick`: Element double-clicked.
- `onmousedown`: Mouse button pressed down over element.
- `onmouseup`: Mouse button released over element.
- `onmouseover`: Mouse cursor enters element boundary.
- `onmousemove`: Mouse moves over element.
- `onmouseout`: Mouse cursor leaves element boundary.

---

## 5. Document Outline & Empty Elements

### Document Outline
```html
<!DOCTYPE html>
<html>
  <head>
    <title>Page Title</title>
  </head>
  <body>
    <!-- Content visible to user -->
  </body>
</html>
```

### Void / Empty Elements (No Closing Tag)
`<area />`, `<base />`, `<br />`, `<col />`, `<embed />`, `<hr />`, `<img />`, `<input />`, `<link />`, `<meta />`, `<param />`, `<source />`, `<track />`, `<wbr />`

---

## 6. Common Character Entities Table

| Character | Entity Name | Entity Number | Unicode | Meaning |
| :---: | :--- | :--- | :--- | :--- |
| `"` | `&quot;` | `&#34;` | `U+0022` | Quotation Mark |
| `&` | `&amp;` | `&#38;` | `U+0026` | Ampersand |
| `<` | `&lt;` | `&#60;` | `U+003C` | Less Than |
| `>` | `&gt;` | `&#62;` | `U+003E` | Greater Than |
| `@` | `&#64;` | `&#64;` | `U+0040` | At Sign |
| `€` | `&euro;` | `&#128;` | `U+20AC` | Euro Currency |
| `•` | `&bull;` | `&#149;` | `U+2022` | Bullet Point |
| `™` | `&trade;` | `&#153;` | `U+2122` | Trademark Symbol |
| `£` | `&pound;` | `&#163;` | `U+00A3` | British Pound |
| `©` | `&copy;` | `&#169;` | `U+00A9` | Copyright Symbol |
| ` ` | `&nbsp;` | `&#160;` | `U+00A0` | Non-Breaking Space |

---
*Maintained by Satyender Parihar & Antigravity Autonomous Agent. 100% Lightweight Markdown Text & Links.*

---


# 🚀 Module 4: Essential Tags, Formatting, Alignment & Email Compatibility

## 📑 Table of Contents
1. [Basic Document Tags](#1-basic-document-tags)
2. [Legacy Body Attributes (For HTML Email Compatibility)](#2-legacy-body-attributes-for-html-email-compatibility)
3. [Text Tags & Typography](#3-text-tags--typography)
4. [Links & Anchors](#4-links--anchors)
5. [Dividers & Alignment](#5-dividers--alignment)
6. [Graphical & Media Elements](#6-graphical--media-elements)
7. [Lists](#7-lists)
8. [Tables & Formatting](#8-tables--formatting)
9. [Forms & Input Elements](#9-forms--input-elements)

---

## 1. Basic Document Tags

```html
<html> </html>
<!-- Creates an HTML document container -->

<head> </head>
<!-- Sets off the title and header metadata not displayed in page body -->

<body> </body>
<!-- Sets off the visible portion of the document -->

<title> </title>
<!-- Sets name in browser tab; also used when bookmarking pages -->
```

---

## 2. Legacy Body Attributes (For HTML Email Compatibility)

*Note: Modern web design uses CSS (`background-color`, `color`). These body attributes remain relevant for crafting universal HTML email templates:*

| Attribute | Function | Example |
| :--- | :--- | :--- |
| `<body bgcolor=?>` | Sets background color by name or hex | `<body bgcolor="#ffffff">` |
| `<body text=?>` | Sets default text color | `<body text="#333333">` |
| `<body link=?>` | Sets color of unvisited links | `<body link="#0000ff">` |
| `<body vlink=?>` | Sets color of visited links | `<body vlink="#800080">` |
| `<body alink=?>` | Sets color of active link when clicked | `<body alink="#ff0000">` |

---

## 3. Text Tags & Typography

```html
<pre> </pre>
<!-- Creates preformatted text preserving exact spaces and line breaks -->

<h1> </h1> to <h6> </h6>
<!-- Creates headlines: <h1> is largest (main title), <h6> is smallest -->

<b> </b>
<!-- Bold text (Visual only; use <strong> for semantic importance) -->

<i> </i>
<!-- Italic text (Visual only; use <em> for stress emphasis) -->

<tt> </tt>
<!-- Typewriter-style teletype text (Use <code> in modern HTML) -->

<code> </code>
<!-- Inline computer source code formatted in monospace font -->

<cite> </cite>
<!-- Citation of a creative work title (rendered in italics) -->

<address> </address>
<!-- Contact info for article author or organisation -->

<em> </em>
<!-- Emphasizes word or phrase (rendered in italics with screen-reader inflection) -->

<strong> </strong>
<!-- Strong importance (rendered in bold with screen-reader emphasis) -->
```

---

## 4. Links & Anchors

```html
<!-- Hyperlink to web page -->
<a href="https://example.com">Visit Website</a>

<!-- Link to internal anchor point -->
<a href="#target-id">Jump to Section</a>

<!-- Define internal anchor target -->
<div id="target-id">Section Destination</div>

<!-- Direct Email link -->
<a href="mailto:name@example.com">Email Us</a>
```

---

## 5. Dividers & Alignment

```html
<!-- Horizontal rule divider -->
<hr>

<!-- Line break -->
<p>First line.<br>Second line without paragraph margin.</p>
```

---

## 6. Graphical & Media Elements

```html
<!-- Standard Responsive Image -->
<img src="photo.jpg" alt="Description of image" width="600" height="400" align="left">
<!-- align values: top, middle, bottom, left, right (modern styling uses float or flex) -->
```

---

## 7. Lists

```html
<!-- Unordered Bullet List -->
<ul type="disc"> <!-- types: disc, circle, square -->
  <li>First item</li>
  <li>Second item</li>
</ul>

<!-- Ordered Numbered List -->
<ol type="1" start="1"> <!-- types: 1, a, A, i, I -->
  <li>Step One</li>
  <li>Step Two</li>
</ol>

<!-- Definition Dictionary List -->
<dl>
  <dt>HTML</dt>
  <dd>HyperText Markup Language</dd>
  <dt>CSS</dt>
  <dd>Cascading Style Sheets</dd>
</dl>
```

---

## 8. Tables & Formatting

```html
<table border="1" cellpadding="8" cellspacing="0" width="100%">
  <tr>
    <th colspan="2">Developer Tech Stack</th>
  </tr>
  <tr>
    <td align="left">Frontend</td>
    <td align="right">HTML5, CSS3, React</td>
  </tr>
  <tr>
    <td align="left">Backend</td>
    <td align="right">Python, Node.js, Go</td>
  </tr>
</table>
```

---

## 9. Forms & Input Elements

```html
<form action="/login" method="POST">
  <input type="text" name="user" size="20" placeholder="Username"><br>
  <input type="password" name="pass" size="20" placeholder="Password"><br>
  <input type="checkbox" name="remember" value="yes" checked> Remember Me<br>
  <input type="radio" name="role" value="admin"> Administrator
  <input type="radio" name="role" value="user" checked> User<br>
  <input type="submit" value="Log In">
  <input type="reset" value="Reset">
</form>
```

---
*Maintained by Satyender Parihar & Antigravity Autonomous Agent. 100% Lightweight Markdown Text & Links.*

---


# 🚀 Module 5: Complete HTML5 Elements Encyclopedia (A–Z Exhaustive Reference)

## 📑 Alphabetical Index of Elements

| Tag | Category | Description & Usage | MDN Official Guide |
| :--- | :--- | :--- | :-: |
| `<a>` | Links | Hyperlink to URLs, bookmarks, mailto, phone | [MDN a](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a) |
| `<abbr>` | Inline | Abbreviation or acronym with expansion tooltip | [MDN abbr](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/abbr) |
| `<address>` | Sections | Contact info for article author or company | [MDN address](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/address) |
| `<area>` | Media | Clickable hot-spot area inside an image map | [MDN area](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/area) |
| `<article>` | Sections | Self-contained, independently distributable content | [MDN article](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) |
| `<aside>` | Sections | Sidebar content indirectly related to main text | [MDN aside](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/aside) |
| `<audio>` | Media | Native sound audio player with playback controls | [MDN audio](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio) |
| `<b>` | Inline | Stylistic bold text without implied importance | [MDN b](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/b) |
| `<base>` | Metadata | Base URL and default target for all relative links | [MDN base](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base) |
| `<bdi>` | Inline | Bidirectional isolation for foreign scripts | [MDN bdi](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/bdi) |
| `<bdo>` | Inline | Bidirectional override to force text direction | [MDN bdo](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/bdo) |
| `<blockquote>` | Text | Long quotation from external cited source | [MDN blockquote](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/blockquote) |
| `<body>` | Root | Container for all visible web page body elements | [MDN body](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body) |
| `<br>` | Text | Line break within text | [MDN br](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/br) |
| `<button>` | Forms | Clickable form button (submit, reset, button) | [MDN button](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button) |
| `<canvas>` | Media | Scriptable 2D/3D graphics and game drawing canvas | [MDN canvas](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas) |
| `<caption>` | Tables | Title caption for a data table | [MDN caption](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/caption) |
| `<cite>` | Inline | Title of a cited creative work (book, movie, paper) | [MDN cite](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/cite) |
| `<code>` | Inline | Source code fragment in monospace font | [MDN code](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/code) |
| `<col>` | Tables | Column properties inside table colgroup | [MDN col](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/col) |
| `<colgroup>` | Tables | Group of columns in table for formatting | [MDN colgroup](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/colgroup) |
| `<data>` | Inline | Machine-readable data value linked to content | [MDN data](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/data) |
| `<datalist>` | Forms | Predefined autocomplete options for `<input>` | [MDN datalist](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist) |
| `<dd>` | Lists | Description/definition in description list `<dl>` | [MDN dd](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dd) |
| `<del>` | Text | Deleted / struck-through text edit | [MDN del](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/del) |
| `<details>` | Interactive | Collapsible disclosure accordion widget | [MDN details](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) |
| `<dfn>` | Inline | Defining instance of a term | [MDN dfn](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dfn) |
| `<dialog>` | Interactive | Native modal dialog box or popup window | [MDN dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) |
| `<div>` | Generic | Generic block division container | [MDN div](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/div) |
| `<dl>` | Lists | Description / dictionary list container | [MDN dl](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl) |
| `<dt>` | Lists | Term / key in description list | [MDN dt](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dt) |
| `<em>` | Inline | Semantic stress emphasis (rendered italic) | [MDN em](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/em) |
| `<embed>` | Media | Integration container for external applications | [MDN embed](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/embed) |
| `<fieldset>` | Forms | Group of related form inputs with a legend | [MDN fieldset](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset) |
| `<figcaption>` | Media | Caption text for `<figure>` element | [MDN figcaption](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figcaption) |
| `<figure>` | Media | Self-contained media illustration with caption | [MDN figure](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure) |
| `<footer>` | Sections | Footer for page or nearest sectioning ancestor | [MDN footer](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/footer) |
| `<form>` | Forms | Interactive form container for user data input | [MDN form](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form) |
| `<h1>-<h6>` | Sections | Heading levels 1 to 6 | [MDN headings](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements) |
| `<head>` | Metadata | Metadata container (title, styles, scripts) | [MDN head](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/head) |
| `<header>` | Sections | Introductory content or navigational container | [MDN header](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/header) |
| `<hr>` | Text | Thematic break between paragraphs | [MDN hr](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/hr) |
| `<html>` | Root | Top-level parent element for HTML page | [MDN html](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/html) |
| `<i>` | Inline | Idiomatic text / italic voice | [MDN i](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/i) |
| `<iframe>` | Media | Embedded nested browsing context (iframe) | [MDN iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe) |
| `<img>` | Media | Embedded raster or SVG graphic image | [MDN img](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img) |
| `<input>` | Forms | Interactive input control (text, email, file, etc.) | [MDN input](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input) |
| `<ins>` | Text | Inserted text addition | [MDN ins](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ins) |
| `<kbd>` | Inline | Keyboard input representation | [MDN kbd](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/kbd) |
| `<label>` | Forms | Accessible caption for a form control | [MDN label](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label) |
| `<legend>` | Forms | Caption title for a `<fieldset>` | [MDN legend](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/legend) |
| `<li>` | Lists | Single item inside `<ol>`, `<ul>`, or `<menu>` | [MDN li](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/li) |
| `<link>` | Metadata | Relationship link to external resources (CSS) | [MDN link](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link) |
| `<main>` | Sections | Dominant, unique contents of page `<body>` | [MDN main](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/main) |
| `<map>` | Media | Image map clickable coordinate regions | [MDN map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/map) |
| `<mark>` | Inline | Highlighted text for reference/search relevance | [MDN mark](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/mark) |
| `<meta>` | Metadata | Document metadata (charset, viewport, description) | [MDN meta](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta) |
| `<meter>` | Interactive | Scalar measurement within known range (gauge) | [MDN meter](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meter) |
| `<nav>` | Sections | Section containing main navigation links | [MDN nav](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav) |
| `<noscript>` | Scripting | Fallback HTML rendered when scripts disabled | [MDN noscript](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/noscript) |
| `<object>` | Media | External resource container (PDF, SVG, Flash) | [MDN object](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/object) |
| `<ol>` | Lists | Ordered list of numbered items | [MDN ol](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol) |
| `<optgroup>` | Forms | Group of `<option>` items in `<select>` | [MDN optgroup](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/optgroup) |
| `<option>` | Forms | Choice item inside `<select>` or `<datalist>` | [MDN option](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/option) |
| `<output>` | Forms | Container for calculation result | [MDN output](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output) |
| `<p>` | Text | Standard text paragraph | [MDN p](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/p) |
| `<picture>` | Media | Responsive image container with `<source>` | [MDN picture](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/picture) |
| `<pre>` | Text | Preformatted text preserving spaces & breaks | [MDN pre](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/pre) |
| `<progress>` | Interactive | Completion progress bar for task | [MDN progress](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress) |
| `<q>` | Inline | Short inline quotation (browser adds quotes) | [MDN q](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/q) |
| `<script>` | Scripting | Embeds executable client script (JavaScript) | [MDN script](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script) |
| `<section>` | Sections | Generic standalone thematic content section | [MDN section](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/section) |
| `<select>` | Forms | Drop-down menu control | [MDN select](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select) |
| `<small>` | Inline | Side-comments, fine print, copyright text | [MDN small](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/small) |
| `<source>` | Media | Media source alternative for `<video>`/`<audio>` | [MDN source](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/source) |
| `<span>` | Generic | Generic inline text container | [MDN span](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/span) |
| `<strong>` | Inline | Strong importance / serious priority | [MDN strong](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/strong) |
| `<style>` | Metadata | Embedded CSS styling rules | [MDN style](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/style) |
| `<sub>` | Inline | Subscript text formula ($H_2O$) | [MDN sub](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/sub) |
| `<summary>` | Interactive | Disclosure summary caption for `<details>` | [MDN summary](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/summary) |
| `<sup>` | Inline | Superscript exponent text ($x^2$) | [MDN sup](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/sup) |
| `<table>` | Tables | Tabular data representation table | [MDN table](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table) |
| `<tbody>` | Tables | Body rows container in table | [MDN tbody](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tbody) |
| `<td>` | Tables | Table data cell containing content | [MDN td](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/td) |
| `<template>` | Interactive | Inert client template for JavaScript cloning | [MDN template](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template) |
| `<textarea>` | Forms | Multi-line text input control | [MDN textarea](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea) |
| `<tfoot>` | Tables | Footer summary rows container in table | [MDN tfoot](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tfoot) |
| `<th>` | Tables | Table header cell (bold and centered by default) | [MDN th](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/th) |
| `<thead>` | Tables | Header rows container in table | [MDN thead](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/thead) |
| `<time>` | Inline | Machine-readable date/time representation | [MDN time](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) |
| `<title>` | Metadata | Browser window / tab title | [MDN title](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/title) |
| `<tr>` | Tables | Row of cells in a table | [MDN tr](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tr) |
| `<track>` | Media | Text track subtitles/captions for `<video>` | [MDN track](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/track) |
| `<u>` | Inline | Unarticulated text decoration (spelling error) | [MDN u](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/u) |
| `<ul>` | Lists | Unordered bulleted list container | [MDN ul](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ul) |
| `<var>` | Inline | Mathematical variable name in monospace | [MDN var](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/var) |
| `<video>` | Media | Native video player with controls | [MDN video](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video) |
| `<wbr>` | Text | Word break opportunity in long strings | [MDN wbr](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/wbr) |

---
*Maintained by Satyender Parihar & Antigravity Autonomous Agent. 100% Lightweight Markdown Text & Links.*

---

*Curated and consolidated into a Single Master Guide by Satyender Parihar & Antigravity Autonomous Agent.*