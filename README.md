# Ludhiana Civic Hero 

**AI-powered civic issue reporting and resolution platform for Ludhiana, Punjab.**

Built for the **Vibe2Ship Hackathon** (Coding Ninjas × Google for Developers), using **Google AI Studio Build Mode** and the **Gemini API**.

**Live App:** [https://ludhiana-civic-hero-393638649...heast1.run.app](https://ludhiana-civic-hero-393638649xxxxx.heast1.run.app) *(replace with your full deployed URL)*

---

## The Problem

Communities across Ludhiana face recurring civic issues — potholes, broken streetlights, illegal garbage dumping, water leaks — but reporting them today is fragmented, slow, and rarely transparent. Citizens have no easy way to flag problems, verify if others are facing the same issue, or track whether anything gets fixed.

##  The Solution

**Ludhiana Civic Hero** lets citizens report civic issues with a photo, automatically classifies and assesses severity using **Gemini Vision AI**, plots them on an interactive map of Ludhiana's zones, and lets the community verify and track resolution — all the way through to **AI-drafted escalation letters** sent automatically to the relevant municipal department once an issue is verified by enough residents.

## Key Features

- **AI-Powered Photo Reporting** — Upload a photo of a civic issue; Gemini Vision automatically classifies it (pothole, streetlight, garbage, water leak), estimates severity, and generates a description.
- **Interactive Zone Map** — Custom vector map of Ludhiana covering Civil Lines, Model Town, Sarabha Nagar, Dugri, and Ferozepur Road, with live color-coded issue pins.
- **Community Verification** — Residents confirm active issues or mark them resolved, building a verification count for each report.
- **Agentic Escalation System** — Once an issue crosses 3+ verifications, the system automatically drafts a formal escalation letter addressed to the correct Municipal Corporation Ludhiana department (Public Works, Sanitation & Waste Management, Water Authority, etc.) — no manual drafting needed.
- **Civic Analytics Dashboard** — Real-time breakdown of issues by category and zone, resolution rates, and an AI Tactical Insights panel showing high-priority area clusters and ready-to-send escalations.

##  Tech Stack

- **Frontend:** React + TypeScript, Vite
- **Backend:** Node.js, Express
- **AI:** Google Gemini API (`@google/genai`) — Vision-based image classification, structured JSON output, agentic escalation drafting
- **Persistence:** File-backed JSON database
- **Deployment:** Google AI Studio Build Mode → Cloud Run (Starter Tier)

##  Google Technologies Used

- **Google AI Studio Build Mode** — full app generation and deployment
- **Gemini API** — multimodal image analysis for issue classification, severity estimation, and AI-generated escalation letters
- **Cloud Run** — hosting the deployed full-stack application

## Project Structure

```
├── server.ts                  # Express server + Gemini Vision integration
├── src/
│   ├── App.tsx                 # Main app shell
│   ├── types.ts                # Shared TypeScript types
│   ├── components/
│   │   ├── Map.tsx              # Interactive Ludhiana zone map
│   │   ├── ReportForm.tsx       # Photo upload + report submission
│   │   ├── IssueDetails.tsx     # Issue detail panel + verification/escalation
│   │   └── Dashboard.tsx        # Analytics dashboard
│   └── utils/
│       └── escalation.ts        # Agentic escalation/clustering logic
├── data/                       # File-backed JSON database
└── package.json
```

##  Author

**Pranoy Albin Mascarinus**
MCA Student, Lovely Professional University — AI/ML, NLP & Cybersecurity
GitHub: [@Pranoy13](https://github.com/Pranoy13)

---

*Built in 6 days for Vibe2Ship 2026.*
