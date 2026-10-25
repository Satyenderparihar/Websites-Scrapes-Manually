import os
import sys
import glob
import re
import openpyxl

sys.stdout.reconfigure(encoding='utf-8')

downloads_dir = r"C:\Users\satyanarayan verma\Downloads"

def derive_website_type(cat, desc, name, url):
    d = f"{cat} {desc} {name} {url}".lower()
    if 'downloader' in d or 'download' in d:
        if 'facebook' in d: return "Facebook Video Downloader"
        if 'instagram' in d: return "Instagram Reel & Video Downloader"
        if 'pinterest' in d: return "Pinterest Video Downloader"
        if 'twitter' in d or 'x.com' in d: return "Twitter (X) Video Downloader"
        if 'youtube' in d and 'mp4' in d: return "YouTube to MP4 Converter"
        if 'youtube' in d: return "YouTube Video Downloader"
        return "Universal Media Downloader"
    if 'radio' in d: return "Online Radio Map & Station"
    if 'tv' in d or 'television' in d: return "Global TV Discovery & Streaming"
    if 'music' in d or 'audio' in d:
        if 'india' in d: return "Music Streaming (India)"
        if 'vocal' in d or 'acapella' in d: return "AI Vocal & Acapella Extractor"
        return "Music Streaming Platform"
    if 'pdf' in d:
        if 'editor' in d: return "Online PDF Editor & Converter"
        if 'mobile' in d: return "Mobile PDF Manager"
        return "PDF & Document Utility"
    if 'course' in d or 'learn' in d or 'academy' in d or 'training' in d:
        if 'agentic' in d: return "Agentic AI Course"
        if 'genai' in d or 'generative' in d: return "Generative AI Course"
        if 'rag' in d: return "RAG Architecture Course"
        if 'machine learning' in d or 'deep learning' in d: return "Machine Learning & Deep Learning Course"
        if 'vibe' in d: return "Vibe Coding & Automation Course"
        if 'project' in d: return "Project-Based Learning Course"
        if 'model' in d or 'deepseek' in d or 'openai' in d: return "AI Model Deep Dive Course"
        if 'data' in d: return "Data Science & Analytics Course"
        if 'computer' in d or 'notes' in d: return "Computer Education & Study Notes"
        return "Online Learning Platform"
    if 'replit' in d or 'website builder' in d: return "AI Website Builder & Cloud IDE"
    if 'template' in d: return "Social Media Template Booster"
    if 'car repair' in d: return "DIY Vehicle Repair Guides"
    if 'car customization' in d or '3d' in d and 'tuning' in d: return "3D Virtual Vehicle Customizer"
    if 'camera' in d or 'earthcam' in d: return "Live Camera Streaming"
    if 'travel' in d or 'virtual vacation' in d: return "Virtual Travel Platform"
    if 'flight' in d: return "Flight Tracking & Radar"
    if 'animation' in d: return "JavaScript Animation Engine"
    if 'game' in d or 'gaming' in d or 'airconsole' in d: return "Phone-Controller Multiplayer Games"
    if 'search' in d or 'filepursuit' in d: return "Open File Search Engine"
    if 'image' in d: return "Online Image Processing Tool"
    if 'workspace' in d or 'xtiles' in d: return "Personal Workspace & Productivity"
    if 'ai' in d: return "AI Tool & Generation Platform"
    if 'utility' in d or 'tool' in d: return "Online Web Utility"
    return cat if cat else "Web Platform"

print("Helper function defined.")
