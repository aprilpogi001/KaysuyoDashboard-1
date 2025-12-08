# KNHS Guidance & Attendance Dashboard

A comprehensive attendance tracking system for Kaysuyo National High School with QR code scanning, SMS notifications, and AI assistant.

## Features

- QR Code Generation for student IDs
- QR Code Scanner for attendance tracking
- Real-time dashboard with attendance statistics
- SMS notifications via Twilio
- AI Assistant powered by Groq
- Attendance reports by grade level

## Environment Variables

Add these to your environment:

```
API_PASSWORD=your_admin_passkey
GROQ_KEY=your_groq_api_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

## Time Rules

- **6:00 - 7:00 AM**: Pending (can become Present when scanned)
- **Before 7:00 AM**: Present
- **7:00 - 7:15 AM**: Late
- **After 7:15 AM / Not scanned**: Absent

## API Endpoints

### Students

#### Get All Students from JSON Files
```bash
curl -X GET "https://your-app.replit.app/api/students/json"
```

#### Get Students by Grade from JSON
```bash
curl -X GET "https://your-app.replit.app/api/students/json/7"
```

#### Get All Students from Database
```bash
curl -X GET "https://your-app.replit.app/api/students" \
  -H "x-api-password: YOUR_PASSKEY"
```

#### Get Students by Grade from Database
```bash
curl -X GET "https://your-app.replit.app/api/students/grade/7" \
  -H "x-api-password: YOUR_PASSKEY"
```

#### Create Student
```bash
curl -X POST "https://your-app.replit.app/api/students" \
  -H "Content-Type: application/json" \
  -H "x-api-password: YOUR_PASSKEY" \
  -d '{
    "studentId": "7-Love-JuanDelaCruz",
    "name": "Juan Dela Cruz",
    "gender": "male",
    "grade": "7",
    "section": "Love",
    "lrn": "123456789012",
    "parentContact": "09171234567",
    "qrData": "{\"n\":\"Juan Dela Cruz\",\"g\":\"7\",\"s\":\"Love\"}"
  }'
```

### Attendance

#### Scan QR Code (Record Attendance)
```bash
curl -X POST "https://your-app.replit.app/api/attendance/scan" \
  -H "Content-Type: application/json" \
  -d '{
    "qrData": "{\"n\":\"Juan Dela Cruz\",\"gn\":\"male\",\"g\":\"7\",\"s\":\"Love\",\"l\":\"123456789012\",\"c\":\"09171234567\"}"
  }'
```

**Response:**
```json
{
  "success": true,
  "attendance": {
    "id": 1,
    "studentId": "7-Love-JuanDelaCruz",
    "studentName": "Juan Dela Cruz",
    "grade": "7",
    "section": "Love",
    "date": "2025-12-04",
    "timeIn": "06:30 AM",
    "status": "present",
    "smsNotified": true
  },
  "smsSent": true,
  "student": {
    "name": "Juan Dela Cruz",
    "grade": "7",
    "section": "Love"
  }
}
```

#### Get Today's Stats
```bash
curl -X GET "https://your-app.replit.app/api/attendance/stats/today"
```

**Response:**
```json
{
  "totalPresent": 45,
  "totalLate": 10,
  "totalAbsent": 5,
  "totalScanned": 55,
  "totalStudents": 60,
  "date": "2025-12-04",
  "day": "Wednesday",
  "year": 2025
}
```

#### Get Recent Attendance (Live Feed)
```bash
curl -X GET "https://your-app.replit.app/api/attendance/recent"
```

#### Get Weekly Attendance Stats
```bash
curl -X GET "https://your-app.replit.app/api/attendance/weekly"
```

**Response:**
```json
[
  {
    "date": "2025-11-28",
    "day": "Thu",
    "fullDay": "Thursday",
    "year": 2025,
    "present": 50,
    "late": 8,
    "absent": 2
  }
]
```

#### Get Attendance by Date
```bash
curl -X GET "https://your-app.replit.app/api/attendance/date/2025-12-04"
```

#### Get Attendance by Student
```bash
curl -X GET "https://your-app.replit.app/api/attendance/student/7-Love-JuanDelaCruz"
```

#### Get Attendance by Grade and Date
```bash
curl -X GET "https://your-app.replit.app/api/attendance/grade/7/date/2025-12-04"
```

#### Get Student List with Attendance Status
```bash
curl -X GET "https://your-app.replit.app/api/list/student/7-Love"
```

**Response:**
```json
[
  {
    "name": "Juan Dela Cruz",
    "lrn": "123456789012",
    "grade": "7",
    "section": "Love",
    "gender": "male",
    "contact": "09171234567",
    "date": "2025-12-04",
    "day": "Wednesday",
    "year": 2025,
    "timeIn": "06:30 AM",
    "status": "present"
  }
]
```

### AI Assistant

#### Chat with AI
```bash
curl -X POST "https://your-app.replit.app/api/ai/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How many students are present today?"
  }'
