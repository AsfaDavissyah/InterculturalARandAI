import { useState } from "react"
import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  User,
  Users,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const adminNavigation = [
  { id: "overview", icon: LayoutDashboard, label: "Overview" },
  { id: "scenarios", icon: BookOpen, label: "Scenarios" },
  { id: "categories", icon: Layers, label: "Categories" },
  { id: "lecturers", icon: Users, label: "Lecturers" },
  { id: "practice-results", icon: ClipboardList, label: "Practice Results" },
  { id: "system-settings", icon: Settings, label: "System Settings" },
]

const lecturerNavigation = [
  { id: "overview", icon: LayoutDashboard, label: "Overview" },
  { id: "scenarios", icon: BookOpen, label: "Scenarios" },
  { id: "students", icon: GraduationCap, label: "Students" },
  { id: "practice-results", icon: ClipboardList, label: "Practice Results" },
  { id: "profile", icon: User, label: "Profile" },
]

function Brand({ role }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <img
        src="/engora-logo.svg"
        alt="Engora"
        className="size-9 shrink-0 rounded-md border border-border bg-background"
      />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold text-foreground">Engora</p>
        <p className="truncate text-xs text-muted-foreground">
          {role === "admin" ? "Admin Console" : "Lecturer Portal"}
        </p>
      </div>
    </div>
  )
}

export default function Header({ user, activeTab, onNavigate, onLogout }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const navigation = user.role === "admin" ? adminNavigation : lecturerNavigation
  const initials = user.name?.charAt(0).toUpperCase() || "U"

  const navigate = (tabId) => {
    onNavigate(tabId)
    setSheetOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(86vw,320px)] gap-0 p-0">
              <SheetTitle className="sr-only">Dashboard navigation</SheetTitle>
              <div className="border-b border-border p-4">
                <Brand role={user.role} />
              </div>
              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Main navigation">
                {navigation.map(({ id, icon: Icon, label }) => (
                  <Button
                    key={id}
                    type="button"
                    variant={activeTab === id ? "secondary" : "ghost"}
                    onClick={() => navigate(id)}
                    className="h-10 justify-start gap-3 px-3"
                  >
                    <Icon className="size-4" />
                    {label}
                  </Button>
                ))}
              </nav>
              <div className="border-t border-border p-4">
                <div className="mb-3 flex items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="truncate text-xs capitalize text-muted-foreground">{user.role}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onLogout}
                  className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="size-4" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <Brand role={user.role} />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 px-2 sm:px-3" aria-label="Open account menu">
              <Avatar className="size-7">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-40 truncate text-sm font-medium sm:inline">{user.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs capitalize text-muted-foreground">
                {user.role}{user.lecturerCode ? ` / ${user.lecturerCode}` : ""}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onNavigate(user.role === "admin" ? "system-settings" : "profile")}>
              {user.role === "admin" ? <Settings /> : <User />}
              {user.role === "admin" ? "System Settings" : "Profile"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onLogout}>
              <LogOut />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="mx-auto hidden h-11 w-full max-w-[1600px] items-center gap-1 overflow-x-auto border-t border-border px-4 sm:px-6 lg:flex lg:px-8" aria-label="Main navigation">
        {navigation.map(({ id, icon: Icon, label }) => (
          <Button
            key={id}
            type="button"
            variant="ghost"
            onClick={() => onNavigate(id)}
            aria-current={activeTab === id ? "page" : undefined}
            className={`h-9 shrink-0 gap-2 px-3 ${
              activeTab === id
                ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                : "text-muted-foreground"
            }`}
          >
            <Icon className="size-4" />
            <span>{label}</span>
          </Button>
        ))}
      </nav>
    </header>
  )
}
