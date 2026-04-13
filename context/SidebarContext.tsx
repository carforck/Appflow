"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

interface SidebarContextType {
  collapsed:    boolean;
  mobileOpen:   boolean;
  toggle:       () => void;
  toggleMobile: () => void;
  closeMobile:  () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed:    false,
  mobileOpen:   false,
  toggle:       () => {},
  toggleMobile: () => {},
  closeMobile:  () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <SidebarContext.Provider value={{
      collapsed,
      mobileOpen,
      toggle:       () => setCollapsed((c) => !c),
      toggleMobile: () => setMobileOpen((o) => !o),
      closeMobile:  () => setMobileOpen(false),
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => useContext(SidebarContext);
