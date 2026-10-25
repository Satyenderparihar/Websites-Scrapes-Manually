# 📄 HTML Cheat Sheet 4: Essential Tags & Syntax Visual Cheat Sheet

> **Source**: 2-Page Visual Syntax & Core Tags Reference  
> **Format**: 100% Lightweight Markdown Text & Code Examples  
> **Topic**: Basic Tags, Body Attributes, Text Formatting, Dividers, Images, Lists, Tables, and Forms  

---

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