```

### Admin

#### Get Passkey (for QR Generator)
```bash
curl -X GET "https://your-app.replit.app/api/config/passkey"
```

#### Reset All Data
```bash
curl -X POST "https://your-app.replit.app/api/reset" \
  -H "x-api-password: YOUR_PASSKEY"
```

### Maintenance Mode

Control website availability with maintenance mode. When enabled, all visitors will see a "Under Maintenance" page instead of the normal dashboard.

#### Check Maintenance Status (Public - No Password Required)
```bash
curl -X GET "https://your-app.replit.app/api/maintenance/status"
```

**Response:**
```json
{
  "enabled": false,
  "message": "We are currently performing scheduled maintenance. Please check back soon.",
  "enabledAt": null
}
```

#### Enable Maintenance Mode (Requires Password)
```bash
curl -X POST "https://your-app.replit.app/api/maintenance/on" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "YOUR_PASSKEY",
    "message": "We are updating the system. Please check back in 30 minutes."
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Maintenance mode enabled",
  "maintenance": {
    "enabled": true,
    "message": "We are updating the system. Please check back in 30 minutes.",
    "enabledAt": "2025-12-04T08:00:00.000Z"
  }
}
```

**Note:** The `message` field is optional. If not provided, the default message will be used.

#### Disable Maintenance Mode (Requires Password)
```bash
curl -X POST "https://your-app.replit.app/api/maintenance/off" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "YOUR_PASSKEY"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Maintenance mode disabled. Website is now live.",
  "maintenance": {
    "enabled": false
  }
}
```

## SMS Notification Format

When a student is scanned, the parent receives an SMS:
```
Juan Dela Cruz is arrived at 6:30 AM. Grade 7 - Love. - KNHS Guidance
```

## Student JSON Files

Students are loaded from the following files:
- `student/g7.json` - Grade 7 students
- `student/g8.json` - Grade 8 students
- `student/g9.json` - Grade 9 students
- `student/g10.json` - Grade 10 students

### JSON Format
```json
{
  "grade": "7",
  "section": "Love",
  "students": [
    {
      "name": "Andrade, Maria Santos",
      "gender": "female",
      "lrn": "123456789012",
      "contact": "09171234567"
    }
  ]
}
```

## Dashboard Features

- **Present Count**: Students scanned before 7:00 AM
- **Late Count**: Students scanned between 7:00-7:15 AM
- **Absent Count**: Students not scanned by 7:15 AM
- **Total Scanned**: All students scanned today
- **Weekly Trends**: Bar chart showing 7-day attendance patterns
- **Live Feed**: Real-time updates of scanned students

## QR Code Content

Each QR code contains:
```json
{
  "n": "Student Name",
  "gn": "male/female",
  "g": "7",
  "s": "Love",
  "l": "123456789012",
  "c": "09171234567"
}
```

## Tech Stack

- Frontend: React, Vite, TailwindCSS, shadcn/ui
- Backend: Express.js, Node.js
- Database: PostgreSQL with Drizzle ORM
- SMS: Twilio
- AI: Groq (Llama 3.3)
- QR: react-qr-code, html5-qrcode

## Development

```bash
# Install dependencies
npm install && npm run build


# Start development server
npm run start
```

## Made by Norch Team for Kaysuyo National High School
