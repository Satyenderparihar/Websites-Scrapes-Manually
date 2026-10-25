import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

import importlib.util
spec = importlib.util.spec_from_file_location("agent", r"D:\Antigravity - Agent\🌐 Websites Scrapes Manually\⚡ manual_websites_agent.py")
agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent)

db = agent.load_database()

# User initial 9 websites
initial_sites = [
    {
        "url": "https://music.youtube.com",
        "name": "YouTube Music",
        "category": "🎵 Music & Audio Streaming",
        "pricing": "Free + Paid",
        "description": "Official YouTube music streaming platform with official albums, live performances, and music videos."
    },
    {
        "url": "https://www.spotify.com",
        "name": "Spotify",
        "category": "🎵 Music & Audio Streaming",
        "pricing": "Free + Paid",
        "description": "Global digital music, podcast, and video service with millions of songs and creator content."
    },
    {
        "url": "https://music.apple.com",
        "name": "Apple Music",
        "category": "🎵 Music & Audio Streaming",
        "pricing": "Paid",
        "description": "Premium ad-free audio streaming service featuring spatial audio, lossless sound, and curated playlists."
    },
    {
        "url": "https://soundcloud.com",
        "name": "SoundCloud",
        "category": "🎵 Music & Audio Streaming",
        "pricing": "Free + Paid",
        "description": "Artist-first audio platform allowing independent creators to upload, promote, and discover music."
    },
    {
        "url": "https://gaana.com",
        "name": "Gaana",
        "category": "🎵 Music & Audio Streaming",
        "pricing": "Free + Paid",
        "description": "Popular Indian commercial music streaming service offering Hindi, regional, and international tracks."
    },
    {
        "url": "https://www.jiosaavn.com",
        "name": "JioSaavn",
        "category": "🎵 Music & Audio Streaming",
        "pricing": "Free + Paid",
        "description": "Leading Indian audio streaming service offering 80M+ tracks across Bollywood, regional, and English music."
    },
    {
        "url": "https://radio.garden",
        "name": "Radio Garden",
        "category": "📻 Online Radio & Interactive Maps",
        "pricing": "Free",
        "description": "Interactive 3D globe allowing exploration and live listening to thousands of radio stations worldwide."
    },
    {
        "url": "https://tv.garden",
        "name": "TV Garden",
        "category": "📺 Global TV & Media Discovery",
        "pricing": "Free",
        "description": "Explore and discover live television broadcasts and worldwide channels from an interactive platform."
    },
    {
        "url": "https://famelack.com",
        "name": "Fame Lack",
        "category": "📺 Global TV & Media Discovery",
        "pricing": "Free",
        "description": "Free platform to watch live television channels, listen to online radio, and explore worldwide streams."
    }
]

print("Adding initial user websites...")
for site in initial_sites:
    rec = agent.add_or_update_website(db, site["url"], name=site["name"], category=site["category"], pricing=site["pricing"], description=site["description"], source="User Direct Prompt")
    print(f"  ✓ Added: {rec['name']} -> {rec['category']}")

print("\nIngesting Excel files from Downloads...")
agent.ingest_downloads_excel_files(db)

agent.save_database(db)
print(f"\nTotal unique websites in database: {len(db)}")

print("Building categories directories, reports, master excel & README...")
agent.build_category_directories_and_reports(db)

print("Committing and pushing to GitHub...")
agent.git_commit_and_push(f"feat: initial release with user websites and downloads excel catalogs ({len(db)} websites)")

print("Seeding Complete!")
