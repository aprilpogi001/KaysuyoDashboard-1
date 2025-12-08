import { db } from "./db";
import { students, attendance } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

export interface Student {
  id?: number;
  studentId: string;
  name: string;
  gender: string;
  grade: string;
  section: string;
  lrn: string;
  parentContact: string;
  parentEmail?: string;
  qrData: string;
  createdAt?: Date;
}

export interface InsertStudent {
  studentId: string;
  name: string;
  gender?: string;
  grade: string;
  section: string;
  lrn?: string;
  parentContact: string;
  parentEmail?: string;
  qrData: string;
}

export interface Attendance {
  id: number;
  studentId: string;
  studentName: string;
  grade: string;
  section: string;
  date: string;
  timeIn: string | null;
  status: string;
  smsNotified: boolean;
  emailNotified: boolean;
  createdAt?: Date;
}

export interface InsertAttendance {
  studentId: string;
  studentName: string;
  grade: string;
  section: string;
  date: string;
  timeIn?: string;
  status: string;
  smsNotified?: boolean;
  emailNotified?: boolean;
}

export interface IStorage {
  createStudent(student: InsertStudent): Promise<Student>;
  getStudent(studentId: string): Promise<Student | undefined>;
  getStudentsByGrade(grade: string): Promise<Student[]>;
  getAllStudents(): Promise<Student[]>;
  updateStudent(studentId: string, data: Partial<InsertStudent>): Promise<Student | undefined>;
  
  recordAttendance(record: InsertAttendance): Promise<Attendance>;
  getAttendanceByDate(date: string): Promise<Attendance[]>;
  getAttendanceByStudent(studentId: string): Promise<Attendance[]>;
  getAttendanceByGradeAndDate(grade: string, date: string): Promise<Attendance[]>;
  getAttendanceByDateRange(startDate: string, endDate: string): Promise<Attendance[]>;
  updateAttendanceSmsStatus(id: number, notified: boolean): Promise<void>;
  updateAttendanceEmailStatus(id: number, notified: boolean): Promise<void>;
  markAbsent(studentId: string, date: string): Promise<Attendance>;
  
  resetAll(): Promise<void>;
}

