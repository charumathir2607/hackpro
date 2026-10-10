# GridSentinel — Frontend

**Smart Electricity Theft Detection & Feeder Loss Localization System**

> ⚠️ **SIMULATED DATA — DEMO MODE**: All readings displayed are synthetically generated for demonstration purposes only. No actual utility metering hardware is connected.

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** (styling)
- **Recharts** (data visualization)
- **Lucide React** (icons)
- **React Router v6** (navigation)
- **date-fns** (timestamp formatting)

## Prerequisites

- Node.js 18+
- Python 3.9+ (for backend)
- npm or yarn

## Quick Start (Windows / PowerShell)

### 1. Start the Backend

```powershell
cd backend
pip install -r requirements.txt
python app.py
```

Backend runs on `http://localhost:5000`

### 2. Start the Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## Environment

Copy `.env.example` to `.env` (already done):

```
VITE_API_BASE_URL=http://localhost:5000/api
```

## Build for Production

```powershell
cd frontend
npm run build
```

Output in `frontend/dist/`

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Overview | `/` | Dashboard with KPIs, 24h trend, section cards |
| Feeder Network | `/feeder-network` | Visual schematic with section selection |
| Section Analysis | `/section-analysis` | Detailed energy balance per section |
| Smart Meters | `/smart-meters` | Meter registry with search, filters, pagination |
| Alerts & Inspections | `/alerts` | Alert management with inspection workflow |
| Reports | `/reports` | Daily summary with CSV download |
| Settings | `/settings` | Detection threshold configuration |

## Demo Controls

On the Overview page, use the **Demo Controls** panel:

- **Simulate Evening Anomaly**: Calls `POST /api/demo/simulate-evening-anomaly` — injects discrepancy into Section S-04 during 19:00–22:00
- **Reset to Baseline**: Calls `POST /api/demo/reset` — restores all sections to normal parameters

## Features

- ✅ Live API integration — all data from backend
- ✅ Loading skeletons on every data-dependent component
- ✅ Error states with retry and backend connection instructions
- ✅ Toast notifications for all actions
- ✅ Confirmation dialogs for destructive actions
- ✅ CSV export (meters + reports)
- ✅ Print-friendly report layout
- ✅ Demo mode banner throughout
- ✅ Responsive design (laptop, tablet, mobile)
- ✅ Dark navy/graphite theme with electric green accents

## Limitations

- All meter readings are randomly generated on each backend restart
- Settings persist only in-memory (reset on backend restart)
- No real-time WebSocket streaming (polling via manual refresh)
- No actual hardware connectivity or ML models
