"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const ShellContext = createContext<{
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (value: boolean) => void;
} | null>(null);

export function ShellProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <ShellContext
      value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}
    >
      {children}
    </ShellContext>
  );
}

export function useShell() {
  const value = useContext(ShellContext);
  if (!value) throw new Error("ShellProvider is required");
  return value;
}
