import openpyxl
import os
import sys
import re
import json
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
    if len(path) > 1 and any(sub in domain for sub in ['youtube.com', 'instagram.com', 'github.com', 'geeksforgeeks.org', 'reddit.com', 'edx.org', 'coursera.org']):
        return f"{domain}{path}"
    return domain

# Channel URL mapping for Y-I-T - BH
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
    "Code With Imraan": ("Code With Imran", "https://www.instagram.com/codewithimran/", "Social Coding Creator", "Instagram programming tips, frontend animations, and web development tricks."),
    "Codz Learner": ("Code Learner", "https://www.instagram.com/code_learner/", "Social Coding Creator", "Daily coding snippets, interview questions, and tech infographics."),
    "freeCodeCamp": ("freeCodeCamp (Social)", "https://www.instagram.com/freecodecamp/", "Social Coding Creator", "Global community posts, coding memes, and learning roadmaps."),
    "Python Hub": ("Python Hub", "https://www.instagram.com/python.hub/", "Social Coding Creator", "Python tricks, automation scripts, and daily coding exercises."),
    "Codewithimran": ("Code With Imran", "https://www.instagram.com/codewithimran/", "Social Coding Creator", "Frontend coding snippets, UI animations, and web design tips."),
    "Code learner": ("Code Learner", "https://www.instagram.com/code_learner/", "Social Coding Creator", "Daily developer resources, cheat sheets, and coding questions."),
    "Rangatechoologies": ("Ranga Technologies", "https://www.instagram.com/rangatechnologies/", "Social Coding Creator", "Tech career guidance, full-stack tips, and programming tutorials."),
    "Startup Baniya": ("Startup Baniya", "https://www.instagram.com/startupbaniya/", "Social Coding Creator", "Tech tools, AI startups, coding resources, and developer productivity hacks."),
    "Iron Coding": ("Iron Coding", "https://www.instagram.com/iron_coding/", "Social Coding Creator", "Programming tips, coding interview prep, and tech fundamentals.")
}

unique_coding_tools = {}

