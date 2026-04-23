import {
  prepareTasksForRevision,
  sanitizeDate,
  DEFAULT_PROJECT_ID,
  type RawTask,
} from '../prepareTasksForRevision';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<RawTask> = {}): RawTask {
  return {
    id_proyecto:        '6024',
    tarea_descripcion:  'Entregar informe trimestral',
    responsable_nombre: 'Paula Pinzón',
    responsable_correo: 'ppinzon@alzakfoundation.org',
    prioridad:          'Alta',
    fecha_entrega:      '2026-05-15',
    ...overrides,
  };
}

function makeBatch(n: number, overrides: Partial<RawTask> = {}): RawTask[] {
  return Array.from({ length: n }, (_, i) => makeTask({ tarea_descripcion: `Tarea ${i + 1}`, ...overrides }));
}

// ── sanitizeDate ──────────────────────────────────────────────────────────────

describe('sanitizeDate', () => {
  it('devuelve la fecha como YYYY-MM-DD cuando es válida', () => {
    expect(sanitizeDate('2026-05-15')).toBe('2026-05-15');
  });

  it('acepta formato con hora (ISO 8601 completo)', () => {
    expect(sanitizeDate('2026-05-15T12:00:00.000Z')).toBe('2026-05-15');
  });

  it('devuelve fallback (+7 días) cuando la fecha es inválida', () => {
    const result = sanitizeDate('no-es-una-fecha');
    const expected = new Date();
    expected.setDate(expected.getDate() + 7);
    expect(result).toBe(expected.toISOString().slice(0, 10));
  });

  it('devuelve fallback cuando la fecha es null', () => {
    const result = sanitizeDate(null);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('devuelve fallback cuando la fecha es undefined', () => {
    const result = sanitizeDate(undefined);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ── prepareTasksForRevision — validaciones de entrada ─────────────────────────

describe('prepareTasksForRevision — validaciones de entrada', () => {
  it('lanza TypeError si el argumento no es un array', () => {
    // @ts-expect-error: prueba intencional con tipo incorrecto
    expect(() => prepareTasksForRevision('no-array')).toThrow(TypeError);
  });

  it('lanza Error si el array está vacío', () => {
    expect(() => prepareTasksForRevision([])).toThrow('vacío');
  });

  it('lanza Error si alguna tarea no tiene descripción', () => {
    expect(() => prepareTasksForRevision([makeTask({ tarea_descripcion: '' })])).toThrow(
      'posición 1',
    );
  });

  it('lanza Error si la descripción es solo espacios', () => {
    expect(() => prepareTasksForRevision([makeTask({ tarea_descripcion: '   ' })])).toThrow(
      'posición 1',
    );
  });
});

// ── prepareTasksForRevision — lote de 35 tareas ───────────────────────────────

describe('prepareTasksForRevision — lote de 35 tareas', () => {
  const batch = makeBatch(35);
  let result: ReturnType<typeof prepareTasksForRevision>;

  beforeAll(() => { result = prepareTasksForRevision(batch); });

  it('produce exactamente 35 tareas preparadas', () => {
    expect(result).toHaveLength(35);
  });

  it('todas las tareas tienen id_proyecto definido y no vacío', () => {
    result.forEach((t) => {
      expect(t.id_proyecto).toBeTruthy();
      expect(typeof t.id_proyecto).toBe('string');
    });
  });

  it('todas las fechas tienen formato YYYY-MM-DD', () => {
    result.forEach((t) => {
      expect(t.fecha_entrega).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('todas las prioridades son valores válidos del enum', () => {
    const VALID = ['Alta', 'Media', 'Baja'];
    result.forEach((t) => {
      expect(VALID).toContain(t.prioridad);
    });
  });
});

// ── prepareTasksForRevision — asignación del proyecto default ─────────────────

describe('prepareTasksForRevision — proyecto default 1111', () => {
  it('asigna DEFAULT_PROJECT_ID cuando id_proyecto es null', () => {
    const [task] = prepareTasksForRevision([makeTask({ id_proyecto: null })]);
    expect(task.id_proyecto).toBe(DEFAULT_PROJECT_ID);
    expect(DEFAULT_PROJECT_ID).toBe('1111');
  });

  it('asigna DEFAULT_PROJECT_ID cuando id_proyecto es string vacío', () => {
    const [task] = prepareTasksForRevision([makeTask({ id_proyecto: '' })]);
    expect(task.id_proyecto).toBe(DEFAULT_PROJECT_ID);
  });

  it('asigna DEFAULT_PROJECT_ID cuando id_proyecto es undefined', () => {
    const [task] = prepareTasksForRevision([makeTask({ id_proyecto: undefined })]);
    expect(task.id_proyecto).toBe(DEFAULT_PROJECT_ID);
  });

  it('asigna DEFAULT_PROJECT_ID cuando id_proyecto son solo espacios', () => {
    const [task] = prepareTasksForRevision([makeTask({ id_proyecto: '   ' })]);
    expect(task.id_proyecto).toBe(DEFAULT_PROJECT_ID);
  });

  it('respeta el id_proyecto del parser cuando viene correcto', () => {
    const [task] = prepareTasksForRevision([makeTask({ id_proyecto: '6024' })]);
    expect(task.id_proyecto).toBe('6024');
  });

  it('en un lote de 35, las tareas sin proyecto quedan con 1111', () => {
    const mixed = [
      ...makeBatch(20, { id_proyecto: '6024' }),
      ...makeBatch(15, { id_proyecto: '' }),       // sin proyecto
    ];
    const prepared = prepareTasksForRevision(mixed);
    const sinProyecto = prepared.filter((t) => t.id_proyecto === DEFAULT_PROJECT_ID);
    expect(sinProyecto).toHaveLength(15);
  });
});

// ── prepareTasksForRevision — fechas inválidas ────────────────────────────────

describe('prepareTasksForRevision — fechas inválidas', () => {
  it('asigna fecha fallback cuando la fecha es un string inválido', () => {
    const [task] = prepareTasksForRevision([makeTask({ fecha_entrega: 'mañana' })]);
    expect(task.fecha_entrega).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('asigna fecha fallback cuando fecha_entrega es null', () => {
    const [task] = prepareTasksForRevision([makeTask({ fecha_entrega: null })]);
    expect(task.fecha_entrega).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('no lanza error con fechas inválidas — sigue procesando el lote completo', () => {
    const batch = makeBatch(35, { fecha_entrega: 'INVALID' });
    expect(() => prepareTasksForRevision(batch)).not.toThrow();
    const result = prepareTasksForRevision(batch);
    expect(result).toHaveLength(35);
  });
});

// ── prepareTasksForRevision — prioridad ──────────────────────────────────────

describe('prepareTasksForRevision — prioridad', () => {
  it('normaliza prioridad inválida a "Media"', () => {
    const [task] = prepareTasksForRevision([makeTask({ prioridad: 'Urgente' })]);
    expect(task.prioridad).toBe('Media');
  });

  it('normaliza prioridad null a "Media"', () => {
    const [task] = prepareTasksForRevision([makeTask({ prioridad: null })]);
    expect(task.prioridad).toBe('Media');
  });

  it('preserva "Alta"', () => {
    const [task] = prepareTasksForRevision([makeTask({ prioridad: 'Alta' })]);
    expect(task.prioridad).toBe('Alta');
  });

  it('preserva "Baja"', () => {
    const [task] = prepareTasksForRevision([makeTask({ prioridad: 'Baja' })]);
    expect(task.prioridad).toBe('Baja');
  });
});
