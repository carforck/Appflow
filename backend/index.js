const express = require('express');
const cors    = require('cors');
const mysql   = require('mysql2/promise');
const axios   = require('axios');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ── CONSTANTES ───────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'alzak-dev-secret-change-in-prod';

const VALID_PROJECT_IDS = [
  '25923','2424','EXTERNO-1','5024','6124','EXTERNO-2','6524','0124','0424',
  '2924','3524','0325','1121','1022','1522','1022-1','1922','2822','0925',
  '1111','1125','0425','1525','2625','6024','0525','1625','2125','2225',
  '1025','2025','1925','0725','3425','4125','3825','0326',
];

// ── POOL DB (vía túnel SSH 3307) ─────────────────────────────────────────────
const pool = mysql.createPool({
  host:             process.env.DB_HOST,
  port:             parseInt(process.env.DB_PORT),
  user:             process.env.DB_USER,
  password:         process.env.DB_PASS,
  database:         process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:  10,
});

// ── MIDDLEWARE: AUTH JWT ─────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Sin permisos para esta acción' });
    }
    next();
  };
}

// ── POST /auth/login ─────────────────────────────────────────────────────────
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Faltan credenciales' });

  try {
    const [rows] = await pool.query(
      'SELECT correo, nombre_completo, role, password_hash FROM users WHERE correo = ? AND activo = 1',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const u = rows[0];
    const valid = await bcrypt.compare(password, u.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const token = jwt.sign(
      { email: u.correo, nombre: u.nombre_completo, role: u.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    console.log(`🔓 Login: ${u.correo} (${u.role})`);
    res.json({
      token,
      user: { email: u.correo, nombre: u.nombre_completo, role: u.role },
    });
  } catch (err) {
    console.error('❌ Error en login:', err.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// ── GET /users (protegido) ───────────────────────────────────────────────────
app.get('/users', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT correo, nombre_completo, role FROM users WHERE activo = 1 ORDER BY nombre_completo ASC'
    );
    res.json({ status: 'success', users: rows });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios', detalle: err.message });
  }
});

// ── POST /procesar-reunion (protegido) ───────────────────────────────────────
app.post('/procesar-reunion', authMiddleware, async (req, res) => {
  const { texto, responsable_sugerido } = req.body;
  if (!texto) return res.status(400).json({ error: 'Falta el texto' });

  try {
    console.log('🤖 Consultando a Groq (Llama 3.3)...');

    const hoy = new Date().toLocaleDateString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const projectListStr = VALID_PROJECT_IDS.join(', ');

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Eres un experto PM de Alzak Foundation. Hoy es ${hoy}.

PROYECTOS VÁLIDOS (únicos permitidos): ${projectListStr}

REGLAS CRÍTICAS:
1. El campo "id_proyecto" DEBE ser exactamente uno de los IDs de la lista anterior.
2. Si no puedes identificar el proyecto con certeza, usa OBLIGATORIAMENTE "1111".
3. NO inventes IDs de proyecto fuera de la lista.
${responsable_sugerido ? `4. El responsable principal pre-seleccionado es "${responsable_sugerido}". Asígnale las tareas relevantes.` : ''}

Si mencionan días relativos ("próximo lunes", "la semana que viene"), calcula la fecha exacta en formato YYYY-MM-DD.`,
        },
        {
          role: 'user',
          content: `Analiza este texto y extrae la información: "${texto}"

Responde ÚNICAMENTE con este JSON:
{
  "id_proyecto": "ID exacto de la lista de proyectos válidos",
  "resumen": "resumen ejecutivo corto",
  "tareas": [
    {
      "descripcion": "qué hay que hacer",
      "responsable": "nombre completo del responsable",
      "prioridad": "Alta/Media/Baja",
      "fecha": "YYYY-MM-DD"
    }
  ]
}`,
        },
      ],
      response_format: { type: 'json_object' },
    }, {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const dataIA = JSON.parse(response.data.choices[0].message.content);

    // Validación estricta del proyecto
    if (!VALID_PROJECT_IDS.includes(dataIA.id_proyecto)) {
      console.warn(`⚠️  Proyecto inválido detectado: "${dataIA.id_proyecto}" → reasignando a 1111`);
      dataIA.id_proyecto = '1111';
    }

    console.log(`💾 Guardando en DB: Proyecto ${dataIA.id_proyecto}, ${dataIA.tareas.length} tareas...`);

    const [resMeeting] = await pool.query(
      'INSERT INTO meetings (id_proyecto, resumen_ejecutivo, texto_original) VALUES (?, ?, ?)',
      [dataIA.id_proyecto, dataIA.resumen, texto]
    );
    const meetingId = resMeeting.insertId;

    for (const t of dataIA.tareas) {
      const [userRows] = await pool.query(
        'SELECT correo, nombre_completo FROM users WHERE nombre_completo LIKE ?',
        [`%${t.responsable}%`]
      );
      const correoFinal = userRows.length > 0 ? userRows[0].correo : null;
      const nombreFinal = userRows.length > 0 ? userRows[0].nombre_completo : t.responsable;

      await pool.query(
        `INSERT INTO tasks
         (id_meeting, id_proyecto, tarea_descripcion, responsable_nombre, responsable_correo, prioridad, fecha_entrega)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [meetingId, dataIA.id_proyecto, t.descripcion, nombreFinal, correoFinal, t.prioridad, t.fecha]
      );
    }

    console.log('✅ PROCESO COMPLETADO');
    res.json({
      status:         'success',
      meetingId,
      proyecto:       dataIA.id_proyecto,
      tareas_creadas: dataIA.tareas.length,
    });

  } catch (error) {
    const detalle = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error('❌ ERROR EN PROCESAR-REUNION:', detalle);
    res.status(500).json({ error: 'Fallo en el servidor', detalle });
  }
});

// ── GET /tareas (protegido + RBAC) ───────────────────────────────────────────
app.get('/tareas', authMiddleware, async (req, res) => {
  try {
    const { prioridad, proyecto } = req.query;
    const { email, role } = req.user;

    let query = `
      SELECT
        t.id,
        t.id_proyecto,
        t.tarea_descripcion,
        t.responsable_nombre,
        t.responsable_correo,
        t.prioridad,
        t.status,
        t.fecha_entrega,
        m.resumen_ejecutivo AS resumen_meeting
      FROM tasks t
      LEFT JOIN meetings m ON t.id_meeting = m.id
      WHERE 1=1
    `;
    const params = [];

    // RBAC: users solo ven sus propias tareas
    if (role === 'user') {
      query += ' AND t.responsable_correo = ?';
      params.push(email);
    }

    if (prioridad) { query += ' AND t.prioridad = ?';    params.push(prioridad); }
    if (proyecto)  { query += ' AND t.id_proyecto = ?';  params.push(proyecto);  }

    query += ' ORDER BY t.fecha_entrega ASC, t.id DESC';

    const [rows] = await pool.query(query, params);
    console.log(`📋 GET /tareas → ${rows.length} tareas (${role}: ${email})`);
    res.json({ status: 'success', total: rows.length, tareas: rows });

  } catch (err) {
    console.error('❌ ERROR GET /tareas:', err.message);
    res.status(500).json({ error: 'Error al obtener tareas', detalle: err.message });
  }
});

// ── SERVER ───────────────────────────────────────────────────────────────────
app.listen(3000, '0.0.0.0', () => {
  console.log('\n🚀 ALZAK FLOW OPERATIVO');
  console.log('🔗 DB vía túnel SSH en 127.0.0.1:3307');
  console.log('🔐 Auth JWT activo');
  console.log('📡 Escuchando en 0.0.0.0:3000\n');
});
