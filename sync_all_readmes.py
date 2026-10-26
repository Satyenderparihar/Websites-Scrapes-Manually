"""
Automated Synchronization & Broken Link Cleaner for READMEs
Scans README.md and sub-READMEs, verifies every local link, and removes dead links when files or folders are deleted.
"""

import os
import sys
import re
import urllib.parse

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"D:\Antigravity - Agent\🌐 Websites Scrapes Manually"
ROOT_README = os.path.join(BASE_DIR, "README.md")
GF_DIR = os.path.join(BASE_DIR, "📁 🌊 Google Flow")
GF_README = os.path.join(GF_DIR, "README.md")

def check_and_clean_links(readme_path, base_folder):
    if not os.path.exists(readme_path):
        return
    with open(readme_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    modified = False
    cleaned_lines = []
    
    # Match markdown links: [text](path)
    link_pattern = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')

    for line in lines:
        matches = link_pattern.findall(line)
        keep_line = True
        for text, url in matches:
            # Skip external web URLs
            if url.startswith('http://') or url.startswith('https://') or url.startswith('#'):
                continue
            
            # Decode URL path
            decoded_path = urllib.parse.unquote(url)
            # Resolve relative to base_folder
            target_path = os.path.normpath(os.path.join(base_folder, decoded_path))
            
            if not os.path.exists(target_path):
                print(f"⚠️ Dead link detected in {os.path.basename(readme_path)}: [{text}]({url}) -> File not found on disk!")
                keep_line = False
                modified = True
                break
        
        if keep_line:
            cleaned_lines.append(line)

    if modified:
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.writelines(cleaned_lines)
        print(f"✅ Cleaned stale/deleted links from {os.path.basename(readme_path)}")
    else:
        print(f"✅ No dead links found in {os.path.basename(readme_path)}")

def main():
    print("🔍 Running automatic README link verification & sync...")
    if os.path.exists(GF_README):
        check_and_clean_links(GF_README, GF_DIR)
    if os.path.exists(ROOT_README):
        check_and_clean_links(ROOT_README, BASE_DIR)
    print("✨ README Synchronization Complete!")

if __name__ == "__main__":
    main()
