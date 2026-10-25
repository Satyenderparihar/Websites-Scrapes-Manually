import sys
sys.path.append(r'D:\Antigravity - Agent\🌐 Websites Scrapes Manually')
sys.stdout.reconfigure(encoding='utf-8')
from test_extract_all_in_one import extracted_tools

CODING_SUBCATEGORIES = {
    "💻 Online Code Editors & Cloud IDEs": [
        "Online Code Editor & IDE", "Online Code Editor", "Web IDE"
    ],
    "⚔️ Coding Challenges & Practice Platforms": [
        "Coding Practice & Challenges", "Coding Practice Platform", "Coding Practice Community"
    ],
    "🎓 Programming & Tech Learning Platforms": [
        "Coding Learning Platform", "Tech Learning Platform", "Interactive Coding App", "Learning Platform"
    ],
    "📚 Developer Reference, Roadmaps & Cheat Sheets": [
        "Developer Roadmap & Career Guide", "Developer Cheat Sheets & Reference", "Developer Reference & Cheat Sheets",
        "Web Development Resource", "Programming Resources & Reference", "CSS Learning", "JavaScript Learning",
        "React Learning", "Vue.js Learning", "Web3 Learning", "PHP Learning", "SQL Learning", "Blockchain Learning",
        "Next.js Learning", "API Learning", "Go Language Learning", "Web Development"
    ],
    "🐍 Python Dedicated Resources": [
        "Python Programming Resource", "Python Resource", "Python Learning"
    ],
    "📊 Data Science, Big Data & Analytics Resources": [
        "Data Science & Analytics Resource", "Data Analytics Resource", "Big Data Resource"
    ],
    "🤖 Machine Learning & Neural Network Resources": [
        "Machine Learning & AI Resource", "Machine Learning Resource", "Deep Learning Resource"
    ],
    "📈 R Programming & Statistical Computing": [
        "R Programming Resource", "Statistical Computing Resource"
    ],
    "🐙 Version Control & Repository Platforms": [
        "Version Control & Repository Platform", "Version Control", "Version Control (Git)"
    ],
    "💼 Technical Interview Prep & Coding Utilities": [
        "Technical Interview Preparation", "Interview Prep", "Code Converter Tool", "Code Converter", "Developer Utility"
    ],
    "📺 Programming Creators & Channels (YouTube & Social)": [
        "YouTube Coding Channel", "Social Coding Creator", "Telegram Tech Community"
    ],
    "🚀 Hands-on Project Guides & Implementations": [
        "C Project Implementation", "C++ Project Implementation", "Python Project Implementation",
        "Java Project Implementation", "Web Dev Project Implementation", "Coding Project Implementation",
        "Data Science Project Implementation", "Machine Learning Project Implementation", "R Project Implementation"
    ]
}

def map_coding_to_subcat(wtype, name=""):
    wtype_clean = (wtype or "").strip()
    name_lower = (name or "").lower()
    
    if 'project' in wtype_clean.lower() or 'implementation' in wtype_clean.lower():
        return "🚀 Hands-on Project Guides & Implementations"
    if any(k in name_lower for k in ['replit', 'glitch', 'codepen', 'jsfiddle', 'codesandbox', 'stackblitz']):
        return "💻 Online Code Editors & Cloud IDEs"
    if any(k in name_lower for k in ['leetcode', 'hackerrank', 'codewars', 'topcoder', 'coderbyte', 'codechef', 'exercism', 'project euler', 'dailyprogrammer', 'rosalind']):
        return "⚔️ Coding Challenges & Practice Platforms"
    if any(k in name_lower for k in ['github', 'gitlab', 'bitbucket', 'git book']):
        return "🐙 Version Control & Repository Platforms"
    if 'telegram' in wtype_clean.lower() or any(k in name_lower for k in ['mosh', 'harry', 'telusko', 'traversy', 'gate smashers', 'anuj bhaiya', 'apni kaksha', 'jenny', 'mysirg', 'derek banas', 'academind', 'thenewboston', 'sortedcoding', 'clever programmer', 'programmingknowledge', 'freecodecamp (social)', 'codz learner', 'imran', 'rengatechnologies', 'startup baniya', 'iron coding']):
        return "📺 Programming Creators & Channels (YouTube & Social)"
    if 'machine learning' in wtype_clean.lower():
        return "🤖 Machine Learning & Neural Network Resources"
    if 'data science' in wtype_clean.lower():
        return "📊 Data Science, Big Data & Analytics Resources"
    if 'r programming' in wtype_clean.lower():
        return "📈 R Programming & Statistical Computing"
    if 'python' in wtype_clean.lower() or ('python' in name_lower and not any(k in name_lower for k in ['youtube', 'channel', 'course', 'project', 'full course'])):
        return "🐍 Python Dedicated Resources"
    if any(k in name_lower for k in ['converter', 'interview questions', 'interviewbit']):
        return "💼 Technical Interview Prep & Coding Utilities"

    for subcat, types in CODING_SUBCATEGORIES.items():
        if wtype_clean in types:
            return subcat
    return "📚 Developer Reference, Roadmaps & Cheat Sheets"

sub_counts = {}
for item in extracted_tools.values():
    sub = map_coding_to_subcat(item['website_type'], item['name'])
    sub_counts[sub] = sub_counts.get(sub, 0) + 1

print("\nSubcategory distribution for All In One resources:")
for sub, cnt in sorted(sub_counts.items(), key=lambda x: x[1], reverse=True):
    print(f"  {sub:55s}: {cnt}")
print(f"Total: {sum(sub_counts.values())}")
