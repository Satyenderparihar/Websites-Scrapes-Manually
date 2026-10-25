"""
🌐 Autonomous Manual Websites Agent & Curated Directory Suite
100% Free, Zero-API-Fee, Autonomous Link Ingestion, Categorization, Deduplication & GitHub Auto-Sync Engine.
Designed for Antigravity & User: Satyender Parihar (Satyenderparihar)
"""

import os
import sys
import re
import json
import glob
import time
import subprocess
import urllib.parse
import requests
import urllib3
from bs4 import BeautifulSoup
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "💾 websites_database.json")
MASTER_MD = os.path.join(BASE_DIR, "📝 Master_Curated_Websites_Report.md")
MASTER_XLSX = os.path.join(BASE_DIR, "📊 Websites_Master_List.xlsx")
README_FILE = os.path.join(BASE_DIR, "README.md")
INPUT_FILE = os.path.join(BASE_DIR, "💾 paste_links_here.txt")
DOWNLOADS_DIR = r"C:\Users\satyanarayan verma\Downloads"

CATEGORIES = {
    "🎵 Music & Audio Streaming": {
        "folder": "📁 🎵 Music & Audio Streaming",
        "desc": "Official music streaming platforms, Indian & global audio hubs, vocal extraction and production tools."
    },
    "📻 Online Radio & Interactive Maps": {
        "folder": "📁 📻 Online Radio & Interactive Maps",
        "desc": "Global live interactive radio maps, globe rotating tuners, and international frequency streams."
    },
    "📺 Global TV & Media Discovery": {
        "folder": "📁 📺 Global TV & Media Discovery",
        "desc": "Worldwide live TV channels, vintage nostalgic television simulators, webcams & broadcast discovery."
    },
    "⬇️ Video & Media Downloaders": {
        "folder": "📁 ⬇️ Video & Media Downloaders",
        "desc": "Fast online downloaders & converters for YouTube, Instagram, Facebook, Pinterest, Twitter & video media."
    },
    "💻 Coding & Developer Platforms": {
        "folder": "📁 💻 Coding & Developer Platforms",
        "desc": "Coding practice, cloud IDEs, language references, GitHub repos, cheat sheets, developer tools & project implementations."
    },
    "🤖 AI & Machine Learning Tools": {
        "folder": "📁 🤖 AI & Machine Learning Tools",
        "desc": "Cutting-edge Generative AI builders, neural models, agentic workflows, LLM tools & prompt suites."
    },
    "🎓 Free Courses & Learning Platforms": {
        "folder": "📁 🎓 Free Courses & Learning Platforms",
        "desc": "High-impact free certification courses, computer science tutorials, AI academies & skill bootcamps."
    },
    "📄 PDF & Document Utilities": {
        "folder": "📁 📄 PDF & Document Utilities",
        "desc": "Online PDF editors, format converters, document mergers, splitters and lightweight office utilities."
    },
    "🛠️ Web Utilities & Productivity": {
        "folder": "📁 🛠️ Web Utilities & Productivity",
        "desc": "Universal web tools, personal workspaces, open file search engines, and daily browser utilities."
    },
    "🎨 Design & Creator Tools": {
        "folder": "📁 🎨 Design & Creator Tools",
        "desc": "Social media template packs, 3D modeling, lightweight JS animation libraries, and graphic assets."
    },
    "🎮 Gaming & Entertainment": {
        "folder": "📁 🎮 Gaming & Entertainment",
        "desc": "Browser multiplayer party games, retro simulators, and casual entertainment platforms."
    },
    "🌐 General Curated Tools": {
        "folder": "📁 🌐 General Curated Tools",
        "desc": "Curated online resources and verified web applications across diverse domains."
    }
}

VALID_TLDS = set([
    'com', 'org', 'net', 'edu', 'gov', 'mil', 'io', 'ai', 'co', 'app', 'dev', 'tv', 'me', 'in', 'is', 'so', 'gg',
    'cc', 'ly', 'to', 'la', 'fm', 'xyz', 'tech', 'online', 'site', 'store', 'club', 'pro', 'studio', 'tools', 'garden',
    'lol', 'live', 'page', 'space', 'fun', 'design', 'world', 'media', 'stream', 'cloud'
])

