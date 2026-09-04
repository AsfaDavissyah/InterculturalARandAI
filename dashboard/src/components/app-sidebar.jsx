import * as React from "react"
import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LogOut,
  Settings,
  User,
  Users,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar({
  user,
  activeTab,
  setActiveTab,
  handleLogout,
  ...props
}) {
  const navItems =
    user.role === "admin"
      ? [
          { id: "overview", icon: LayoutDashboard, label: "Overview" },
          { id: "scenarios", icon: BookOpen, label: "Scenarios" },
          { id: "categories", icon: Layers, label: "Categories" },
          { id: "lecturers", icon: Users, label: "Lecturers" },
          { id: "practice-results", icon: ClipboardList, label: "Practice Results" },
          { id: "system-settings", icon: Settings, label: "System Settings" },
        ]
      : [
          { id: "overview", icon: LayoutDashboard, label: "Overview" },
          { id: "scenarios", icon: BookOpen, label: "Scenarios" },
          { id: "students", icon: GraduationCap, label: "Students" },
          { id: "practice-results", icon: ClipboardList, label: "Practice Results" },
          { id: "profile", icon: User, label: "Profile" },
        ]

  return (
    <Sidebar variant="floating" collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border/50 pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="h-12 rounded-lg hover:bg-transparent cursor-default">
              <img src="/engora-logo.svg" alt="" className="size-9 shrink-0 rounded-lg border border-sidebar-border" />
              <div className="flex flex-col gap-0.5 leading-none pl-1">
                <span className="font-semibold text-sm text-foreground">Engora</span>
                <span className="text-xs text-muted-foreground">
                  {user.role === "admin" ? "Admin Console" : "Lecturer Portal"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/75">
            Navigation
          </SidebarGroupLabel>
          <SidebarMenu className="gap-1 mt-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeTab === item.id}
                    tooltip={item.label}
                    onClick={() => setActiveTab(item.id)}
                    className="w-full transition-all duration-200"
                  >
                    <Icon className="size-4.5" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 px-1 py-0.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground border font-semibold text-sm shadow-sm select-none">
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="flex flex-col min-w-0 leading-none">
              <span className="font-semibold text-sm text-foreground truncate">{user.name}</span>
              <span className="text-[11px] text-muted-foreground capitalize mt-1">
                {user.role} {user.lecturerCode ? `(${user.lecturerCode})` : ""}
              </span>
            </div>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleLogout}
                className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive active:bg-destructive/15 transition-all duration-200 rounded-lg"
              >
                <LogOut className="size-4.5 mr-2" />
                <span className="font-semibold text-sm">Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
