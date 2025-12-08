import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, type InsertStudent } from "./storage";
import { sendSMS } from "./sms";
import { sendEmail, createAttendanceEmail } from "./email";
import { getPhilippineDateTime, getPhilippineDate, getPhilippineDateOnly } from "./timezone";
import * as fs from "fs";
import * as path from "path";
import { z } from "zod";

const insertStudentSchema = z.object({
  studentId: z.string(),
  name: z.string(),
  gender: z.string().optional(),
  grade: z.string(),
  section: z.string(),
  lrn: z.string().optional(),
  parentContact: z.string(),
  parentEmail: z.string().optional(),
  qrData: z.string(),
});

const API_PASSWORD = process.env.API_PASSWORD || "";
const GROQ_API_KEY = process.env.GROQ_KEY || "";

// Maintenance mode state
let maintenanceMode = {
  enabled: false,
  message: "We are currently performing scheduled maintenance. Please check back soon.",
  enabledAt: null as Date | null,
  enabledBy: "admin",
};

const PUBLIC_GET_PATTERNS = [
  "/config/passkey",
  "/attendance/stats/today",
  "/attendance/recent",
  "/attendance/weekly",
  "/attendance/date/",
  "/students/json",
  "/students/grade/",
  "/students",
  "/maintenance/status",
];

const PUBLIC_POST_PATTERNS = [
  "/attendance/scan",
  "/ai/chat",
  "/auth/verify-scanner",
  "/maintenance/on",
  "/maintenance/off",
];

function requireApiPassword(req: Request, res: Response, next: NextFunction) {
  const isPublicGet = req.method === 'GET' && PUBLIC_GET_PATTERNS.some(pattern => req.path.includes(pattern));
  const isPublicPost = req.method === 'POST' && PUBLIC_POST_PATTERNS.some(pattern => req.path.includes(pattern));
  
  if (isPublicGet || isPublicPost) {
    return next();
  }

  if (!API_PASSWORD) {
    return next();
  }
  
  const password = req.headers["x-api-password"] as string;
  
  if (!password || password !== API_PASSWORD) {
    return res.status(401).json({ error: "Invalid or missing API password" });
  }
  
  next();
}

const KNHS_SYSTEM_PROMPT = `You are the KNHS AI Assistant, a helpful and friendly AI made by Norch Team for Kaysuyo National High School's Guidance & Attendance Dashboard.

Your Role:
- Help users navigate the dashboard (Home, Attendance, Scanner, QR Generator, Rules)
- Answer questions about school policies, attendance rules, and student records
- Provide navigation commands when users want to go somewhere
- Speak in Tagalog, English, or Taglish based on user preference

Dashboard Navigation:
- Home/Dashboard: "/" - View attendance stats and overview
- Attendance: "/attendance" - View student lists by grade level (Grade 7-10)
- Attendance by Grade: "/attendance/7", "/attendance/8", "/attendance/9", "/attendance/10"
- Scanner: "/scanner" - Scan QR codes to record attendance
- QR Generator: "/qr-generator" - Create student ID with QR (needs passkey: KNHS2025)
- Rules: "/rules" - View school rules and policies

Attendance Time Rules:
- Before 7:00 AM: Present (On Time)
- 7:00 AM - 7:15 AM: Late
- After 7:15 AM or not scanned: Absent
- 6:00 AM - 7:00 AM: Pending status (can change to Present when scanned)

School Policies (Kaysuyo National High School):
- Classes start at 7:00 AM, students should arrive by 6:45 AM
- Late arrivals: After 7:00 AM until 7:15 AM
- Absent: Not scanned by 7:15 AM
- Three (3) late = one (1) absence notification
- Uniform required Monday-Friday
- QR ID must be worn and scanned daily

When users ask to go somewhere, respond with a JSON action like:
{"action": "navigate", "path": "/attendance/9"}

Be helpful, respectful, and professional. Keep responses concise but informative.`;

