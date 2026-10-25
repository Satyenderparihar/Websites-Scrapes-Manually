"""
Deep Ingestion and Re-synchronization of all Curated Websites
Ensures Website Type is accurately captured, classified and displayed for every single website.
Zero Mixing, 100% Isolated Categories.
Courses are deeply sub-categorized by Topic/Track.
Coding & Developer Platforms are deeply sub-categorized by Development Track.
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

COURSE_SUBCATEGORIES = {
    "🎁 Free Program Combos & Bundles": [
        "Free Program Combo Bundle"
    ],
    "🤖 Generative AI & LLM Engineering": [
        "Generative AI Course", "AI Course Platform", "Open Source AI Course", "AI Training Course", "Online Course (LLMs)", "Online Course (AI for Everyone)"
    ],
    "🧠 Agentic AI & Autonomous Systems": [
        "Agentic AI Course"
    ],
    "📊 Machine Learning & Deep Learning Mastery": [
        "Machine Learning & Deep Learning Course", "Machine Learning Course", "Online Course"
    ],
    "🔗 RAG (Retrieval-Augmented Generation)": [
        "RAG Application Course"
    ],
    "⚡ Vibe Coding & AI Automation": [
        "Vibe Coding Course"
    ],
    "🛠️ Project-Based AI & Data Pipelines": [
        "Project-Based Learning Course"
    ],
    "🔬 Frontier AI Models Deep Dive": [
        "AI Model Deep Dive Course"
    ],
    "📈 Data Analytics, SQL & Fundamental Tech": [
        "Fundamental Tech Course", "Professional Certificate", "Online Course Platform", "Data Science Course"
    ],
    "💻 Computer Education & Web Development": [
        "Computer Courses Platform", "Study Notes / Learning Material", "Web Development Course"
    ],
    "☁️ Cloud Computing & Google Skills": [
        "Official Google Training", "Cloud Training Path"
    ],
    "🗣️ English & Language Learning": [
        "English Learning Page", "English Learning Video"
    ],
    "🌐 Academic STEM Tools & Learning Platforms": [
        "Skill Development Platform", "Educational Learning Platform"
    ]
}

def map_course_to_subcat(wtype, name=""):
    wtype_clean = (wtype or "").strip()
    name_clean = (name or "").lower()
    if 'combo' in name_clean or 'free program' in name_clean:
        return "🎁 Free Program Combos & Bundles"
    if 'elements of ai' in name_clean or 'microsoft generative ai' in name_clean or 'databricks' in name_clean or 'with llms' in name_clean or ('for everyone' in name_clean and 'generative' in name_clean):
        return "🤖 Generative AI & LLM Engineering"
    if 'google data analytics' in name_clean or 'great learning' in name_clean:
        return "📈 Data Analytics, SQL & Fundamental Tech"
    if 'learnvern' in name_clean:
        return "🌐 Academic STEM Tools & Learning Platforms"
        
    for subcat, types in COURSE_SUBCATEGORIES.items():
        if wtype_clean in types:
            return subcat
    return "🌐 Academic STEM Tools & Learning Platforms"

CODING_SUBCATEGORIES = {
    "🌐 HTML, CSS & Web Development": [
        "Web Development Resource", "Web Dev Project Implementation", "CSS Learning", "JavaScript Learning",
        "React Learning", "Vue.js Learning", "Web3 Learning", "PHP Learning", "Next.js Learning", "Web Development",
        "HTML Cheat Sheet PDF Document"
    ],
    "⚡ C Programming Language": [
        "C Project Implementation", "C Language Resource", "C Programming"
    ],
    "⚙️ C++ Programming Language": [
        "C++ Project Implementation", "C++ Language Resource", "C++ Programming"
    ],
    "☕ Java Programming & Android Tech": [
        "Java Project Implementation", "Java Language Resource", "Java Programming"
    ],
    "🐍 Python Programming & Projects": [
        "Python Programming Resource", "Python Project Implementation", "Python Resource", "Python Learning"
    ],
    "📈 R Programming & Statistical Computing": [
        "R Programming Resource", "R Project Implementation", "Statistical Computing Resource"
    ],
    "📊 Data Science, Big Data & Analytics": [
        "Data Science & Analytics Resource", "Data Analytics Resource", "Big Data Resource", "Data Science Project Implementation"
    ],
    "🤖 Machine Learning, AI & Deep Learning": [
        "Machine Learning & AI Resource", "Machine Learning Resource", "Deep Learning Resource", "Machine Learning Project Implementation"
    ],
    "🚀 Computer Science & Engineering Projects": [
        "Coding Project Implementation"
    ],
    "📋 Master Tech Cheat Sheets (Google Sheets Library)": [
        "Google Sheets Master Cheat Sheet", "Master Tech Cheat Sheet"
    ],
    "💻 Online Code Editors & Cloud IDEs": [
        "Online Code Editor & IDE", "Online Code Editor", "Web IDE"
    ],
    "⚔️ Coding Challenges & Practice Platforms": [
        "Coding Practice & Challenges", "Coding Practice Platform", "Coding Practice Community"
    ],
    "🎓 Full-Stack & Computer Science Learning Platforms": [
        "Coding Learning Platform", "Tech Learning Platform", "Interactive Coding App", "Learning Platform"
    ],
    "🐙 Version Control, Git & Repositories": [
        "Version Control & Repository Platform", "Version Control", "Version Control (Git)"
    ],
    "📺 Programming Creators & Channels (YouTube & Social)": [
        "YouTube Coding Channel", "Social Coding Creator", "Telegram Tech Community"
    ],
    "💼 Interview Prep & Developer Utilities": [
        "Technical Interview Preparation", "Interview Prep", "Code Converter Tool", "Code Converter", "Developer Utility"
    ]
}

def map_coding_to_subcat(wtype, name="", url=""):
    wtype_clean = (wtype or "").strip()
    name_clean = (name or "").strip()
    url_clean = (url or "").strip()
    
    name_lower = name_clean.lower()
    wtype_lower = wtype_clean.lower()
    url_lower = url_clean.lower()
    
    # 1. Master Cheat Sheets (Google Sheets Library)
    if 'docs.google.com' in url_lower or 'google sheet' in wtype_lower:
        return "📋 Master Tech Cheat Sheets (Google Sheets Library)"

    # 2. Online IDEs & Cloud Editors
    if any(k in name_lower for k in ['replit', 'glitch', 'codepen', 'jsfiddle', 'codesandbox', 'stackblitz']) or 'online code editor' in wtype_lower:
        return "💻 Online Code Editors & Cloud IDEs"

    # 3. Coding Challenges & Practice Platforms
    if any(k in name_lower for k in ['leetcode', 'hackerrank', 'codewars', 'topcoder', 'coderbyte', 'codechef', 'exercism', 'project euler', 'dailyprogrammer', 'rosalind']) or 'coding practice' in wtype_lower:
        return "⚔️ Coding Challenges & Practice Platforms"

    # 4. Version Control & Git Repositories
    if any(k in name_lower for k in ['github', 'gitlab', 'bitbucket', 'git book']) or 'version control' in wtype_lower:
        return "🐙 Version Control, Git & Repositories"

    # 5. Programming Creators & Channels (YouTube & Social)
    if 'youtube' in wtype_lower or 'social' in wtype_lower or 'telegram' in wtype_lower or any(k in name_lower for k in ['mosh', 'harry', 'telusko', 'traversy', 'gate smashers', 'anuj bhaiya', 'apni kaksha', 'jenny', 'mysirg', 'derek banas', 'academind', 'thenewboston', 'sortedcoding', 'clever programmer', 'programmingknowledge', 'codz learner', 'startup baniya', 'iron coding']):
        return "📺 Programming Creators & Channels (YouTube & Social)"

    # 6. Technical Interview Prep & Developer Utilities
    if any(k in name_lower for k in ['interview', 'converter tool', 'code converter', 'interviewbit']) or 'technical interview' in wtype_lower:
        return "💼 Interview Prep & Developer Utilities"

    # 7. HTML, CSS & Web Development (HTML, CSS, JS, React, Vue, Next.js, Web pages)
    if any(k in name_lower for k in ['javascript', 'html', 'css', 'react', 'vue', 'frontend', 'front-end', 'next.js', 'php', 'food delivery', 'webpage', 'ajax']) or any(k in wtype_lower for k in ['web dev', 'web development', 'css']):
        return "🌐 HTML, CSS & Web Development"

    # 8. C++ Programming Language
    if 'c++' in wtype_lower or 'c++' in name_lower or re.search(r'\b(cpp|c\+\+)\b', name_lower):
        return "⚙️ C++ Programming Language"

    # 9. C Programming Language
    if 'c project' in wtype_lower or re.search(r'\b(c\s+language|c\s+project|in\s+c|c\s+programming)\b', name_lower):
        return "⚡ C Programming Language"

    # 10. Java Programming & Android Tech
    if ('java' in wtype_lower or re.search(r'\b(java|android)\b', name_lower)) and not any(k in name_lower for k in ['javascript', 'python vs java', 'ml java']):
        return "☕ Java Programming & Android Tech"

    # 11. Python Programming & Projects
    if 'pythongeeks.org' in url_lower or 'python' in wtype_lower or ('python' in name_lower and not any(k in name_lower for k in ['course', 'channel', 'social'])):
        return "🐍 Python Programming & Projects"

    # 12. R Programming & Statistical Computing
    if 'r programming' in wtype_lower or 'r project' in wtype_lower or 'learn r' in name_lower or re.search(r'\b(r\s+programming|r\s+project|in\s+r)\b', name_lower):
        return "📈 R Programming & Statistical Computing"

    # 13. Data Science, Big Data & Analytics
    if 'data science' in wtype_lower or any(k in name_lower for k in ['data science', 'analytics', 'big data', 'pandas', 'numpy', 'matplotlib', 'seaborn', 'statistics', 'tableau', 'association rule mining', 'data analysis', 'data cleansing']):
        return "📊 Data Science, Big Data & Analytics"

    # 14. Machine Learning, AI & Deep Learning
    if 'machine learning' in wtype_lower or any(k in name_lower for k in ['machine learning', 'neural', 'cnn', 'deep learning', 'svm', 'clustering', 'scikit-learn', 'artificial intelligence', 'nlp', 'computer vision', 'image classifier', 'speech recognition', 'sign language', 'reinforcement learning', 'ml java']):
        return "🤖 Machine Learning, AI & Deep Learning"

    # 15. Computer Science & Engineering Projects (Cross-Platform)
    if 'project implementation' in wtype_lower or 'project' in name_lower:
        return "🚀 Computer Science & Engineering Projects"

    # 16. Full-Stack & Computer Science Learning Platforms (Default)
    return "🎓 Full-Stack & Computer Science Learning Platforms"

VALID_TLDS = set([
    'com', 'org', 'net', 'edu', 'gov', 'mil', 'io', 'ai', 'co', 'app', 'dev', 'tv', 'me', 'in', 'is', 'so', 'gg',
    'cc', 'ly', 'to', 'la', 'fm', 'xyz', 'tech', 'online', 'site', 'store', 'club', 'pro', 'studio', 'tools', 'garden',
    'lol', 'live', 'page', 'space', 'fun', 'design', 'world', 'media', 'stream', 'cloud', 'engineer', 'academy',
    'software', 'download', 'community', 'systems', 'education', 'solutions', 'technology', 'training'
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
    if tld not in VALID_TLDS and len(tld) > 10:
        return ""
    clean_query = []
    if parsed.query:
        for qp in parsed.query.split('&'):
            if not any(qp.startswith(t) for t in ['utm_', 'fbclid', 'gclid', 'ref_']):
                clean_query.append(qp)
    query_str = '&'.join(clean_query)
    fragment_str = parsed.fragment if ("docs.google.com" in parsed.netloc.lower() and parsed.fragment) else ""
    clean = urllib.parse.urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, query_str, fragment_str))
    return clean.rstrip('/')

def get_domain_key(url):
    parsed = urllib.parse.urlparse(url)
    domain = parsed.netloc.lower()
    if domain.startswith("www."):
        domain = domain[4:]
    path = parsed.path.rstrip('/')
    query = parsed.query
    fragment = parsed.fragment
    if any(sub in domain for sub in ['youtube.com', 'instagram.com', 't.me', 'github.com', 'geeksforgeeks.org', 'reddit.com', 'edx.org', 'coursera.org', 'w3schools.com', 'coddy.tech', 'classcentral.com', 'botdownloader.com', 'analyticsvidhya.com', 'stpcomputereducation.com', 'cloudskillsboost.google', 'data-flair.training', 'docs.google.com', 'pythongeeks.org', 'codewithcurious.com', 'foolishdeveloper.com']):
        key_suffix = path
        if query:
            key_suffix = f"{path}?{query}" if path else f"?{query}"
        if fragment and 'docs.google.com' in domain:
            key_suffix = f"{key_suffix}#{fragment}"
        if key_suffix:
            return f"{domain}{key_suffix}"
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

YOUTUBE_CREATORS = {
    "Python Full Course – Programming with Mosh": ("Programming with Mosh", "https://www.youtube.com/@programmingwithmosh", "YouTube Coding Channel", "Complete Python and software engineering video courses."),
    "Python Full Course – Freecodecamp.org": ("freeCodeCamp.org", "https://www.youtube.com/@freecodecamp", "YouTube Coding Channel", "Comprehensive free coding curriculum and full-length video courses."),
    "Code with Harry": ("CodeWithHarry", "https://www.youtube.com/@CodeWithHarry", "YouTube Coding Channel", "Top Indian programming channel teaching Python, Web Dev, C, C++, and Java in Hindi."),
    "Anuj bhaiya": ("Anuj Bhaiya", "https://www.youtube.com/@AnujBhaiya", "YouTube Coding Channel", "Data structures, algorithms, system design, and software engineering placement prep."),
    "Apni Kaksha": ("Apni Kaksha", "https://www.youtube.com/@ApniKaksha", "YouTube Coding Channel", "Free quality coding education, college roadmap, and placement interview guidance."),
    "Telusko": ("Telusko", "https://www.youtube.com/@Telusko", "YouTube Coding Channel", "Java, Python, Blockchain, Docker, and full-stack web development tutorials."),
    "Jenny's lectures CS/IT NET & JRE": ("Jenny's Lectures CS IT", "https://www.youtube.com/@JennyslecturesCSIT", "YouTube Coding Channel", "Engineering CS/IT subjects, algorithms, data structures, and theory of computation."),
    "SEGate Smashers": ("Gate Smashers", "https://www.youtube.com/@GateSmashers", "YouTube Coding Channel", "Operating systems, DBMS, computer networks, and GATE computer science lectures."),
    "Bhagwan Singh Vishwakarma": ("Bhagwan Singh Vishwakarma", "https://www.youtube.com/@bhagwansinghvishwakarma", "YouTube Coding Channel", "Computer science, programming, and technical academic tutorials."),
    "MySirG": ("MySirG.com", "https://www.youtube.com/@MySirG", "YouTube Coding Channel", "Premier Hindi channel for C, C++, Python, Data Structures, and programming fundamentals."),
    "Programming with Mosh": ("Programming with Mosh", "https://www.youtube.com/@programmingwithmosh", "YouTube Coding Channel", "Clear, concise tutorials on Python, JavaScript, React, C#, and SQL."),
    "FreeCodeCamp.org": ("freeCodeCamp.org", "https://www.youtube.com/@freecodecamp", "YouTube Coding Channel", "Thousands of hours of free coding courses from industry professionals."),
    "Traversy Media": ("Traversy Media", "https://www.youtube.com/@TraversyMedia", "YouTube Coding Channel", "Practical web development tutorials, crash courses, and project builds."),
    "Programming Knowledge": ("ProgrammingKnowledge", "https://www.youtube.com/@ProgrammingKnowledge", "YouTube Coding Channel", "Step-by-step programming tutorials on Android, Java, Python, and Linux."),
    "Derek Banas": ("Derek Banas", "https://www.youtube.com/@derekbanas", "YouTube Coding Channel", "Learn complex programming languages and frameworks in single comprehensive videos."),
    "Clever Programmer": ("Clever Programmer", "https://www.youtube.com/@CleverProgrammer", "YouTube Coding Channel", "Full-stack web development clone builds with JavaScript, React, and Python."),
    "thenewboston": ("thenewboston", "https://www.youtube.com/@thenewboston", "YouTube Coding Channel", "Pioneering computer science, web dev, and blockchain video tutorials."),
    "LearnCode.academy": ("LearnCode.academy", "https://www.youtube.com/@learncodeacademy", "YouTube Coding Channel", "Web development tutorials, responsive design, JavaScript, React, and DevOps."),
    "mycodeschool": ("mycodeschool", "https://www.youtube.com/@mycodeschool", "YouTube Coding Channel", "Classic, world-renowned lessons on data structures, pointers, and memory management."),
    "SoloLearn": ("SoloLearn", "https://www.youtube.com/@SoloLearn", "YouTube Coding Channel", "Bite-sized mobile-first coding lessons and language deep-dives."),
    "Programming Hub": ("Programming Hub", "https://www.youtube.com/@ProgrammingHub", "YouTube Coding Channel", "Accessible tech tutorials covering AI, app development, and programming languages."),
    "Grasshopper": ("Grasshopper (Google)", "https://learn.grasshopper.app", "Interactive Coding App", "Google's visual, puzzle-based app to learn fundamental JavaScript syntax."),
    "Academind": ("Academind", "https://www.youtube.com/@academind", "YouTube Coding Channel", "Deep-dive technical tutorials on React, Angular, Vue, Node.js, and cloud tech."),
    "SortedCoding": ("SortedCoding", "https://www.youtube.com/@SortedCoding", "YouTube Coding Channel", "Frontend tricks, CSS animations, JavaScript projects, and coding shorts."),
    "Code With Imraan": ("Code With Imran", "https://www.instagram.com/codewithimraan/", "Social Coding Creator", "Instagram programming tips, frontend animations, and web development tricks."),
    "Codz Learner": ("Code Learner", "https://www.instagram.com/codzlearner/", "Social Coding Creator", "Daily coding snippets, interview questions, and tech infographics."),
    "freeCodeCamp": ("freeCodeCamp (Social)", "https://www.instagram.com/freecodecamp/", "Social Coding Creator", "Global community posts, coding memes, and learning roadmaps."),
    "Python Hub": ("Python Hub", "https://www.instagram.com/python.hub/", "Social Coding Creator", "Python tricks, automation scripts, and daily coding exercises."),
    "Codewithimran": ("Code With Imran", "https://www.instagram.com/codewithimraan/", "Social Coding Creator", "Frontend coding snippets, UI animations, and web design tips."),
    "Code learner": ("Code Learner", "https://www.instagram.com/codzlearner/", "Social Coding Creator", "Daily developer resources, cheat sheets, and coding questions."),
    "Rangatechoologies": ("Ranga Technologies", "https://www.instagram.com/rengatechnologies/", "Social Coding Creator", "Tech career guidance, full-stack tips, and programming tutorials."),
    "Startup Baniya": ("Startup Baniya", "https://www.instagram.com/startupbaniya/", "Social Coding Creator", "Tech tools, AI startups, coding resources, and developer productivity hacks."),
    "Iron Coding": ("Iron Coding", "https://www.instagram.com/iron.coding/", "Social Coding Creator", "Programming tips, coding interview prep, and tech fundamentals.")
}

def load_existing_database():
    best_data = {}
    for commit in ['42ece39', '25e9077', '9b189cc', '6cc85f9', 'HEAD', '7a9f688']:
        try:
            res = subprocess.run(['git', '-C', BASE_DIR, 'show', f'{commit}:💾 websites_database.json'], capture_output=True)
            if res.returncode == 0:
                data = json.loads(res.stdout.decode('utf-8'))
                if len(data) > len(best_data):
                    best_data = data
        except Exception:
            pass
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if len(data) > len(best_data):
                    best_data = data
        except Exception:
            pass
    print(f">>> Loaded {len(best_data)} existing curated websites from git baseline.")
    return best_data

def build_database():
    db = load_existing_database()

    def add_entry(url, name, website_type, category, pricing, desc, source, priority=1):
        cleaned = clean_url(url)
        if not cleaned:
            return
        key = get_domain_key(cleaned)
        final_pricing = normalize_pricing(pricing)
        final_desc = desc if desc else f"Official platform resource for {name} ({website_type})"

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

    print(">>> 2. Processing ⬇️ Video Downloaders...")
    downloaders_data = [
        ("https://fdown.net/download.php", "FDown", "Facebook Video Downloader", "⬇️ Video & Media Downloaders", "Free", "Fast online Facebook Video Downloader for MP4 and HD videos."),
        ("https://botdownloader.com/facebook-video-downloader", "BotDownloader (Facebook)", "Facebook Video Downloader", "⬇️ Video & Media Downloaders", "Free", "Online downloader for Facebook videos, clips, and private videos."),
        ("https://igram.io/en/dl", "iGram", "Instagram Downloader", "⬇️ Video & Media Downloaders", "Free", "Download Instagram photos, videos, reels, IGTV, and carousels online."),
        ("https://botdownloader.com/pinterest-video-downloader", "BotDownloader (Pinterest)", "Pinterest Video Downloader", "⬇️ Video & Media Downloaders", "Free", "Fast Pinterest video, GIF, and photo downloader."),
        ("https://botdownloader.com/twitter-video-downloader", "BotDownloader (Twitter)", "Twitter Video Downloader", "⬇️ Video & Media Downloaders", "Free", "Direct Twitter (X) video and GIF downloader online."),
        ("https://ssyoutube.com/en1/youtube-video-downloader", "SSYouTube", "YouTube Video Downloader", "⬇️ Video & Media Downloaders", "Free", "Online YouTube video downloader for 1080p, 720p, and MP3 audio."),
        ("https://y2mate.lol/en98/youtube-to-mp4", "Y2Mate", "YouTube to MP4 Converter", "⬇️ Video & Media Downloaders", "Free", "Convert and download YouTube videos to MP4 high-speed online."),
        ("https://cobalt.tools", "Cobalt Tools", "Universal Media Downloader", "⬇️ Video & Media Downloaders", "Free", "Universal media downloader for YouTube, Twitter, Instagram, Reddit with zero ads."),
        ("https://github.com/aman2k4/StartupBaniya/tree/main/autosubtitles", "AutoSubtitles (GitHub)", "Subtitle Automation Tool", "⬇️ Video & Media Downloaders", "Free", "Automated open-source subtitle generator and downloader tool."),
        ("https://filepursuit.com", "FilePursuit", "File Search Engine", "🛠️ Web Utilities & Productivity", "Free", "Open file and media search engine indexing millions of web files."),
        ("https://image.pi7.org", "PI7 Image Tool", "Image Processing Tool", "🛠️ Web Utilities & Productivity", "Free", "Online image compressor, resizer, and converter tool."),
        ("https://www.instagram.com/reel/DcyyG0Tvhqb/?stkn=MXJ6c2dmdmtteGJpaA==", "YouTube Video & MP3 Timestamp Downloader (Instagram Reel Guide)", "YouTube Video & MP3 Timestamp Downloader", "⬇️ Video & Media Downloaders", "Free", "Tool and tutorial to download specific timestamp clips from YouTube videos as MP3 or MP4."),
        ("https://www.yout.com", "Yout.com (YouTube URL Trick)", "YouTube Video & MP3 Downloader (URL Trick)", "⬇️ Video & Media Downloaders", "Free", "Directly download any YouTube video as MP4 or MP3 by removing 'ube' from youtube.com in the browser URL."),
        ("https://www.instag.com", "Instag.com (Instagram URL Trick)", "Instagram HD Reel Direct Downloader (URL Trick)", "⬇️ Video & Media Downloaders", "Free", "Directly download Instagram Reels in highest available quality by removing 'ram' from instagram.com in the browser URL."),
        ("https://www.faceb.com", "Faceb.com (Facebook URL Trick)", "Facebook Video Direct Downloader (URL Trick)", "⬇️ Video & Media Downloaders", "Free", "Directly download Facebook videos by removing 'ook' from facebook.com in the browser URL.")
    ]
    for url, name, wtype, cat, prc, dsc in downloaders_data:
        add_entry(url, name, wtype, cat, prc, dsc, "Excel: ⬇️ Video Downloaders.xlsx", priority=9)

    print(">>> 3. Processing 🎵 Online Music & Video...")
    music_data = [
        ("https://music.youtube.com", "YouTube Music", "Music Streaming", "🎵 Music & Audio Streaming", "Free + Paid", "Official music streaming service by YouTube."),
        ("https://www.spotify.com", "Spotify", "Music Streaming", "🎵 Music & Audio Streaming", "Free + Paid", "Global digital music and podcast platform."),
        ("https://music.apple.com", "Apple Music", "Music Streaming", "🎵 Music & Audio Streaming", "Paid", "Premium audio streaming platform by Apple."),
        ("https://soundcloud.com", "SoundCloud", "Music Streaming", "🎵 Music & Audio Streaming", "Free + Paid", "Open audio platform connecting fans with independent creators."),
        ("https://gaana.com", "Gaana", "Music Streaming (India)", "🎵 Music & Audio Streaming", "Free + Paid", "Commercial Indian music streaming service."),
        ("https://www.jiosaavn.com", "JioSaavn", "Music Streaming (India)", "🎵 Music & Audio Streaming", "Free + Paid", "Extensive Indian audio streaming platform with 80M+ tracks.")
    ]
    for url, name, wtype, cat, prc, dsc in music_data:
        add_entry(url, name, wtype, cat, prc, dsc, "Excel: 🎵 Online Music & Video.xlsx", priority=8)

    print(">>> 4. Processing 🌐 Powerful Websites...")
    f_power = os.path.join(DOWNLOADS_DIR, "🌐 Powerful Websites.xlsx")
    if not os.path.exists(f_power):
        recycle_files = glob.glob(r'C:\$Recycle.Bin\*\$RMMII6L.xlsx')
        if recycle_files:
            f_power = recycle_files[0]

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

            add_entry(url, name, wtype, cat, pricing, desc, "Excel: 🌐 Powerful Websites.xlsx (Websites-BH)", priority=5)

    print(">>> 5. Processing 📄 PDF Resources...")
    f_pdf = os.path.join(DOWNLOADS_DIR, "📄 PDF Resources.xlsx")
    if not os.path.exists(f_pdf):
        recycle_files = glob.glob(r'C:\$Recycle.Bin\*\$RBVY5L1.xlsx')
        if recycle_files:
            f_pdf = recycle_files[0]
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

    print(">>> 6. Processing 🎓 Course Library.xlsx (All 8 Sheets)...")
    f_course = os.path.join(DOWNLOADS_DIR, "🎓 Course Library.xlsx")
    if os.path.exists(f_course):
        wb = openpyxl.load_workbook(f_course, data_only=True)
        wb_f = openpyxl.load_workbook(f_course, data_only=False)
        
        # 7 individual sheets
        for sname in ['Ai', 'Machine Learning ', 'Data Analysis ', 'Computer ', 'Google ', 'Skill Based', 'English']:
            if sname in wb.sheetnames:
                ws = wb[sname]
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

        # Sheet1 (56 Courses in 9 sections)
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

    print(">>> 7. Processing 💻 Coding Websites.xlsx (All 12 Sheets)...")
    f_coding = os.path.join(DOWNLOADS_DIR, "💻 Coding Websites.xlsx")
    if os.path.exists(f_coding):
        wb_c = openpyxl.load_workbook(f_coding, data_only=True)
        wb_cf = openpyxl.load_workbook(f_coding, data_only=False)

        # 7.1 YouTube & Social Channels (Y-I-T - BH)
        if "Y-I-T - BH" in wb_c.sheetnames:
            ws_yit = wb_c["Y-I-T - BH"]
            for r in range(2, ws_yit.max_row + 1):
                c1 = str(ws_yit.cell(r, 1).value or '').strip()
                c2 = str(ws_yit.cell(r, 2).value or '').strip()
                if c2 in YOUTUBE_CREATORS:
                    cname, curl, ctype, cdesc = YOUTUBE_CREATORS[c2]
                    add_entry(curl, cname, ctype, "💻 Coding & Developer Platforms", "Free", cdesc, "Excel: 💻 Coding Websites.xlsx (Y-I-T - BH)", priority=9)
                elif c1 == "Telegram" and "Python" in c2:
                    add_entry("https://t.me/pythonhub", "Python Hub (Telegram)", "Telegram Tech Community", "💻 Coding & Developer Platforms", "Free", "Daily Python resources, code snippets, and cheat sheets on Telegram.", "Excel: 💻 Coding Websites.xlsx (Y-I-T - BH)", priority=9)

        # 7.2 Standard Coding & Dev Sheets
        std_sheets = [
            "Online Learning Platforms - BH",
            "Programming Resources & Referen",
            "Web Development Resources - BH",
            "Course Platforms - BH",
            "Online Coding Platforms & Versi",
            "Interview, Utilities & Extras -",
            "Programming & Tech Learning Res"
        ]
        for sname in std_sheets:
            if sname in wb_c.sheetnames:
                ws = wb_c[sname]
                ws_f = wb_cf[sname]
                for r in range(2, ws.max_row + 1):
                    wtype = str(ws.cell(r, 1).value or '').strip()
                    name = str(ws.cell(r, 2).value or '').strip()
                    cell_3 = ws.cell(r, 3)
                    cell_3_f = ws_f.cell(r, 3)
                    pricing = str(ws.cell(r, 4).value or 'Free').strip()
                    
                    url = ""
                    if cell_3.hyperlink and cell_3.hyperlink.target:
                        url = cell_3.hyperlink.target
                    elif cell_3.value and str(cell_3.value).startswith("http"):
                        url = str(cell_3.value).strip()
                    elif cell_3_f.value and str(cell_3_f.value).startswith("=HYPERLINK"):
                        m = re.search(r'=HYPERLINK\("?([^",\)]+)"?', str(cell_3_f.value))
                        if m: url = m.group(1).strip()
                        
                    if url and "chatgpt.com" not in url:
                        if "editor" in wtype.lower(): wtype = "Online Code Editor & IDE"
                        elif "version" in wtype.lower(): wtype = "Version Control & Repository Platform"
                        elif "interview" in wtype.lower(): wtype = "Technical Interview Preparation"
                        elif "converter" in wtype.lower(): wtype = "Code Converter Tool"
                        elif "css" in wtype.lower(): wtype = "Developer Reference & Cheat Sheets"
                        elif "python" in wtype.lower(): wtype = "Python Programming Resource"
                        elif "web" in wtype.lower(): wtype = "Web Development Resource"
                        elif "learning" in wtype.lower() or "course" in wtype.lower(): wtype = "Coding Learning Platform"
                        elif "resource" in wtype.lower(): wtype = "Developer Reference & Cheat Sheets"
                        
                        add_entry(url, name, wtype, "💻 Coding & Developer Platforms", pricing, f"High-utility developer platform: {name} ({wtype})", f"Excel: 💻 Coding Websites.xlsx ({sname})", priority=8)

        # 7.3 Pythons - BH
        if "Pythons - BH" in wb_c.sheetnames:
            ws_py = wb_c["Pythons - BH"]
            ws_pyf = wb_cf["Pythons - BH"]
            for r in range(2, ws_py.max_row + 1):
                c2 = ws_py.cell(r, 2)
                c2_f = ws_pyf.cell(r, 2)
                c3 = ws_py.cell(r, 3)
                name = str(c2.value or '').strip()
                if not name or name in ["Website", "None"]:
                    continue
                url = ""
                if c2.hyperlink and c2.hyperlink.target:
                    url = c2.hyperlink.target
                elif c2_f.value and str(c2_f.value).startswith("=HYPERLINK"):
                    m = re.search(r'=HYPERLINK\("?([^",\)]+)"?', str(c2_f.value))
                    if m: url = m.group(1).strip()
                if url and "chatgpt.com" not in url:
                    raw_cat = str(c3.value or '').strip()
                    wtype = "Coding Practice & Challenges" if "Practice" in raw_cat else "Python Programming Resource"
                    add_entry(url, name, wtype, "💻 Coding & Developer Platforms", "Free", f"{raw_cat} - Official platform for {name}", "Excel: 💻 Coding Websites.xlsx (Pythons - BH)", priority=8)

        # 7.4 Sheet32 - BH
        if "Sheet32 - BH" in wb_c.sheetnames:
            ws_s32 = wb_c["Sheet32 - BH"]
            ws_s32f = wb_cf["Sheet32 - BH"]
            col_type_map = {
                1: "Version Control & Repository Platform",
                2: "Coding Practice & Challenges",
                3: "Coding Learning Platform",
                4: "Developer Reference & Cheat Sheets",
                5: "Python Programming Resource",
                6: "YouTube Coding Channel",
                7: "Social Coding Creator",
                8: "Telegram Tech Community"
            }
            for r in range(2, ws_s32.max_row + 1):
                for c in range(1, 9):
                    cell = ws_s32.cell(r, c)
                    cell_f = ws_s32f.cell(r, c)
                    val = str(cell.value or '').strip()
                    url = ""
                    if cell.hyperlink and cell.hyperlink.target:
                        url = cell.hyperlink.target
                    elif cell_f.value and str(cell_f.value).startswith("=HYPERLINK"):
                        m = re.search(r'=HYPERLINK\("?([^",\)]+)"?', str(cell_f.value))
                        if m: url = m.group(1).strip()
                    elif val.startswith("http"):
                        url = val
                        
                    if url and "chatgpt.com" not in url:
                        name = val if (val and not val.startswith("http")) else ""
                        if not name:
                            parsed = urllib.parse.urlparse(url)
                            name = parsed.netloc.replace('www.', '').split('.')[0].capitalize()
                        wtype = col_type_map.get(c, "Coding & Developer Platform")
                        if "replit" in name.lower() or "glitch" in name.lower() or "codepen" in name.lower() or "codesandbox" in name.lower() or "stackblitz" in name.lower():
                            wtype = "Online Code Editor & IDE"
                        add_entry(url, name, wtype, "💻 Coding & Developer Platforms", "Free", f"Developer platform: {name} ({wtype})", "Excel: 💻 Coding Websites.xlsx (Sheet32 - BH)", priority=8)

        # 7.5 Project Guides from All Project Ideas & C Project Ideas
        for sname in ["All Project Ideas", "C Project Ideas"]:
            if sname in wb_c.sheetnames:
                ws_p = wb_c[sname]
                for r in range(1, ws_p.max_row + 1):
                    c1 = str(ws_p.cell(r, 1).value or '').strip()
                    c2 = str(ws_p.cell(r, 2).value or '').strip()
                    
                    proj_name = ""
                    if sname == "All Project Ideas":
                        if c2 and c2 not in ["Project Title", "Link", "Click Here"] and len(c2) > 3:
                            proj_name = c2
                        elif c1 and not any(k in c1 for k in ["Category", "Projects", "Project Ideas"]) and len(c1) > 3:
                            proj_name = c1
                    else:
                        if c1 and not any(k in c1 for k in ["Project Name", "Project Ideas", "C Project", "C++ Project", "Java Project", "Python Project"]) and len(c1) > 3:
                            proj_name = c1

                    if not proj_name or len(proj_name) < 4:
                        continue
                        
                    real_url = ""
                    for col_idx in range(1, ws_p.max_column + 1):
                        cl = ws_p.cell(r, col_idx)
                        if cl.hyperlink and cl.hyperlink.target and "chatgpt.com" not in cl.hyperlink.target:
                            real_url = cl.hyperlink.target
                            break
                            
                    if not real_url:
                        query = urllib.parse.quote_plus(proj_name)
                        real_url = f"https://www.geeksforgeeks.org/?s={query}"
                        
                    p_lower = proj_name.lower()
                    if "c++" in p_lower:
                        ptype = "C++ Project Implementation"
                    elif "c language" in p_lower or "in c" in p_lower:
                        ptype = "C Project Implementation"
                    elif "python" in p_lower or "tkinter" in p_lower:
                        ptype = "Python Project Implementation"
                    elif "java" in p_lower:
                        ptype = "Java Project Implementation"
                    elif "html" in p_lower or "css" in p_lower or "food delivery" in p_lower:
                        ptype = "Web Dev Project Implementation"
                    else:
                        ptype = "Coding Project Implementation"
                        
                    add_entry(real_url, proj_name, ptype, "💻 Coding & Developer Platforms", "Free", f"Step-by-step source code guide & project implementation: {proj_name}", f"Excel: 💻 Coding Websites.xlsx ({sname})", priority=8)

    print(">>> 8. Processing 📚 All In One Programming Resources.xlsx (All 6 Sheets)...")
    f_all_in_one = os.path.join(DOWNLOADS_DIR, "All In One Programming Resources.xlsx")
    if os.path.exists(f_all_in_one):
        wb_aio = openpyxl.load_workbook(f_all_in_one, data_only=False)
        wb_aiod = openpyxl.load_workbook(f_all_in_one, data_only=True)

        for sname in wb_aio.sheetnames:
            ws = wb_aio[sname]
            ws_d = wb_aiod[sname]

            # 8.1 Cheatsheet-list (70 Google Sheet Cheat Sheets)
            if sname == "Cheatsheet-list":
                for r in range(1, ws.max_row + 1):
                    name = str(ws.cell(r, 1).value or '').strip()
                    cell_2 = ws.cell(r, 2)
                    val_2 = str(cell_2.value or '').strip()
                    hl_2 = cell_2.hyperlink.target if cell_2.hyperlink else ''
                    url = val_2 if ('#gid=' in val_2 or not hl_2) else hl_2
                    if not name or name in ["None"] or len(name) < 3:
                        continue
                    cu = clean_url(url)
                    if cu:
                        add_entry(cu, name, "Google Sheets Master Cheat Sheet", "💻 Coding & Developer Platforms", "Free", f"Comprehensive developer cheat sheet and reference spreadsheet: {name}", f"Excel: All In One Programming Resources.xlsx ({sname})", priority=9)
                continue

            # 8.2 Stay updated on Telegram (4 channels)
            if sname == "Stay updated on Telegram":
                for r in range(1, ws.max_row + 1):
                    c1 = str(ws.cell(r, 1).value or '').strip()
                    c2_cell = ws.cell(r, 2)
                    c3 = str(ws.cell(r, 3).value or '').strip()
                    if not c1 or any(k in c1 for k in ["NOTE:", "Channel / Group Name", "None"]) or len(c1) < 3:
                        continue
                    url = c2_cell.hyperlink.target if c2_cell.hyperlink else str(c2_cell.value or '').strip()
                    cu = clean_url(url)
                    if cu:
                        desc = c3 if c3 and len(c3) > 10 else f"Technical developer community on Telegram: {c1}"
                        add_entry(cu, f"{c1} (Telegram)", "Telegram Tech Community", "💻 Coding & Developer Platforms", "Free", desc, f"Excel: All In One Programming Resources.xlsx ({sname})", priority=8)
                continue

            # 8.3 Learn Python, Learn Machine Learning, Learn Data Science, Learn R
            for r in range(1, ws.max_row + 1):
                for c in range(1, ws.max_column + 1):
                    cell = ws.cell(r, c)
                    cell_d = ws_d.cell(r, c)
                    val = str(cell_d.value or cell.value or '').strip()
                    hl = cell.hyperlink.target if cell.hyperlink else None
                    url = hl if hl else (val if val.startswith("http") else "")

                    if not val or val in ["None", "Link", "Click Here"] or len(val) < 2:
                        continue
                    if val.startswith("NOTE:") or val.startswith("http"):
                        val_name = ""
                    else:
                        val_name = val

                    cu = clean_url(url)
                    if cu and "chatgpt.com" not in cu:
                        name = val_name if val_name else cu.split('/')[-1].replace('-', ' ').title()
                        p_lower = name.lower()

                        if "project" in p_lower:
                            if "python" in sname.lower() or "python" in p_lower:
                                wtype = "Python Project Implementation"
                            elif "machine learning" in sname.lower() or "ml" in p_lower:
                                wtype = "Machine Learning Project Implementation"
                            elif "data science" in sname.lower():
                                wtype = "Data Science Project Implementation"
                            elif "r" in sname.lower():
                                wtype = "R Project Implementation"
                            else:
                                wtype = "Coding Project Implementation"
                        elif "learn python" in sname.lower() or "python" in p_lower:
                            wtype = "Python Programming Resource"
                        elif "machine learning" in sname.lower() or any(m in p_lower for m in ['neural', 'cnn', 'rnn', 'ann', 'svm', 'clustering', 'deep learning']):
                            wtype = "Machine Learning & AI Resource"
                        elif "data science" in sname.lower() or any(d in p_lower for d in ['pandas', 'numpy', 'matplotlib', 'seaborn', 'statistics', 'tableau']):
                            wtype = "Data Science & Analytics Resource"
                        elif "learn r" in sname.lower() or " r " in f" {p_lower} ":
                            wtype = "R Programming Resource"
                        else:
                            wtype = "Developer Reference & Cheat Sheets"

                        add_entry(cu, name, wtype, "💻 Coding & Developer Platforms", "Free", f"Verified tutorial & implementation guide: {name} ({wtype})", f"Excel: All In One Programming Resources.xlsx ({sname})", priority=8)

    print(">>> 9. Processing 📝 HTML & CSS Lightweight Markdown Cheat Sheets...")
    html_cheat_sheets = [
        (
            "https://github.com/Satyenderparihar/Websites-Scrapes-Manually/blob/main/%F0%9F%93%81%20%F0%9F%92%BB%20Coding%20%26%20Developer%20Platforms/%F0%9F%93%84%20HTML%20Cheat%20Sheets/%F0%9F%93%9D%20HTML_Cheat_Sheet_1_Hostinger_Complete_Reference.md",
            "HTML Cheat Sheet 1: Hostinger Complete HTML Reference",
            "Developer Reference & Cheat Sheets",
            "💻 Coding & Developer Platforms",
            "Free",
            "Hostinger 9-page guide covering Document Structure, Headings, Text Formatting, Forms, Tables, iFrames, and HTML5 Semantic tags.",
            "Markdown: HTML Cheat Sheet 1 (Hostinger)"
        ),
        (
            "https://github.com/Satyenderparihar/Websites-Scrapes-Manually/blob/main/%F0%9F%93%81%20%F0%9F%92%BB%20Coding%20%26%20Developer%20Platforms/%F0%9F%93%84%20HTML%20Cheat%20Sheets/%F0%9F%93%9D%20HTML_Cheat_Sheet_2_University_Web_Architecture_Guide.md",
            "HTML Cheat Sheet 2: Stony Brook University Web Architecture Guide",
            "Developer Reference & Cheat Sheets",
            "💻 Coding & Developer Platforms",
            "Free",
            "Stony Brook CSE316 Computer Science lecture guide on Web Architecture, DOM Tree, HTML parsing, and CSS Specificity math.",
            "Markdown: HTML Cheat Sheet 2 (University CSE316)"
        ),
        (
            "https://github.com/Satyenderparihar/Websites-Scrapes-Manually/blob/main/%F0%9F%93%81%20%F0%9F%92%BB%20Coding%20%26%20Developer%20Platforms/%F0%9F%93%84%20HTML%20Cheat%20Sheets/%F0%9F%93%9D%20HTML_Cheat_Sheet_3_Core_Attributes_and_Quick_Reference.md",
            "HTML Cheat Sheet 3: Core Attributes & Quick Reference",
            "Developer Reference & Cheat Sheets",
            "💻 Coding & Developer Platforms",
            "Free",
            "Quick reference covering Core Attributes, Language, Keyboard, Window/Form/Mouse Event Handlers, and Character Entities.",
            "Markdown: HTML Cheat Sheet 3 (Core Attributes)"
        ),
        (
            "https://github.com/Satyenderparihar/Websites-Scrapes-Manually/blob/main/%F0%9F%93%81%20%F0%9F%92%BB%20Coding%20%26%20Developer%20Platforms/%F0%9F%93%84%20HTML%20Cheat%20Sheets/%F0%9F%93%9D%20HTML_Cheat_Sheet_4_Essential_Tags_and_Syntax.md",
            "HTML Cheat Sheet 4: Essential Tags & Syntax Visual Cheat Sheet",
            "Developer Reference & Cheat Sheets",
            "💻 Coding & Developer Platforms",
            "Free",
            "Visual syntax reference covering Basic Tags, Email HTML Body Attributes, Text Formatting, Dividers, and Form controls.",
            "Markdown: HTML Cheat Sheet 4 (Essential Tags)"
        ),
        (
            "https://github.com/Satyenderparihar/Websites-Scrapes-Manually/blob/main/%F0%9F%93%81%20%F0%9F%92%BB%20Coding%20%26%20Developer%20Platforms/%F0%9F%93%84%20HTML%20Cheat%20Sheets/%F0%9F%93%9D%20HTML_Cheat_Sheet_5_HTML5_Comprehensive_Elements.md",
            "HTML Cheat Sheet 5: HTML5 Comprehensive Elements & Attributes Guide",
            "Developer Reference & Cheat Sheets",
            "💻 Coding & Developer Platforms",
            "Free",
            "HTML.com 53-page master encyclopedia detailing all HTML5 tags from <a> to <wbr> with official MDN documentation links.",
            "Markdown: HTML Cheat Sheet 5 (HTML.com A-Z)"
        ),
        (
            "https://github.com/Satyenderparihar/Websites-Scrapes-Manually/blob/main/%F0%9F%93%81%20%F0%9F%92%BB%20Coding%20%26%20Developer%20Platforms/%F0%9F%93%84%20CSS%20Cheat%20Sheets/%F0%9F%93%9D%20CSS_Cheat_Sheet_1_The_Mega_Properties_Guide.md",
            "CSS Cheat Sheet 1: The Mega Properties & Syntax Reference",
            "Developer Reference & Cheat Sheets",
            "💻 Coding & Developer Platforms",
            "Free",
            "The Mega CSS Cheat Sheet (14 pages) covering Backgrounds, Borders, Box Model, Typography, Columns, Transforms, and Animations.",
            "Markdown: CSS Cheat Sheet 1 (The Mega Guide)"
        ),
        (
            "https://github.com/Satyenderparihar/Websites-Scrapes-Manually/blob/main/%F0%9F%93%81%20%F0%9F%92%BB%20Coding%20%26%20Developer%20Platforms/%F0%9F%93%84%20CSS%20Cheat%20Sheets/%F0%9F%93%9D%20CSS_Cheat_Sheet_2_Modern_Selectors_Animations_Guide.md",
            "CSS Cheat Sheet 2: Modern Selectors, Flexbox, Grid & Layouts",
            "Developer Reference & Cheat Sheets",
            "💻 Coding & Developer Platforms",
            "Free",
            "CheatSheetCSS (23 pages) covering Modern Selectors, Display, Positioning, Flexbox (1D), CSS Grid (2D), and Responsive Media Queries.",
            "Markdown: CSS Cheat Sheet 2 (Flexbox & Grid)"
        ),
        (
            "https://www.hostinger.com/tutorials/html-cheat-sheet",
            "Hostinger HTML Cheat Sheet Guide",
            "Developer Reference & Cheat Sheets",
            "💻 Coding & Developer Platforms",
            "Free",
            "Official modern visual cheat sheet and syntax reference for HTML developers.",
            "Web Guide: Hostinger"
        ),
        (
            "https://developer.mozilla.org/en-US/docs/Web/HTML",
            "MDN Web Docs - HTML Reference",
            "Developer Reference & Cheat Sheets",
            "💻 Coding & Developer Platforms",
            "Free",
            "World standard documentation for HTML elements, attributes, APIs, and modern browser compatibility.",
            "Web Guide: MDN Web Docs"
        )
    ]
    for url, name, wtype, cat, prc, dsc, src in html_cheat_sheets:
        add_entry(url, name, wtype, cat, prc, dsc, src, priority=10)

    print(">>> 10. Processing 🚀 350+ HTML CSS & JavaScript Projects...")
    pdf_350_path = os.path.join(DOWNLOADS_DIR, "350 Html Css & Javascript Project.pdf")
    if not os.path.exists(pdf_350_path):
        pdf_350_path = os.path.join(r"D:\Antigravity - Agent\💾 Offline PDF Archive\📄 HTML & CSS Cheat Sheets", "350 Html Css & Javascript Project.pdf")
        
    # Master Projects Directory entry (Pure Markdown Link)
    master_proj_url = "https://github.com/Satyenderparihar/Websites-Scrapes-Manually/blob/main/%F0%9F%93%9D%20350_HTML_CSS_JavaScript_Projects.md"
    add_entry(
        master_proj_url,
        "350+ HTML CSS and JavaScript Projects Master Directory (Categorized Collection)",
        "Web Dev Project Implementation",
        "💻 Coding & Developer Platforms",
        "Free",
        "Comprehensive master index containing 306+ categorized frontend projects across games, clones, dashboards, landing pages, and web apps with 100% working links.",
        "Markdown: 350 HTML Projects Master List",
        priority=10
    )

    if os.path.exists(pdf_350_path):
        try:
            import pypdf
            reader = pypdf.PdfReader(pdf_350_path)
            seen_pdf_urls = set()
            for pno, page in enumerate(reader.pages):
                annots = page.get('/Annots', [])
                if not annots:
                    continue
                for a in annots:
                    obj = a.get_object()
                    if '/A' in obj and '/URI' in obj['/A']:
                        uri = obj['/A']['/URI'].strip()
                        clean_u = clean_url(uri)
                        if clean_u and clean_u not in seen_pdf_urls and "chatgpt.com" not in clean_u:
                            seen_pdf_urls.add(clean_u)
                            parsed = urllib.parse.urlparse(clean_u)
                            slug = [p for p in parsed.path.split('/') if p]
                            slug_name = slug[-1].replace('-', ' ').replace('_', ' ').title() if slug else "Web Project"
                            slug_name = re.sub(r'\bHtml\b', 'HTML', slug_name)
                            slug_name = re.sub(r'\bCss\b', 'CSS', slug_name)
                            slug_name = re.sub(r'\bJs\b', 'JavaScript', slug_name)
                            slug_name = re.sub(r'\bJavascript\b', 'JavaScript', slug_name)
                            
                            desc = f"Complete source code & step-by-step tutorial: {slug_name} (HTML/CSS/JS Project)"
                            add_entry(
                                clean_u,
                                slug_name,
                                "Web Dev Project Implementation",
                                "💻 Coding & Developer Platforms",
                                "Free",
                                desc,
                                f"PDF: 350 Html Css & Javascript Project.pdf (Page {pno+1})",
                                priority=9
                            )
            print(f"    -> Extracted and added {len(seen_pdf_urls)} projects from 350+ Projects PDF.")
        except Exception as e:
            print(f"    -> Error parsing 350 Projects PDF: {e}")

    print(">>> 11. Processing 🔖 93. Bookmark Hub & Windows Desktop Utilities...")
    # Copy 93. Bookmark Hub.html and batch tools to Web Utilities
    hub_src = os.path.join(DOWNLOADS_DIR, "93. Bookmark Hub.html")
    web_util_dir = os.path.join(BASE_DIR, "📁 🛠️ Web Utilities & Productivity")
    os.makedirs(web_util_dir, exist_ok=True)
    hub_dest = os.path.join(web_util_dir, "🔖 93_Bookmark_Hub_Interactive_App.html")
    if os.path.exists(hub_src) and not os.path.exists(hub_dest):
        import shutil
        shutil.copy2(hub_src, hub_dest)

    # Copy Desktop Batch Utilities to Web Utilities for Git Tracking
    batch_tools_src = r"D:\Antigravity - Agent\⚡ Desktop Management Tools"
    if os.path.exists(batch_tools_src):
        import shutil
        for bname in ["⚡ Desktop Organised.bat", "⚡ Desktop UN-Organised.bat", "⚡ Delete Empty Folders.bat"]:
            bsrc = os.path.join(batch_tools_src, bname)
            bdest = os.path.join(web_util_dir, bname)
            if os.path.exists(bsrc) and not os.path.exists(bdest):
                shutil.copy2(bsrc, bdest)

    # Ingest 93. Bookmark Hub Interactive App Link
    hub_repo_url = "https://github.com/Satyenderparihar/Websites-Scrapes-Manually/blob/main/%F0%9F%93%81%20%F0%9F%9B%A0%EF%B8%8F%20Web%20Utilities%20%26%20Productivity/%F0%9F%94%96%2093_Bookmark_Hub_Interactive_App.html"
    add_entry(
        hub_repo_url,
        "Premium Bookmark Hub (Interactive Web App)",
        "Web Utility & Productivity Tool",
        "🛠️ Web Utilities & Productivity",
        "Free",
        "Standalone interactive bookmark dashboard featuring 329 categorized web utilities, search filtering, and 1-click launch.",
        "Interactive App: 93. Bookmark Hub.html",
        priority=10
    )

    # Desktop Management Automation Tools
    desktop_tools = [
        (
            "https://github.com/Satyenderparihar/Websites-Scrapes-Manually/blob/main/%F0%9F%93%81%20%F0%9F%9B%A0%EF%B8%8F%20Web%20Utilities%20%26%20Productivity/%E2%9A%A1%20Desktop%20Organised.bat",
            "⚡ Windows Desktop Organiser (Batch Automation)",
            "Desktop Organization Utility",
            "🛠️ Web Utilities & Productivity",
            "Free",
            "1-click Windows batch tool to categorize loose desktop files into Images, Documents, Videos, Music, Archives, and Programs while protecting shortcuts.",
            "Batch Utility: Desktop Organised.bat"
        ),
        (
            "https://github.com/Satyenderparihar/Websites-Scrapes-Manually/blob/main/%F0%9F%93%81%20%F0%9F%9B%A0%EF%B8%8F%20Web%20Utilities%20%26%20Productivity/%E2%9A%A1%20Desktop%20UN-Organised.bat",
            "⚡ Windows Desktop UN-Organiser (Batch Restoration)",
            "Desktop Organization Utility",
            "🛠️ Web Utilities & Productivity",
            "Free",
            "1-click Windows batch tool to restore all categorized files back to Desktop root and safely delete empty folders.",
            "Batch Utility: Desktop UN-Organised.bat"
        ),
        (
            "https://github.com/Satyenderparihar/Websites-Scrapes-Manually/blob/main/%F0%9F%93%81%20%F0%9F%9B%A0%EF%B8%8F%20Web%20Utilities%20%26%20Productivity/%E2%9A%A1%20Delete%20Empty%20Folders.bat",
            "⚡ Windows Delete Empty Folders (Batch Cleaner)",
            "Desktop Maintenance Utility",
            "🛠️ Web Utilities & Productivity",
            "Free",
            "Safely scans and removes only zero-byte completely empty directory folders from the Windows Desktop.",
            "Batch Utility: Delete Empty Folders.bat"
        )
    ]
    for url, name, wtype, cat, prc, dsc, src in desktop_tools:
        add_entry(url, name, wtype, cat, prc, dsc, src, priority=9)

    # Parse all 329 items from 93. Bookmark Hub.html
    if os.path.exists(hub_src) or os.path.exists(hub_dest):
        actual_hub = hub_src if os.path.exists(hub_src) else hub_dest
        try:
            with open(actual_hub, "r", encoding="utf-8", errors="ignore") as f:
                h_text = f.read()
            bm_match = re.search(r'const\s+linksData\s*=\s*(\[[\s\S]*?\]);', h_text)
            if bm_match:
                bm_list = json.loads(bm_match.group(1))
                bm_added = 0
                for item in bm_list:
                    u = (item.get("url") or "").strip()
                    if not u or "chatgpt.com" in u or not (u.startswith("http://") or u.startswith("https://")):
                        continue
                    title = (item.get("title") or "").strip()
                    desc = (item.get("description") or "").strip()
                    pricing = (item.get("pricing") or "Free").strip()
                    raw_cat = (item.get("category") or "").strip().lower()

                    t_lower = f"{title} {desc} {u} {raw_cat}".lower()

                    if raw_cat == "video downloader" or any(k in t_lower for k in ['downloader', 'savefrom', 'snaptik', 'y2mate', 'ssyoutube', 'fdownloader', 'instasave']):
                        cat, wtype = "⬇️ Video & Media Downloaders", "Video & Media Downloader"
                    elif raw_cat == "pdf" or any(k in t_lower for k in ['chatpdf', 'askyourpdf', 'pdf', 'ilovepdf', 'sejda', 'doc', 'signature', 'dkb']):
                        cat, wtype = "📄 PDF & Document Utilities", "PDF & Document Utility"
                    elif raw_cat == "ai tools" or any(k in t_lower for k in ['chatgpt', 'claude', 'copilot', 'openai', 'midjourney', 'cleanup.pictures', 'ai writer', 'gemini', 'perplexity', 'huggingface', 'answeraipro', 'dadiai']):
                        cat, wtype = "🤖 AI & Machine Learning Tools", "Generative AI Tool"
                    elif any(k in t_lower for k in ['acapella', 'vocal', 'music', 'spotify', 'soundcloud', 'audio', 'song']):
                        cat, wtype = "🎵 Music & Audio Streaming", "Audio & Music Tool"
                    elif any(k in t_lower for k in ['retrotvs', 'tv', 'webcam', 'radio.garden', 'radio']):
                        cat, wtype = "📺 Global TV & Media Discovery", "Media & Broadcast Tool"
                    elif raw_cat in ["gaming", "entertainment"] or any(k in t_lower for k in ['game', 'party game', 'airconsole', 'play', 'arcade']):
                        cat, wtype = "🎮 Gaming & Entertainment", "Browser Game & Entertainment"
                    elif raw_cat in ["design", "creator tools"] or any(k in t_lower for k in ['3dtuning', 'animejs', 'canva', 'figma', 'font', 'icon', 'palette', 'color', 'svg']):
                        cat, wtype = "🎨 Design & Creator Tools", "Design & Creator Asset"
                    elif raw_cat in ["students", "education"] or any(k in t_lower for k in ['course', 'certificate', 'digital defyne', 'learning', 'tutorial', 'academy', 'flashcard', 'mcq']):
                        cat, wtype = "🎓 Free Courses & Learning Platforms", "Educational Learning Platform"
                    elif raw_cat in ["coding", "developer"] or any(k in t_lower for k in ['github', 'leetcode', 'ide', 'code', 'compiler', 'programming', 'cheat sheet', 'developer tool']):
                        cat, wtype = "💻 Coding & Developer Platforms", "Coding & Developer Platform"
                    elif raw_cat in ["utility", "utilities", "productivity"] or any(k in t_lower for k in ['calculator', 'cvmaker', 'converter', 'archive', 'tools', 'repair']):
                        cat, wtype = "🛠️ Web Utilities & Productivity", "Web Utility & Productivity Tool"
                    else:
                        cat, wtype = "🌐 General Curated Tools", "Curated Online Platform"

                    c_url = clean_url(u)
                    if c_url:
                        add_entry(c_url, title, wtype, cat, pricing, desc if len(desc) > 5 else f"Curated resource: {title} ({wtype})", "Bookmark Hub: 93. Bookmark Hub.html", priority=7)
                        bm_added += 1
                print(f"    -> Processed {bm_added} bookmarks from 93. Bookmark Hub.html")
        except Exception as e:
            print(f"    -> Error processing Bookmark Hub: {e}")

    print(">>> 12. Processing 🌊 Google Flow & Creative AI Prompts...")
    google_flow_entries = [
        (
            "https://github.com/Satyenderparihar/Websites-Scrapes-Manually/blob/main/%F0%9F%93%81%20%F0%9F%8C%8A%20Google%20Flow/README.md",
            "Google Flow AI Video & Creative Prompt Studio Hub",
            "Generative AI Tool",
            "🤖 AI & Machine Learning Tools",
            "Free",
            "Master creative hub containing 9 AI prompt libraries, Google Omni Flash logo animation guides, 3D billboards, VFX, and influencer schemas.",
            "Hub: Google Flow Studio"
        ),
        (
            "https://github.com/Satyenderparihar/Websites-Scrapes-Manually/blob/main/%F0%9F%93%81%20%F0%9F%8C%8A%20Google%20Flow/%F0%9F%93%81%20%F0%9F%8E%AC%20Logo%20Animations/%F0%9F%93%9D%20Logo_Animation_Guide_Google_Omni_Flash.md",
            "Google Omni Flash — Logo Animation Guide (11 Ready Prompts)",
            "Generative AI Tool",
            "🤖 AI & Machine Learning Tools",
            "Free",
            "Step-by-step workflow for animating static logos using Google Flow, Google Omni Flash, and Nano Banana with 11 production-ready prompt formulas.",
            "Markdown: Logo Animation Guide"
        ),
        (
            "https://github.com/Satyenderparihar/Websites-Scrapes-Manually/blob/main/%F0%9F%93%81%20%F0%9F%8C%8A%20Google%20Flow/%F0%9F%93%81%20%E2%9C%A8%20Indian%20AI%20Influencers%20Library/%F0%9F%93%9D%20100_Unique_Indian_AI_Influencer_Prompts.md",
            "100 Unique Indian AI Influencer Image-Gen Prompts",
            "Generative AI Tool",
            "🤖 AI & Machine Learning Tools",
            "Free",
            "100 distinct persona schemas with quick specs, camera angles, lighting, and ready-to-copy prompts for Midjourney, SDXL, Flux, and Reve.",
            "Markdown: 100 Indian AI Influencers"
        ),
        (
            "https://github.com/Satyenderparihar/Websites-Scrapes-Manually/blob/main/%F0%9F%93%81%20%F0%9F%8C%8A%20Google%20Flow/%F0%9F%93%81%20%F0%9F%9A%80%20Product%20VFX%20%26%20Video%20Commercials/%F0%9F%93%9D%2020_VFX_Product_Video_Prompts.md",
            "20 Viral VFX & Product Video Prompts (Image + Video)",
            "Design & Creator Asset",
            "🎨 Design & Creator Tools",
            "Free",
            "20 viral commercial VFX concepts including Giant Rooftop Models, liquid splashes, and luxury product reveals with exact image and image-to-video prompts.",
            "Markdown: 20 VFX Product Prompts"
        ),
        (
            "https://github.com/Satyenderparihar/Websites-Scrapes-Manually/blob/main/%F0%9F%93%81%20%F0%9F%8C%8A%20Google%20Flow/%F0%9F%93%81%20%F0%9F%9A%80%20Product%20VFX%20%26%20Video%20Commercials/%F0%9F%93%9D%2055_One_Word_ADS_Codes_Shortcuts.md",
            "55 One-Word ADS Codes Shortcuts for AI Ad Visuals",
            "Design & Creator Asset",
            "🎨 Design & Creator Tools",
            "Free",
            "55 prompt presets (/packshot, /hero, /float, /cheesepull, /POV, /unbox, /luxe) for ultra-fast creative direction in Midjourney, Kling, and Veo.",
            "Markdown: 55 ADS Codes"
        ),
        (
            "https://github.com/Satyenderparihar/Websites-Scrapes-Manually/blob/main/%F0%9F%93%81%20%F0%9F%8C%8A%20Google%20Flow/%F0%9F%93%81%20%F0%9F%91%A4%20AI%20Avatars%20%26%20Character%20Sheets/%F0%9F%93%9D%20Character_Sheet_Master_Prompt_360.md",
            "360° Character Consistency Reference Sheet Prompt",
            "Generative AI Tool",
            "🤖 AI & Machine Learning Tools",
            "Free",
            "Production-ready master prompt locking face, hairstyle, lighting, and physique across 360-degree angles for AI animation and video storytelling.",
            "Markdown: 360 Character Sheet"
        ),
        (
            "https://github.com/Satyenderparihar/Websites-Scrapes-Manually/blob/main/%F0%9F%93%81%20%F0%9F%8C%8A%20Google%20Flow/%F0%9F%93%81%20%F0%9F%8F%99%EF%B8%8F%203D%20Billboards%20%26%20Anamorphic%20Ads/%F0%9F%93%9D%20Spiderman_and_3D_Billboard_Video_Prompts.md",
            "Spiderman & Anamorphic 3D Billboard Cinematic Video Guide",
            "Generative AI Tool",
            "🤖 AI & Machine Learning Tools",
            "Free",
            "Viral 3D billboard reveal videos and anamorphic illusion prompts with day/night lighting, screen extrusion, and product VFX physics.",
            "Markdown: 3D Billboard Video Guide"
        ),
        (
            "https://github.com/Satyenderparihar/Websites-Scrapes-Manually/blob/main/%F0%9F%93%81%20%F0%9F%8C%8A%20Google%20Flow/%F0%9F%93%81%20%F0%9F%8F%99%EF%B8%8F%203D%20Billboards%20%26%20Anamorphic%20Ads/%F0%9F%93%9D%20Universal_Master_Prompt_3D_Billboard.md",
            "Universal Master Prompt — Anamorphic 3D Billboard Ads",
            "Generative AI Tool",
            "🤖 AI & Machine Learning Tools",
            "Free",
            "ZeroG Mobile Companion 3D Billboard master prompting formula for creating realistic corner LED display commercials.",
            "Markdown: Universal 3D Billboard"
        ),
        (
            "https://github.com/Satyenderparihar/Websites-Scrapes-Manually/blob/main/%F0%9F%93%81%20%F0%9F%8C%8A%20Google%20Flow/%F0%9F%93%81%20%F0%9F%93%9A%20AI%20Prompts%20Directory%20%26%20Shortcuts/%F0%9F%93%9D%20AI_Image_and_Text_Prompts_Quick_Guide.md",
            "AI Image & Text Prompts Directory (525+ Shortcut Commands)",
            "Generative AI Tool",
            "🤖 AI & Machine Learning Tools",
            "Free",
            "Categorized directory of 525+ prompt shortcuts across analysis, design, copywriting, coding, and brainstorming with easy Hindi meanings.",
            "Markdown: AI Prompts Directory"
        )
    ]
    for url, name, wtype, cat, prc, dsc, src in google_flow_entries:
        add_entry(url, name, wtype, cat, prc, dsc, src, priority=10)

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

        # Specific Handling for Courses Category (Categorized Subsections)
        if "Courses" in cat_name:
            courses_by_subcat = {sub: [] for sub in COURSE_SUBCATEGORIES.keys()}
            for item in cat_items:
                sub = map_course_to_subcat(item.get("website_type", ""), item.get("name", ""))
                courses_by_subcat[sub].append(item)

            md_lines.extend([
                "## 📑 Sub-Categories Breakdown",
                ""
            ])
            for sub, sub_items in courses_by_subcat.items():
                if sub_items:
                    md_lines.append(f"- **{sub}**: `{len(sub_items)} Courses / Platforms`")
            md_lines.append("\n---\n")

            for sub, sub_items in courses_by_subcat.items():
                if not sub_items:
                    continue
                sub_items.sort(key=lambda x: x.get("name", "").lower())
                md_lines.extend([
                    f"### {sub} (`{len(sub_items)} Courses`)",
                    "",
                    "| # | Course / Platform Name | Website Type | Official Link | Pricing | Description |",
                    "| :-: | :--- | :--- | :--- | :-: | :--- |"
                ])
                for idx, item in enumerate(sub_items, 1):
                    name = (item.get("name") or item.get("key")).replace('|', '-')
                    wtype = (item.get("website_type") or "Course").replace('|', '-')
                    url = item.get("url")
                    pricing = item.get("pricing", "Free")
                    desc = (item.get("description") or f"Comprehensive training in {name}").replace('|', '-')
                    md_lines.append(f"| **{idx}** | **{name}** | `{wtype}` | [Enroll / Visit]({url}) | `{pricing}` | {desc} |")
                md_lines.append("\n---\n")

        # Specific Handling for Coding Category (Categorized Subsections)
        elif "Coding" in cat_name:
            coding_by_subcat = {sub: [] for sub in CODING_SUBCATEGORIES.keys()}
            for item in cat_items:
                sub = map_coding_to_subcat(item.get("website_type", ""), item.get("name", ""), item.get("url", ""))
                coding_by_subcat[sub].append(item)

            md_lines.extend([
                "## 📑 Sub-Categories Breakdown",
                ""
            ])
            for sub, sub_items in coding_by_subcat.items():
                if sub_items:
                    md_lines.append(f"- **{sub}**: `{len(sub_items)} Platforms / Projects`")
            md_lines.append("\n---\n")

            for sub, sub_items in coding_by_subcat.items():
                if not sub_items:
                    continue
                sub_items.sort(key=lambda x: x.get("name", "").lower())
                md_lines.extend([
                    f"### {sub} (`{len(sub_items)} Resources`)",
                    ""
                ])
                if "HTML" in sub:
                    md_lines.extend([
                        "> 🚀 **Special Dedicated Collection**: For quick access, browse the [📖 350+ HTML, CSS & JavaScript Projects Categorized Master List](📄%20HTML%20Cheat%20Sheets/📝%20350_HTML_CSS_JavaScript_Projects_Master_List.md) with 306+ projects organized across Games, Web Apps, UI Components, and Clones!",
                        "> 📄 **HTML PDF Cheat Sheets**: Access all offline cheat sheets in [📁 📄 HTML Cheat Sheets](📄%20HTML%20Cheat%20Sheets/).",
                        ""
                    ])
                md_lines.extend([
                    "| # | Name / Project Title | Website Type | Official Link | Pricing | Description |",
                    "| :-: | :--- | :--- | :--- | :-: | :--- |"
                ])
                for idx, item in enumerate(sub_items, 1):
                    name = (item.get("name") or item.get("key")).replace('|', '-')
                    wtype = (item.get("website_type") or "Developer Platform").replace('|', '-')
                    url = item.get("url")
                    pricing = item.get("pricing", "Free")
                    desc = (item.get("description") or f"Platform resource for {name}").replace('|', '-')
                    link_label = "View / Download PDF" if ("pdf" in wtype.lower() or url.endswith(".pdf")) else "Visit / View Guide"
                    md_lines.append(f"| **{idx}** | **{name}** | `{wtype}` | [{link_label}]({url}) | `{pricing}` | {desc} |")
                md_lines.append("\n---\n")

        else:
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
        "- 🚀 **[Explore 350+ HTML, CSS & JavaScript Projects (Clickable Directory)](📝%20350_HTML_CSS_JavaScript_Projects.md)**",
        "- 📄 **[HTML Cheat Sheets Hub (All 5 Guides)](📁%20💻%20Coding%20&%20Developer%20Platforms/📄%20HTML%20Cheat%20Sheets/)**",
        "  - 📄 [HTML Cheat Sheet 1: Hostinger Complete Reference](📁%20💻%20Coding%20&%20Developer%20Platforms/📄%20HTML%20Cheat%20Sheets/📝%20HTML_Cheat_Sheet_1_Hostinger_Complete_Reference.md)",
        "  - 📄 [HTML Cheat Sheet 2: Stony Brook University Web Architecture Guide](📁%20💻%20Coding%20&%20Developer%20Platforms/📄%20HTML%20Cheat%20Sheets/📝%20HTML_Cheat_Sheet_2_University_Web_Architecture_Guide.md)",
        "  - 📄 [HTML Cheat Sheet 3: Core Attributes & Event Handlers](📁%20💻%20Coding%20&%20Developer%20Platforms/📄%20HTML%20Cheat%20Sheets/📝%20HTML_Cheat_Sheet_3_Core_Attributes_and_Quick_Reference.md)",
        "  - 📄 [HTML Cheat Sheet 4: Essential Tags & Visual Syntax](📁%20💻%20Coding%20&%20Developer%20Platforms/📄%20HTML%20Cheat%20Sheets/📝%20HTML_Cheat_Sheet_4_Essential_Tags_and_Syntax.md)",
        "  - 📄 [HTML Cheat Sheet 5: Comprehensive HTML5 Elements (A-Z)](📁%20💻%20Coding%20&%20Developer%20Platforms/📄%20HTML%20Cheat%20Sheets/📝%20HTML_Cheat_Sheet_5_HTML5_Comprehensive_Elements.md)",
        "- 🎨 **[CSS Cheat Sheets Hub (Both Guides)](📁%20💻%20Coding%20&%20Developer%20Platforms/📄%20CSS%20Cheat%20Sheets/)**",
        "  - 🎨 [CSS Cheat Sheet 1: The Mega Properties & Syntax Guide](📁%20💻%20Coding%20&%20Developer%20Platforms/📄%20CSS%20Cheat%20Sheets/📝%20CSS_Cheat_Sheet_1_The_Mega_Properties_Guide.md)",
        "  - 🎨 [CSS Cheat Sheet 2: Modern Selectors, Flexbox, Grid & Animations](📁%20💻%20Coding%20&%20Developer%20Platforms/📄%20CSS%20Cheat%20Sheets/📝%20CSS_Cheat_Sheet_2_Modern_Selectors_Animations_Guide.md)",
        "- 🌊 **[Google Flow — AI Video & Creative Prompt Studio Hub](📁%20🌊%20Google%20Flow/)**",
        "  - 🎬 **[Logo Animations](📁%20🌊%20Google%20Flow/📁%20🎬%20Logo%20Animations/)**: [Google Omni Flash Guide (11 Prompts)](📁%20🌊%20Google%20Flow/📁%20🎬%20Logo%20Animations/📝%20Logo_Animation_Guide_Google_Omni_Flash.md)",
        "  - 👤 **[AI Avatars & Character Sheets](📁%20🌊%20Google%20Flow/📁%20👤%20AI%20Avatars%20&%20Character%20Sheets/)**: [360° Character Consistency](📁%20🌊%20Google%20Flow/📁%20👤%20AI%20Avatars%20&%20Character%20Sheets/📝%20Character_Sheet_Master_Prompt_360.md) & [Studio Avatar](📁%20🌊%20Google%20Flow/📁%20👤%20AI%20Avatars%20&%20Character%20Sheets/📝%20AI_Avatar_Studio_Setup_and_Prompts.md)",
        "  - 🏙️ **[3D Billboards & Anamorphic Ads](📁%20🌊%20Google%20Flow/📁%20🏙️%203D%20Billboards%20&%20Anamorphic%20Ads/)**: [Spiderman Billboard](📁%20🌊%20Google%20Flow/📁%20🏙️%203D%20Billboards%20&%20Anamorphic%20Ads/📝%20Spiderman_and_3D_Billboard_Video_Prompts.md) & [Universal 3D Formula](📁%20🌊%20Google%20Flow/📁%20🏙️%203D%20Billboards%20&%20Anamorphic%20Ads/📝%20Universal_Master_Prompt_3D_Billboard.md)",
        "  - 🚀 **[Product VFX & Video Commercials](📁%20🌊%20Google%20Flow/📁%20🚀%20Product%20VFX%20&%20Video%20Commercials/)**: [20 VFX Prompts](📁%20🌊%20Google%20Flow/📁%20🚀%20Product%20VFX%20&%20Video%20Commercials/📝%2020_VFX_Product_Video_Prompts.md) & [55 ADS Codes](📁%20🌊%20Google%20Flow/📁%20🚀%20Product%20VFX%20&%20Video%20Commercials/📝%2055_One_Word_ADS_Codes_Shortcuts.md)",
        "  - ✨ **[Indian AI Influencers Library](📁%20🌊%20Google%20Flow/📁%20✨%20Indian%20AI%20Influencers%20Library/)**: [100 Unique Indian Influencers](📁%20🌊%20Google%20Flow/📁%20✨%20Indian%20AI%20Influencers%20Library/📝%20100_Unique_Indian_AI_Influencer_Prompts.md)",
        "  - 📚 **[AI Prompts Directory & Shortcuts](📁%20🌊%20Google%20Flow/📁%20📚%20AI%20Prompts%20Directory%20&%20Shortcuts/)**: [525+ Shortcut Commands](📁%20🌊%20Google%20Flow/📁%20📚%20AI%20Prompts%20Directory%20&%20Shortcuts/📝%20AI_Image_and_Text_Prompts_Quick_Guide.md)",
        "- 🔖 **[Premium Bookmark Hub (Interactive Web App)](📁%20🛠️%20Web%20Utilities%20&%20Productivity/🔖%2093_Bookmark_Hub_Interactive_App.html)**",
        "- ⚡ **[Windows Desktop Management & Cleaning Tools](📁%20🛠️%20Web%20Utilities%20&%20Productivity/)**",
        "- 📊 **[Download Formatted Master Excel Workbook](📊%20Websites_Master_List.xlsx)**",
        "- 💾 **[Raw Structured Database (JSON)](💾%20websites_database.json)**",
        "",
        "> ⚡ **Zero-Storage Markdown Architecture**: All reference cheat sheets (5 HTML + 2 CSS) and 306+ web projects are formatted in lightweight, native Markdown instead of heavy PDF binary files. This eliminates GitHub repository bloat and enables 100% interactive, 1-click clickable links on both mobile and desktop browsers without sandbox restrictions.",
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
        "   - Preserves and categorizes the exact **`Website Type`** (e.g. Facebook Video Downloader, Music Streaming, AI Course, Coding Platform),",
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
        
        # If Courses or Coding sheet, add Sub-Category column!
        if "Courses" in cat_name or "Coding" in cat_name:
            cat_headers = ["#", "Name / Project Title", "Track / Sub-Category", "Website Type", "Official URL", "Pricing", "Description"]
            ws_cat.append(cat_headers)
            for col_idx in range(1, len(cat_headers) + 1):
                cell = ws_cat.cell(1, col_idx)
                cell.fill = header_fill
                cell.font = header_font
                cell.alignment = center_align

            if "Courses" in cat_name:
                sub_order = list(COURSE_SUBCATEGORIES.keys())
                sorted_items = sorted(items, key=lambda x: (
                    sub_order.index(map_course_to_subcat(x.get("website_type", ""), x.get("name", ""))) if map_course_to_subcat(x.get("website_type", ""), x.get("name", "")) in sub_order else 999,
                    (x.get("name") or "").lower()
                ))
            else:
                sub_order = list(CODING_SUBCATEGORIES.keys())
                sorted_items = sorted(items, key=lambda x: (
                    sub_order.index(map_coding_to_subcat(x.get("website_type", ""), x.get("name", ""), x.get("url", ""))) if map_coding_to_subcat(x.get("website_type", ""), x.get("name", ""), x.get("url", "")) in sub_order else 999,
                    (x.get("name") or "").lower()
                ))
                
            for i, item in enumerate(sorted_items, 1):
                r = i + 1
                if "Courses" in cat_name:
                    subcat = map_course_to_subcat(item.get("website_type", ""), item.get("name", ""))
                else:
                    subcat = map_coding_to_subcat(item.get("website_type", ""), item.get("name", ""), item.get("url", ""))
                ws_cat.append([
                    i,
                    item.get("name") or item.get("key"),
                    subcat,
                    item.get("website_type") or "Curated Platform",
                    item.get("url"),
                    item.get("pricing", "Free"),
                    item.get("description", "")
                ])
                ws_cat.cell(r, 1).alignment = center_align
                ws_cat.cell(r, 1).font = data_font
                ws_cat.cell(r, 2).font = Font(name="Segoe UI", size=10, bold=True)
                ws_cat.cell(r, 3).font = data_font
                ws_cat.cell(r, 4).font = data_font
                u_cell = ws_cat.cell(r, 5)
                u_cell.font = link_font
                u_cell.hyperlink = item.get("url")
                ws_cat.cell(r, 6).alignment = center_align
                ws_cat.cell(r, 6).font = data_font
                ws_cat.cell(r, 7).font = data_font
                for c in range(1, 8):
                    ws_cat.cell(r, c).border = border_thin
        else:
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
    print("Starting deep re-ingestion with Coding Platforms & Sub-Categorized Tracks...")
    db = build_database()
    export_all(db)

    print("\nGit commit and push...")
    subprocess.run(["git", "add", "."], cwd=BASE_DIR, check=True)
    subprocess.run(["git", "commit", "-m", f"feat: add All In One Programming Resources (total {len(db)} curated websites across 12 categories)"], cwd=BASE_DIR, check=True)
    subprocess.run(["git", "pull", "--rebase", "origin", "main"], cwd=BASE_DIR, check=False)
    subprocess.run(["git", "push", "origin", "main"], cwd=BASE_DIR, check=True)
    print("\n🚀 All updates pushed to GitHub successfully!")

if __name__ == "__main__":
    main()
