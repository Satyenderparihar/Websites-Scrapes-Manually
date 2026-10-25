# 📄 HTML Cheat Sheet 1: Hostinger Complete HTML Reference

> **Source**: Hostinger Official 9-Page Comprehensive Cheat Sheet Guide  
> **Format**: 100% Lightweight Markdown Text & Clickable Official Links  
> **Topic**: Document Structure, Tags, Forms, Tables, iFrames, and HTML5 Elements  

---

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
