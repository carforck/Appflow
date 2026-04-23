/**
 * src/controllers/uploadController.js
 * Recibe PDF o DOCX y devuelve el texto extraído.
 * Smart extraction: prioriza secciones de compromisos/tareas y filtra por nombres de equipo.
 */
const multer   = require('multer');
const pdfParse = require('pdf-parse');   // v1.1.1 — API: pdfParse(buffer) => {text}
const mammoth  = require('mammoth');

// ── Secciones de interés en una minuta (orden de prioridad) ──────────────────
const SECTION_PATTERNS = [
  /compromisos?\s*[:\n]/i,
  /tareas?\s*[:\n]/i,
  /acuerdos?\s*[:\n]/i,
  /action\s+items?\s*[:\n]/i,
  /pendientes?\s*[:\n]/i,
  /responsabilidades?\s*[:\n]/i,
  /pr[oó]ximos?\s+pasos?\s*[:\n]/i,
  /seguimiento\s*[:\n]/i,
  /conclusiones?\s*[:\n]/i,
];

const MAX_CHARS_FULL    = 20000;   // meetingController reduce aún más a 10k — esto es buffer inicial
const MAX_CHARS_SECTION = 15000;   // si encontramos sección de compromisos

/**
 * Extrae el fragmento más relevante de un texto largo de transcripción:
 * 1. Busca secciones de compromisos/tareas.
 * 2. Si no hay sección, usa el texto completo (truncado a MAX_CHARS_FULL).
 */
function smartExtract(raw) {
  const texto = raw.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  for (const pattern of SECTION_PATTERNS) {
    const match = texto.match(pattern);
    if (match) {
      const fragment = texto.slice(match.index);
      console.log(`✂️  Sección encontrada: "${match[0].trim()}" @ char ${match.index} — ${fragment.length} chars`);
      return fragment.slice(0, MAX_CHARS_SECTION);
    }
  }

  // Sin sección específica: usar todo el texto, truncado
  if (texto.length > MAX_CHARS_FULL) {
    console.log(`✂️  Texto largo (${texto.length} chars) → truncado a ${MAX_CHARS_FULL}`);
    return texto.slice(0, MAX_CHARS_FULL) + '\n\n[... transcripción truncada por longitud ...]';
  }

  return texto;
}

// ── Multer (50 MB, en memoria) ────────────────────────────────────────────────
const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 50 * 1024 * 1024 },   // 50 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error('Solo se permiten archivos PDF o DOCX'), { status: 415 }));
    }
  },
});

// ── Controlador ───────────────────────────────────────────────────────────────
async function extraerTexto(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo' });
  }

  const { originalname, mimetype, size } = req.file;
  console.log(`📄 Archivo recibido: "${originalname}" — ${(size / 1024).toFixed(0)} KB — ${mimetype}`);

  try {
    let rawText = '';

    if (mimetype === 'application/pdf') {
      const data = await pdfParse(req.file.buffer);
      rawText = data.text ?? '';
    } else {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      rawText = result.value ?? '';
    }

    if (!rawText.trim()) {
      return res.status(422).json({
        error: 'El archivo no contiene texto extraíble (PDF escaneado sin OCR o archivo vacío)',
      });
    }

    const texto = smartExtract(rawText);

    console.log(`✅ Texto listo: ${rawText.length} chars brutos → ${texto.length} chars extraídos`);
    res.json({
      status:   'success',
      texto,
      chars:    texto.length,
      chars_raw: rawText.length,
      filename: originalname,
    });
  } catch (err) {
    console.error('❌ Error al extraer texto:', err.message);
    res.status(500).json({ error: 'Error al procesar el archivo', detalle: err.message });
  }
}

module.exports = { upload, extraerTexto };
