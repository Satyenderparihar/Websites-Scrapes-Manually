import os
import sys
import re
import json
import time
import urllib.parse
import urllib.request
import requests
from bs4 import BeautifulSoup
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "💾 websites_database.json")
REPORT_MD = os.path.join(BASE_DIR, "📝 Master_Curated_Websites_Report.md")
EXCEL_FILE = os.path.join(BASE_DIR, "📊 Websites_Master_List.xlsx")
README_FILE = os.path.join(BASE_DIR, "README.md")
INPUT_FILE = os.path.join(BASE_DIR, "💾 paste_links_here.txt")

# Standardized Categories with Context Emojis
CATEGORY_MAP = {
    "music": ("🎵 Music & Audio Streaming", "Music Streaming, Audio Platforms & Vocal Tools"),
    "radio": ("📻 Online Radio & Interactive Maps", "Live Global Radio Stations & World Audio Maps"),
    "tv": ("📺 Global TV & Media Discovery", "Worldwide Live TV Channels, Webcams & Stream Explorers"),
    "download": ("⬇️ Video & Media Downloaders", "Fast Downloaders for YouTube, Instagram, Facebook, Pinterest & Media"),
    "ai": ("🤖 AI & Machine Learning Tools", "Generative AI, LLM Builders, Agents & Automation Suites"),
    "course": ("🎓 Free Courses & Learning Platforms", "High-Value Free Courses in AI, Data Science, Coding & Tech"),
    "pdf": ("📄 PDF & Document Utilities", "Online PDF Editors, Converters, Mergers & Document Suites"),
    "utility": ("🛠️ Web Utilities & Productivity", "Productivity Workspaces, File Search, Conversion & System Utilities"),
    "design": ("🎨 Design & Creator Tools", "Templates, UI/UX Animations, 3D Modeling & Visual Asset Generators"),
    "gaming": ("🎮 Gaming & Entertainment", "Online Multiplayer Games, Nostalgic Surfing & Interactive Media"),
    "other": ("🌐 General Curated Tools", "Curated Web Resources & Useful Online Utilities")
}

def normalize_category(raw_cat, site_name="", url=""):
    text = f"{raw_cat} {site_name} {url}".lower()
    
    # Check Radio first
    if any(k in text for k in ['radio.garden', 'radio garden', 'online radio', 'radio map']):
        return CATEGORY_MAP["radio"][0]
    
    # Check TV / Broadcast discovery
    if any(k in text for k in ['tv garden', 'tv.garden', 'famelack', 'live tv', 'tv discovery', 'myretrotvs']):
        return CATEGORY_MAP["tv"][0]
        
    # Check Music
    if any(k in text for k in ['music', 'spotify', 'soundcloud', 'gaana', 'jiosaavn', 'apple music', 'vocals', 'acapella', 'audio streaming']):
        return CATEGORY_MAP["music"][0]
        
    # Check Downloaders
    if any(k in text for k in ['download', 'downloader', 'fdown', 'igram', 'ssyoutube', 'y2mate', 'cobalt', 'save', 'botdownloader', 'autosubtitles']):
        return CATEGORY_MAP["download"][0]
        
    # Check Courses / Learning
    if any(k in text for k in ['course', 'academy', 'learn', 'education', 'tutorial', 'coursera', 'skillshop', 'training', 'beginner']):
        return CATEGORY_MAP["course"][0]
        
    # Check PDF
    if any(k in text for k in ['pdf', 'sejda', 'tinywow']):
        return CATEGORY_MAP["pdf"][0]
        
    # Check AI
    if any(k in text for k in ['ai tools', 'replit', 'genai', 'agentic', 'deepseek', 'gpt', 'model', 'machine learning', 'artificial intelligence']):
        return CATEGORY_MAP["ai"][0]
        
    # Check Design / Creator
    if any(k in text for k in ['design', 'creator', 'template', '3dtuning', 'animejs', 'animation', 'ui']):
        return CATEGORY_MAP["design"][0]
        
    # Check Gaming
    if any(k in text for k in ['game', 'gaming', 'airconsole', 'play']):
        return CATEGORY_MAP["gaming"][0]
        
    # Check Utility
    if any(k in text for k in ['utility', 'workspace', 'productivity', 'tool', 'xtiles', '123apps', 'filepursuit']):
        return CATEGORY_MAP["utility"][0]
        
    return CATEGORY_MAP["other"][0]

def clean_url(u):
    if not u:
        return ""
    u = str(u).strip()
    # Remove quotes or wrappers
    u = u.strip("'\"<>[]()")
    if not u.startswith("http://") and not u.startswith("https://"):
        if "." in u and not u.startswith("="):
            u = "https://" + u
    parsed = urllib.parse.urlparse(u)
    if not parsed.netloc:
        return ""
    # Filter out obvious non-urls
    if " " in u or len(parsed.netloc) < 3 or "." not in parsed.netloc:
        return ""
    return u

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

def fetch_metadata(url):
    """Fetches title and description from website with timeout fallback"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    try:
        resp = requests.get(url, headers=headers, timeout=4, verify=False)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.content, 'html.parser')
            title = soup.title.string.strip() if (soup.title and soup.title.string) else ""
            desc = ""
            meta_desc = soup.find('meta', attrs={'name': 'description'}) or soup.find('meta', attrs={'property': 'og:description'})
            if meta_desc and meta_desc.get('content'):
                desc = meta_desc['content'].strip()
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

def get_domain_key(url):
    parsed = urllib.parse.urlparse(url)
    domain = parsed.netloc.lower()
    if domain.startswith("www."):
        domain = domain[4:]
    # Keep path if it represents distinct sub-services (like coursera.org/learn/xyz)
    path = parsed.path.rstrip('/')
    if len(path) > 1 and any(sub in domain for sub in ['youtube.com', 'instagram.com', 'github.com', 'coursera.org']):
        return f"{domain}{path}"
    return domain

print("Manual Websites Agent Engine Module Loaded Successfully.")
