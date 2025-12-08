import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GRADE_LEVELS } from "@/lib/mockData";
import { useState, useEffect, useRef } from "react";
import QRCode from "react-qr-code";
import { Printer, RefreshCw, Download, Users, Search, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { setApiPassword, apiFetch } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

interface StudentFromJson {
  name: string;
  gender: string;
  lrn: string;
  contact: string;
  email?: string;
  grade: string;
  section: string;
}

export default function QrGenerator() {
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);
  const dialogQrRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    gender: "",
    customGender: "",
    grade: "",
    section: "",
    lrn: "",
    contact: "",
    email: "",
  });
  const [generatedData, setGeneratedData] = useState<string | null>(null);
  const [passkey, setPasskey] = useState("");
  const [serverPasskey, setServerPasskey] = useState<string>("");
  const [studentsFromJson, setStudentsFromJson] = useState<StudentFromJson[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentFromJson | null>(null);
  const [showStudentDialog, setShowStudentDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("manual");
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/config/passkey")
      .then(res => res.json())
      .then(data => setServerPasskey(data.passkey || ""))
      .catch(() => setServerPasskey(""));

    // Load students from JSON
    apiFetch("/api/students/json")
      .then(res => res.json())
      .then(data => setStudentsFromJson(data))
      .catch(() => setStudentsFromJson([]));
  }, []);

  const filteredStudents = studentsFromJson.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.grade.includes(searchQuery) ||
      s.section.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = gradeFilter === "all" || s.grade === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  const studentsByGrade = {
    "7": filteredStudents.filter(s => s.grade === "7"),
    "8": filteredStudents.filter(s => s.grade === "8"),
    "9": filteredStudents.filter(s => s.grade === "9"),
    "10": filteredStudents.filter(s => s.grade === "10"),
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!serverPasskey) {
      toast({
        variant: "destructive",
        title: "Passkey Not Configured",
        description: "Admin passkey is not set. Please set API_PASSWORD in environment.",
      });
      return;
    }

    if (passkey !== serverPasskey) {
      toast({
        variant: "destructive",
        title: "Invalid Passkey",
        description: "Please enter the correct admin passkey to generate QR codes.",
      });
      return;
    }

    setApiPassword(passkey);

    const genderValue = formData.gender === "custom" ? formData.customGender : formData.gender;
    const qrString = JSON.stringify({
      n: formData.name,
      gn: genderValue || "rather_not_say",
      g: formData.grade,
      s: formData.section,
      l: formData.lrn,
      c: formData.contact,
      e: formData.email,
    });

    setGeneratedData(qrString);
    toast({
      title: "QR Code Generated",
      description: `Ready to print for ${formData.name}`,
    });
  };

  const handleStudentSelect = (student: StudentFromJson) => {
    setSelectedStudent(student);
    setFormData({
      name: student.name,
      gender: student.gender,
      customGender: "",
      grade: student.grade,
      section: student.section,
      lrn: student.lrn,
      contact: student.contact,
      email: student.email || "",
    });
    
    const qrString = JSON.stringify({
      n: student.name,
      gn: student.gender || "rather_not_say",
      g: student.grade,
      s: student.section,
      l: student.lrn,
      c: student.contact,
      e: student.email || "",
    });
    setGeneratedData(qrString);
    setShowStudentDialog(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const downloadQROnly = (useDialogRef = false) => {
    const ref = useDialogRef ? dialogQrRef : qrRef;
    if (!ref.current) return;
    
    const svg = ref.current.querySelector("svg");
    if (!svg) return;

    const studentName = useDialogRef && selectedStudent ? selectedStudent.name : formData.name;
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
        link.download = `QR_${studentName.replace(/\s+/g, '_')}.png`;
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

  const downloadQRWithDesign = (useDialogRef = false) => {
    const ref = useDialogRef ? dialogQrRef : qrRef;
    const student = useDialogRef && selectedStudent ? selectedStudent : formData;
    const studentName = useDialogRef && selectedStudent ? selectedStudent.name : formData.name;
    const studentGrade = useDialogRef && selectedStudent ? selectedStudent.grade : formData.grade;
    const studentSection = useDialogRef && selectedStudent ? selectedStudent.section : formData.section;
    const studentLrn = useDialogRef && selectedStudent ? selectedStudent.lrn : formData.lrn;
    const studentContact = useDialogRef && selectedStudent ? selectedStudent.contact : formData.contact;

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
      
      const svg = ref.current?.querySelector("svg");
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        
        img.onload = () => {
          ctx.drawImage(img, 100, 80, 200, 200);
          
          ctx.fillStyle = "#1a365d";
          ctx.font = "bold 20px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(studentName.toUpperCase(), 200, 320);
          
          ctx.fillStyle = "#666";
          ctx.font = "14px sans-serif";
          ctx.fillText(`Grade ${studentGrade} - ${studentSection}`, 200, 345);
          
          ctx.font = "12px monospace";
          ctx.fillText(`LRN: ${studentLrn}`, 200, 370);
          
          ctx.fillStyle = "#1a365d";
          ctx.fillRect(0, 540, canvas.width, 60);
          
          ctx.fillStyle = "white";
          ctx.font = "10px sans-serif";
          ctx.fillText("Emergency Contact:", 200, 560);
          ctx.font = "bold 12px sans-serif";
          ctx.fillText(studentContact, 200, 580);
          
          const link = document.createElement("a");
          link.download = `ID_${studentName.replace(/\s+/g, '_')}.png`;
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

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-page-title">ID Card & QR Generator</h1>
          <p className="text-sm md:text-base text-muted-foreground">Create official student QR codes for attendance tracking.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Student List
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
              {/* Form */}
              <Card>
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="text-lg md:text-xl">Student Details</CardTitle>
                  <CardDescription className="text-sm">Enter the student's information accurately.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
                  <form onSubmit={handleGenerate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm">Full Name</Label>
                      <Input 
                        id="name" 
                        placeholder="Last Name, First Name M.I." 
                        required
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="text-sm"
                        data-testid="input-name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Gender</Label>
                      <Select 
                        value={formData.gender} 
                        onValueChange={val => setFormData({...formData, gender: val, customGender: val === "custom" ? formData.customGender : ""})}
                      >
                        <SelectTrigger data-testid="select-gender">
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          {GENDER_OPTIONS.map(g => (
                            <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.gender === "custom" && (
                      <div className="space-y-2">
                        <Label htmlFor="customGender" className="text-sm">Custom Gender</Label>
                        <Input 
                          id="customGender" 
                          placeholder="Enter your gender identity" 
                          value={formData.customGender}
                          onChange={e => setFormData({...formData, customGender: e.target.value})}
                          className="text-sm"
                          data-testid="input-custom-gender"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Grade Level</Label>
                        <Select 
                          value={formData.grade} 
                          onValueChange={val => setFormData({...formData, grade: val, section: ""})}
                        >
                          <SelectTrigger data-testid="select-grade">
                            <SelectValue placeholder="Select Grade" />
                          </SelectTrigger>
                          <SelectContent>
                            {GRADE_LEVELS.map(g => (
                              <SelectItem key={g.level} value={g.level}>Grade {g.level}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Section</Label>
                        <Select 
                          value={formData.section} 
                          onValueChange={val => setFormData({...formData, section: val})}
                          disabled={!formData.grade}
                        >
                          <SelectTrigger data-testid="select-section">
                            <SelectValue placeholder="Select Section" />
                          </SelectTrigger>
                          <SelectContent>
                            {GRADE_LEVELS.find(g => g.level === formData.grade)?.sections.map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lrn" className="text-sm">LRN</Label>
                      <Input 
                        id="lrn" 
                        placeholder="12-digit Learner Reference Number" 
                        value={formData.lrn}
                        onChange={e => setFormData({...formData, lrn: e.target.value})}
                        className="text-sm"
                        data-testid="input-lrn"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact" className="text-sm">Parent Contact</Label>
                      <Input 
                        id="contact" 
                        placeholder="0917xxxxxxx" 
                        required
                        value={formData.contact}
                        onChange={e => setFormData({...formData, contact: e.target.value})}
                        className="text-sm"
                        data-testid="input-contact"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm">Parent Email (Optional)</Label>
                      <Input 
                        id="email" 
                        type="email"
                        placeholder="parent@email.com" 
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="text-sm"
                        data-testid="input-email"
                      />
                      <p className="text-[10px] text-muted-foreground">Email for attendance notifications</p>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="space-y-2">
                        <Label htmlFor="passkey" className="text-sm text-red-500">Admin Passkey</Label>
                        <Input 
                          id="passkey" 
                          type="password" 
                          placeholder="Enter admin passkey" 
                          required
                          value={passkey}
                          onChange={e => setPasskey(e.target.value)}
                          className="text-sm"
                          data-testid="input-passkey"
                        />
                        <p className="text-[10px] text-muted-foreground">Contact admin for the passkey</p>
                      </div>
                    </div>

                    <Button type="submit" className="w-full mt-4" data-testid="button-generate">
                      <RefreshCw className="w-4 h-4 mr-2" /> Generate QR Code
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Preview */}
              <div className="space-y-4 md:space-y-6">
                <Card className="bg-muted/30 border-dashed">
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="text-lg md:text-xl">ID Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center py-6 md:py-8 p-4 md:p-6 pt-0 md:pt-0">
                    {generatedData ? (
                      <div ref={qrRef} className="print-id-card bg-white p-6 rounded-lg shadow-lg border w-full max-w-sm text-center space-y-6">
                        <div className="border-b pb-4">
                          <h3 className="font-serif font-bold text-primary text-lg">Kaysuyo National High School</h3>
                          <p className="text-xs text-muted-foreground">Official Student ID</p>
                        </div>
                        
                        <div className="flex justify-center">
                          <div className="p-2 bg-white border rounded-lg">
                            <QRCode value={generatedData} size={180} />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h2 className="text-xl font-bold text-foreground uppercase">{formData.name || "STUDENT NAME"}</h2>
                          <p className="text-sm text-muted-foreground font-medium">Grade {formData.grade || "?"} - {formData.section || "?"}</p>
                          <p className="text-xs text-muted-foreground mt-2">{formData.lrn}</p>
                        </div>
                        
                        <div className="text-[10px] text-muted-foreground pt-4 border-t">
                          In case of emergency, contact:<br/>
                          <span className="font-bold text-foreground text-xs">{formData.contact || "N/A"}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-12">
                        <div className="w-32 h-32 border-2 border-dashed rounded-lg mx-auto mb-4 flex items-center justify-center bg-muted/50">
                          <QRCode value="preview" size={64} fgColor="#e5e7eb" />
                        </div>
                        <p>Fill out the form to generate a student ID</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {generatedData && (
                  <div className="space-y-2 no-print">
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => downloadQROnly(false)} data-testid="button-download-qr">
                        <Download className="w-4 h-4 mr-2" /> QR Only
                      </Button>
                      <Button variant="outline" onClick={() => downloadQRWithDesign(false)} data-testid="button-download-design">
                        <Download className="w-4 h-4 mr-2" /> With Design
                      </Button>
                    </div>
                    <Button variant="default" className="w-full" onClick={handlePrint} data-testid="button-print">
                      <Printer className="w-4 h-4 mr-2" /> Print ID Card
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="students" className="mt-6">
            <Card>
              <CardHeader className="p-4 md:p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg md:text-xl">Student List</CardTitle>
                      <CardDescription className="text-sm">Click on a student to view and download their QR code</CardDescription>
                    </div>
                    <div className="relative w-full md:w-64">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search students..."
                        className="pl-9 text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        data-testid="input-search-students"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge 
                      variant={gradeFilter === "all" ? "default" : "outline"} 
                      className="cursor-pointer"
                      onClick={() => setGradeFilter("all")}
                      data-testid="filter-all"
                    >
                      All ({studentsFromJson.length})
                    </Badge>
                    {["7", "8", "9", "10"].map(grade => (
                      <Badge 
                        key={grade}
                        variant={gradeFilter === grade ? "default" : "outline"} 
                        className="cursor-pointer"
                        onClick={() => setGradeFilter(grade)}
                        data-testid={`filter-grade-${grade}`}
                      >
                        Grade {grade} ({studentsByGrade[grade as keyof typeof studentsByGrade].length})
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                {gradeFilter === "all" ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {["7", "8", "9", "10"].map(grade => (
                      <div key={grade} className="space-y-2">
                        <h3 className="font-semibold text-sm text-primary border-b pb-2">
                          Grade {grade} ({studentsByGrade[grade as keyof typeof studentsByGrade].length})
                        </h3>
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-2 pr-2">
                            {studentsByGrade[grade as keyof typeof studentsByGrade].length > 0 ? (
                              studentsByGrade[grade as keyof typeof studentsByGrade].map((student, index) => (
                                <div
                                  key={`${student.grade}-${student.section}-${student.name}-${index}`}
                                  className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                                  onClick={() => handleStudentSelect(student)}
                                  data-testid={`student-g${grade}-row-${index}`}
                                >
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <span className="text-primary font-bold text-xs">
                                      {student.name.charAt(0)}
                                    </span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-xs truncate">{student.name}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                      {student.section}
                                    </p>
                                  </div>
                                  <QrCode className="w-3 h-3 text-muted-foreground shrink-0" />
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-muted-foreground text-center py-4">No students</p>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="grid gap-2">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((student, index) => (
                          <div
                            key={`${student.grade}-${student.section}-${student.name}-${index}`}
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => handleStudentSelect(student)}
                            data-testid={`student-row-${index}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-primary font-bold text-sm">
                                  {student.name.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-sm">{student.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Grade {student.grade} - {student.section}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {student.gender === "male" ? "M" : "F"}
                              </Badge>
                              <QrCode className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>No students found</p>
                          <p className="text-xs mt-1">Students are loaded from student/g7-g10.json files</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Student QR Preview Dialog */}
        <Dialog open={showStudentDialog} onOpenChange={setShowStudentDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="no-print">
              <DialogTitle>Student QR Code</DialogTitle>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-4">
                <div className="print-id-card bg-white p-6 rounded-lg border text-center space-y-4">
                  <div className="border-b pb-3">
                    <h3 className="font-serif font-bold text-primary">Kaysuyo National High School</h3>
                    <p className="text-xs text-muted-foreground">Official Student ID</p>
                  </div>
                  
                  <div className="flex justify-center" ref={dialogQrRef}>
                    <div className="p-2 bg-white border rounded-lg">
                      <QRCode value={generatedData || ""} size={150} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-lg font-bold uppercase">{selectedStudent.name}</h2>
                    <p className="text-sm text-muted-foreground">Grade {selectedStudent.grade} - {selectedStudent.section}</p>
                    <p className="text-xs text-muted-foreground">LRN: {selectedStudent.lrn}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm pt-3 border-t">
                    <div className="bg-muted/50 p-2 rounded">
                      <p className="text-xs text-muted-foreground">Gender</p>
                      <p className="font-medium capitalize">{selectedStudent.gender}</p>
                    </div>
                    <div className="bg-muted/50 p-2 rounded">
                      <p className="text-xs text-muted-foreground">Contact</p>
                      <p className="font-medium">{selectedStudent.contact}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 no-print">
                  <Button variant="outline" onClick={() => downloadQROnly(true)} data-testid="button-dialog-download-qr">
                    <Download className="w-4 h-4 mr-2" /> QR Only
                  </Button>
                  <Button variant="outline" onClick={() => downloadQRWithDesign(true)} data-testid="button-dialog-download-design">
                    <Download className="w-4 h-4 mr-2" /> With Design
                  </Button>
                </div>
                <Button className="w-full no-print" onClick={handlePrint} data-testid="button-dialog-print">
                  <Printer className="w-4 h-4 mr-2" /> Print ID Card
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
