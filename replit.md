# KNHS Guidance & Attendance Dashboard

## Overview

The KNHS (Kaysuyo National High School) Guidance & Attendance Dashboard is a full-stack web application designed to manage student attendance through QR code scanning. The system automatically tracks student attendance, marks late arrivals and absences, and sends SMS notifications to parents/guardians when students are late or absent. The application features an AI assistant powered by Groq that helps users navigate the dashboard and answer questions about school policies.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite for fast development and optimized production builds
- **Routing:** Wouter for lightweight client-side routing
- **UI Components:** Radix UI primitives with shadcn/ui component library
- **Styling:** Tailwind CSS v4 with CSS variables for theming
- **State Management:** TanStack Query (React Query) for server state management
- **Forms:** React Hook Form with Zod validation
- **Animations:** Framer Motion for UI transitions

**Component Structure:**
The frontend follows a modular component architecture with clear separation of concerns:
- **Pages:** Main route components (Home, Attendance, Scanner, QR Generator, Rules)
- **Layout:** Reusable layout components (MainLayout, Sidebar) with responsive mobile/desktop navigation
- **UI Components:** Atomic design pattern with reusable shadcn/ui components in `/components/ui`
- **Feature Components:** Domain-specific components like StudentTable and AI Assistant

**Key Features:**
- **Responsive Design:** Mobile-first approach with dedicated mobile navigation using Sheet component
- **Real-time Updates:** Attendance stats refresh every 30 seconds using React Query
- **QR Code Generation:** Client-side QR code generation for student IDs with passkey protection
- **QR Code Scanning:** HTML5 QR code scanner integration for attendance tracking
- **PDF Export:** Student attendance reports can be exported as PDFs using jsPDF

### Backend Architecture

**Technology Stack:**
- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js for HTTP server
- **Database:** Hybrid storage (JSON files for students, MariaDB/In-Memory for attendance)
- **Validation:** Zod schemas for API validation
- **Build:** esbuild for fast server bundling

**API Design:**
RESTful API architecture with the following endpoints:
- `POST /api/students` - Create new student records (requires API password)
- `GET /api/students/grade/:grade` - Fetch students by grade level (public)
- `GET /api/students/json/:grade` - Fetch students from JSON files (public)
- `POST /api/attendance/scan` - Record attendance via QR scan (public)
- `GET /api/attendance/date/:date` - Get attendance records by date (public)
- `GET /api/attendance/stats/today` - Get real-time attendance statistics (public)
- `POST /api/ai/chat` - AI assistant chat endpoint (public)

**Storage Layer:**
The `HybridStorage` class implements a hybrid storage approach:
- **Student Data:** Loaded from JSON files in `/student/` directory (g7.json, g8.json, g9.json, g10.json)
- **New Students:** Created via QR scan are stored in MariaDB (if available) or in-memory
- **Attendance Records:** Stored in MariaDB when available, falls back to in-memory storage
- **Merging:** getAllStudents/getStudentsByGrade merge JSON, DB, and in-memory students

**Business Logic:**
- **Attendance Rules:** Students arriving after 7:15 AM are marked as late
- **Auto-Absence:** Students not scanned by end of day are marked absent
- **Late Accumulation:** Three late arrivals trigger absence notification
- **SMS Notifications:** Automated parent notifications via Semaphore SMS API

### Database Schema

**PostgreSQL Tables:**

**Students Table:**
- `id` (serial, primary key)
- `student_id` (varchar, unique identifier)
- `name` (text)
- `grade` (varchar, e.g., "7", "8", "9")
- `section` (varchar, e.g., "Pearl", "Diamond")
- `lrn` (varchar, learner reference number)
- `parent_contact` (varchar, phone number for SMS)
- `qr_data` (text, JSON-encoded QR code data)
- `created_at` (timestamp)

