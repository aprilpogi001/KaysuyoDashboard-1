import { format } from "date-fns";

export interface Student {
  id: string;
  name: string;
  grade: string;
  section: string;
  lrn: string;
  parentContact: string;
  status: "present" | "absent" | "late" | "unmarked";
  timeIn?: string;
}

export interface AttendanceRecord {
  date: string;
  present: number;
  absent: number;
  late: number;
  total: number;
}

export const MOCK_STUDENTS: Student[] = [];

export const GRADE_LEVELS = [
  { level: "7", sections: ["Love"] },
  { level: "8", sections: ["Joy"] },
  { level: "9", sections: ["Peace"] },
  { level: "10", sections: ["Hope"] },
];

export const RECENT_ACTIVITY: { id: number; message: string; type: string; timestamp: string }[] = [];
