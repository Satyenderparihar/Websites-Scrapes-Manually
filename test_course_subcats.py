import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r"D:\Antigravity - Agent\🌐 Websites Scrapes Manually\💾 websites_database.json", 'r', encoding='utf-8') as f:
    db = json.load(f)

course_items = [v for v in db.values() if v.get("category") == "🎓 Free Courses & Learning Platforms"]

print(f"Total courses: {len(course_items)}")

subcats = {}
for c in course_items:
    t = c.get("website_type", "General")
    subcats[t] = subcats.get(t, 0) + 1

for t, cnt in sorted(subcats.items(), key=lambda x: -x[1]):
    print(f"  {t}: {cnt}")