**Attendance Table:**
- `id` (serial, primary key)
- `student_id` (varchar, references students)
- `student_name` (text, denormalized for performance)
- `grade` (varchar)
- `section` (varchar)
- `date` (varchar, YYYY-MM-DD format)
- `time_in` (varchar, HH:MM AM/PM format)
- `status` (varchar, values: "present", "late", "absent", "unmarked")
- `sms_notified` (boolean, tracks parent notification status)
- `created_at` (timestamp)

**Schema Decisions:**
- Drizzle ORM with Zod integration provides type-safe schema definitions shared across client/server
- Denormalized student data in attendance table for query performance
- String-based date/time storage for simplicity (could be optimized to timestamps)
- SMS notification tracking prevents duplicate parent alerts

### External Dependencies

**Third-Party Services:**

**Twilio SMS API:**
- **Purpose:** Send SMS notifications to parents/guardians
- **Integration:** REST API via `sendSMS` function in `/server/sms.ts`
- **Configuration:** Requires environment variables:
  - `TWILIO_ACCOUNT_SID` - Twilio Account SID
  - `TWILIO_AUTH_TOKEN` - Twilio Auth Token
  - `TWILIO_PHONE_NUMBER` - Twilio phone number for sending SMS
- **Use Cases:** Late arrival notifications, absence alerts, three-late warnings
- **Note:** If not configured, SMS notifications are logged but not sent

**Groq AI API:**
- **Purpose:** Powers the AI assistant for navigation and school policy questions
- **Integration:** Chat completion API called from client with user-provided API key
- **Storage:** API key stored in browser localStorage under `knhs_groq_api_key`
- **Model:** Configurable LLM model (e.g., llama3-8b-8192)
- **System Prompt:** Custom KNHS-specific prompt defining assistant role and capabilities
- **Features:** Multilingual support (Tagalog/English/Taglish), dashboard navigation commands

**Database Service:**

**Neon PostgreSQL:**
- **Purpose:** Serverless PostgreSQL database hosting
- **Configuration:** `DATABASE_URL` environment variable required
- **Driver:** `@neondatabase/serverless` for edge-compatible queries
- **Schema Management:** Drizzle Kit for migrations in `/migrations` directory
- **Development:** `db:push` script for schema synchronization

**UI Component Libraries:**

**Radix UI:**
- Complete set of accessible primitives (Dialog, Dropdown, Select, etc.)
- Provides unstyled, accessible components as foundation

**shadcn/ui:**
- Pre-built component library built on Radix UI
- Customized with "new-york" style variant
- Tailwind CSS integration with CSS variables for theming

**Development Tools:**

**Replit-Specific Integrations:**
- `@replit/vite-plugin-cartographer` - Development tooling
- `@replit/vite-plugin-dev-banner` - Development environment banner
- `@replit/vite-plugin-runtime-error-modal` - Error overlay for runtime issues
- Custom `metaImagesPlugin` for OpenGraph image URL resolution

**Build Configuration:**
- Vite for frontend bundling with React Fast Refresh
- esbuild for server bundling with selective dependency bundling
- Allowlist approach: Critical dependencies bundled to reduce cold start syscalls
- TypeScript with strict mode and path aliases (`@/`, `@shared/`, `@assets/`)

**Environment Variables Required:**
- `API_PASSWORD` - Password for API authentication and QR generator access
- `GROQ_KEY` - Groq API key for AI assistant
- `NODE_ENV` - Environment flag (development/production)

**Optional Environment Variables (for MariaDB persistence):**
- `MYSQL_HOST` - MariaDB host (default: localhost)
- `MYSQL_PORT` - MariaDB port (default: 3306)
- `MYSQL_USER` - MariaDB username (default: root)
- `MYSQL_PASSWORD` - MariaDB password
- `MYSQL_DATABASE` - MariaDB database name (default: knhs_attendance)

**Optional Environment Variables (for Twilio SMS):**
- `TWILIO_ACCOUNT_SID` - Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Twilio Auth Token
- `TWILIO_PHONE_NUMBER` - Twilio phone number for sending SMS

