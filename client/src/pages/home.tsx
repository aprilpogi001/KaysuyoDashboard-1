import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, UserX, TrendingUp, CheckCircle, Calendar, CalendarDays } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface RecentAttendance {
  id: number;
  studentName: string;
  grade: string;
  section: string;
  timeIn: string;
  status: string;
}

interface WeeklyData {
  date: string;
  day: string;
  fullDay: string;
  year: number;
  present: number;
  late: number;
  absent: number;
}

interface TodayStats {
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
  totalScanned: number;
  totalStudents: number;
  date: string;
  day: string;
  year: number;
}

export default function Home() {
  const { data: stats } = useQuery<TodayStats>({
    queryKey: ["stats", "today"],
    queryFn: async () => {
      const res = await fetch("/api/attendance/stats/today");
      return res.ok ? res.json() : { 
        totalPresent: 0, 
        totalLate: 0, 
        totalAbsent: 0, 
        totalScanned: 0,
        totalStudents: 0,
        date: new Date().toISOString().split('T')[0],
        day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        year: new Date().getFullYear()
      };
    },
    refetchInterval: 5000,
  });

  const { data: recentAttendance = [] } = useQuery<RecentAttendance[]>({
    queryKey: ["attendance", "recent"],
    queryFn: async () => {
      const res = await fetch("/api/attendance/recent");
      return res.ok ? res.json() : [];
    },
    refetchInterval: 3000,
  });

  const { data: weeklyData = [] } = useQuery<WeeklyData[]>({
    queryKey: ["attendance", "weekly"],
    queryFn: async () => {
      const res = await fetch("/api/attendance/weekly");
      return res.ok ? res.json() : [];
    },
    refetchInterval: 30000,
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      present: "bg-green-100 text-green-700 border-green-200",
      late: "bg-yellow-100 text-yellow-700 border-yellow-200",
      absent: "bg-red-100 text-red-700 border-red-200",
      pending: "bg-blue-100 text-blue-700 border-blue-200",
    };
    return styles[status as keyof typeof styles] || "bg-gray-100 text-gray-700";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-PH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary mb-2" data-testid="text-greeting">{getGreeting()}, Admin</h1>
            <p className="text-sm md:text-base text-muted-foreground">Here's the attendance overview for Kaysuyo National High School today.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
            <CalendarDays className="w-4 h-4" />
            <span className="font-medium">{stats?.day}, {stats?.date} {stats?.year}</span>
          </div>
        </div>

        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-5">
          <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow" data-testid="card-present">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Present</CardTitle>
              <Users className="h-4 w-4 text-primary hidden md:block" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold text-green-600">{stats?.totalPresent || 0}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Before 7:00 AM</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500 shadow-sm hover:shadow-md transition-shadow" data-testid="card-late">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Late</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600 hidden md:block" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold text-yellow-700">{stats?.totalLate || 0}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">7:00 - 7:15 AM</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow" data-testid="card-absent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Absent</CardTitle>
              <UserX className="h-4 w-4 text-red-500 hidden md:block" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold text-red-600">{stats?.totalAbsent || 0}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Not scanned</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-400 shadow-sm hover:shadow-md transition-shadow" data-testid="card-scanned">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Scanned</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-500 hidden md:block" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold text-blue-600">{stats?.totalScanned || 0}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Today's scan</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-400 shadow-sm hover:shadow-md transition-shadow" data-testid="card-total">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-500 hidden md:block" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold text-purple-600">{stats?.totalStudents || 0}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">All students</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:gap-6 lg:grid-cols-7">
          <Card className="lg:col-span-4 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-serif">Weekly Attendance Trends</CardTitle>
                <Badge variant="outline" className="text-xs">
                  <Calendar className="w-3 h-3 mr-1" />
                  Last 7 Days
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pl-2">
              {weeklyData.length > 0 && weeklyData.some(d => d.present > 0 || d.late > 0) ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="day" 
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value, name) => [value, name]}
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0]) {
                            const data = payload[0].payload as WeeklyData;
                            return `${data.fullDay}, ${data.date}`;
                          }
                          return label;
                        }}
                      />
                      <Legend />
                      <Bar dataKey="present" name="Present" fill="#22c55e" />
                      <Bar dataKey="late" name="Late" fill="#eab308" />
                      <Bar dataKey="absent" name="Absent" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] w-full flex flex-col items-center justify-center text-center space-y-2">
                  <TrendingUp className="w-16 h-16 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No attendance data yet</p>
                  <p className="text-xs text-muted-foreground/70">Weekly trends will appear once students are scanned</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 shadow-sm">
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                Live Feed
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentAttendance.length > 0 ? (
                <div className="space-y-3 max-h-[280px] overflow-y-auto">
                  {recentAttendance.map((record) => (
                    <div 
                      key={record.id} 
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-lg border"
                      data-testid={`live-feed-${record.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${record.status === 'present' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                          <CheckCircle className={`w-4 h-4 ${record.status === 'present' ? 'text-green-600' : 'text-yellow-600'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{record.studentName}</p>
                          <p className="text-xs text-muted-foreground">Grade {record.grade} - {record.section}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={getStatusBadge(record.status)}>
                          {record.status.toUpperCase()}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{record.timeIn}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                  <Clock className="w-10 h-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No activity yet today</p>
                  <p className="text-xs text-muted-foreground/70">Scanned students will appear here in real-time</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Time Rules Info */}
        <Card className="shadow-sm bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Attendance Time Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-muted-foreground">6:00 - 7:00 AM: <span className="font-medium text-foreground">Pending</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-muted-foreground">Before 7:00 AM: <span className="font-medium text-foreground">Present</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-muted-foreground">7:00 - 7:15 AM: <span className="font-medium text-foreground">Late</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-muted-foreground">After 7:15 AM: <span className="font-medium text-foreground">Absent</span></span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
