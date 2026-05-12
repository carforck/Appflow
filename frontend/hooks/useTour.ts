"use client";

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

const TOUR_KEY = 'alzak_tour_v1';

const MOCK_CARD_HTML = `
<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;margin:12px 0 4px;box-shadow:0 2px 12px rgba(0,0,0,.10)">
  <div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:8px">
    <span style="font-size:9px;font-weight:700;color:#1a365d;background:#dbeafe;padding:1px 6px;border-radius:20px;white-space:nowrap;margin-top:1px">#42</span>
    <span style="font-size:11px;font-weight:600;color:#1e293b;line-height:1.4">Revisar informe de indicadores Q1 2025 y enviar resumen al equipo directivo</span>
  </div>
  <span style="display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:700;background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:20px;margin-bottom:8px">
    <span style="width:5px;height:5px;border-radius:50%;background:#dc2626;display:inline-block"></span> Alta
  </span>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-top:2px">
    <div style="display:flex;align-items:center;gap:5px">
      <div style="width:20px;height:20px;border-radius:50%;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#1a365d;flex-shrink:0">CJ</div>
      <span style="font-size:10px;color:#64748b">Carlos</span>
    </div>
    <div style="display:flex;align-items:center;gap:5px">
      <span style="font-size:9px;background:#f1f5f9;color:#64748b;padding:1px 6px;border-radius:20px">💬</span>
      <span style="font-size:9px;font-weight:600;color:#f59e0b">⚠️ 20 may</span>
    </div>
  </div>
</div>`;

const TIP = (text: string) =>
  `<div style="display:flex;align-items:flex-start;gap:6px;margin-top:10px;padding:8px 10px;background:#f0f9ff;border-left:3px solid #38bdf8;border-radius:6px;font-size:11px;color:#0369a1;line-height:1.5">
    <span style="font-size:13px;flex-shrink:0">💡</span><span>${text}</span>
  </div>`;