### Security Architecture

**API Password Protection:**
- All API endpoints (except `/api/config/passkey`) require authentication via `x-api-password` header
- Password is configured via `API_PASSWORD` environment variable
- If `API_PASSWORD` is not set, API endpoints are accessible without authentication
- QR Generator uses the same password as passkey for access control
- Frontend uses centralized `apiFetch` helper (client/src/lib/api.ts) to automatically include authentication headers

**Admin Endpoints:**
- `POST /api/reset` - Clears all student and attendance data (requires API password)
- `/api/config/passkey` - Public endpoint that returns API_PASSWORD for QR generator validation

### Grade Sections

The school has grades 7-10 only with the following sections:
- Grade 7 - Love
- Grade 8 - Joy
- Grade 9 - Peace
- Grade 10 - Hope

---

## Deployment Guide (Render)

### Prerequisites
1. GitHub account with the repository pushed
2. Render account (free tier available at [render.com](https://render.com))
3. Twilio account for SMS (optional)
4. MariaDB/MySQL database (optional, for persistent attendance)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Create Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** > **Web Service**
3. Connect your GitHub repository
4. Configure the service:
   - **Name:** knhs-guidance-dashboard
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`

### Step 3: Set Environment Variables

In Render Dashboard, go to **Environment** tab and add:

**Required:**
| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Set to `production` |
| `API_PASSWORD` | Password for QR Generator access (e.g., `KNHS2025`) |
| `GROQ_KEY` | Groq API key for AI assistant |

**Optional (for SMS notifications):**
| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number (e.g., `+1234567890`) |

**Optional (for MariaDB persistence):**
| Variable | Description |
|----------|-------------|
| `MYSQL_HOST` | MariaDB host address |
| `MYSQL_PORT` | MariaDB port (default: 3306) |
| `MYSQL_USER` | Database username |
| `MYSQL_PASSWORD` | Database password |
| `MYSQL_DATABASE` | Database name (default: knhs_attendance) |

### Step 4: Deploy

1. Click **Create Web Service**
2. Wait for the build to complete (5-10 minutes)
3. Your app will be available at `https://knhs-guidance-dashboard.onrender.com`

### Step 5: Set Up MariaDB on Render (Optional)

For persistent attendance storage:

1. Go to Render Dashboard > **New** > **Private Service**
2. Use Docker image: `mariadb:10.11`
3. Add a **Disk**:
   - Name: `mariadb-data`
   - Mount Path: `/var/lib/mysql`
   - Size: 1GB (free tier)
4. Set environment variables:
   - `MYSQL_ROOT_PASSWORD` - Strong password
   - `MYSQL_DATABASE` - `knhs_attendance`
   - `MYSQL_USER` - `knhs_user`
   - `MYSQL_PASSWORD` - Strong password
5. After deployment, copy the internal hostname (e.g., `mariadb-yourapp`)
6. Update your web service with the MySQL environment variables

### Using render.yaml (Blueprint)

Alternatively, use the included `render.yaml` file:

1. In Render Dashboard, click **New** > **Blueprint**
2. Connect your repository
3. Render will auto-detect `render.yaml` and configure services
4. Fill in the environment variable values when prompted
5. Click **Apply** to deploy

### Health Check

The app includes a health check endpoint at `/api/attendance/stats/today` that Render uses to verify the app is running correctly.

### Troubleshooting

- **Build fails:** Check Node.js version compatibility (requires Node 18+)
- **App crashes:** Verify all required environment variables are set
- **SMS not sending:** Ensure Twilio credentials are correct and phone number is verified
- **Students not loading:** Verify JSON files exist in `/student/` directory

### Notes

- Without MariaDB, attendance records are stored in memory and will reset on restart
- Student data from JSON files (`g7.json` - `g10.json`) is always available
- Free tier has limitations: app sleeps after 15 minutes of inactivity