function loadStudentsFromJson(): Student[] {
  const studentDir = path.join(process.cwd(), "student");
  const files = ["g7.json", "g8.json", "g9.json", "g10.json"];
  const allStudents: Student[] = [];

  for (const file of files) {
    try {
      const filePath = path.join(studentDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(content);
        const grade = data.grade;
        const section = data.section;
        
        if (data.students && Array.isArray(data.students)) {
          data.students.forEach((student: any, index: number) => {
            const studentId = `${grade}-${section}-${student.name.replace(/\s+/g, '')}`;
            allStudents.push({
              id: index + 1,
              studentId,
              name: student.name,
              gender: student.gender || "rather_not_say",
              grade,
              section,
              lrn: student.lrn || "",
              parentContact: student.contact || "",
              parentEmail: student.email || "",
              qrData: JSON.stringify({
                n: student.name,
                g: grade,
                s: section,
                gn: student.gender,
                l: student.lrn,
                c: student.contact,
                e: student.email
              }),
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

export class DatabaseStorage implements IStorage {
  async createStudent(student: InsertStudent): Promise<Student> {
    try {
      const existing = await db.select().from(students).where(eq(students.studentId, student.studentId));
      
      if (existing.length > 0) {
        await db.update(students)
          .set({
            name: student.name,
            gender: student.gender || 'rather_not_say',
            grade: student.grade,
            section: student.section,
            lrn: student.lrn || '',
            parentContact: student.parentContact,
            parentEmail: student.parentEmail || '',
            qrData: student.qrData,
          })
          .where(eq(students.studentId, student.studentId));
        
        return {
          id: existing[0].id,
          studentId: student.studentId,
          name: student.name,
          gender: student.gender || 'rather_not_say',
          grade: student.grade,
          section: student.section,
          lrn: student.lrn || '',
          parentContact: student.parentContact,
          parentEmail: student.parentEmail || '',
          qrData: student.qrData,
        };
      }

      const result = await db.insert(students).values({
        studentId: student.studentId,
        name: student.name,
        gender: student.gender || 'rather_not_say',
        grade: student.grade,
        section: student.section,
        lrn: student.lrn || '',
        parentContact: student.parentContact,
        parentEmail: student.parentEmail || '',
        qrData: student.qrData,
      }).returning();

      return {
        id: result[0].id,
        studentId: result[0].studentId,
        name: result[0].name,
        gender: result[0].gender || 'rather_not_say',
        grade: result[0].grade,
        section: result[0].section,
        lrn: result[0].lrn || '',
        parentContact: result[0].parentContact,
        parentEmail: result[0].parentEmail || '',
        qrData: result[0].qrData,
      };
    } catch (error) {
      console.error('PostgreSQL createStudent error:', error);
      throw error;
    }
  }

  async getStudent(studentId: string): Promise<Student | undefined> {
    const jsonStudents = loadStudentsFromJson();
    const foundInJson = jsonStudents.find(s => s.studentId === studentId);
    if (foundInJson) return foundInJson;

    try {
      const result = await db.select().from(students).where(eq(students.studentId, studentId));
      if (result.length > 0) {
        const row = result[0];
        return {
          id: row.id,
          studentId: row.studentId,
          name: row.name,
          gender: row.gender || 'rather_not_say',
          grade: row.grade,
          section: row.section,
          lrn: row.lrn || '',
          parentContact: row.parentContact,
          parentEmail: row.parentEmail || '',
          qrData: row.qrData,
        };
      }
    } catch (error) {
      console.error('PostgreSQL getStudent error:', error);
    }
    return undefined;
  }

  async getStudentsByGrade(grade: string): Promise<Student[]> {
    const jsonStudents = loadStudentsFromJson().filter(s => s.grade === grade);
    const jsonStudentIds = new Set(jsonStudents.map(s => s.studentId));

    try {
      const dbStudents = await db.select().from(students).where(eq(students.grade, grade));
      const additionalDbStudents = dbStudents
        .filter(s => !jsonStudentIds.has(s.studentId))
        .map(row => ({
          id: row.id,
          studentId: row.studentId,
          name: row.name,
          gender: row.gender || 'rather_not_say',
          grade: row.grade,
          section: row.section,
          lrn: row.lrn || '',
          parentContact: row.parentContact,
          parentEmail: row.parentEmail || '',
          qrData: row.qrData,
        }));

      return [...jsonStudents, ...additionalDbStudents];
    } catch (error) {
      console.error('PostgreSQL getStudentsByGrade error:', error);
      return jsonStudents;
    }
  }

  async getAllStudents(): Promise<Student[]> {
    const jsonStudents = loadStudentsFromJson();
    const jsonStudentIds = new Set(jsonStudents.map(s => s.studentId));

    try {
      const dbStudents = await db.select().from(students);
      const additionalDbStudents = dbStudents
        .filter(s => !jsonStudentIds.has(s.studentId))
        .map(row => ({
          id: row.id,
          studentId: row.studentId,
          name: row.name,
          gender: row.gender || 'rather_not_say',
          grade: row.grade,
          section: row.section,
          lrn: row.lrn || '',
          parentContact: row.parentContact,
          parentEmail: row.parentEmail || '',
          qrData: row.qrData,
        }));

      return [...jsonStudents, ...additionalDbStudents];
    } catch (error) {
      console.error('PostgreSQL getAllStudents error:', error);
      return jsonStudents;
    }
  }

  async updateStudent(studentId: string, data: Partial<InsertStudent>): Promise<Student | undefined> {
    try {
      const result = await db.update(students)
        .set(data)
        .where(eq(students.studentId, studentId))
        .returning();

      if (result.length > 0) {
        const row = result[0];
        return {
          id: row.id,
          studentId: row.studentId,
          name: row.name,
          gender: row.gender || 'rather_not_say',
          grade: row.grade,
          section: row.section,
          lrn: row.lrn || '',
          parentContact: row.parentContact,
          parentEmail: row.parentEmail || '',
          qrData: row.qrData,
        };
      }
    } catch (error) {
      console.error('PostgreSQL updateStudent error:', error);
    }
    return undefined;
  }

  async recordAttendance(record: InsertAttendance): Promise<Attendance> {
    try {
      const result = await db.insert(attendance).values({
        studentId: record.studentId,
        studentName: record.studentName,
        grade: record.grade,
        section: record.section,
        date: record.date,
        timeIn: record.timeIn || null,
        status: record.status,
        smsNotified: record.smsNotified || false,
        emailNotified: record.emailNotified || false,
      }).returning();

      return {
        id: result[0].id,
        studentId: result[0].studentId,
        studentName: result[0].studentName,
        grade: result[0].grade,
        section: result[0].section,
        date: result[0].date,
        timeIn: result[0].timeIn,
        status: result[0].status,
        smsNotified: result[0].smsNotified,
        emailNotified: result[0].emailNotified,
      };
    } catch (error) {
      console.error('PostgreSQL recordAttendance error:', error);
      throw error;
    }
  }

  async getAttendanceByDate(date: string): Promise<Attendance[]> {
    try {
      const result = await db.select()
        .from(attendance)
        .where(eq(attendance.date, date))
        .orderBy(desc(attendance.createdAt));

      return result.map(row => ({
        id: row.id,
        studentId: row.studentId,
        studentName: row.studentName,
        grade: row.grade,
        section: row.section,
        date: row.date,
        timeIn: row.timeIn,
        status: row.status,
        smsNotified: row.smsNotified,
        emailNotified: row.emailNotified,
      }));
    } catch (error) {
      console.error('PostgreSQL getAttendanceByDate error:', error);
      return [];
    }
  }

  async getAttendanceByStudent(studentId: string): Promise<Attendance[]> {
    try {
      const result = await db.select()
        .from(attendance)
        .where(eq(attendance.studentId, studentId))
        .orderBy(desc(attendance.date));

      return result.map(row => ({
        id: row.id,
        studentId: row.studentId,
        studentName: row.studentName,
        grade: row.grade,
        section: row.section,
        date: row.date,
        timeIn: row.timeIn,
        status: row.status,
        smsNotified: row.smsNotified,
        emailNotified: row.emailNotified,
      }));
    } catch (error) {
      console.error('PostgreSQL getAttendanceByStudent error:', error);
      return [];
    }
  }

  async getAttendanceByGradeAndDate(grade: string, date: string): Promise<Attendance[]> {
    try {
      const result = await db.select()
        .from(attendance)
        .where(and(eq(attendance.grade, grade), eq(attendance.date, date)));

      return result.map(row => ({
        id: row.id,
        studentId: row.studentId,
        studentName: row.studentName,
        grade: row.grade,
        section: row.section,
        date: row.date,
        timeIn: row.timeIn,
        status: row.status,
        smsNotified: row.smsNotified,
        emailNotified: row.emailNotified,
      }));
    } catch (error) {
      console.error('PostgreSQL getAttendanceByGradeAndDate error:', error);
      return [];
    }
  }

  async getAttendanceByDateRange(startDate: string, endDate: string): Promise<Attendance[]> {
    try {
      const { gte, lte } = await import("drizzle-orm");
      const result = await db.select()
        .from(attendance)
        .where(and(
          gte(attendance.date, startDate),
          lte(attendance.date, endDate)
        ))
        .orderBy(desc(attendance.date), desc(attendance.createdAt));

      return result.map(row => ({
        id: row.id,
        studentId: row.studentId,
        studentName: row.studentName,
        grade: row.grade,
        section: row.section,
        date: row.date,
        timeIn: row.timeIn,
        status: row.status,
        smsNotified: row.smsNotified,
        emailNotified: row.emailNotified,
      }));
    } catch (error) {
      console.error('PostgreSQL getAttendanceByDateRange error:', error);
      return [];
    }
  }

  async updateAttendanceSmsStatus(id: number, notified: boolean): Promise<void> {
    try {
      await db.update(attendance)
        .set({ smsNotified: notified })
        .where(eq(attendance.id, id));
    } catch (error) {
      console.error('PostgreSQL updateAttendanceSmsStatus error:', error);
    }
  }

  async updateAttendanceEmailStatus(id: number, notified: boolean): Promise<void> {
    try {
      await db.update(attendance)
        .set({ emailNotified: notified })
        .where(eq(attendance.id, id));
    } catch (error) {
      console.error('PostgreSQL updateAttendanceEmailStatus error:', error);
    }
  }

  async markAbsent(studentId: string, date: string): Promise<Attendance> {
    const student = await this.getStudent(studentId);
    if (!student) throw new Error("Student not found");

    return this.recordAttendance({
      studentId: student.studentId,
      studentName: student.name,
      grade: student.grade,
      section: student.section,
      date,
      status: "absent",
      smsNotified: false,
      emailNotified: false,
    });
  }

  async resetAll(): Promise<void> {
    try {
      await db.delete(attendance);
      await db.delete(students);
    } catch (error) {
      console.error('PostgreSQL resetAll error:', error);
    }
  }
}

export const storage = new DatabaseStorage();
