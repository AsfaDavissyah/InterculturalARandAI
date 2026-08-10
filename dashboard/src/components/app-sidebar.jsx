import * as React from "react"
import {
  Activity,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Layers,
  LogOut,
  QrCode,
  ShieldCheck,
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
  const navItems = user.role === "admin"
    ? [
        { id: "topics", icon: Layers, label: "Topics & Settings" },
        { id: "scenarios", icon: BookOpen, label: "Scenario Builder" },
        { id: "modules", icon: QrCode, label: "Learning Modules" },
        { id: "lecturers", icon: Users, label: "Lecturers" },
      ]
    : [
        { id: "overview", icon: Activity, label: "Research Overview" },
        { id: "students", icon: Users, label: "Students" },
        { id: "history", icon: ClipboardList, label: "Practice History" },
      ]

  return (
    <Sidebar variant="floating" collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border/50 pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="h-12 rounded-lg hover:bg-transparent cursor-default">
              <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                {user.role === "admin" ? <ShieldCheck className="size-5" /> : <GraduationCap className="size-5" />}
              </div>
              <div className="flex flex-col gap-0.5 leading-none pl-1">
                <span className="font-semibold text-sm tracking-tight text-foreground">Orbis Research</span>
                <span className="text-xs text-muted-foreground">
                  {user.role === "admin" ? "Admin Console" : "Lecturer Dashboard"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/75">
            Workspace
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