def clean_url(u):
    if not u:
        return ""
    u = str(u).strip().strip("'\"<>[]()")
    if " " in u or "\n" in u or "\t" in u:
        return ""
    if not u.startswith("http://") and not u.startswith("https://"):
        if "." in u and not u.startswith("="):
            u = "https://" + u
    parsed = urllib.parse.urlparse(u)
    if not parsed.netloc:
        return ""
    parts = parsed.netloc.lower().split('.')
    if len(parts) < 2:
        return ""
    tld = parts[-1].split(':')[0]
    if tld not in VALID_TLDS and len(tld) > 6:
        return ""
    clean_query = []
    if parsed.query:
        for qp in parsed.query.split('&'):
            if not any(qp.startswith(t) for t in ['utm_', 'fbclid', 'gclid', 'ref_']):
                clean_query.append(qp)
    query_str = '&'.join(clean_query)
    clean = urllib.parse.urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, query_str, ''))
    return clean.rstrip('/')

def get_domain_key(url):
    parsed = urllib.parse.urlparse(url)
    domain = parsed.netloc.lower()
    if domain.startswith("www."):
        domain = domain[4:]
    path = parsed.path.rstrip('/')
    if len(path) > 1 and any(sub in domain for sub in ['youtube.com', 'instagram.com', 'github.com', 'coursera.org', 'analyticsvidhya.com', 'stpcomputereducation.com']):
        return f"{domain}{path}"
    return domain

def normalize_pricing(p):
    if not p:
        return "Free"
    p_lower = str(p).lower().strip()
    if "free" in p_lower and "paid" in p_lower:
        return "Free + Paid"
    if "freemium" in p_lower:
        return "Freemium"
    if "paid" in p_lower:
        return "Paid"
    if "free" in p_lower or "open source" in p_lower or "audit" in p_lower:
        return "Free"
    return str(p).strip()

def derive_website_type(site_name, category, desc, url):
    d = f"{site_name} {category} {desc} {url}".lower()
    if 'downloader' in d or 'download' in d:
        if 'facebook' in d: return "Facebook Video Downloader"
        if 'instagram' in d: return "Instagram Downloader"
        if 'pinterest' in d: return "Pinterest Video Downloader"
        if 'twitter' in d or 'x.com' in d: return "Twitter Video Downloader"
        if 'youtube' in d and 'mp4' in d: return "YouTube to MP4 Converter"
        if 'youtube' in d: return "YouTube Video Downloader"
        if 'subtitle' in d: return "Subtitle Automation Tool"
        if 'timestamp' in d: return "YouTube Video & MP3 Timestamp Downloader"
        return "Universal Media Downloader"
    if any(k in d for k in ['radio.garden', 'radio garden', 'online radio', 'radio map']):
        return "Online Radio Map"
    if any(k in d for k in ['tv garden', 'tv.garden', 'famelack', 'live tv', 'global tv']):
        return "Global TV Discovery"
    if 'retrotvs' in d or '90s tv' in d: return "Retro TV Channel Simulator"
    if 'camera' in d or 'earthcam' in d: return "Live Camera Streaming"
    if 'virtual vacation' in d or 'virtual travel' in d: return "Virtual Travel Platform"
    if 'gaana' in d or 'jiosaavn' in d or 'music streaming (india)' in d: return "Music Streaming (India)"
    if any(k in d for k in ['youtube music', 'spotify', 'apple music', 'soundcloud', 'music streaming']): return "Music Streaming"
    if 'acapella' in d or 'vocals' in d: return "AI Vocal & Acapella Extractor"
    if 'agentic' in d: return "Agentic AI Course"
    if 'generative ai' in d or 'genai' in d: return "Generative AI Course"
    if 'rag' in d: return "RAG Application Course"
    if 'vibe coding' in d: return "Vibe Coding Course"
    if 'machine learning' in d or 'deep learning' in d: return "Machine Learning Course"
    if 'deepseek' in d or 'openai' in d or 'model' in d: return "AI Model Deep Dive Course"
    if 'project' in d: return "Project-Based Learning Course"
    if 'data analytics' in d or 'data science' in d: return "Data Science Course"
    if 'computer courses' in d: return "Computer Courses Platform"
    if 'study notes' in d: return "Study Notes / Learning Material"
    if 'web development' in d: return "Web Development Course"
    if 'skill development' in d or 'learnvern' in d: return "Skill Development Platform"
    if 'english' in d: return "English Learning Page"
    if 'google training' in d or 'skillshop' in d: return "Official Google Training"
    if 'cloud training' in d: return "Cloud Training Path"
    if 'free program' in d or 'combo' in d: return "Free Program Combo Bundle"
    if 'course' in d or 'tutorial' in d: return "Online Course Platform"
    if 'sejda' in d or ('pdf' in d and 'editor' in d): return "Online PDF Editor"
    if 'tinywow' in d: return "Multi-Tool Suite (PDF & Media)"
    if 'pdf chef' in d or 'mobile' in d and 'pdf' in d: return "Mobile PDF Tool"
    if 'pdf' in d: return "PDF & Document Tool"
    if 'replit' in d or 'ai website builder' in d: return "AI Website Builder & IDE"
    if 'template' in d or 'hyperpost' in d: return "Social Media Template Booster"
    if 'car repair' in d or '1aauto' in d: return "DIY Vehicle Repair Guides"
    if '3dtuning' in d or 'car customization' in d: return "3D Vehicle Customizer"
    if 'airconsole' in d or 'multiplayer party' in d: return "Phone-Controller Multiplayer Games"
    if 'animejs' in d or 'animation library' in d: return "JavaScript Animation Engine"
    if 'filepursuit' in d or 'file search' in d: return "File Search Engine"
    if 'pi7' in d or 'image processing' in d: return "Image Processing Tool"
    if 'flightradar' in d or 'flight tracking' in d: return "Flight Tracking Platform"
    if 'zoomquilt' in d: return "Interactive Visual Experience"
    if 'xtiles' in d or 'workspace' in d: return "Workspace / Productivity"
    if '123apps' in d or 'utility tools' in d: return "Online Utility Tools"
    if '10015' in d or 'developer tools' in d: return "Developer Tools"
    if 'mrfreetools' in d or 'free online tools' in d: return "Free Online Tools Collection"
    if 'website planet' in d: return "Web Utilities"
    if category and category != "🌐 General Curated Tools": return category
    return "Curated Web Platform"

