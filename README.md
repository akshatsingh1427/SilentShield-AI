# 🛡️ SilentShield AI

**Your Personal AI Security Analyst — Running 100% On Your Device**

Detects phishing emails, scam messages, malicious URLs, QR code traps, and fraudulent PDFs — entirely in your browser. No data ever leaves your device.

---

## 🚀 How to Run (Windows)

### Prerequisites
- [Node.js 18+](https://nodejs.org/) — LTS version recommended (npm is included automatically)

### Steps

1. Extract the zip, then open **Command Prompt** or **PowerShell** inside the `SilentShield-AI` folder:
   ```
   cd SilentShield-AI
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open your browser at **http://localhost:5173**

That's it — no extra config, no approval prompts.

---

## 📦 Build for Production

```
npm run build
npm run preview
```

The built files will be in the `dist/` folder — serve them with any static host.

---

## 🔒 Features

| Tab | What it does |
|---|---|
| **File / PDF** | Drag in a PDF, .txt, .eml — extracts text and checks for scam patterns |
| **URL / Link** | Paste any URL — detects typosquatting, fake brands, suspicious TLDs |
| **Raw Text** | Paste SMS, WhatsApp or email body — scores urgency, credential theft patterns |
| **QR Code** | Upload QR image — decodes the hidden URL safely (never opens it) |

- **History** — all past scans saved in browser storage, never sent anywhere
- **Export Report** — opens a print-friendly report in a new tab (Ctrl+P → Save as PDF)

---

## 🏗️ Tech Stack

- React 19 + Vite 6
- Tailwind CSS v4
- Tesseract.js (in-browser OCR)
- pdfjs-dist (in-browser PDF parsing)
- jsQR (in-browser QR decoding)
- Zustand (local state, persisted to localStorage)
- Wouter (client-side routing)

---

## ❗ Troubleshooting

**Port 5173 already in use**
→ Edit `vite.config.ts` and change `port: 5173` to any free port

**Tesseract OCR is slow on first image**
→ Normal — it downloads the language model (~10 MB) once and caches it in IndexedDB

**npm not found**
→ Install Node.js from https://nodejs.org — npm comes bundled with it