// Load students from JSON files
function loadStudentsFromJson(): any[] {
  const studentDir = path.join(process.cwd(), "student");
  const files = ["g7.json", "g8.json", "g9.json", "g10.json"];
  const allStudents: any[] = [];

  for (const file of files) {
    try {
      const filePath = path.join(studentDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(content);
        const grade = data.grade;
        const section = data.section;
        
        if (data.students && Array.isArray(data.students)) {
          data.students.forEach((student: any) => {
            allStudents.push({
              ...student,
              grade,
              section,
            });
          });
        }
      }
    } catch (error) {
      console.error(`Error loading ${file}:`, error);
    }
  }

  return allStudents;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Apply password protection to all /api routes
  app.use("/api", requireApiPassword);

  // Get API password for frontend (QR Generator)
  app.get("/api/config/passkey", (req, res) => {
    res.json({ passkey: API_PASSWORD || "" });
  });

  // Verify scanner password (secure - doesn't expose the password)
  app.post("/api/auth/verify-scanner", (req, res) => {
    const { password } = req.body;
    
    if (!API_PASSWORD) {
      return res.status(500).json({ success: false, error: "Password not configured" });
    }
    
    if (password === API_PASSWORD) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, error: "Invalid password" });
    }
  });

  // ==================== MAINTENANCE MODE ENDPOINTS ====================
  
  // Get maintenance status (public - no password required)
  app.get("/api/maintenance/status", (req, res) => {
    res.json({
      enabled: maintenanceMode.enabled,
      message: maintenanceMode.message,
      enabledAt: maintenanceMode.enabledAt,
    });
  });

  // Enable maintenance mode (requires password)
  app.post("/api/maintenance/on", (req, res) => {
    const { password, message } = req.body;
    
    if (!API_PASSWORD) {
      return res.status(500).json({ success: false, error: "Admin password not configured" });
    }
    
    if (!password || password !== API_PASSWORD) {
      return res.status(401).json({ success: false, error: "Invalid admin password" });
    }
    
    maintenanceMode.enabled = true;
    maintenanceMode.enabledAt = new Date();
    if (message) {
      maintenanceMode.message = message;
    }
    
    console.log(`[MAINTENANCE] Mode ENABLED at ${maintenanceMode.enabledAt.toISOString()}`);
    
    res.json({
      success: true,
      message: "Maintenance mode enabled",
      maintenance: {
        enabled: maintenanceMode.enabled,
        message: maintenanceMode.message,
        enabledAt: maintenanceMode.enabledAt,
      }
    });
  });

  // Disable maintenance mode (requires password)
  app.post("/api/maintenance/off", (req, res) => {
    const { password } = req.body;
    
    if (!API_PASSWORD) {
      return res.status(500).json({ success: false, error: "Admin password not configured" });
    }
    
    if (!password || password !== API_PASSWORD) {
      return res.status(401).json({ success: false, error: "Invalid admin password" });
    }
    
    const wasEnabledAt = maintenanceMode.enabledAt;
    maintenanceMode.enabled = false;
    maintenanceMode.enabledAt = null;
    maintenanceMode.message = "We are currently performing scheduled maintenance. Please check back soon.";
    
    console.log(`[MAINTENANCE] Mode DISABLED. Was enabled since ${wasEnabledAt?.toISOString() || 'unknown'}`);
    
    res.json({
      success: true,
      message: "Maintenance mode disabled. Website is now live.",
      maintenance: {
        enabled: maintenanceMode.enabled,
      }
    });
  });

  // ==================== END MAINTENANCE MODE ====================

  // Reset all data endpoint
  app.post("/api/reset", async (req, res) => {
    try {
      await storage.resetAll();
      res.json({ success: true, message: "All data has been reset" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get students from JSON files
  app.get("/api/students/json", (req, res) => {
    try {
      const students = loadStudentsFromJson();
      res.json(students);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get students from JSON by grade
  app.get("/api/students/json/:grade", (req, res) => {
    try {
      const students = loadStudentsFromJson();
      const filtered = students.filter(s => s.grade === req.params.grade);
      res.json(filtered);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create student (from QR Generator)
  app.post("/api/students", async (req, res) => {
    try {
      const validated = insertStudentSchema.parse(req.body);
      const student = await storage.createStudent(validated);
      res.json(student);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get students by grade
  app.get("/api/students/grade/:grade", async (req, res) => {
    try {
      const students = await storage.getStudentsByGrade(req.params.grade);
      res.json(students);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all students
  app.get("/api/students", async (req, res) => {
    try {
      const students = await storage.getAllStudents();
      res.json(students);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Record attendance via QR scan
  app.post("/api/attendance/scan", async (req, res) => {
    try {
      const { qrData } = req.body;
      
      // Parse QR code data
      const parsed = JSON.parse(qrData);
      const studentId = `${parsed.g}-${parsed.s}-${parsed.n.replace(/\s+/g, '')}`;
      
      // Get student info
      let student = await storage.getStudent(studentId);
      
      // If student doesn't exist, create from QR data
      if (!student) {
        student = await storage.createStudent({
          studentId,
          name: parsed.n,
          gender: parsed.gn || "rather_not_say",
          grade: parsed.g,
          section: parsed.s,
          lrn: parsed.l || "",
          parentContact: parsed.c,
          parentEmail: parsed.e || "",
          qrData: qrData,
        });
      }

      // Get current time details in Philippines timezone (Asia/Manila, UTC+8)
      const phDateTime = getPhilippineDateTime();
      const currentTime = phDateTime.time;
      const totalMinutes = phDateTime.totalMinutes;
      
      // Time rules (based on Philippines time):
      // Before 7:00 AM (before 420 minutes) = Present
      // 7:00 AM - 7:15 AM (420-435 minutes) = Late
      // After 7:15 AM (after 435 minutes) = Absent (but still record as scanned)
      let status = "present";
      if (totalMinutes >= 420 && totalMinutes <= 435) {
        status = "late";
      } else if (totalMinutes > 435) {
        status = "late"; // Still mark as late if scanned, not absent
      }
      
      const currentDate = phDateTime.date;

      // Check if already scanned today
      const existingRecords = await storage.getAttendanceByDate(currentDate);
      const alreadyScanned = existingRecords.find(r => r.studentId === student!.studentId);
      
      if (alreadyScanned) {
        return res.json({
          success: true,
          attendance: alreadyScanned,
          smsSent: alreadyScanned.smsNotified,
          alreadyScanned: true,
          student: {
            name: student.name,
            grade: student.grade,
            section: student.section,
          }
        });
      }

      // Record attendance
      const attendance = await storage.recordAttendance({
        studentId: student.studentId,
        studentName: student.name,
        grade: student.grade,
        section: student.section,
        date: currentDate,
        timeIn: currentTime,
        status,
        smsNotified: false,
        emailNotified: false,
      });

      // Respond immediately - don't wait for SMS/email
      res.json({
        success: true,
        attendance,
        smsSent: false,
        emailSent: false,
        student: {
          name: student.name,
          grade: student.grade,
          section: student.section,
        }
      });

      // Send notifications in background (non-blocking)
      const arrivalTime = currentTime;
      
      // SMS notification (async - won't block response)
      (async () => {
        try {
          const smsMessage = `${student.name} is arrived at ${arrivalTime}. Grade ${student.grade} - ${student.section}. - KNHS Guidance`;
          const smsSent = await sendSMS({
            phoneNumber: student.parentContact,
            message: smsMessage,
          });
          if (smsSent) {
            try {
              await storage.updateAttendanceSmsStatus(attendance.id, true);
            } catch (storageErr) {
              console.error("SMS status update error:", storageErr);
            }
          }
        } catch (err) {
          console.error("SMS error:", err);
        }
      })();

      // Email notification (async - won't block response)
      if (student.parentEmail) {
        (async () => {
          try {
            const emailHtml = createAttendanceEmail(
              student.name,
              arrivalTime,
              student.grade,
              student.section,
              status
            );
            
            const emailSent = await sendEmail({
              to: student.parentEmail,
              subject: `KNHS Attendance: ${student.name} - ${status === 'present' ? 'On Time' : 'Late'}`,
              html: emailHtml,
            });
            if (emailSent) {
              try {
                await storage.updateAttendanceEmailStatus(attendance.id, true);
              } catch (storageErr) {
                console.error("Email status update error:", storageErr);
              }
            }
          } catch (err) {
            console.error("Email error:", err);
          }
        })();
      }

    } catch (error: any) {
      console.error("Scan error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Get attendance by date
  app.get("/api/attendance/date/:date", async (req, res) => {
    try {
      const records = await storage.getAttendanceByDate(req.params.date);
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get attendance by student
  app.get("/api/attendance/student/:studentId", async (req, res) => {
    try {
      const records = await storage.getAttendanceByStudent(req.params.studentId);
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get today's stats (Philippines timezone)
  app.get("/api/attendance/stats/today", async (req, res) => {
    try {
      const phDateTime = getPhilippineDateTime();
      const today = phDateTime.date;
      
      const records = await storage.getAttendanceByDate(today);
      const allStudents = await storage.getAllStudents();
      
      // Get students from JSON too for total count
      const jsonStudents = loadStudentsFromJson();
      const totalStudents = Math.max(allStudents.length, jsonStudents.length);
      
      const scannedStudents = records.filter(r => r.status !== "absent").length;
      
      const stats = {
        totalPresent: records.filter(r => r.status === "present").length,
        totalLate: records.filter(r => r.status === "late").length,
        totalAbsent: totalStudents - scannedStudents,
        totalScanned: scannedStudents,
        totalStudents,
        date: today,
        day: phDateTime.dayName,
        year: phDateTime.year,
      };

      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Chat endpoint (uses GROQ_KEY from env) with real-time attendance data
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      if (!GROQ_API_KEY) {
        return res.status(500).json({ error: "AI service not configured. GROQ_KEY is missing." });
      }

      // Get current date in Philippines timezone
      const phDateTime = getPhilippineDateTime();
      const today = phDateTime.date;
      const currentTime = phDateTime.time;
      const dayName = phDateTime.dayName;

      // Fetch real-time attendance data
      const todayRecords = await storage.getAttendanceByDate(today);
      const allStudents = await storage.getAllStudents();
      const jsonStudents = loadStudentsFromJson();
      const totalStudents = Math.max(allStudents.length, jsonStudents.length);
      
      const presentCount = todayRecords.filter(r => r.status === "present").length;
      const lateCount = todayRecords.filter(r => r.status === "late").length;
      const scannedCount = todayRecords.length;
      const absentCount = totalStudents - scannedCount;

      // Create attendance context for AI
      const attendanceContext = `
REAL-TIME DATA (as of ${currentTime}, ${dayName}, ${today}):
- Total Students: ${totalStudents}
- Present (On Time): ${presentCount}
- Late: ${lateCount}
- Absent/Not Scanned: ${absentCount}
- Total Scanned Today: ${scannedCount}

TODAY'S ATTENDANCE RECORDS:
${todayRecords.length > 0 ? todayRecords.map(r => 
  `- ${r.studentName} (Grade ${r.grade}-${r.section}): ${r.status.toUpperCase()} at ${r.timeIn}`
).join('\n') : 'No attendance records yet for today.'}

STUDENT LIST BY GRADE:
${['7', '8', '9', '10'].map(grade => {
  const gradeStudents = [...allStudents, ...jsonStudents].filter(s => s.grade === grade);
  const uniqueStudents = Array.from(new Set(gradeStudents.map(s => s.name))).slice(0, 10);
  return `Grade ${grade}: ${uniqueStudents.join(', ')}${gradeStudents.length > 10 ? ` and ${gradeStudents.length - 10} more...` : ''}`;
}).join('\n')}

When users ask about a specific student's status, search the TODAY'S ATTENDANCE RECORDS above and provide their actual status. If not found in records, they are likely absent or haven't scanned yet.
`;

      const enhancedSystemPrompt = KNHS_SYSTEM_PROMPT + "\n\n" + attendanceContext;

      // Call Groq API
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: enhancedSystemPrompt },
            { role: "user", content: message }
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Failed to get AI response");
      }

      const data = await response.json();
      const aiMessage = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

      // Check for navigation action in response
      let navigationPath = null;
      const actionMatch = aiMessage.match(/\{"action":\s*"navigate",\s*"path":\s*"([^"]+)"\}/);
      if (actionMatch) {
        navigationPath = actionMatch[1];
      }

      res.json({ 
        message: aiMessage.replace(/\{"action":\s*"navigate",\s*"path":\s*"[^"]+"\}/g, '').trim(),
        navigation: navigationPath 
      });

    } catch (error: any) {
      console.error("AI Chat error:", error);
      res.status(500).json({ error: error.message || "Failed to process AI request" });
    }
  });

  // Get recent attendance for live feed (last 20) - Philippines timezone
  app.get("/api/attendance/recent", async (req, res) => {
    try {
      const today = getPhilippineDateOnly();
      const records = await storage.getAttendanceByDate(today);
      const recent = records.slice(0, 20).map(r => ({
        id: r.id,
        studentName: r.studentName,
        grade: r.grade,
        section: r.section,
        timeIn: r.timeIn,
        status: r.status,
      }));
      res.json(recent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get weekly attendance stats - Philippines timezone
  app.get("/api/attendance/weekly", async (req, res) => {
    try {
      const weekData = [];
      
      for (let i = 6; i >= 0; i--) {
        const dayInfo = getPhilippineDate(-i);
        const records = await storage.getAttendanceByDate(dayInfo.date);
        
        weekData.push({
          date: dayInfo.date,
          day: dayInfo.dayShort,
          fullDay: dayInfo.dayFull,
          year: dayInfo.year,
          present: records.filter(r => r.status === 'present').length,
          late: records.filter(r => r.status === 'late').length,
          absent: records.filter(r => r.status === 'absent').length,
        });
      }
      
      res.json(weekData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get attendance by grade and date
  app.get("/api/attendance/grade/:grade/date/:date", async (req, res) => {
    try {
      const { grade, date } = req.params;
      const records = await storage.getAttendanceByGradeAndDate(grade, date);
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get attendance by date range (for multi-day reports)
  app.get("/api/attendance/range/:startDate/:endDate", async (req, res) => {
    try {
      const { startDate, endDate } = req.params;
      const records = await storage.getAttendanceByDateRange(startDate, endDate);
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get attendance list for API endpoint (public) - Philippines timezone
  app.get("/api/list/student/:gradeSection", async (req, res) => {
    try {
      const { gradeSection } = req.params;
      const [grade, section] = gradeSection.split("-");
      
      const phDateTime = getPhilippineDateTime();
      const today = phDateTime.date;
      
      const students = await storage.getStudentsByGrade(grade);
      const attendanceRecords = await storage.getAttendanceByDate(today);
      
      const result = students
        .filter(s => !section || s.section.toLowerCase() === section.toLowerCase())
        .map(student => {
          const attendance = attendanceRecords.find(r => r.studentId === student.studentId);
          return {
            name: student.name,
            lrn: student.lrn,
            grade: student.grade,
            section: student.section,
            gender: student.gender,
            contact: student.parentContact,
            date: today,
            day: phDateTime.dayName,
            year: phDateTime.year,
            timeIn: attendance?.timeIn || null,
            status: attendance?.status || "pending"
          };
        });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
