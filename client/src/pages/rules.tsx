import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Shield, Clock, UserCheck, AlertTriangle } from "lucide-react";

export default function Rules() {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        <div className="text-center space-y-2 mb-6 md:mb-12">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-page-title">School Rules & Guidelines</h1>
          <p className="text-sm md:text-base text-muted-foreground">Standard policies for Attendance and Conduct at Kaysuyo National High School</p>
        </div>

        <div className="grid gap-4 md:gap-6 md:grid-cols-2">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-3 mb-2">
                <div className="p-1.5 md:p-2 bg-blue-100 rounded-lg">
                  <Clock className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                </div>
                <CardTitle className="text-base md:text-lg">Attendance Policy</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 text-xs md:text-sm text-muted-foreground leading-relaxed p-4 md:p-6 pt-0 md:pt-0">
              <p>
                <strong className="text-foreground block mb-1">Daily Schedule</strong>
                Classes start promptly at 7:00 AM. Students are expected to be on campus by 6:45 AM for the flag ceremony.
              </p>
              <p>
                <strong className="text-foreground block mb-1">Late Arrivals</strong>
                Students arriving after 7:15 AM are considered LATE. Three (3) late arrivals equivalent to one (1) absence notification to parents.
              </p>
              <p>
                <strong className="text-foreground block mb-1">QR Scanning</strong>
                Scanning of ID is mandatory upon entry and exit. Failure to scan may result in an "Unmarked" status.
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-3 mb-2">
                <div className="p-1.5 md:p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
                </div>
                <CardTitle className="text-base md:text-lg">Absence & Leaves</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 text-xs md:text-sm text-muted-foreground leading-relaxed p-4 md:p-6 pt-0 md:pt-0">
              <p>
                <strong className="text-foreground block mb-1">Excused Absences</strong>
                Must be supported by a medical certificate or a letter from the parent/guardian.
              </p>
              <p>
                <strong className="text-foreground block mb-1">Auto-Absence</strong>
                The system automatically marks a student as ABSENT if no login is recorded by 12:00 PM.
              </p>
              <p>
                <strong className="text-foreground block mb-1">Truancy</strong>
                Leaving the campus during school hours without a pass slip is strictly prohibited.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4 md:mt-8">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Shield className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              Code of Conduct
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Uniform Policy</AccordionTrigger>
                <AccordionContent>
                  Students must wear the prescribed school uniform at all times within the school premises. 
                  <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                    <li>Monday/Wednesday Regular Uniform /Friday: Regular Uniform or P.E, Uniform </li>
                    <li>Tuesday/Thursday: P.E. Uniform</li>
                    <li>IDs must be worn at all times.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Prohibited Items</AccordionTrigger>
                <AccordionContent>
                  The following are strictly prohibited inside the campus:
                  <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                    <li>Weapons or sharp objects</li>
                    <li>Illegal drugs, alcohol, and tobacco/vape products</li>
                    <li>Gambling paraphernalia</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Disciplinary Actions</AccordionTrigger>
                <AccordionContent>
                  Violations of school rules will be subject to disciplinary actions as per the Student Handbook, ranging from verbal warning to suspension or expulsion depending on severity.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
