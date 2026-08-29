# DoctorUndo MVP Frontend

React + Vite frontend for Kerala Doctor Discovery MVP.

## Setup

### Install dependencies

```bash
cd frontend
npm install
# or with yarn/pnpm
```

### Environment variables

Create `.env.local`:

```
VITE_API_URL=http://localhost:8000/api/v1
```

### Development

```bash
npm run dev
# Opens at http://localhost:5173
```

### Build

```bash
npm run build
```

### Type checking

```bash
npm run type-check
```

## Project Structure

- `src/pages/` - Full-page components
  - `DoctorSignup.tsx` - Doctor registration
  - `DoctorDashboard.tsx` - Doctor profile/settings
  - `DoctorProfile.tsx` - Public doctor profile view
  - `PatientSearch.tsx` - Main patient search interface

- `src/components/` - Reusable components
  - `MapView.tsx` - Leaflet map with doctor markers
  - `DoctorCard.tsx` - Doctor result card
  - `SymptomChat.tsx` - AI triage chat
  - `AvailabilityToggle.tsx` - Doctor availability switch

- `src/lib/` - Utilities
  - `api.ts` - Axios client and API endpoints
  - `store.ts` - Zustand auth/doctor stores

## Styling

TailwindCSS for utility-first styling.
