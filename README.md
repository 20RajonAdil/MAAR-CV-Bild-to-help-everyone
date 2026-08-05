# VitaForge — Premium CV Builder

A world-class, modern SaaS-style CV builder inspired by Linear, Stripe, Notion, Vercel and Framer.

## Features

- **Split-screen live preview** — A4 CV updates instantly as you type
- **Intelligent sentence templates** — Guided writing so you never stare at a blank field
- **Conditional sections** — Work Experience, Volunteering and Achievements appear only when filled
- **Dynamic GCSE / Skills / Achievements** — Add or remove rows freely
- **Dark & Light mode** with smooth animated toggle
- **Undo / Redo / Reset** with full history
- **Auto-save** to localStorage — never lose progress
- **Export** high-quality PDF and Word-compatible (.doc) documents
- **Print Mode** optimised for A4
- **Fully responsive** and accessible (keyboard, screen readers, high contrast)
- Glassmorphism, soft shadows, micro-interactions and premium polish throughout

## How to run

Simply open `index.html` in a modern browser (Chrome, Edge, Firefox, Safari).

For the best experience (especially PDF export), serve it locally:

```bash
# Python
python3 -m http.server 8080

# or Node
npx serve .
```

Then visit http://localhost:8080

## Brand

**VitaForge** — Craft your professional story.

Original logo and favicon included in `/assets`.

## Tech

Pure HTML, CSS & vanilla JavaScript. No build step required.  
Libraries used via CDN only for export: html2canvas + jsPDF.
