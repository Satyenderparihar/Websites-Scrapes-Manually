"""
Deep Ingestion and Re-synchronization of all Curated Websites
Ensures Website Type is accurately captured, classified and displayed for every single website.
Zero Mixing, 100% Isolated Categories.
"""

import os
import sys
import re
import json
import glob
import time
import subprocess
import urllib.parse
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"D:\Antigravity - Agent\🌐 Websites Scrapes Manually"
DB_FILE = os.path.join(BASE_DIR, "💾 websites_database.json")
MASTER_MD = os.path.join(BASE_DIR, "📝 Master_Curated_Websites_Report.md")
MASTER_XLSX = os.path.join(BASE_DIR, "📊 Websites_Master_List.xlsx")
README_FILE = os.path.join(BASE_DIR, "README.md")
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
    if len(path) > 1 and any(sub in domain for sub in ['botdownloader.com', 'youtube.com', 'instagram.com', 'github.com', 'coursera.org', 'analyticsvidhya.com', 'stpcomputereducation.com', 'cloudskillsboost.google']):
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

def build_database():
    db = {}

    def add_entry(url, name, website_type, category, pricing, desc, source, priority=1):
        cleaned = clean_url(url)
        if not cleaned:
            return
        key = get_domain_key(cleaned)
        final_pricing = normalize_pricing(pricing)
        final_desc = desc if desc else f"Official platform resource for {name} ({website_type})"

        # Priority protection for specific services
        if "radio.garden" in cleaned:
            name = "Radio Garden"
            website_type = "Online Radio Map"
            category = "📻 Online Radio & Interactive Maps"
            final_desc = "Interactive 3D globe allowing users to rotate the earth and tune into live radio stations worldwide."
        elif "tv.garden" in cleaned:
            name = "TV Garden"
            website_type = "Global TV Discovery"
            category = "📺 Global TV & Media Discovery"
            final_desc = "Global television discovery platform to watch live broadcasts and international channels."
        elif "famelack.com" in cleaned:
            name = "Fame Lack"
            website_type = "Global TV Discovery"
            category = "📺 Global TV & Media Discovery"
            final_desc = "Watch free live TV streams, international webcams, and explore worldwide broadcasting channels."

        if key in db:
            rec = db[key]
            rec_priority = rec.get("priority", 0)
            if priority >= rec_priority:
                if website_type:
                    rec["website_type"] = website_type
                if name:
                    rec["name"] = name
                if desc:
                    rec["description"] = desc
                if final_pricing != "Free":
                    rec["pricing"] = final_pricing
                if category:
                    rec["category"] = category
                rec["priority"] = priority
        else:
            rec = {
                "key": key,
                "name": name,
                "website_type": website_type,
                "url": cleaned,
                "category": category,
                "pricing": final_pricing,
                "description": final_desc,
                "source": source,
                "priority": priority,
                "added_at": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            db[key] = rec

    print(">>> 1. Processing User Initial Input...")
    user_initial = [
        ("https://music.youtube.com", "YouTube Music", "Music Streaming", "🎵 Music & Audio Streaming", "Free + Paid", "Official music streaming service by YouTube with personalized recommendations and music videos."),
        ("https://www.spotify.com", "Spotify", "Music Streaming", "🎵 Music & Audio Streaming", "Free + Paid", "Global digital music and podcast platform with millions of tracks and curated playlists."),
        ("https://music.apple.com", "Apple Music", "Music Streaming", "🎵 Music & Audio Streaming", "Paid", "Premium audio streaming platform with lossless audio, Dolby Atmos spatial sound, and exclusive releases."),
        ("https://soundcloud.com", "SoundCloud", "Music Streaming", "🎵 Music & Audio Streaming", "Free + Paid", "Open audio platform connecting fans directly with independent artists, DJs, and podcasters."),
        ("https://gaana.com", "Gaana", "Music Streaming (India)", "🎵 Music & Audio Streaming", "Free + Paid", "Commercial music streaming service offering Bollywood, Punjabi, Tamil, Telugu, and English songs."),
        ("https://www.jiosaavn.com", "JioSaavn", "Music Streaming (India)", "🎵 Music & Audio Streaming", "Free + Paid", "Extensive Indian music library with 80M+ tracks, original podcasts, and regional radio stations."),
        ("https://radio.garden", "Radio Garden", "Online Radio Map", "📻 Online Radio & Interactive Maps", "Free", "Interactive 3D globe allowing users to rotate the earth and tune into live radio stations worldwide."),
        ("https://tv.garden", "TV Garden", "Global TV Discovery", "📺 Global TV & Media Discovery", "Free", "Global television discovery platform to watch live broadcasts and international channels."),
        ("https://famelack.com", "Fame Lack", "Global TV Discovery", "📺 Global TV & Media Discovery", "Free", "Watch free live TV streams, international webcams, and explore worldwide broadcasting channels.")
    ]
    for url, name, wtype, cat, prc, dsc in user_initial:
        add_entry(url, name, wtype, cat, prc, dsc, "User Chat Prompt", priority=10)

    print(">>> 2. Processing ⬇️ Video Downloaders.xlsx...")
    f_down = os.path.join(DOWNLOADS_DIR, "⬇️ Video Downloaders.xlsx")
    if os.path.exists(f_down):
        wb = openpyxl.load_workbook(f_down, data_only=True)
        ws = wb['Sheet3 - BH']
        for r in range(2, 14):
            wtype = str(ws.cell(r, 1).value or '').strip()
            name = str(ws.cell(r, 2).value or '').strip()
            url = str(ws.cell(r, 3).value or '').strip()
            pricing = str(ws.cell(r, 4).value or 'Free').strip()
            if not name and 'timestamp' in wtype.lower():
                name = "YouTube Video & MP3 Timestamp Downloader (Instagram Reel Guide)"
            if url:
                cat = "⬇️ Video & Media Downloaders"
                if "search" in wtype.lower() or "image" in wtype.lower():
                    cat = "🛠️ Web Utilities & Productivity"
                add_entry(url, name, wtype, cat, pricing, f"High-speed online tool: {wtype}", "Excel: ⬇️ Video Downloaders.xlsx", priority=9)

        add_entry(
            "https://www.yout.com",
            "Yout.com (YouTube URL Trick)",
            "YouTube Video & MP3 Downloader (URL Trick)",
            "⬇️ Video & Media Downloaders",
            "Free",
            "Directly download any YouTube video as MP4 or MP3 by removing 'ube' from youtube.com in the browser URL.",
            "Excel: ⬇️ Video Downloaders.xlsx (URL Trick 1)",
            priority=9
        )
        add_entry(
            "https://www.instag.com",
            "Instag.com (Instagram URL Trick)",
            "Instagram HD Reel Direct Downloader (URL Trick)",
            "⬇️ Video & Media Downloaders",
            "Free",
            "Directly download Instagram Reels in highest available quality by removing 'ram' from instagram.com in the browser URL.",
            "Excel: ⬇️ Video Downloaders.xlsx (URL Trick 2)",
            priority=9
        )
        add_entry(
            "https://www.faceb.com",
            "Faceb.com (Facebook URL Trick)",
            "Facebook Video Direct Downloader (URL Trick)",
            "⬇️ Video & Media Downloaders",
            "Free",
            "Directly download Facebook videos by removing 'ook' from facebook.com in the browser URL.",
            "Excel: ⬇️ Video Downloaders.xlsx (URL Trick 3)",
            priority=9
        )

    print(">>> 3. Processing 🎵 Online Music & Video.xlsx...")
    f_music = os.path.join(DOWNLOADS_DIR, "🎵 Online Music & Video.xlsx")
    if os.path.exists(f_music):
        wb = openpyxl.load_workbook(f_music, data_only=True)
        ws = wb['Sheet2 - BH']
        for r in range(2, ws.max_row + 1):
            wtype = str(ws.cell(r, 1).value or '').strip()
            name = str(ws.cell(r, 2).value or '').strip()
            url = str(ws.cell(r, 3).value or '').strip()
            pricing = str(ws.cell(r, 4).value or 'Free').strip()
            if url and 'http' in url:
                cat = "🎵 Music & Audio Streaming"
                if "Radio" in wtype: cat = "📻 Online Radio & Interactive Maps"
                elif "TV" in wtype: cat = "📺 Global TV & Media Discovery"
                add_entry(url, name, wtype, cat, pricing, f"Official platform for {name} ({wtype})", "Excel: 🎵 Online Music & Video.xlsx", priority=8)

    print(">>> 4. Processing 🌐 Powerful Websites.xlsx...")
    f_power = os.path.join(DOWNLOADS_DIR, "🌐 Powerful Websites.xlsx")
    if os.path.exists(f_power):
        wb = openpyxl.load_workbook(f_power, data_only=True)
        ws3 = wb['Sheet3 - BH']
        for r in range(2, ws3.max_row + 1):
            wtype = str(ws3.cell(r, 1).value or '').strip()
            name = str(ws3.cell(r, 2).value or '').strip()
            url = str(ws3.cell(r, 3).value or '').strip()
            pricing = str(ws3.cell(r, 4).value or 'Free').strip()
            if url and 'http' in url:
                cat = "🛠️ Web Utilities & Productivity"
                if any(k in wtype.lower() for k in ['camera', 'virtual travel', 'visual experience']):
                    cat = "📺 Global TV & Media Discovery"
                add_entry(url, name, wtype, cat, pricing, f"High-utility web tool: {wtype}", "Excel: 🌐 Powerful Websites.xlsx (Sheet3)", priority=7)

        ws_bh = wb['Websites - BH']
        for r in range(2, ws_bh.max_row + 1):
            site = str(ws_bh.cell(r, 1).value or '').strip()
            desc = str(ws_bh.cell(r, 2).value or '').strip()
            raw_cat = str(ws_bh.cell(r, 3).value or '').strip()
            pricing = str(ws_bh.cell(r, 4).value or 'Free').strip()
            if not site or site == "None":
                continue
            url = site if site.startswith("http") else f"https://{site}"
            name = site.split('/')[0].replace('www.', '')

            d = f"{site} {raw_cat} {desc}".lower()
            if raw_cat == "AI Tools":
                cat = "🤖 AI & Machine Learning Tools"
                if 'builder' in d or 'replit' in d: wtype = "AI Website Builder & IDE"
                elif 'vocal' in d or 'acapella' in d:
                    wtype = "AI Vocal Extractor"
                    cat = "🎵 Music & Audio Streaming"
                elif 'video' in d: wtype = "AI Video Generation & Pre-Production"
                elif 'audio' in d or 'voice' in d: wtype = "AI Audio & Voice Tool"
                elif 'image' in d or 'photo' in d: wtype = "AI Image Generator & Enhancer"
                elif 'writing' in d or 'text' in d or 'copy' in d: wtype = "AI Writing & Copywriting Assistant"
                else: wtype = "AI Productivity & Generation Tool"
            elif raw_cat == "Gaming":
                cat = "🎮 Gaming & Entertainment"
                if 'multiplayer' in d or 'phone' in d or 'party' in d: wtype = "Phone-Controller Multiplayer Games"
                elif 'map' in d: wtype = "Interactive Fantasy Map Generator"
                else: wtype = "Browser Game & Interactive Entertainment"
            elif raw_cat in ["Creator Tools", "Creative", "Design"]:
                cat = "🎨 Design & Creator Tools"
                if 'template' in d: wtype = "Social Media Template Booster"
                elif 'car' in d or '3d' in d or 'tuning' in d: wtype = "3D Virtual Vehicle Customizer"
                elif 'animation' in d: wtype = "JavaScript Web Animation Engine"
                elif 'video' in d or 'editor' in d: wtype = "Browser-Based Video Editor"
                elif 'color' in d or 'palette' in d: wtype = "Color Palette & Visual Design Tool"
                else: wtype = f"{raw_cat} Design Platform"
            elif raw_cat in ["Utility", "Productivity", "Developer"]:
                cat = "🛠️ Web Utilities & Productivity"
                if 'car repair' in d or 'fix common vehicle' in d: wtype = "DIY Vehicle Repair Guides"
                elif 'tv' in d or 'retro' in d or 'surfing' in d:
                    wtype = "Retro TV Channel Simulator"
                    cat = "📺 Global TV & Media Discovery"
                elif 'archive' in d or 'permanent' in d: wtype = "Permanent Web Archiving Utility"
                elif 'repair' in d or 'fixit' in d: wtype = "Hardware & Device Repair Guides"
                elif 'workspace' in d or 'notes' in d: wtype = "Workspace & Productivity Tool"
                elif 'code' in d or 'developer' in d or 'api' in d: wtype = "Developer & Code Utility"
                else: wtype = f"{raw_cat} Tool"
            elif raw_cat == "Education":
                cat = "🎓 Free Courses & Learning Platforms"
                wtype = "Educational Learning Platform"
            else:
                cat = "🌐 General Curated Tools"
                wtype = "Curated Web Resource"

            # Priority 5 for broad catalog
            add_entry(url, name, wtype, cat, pricing, desc, "Excel: 🌐 Powerful Websites.xlsx (Websites-BH)", priority=5)

    print(">>> 5. Processing 📄 PDF Resources.xlsx...")
    f_pdf = os.path.join(DOWNLOADS_DIR, "📄 PDF Resources.xlsx")
    if os.path.exists(f_pdf):
        wb = openpyxl.load_workbook(f_pdf, data_only=True)
        ws = wb['Sheet1']
        for r in range(2, ws.max_row + 1):
            name = str(ws.cell(r, 1).value or '').strip()
            cat_raw = str(ws.cell(r, 2).value or '').strip()
            desc = str(ws.cell(r, 3).value or '').strip()
            url = str(ws.cell(r, 4).value or '').strip()
            pricing = str(ws.cell(r, 5).value or 'Free').strip()
            if url and 'http' in url:
                wtype = cat_raw if cat_raw else "PDF & Document Utility"
                add_entry(url, name, wtype, "📄 PDF & Document Utilities", pricing, desc, "Excel: 📄 PDF Resources.xlsx", priority=8)

    print(">>> 6. Processing 🎓 Course Library.xlsx...")
    f_course = os.path.join(DOWNLOADS_DIR, "🎓 Course Library.xlsx")
    if os.path.exists(f_course):
        wb = openpyxl.load_workbook(f_course, data_only=True)
        wb_f = openpyxl.load_workbook(f_course, data_only=False)
        
        for sname in ['Ai', 'Machine Learning ', 'Data Analysis ', 'Computer ', 'Google ', 'Skill Based', 'English']:
            if sname in wb.sheetnames:
                ws = wb[sname]
                header_row = 1
                headers = [str(ws.cell(1, c).value or '').strip().lower() for c in range(1, ws.max_column + 1)]
                for r in range(2, ws.max_row + 1):
                    row_vals = [str(ws.cell(r, c).value or '').strip() for c in range(1, ws.max_column + 1)]
                    if not any(row_vals):
                        continue
                    name, url, wtype, pricing = "", "", "", "Free"
                    for c, h in enumerate(headers, 1):
                        v = str(ws.cell(r, c).value or '').strip()
                        if not v or v == "None": continue
                        if 'name' in h: name = v
                        elif 'url' in h: url = v
                        elif 'type' in h: wtype = v
                        elif 'pricing' in h or 'free' in h: pricing = v
                    if url and 'http' in url:
                        if not wtype:
                            wtype = f"{sname.strip()} Course"
                        add_entry(url, name, wtype, "🎓 Free Courses & Learning Platforms", pricing, f"Free education and certified training: {name} ({wtype})", f"Excel: 🎓 Course Library.xlsx ({sname.strip()})", priority=8)

        ws1 = wb['Sheet1']
        ws1_f = wb_f['Sheet1']
        current_section = "Generative AI"
        section_type_map = {
            "Free Programs ( For limited time )": "Free Program Combo Bundle",
            "Generative AI": "Generative AI Course",
            "Agentic AI": "Agentic AI Course",
            "Machine Learning and  Deep Learning": "Machine Learning & Deep Learning Course",
            "RAG (Retrieval-Augmented Generation)": "RAG Application Course",
            "Vibe Coding": "Vibe Coding Course",
            "Project-Based Learning": "Project-Based Learning Course",
            "Some Popular Models": "AI Model Deep Dive Course",
            "Courses for Everyone": "Fundamental Tech Course"
        }

        for r in range(1, ws1.max_row + 1):
            val_a = str(ws1.cell(r, 1).value or '').strip()
            if val_a in section_type_map or (len(val_a) > 3 and not val_a.replace('.', '').isdigit() and not val_a.startswith('SNo') and not val_a.startswith('Top') and not val_a.startswith('Covering') and not val_a.startswith('ALL')):
                current_section = val_a

            if val_a.replace('.', '').isdigit() or (ws1.cell(r, 2).value and 'course' not in str(ws1.cell(r, 2).value).lower()):
                course_name = str(ws1.cell(r, 2).value or '').strip()
                if not course_name or course_name == "None" or "Course Name" in course_name:
                    continue
                url = ""
                for c in range(1, ws1.max_column + 1):
                    cell = ws1.cell(r, c)
                    cell_f = ws1_f.cell(r, c)
                    if cell.hyperlink and cell.hyperlink.target:
                        url = cell.hyperlink.target
                        break
                    elif cell_f.value and str(cell_f.value).startswith("=HYPERLINK"):
                        m = re.search(r'=HYPERLINK\("?([^",\)]+)"?', str(cell_f.value))
                        if m:
                            ref = m.group(1).strip()
                            if ref.startswith("http"): url = ref
                            else:
                                try: url = ws1[ref].value
                                except: pass
                            break
                    elif cell.value and str(cell.value).startswith("http"):
                        url = str(cell.value).strip()
                        break
                        
                if url and 'http' in url:
                    wtype = section_type_map.get(current_section, f"{current_section} Course")
                    add_entry(url, course_name, wtype, "🎓 Free Courses & Learning Platforms", "Free", f"Comprehensive free training course: {course_name} ({wtype})", "Excel: 🎓 Course Library.xlsx (Sheet1)", priority=8)

    print(f"\n✅ Total Deduplicated Curated Websites: {len(db)}")
    return db

def export_all(db):
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

    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    print(f"💾 Raw JSON Database saved: {DB_FILE}")

def main():
    print("Starting deep re-ingestion with Website Type...")
    db = build_database()
    export_all(db)

    print("\nGit commit and push...")
    subprocess.run(["git", "add", "."], cwd=BASE_DIR, check=True)
    subprocess.run(["git", "commit", "-m", f"feat: deep update with Website Type for all {len(db)} websites across categories"], cwd=BASE_DIR, check=True)
    subprocess.run(["git", "push", "origin", "main"], cwd=BASE_DIR, check=True)
    print("\n🚀 All updates pushed to GitHub successfully!")

if __name__ == "__main__":
    main()
