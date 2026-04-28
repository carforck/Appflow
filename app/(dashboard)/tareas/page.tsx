"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTaskBoard } from '@/hooks/useTaskBoard';
import { TaskBoard }    from '@/components/tareas/TaskBoard';

function TareasContent() {
  const searchParams = useSearchParams();
  const openId       = searchParams.get('open');
  const focus        = searchParams.get('focus');
  const board        = useTaskBoard(openId, focus);
  return <TaskBoard {...board} />;
}

export default function TareasPage() {
  return (
    <Suspense fallback={null}>
      <TareasContent />
    </Suspense>
  );
}
