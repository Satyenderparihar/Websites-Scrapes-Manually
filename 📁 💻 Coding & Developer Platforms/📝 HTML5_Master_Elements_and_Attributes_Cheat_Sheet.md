# 🌐 HTML5 Master Cheat Sheet: Complete Elements & Attributes Reference

> **100% Free, Lightweight Text Reference & Documentation Guide**  
> **Extracted & Consolidated from**: HTML.com 53-Page Complete Guide, Hostinger HTML Reference, and W3C/MDN Standards.  
> **Zero Binary Storage**: Pure GitHub-friendly markdown with direct clickable official documentation links.

---

## 📑 Quick Navigation Table of Contents

- [1. Document Structure & Metadata](#1-document-structure--metadata)
- [2. Semantic & Sectioning Elements](#2-semantic--sectioning-elements)
- [3. Text Content & Typography](#3-text-content--typography)
- [4. Inline Text Semantics](#4-inline-text-semantics)
- [5. Links & Anchor Tags](#5-links--anchor-tags)
- [6. Images & Embedded Multimedia](#6-images--embedded-multimedia)
- [7. Lists & Formatting](#7-lists--formatting)
- [8. Tables & Data Representation](#8-tables--data-representation)
- [9. Modern HTML5 Forms & Inputs](#9-modern-html5-forms--inputs)
- [10. Interactive & Dialog Elements](#10-interactive--dialog-elements)
- [11. Global Attributes & Event Handlers](#11-global-attributes--event-handlers)
- [12. Character Entities & Symbols](#12-character-entities--symbols)

---

## 1. Document Structure & Metadata

| Tag | Name | Description | Key Attributes | Official Guide |
| :--- | :--- | :--- | :--- | :-: |
| `<!DOCTYPE html>` | Document Type | Tells browser this is an HTML5 document | None | [MDN Docs](https://developer.mozilla.org/en-US/docs/Glossary/Doctype) |
| `<html lang="en">` | Root Element | Top-level parent element for all HTML code | `lang`, `dir`, `xmlns` | [MDN Docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/html) |
| `<head>` | Document Head | Container for metadata, scripts, stylesheets | None | [MDN Docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/head) |
| `<title>` | Page Title | Sets browser tab title and search engine title | None | [MDN Docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/title) |
| `<meta charset="utf-8">` | Character Encoding | Defines character encoding standard | `charset="utf-8"` | [MDN Docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta) |
| `<meta name="viewport">` | Responsive Viewport | Controls page scale and layout on mobile | `content="width=device-width, initial-scale=1.0"` | [MDN Docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag) |
| `<meta name="description">` | SEO Description | Page description snippet for search engines | `name="description"`, `content="..."` | [MDN Docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta/name) |
| `<link rel="stylesheet">` | External Stylesheet | Links external CSS file to document | `rel="stylesheet"`, `href="style.css"` | [MDN Docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link) |
| `<script src="...">` | JavaScript Script | Embeds or links executable JavaScript code | `src`, `defer`, `async`, `type="module"` | [MDN Docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script) |
| `<body>` | Document Body | Contains all visible rendered elements | Global attributes | [MDN Docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body) |

---

## 2. Semantic & Sectioning Elements

Semantic HTML provides meaning to web page structure for accessibility (screen readers) and SEO.

| Tag | Semantic Role | Usage & Best Practice |
| :--- | :--- | :--- |
| `<header>` | Introductory Content | Banner, logo, primary branding, navigation or search |
| `<nav>` | Navigation Links | Primary site navigation, menus, breadcrumbs, pagination |
| `<main>` | Main Page Body | Central unique content (only 1 `<main>` per page) |
| `<article>` | Independent Content | Self-contained blog post, news story, comment, or card |
| `<section>` | Thematic Group | Group of related content, typically with a heading |
| `<aside>` | Ancillary Sidebar | Related links, sidebars, callout quotes, or advertisements |
| `<footer>` | Document Footer | Copyright, contact info, privacy links, back to top |
| `<address>` | Contact Information | Contact info for article author or site owner |

---

## 3. Text Content & Typography

| Tag | Description | Example / Notes |
| :--- | :--- | :--- |
| `<h1>` to `<h6>` | Headings 1 through 6 | `<h1>` for page title; use hierarchically |
| `<p>` | Paragraph | Standard text paragraph with automatic margin |
| `<hr>` | Thematic Break | Horizontal divider line between sections |
| `<pre>` | Preformatted Text | Preserves whitespace, tabs, and line breaks exactly |
| `<blockquote>` | Block Quotation | Quoted content from external source; uses `cite` attribute |
| `<ol>` | Ordered List | Numbered list (1, 2, 3...); uses `<li>` child elements |
| `<ul>` | Unordered List | Bulleted list; uses `<li>` child elements |
| `<li>` | List Item | Individual item inside `<ol>`, `<ul>`, or `<menu>` |
| `<dl>`, `<dt>`, `<dd>` | Description List | Key-value dictionary terms (`<dt>`) and definitions (`<dd>`) |
| `<figure>`, `<figcaption>` | Figure & Caption | Self-contained media figure with optional caption |

---

## 4. Inline Text Semantics

| Tag | Purpose | Visual / Semantic Behavior |
| :--- | :--- | :--- |
| `<strong>` | Strong Importance | Bold text with semantic high priority |
| `<em>` | Emphasized Stress | Italicized text with semantic stress emphasis |
| `<code>` | Inline Computer Code | Monospaced font for code snippets, functions, variables |
| `<mark>` | Highlighted Text | Yellow highlighter background for search relevance |
| `<small>` | Side Comments / Fine Print | Smaller text for legal notices, disclaimers, copyrights |
| `<del>` / `<ins>` | Deleted / Inserted Text | Strikethrough (`<del>`) and underlined (`<ins>`) text edits |
| `<sub>` / `<sup>` | Subscript / Superscript | Math formulas ($H_2O$) and exponents ($E=mc^2$) |
| `<time>` | Machine-readable Date/Time | Uses `datetime="2026-10-25T15:00:00Z"` attribute |
| `<kbd>` | Keyboard Input | Monospace styling for keyboard shortcuts (`<kbd>Ctrl</kbd> + <kbd>C</kbd>`) |
| `<abbr>` | Abbreviation | Hover expansion tooltip using `title="HyperText Markup Language"` |

---

## 5. Links & Anchor Tags

```html
<!-- External Link with Security Attributes -->
<a href="https://example.com" target="_blank" rel="noopener noreferrer">Visit Website</a>

<!-- Internal Page Bookmark Navigation -->
<a href="#section-title">Jump to Section</a>

<!-- Email & Phone Call Links -->
<a href="mailto:contact@example.com">Send Email</a>
<a href="tel:+1234567890">Call Support</a>

<!-- Download Trigger Link -->
<a href="document.pdf" download="CheatSheet.pdf">Download File</a>
```

---

## 6. Images & Embedded Multimedia

```html
<!-- Responsive WebP Image with Lazy Loading -->
<img src="banner.webp" alt="Clean descriptive alt text" width="800" height="400" loading="lazy">

<!-- Native HTML5 Video Player with Subtitles -->
<video controls poster="thumbnail.jpg" preload="metadata" width="640">
  <source src="movie.webm" type="video/webm">
  <source src="movie.mp4" type="video/mp4">
  <track src="subtitles_en.vtt" kind="subtitles" srclang="en" label="English">
  Your browser does not support video playback.
</video>

<!-- Native HTML5 Audio Player -->
<audio controls preload="none">
  <source src="audio.mp3" type="audio/mpeg">
  <source src="audio.ogg" type="audio/ogg">
</audio>

<!-- Responsive Picture Tag for Art Direction -->
<picture>
  <source media="(min-width: 1024px)" srcset="large.webp">
  <source media="(min-width: 600px)" srcset="medium.webp">
  <img src="small.webp" alt="Responsive layout adaptation">
</picture>
```

---

## 7. Tables & Data Representation

```html
<table>
  <caption>Monthly Developer Tool Adoption</caption>
  <thead>
    <tr>
      <th scope="col">Tool Category</th>
      <th scope="col">Platform</th>
      <th scope="col">Pricing</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Online IDE</th>
      <td>CodePen</td>
      <td>Free / Freemium</td>
    </tr>
    <tr>
      <th scope="row">Version Control</th>
      <td>GitHub</td>
      <td>Free / Pro</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td colspan="2">Total Tools Curated</td>
      <td>1,250+</td>
    </tr>
  </tfoot>
</table>
```

---

## 8. Modern HTML5 Forms & Inputs

| Input Type | Syntax | Purpose / Behavior |
| :--- | :--- | :--- |
| `text` | `<input type="text" placeholder="Full Name" required>` | Standard single-line text input |
| `email` | `<input type="email" autocomplete="email">` | Validates valid email address format (`user@domain`) |
| `password` | `<input type="password" minlength="8">` | Masks typed characters for security |
| `number` | `<input type="number" min="1" max="100" step="5">` | Numeric input with step controls |
| `range` | `<input type="range" min="0" max="100">` | Visual slider control bar |
| `date` | `<input type="date">` | Native browser calendar date picker |
| `checkbox` | `<input type="checkbox" id="tos" checked>` | Multi-select toggle box |
| `radio` | `<input type="radio" name="plan" value="pro">` | Single selection among radio group |
| `file` | `<input type="file" accept="image/*,.pdf" multiple>` | File upload selector |
| `color` | `<input type="color" value="#1F497D">` | Native color palette picker |
| `tel` | `<input type="tel" pattern="[0-9]{10}">` | Telephone keypad on mobile devices |
| `search` | `<input type="search" placeholder="Search...">` | Text field with native clear (X) button |

---

## 9. Interactive & Modern UI Elements

| Tag | Purpose | Visual / Native Feature |
| :--- | :--- | :--- |
| `<details>`, `<summary>` | Collapsible Accordion | Zero-JavaScript native disclosure widget |
| `<dialog>` | Native Modal / Popup | Built-in backdrop and `showModal()` API |
| `<progress>` | Task Progress Bar | Displays completion status (`value="70" max="100"`) |
| `<meter>` | Gauge Measurement | Displays fractional scale (`value="0.6" min="0" max="1"`) |
| `<template>` | Inert Client Template | Hidden DOM content cloned by JavaScript |

---

## 10. Global Attributes (Available on All Elements)

- `class`: Space-separated list of CSS class names.
- `id`: Unique document-wide identifier for styling and anchor linking.
- `data-*`: Custom data storage attributes (e.g., `data-user-id="42"`).
- `hidden`: Boolean attribute hiding element from display.
- `contenteditable`: Enables in-place user text editing.
- `tabindex`: Controls keyboard navigation sequence (`tabindex="0"`).
- `title`: Advisory tooltip displayed on mouse hover.
- `aria-*`: Accessibility attributes for assistive screen readers.

---

*Curated & Formatted by Antigravity Autonomous Agent. 100% Zero-Binary & Markdown-Optimized.*
