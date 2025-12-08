import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function About() {
  return (
    <MainLayout>
      <div className="space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary mb-2" data-testid="text-page-title">
            About Us
          </h1>
          <p className="text-muted-foreground">
            Kaysuyo National High School Guidance & Attendance System
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Our Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                To provide an efficient and reliable attendance monitoring system for Kaysuyo National High School,
                ensuring accurate tracking of student attendance and timely communication with parents and guardians.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">About KNHS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Kaysuyo National High School is committed to providing quality education and nurturing the holistic
                development of every student. Our guidance office works closely with students, parents, and teachers
                to create a supportive learning environment.
              </p>
              
              {/* Placeholder for images - user will add their own */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                  <p className="text-sm text-muted-foreground text-center px-4">
                    Image placeholder 1<br/>
                    <span className="text-xs">(Replace with school photo)</span>
                  </p>
                </div>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                  <p className="text-sm text-muted-foreground text-center px-4">
                    Image placeholder 2<br/>
                    <span className="text-xs">(Replace with school photo)</span>
                  </p>
                </div>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                  <p className="text-sm text-muted-foreground text-center px-4">
                    Image placeholder 3<br/>
                    <span className="text-xs">(Replace with school photo)</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Guidance Office Team</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Placeholder for team member photos */}
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center border-2 border-dashed border-primary/30">
                    <span className="text-xs text-muted-foreground">Photo</span>
                  </div>
                  <div>
                    <p className="font-medium text-primary">Team Member Name</p>
                    <p className="text-sm text-muted-foreground">Position/Title</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center border-2 border-dashed border-primary/30">
                    <span className="text-xs text-muted-foreground">Photo</span>
                  </div>
                  <div>
                    <p className="font-medium text-primary">Team Member Name</p>
                    <p className="text-sm text-muted-foreground">Position/Title</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">System Developer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xl">
                  AM
                </div>
                <div>
                  <p className="font-medium text-primary">April Manalo</p>
                  <p className="text-sm text-muted-foreground">System Developer & Maintainer</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
