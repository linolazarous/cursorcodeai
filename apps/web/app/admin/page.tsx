// apps/web/app/admin/page.tsx
import { redirect } from "next/navigation";
import { auth } from "../api/auth/[...nextauth]/route";

// All UI components from the shared @cursorcode/ui package
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge,
  Button,
  Alert,
  AlertDescription,
  AlertTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@cursorcode/ui";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  Users,
  DollarSign,
  CreditCard,
  Zap,
  AlertCircle,
} from "lucide-react";


// Mock data (replace with real API call in production)
const stats = {
  totalUsers: 1248,
  activeSubscriptions: 342,
  monthlyRevenue: 12480,
  totalProjects: 2876,
  failedBuilds: 42,
};

const revenueData = [
  { month: "Jan", revenue: 4200 },
  { month: "Feb", revenue: 5800 },
  { month: "Mar", revenue: 7200 },
  { month: "Apr", revenue: 8900 },
  { month: "May", revenue: 10500 },
  { month: "Jun", revenue: 12480 },
];

const recentUsers = [
  { id: 1, email: "user1@example.com", plan: "pro", joined: "2 hours ago", status: "active" },
  { id: 2, email: "user2@company.io", plan: "premier", joined: "1 day ago", status: "active" },
  { id: 3, email: "test@domain.com", plan: "starter", joined: "3 days ago", status: "pending" },
  { id: 4, email: "dev@startup.dev", plan: "ultra", joined: "1 week ago", status: "active" },
];


export default async function AdminDashboard() {

  const session = await auth();

  if (!session?.user?.roles?.includes("admin")) {

    redirect("/dashboard");

  }


  return (

    <div className="min-h-screen storyboard-grid bg-background py-10">

      <div className="container mx-auto px-6 max-w-7xl space-y-12">



        {/* Header */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">

          <div>

            <h1 className="text-display text-5xl font-bold tracking-tighter neon-glow">

              Admin Control Center

            </h1>

            <p className="text-2xl text-muted-foreground mt-2">

              Platform overview • {new Date().toLocaleDateString()}

            </p>

          </div>



          <div className="flex items-center gap-4">

            <Badge variant="outline" className="px-4 py-2 text-sm neon-glow">

              LIVE

            </Badge>

            <Button variant="outline" className="neon-glow">

              Download Full Report

            </Button>

          </div>

        </div>



        {/* Stats Cards */}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

          {[

            { label: "Total Users", value: stats.totalUsers.toLocaleString(), icon: Users, change: "+12% this month" },

            { label: "Active Subscriptions", value: stats.activeSubscriptions.toLocaleString(), icon: CreditCard, change: "78% retention" },

            { label: "Monthly Revenue", value: `$${stats.monthlyRevenue.toLocaleString()}`, icon: DollarSign, change: "+18.2% this month" },

            { label: "Total Projects", value: stats.totalProjects.toLocaleString(), icon: Zap, change: `${stats.failedBuilds} failed builds` },

          ].map((stat, i) => (

            <Card key={i} className="cyber-card neon-glow border-brand-blue/30">

              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">

                <CardTitle className="text-sm font-medium text-muted-foreground">

                  {stat.label}

                </CardTitle>

                <stat.icon className="h-5 w-5 text-brand-glow" />

              </CardHeader>

              <CardContent>

                <div className="text-4xl font-bold text-foreground tracking-tighter">

                  {stat.value}

                </div>

                <p className="text-sm text-muted-foreground mt-2">

                  {stat.change}

                </p>

              </CardContent>

            </Card>

          ))}

        </div>



        {/* Tabs */}

        <Tabs defaultValue="overview" className="space-y-8">



          <TabsList className="grid w-full grid-cols-4 bg-card border border-border neon-glow">

            <TabsTrigger value="overview" className="text-lg py-3 data-[state=active]:text-brand-blue">

              Overview

            </TabsTrigger>

            <TabsTrigger value="users" className="text-lg py-3 data-[state=active]:text-brand-blue">

              Users

            </TabsTrigger>

            <TabsTrigger value="revenue" className="text-lg py-3 data-[state=active]:text-brand-blue">

              Revenue

            </TabsTrigger>

            <TabsTrigger value="alerts" className="text-lg py-3 data-[state=active]:text-brand-blue">

              Alerts

            </TabsTrigger>

          </TabsList>



          {/* Overview Tab */}

          <TabsContent value="overview" className="space-y-8">

            <div className="grid gap-8 lg:grid-cols-5">

              {/* Revenue Chart */}

              <Card className="lg:col-span-3 cyber-card neon-glow">

                <CardHeader>

                  <CardTitle className="text-display text-3xl">

                    Revenue Trend

                  </CardTitle>

                  <CardDescription>

                    Last 6 months

                  </CardDescription>

                </CardHeader>

                <CardContent className="h-[380px]">

                  <ResponsiveContainer width="100%" height="100%">

                    <BarChart data={revenueData}>

                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />

                      <XAxis dataKey="month" tick={{ fill: "#94A3B8" }} />

                      <YAxis tick={{ fill: "#94A3B8" }} />

                      <Tooltip

                        contentStyle={{ backgroundColor: "#111827", border: "none", borderRadius: "12px" }}

                        formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}

                      />

                      <Bar dataKey="revenue" fill="#1E88E5" radius={[6, 6, 0, 0]} />

                    </BarChart>

                  </ResponsiveContainer>

                </CardContent>

              </Card>


              {/* Remaining content unchanged */}

            </div>

          </TabsContent>


        </Tabs>

      </div>

    </div>

  );

}
