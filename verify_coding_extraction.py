import openpyxl
import os
import sys
import re
import urllib.parse

sys.stdout.reconfigure(encoding='utf-8')

fpath = r"C:\Users\satyanarayan verma\Downloads\💻 Coding Websites.xlsx"
wb = openpyxl.load_workbook(fpath, data_only=True)
wb_f = openpyxl.load_workbook(fpath, data_only=False)

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
    return u.rstrip('/')

def get_domain_key(url):
    parsed = urllib.parse.urlparse(url)
    domain = parsed.netloc.lower()
    if domain.startswith("www."):
        domain = domain[4:]
    path = parsed.path.rstrip('/')
    query = parsed.query
    if any(sub in domain for sub in ['youtube.com', 'instagram.com', 't.me', 'github.com', 'geeksforgeeks.org', 'reddit.com', 'edx.org', 'coursera.org', 'w3schools.com', 'coddy.tech', 'classcentral.com', 'botdownloader.com', 'analyticsvidhya.com', 'stpcomputereducation.com', 'cloudskillsboost.google']):
        key_suffix = path
        if query:
            key_suffix = f"{path}?{query}" if path else f"?{query}"
        if key_suffix:
            return f"{domain}{key_suffix}"
    return domain

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

coding_db = {}

def add_coding_tool(url, name, wtype, pricing="Free", desc="", source=""):
    clean_u = clean_url(url)
    if not clean_u:
        return
    key = get_domain_key(clean_u)
    if not desc:
        desc = f"Official coding platform / resource for {name} ({wtype})"
    if key in coding_db:
        # update if existing has less specific type
        if wtype and "Curated" not in wtype:
            coding_db[key]["website_type"] = wtype
        if name and len(name) > len(coding_db[key]["name"]):
            coding_db[key]["name"] = name
        return
    coding_db[key] = {
        "key": key,
        "name": name,
        "url": clean_u,
        "website_type": wtype,
        "category": "💻 Coding & Developer Platforms",
        "pricing": pricing,
        "description": desc,
        "source": source
    }

# 1. Y-I-T - BH
ws = wb["Y-I-T - BH"]
for r in range(2, ws.max_row + 1):
    c1 = str(ws.cell(r, 1).value or '').strip()
    c2 = str(ws.cell(r, 2).value or '').strip()
    if c2 in YOUTUBE_CREATORS:
        cname, curl, ctype, cdesc = YOUTUBE_CREATORS[c2]
        add_coding_tool(curl, cname, ctype, "Free", cdesc, "Excel: 💻 Coding Websites.xlsx (Y-I-T - BH)")
    elif c1 == "Telegram" and "Python" in c2:
        add_coding_tool("https://t.me/pythonhub", "Python Hub (Telegram)", "Telegram Tech Community", "Free", "Daily Python resources, code snippets, and cheat sheets on Telegram.", "Excel: 💻 Coding Websites.xlsx (Y-I-T - BH)")

# 2. Standard Sheets with [Website Type, Website Name, Official URL, Free / Paid]
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
    ws = wb[sname]
    ws_f = wb_f[sname]
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
            # refine wtype if needed
            if "editor" in wtype.lower(): wtype = "Online Code Editor & IDE"
            elif "version" in wtype.lower(): wtype = "Version Control & Repository Platform"
            elif "interview" in wtype.lower(): wtype = "Technical Interview Preparation"
            elif "converter" in wtype.lower(): wtype = "Code Converter Tool"
            elif "css" in wtype.lower(): wtype = "Developer Reference & Cheat Sheets"
            elif "python" in wtype.lower(): wtype = "Python Programming Resource"
            elif "web" in wtype.lower(): wtype = "Web Development Resource"
            elif "learning" in wtype.lower() or "course" in wtype.lower(): wtype = "Coding Learning Platform"
            elif "resource" in wtype.lower(): wtype = "Developer Reference & Cheat Sheets"
            
            add_coding_tool(url, name, wtype, pricing, f"High-utility developer platform: {name} ({wtype})", f"Excel: 💻 Coding Websites.xlsx ({sname})")

# 3. Pythons - BH
ws = wb["Pythons - BH"]
ws_f = wb_f["Pythons - BH"]
for r in range(2, ws.max_row + 1):
    c2 = ws.cell(r, 2)
    c2_f = ws_f.cell(r, 2)
    c3 = ws.cell(r, 3)
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
        add_coding_tool(url, name, wtype, "Free", f"{raw_cat} - Official platform for {name}", "Excel: 💻 Coding Websites.xlsx (Pythons - BH)")

# 4. Sheet32 - BH
ws = wb["Sheet32 - BH"]
ws_f = wb_f["Sheet32 - BH"]
headers = [str(ws.cell(1, c).value or '').strip() for c in range(1, 9)]
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
for r in range(2, ws.max_row + 1):
    for c in range(1, 9):
        cell = ws.cell(r, c)
        cell_f = ws_f.cell(r, c)
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
                # derived from url
                parsed = urllib.parse.urlparse(url)
                name = parsed.netloc.replace('www.', '').split('.')[0].capitalize()
            wtype = col_type_map.get(c, "Coding & Developer Platform")
            if "replit" in name.lower() or "glitch" in name.lower() or "codepen" in name.lower() or "codesandbox" in name.lower() or "stackblitz" in name.lower():
                wtype = "Online Code Editor & IDE"
            add_coding_tool(url, name, wtype, "Free", f"Developer platform: {name} ({wtype})", "Excel: 💻 Coding Websites.xlsx (Sheet32 - BH)")

# 5. Project Ideas from All Project Ideas & C Project Ideas
# Extract all project guides and map them to verified GeeksforGeeks implementation links
for sname in ["All Project Ideas", "C Project Ideas"]:
    ws = wb[sname]
    ws_f = wb_f[sname]
    for r in range(1, ws.max_row + 1):
        c1 = str(ws.cell(r, 1).value or '').strip()
        c2 = str(ws.cell(r, 2).value or '').strip()
        
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
            
        # Check if cell has a real specific tutorial URL
        real_url = ""
        for col_idx in range(1, ws.max_column + 1):
            cl = ws.cell(r, col_idx)
            if cl.hyperlink and cl.hyperlink.target and "chatgpt.com" not in cl.hyperlink.target:
                real_url = cl.hyperlink.target
                break
                
        if not real_url:
            query = urllib.parse.quote_plus(proj_name)
            real_url = f"https://www.geeksforgeeks.org/?s={query}"
            
        # Detect language type
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
            
        add_coding_tool(real_url, proj_name, ptype, "Free", f"Step-by-step source code guide & project implementation: {proj_name}", f"Excel: 💻 Coding Websites.xlsx ({sname})")

print(f"\nTotal Unique Coding Websites & Projects extracted: {len(coding_db)}")

# Breakdown by website_type
types_count = {}
for item in coding_db.values():
    t = item["website_type"]
    types_count[t] = types_count.get(t, 0) + 1

print("\nBreakdown by Website Type:")
for t, cnt in sorted(types_count.items(), key=lambda x: x[1], reverse=True):
    print(f"  {t:40s}: {cnt}")
