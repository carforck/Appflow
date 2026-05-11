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
            description: 'Aquí están todas tus tareas asignadas en un tablero Kanban dividido en tres columnas.',
            side,
          },
        },
        {
          popover: {
            title:       '↕️ ¿Cómo cambiar el estado de una tarea?',
            description: `
              <ol style="padding-left:16px;margin:6px 0;line-height:1.7">
                <li>Toca cualquier tarjeta del tablero para abrirla.</li>
                <li>Dentro verás el selector de estado en la parte superior.</li>
                <li>Elige el estado que corresponda:</li>
              </ol>
              <div style="display:flex;flex-direction:column;gap:4px;margin-top:8px;font-size:12px">
                <span>⚪ <b>Por Hacer</b> — tarea pendiente de iniciar</span>
                <span>🔵 <b>En Progreso</b> — tarea en curso</span>
                <span>🟢 <b>Completada</b> — tarea finalizada</span>
              </div>
              ${isMobile ? '<p style="margin-top:10px;font-size:11px;color:#94a3b8">💡 En móvil usa los botones de columna para ver solo un estado a la vez.</p>' : ''}
            `,
            align: 'center',
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