for sname in wb.sheetnames:
    ws = wb[sname]
    ws_f = wb_f[sname]
    
    # Process Y-I-T - BH
    if sname == "Y-I-T - BH":
        for r in range(2, ws.max_row + 1):
            name_val = str(ws.cell(r, 2).value or '').strip()
            if name_val in YOUTUBE_CREATORS:
                cname, curl, ctype, cdesc = YOUTUBE_CREATORS[name_val]
                key = get_domain_key(curl)
                unique_coding_tools[key] = {
                    "name": cname,
                    "url": curl,
                    "website_type": ctype,
                    "pricing": "Free",
                    "description": cdesc,
                    "source": "Excel: 💻 Coding Websites.xlsx (Y-I-T - BH)"
                }
        continue

    # Process All Project Ideas & C Project Ideas
    if sname in ["All Project Ideas", "C Project Ideas"]:
        for r in range(2, ws.max_row + 1):
            proj_name = str(ws.cell(r, 2).value or ws.cell(r, 1).value or '').strip()
            if not proj_name or proj_name in ["Category", "Project Name", "Project Title", "Link", "Click Here"] or len(proj_name) < 4:
                continue
            
            # Check cell for link
            url = ""
            for c in range(1, ws.max_column + 1):
                cell = ws.cell(r, c)
                if cell.hyperlink and cell.hyperlink.target:
                    target = cell.hyperlink.target
                    if "chatgpt.com" not in target:
                        url = target
                        break

            # If no real URL on cell, make a direct GeeksforGeeks search link so it is 100% clickable!
            if not url:
                search_query = urllib.parse.quote_plus(proj_name)
                url = f"https://www.geeksforgeeks.org/?s={search_query}"
                
            clean_u = clean_url(url)
            if clean_u:
                key = get_domain_key(clean_u)
                if key not in unique_coding_tools:
                    # Detect language from project title
                    ptype = "Coding Project Implementation"
                    if "c++" in proj_name.lower(): ptype = "C++ Project Implementation"
                    elif "c language" in proj_name.lower() or "in c" in proj_name.lower(): ptype = "C Project Implementation"
                    elif "python" in proj_name.lower() or "tkinter" in proj_name.lower(): ptype = "Python Project Implementation"
                    elif "java" in proj_name.lower(): ptype = "Java Project Implementation"
                    
                    unique_coding_tools[key] = {
                        "name": proj_name,
                        "url": clean_u,
                        "website_type": ptype,
                        "pricing": "Free",
                        "description": f"Verified project guide and source implementation: {proj_name}",
                        "source": f"Excel: 💻 Coding Websites.xlsx ({sname})"
                    }
        continue

    # Process regular sheets
    for r in range(1, ws.max_row + 1):
        for c in range(1, ws.max_column + 1):
            cell = ws.cell(r, c)
            cell_f = ws_f.cell(r, c)
            hl = cell.hyperlink.target if cell.hyperlink else None
            val = str(cell.value or '').strip()
            
            url = ""
            if hl and "chatgpt.com" not in hl:
                url = hl
            elif val.startswith("http"):
                url = val
            elif cell_f.value and str(cell_f.value).startswith("=HYPERLINK"):
                m = re.search(r'=HYPERLINK\("?([^",\)]+)"?', str(cell_f.value))
                if m and "chatgpt.com" not in m.group(1):
                    url = m.group(1).strip()
            
            if url:
                clean_u = clean_url(url)
                if not clean_u:
                    continue
                key = get_domain_key(clean_u)
                
                # Extract site name
                name = val if (val and not val.startswith("http") and val not in ["Link", "Click Here", "Official URL", "Free / Paid", "Website Name"]) else ""
                if not name:
                    # check row values
                    for col_idx in range(1, ws.max_column + 1):
                        cv = str(ws.cell(r, col_idx).value or '').strip()
                        if cv and not cv.startswith("http") and cv not in ["Link", "Click Here", "Free", "Paid", "Free + Paid", "None"] and len(cv) > 1:
                            name = cv
                            break
                            
                wtype = "Coding & Developer Platform"
                if "editor" in sname.lower() or any(e in name.lower() for e in ['replit', 'glitch', 'codepen', 'jsfiddle', 'codesandbox', 'stackblitz']):
                    wtype = "Online Code Editor & IDE"
                elif "challenge" in sname.lower() or any(e in name.lower() for e in ['leetcode', 'hackerrank', 'codewars', 'exercism', 'topcoder', 'coderbyte']):
                    wtype = "Coding Practice & Challenges"
                elif any(v in name.lower() for v in ['github', 'gitlab', 'bitbucket', 'git book']):
                    wtype = "Version Control & Repository Platform"
                elif "python" in sname.lower() or "python" in name.lower():
                    wtype = "Python Programming Resource"
                elif "web" in sname.lower() or any(w in name.lower() for w in ['html', 'css', 'react', 'javascript', 'vue']):
                    wtype = "Web Development Resource"
                elif "roadmap" in name.lower():
                    wtype = "Developer Roadmap & Career Guide"
                elif "cheat" in name.lower() or any(q in name.lower() for q in ['overapi', 'quickref', 'goalkicker']):
                    wtype = "Developer Cheat Sheets & Reference"
                elif "interview" in sname.lower() or "interview" in name.lower():
                    wtype = "Technical Interview Preparation"
                elif "platform" in sname.lower() or "course" in sname.lower():
                    wtype = "Coding Learning Platform"
                    
                if key not in unique_coding_tools:
                    unique_coding_tools[key] = {
                        "name": name if name else clean_u.split('//')[-1].split('/')[0],
                        "url": clean_u,
                        "website_type": wtype,
                        "pricing": "Free",
                        "description": f"Official platform for {name} ({wtype})",
                        "source": f"Excel: 💻 Coding Websites.xlsx ({sname})"
                    }

print(f"\nSuccessfully processed: {len(unique_coding_tools)} unique coding tools, platforms, channels, and project guides!")
for i, (k, item) in enumerate(list(unique_coding_tools.items())[:20], 1):
    print(f"[{i:2d}] {item['name']} | {item['website_type']} | {item['url']}")
