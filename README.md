# Digital Footprint Visualizer

A full-stack MERN (MongoDB, Express.js, React, Node.js) **Personal Cybersecurity Officer** web application designed for everyday, non-technical users. Monitor personal emails, domains, social handles, and phone numbers, visualize exposure relationships in an interactive map, and follow guided remediation checklists that lift your Privacy Health Score.

---

## 🎨 Professional Dark Navy & Electric Blue Theme

Designed with a high-end crypto/fintech dark dashboard aesthetic:
- **Primary Background**: `#050F20`
- **Secondary Background**: `#101B32`
- **Card & Container Background**: `#172641`
- **Primary Accent**: `#2468E8`
- **Secondary Accent**: `#4A8DFF`
- **Primary Text**: `#F4F7FF`
- **Secondary Text**: `#A9B7CE`
- **Borders**: `#263653`
- **Subtle Blue Glow**: `rgba(36, 104, 232, 0.20)`

---

## 🚀 Key Features

1. **Officer Overview & Privacy Score**:
   - Real-time Privacy Health Score gauge (0–100) with dynamic posture ratings.
   - 4 Exposure Pillar sub-scores: Account Security, Data Brokers, Public Profiles, and Domains.
   - Plain-English Officer Daily Briefing and 30-day findings trend chart (powered by Recharts).
2. **Interactive Footprint Map**:
   - Radial SVG exposure graph connecting your Identity Core to monitored assets and findings.
   - Interactive detail drawer with plain-English summaries and direct remediation links.
3. **Monitored Assets & Live Scan Engine**:
   - Track emails, domains, social handles, phone numbers, and aliases.
   - Includes live DNS hygiene inspection (SPF / DMARC records) for domains and simulated broker/breach correlation.
4. **Guided Action Center**:
   - Step-by-step remediation checklists synced directly with findings.
   - Completing tasks automatically resolves findings and recalculates your Privacy Health Score.
5. **Breach Intelligence**:
   - Search across simulated breach records with severity breakdown and data exposure classes.
6. **Scan Reports & Export**:
   - Historical scan archive with downloadable Markdown and JSON executive briefings.
7. **MongoDB Atlas & Mongoose Backend**:
   - Robust REST API built with Express, TypeScript, and Mongoose ODM targeting `digital_footprint_visualizer`.

---

## 📁 Project Structure

```text
digital-footprint-visualizer/
├── server.ts                  # Express + Vite middleware entry point
├── server/
│   ├── src/
│   │   ├── app.ts             # Express app setup & health router
│   │   ├── config/            # Database connection & paths
│   │   ├── models/            # Mongoose schemas (User, FootprintTarget, Finding, etc.)
│   │   ├── middleware/        # JWT auth, error handling, validation
│   │   ├── services/          # Scan engine, risk calculator, breach service
│   │   ├── controllers/       # Route controllers (Auth, Dashboard, Targets, Actions)
│   │   ├── routes/            # API router endpoints (/api/*)
│   │   └── seed/              # Demo workspace & breach seed scripts
└── src/
    ├── App.jsx / App.tsx      # React router setup
    ├── index.css              # Tailwind v4 + custom theme variables & glow effects
    ├── context/               # AuthContext, ThemeContext, ToastContext
    ├── services/              # API client wrapper
    ├── components/            # Layout (Sidebar, TopBar), Common (ScoreGauge, RiskBadge), Map
    └── pages/                 # Dashboard, FootprintMap, Targets, ActionCenter, Reports, BreachCheck, Settings
```

---

## 🛠️ Quick Start

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas connection string (`MONGODB_URI`)

### Installation & Run

1. Clone the repository:
   ```bash
   git clone https://github.com/deekshithaja/digital-footprint-visualizer.git
   cd digital-footprint-visualizer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (`.env`):
   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI="your-mongodb-atlas-uri"
   JWT_SECRET="your-secure-jwt-secret"
   JWT_EXPIRES_IN="7d"
   ```

4. Start the full-stack development server on port 3000:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   npm start
   ```

---

## 🔑 Demo Credentials

- **Email**: `demo@sentinel.local`
- **Password**: `SentinelDemo!2026`
- Or simply click **Try Demo Account** on the sign-in screen to instantly explore the pre-seeded officer workspace.

---

## 📄 License

Distributed under the Apache-2.0 License. See `LICENSE` for more information.
