# 📚 Daily Learning Tracker

A beautiful, ultra-modern Progressive Web App (PWA) to track your daily learnings. Works offline, installable on any device, and uses local storage.

![Daily Learning Tracker](https://img.shields.io/badge/PWA-Ready-blue) ![Offline](https://img.shields.io/badge/Works-Offline-green) ![Mobile](https://img.shields.io/badge/Mobile-Friendly-purple)

## ✨ Features

- 📝 **Track Learnings** - Add, edit, and delete daily learning entries
- 🏷️ **Categories** - Organize with Coding, Design, Reading, Course, Project tags
- 🔥 **Streak Tracking** - Build and maintain your learning streak
- 📊 **Visual Stats** - Weekly progress bars and statistics
- 🔍 **Search & Filter** - Quickly find past learnings
- 🌙 **Dark/Light Mode** - Auto-detects system preference
- 📱 **PWA** - Install as an app on any device
- 🔌 **Offline First** - Works without internet
- 💾 **Local Storage** - Data persists on each device

## 🚀 Deploy to GitHub Pages

### 1. Create GitHub Repository

```bash
# Initialize git in the project folder
cd "Daily Learning Tracker"
git init
git add .
git commit -m "Initial commit: Daily Learning Tracker PWA"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/daily-learning-tracker.git
git branch -M main
git push -u origin main
```

### 2. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under "Source", select **main** branch and **/ (root)**
4. Click **Save**
5. Wait ~2 minutes for deployment

Your app will be live at: `https://YOUR_USERNAME.github.io/daily-learning-tracker/`

### 3. Access on Mobile

1. Open the URL on your mobile browser
2. You'll see an "Install" or "Add to Home Screen" prompt
3. Install the app for native-like experience

## 🛠️ Local Development

```bash
# Option 1: Use any local server
npx serve .

# Option 2: Python
python -m http.server 8000

# Option 3: Open index.html directly (some features may be limited)
```

## 📁 Project Structure

```
Daily Learning Tracker/
├── index.html        # Main HTML entry
├── manifest.json     # PWA manifest
├── sw.js            # Service worker
├── css/
│   └── styles.css   # Complete design system
├── js/
│   ├── storage.js   # LocalStorage data layer
│   ├── components.js # UI components
│   └── app.js       # Main application
└── icons/
    └── icon.svg     # App icon
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + N` | Add new learning |
| `Ctrl/Cmd + K` | Focus search |

## 📱 Mobile Features

- **Bottom Navigation** - Easy thumb-friendly access
- **Floating Action Button** - Quick add on mobile
- **Safe Area Support** - Works with notched devices
- **Touch Optimized** - Smooth interactions

## 🎨 Design System

The app uses a modern glassmorphism design with:
- Vibrant purple/magenta gradient accents
- Blur effects and glass-like cards
- Smooth micro-animations
- Responsive breakpoints (mobile-first)

## 📝 License

MIT License - Feel free to use and modify!

---

Made with ❤️ for lifelong learners
