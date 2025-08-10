"use client"

import { SidebarHeader } from "@/components/ui/sidebar"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Briefcase,
  Calendar,
  BarChart3,
  Settings,
  Shield,
  Users,
  Brain,
  LogOut,
  ChevronUp,
  Search,
  Bell,
  PlusCircle,
} from "lucide-react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth()
  const [notifications] = useState(3) // Mock notification count

  const getNavigationItems = () => {
    const baseItems = [
      {
        title: "Dashboard",
        icon: BarChart3,
        href: "/dashboard", // Assuming a generic dashboard page
      },
    ]

    switch (profile?.role) {
      case "candidate":
        return [
          ...baseItems,
          {
            title: "My Profile",
            icon: User,
            href: "/dashboard/profile",
          },
          {
            title: "Job Matches",
            icon: Briefcase,
            href: "/dashboard/jobs", // This would be a candidate's job matches page
          },
          {
            title: "Applications",
            icon: Calendar,
            href: "/dashboard/applications",
          },
          {
            title: "Interviews",
            icon: Brain,
            href: "/dashboard/interviews",
          },
        ]

      case "recruiter":
        return [
          ...baseItems,
          {
            title: "Post Job",
            icon: PlusCircle,
            href: "/dashboard/jobs/create",
          },
          {
            title: "Candidates",
            icon: Users,
            href: "/dashboard/candidates",
          },
          {
            title: "Interviews",
            icon: Calendar,
            href: "/dashboard/interviews",
          },
          {
            title: "Analytics",
            icon: BarChart3,
            href: "/dashboard/analytics", // Placeholder for future analytics
          },
        ]

      case "talent_admin":
        return [
          ...baseItems,
          {
            title: "AI Models",
            icon: Brain,
            href: "/dashboard/ai-models",
          },
          {
            title: "Skill Taxonomy",
            icon: Settings,
            href: "/dashboard/skills",
          },
          {
            title: "Integrity Monitor",
            icon: Shield,
            href: "/dashboard/integrity",
          },
          {
            title: "System Health",
            icon: BarChart3,
            href: "/dashboard/system",
          },
        ]

      case "super_admin":
        return [
          ...baseItems,
          {
            title: "User Management",
            icon: Users,
            href: "/dashboard/users",
          },
          {
            title: "System Monitor",
            icon: BarChart3,
            href: "/dashboard/monitor",
          },
          {
            title: "Billing",
            icon: Settings,
            href: "/dashboard/billing",
          },
          {
            title: "Integrations",
            icon: Settings,
            href: "/dashboard/integrations",
          },
        ]

      default:
        return baseItems
    }
  }

  const navigationItems = getNavigationItems()

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "candidate":
        return "bg-blue-100 text-blue-800"
      case "recruiter":
        return "bg-green-100 text-green-800"
      case "talent_admin":
        return "bg-purple-100 text-purple-800"
      case "super_admin":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Brain className="h-4 w-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">TalentAI</span>
              <span className="truncate text-xs text-muted-foreground">AI-Powered Hiring</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || ""} />
                      <AvatarFallback className="rounded-lg">
                        {profile?.full_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("") || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{profile?.full_name}</span>
                      <span className="truncate text-xs">
                        <Badge variant="secondary" className={`text-xs ${getRoleBadgeColor(profile?.role || "")}`}>
                          {profile?.role?.replace("_", " ")}
                        </Badge>
                      </span>
                    </div>
                    <ChevronUp className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || ""} />
                        <AvatarFallback className="rounded-lg">
                          {profile?.full_name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("") || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">{profile?.full_name}</span>
                        <span className="truncate text-xs text-muted-foreground">{profile?.email}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Account Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <div className="flex flex-col flex-1">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Search anything...</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                {notifications > 0 && (
                  <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs">{notifications}</Badge>
                )}
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
    </SidebarProvider>
  )
}
