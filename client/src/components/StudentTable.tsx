import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Clock, User, Download, Printer, QrCode } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState, useRef } from "react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Student {
  id: string;
  name: string;
  section: string;
  grade?: string;
  gender?: string;
  lrn?: string;
  parentContact?: string;
  status: string;
  timeIn?: string;
  qrData?: string;
}

interface StudentTableProps {
  students: Student[];
  isLoading: boolean;
}

export function StudentTable({ students, isLoading }: StudentTableProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
          <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No students found.</p>
        <p className="text-sm">Try searching with a different term or add students via QR Generator.</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      present: "bg-green-100 text-green-700 border-green-200",
      late: "bg-yellow-100 text-yellow-700 border-yellow-200",
      absent: "bg-red-100 text-red-700 border-red-200",
      pending: "bg-blue-100 text-blue-700 border-blue-200",
      unmarked: "bg-gray-100 text-gray-700 border-gray-200",
    };
    return styles[status as keyof typeof styles] || styles.unmarked;
  };

  const getGenderLabel = (gender: string | undefined) => {
    if (!gender) return "";
    const labels: Record<string, string> = {
      male: "Male",
      female: "Female",
      rather_not_say: "Rather Not Say",
    };
    return labels[gender] || gender;
  };

  const maleStudents = students.filter(s => s.gender === "male").sort((a, b) => a.name.localeCompare(b.name));
  const femaleStudents = students.filter(s => s.gender === "female").sort((a, b) => a.name.localeCompare(b.name));
  const otherStudents = students.filter(s => s.gender !== "male" && s.gender !== "female").sort((a, b) => a.name.localeCompare(b.name));

  const generateQRData = (student: Student) => {
    return JSON.stringify({
      n: student.name,
      gn: student.gender || "rather_not_say",
      g: student.grade,
      s: student.section,
      l: student.lrn || "",
      c: student.parentContact || "",
    });
  };

  const downloadQROnly = () => {
    if (!qrRef.current || !selectedStudent) return;
    
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    canvas.width = 400;
    canvas.height = 400;
    
    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 50, 50, 300, 300);
        
        const link = document.createElement("a");
        link.download = `QR_${selectedStudent.name.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    
    toast({
      title: "QR Code Downloaded",
      description: "QR code only has been saved.",
    });
  };

  const downloadQRWithDesign = () => {
    if (!selectedStudent) return;
    
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    canvas.width = 400;
    canvas.height = 600;
    
    if (ctx) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = "#1a365d";
      ctx.fillRect(0, 0, canvas.width, 60);
      
      ctx.fillStyle = "white";
      ctx.font = "bold 16px serif";
      ctx.textAlign = "center";
      ctx.fillText("Kaysuyo National High School", 200, 30);
      ctx.font = "12px sans-serif";
      ctx.fillText("Official Student ID", 200, 48);
      
      const svg = qrRef.current?.querySelector("svg");
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        
        img.onload = () => {
          ctx.drawImage(img, 100, 80, 200, 200);
          
          ctx.fillStyle = "#1a365d";
          ctx.font = "bold 20px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(selectedStudent.name.toUpperCase(), 200, 320);
          
          ctx.fillStyle = "#666";
          ctx.font = "14px sans-serif";
          ctx.fillText(`Grade ${selectedStudent.grade} - ${selectedStudent.section}`, 200, 345);
          
          ctx.font = "12px monospace";
          ctx.fillText(`LRN: ${selectedStudent.lrn || "N/A"}`, 200, 370);
          
          ctx.fillStyle = "#1a365d";
          ctx.fillRect(0, 540, canvas.width, 60);
          
          ctx.fillStyle = "white";
          ctx.font = "10px sans-serif";
          ctx.fillText("Emergency Contact:", 200, 560);
          ctx.font = "bold 12px sans-serif";
          ctx.fillText(selectedStudent.parentContact || "N/A", 200, 580);
          
          const link = document.createElement("a");
          link.download = `ID_${selectedStudent.name.replace(/\s+/g, '_')}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
          
          toast({
            title: "ID Card Downloaded",
            description: "QR code with design has been saved.",
          });
        };
        
        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderStudentRow = (student: Student, displayNumber: number) => (
    <TableRow 
      key={student.id} 
      className="hover:bg-muted/30 cursor-pointer" 
      onClick={() => setSelectedStudent(student)}
      data-testid={`row-student-${student.id}`}
    >
      <TableCell className="text-xs text-muted-foreground">{displayNumber}</TableCell>
      <TableCell className="font-medium">{student.name}</TableCell>
      <TableCell className="font-mono text-xs">{student.lrn || "—"}</TableCell>
      <TableCell>{student.section}</TableCell>
      <TableCell className="font-mono text-xs">
        {student.timeIn || "—"}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={getStatusBadge(student.status)}>
          {student.status.toUpperCase()}
        </Badge>
      </TableCell>
    </TableRow>
  );

  const renderStudentCard = (student: Student, displayNumber: number) => (
    <Card 
      key={student.id} 
      className="p-3 cursor-pointer hover:bg-muted/50 transition-colors" 
      onClick={() => setSelectedStudent(student)}
      data-testid={`card-student-${student.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{displayNumber}</span>
            <h3 className="font-medium text-sm truncate">{student.name}</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{student.section}</p>
          <p className="text-xs text-muted-foreground font-mono">LRN: {student.lrn || "N/A"}</p>
        </div>
        <Badge variant="outline" className={`${getStatusBadge(student.status)} text-[10px] shrink-0`}>
          {student.status.toUpperCase()}
        </Badge>
      </div>
      {student.timeIn && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{student.timeIn}</span>
        </div>
      )}
    </Card>
  );

  const renderSection = (title: string, studentList: Student[], startIndex: number, icon: string) => {
    if (studentList.length === 0) return null;
    
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{icon}</span>
          <h3 className="font-semibold text-lg text-primary">{title}</h3>
          <Badge variant="secondary" className="ml-2">{studentList.length}</Badge>
        </div>
        
        <div className="hidden md:block rounded-md border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>LRN</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Time In</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentList.map((student, idx) => renderStudentRow(student, startIndex + idx))}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden space-y-2">
          {studentList.map((student, idx) => renderStudentCard(student, startIndex + idx))}
        </div>
      </div>
    );
  };

  return (
    <>
      {maleStudents.length > 0 || femaleStudents.length > 0 ? (
        <>
          {renderSection("Boys", maleStudents, 1, "")}
          {renderSection("Girls", femaleStudents, maleStudents.length + 1, "")}
          {otherStudents.length > 0 && renderSection("Others", otherStudents, maleStudents.length + femaleStudents.length + 1, "")}
        </>
      ) : (
        <>
          <div className="hidden md:block rounded-md border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>LRN</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Time In</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student, index) => renderStudentRow(student, index + 1))}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-2">
            {students.map((student, index) => renderStudentCard(student, index + 1))}
          </div>
        </>
      )}

      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>View and download student QR code</DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div ref={qrRef} className="flex justify-center">
                <div className="p-3 bg-white border rounded-lg">
                  <QRCode value={selectedStudent.qrData || generateQRData(selectedStudent)} size={180} />
                </div>
              </div>
              
              <div className="space-y-3 text-center">
                <h2 className="text-xl font-bold uppercase">{selectedStudent.name}</h2>
                <p className="text-sm text-muted-foreground">
                  Grade {selectedStudent.grade} - {selectedStudent.section}
                </p>
                
                <div className="grid grid-cols-2 gap-3 text-sm pt-2">
                  <div className="bg-muted/50 p-2 rounded">
                    <p className="text-xs text-muted-foreground">Gender</p>
                    <p className="font-medium">{getGenderLabel(selectedStudent.gender) || "N/A"}</p>
                  </div>
                  <div className="bg-muted/50 p-2 rounded">
                    <p className="text-xs text-muted-foreground">LRN</p>
                    <p className="font-medium font-mono text-xs">{selectedStudent.lrn || "N/A"}</p>
                  </div>
                  <div className="bg-muted/50 p-2 rounded">
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <p className="font-medium">{selectedStudent.parentContact || "N/A"}</p>
                  </div>
                  <div className="bg-muted/50 p-2 rounded">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant="outline" className={getStatusBadge(selectedStudent.status)}>
                      {selectedStudent.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {selectedStudent.timeIn && (
                  <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Time In: {selectedStudent.timeIn}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={downloadQROnly} data-testid="button-download-qr-only">
                    <Download className="w-4 h-4 mr-2" /> QR Only
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadQRWithDesign} data-testid="button-download-with-design">
                    <Download className="w-4 h-4 mr-2" /> With Design
                  </Button>
                </div>
                <Button className="w-full" size="sm" onClick={handlePrint} data-testid="button-print-id">
                  <Printer className="w-4 h-4 mr-2" /> Print ID Card
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
