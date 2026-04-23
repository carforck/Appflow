"use client";

// Re-exporta el store compartido para que todos los componentes que llamen
// useUsuarios() usen la misma instancia del contexto — una sola petición GET /users.
export { useUserStore as useUsuarios } from '@/context/UserStoreContext';
