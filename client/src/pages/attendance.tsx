import { MainLayout } from "@/components/layout/MainLayout";
import { StudentTable } from "@/components/StudentTable";
import { GRADE_LEVELS } from "@/lib/mockData";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Users, Search, ArrowLeft, FileText, Calendar as CalendarIcon } from "lucide-react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, setApiPassword, getApiPassword } from "@/lib/api";
import { getPhilippineDateString } from "@/lib/timezone";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

export default function Attendance() {
  const [match, params] = useRoute("/attendance/:grade?");
  const selectedGrade = match ? params?.grade : null;
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    async function initializeAuth() {
      if (!getApiPassword()) {
        try {
          const res = await fetch("/api/config/passkey");
          if (res.ok) {
            const data = await res.json();
            if (data.passkey) {
              setApiPassword(data.passkey);
            }
          }
        } catch (error) {
          console.error("Failed to initialize auth:", error);
        }
      }
    }
    initializeAuth();
  }, []);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students", selectedGrade],
    queryFn: async () => {
      if (!selectedGrade) return [];
      const response = await apiFetch(`/api/students/grade/${selectedGrade}`);
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      
      // Use centralized Philippines timezone helper
      const today = getPhilippineDateString();
      
      const attendanceRes = await apiFetch(`/api/attendance/date/${today}`);
      const attendanceRecords = attendanceRes.ok ? await attendanceRes.json() : [];
      
      return data.map((student: any) => {
        const attendanceToday = attendanceRecords.find((r: any) => r.studentId === student.studentId);
        return {
          id: student.studentId,
          name: student.name,
          section: student.section,
          grade: student.grade,
          gender: student.gender || "rather_not_say",
          lrn: student.lrn,
          parentContact: student.parentContact,
          status: attendanceToday?.status || "unmarked",
          timeIn: attendanceToday?.timeIn || undefined,
          qrData: student.qrData,
        };
      });
    },
    enabled: !!selectedGrade,
    refetchInterval: 5000,
  });

  const filteredStudents = students.filter((s: any) => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.section.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportToPDF = () => {
    const doc = new jsPDF();
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-PH", { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Kaysuyo National High School", 105, 15, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Attendance Report", 105, 22, { align: "center" });
    doc.text(`Grade ${selectedGrade}`, 105, 28, { align: "center" });
    doc.text(dateStr, 105, 34, { align: "center" });

    const tableData = filteredStudents.map((student: any, index: number) => [
      index + 1,
      student.name,
      student.section,
      student.timeIn || "-",
      student.status.toUpperCase()
    ]);

    autoTable(doc, {
      startY: 42,
      head: [["#", "Student Name", "Section", "Time In", "Status"]],
      body: tableData,
      theme: "grid",
      headStyles: { 
        fillColor: [26, 54, 93],
        textColor: 255,
        fontStyle: "bold"
      },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 15, halign: "center" },
        4: { halign: "center" }
      },
      styles: { fontSize: 9 }
    });

    const presentCount = filteredStudents.filter((s: any) => s.status === "present").length;
    const lateCount = filteredStudents.filter((s: any) => s.status === "late").length;
    const absentCount = filteredStudents.filter((s: any) => s.status === "absent" || s.status === "unmarked").length;

    const finalY = (doc as any).lastAutoTable.finalY || 50;
    doc.setFontSize(10);
    doc.text(`Summary: Present: ${presentCount} | Late: ${lateCount} | Absent/Unmarked: ${absentCount} | Total: ${filteredStudents.length}`, 14, finalY + 10);
    doc.text("Generated by KNHS Guidance Dashboard - April Manalo", 14, finalY + 18);

    doc.save(`KNHS_Attendance_Grade${selectedGrade}_${today.toISOString().split('T')[0]}.pdf`);
    
    toast({
      title: "PDF Downloaded",
      description: `Attendance report for Grade ${selectedGrade} has been saved.`,
    });
  };

  const exportDateRangePDF = async () => {
    if (!startDate || !endDate || !selectedGrade) {
      toast({
        title: "Piliin ang Petsa",
        description: "Piliin muna ang start at end date para sa report.",
        variant: "destructive",
      });
      return;
    }

    if (startDate > endDate) {
      toast({
        title: "Invalid na Petsa",
        description: "Ang start date ay dapat mas maaga kaysa end date.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const startStr = format(startDate, "yyyy-MM-dd");
      const endStr = format(endDate, "yyyy-MM-dd");
      
      const [studentsRes, attendanceRes] = await Promise.all([
        apiFetch(`/api/students/grade/${selectedGrade}`),
        apiFetch(`/api/attendance/range/${startStr}/${endStr}`)
      ]);
      
      if (!studentsRes.ok) {
        throw new Error("Failed to fetch students");
      }
      
      if (!attendanceRes.ok) {
        if (attendanceRes.status === 401) {
          throw new Error("Hindi authenticated. Mag-login muna sa Scanner page bago mag-export.");
        }
        throw new Error("Failed to fetch attendance records");
      }
      
      const studentsData = await studentsRes.json();
      const attendanceRecords = await attendanceRes.json();
      
      const doc = new jsPDF('landscape', 'mm', 'a4');
      
      // Get all dates in range
      const allDates: Date[] = [];
      const currentDate = new Date(startDate);
      const end = new Date(endDate);
      while (currentDate <= end) {
        allDates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Group dates by month
      const monthGroups: { [key: string]: Date[] } = {};
      allDates.forEach(date => {
        const monthKey = format(date, "MMMM yyyy");
        if (!monthGroups[monthKey]) {
          monthGroups[monthKey] = [];
        }
        monthGroups[monthKey].push(date);
      });

      // Create one page per month
      Object.entries(monthGroups).forEach(([monthName, dates], monthIndex) => {
        if (monthIndex > 0) {
          doc.addPage('landscape');
        }

        // Header
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Kaysuyo National High School", 148, 12, { align: "center" });
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Attendance Tracking Sheet - Grade ${selectedGrade}`, 148, 18, { align: "center" });
        doc.text(`Month: ${monthName}`, 148, 24, { align: "center" });

        // Create table data with color-coded cells
        const tableData = studentsData.map((student: any, index: number) => {
          const row: any[] = [index + 1, student.name];
          
          dates.forEach(date => {
            const dateStr = format(date, "yyyy-MM-dd");
            const record = attendanceRecords.find(
              (r: any) => r.studentId === student.studentId && r.date === dateStr
            );
            
            const dayInitial = format(date, "EEE").charAt(0); // M, T, W, etc.
            row.push(dayInitial);
          });
          
          return row;
        });

        // Create header with date columns
        const headerRow = ["#", "Student Name"];
        dates.forEach(date => {
          headerRow.push(format(date, "d")); // Day number
        });

        autoTable(doc, {
          startY: 30,
          head: [headerRow],
          body: tableData,
          theme: "grid",
          headStyles: { 
            fillColor: [26, 54, 93],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 7,
            halign: "center"
          },
          columnStyles: {
            0: { cellWidth: 8, halign: "center" },
            1: { cellWidth: 45, halign: "left" }
          },
          styles: { 
            fontSize: 6, 
            cellPadding: 1.5,
            halign: "center",
            lineWidth: 0.1,
            lineColor: [200, 200, 200]
          },
          didParseCell: function(data) {
            // Color code the cells based on attendance status
            if (data.section === 'body' && data.column.index >= 2) {
              const studentIndex = data.row.index;
              const dateIndex = data.column.index - 2;
              const date = dates[dateIndex];
              const dateStr = format(date, "yyyy-MM-dd");
              const student = studentsData[studentIndex];
              
              const record = attendanceRecords.find(
                (r: any) => r.studentId === student.studentId && r.date === dateStr
              );
              
              if (record) {
                if (record.status === "present") {
                  data.cell.styles.fillColor = [30, 58, 95]; // Dark Blue
                  data.cell.styles.textColor = [255, 255, 255];
                } else if (record.status === "late") {
                  data.cell.styles.fillColor = [184, 134, 11]; // Dark Yellow/Goldenrod
                  data.cell.styles.textColor = [255, 255, 255];
                } else {
                  data.cell.styles.fillColor = [178, 34, 34]; // Red/Firebrick
                  data.cell.styles.textColor = [255, 255, 255];
                }
              } else {
                data.cell.styles.fillColor = [178, 34, 34]; // Red for absent/unmarked
                data.cell.styles.textColor = [255, 255, 255];
              }
            }
          }
        });

        // Legend
        const finalY = (doc as any).lastAutoTable.finalY || 30;
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("Legend:", 14, finalY + 8);
        
        doc.setFillColor(30, 58, 95);
        doc.rect(30, finalY + 5, 5, 4, 'F');
        doc.setFont("helvetica", "normal");
        doc.text("Present", 37, finalY + 8);
        
        doc.setFillColor(184, 134, 11);
        doc.rect(55, finalY + 5, 5, 4, 'F');
        doc.text("Late", 62, finalY + 8);
        
        doc.setFillColor(178, 34, 34);
        doc.rect(75, finalY + 5, 5, 4, 'F');
        doc.text("Absent", 82, finalY + 8);

        // Footer
        doc.setFontSize(7);
        doc.text("Generated by KNHS Guidance Dashboard - April Manalo", 14, finalY + 15);
      });

      doc.save(`KNHS_Attendance_Calendar_Grade${selectedGrade}_${startStr}_to_${endStr}.pdf`);
      
      toast({
        title: "PDF Downloaded",
        description: `Calendar-style attendance report for Grade ${selectedGrade} has been saved.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 md:space-y-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {selectedGrade && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mb-2 -ml-2 text-muted-foreground"
                  onClick={() => setLocation("/attendance")}
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back to Grades
                </Button>
              )}
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-page-title">
                {selectedGrade ? `Grade ${selectedGrade} Attendance` : "Attendance Overview"}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1">
                {selectedGrade 
                  ? "Manage and view daily attendance records for this grade level." 
                  : "Select a grade level to view student records."}
              </p>
            </div>
            
            {selectedGrade && filteredStudents.length > 0 && (
              <Button 
                variant="default" 
                size="sm"
                onClick={exportToPDF}
                className="shrink-0"
                data-testid="button-export-pdf"
              >
                <FileText className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Export PDF</span>
              </Button>
            )}
          </div>
        </div>

        {!selectedGrade ? (
          <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-3">
            {GRADE_LEVELS.map((level) => (
              <div 
                key={level.level}
                className="block group cursor-pointer"
                onClick={() => setLocation(`/attendance/${level.level}`)}
                data-testid={`card-grade-${level.level}`}
              >
                <Card className="h-full border-t-4 border-t-transparent hover:border-t-primary transition-all duration-300 hover:shadow-md cursor-pointer">
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-lg md:text-xl font-serif">Grade {level.level}</span>
                      <Users className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      {level.sections.length} Sections
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
                    <div className="flex flex-wrap gap-1 md:gap-2 mb-3 md:mb-4">
                      {level.sections.slice(0, 3).map((section) => (
                        <span key={section} className="text-[10px] md:text-xs bg-secondary/20 text-secondary-foreground px-1.5 md:px-2 py-0.5 md:py-1 rounded-full">
                          {section}
                        </span>
                      ))}
                      {level.sections.length > 3 && (
                        <span className="text-[10px] md:text-xs text-muted-foreground">+{level.sections.length - 3}</span>
                      )}
                    </div>
                    <div className="flex items-center text-xs md:text-sm text-primary font-medium group-hover:translate-x-1 transition-transform">
                      View <ChevronRight className="w-3 h-3 md:w-4 md:h-4 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 bg-card p-3 md:p-4 rounded-lg border shadow-sm">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search student or section..."
                  className="pl-9 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search"
                />
              </div>
              <div className="flex items-center justify-between md:justify-end gap-2 text-sm text-muted-foreground">
                <span className="bg-muted px-2 py-1 rounded text-xs">{filteredStudents.length} Students</span>
              </div>
            </div>

            <Card className="border shadow-sm">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Multi-Day Attendance Report
                </CardTitle>
                <CardDescription className="text-xs">
                  Piliin ang date range para i-export ang attendance report
                </CardDescription>
              </CardHeader>
              <CardContent className="py-3 px-4">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="flex flex-col sm:flex-row gap-2 flex-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "justify-start text-left font-normal w-full sm:w-[160px]",
                            !startDate && "text-muted-foreground"
                          )}
                          data-testid="button-start-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "MMM d, yyyy") : "Start Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          disabled={(date) => date > new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <span className="hidden sm:inline text-muted-foreground self-center">hanggang</span>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "justify-start text-left font-normal w-full sm:w-[160px]",
                            !endDate && "text-muted-foreground"
                          )}
                          data-testid="button-end-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "MMM d, yyyy") : "End Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          disabled={(date) => date > new Date() || (startDate && date < startDate)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <Button
                    onClick={exportDateRangePDF}
                    disabled={!startDate || !endDate || isExporting}
                    size="sm"
                    className="w-full sm:w-auto"
                    data-testid="button-export-range-pdf"
                  >
                    {isExporting ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Export Multi-Day PDF
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <StudentTable students={filteredStudents} isLoading={isLoading} />
          </div>
        )}
      </div>
    </MainLayout>
  );
}