const BENEFIT = (text: string) =>
  `<p style="margin:6px 0 0;font-size:12px;color:#475569;line-height:1.6">${text}</p>`;

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
        // ── 1. Bienvenida ──────────────────────────────────────────────
        {
          popover: {
            title: '👋 Bienvenido a Alzak Flow',
            description: `
              ${BENEFIT('Este es tu espacio de trabajo para gestionar proyectos, tareas y comunicación con tu equipo — todo en un solo lugar.')}
              ${TIP('El tour dura menos de 1 minuto. Puedes saltarlo en cualquier momento con <b>Esc</b>.')}
            `,
            align: 'center',
          },
        },

        // ── 2. Dashboard ───────────────────────────────────────────────
        {
          element: `#${pfx}dashboard`,
          popover: {
            title: '🏠 Tu centro de control',
            description: `
              ${BENEFIT('De un vistazo sabes cuántas tareas tienes pendientes, cuáles vencen pronto y qué completaste recientemente — sin abrir nada más.')}
              ${TIP('El dashboard se actualiza en tiempo real. Si alguien te asigna una tarea, aparece aquí al instante.')}
            `,
            side,
          },
        },

        // ── 3. Tareas + mock card ──────────────────────────────────────
        {
          element: `#${pfx}tareas`,
          popover: {
            title: '📋 Tu tablero de trabajo',
            description: `
              ${BENEFIT('Todas tus tareas asignadas, organizadas en tres columnas: <b>Por Hacer · En Progreso · Completada</b>. Así sabes exactamente en qué trabajar hoy.')}
              <p style="margin:10px 0 2px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em">Así se ve una tarjeta de tarea:</p>
              ${MOCK_CARD_HTML}
              ${TIP('Toca cualquier tarjeta para ver el detalle completo, cambiar su estado y dejar notas al equipo.')}
            `,
            side,
          },
        },

        // ── 4. Cómo cambiar estado ─────────────────────────────────────
        {
          popover: {
            title: '↕️ Mover una tarea es muy fácil',
            description: `
              ${BENEFIT('Mantén a tu equipo informado actualizando el estado de cada tarea a medida que avanzas.')}
              <ol style="padding-left:16px;margin:10px 0 4px;line-height:1.9;font-size:12px;color:#334155">
                <li>Abre cualquier tarjeta tocándola.</li>
                <li>Toca el selector de estado en la parte superior.</li>
                <li>Elige el estado correcto:</li>
              </ol>
              <div style="display:flex;flex-direction:column;gap:5px;margin-top:6px;font-size:12px">
                <div style="display:flex;align-items:center;gap:8px;padding:5px 10px;background:#f8fafc;border-radius:8px">⚪ <b>Por Hacer</b> <span style="color:#94a3b8;font-size:11px">— aún no iniciada</span></div>
                <div style="display:flex;align-items:center;gap:8px;padding:5px 10px;background:#eff6ff;border-radius:8px">🔵 <b>En Progreso</b> <span style="color:#94a3b8;font-size:11px">— estás trabajando en esto</span></div>
                <div style="display:flex;align-items:center;gap:8px;padding:5px 10px;background:#f0fdf4;border-radius:8px">🟢 <b>Completada</b> <span style="color:#94a3b8;font-size:11px">— listo, se guarda en historial</span></div>
              </div>
              ${isMobile ? TIP('En móvil usa los botones de columna para ver solo un estado a la vez.') : ''}
            `,
            align: 'center',
          },
        },

        // ── 5. Notas ───────────────────────────────────────────────────
        {
          element: `#${pfx}notas`,
          popover: {
            title: '💬 Comunicación en contexto',
            description: `
              ${BENEFIT('Cada tarea tiene su propio chat. Toda la conversación queda ligada a la tarea, sin perder nada en emails o WhatsApp.')}
              <div style="display:flex;flex-direction:column;gap:5px;margin:10px 0 4px;font-size:11px">
                <div style="display:flex;align-items:center;gap:7px;color:#475569">✅ Sin salir de la app, todo en un lugar</div>
                <div style="display:flex;align-items:center;gap:7px;color:#475569">✅ Historial siempre disponible</div>
                <div style="display:flex;align-items:center;gap:7px;color:#475569">✅ Notificación inmediata cuando te escriben</div>
              </div>
              ${TIP('También puedes abrir el chat directamente desde la tarjeta de una tarea.')}
            `,
            side,
          },
        },

        // ── Pasos exclusivos admin ─────────────────────────────────────
        ...(isAdmin
          ? [
              {
                element: `#${pfx}proyectos`,
                popover: {
                  title: '📁 Gestión de proyectos',
                  description: `
                    ${BENEFIT('Organiza y monitorea todos los proyectos del equipo: estado, avance y tareas asociadas en una sola vista.')}
                    ${TIP('Puedes filtrar por empresa o financiador para encontrar rápido lo que buscas.')}
                  `,
                  side,
                },
              },
              {
                element: `#${pfx}procesador`,
                popover: {
                  title: '✨ Procesador con IA',
                  description: `
                    ${BENEFIT('Sube una minuta o un archivo y la IA extrae automáticamente todas las tareas, responsables y fechas — sin digitarlas a mano.')}
                    ${TIP('Ahorra hasta 30 minutos por reunión. Las tareas pasan a revisión antes de crearse definitivamente.')}
                  `,
                  side,
                },
              },
              {
                element: `#${pfx}revision`,
                popover: {
                  title: '📄 Matriz de Revisión',
                  description: `
                    ${BENEFIT('Antes de que las tareas lleguen al tablero, puedes revisarlas, editarlas y aprobarlas o rechazarlas aquí.')}
                    ${TIP('Aprueba todas de una vez o revisa una por una. Nada entra al sistema sin tu visto bueno.')}
                  `,
                  side,
                },
              },
              {
                element: `#${pfx}usuarios`,
                popover: {
                  title: '👥 Gestión de usuarios',
                  description: `
                    ${BENEFIT('Administra quién tiene acceso, qué rol tiene cada persona y activa o desactiva cuentas cuando sea necesario.')}
                    ${TIP('Los roles controlan qué secciones y acciones puede realizar cada miembro del equipo.')}
                  `,
                  side,
                },
              },
            ]
          : []),

        // ── Notificaciones ─────────────────────────────────────────────
        {
          element: isMobile ? '#tour-m-bell' : '#tour-bell',
          popover: {
            title: '🔔 Siempre informado',
            description: `
              ${BENEFIT('Aquí aparecen todas las alertas en tiempo real: nuevas tareas asignadas, notas recibidas y cambios de estado.')}
              <div style="display:flex;flex-direction:column;gap:5px;margin:10px 0 4px;font-size:11px">
                <div style="display:flex;align-items:center;gap:7px;color:#475569">🔵 Nueva tarea asignada para ti</div>
                <div style="display:flex;align-items:center;gap:7px;color:#475569">💬 Alguien te escribió en una tarea</div>
                <div style="display:flex;align-items:center;gap:7px;color:#475569">✅ Una tarea tuya fue aprobada</div>
              </div>
              ${TIP('El número rojo sobre la campana indica cuántas notificaciones sin leer tienes.')}
            `,
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
        doneBtnText:      '¡Listo! 🎉',
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
