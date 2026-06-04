'use client';

import { useState } from 'react';
import {
  Fuel,
  Building,
  Bell,
  Sun,
  Moon,
  Search,
  Menu,
  LogOut,
  Settings,
  User,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuthStore } from '@/store/auth-store';
import { useStationStore } from '@/store/station-store';
import { useFuelStore } from '@/store/fuel-store';

interface HeaderProps {
  onShowStations: () => void;
  onShowCombined?: () => void;
}

export function Header({ onShowStations, onShowCombined }: HeaderProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const stations = useStationStore((s) => s.stations);
  const currentStation = useStationStore((s) => s.currentStation);
  const switchStation = useStationStore((s) => s.switchStation);
  const theme = useFuelStore((s) => s.theme);
  const toggleTheme = useFuelStore((s) => s.toggleTheme);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'FP';

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-700/50 shadow-lg">
      <div className="flex items-center justify-between h-14 px-3 md:px-4">
        {/* Left: Logo + Station selector */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-slate-300 hover:text-white hover:bg-white/10">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-slate-900 border-slate-700 text-white w-72">
              <SheetHeader>
                <SheetTitle className="text-white flex items-center gap-2">
                  <Fuel className="size-5 text-amber-400" />
                  FuelPro
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-2">
                {user && (
                  <div className="px-3 py-3 bg-white/5 rounded-lg flex items-center gap-3">
                    <Avatar className="size-10">
                      <AvatarFallback className="bg-amber-500/20 text-amber-400 text-sm font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-white">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    onShowStations();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-white/10 transition-colors"
                >
                  <Building className="size-4" />
                  Manage Stations
                </button>
                <button
                  onClick={() => {
                    onShowCombined?.();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-white/10 transition-colors"
                >
                  <Settings className="size-4" />
                  Settings
                </button>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="size-4" />
                  Sign Out
                </button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <Fuel className="size-6 text-amber-400" />
            <span className="text-lg font-bold text-white hidden sm:inline">FuelPro</span>
          </div>

          {/* Station selector */}
          {stations.length > 0 && (
            <div className="hidden md:flex items-center">
              <Select
                value={currentStation?.id ?? ''}
                onValueChange={switchStation}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm h-8 w-auto max-w-[220px] hover:bg-white/10">
                  <Building className="size-3.5 text-amber-400 mr-1 shrink-0" />
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {stations.map((st) => (
                    <SelectItem key={st.id} value={st.id} className="text-white focus:bg-white/10 focus:text-white">
                      {st.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Mobile station indicator */}
          {currentStation && (
            <button
              onClick={onShowStations}
              className="md:hidden flex items-center gap-1 text-xs text-slate-300 hover:text-white transition-colors"
            >
              <Building className="size-3.5 text-amber-400" />
              <span className="max-w-[100px] truncate">{currentStation.name}</span>
              <ChevronDown className="size-3" />
            </button>
          )}
        </div>

        {/* Right: Search, Notifications, Theme, User */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Search */}
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-white hover:bg-white/10"
            onClick={onShowCombined}
          >
            <Search className="size-4" />
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-white hover:bg-white/10">
            <Bell className="size-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full" />
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-slate-400 hover:text-white hover:bg-white/10"
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-8 px-2 hover:bg-white/10">
                <Avatar className="size-7">
                  <AvatarFallback className="bg-amber-500/20 text-amber-400 text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-sm text-slate-300 max-w-[120px] truncate">
                  {user?.name ?? 'User'}
                </span>
                <ChevronDown className="size-3 text-slate-400 hidden md:inline" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white" align="end">
              <DropdownMenuLabel className="text-slate-400">
                <div className="flex flex-col">
                  <span className="text-white text-sm">{user?.name}</span>
                  <span className="text-xs text-slate-400">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem className="text-slate-300 focus:bg-white/10 focus:text-white cursor-pointer">
                <User className="size-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-slate-300 focus:bg-white/10 focus:text-white cursor-pointer"
                onClick={onShowStations}
              >
                <Building className="size-4 mr-2" />
                Stations
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-slate-300 focus:bg-white/10 focus:text-white cursor-pointer"
                onClick={onShowCombined}
              >
                <Settings className="size-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem
                className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer"
                onClick={logout}
              >
                <LogOut className="size-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