def normalize_category(raw_cat, site_name="", url="", desc="", website_type=""):
    text = f"{raw_cat} {site_name} {url} {desc} {website_type}".lower()
    if any(k in text for k in ['radio.garden', 'radio garden', 'online radio', 'radio map', 'live radio']):
        return "📻 Online Radio & Interactive Maps"
    if any(k in text for k in ['tv garden', 'tv.garden', 'famelack', 'live tv', 'global tv', 'retro tv', 'retrotvs', 'earthcam', 'camera streaming', 'virtual vacation']):
        return "📺 Global TV & Media Discovery"
    if any(k in text for k in ['music streaming', 'youtube music', 'spotify', 'soundcloud', 'gaana', 'jiosaavn', 'apple music', 'vocals', 'acapella', 'music production', 'online music']):
        return "🎵 Music & Audio Streaming"
    if any(k in text for k in ['downloader', 'download', 'fdown', 'igram', 'ssyoutube', 'y2mate', 'cobalt', 'save', 'botdownloader', 'autosubtitles', 'yout.com', 'instag.com', 'faceb.com']):
        return "⬇️ Video & Media Downloaders"
    if any(k in text for k in ['leetcode', 'hackerrank', 'codewars', 'topcoder', 'coderbyte', 'codechef', 'exercism', 'github', 'gitlab', 'bitbucket', 'codepen', 'jsfiddle', 'codesandbox', 'stackblitz', 'glitch', 'overapi', 'quickref', 'goalkicker', 'w3schools', 'programming', 'developer roadmap', 'cheat sheet', 'project implementation', 'python resource', 'html.com', 'javascript.info', 'reactplay', 'learnvue', 'nextjs.org/learn', 'web3', 'cryptozombies']):
        return "💻 Coding & Developer Platforms"
    if any(k in text for k in ['course', 'academy', 'learn', 'education', 'tutorial', 'coursera', 'skillshop', 'training', 'beginner', 'study notes', 'learning', 'databricks']):
        return "🎓 Free Courses & Learning Platforms"
    if any(k in text for k in ['pdf', 'sejda', 'tinywow']):
        return "📄 PDF & Document Utilities"
    if any(k in text for k in ['ai tools', 'replit', 'genai', 'agentic', 'deepseek', 'gpt', 'model', 'machine learning', 'artificial intelligence', 'ai builder']):
        return "🤖 AI & Machine Learning Tools"
    if any(k in text for k in ['design', 'creator tools', 'template', '3dtuning', 'animejs', 'animation', 'ui/ux', 'customization']):
        return "🎨 Design & Creator Tools"
    if any(k in text for k in ['gaming', 'game', 'airconsole', 'party game', 'multiplayer']):
        return "🎮 Gaming & Entertainment"
    if any(k in text for k in ['utility', 'workspace', 'productivity', 'tool', 'xtiles', '123apps', 'filepursuit', 'image.pi7.org', 'flightradar', '1aauto', 'zoomquilt']):
        return "🛠️ Web Utilities & Productivity"
    return "🌐 General Curated Tools"

