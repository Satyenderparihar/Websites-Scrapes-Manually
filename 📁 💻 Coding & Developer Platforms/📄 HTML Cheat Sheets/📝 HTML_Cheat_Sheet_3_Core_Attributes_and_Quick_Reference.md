# 📄 HTML Cheat Sheet 3: Core Attributes & Quick Reference

> **Source**: 1-Page High-Density Developer Attributes & Event Handlers Reference  
> **Format**: 100% Lightweight Markdown Text & Tables  
> **Topic**: Global Core Attributes, Language, Keyboard, Event Handlers, Character Entities, Empty Elements  

---

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
