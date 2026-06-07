# DeviceCycle — Product Lifecycle Management

A web application built to manage the complete lifecycle of devices in an organization. From registering a new device to tracking its firmware, status changes, and eventual decommission — everything is handled in one place with a full audit trail.

---

## Why we built this

Managing device fleets manually is messy. Spreadsheets go out of date, nobody knows which laptop has what firmware, and when something goes wrong there's no history to look back on. DeviceCycle solves that by giving teams a clean dashboard to track every device and every change made to it.

---

## What it does

- **Dashboard** — live overview of total devices, active count, firmware versions, and outdated device alerts
- **Device Management** — add, update, and decommission devices with serial number, model, status, and firmware tracking
- **Firmware Catalog** — manage firmware versions and automatically detect which devices are running outdated builds
- **Change Logs** — every action is automatically recorded with a timestamp. Create, update, status change, firmware upgrade, deletion — all tracked
- **Notifications** — real-time activity panel in the header showing recent fleet events
- **Authentication** — JWT-based login with role separation. Admins can make changes, regular users get read-only access

---

## Tech Stack

**Frontend**
- React 18 + Vite (TypeScript)
- Tailwind CSS with responsive layout and dark mode support
- TanStack Query v5 for data fetching
- Lucide React icons

**Backend**
- ASP.NET Core 8 Web API
- Entity Framework Core 8
- PostgreSQL Database
- ASP.NET Identity + JWT Bearer authentication
- Docker for containerization

---

## Project Structure

```
├── DeviceCycle.Server/
│   ├── Controllers/        API endpoints
│   ├── Models/             EF Core models and DbContext
│   ├── Migrations/         PostgreSQL migrations
│   ├── appsettings.json    Configuration
│   └── Dockerfile          Production container config
│
└── devicecycle-client/
    ├── vercel.json         Deployment routing config
    └── src/
        ├── api/            API calls
        ├── components/     Reusable UI components (layout, charts)
        ├── pages/          Dashboard, Devices, Firmware, ChangeLogs, Login
        └── context/        Auth and Theme providers
```

---

## Getting Started

### Prerequisites
- .NET 8 SDK
- Node.js 18+
- PostgreSQL (local instance or cloud database like Neon.tech)

### Backend Setup

1. Configure your database connection string:
   - In `DeviceCycle.Server/appsettings.json`, update the `ConnectionStrings:dbcs` setting, OR:
   - Set the `DATABASE_URL` environment variable pointing to your PostgreSQL database.
2. Run database migrations:
   ```bash
   dotnet ef database update
   ```
3. Run the server:
   ```bash
   dotnet run
   ```
   The API will listen on `https://localhost:7110` (with HTTPS profile) or `http://localhost:5297` (HTTP).

### Frontend Setup

1. Install dependencies:
   ```bash
   cd devicecycle-client
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend runs at `http://localhost:8080` and proxies `/api` calls to the local backend.

---

## Deployment

The project is structured for easy, free deployment using cloud services:

- **Database**: Hosted on **Neon.tech** or **Supabase** (PostgreSQL).
- **Backend**: Deployed to **Render** as a web service running from the `Dockerfile`.
- **Frontend**: Deployed to **Vercel** with the routing fallback (`vercel.json`) pointing to the Render API endpoint via the `VITE_API_URL` environment variable.

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/devices` | List all devices |
| POST | `/api/devices` | Add a device (Admin) |
| PUT | `/api/devices/{id}` | Update a device (Admin) |
| DELETE | `/api/devices/{id}` | Delete a device (Admin) |
| GET | `/api/devices/outdated` | Devices not on latest firmware |
| GET | `/api/changelogs` | Query change logs with filters |
| GET | `/api/firmware` | List firmware versions |
| POST | `/api/firmware` | Add firmware version (Admin) |
