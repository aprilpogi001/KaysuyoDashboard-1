import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Students table
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  studentId: varchar("student_id", { length: 50 }).notNull().unique(),
  name: text("name").notNull(),
  gender: varchar("gender", { length: 30 }).default("rather_not_say"),
  grade: varchar("grade", { length: 10 }).notNull(),
  section: varchar("section", { length: 50 }).notNull(),
  lrn: varchar("lrn", { length: 20 }),
  parentContact: varchar("parent_contact", { length: 20 }).notNull(),
  parentEmail: varchar("parent_email", { length: 100 }),
  qrData: text("qr_data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Attendance records table
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  studentId: varchar("student_id", { length: 50 }).notNull(),
  studentName: text("student_name").notNull(),
  grade: varchar("grade", { length: 10 }).notNull(),
  section: varchar("section", { length: 50 }).notNull(),
  date: varchar("date", { length: 20 }).notNull(),
  timeIn: varchar("time_in", { length: 20 }),
  status: varchar("status", { length: 20 }).notNull(),
  smsNotified: boolean("sms_notified").default(false).notNull(),
  emailNotified: boolean("email_notified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
});

// Types
export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
