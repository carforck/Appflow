"use client";

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

const TOUR_KEY = 'alzak_tour_v1';

export function useTour() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(TOUR_KEY)) return;

    const timer = setTimeout(async () => {
      const { driver } = await import('driver.js');

      const isMobile = window.innerWidth < 1024;
      const side     = isMobile ? ('top' as const) : ('right' as const);
      const pfx      = isMobile ? 'tour-m-' : 'tour-';

      const isAdmin = user.role === 'admin' || user.role === 'superadmin';

      const steps: Parameters<ReturnType<typeof driver>['setSteps']>[0] = [
        {
          popover: {
            title:       '👋 Bienvenido a Alzak Flow',
            description: 'Te mostramos brevemente las secciones de la app. Puedes saltar el tour en cualquier momento.',
            align:       'center',
          },
        },
        {
          element: `#${pfx}dashboard`,
          popover: {
            title:       '🏠 Dashboard',
            description: 'Tu resumen de actividad: tareas activas, completadas y métricas generales del equipo.',
            side,
          },
        },
        {
          element: `#${pfx}tareas`,
          popover: {
            title:       '📋 Tareas',
            description: 'Aquí están todas tus tareas asignadas. Puedes verlas en tablero Kanban, filtrar por prioridad y cambiar su estado tocando cualquier tarjeta.',
            side,
          },
        },
        {
          element: `#${pfx}notas`,
          popover: {
            title:       '💬 Notas',
            description: 'Chat de mensajes por tarea. Cada tarea tiene su propia conversación y recibirás una notificación cuando alguien escriba.',
            side,
          },
        },
        ...(isAdmin
          ? [
              {
                element: `#${pfx}proyectos`,
                popover: {
                  title:       '📁 Proyectos',
                  description: 'Gestiona todos los proyectos, consulta su estado, avance y las tareas asociadas.',
                  side,
                },
              },
              {
                element: `#${pfx}procesador`,
                popover: {
                  title:       '✨ Procesador',
                  description: 'Sube minutas o archivos de Drive y la IA extrae automáticamente las tareas y las crea en el sistema.',
                  side,
                },
              },
              {
                element: `#${pfx}revision`,
                popover: {
                  title:       '📄 Revisión',
                  description: 'Minutas procesadas que esperan tu aprobación antes de crear las tareas definitivas.',
                  side,
                },
              },
              {
                element: `#${pfx}usuarios`,
                popover: {
                  title:       '👥 Usuarios',
                  description: 'Administra los miembros del equipo, sus roles y activa o desactiva cuentas.',
                  side,
                },
              },
            ]
          : []),
        {
          element: isMobile ? '#tour-m-bell' : '#tour-bell',
          popover: {
            title:       '🔔 Notificaciones',
            description: 'Aquí aparecen todas las alertas en tiempo real: nuevas notas, tareas asignadas y cambios de estado.',
            side: isMobile ? ('top' as const) : ('right' as const),
          },
        },
      ];

      const driverObj = driver({
        showProgress:     true,
        animate:          true,
        overlayOpacity:   0.6,
        popoverClass:     'alzak-tour-popover',
        nextBtnText:      'Siguiente →',
        prevBtnText:      '← Atrás',
        doneBtnText:      '¡Listo!',
        steps,
        onDestroyStarted: () => {
          localStorage.setItem(TOUR_KEY, '1');
          driverObj.destroy();
        },
      });

      driverObj.drive();
    }, 900);

    return () => clearTimeout(timer);
  }, [user]);
}