def fetch_metadata(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    try:
        resp = requests.get(url, headers=headers, timeout=3, verify=False)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.content, 'html.parser')
            title = soup.title.string.strip() if (soup.title and soup.title.string) else ""
            desc = ""
            meta_desc = soup.find('meta', attrs={'name': 'description'}) or soup.find('meta', attrs={'property': 'og:description'})
            if meta_desc and meta_desc.get('content'):
                desc = meta_desc['content'].strip()
            if title: title = re.sub(r'[\r\n\t]+', ' ', title).strip()
            if desc: desc = re.sub(r'[\r\n\t]+', ' ', desc).strip()
            return title, desc
    except Exception:
        pass
    return "", ""

def load_database():
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_database(data):
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def add_or_update_website(db, url, name="", website_type="", category="", pricing="", description="", source="Manual", auto_fetch=False):
    cleaned = clean_url(url)
    if not cleaned:
        return None
    key = get_domain_key(cleaned)
    if not website_type or website_type in ["Free", "Paid", "None", ""]:
        website_type = derive_website_type(name, category, description, cleaned)
        
    final_cat = normalize_category(category, name, cleaned, description, website_type)
    final_pricing = normalize_pricing(pricing)
    
    if key in db:
        rec = db[key]
        if website_type and website_type not in ["Curated Web Platform", "Web Platform", "AI Tools", "Utility"]:
            rec["website_type"] = website_type
        if name and (len(name) > len(rec.get("name", "")) or rec.get("name") == rec.get("key")):
            rec["name"] = name
        if final_cat != "🌐 General Curated Tools":
            rec["category"] = final_cat
        if final_pricing != "Free" or rec.get("pricing") == "Free":
            rec["pricing"] = final_pricing
        if description and len(description) > len(rec.get("description", "")):
            rec["description"] = description
        rec["url"] = cleaned
        rec["updated_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
        return rec
    else:
        meta_title, meta_desc = "", ""
        if auto_fetch and (not name or name == key):
            meta_title, meta_desc = fetch_metadata(cleaned)
            
        final_name = name if (name and name != key) else (meta_title[:50] if meta_title else key)
        final_desc = description if description else (meta_desc if meta_desc else f"Official platform resource for {final_name} ({website_type})")
        if not website_type or website_type == "Curated Web Platform":
            website_type = derive_website_type(final_name, category, final_desc, cleaned)

        rec = {
            "key": key,
            "name": final_name,
            "website_type": website_type,
            "url": cleaned,
            "category": final_cat,
            "pricing": final_pricing,
            "description": final_desc,
            "source": source,
            "added_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        db[key] = rec
        return rec

def parse_user_text_input(text):
    lines = text.strip().splitlines()
    parsed_items = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if any(h in line.lower() for h in ['website type', 'website name', 'official url', 'free / paid', 'link', 'category']):
            if 'http' not in line:
                continue

        if '\t' in line:
            parts = [p.strip() for p in line.split('\t') if p.strip()]
        elif '|' in line:
            parts = [p.strip() for p in line.split('|') if p.strip()]
        else:
            parts = [line]

        url, name, wtype, cat, pricing = "", "", "", "", ""
        
        # Check if 4-column format: [Website Type, Website Name, Official URL, Free / Paid]
        if len(parts) >= 4 and any('http' in p for p in parts):
            for i, p in enumerate(parts):
                if 'http' in p:
                    url = p
                    if i >= 2:
                        name = parts[i-1]
                        wtype = parts[i-2]
                    elif i == 1:
                        name = parts[0]
                    if i + 1 < len(parts):
                        pricing = parts[i+1]
                    break
        else:
            for p in parts:
                if 'http://' in p or 'https://' in p:
                    m = re.search(r'(https?://[^\s]+)', p)
                    url = m.group(1) if m else p
                elif any(pr in p.lower() for pr in ['free', 'paid', 'freemium', '$']):
                    pricing = p
                elif any(c in p.lower() for c in ['streaming', 'downloader', 'radio', 'tv', 'course', 'ai', 'pdf']):
                    wtype = p
                else:
                    if not name: name = p
                    elif not wtype: wtype = p

        if url:
            parsed_items.append({
                "url": url,
                "name": name,
                "website_type": wtype,
                "category": cat,
                "pricing": pricing,
                "description": ""
            })
    return parsed_items

def build_category_directories_and_reports(db):
    by_category = {cat: [] for cat in CATEGORIES.keys()}
    for key, rec in db.items():
        cat = rec.get("category", "🌐 General Curated Tools")
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(rec)
        
    for cat_name, items in by_category.items():
        items.sort(key=lambda x: (x.get("website_type", "").lower(), x.get("name", "").lower()))
        
    # 1. Category Subfolders and Reports
    for cat_name, meta in CATEGORIES.items():
        folder_path = os.path.join(BASE_DIR, meta["folder"])
        os.makedirs(folder_path, exist_ok=True)
        cat_items = by_category.get(cat_name, [])
        cat_safe = re.sub(r'[^\w\s-]', '', cat_name).strip().replace(' ', '_')
        report_file = os.path.join(folder_path, f"📝 {cat_safe}_Report.md")
        
        md_lines = [
            f"# {cat_name}",
            "",
            f"> {meta['desc']}  ",
            f"> **Total Curated Tools**: `{len(cat_items)}` | **Zero Repeats & Deduplicated**",
            "",
            "---",
            ""
        ]

        if "Video" in cat_name:
            md_lines.extend([
                "### 💡 3 Hidden URL Tricks (Instant Direct Downloaders - Save This)",
                "",
                "| # | Platform | URL Trick | Example URL | Result |",
                "| :-: | :--- | :--- | :--- | :--- |",
                "| 1 | **YouTube** | Remove `ube` from `youtube.com` | `https://www.yout.com/watch?v=...` | Direct MP4 / MP3 download page |",
                "| 2 | **Instagram** | Remove `ram` from `instagram.com` | `https://www.instag.com/reel/...` | Highest quality direct Reel download |",
                "| 3 | **Facebook** | Remove `ook` from `facebook.com` | `https://www.faceb.com/watch?v=...` | Direct Facebook Video download |",
                "",
                "---",
                ""
            ])

        md_lines.extend([
            "| # | Website Name | Website Type | Official Link | Pricing | Description |",
            "| :-: | :--- | :--- | :--- | :-: | :--- |"
        ])
        
        for i, item in enumerate(cat_items, 1):
            name = (item.get("name") or item.get("key")).replace('|', '-')
            wtype = (item.get("website_type") or "Curated Platform").replace('|', '-')
            url = item.get("url")
            pricing = item.get("pricing", "Free")
            desc = (item.get("description") or f"Official platform for {name}").replace('|', '-')
            md_lines.append(f"| **{i}** | **{name}** | `{wtype}` | [Visit Website]({url}) | `{pricing}` | {desc} |")
            
        md_lines.append("\n---\n*Auto-generated & Curated by Autonomous Websites Agent.*")
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write("\n".join(md_lines))

    # 2. Master Markdown Report
    master_lines = [
        "# 🌐 Curated Websites & Tools Master Directory",
        "",
        "> **Consolidated, Deduplicated & Isolated Directory of High-Utility Web Platforms**  ",
        f"> **Total Unique Websites**: `{len(db)}` across `{len(CATEGORIES)}` distinct categories.  ",
        "> **Repository**: [https://github.com/Satyenderparihar/Websites-Scrapes-Manually](https://github.com/Satyenderparihar/Websites-Scrapes-Manually)",
        "",
        "---",
        "",
        "## 📑 Quick Category Navigation",
        ""
    ]
    
    for cat_name, meta in CATEGORIES.items():
        count = len(by_category.get(cat_name, []))
        folder_link = urllib.parse.quote(meta["folder"])
        master_lines.append(f"- [{cat_name}]({folder_link}) — `{count} Websites` — *{meta['desc']}*")
        
    master_lines.extend([
        "\n---\n",
        "## 💡 3 Hidden URL Tricks (Instant Direct Downloaders - Save This)",
        "",
        "| Platform | Trick | Before / After | Direct Action |",
        "| :--- | :--- | :--- | :--- |",
        "| **YouTube** | Remove `ube` | `youtube.com` -> `yout.com` | Instant MP4 & MP3 Download |",
        "| **Instagram** | Remove `ram` | `instagram.com` -> `instag.com` | Highest Quality Reel Download |",
        "| **Facebook** | Remove `ook` | `facebook.com` -> `faceb.com` | Direct Facebook Video Download |",
        "",
        "---",
        ""
    ])

    for cat_name, meta in CATEGORIES.items():
        items = by_category.get(cat_name, [])
        if not items:
            continue
        master_lines.extend([
            f"## {cat_name}",
            "",
            f"*{meta['desc']}* (Total: `{len(items)}`)",
            "",
            "| # | Website Name | Website Type | Official URL | Pricing | Description |",
            "| :-: | :--- | :--- | :--- | :-: | :--- |"
        ])
        for i, item in enumerate(items, 1):
            name = (item.get("name") or item.get("key")).replace('|', '-')
            wtype = (item.get("website_type") or "Curated Platform").replace('|', '-')
            url = item.get("url")
            pricing = item.get("pricing", "Free")
            desc = (item.get("description") or f"Official platform resource for {name}").replace('|', '-')
            master_lines.append(f"| **{i}** | **{name}** | `{wtype}` | [{url}]({url}) | `{pricing}` | {desc} |")
        master_lines.append("\n---\n")

    with open(MASTER_MD, 'w', encoding='utf-8') as f:
        f.write("\n".join(master_lines))

    # 3. Root README.md
    readme_lines = [
        "# 🌐 Curated Useful Websites & Media Tools Directory",
        "",
        "![Status](https://img.shields.io/badge/Status-Active%20%26%20Auto--Synced-success) ",
        f"![Total Websites](https://img.shields.io/badge/Total%20Websites-{len(db)}-blue) ",
        f"![Categories](https://img.shields.io/badge/Categories-{len(CATEGORIES)}-orange) ",
        "![License](https://img.shields.io/badge/License-MIT-green)",
        "",
        "> **100% Free, Curated & Deduplicated Directory of Useful Websites, Media Streaming & Web Utilities.**  ",
        "> Maintained separately from automated scrapers to ensure curated accuracy and zero clutter.",
        "",
        "---",
        "",
        "## 📚 Master Directory & Download Links",
        "",
        "- 📖 **[View Complete Master Categorized Report (Markdown)](📝%20Master_Curated_Websites_Report.md)**",
        "- 📊 **[Download Formatted Master Excel Workbook](📊%20Websites_Master_List.xlsx)**",
        "- 💾 **[Raw Structured Database (JSON)](💾%20websites_database.json)**",
        "",
        "---",
        "",
        "## 🚀 Dedicated Categories Breakdown",
        "",
        "| Category | Count | Dedicated Folder & Report | Description |",
        "| :--- | :---: | :--- | :--- |"
    ]
    
    for cat_name, meta in CATEGORIES.items():
        count = len(by_category.get(cat_name, []))
        folder_link = urllib.parse.quote(meta["folder"])
        cat_safe = re.sub(r'[^\w\s-]', '', cat_name).strip().replace(' ', '_')
        report_link = f"{folder_link}/📝%20{cat_safe}_Report.md"
        readme_lines.append(f"| **{cat_name}** | **{count}** | [📁 Explore Category]({folder_link}) / [📖 Report]({report_link}) | {meta['desc']} |")
        
    readme_lines.extend([
        "",
        "---",
        "",
        "## 💡 3 Hidden URL Tricks (Direct Video Downloaders)",
        "",
        "1. **YouTube**: Remove `ube` from URL (`https://www.yout.com/...`) for instant MP4/MP3.",
        "2. **Instagram**: Remove `ram` from URL (`https://www.instag.com/...`) for HD reels.",
        "3. **Facebook**: Remove `ook` from URL (`https://www.faceb.com/...`) for direct video downloads.",
        "",
        "---",
        "",
        "## ⚡ 1-Click Autonomous Agent (How It Works)",
        "",
        "Whenever you have new website links, tables, or notes:",
        "1. Double click **`⚡ Run Manual Websites Agent.bat`** (or use Desktop Shortcut **`Manual Websites Agent.lnk`**).",
        "2. Paste your links or text (or put them in `💾 paste_links_here.txt`).",
        "3. The agent automatically:",
        "   - Preserves and categorizes the exact **`Website Type`** (e.g. Facebook Video Downloader, Music Streaming, AI Course),",
        "   - Categorizes cleanly into isolated directories,",
        "   - Prevents duplicate links (`Zero Repeats`),",
        "   - Updates the Markdown reports and multi-sheet Excel file,",
        "   - **Automatically commits & pushes to GitHub in 1 click!**",
        "",
        "---",
        "**Maintained with ❤️ by Satyender Parihar & Antigravity Autonomous Agent.**"
    ])
    
    with open(README_FILE, 'w', encoding='utf-8') as f:
        f.write("\n".join(readme_lines))

    # 4. Multi-Sheet Formatted Excel File
    wb = openpyxl.Workbook()
    default_sheet = wb.active
    wb.remove(default_sheet)
    
    header_fill = PatternFill(start_color="1F497D", end_color="1F497D", fill_type="solid")
    header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    data_font = Font(name="Segoe UI", size=10)
    link_font = Font(name="Segoe UI", size=10, color="0563C1", underline="single")
    border_thin = Border(
        left=Side(style='thin', color='D9D9D9'),
        right=Side(style='thin', color='D9D9D9'),
        top=Side(style='thin', color='D9D9D9'),
        bottom=Side(style='thin', color='D9D9D9')
    )
    center_align = Alignment(horizontal='center', vertical='center')

    # Master Sheet
    ws_master = wb.create_sheet(title="All Websites Master")
    headers = ["#", "Website Name", "Website Type", "Category", "Official URL", "Pricing", "Description", "Source"]
    ws_master.append(headers)
    for col_idx in range(1, len(headers) + 1):
        cell = ws_master.cell(1, col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center_align

    row_num = 2
    for cat_name, items in by_category.items():
        for item in items:
            ws_master.append([
                row_num - 1,
                item.get("name") or item.get("key"),
                item.get("website_type") or "Curated Platform",
                item.get("category"),
                item.get("url"),
                item.get("pricing", "Free"),
                item.get("description", ""),
                item.get("source", "Manual")
            ])
            ws_master.cell(row_num, 1).alignment = center_align
            ws_master.cell(row_num, 1).font = data_font
            ws_master.cell(row_num, 2).font = Font(name="Segoe UI", size=10, bold=True)
            ws_master.cell(row_num, 3).font = data_font
            ws_master.cell(row_num, 4).font = data_font
            url_cell = ws_master.cell(row_num, 5)
            url_cell.font = link_font
            url_cell.hyperlink = item.get("url")
            ws_master.cell(row_num, 6).alignment = center_align
            ws_master.cell(row_num, 6).font = data_font
            ws_master.cell(row_num, 7).font = data_font
            ws_master.cell(row_num, 8).font = data_font
            for c in range(1, 9):
                ws_master.cell(row_num, c).border = border_thin
            row_num += 1

    for col in ws_master.columns:
        col_letter = get_column_letter(col[0].column)
        max_len = max(len(str(cell.value or '')) for cell in col)
        ws_master.column_dimensions[col_letter].width = min(max(max_len + 3, 10), 60)

    # Individual Category Sheets
    for cat_name, items in by_category.items():
        if not items:
            continue
        short_title = re.sub(r'[^\w\s]', '', cat_name)[:30].strip()
        ws_cat = wb.create_sheet(title=short_title)
        cat_headers = ["#", "Website Name", "Website Type", "Official URL", "Pricing", "Description"]
        ws_cat.append(cat_headers)
        for col_idx in range(1, len(cat_headers) + 1):
            cell = ws_cat.cell(1, col_idx)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = center_align
            
        for i, item in enumerate(items, 1):
            r = i + 1
            ws_cat.append([
                i,
                item.get("name") or item.get("key"),
                item.get("website_type") or "Curated Platform",
                item.get("url"),
                item.get("pricing", "Free"),
                item.get("description", "")
            ])
            ws_cat.cell(r, 1).alignment = center_align
            ws_cat.cell(r, 1).font = data_font
            ws_cat.cell(r, 2).font = Font(name="Segoe UI", size=10, bold=True)
            ws_cat.cell(r, 3).font = data_font
            u_cell = ws_cat.cell(r, 4)
            u_cell.font = link_font
            u_cell.hyperlink = item.get("url")
            ws_cat.cell(r, 5).alignment = center_align
            ws_cat.cell(r, 5).font = data_font
            ws_cat.cell(r, 6).font = data_font
            for c in range(1, 7):
                ws_cat.cell(r, c).border = border_thin

        for col in ws_cat.columns:
            col_letter = get_column_letter(col[0].column)
            max_len = max(len(str(cell.value or '')) for cell in col)
            ws_cat.column_dimensions[col_letter].width = min(max(max_len + 3, 10), 60)

    wb.save(MASTER_XLSX)
    print(f"📊 Formatted Excel Workbook saved: {MASTER_XLSX}")
    print(f"📝 Master Markdown Report saved: {MASTER_MD}")
    print(f"📄 README.md updated: {README_FILE}")

def git_commit_and_push(commit_msg):
    try:
        subprocess.run(["git", "add", "."], cwd=BASE_DIR, check=True)
        status = subprocess.run(["git", "status", "--porcelain"], cwd=BASE_DIR, capture_output=True, text=True)
        if not status.stdout.strip():
            print("ℹ️ No new changes to commit in git.")
            return True
        subprocess.run(["git", "commit", "-m", commit_msg], cwd=BASE_DIR, check=True)
        print("🚀 Pushing to GitHub...")
        subprocess.run(["git", "push", "-u", "origin", "main"], cwd=BASE_DIR, check=True)
        print("✅ Successfully pushed to GitHub (https://github.com/Satyenderparihar/Websites-Scrapes-Manually)!")
        return True
    except Exception as e:
        print(f"⚠️ Git operation error: {e}")
        return False

def main():
    db = load_database()
    print("=" * 60)
    print("🌐 Autonomous Manual Websites Agent & Curated Hub")
    print(f"📁 Working Directory: {BASE_DIR}")
    print(f"💾 Current Database Count: {len(db)} websites")
    print("=" * 60)
    
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()
        if arg in ["--all", "--sync", "--rebuild"]:
            build_category_directories_and_reports(db)
            git_commit_and_push(f"feat: rebuild and sync curated directory ({len(db)} websites)")
            return
        elif arg == "--ingest-downloads":
            from deep_sync_all import build_database
            db = build_database()
            save_database(db)
            build_category_directories_and_reports(db)
            git_commit_and_push(f"feat: deep re-ingestion of downloads excel files with Website Type ({len(db)} websites)")
            return

    while True:
        print("\nSelect an action:")
        print("  [1] ➕ Add / Paste Website(s) or Table (Multi-line supported)")
        print("  [2] 📄 Process Input File (💾 paste_links_here.txt)")
        print("  [3] 📥 Import All Excel Files from Downloads (Deep Extraction)")
        print("  [4] 🔄 Rebuild Reports, Excel & Push to GitHub")
        print("  [5] 🌐 Open GitHub Repository in Browser")
        print("  [6] 📊 Open Master Excel File")
        print("  [0] 🚪 Exit")
        
        choice = input("\nEnter choice [0-6]: ").strip()
        
        if choice == "1":
            print("\nPaste your websites below (table, URL list, or details).")
            print("When finished, press Enter on an empty line:")
            lines = []
            while True:
                try:
                    l = input()
                    if not l.strip():
                        break
                    lines.append(l)
                except EOFError:
                    break
            raw_text = "\n".join(lines)
            if raw_text.strip():
                items = parse_user_text_input(raw_text)
                print(f"Found {len(items)} websites to process...")
                for item in items:
                    rec = add_or_update_website(db, item["url"], name=item["name"], website_type=item["website_type"], category=item["category"], pricing=item["pricing"], description=item["description"], source="Direct Input", auto_fetch=True)
                    if rec:
                        print(f"  ✓ Added: {rec['name']} | Type: {rec['website_type']} -> {rec['category']} ({rec['pricing']})")
                save_database(db)
                build_category_directories_and_reports(db)
                git_commit_and_push(f"feat: added {len(items)} curated websites (Total: {len(db)})")
            else:
                print("No input provided.")
                
        elif choice == "2":
            if not os.path.exists(INPUT_FILE):
                with open(INPUT_FILE, 'w', encoding='utf-8') as f:
                    f.write("# Paste website URLs, tables, or text here.\n# Supports: Website Type | Website Name | Official URL | Free/Paid\n")
                print(f"Created template file: {INPUT_FILE}. Paste links there and run again.")
            else:
                with open(INPUT_FILE, 'r', encoding='utf-8') as f:
                    raw_text = f.read()
                items = parse_user_text_input(raw_text)
                if items:
                    print(f"Found {len(items)} websites in {INPUT_FILE}...")
                    for item in items:
                        rec = add_or_update_website(db, item["url"], name=item["name"], website_type=item["website_type"], category=item["category"], pricing=item["pricing"], description=item["description"], source="Input File", auto_fetch=True)
                        if rec:
                            print(f"  ✓ Added: {rec['name']} | Type: {rec['website_type']}")
                    save_database(db)
                    build_category_directories_and_reports(db)
                    git_commit_and_push(f"feat: synced {len(items)} websites from input file (Total: {len(db)})")
                else:
                    print("No valid websites found in file.")
                    
        elif choice == "3":
            from deep_sync_all import build_database
            db = build_database()
            save_database(db)
            build_category_directories_and_reports(db)
            git_commit_and_push(f"feat: deep re-ingestion of downloads excel files with Website Type (Total: {len(db)})")
            
        elif choice == "4":
            build_category_directories_and_reports(db)
            git_commit_and_push(f"feat: rebuild and sync master directory (Total: {len(db)} websites)")
            
        elif choice == "5":
            os.system("start https://github.com/Satyenderparihar/Websites-Scrapes-Manually")
            
        elif choice == "6":
            if os.path.exists(MASTER_XLSX):
                os.startfile(MASTER_XLSX)
            else:
                print("Excel file not created yet.")
                
        elif choice == "0":
            print("Exiting. Bye!")
            break

if __name__ == "__main__":
    main()
