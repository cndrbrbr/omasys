const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const multer = require('multer')
const Database = require('better-sqlite3')
const cron = require('node-cron')
const path = require('path')
const fs = require('fs')
const jwt = require('jsonwebtoken')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

const app = express()
const server = http.createServer(app)

const PORT = process.env.PORT || 3000
const POST_PASSWORD = process.env.POST_PASSWORD || 'changeme'
const OMA_PIN = process.env.OMA_PIN || '1234'
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret'
const DATA_DIR = process.env.DATA_DIR || '/data'
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads')

fs.mkdirSync(UPLOADS_DIR, { recursive: true })

// Database
const db = new Database(path.join(DATA_DIR, 'omasys.db'))
db.exec(`
  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    caption TEXT DEFAULT '',
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    sender TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reaction TEXT NOT NULL,
    reacted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

// Socket.io with JWT auth
const io = new Server(server, {
  cors: { origin: false },
  allowRequest: (req, callback) => {
    // Allow socket.io handshake — token is checked in middleware below
    callback(null, true)
  }
})

io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) return next(new Error('Unauthorized'))
  try {
    socket.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    next(new Error('Unauthorized'))
  }
})

// Multer
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  }
})
const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Only images allowed'))
  }
})

// Security headers (relax CSP for Jitsi iframe)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      frameSrc: ['https://meet.jit.si'],
      connectSrc: ["'self'", 'wss:', 'ws:'],
      mediaSrc: ["'self'", 'blob:'],
    }
  },
  crossOriginEmbedderPolicy: false
}))

app.use(express.json())
app.use('/uploads', express.static(UPLOADS_DIR))

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,
  message: { error: 'Zu viele Versuche. Bitte 15 Minuten warten.' },
  standardHeaders: true,
  legacyHeaders: false
})

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 50,
  message: { error: 'Upload-Limit erreicht.' }
})

const msgLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: { error: 'Nachrichten-Limit erreicht.' }
})

// JWT middleware
const requireToken = (roles) => (req, res, next) => {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Nicht angemeldet' })
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET)
    if (roles && !roles.includes(payload.role)) return res.status(403).json({ error: 'Keine Berechtigung' })
    req.user = payload
    next()
  } catch {
    res.status(401).json({ error: 'Token ungültig oder abgelaufen' })
  }
}

const requireFamily = requireToken(['family'])
const requireAny = requireToken(['family', 'oma'])

// ── API Routes ────────────────────────────────────────────────

// Auth: PostGUI (password → JWT)
app.post('/api/auth', authLimiter, (req, res) => {
  if (req.body.password !== POST_PASSWORD) {
    return res.status(401).json({ ok: false, error: 'Falsches Passwort' })
  }
  const token = jwt.sign({ role: 'family' }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ ok: true, token })
})

// Auth: OmaGUI (PIN → JWT)
app.post('/api/auth/oma', authLimiter, (req, res) => {
  if (String(req.body.pin) !== String(OMA_PIN)) {
    return res.status(401).json({ ok: false, error: 'Falscher PIN' })
  }
  const token = jwt.sign({ role: 'oma' }, JWT_SECRET, { expiresIn: '30d' })
  res.json({ ok: true, token })
})

// Photos
app.get('/api/photos', requireAny, (req, res) => {
  const photos = db.prepare('SELECT * FROM photos ORDER BY uploaded_at DESC LIMIT 50').all()
  res.json(photos)
})

app.post('/api/photos', requireFamily, uploadLimiter, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Kein Bild' })
  const caption = req.body.caption || ''
  const photo = db.prepare('INSERT INTO photos (filename, caption) VALUES (?, ?) RETURNING *')
    .get(req.file.filename, caption)
  io.emit('new_photo', photo)
  res.json(photo)
})

app.delete('/api/photos/:id', requireFamily, (req, res) => {
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id)
  if (!photo) return res.status(404).json({ error: 'Nicht gefunden' })
  try { fs.unlinkSync(path.join(UPLOADS_DIR, photo.filename)) } catch (e) {}
  db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id)
  io.emit('photo_deleted', { id: parseInt(req.params.id) })
  res.json({ ok: true })
})

// Messages
app.get('/api/messages', requireAny, (req, res) => {
  const messages = db.prepare('SELECT * FROM messages ORDER BY sent_at DESC LIMIT 100').all()
  res.json(messages.reverse())
})

app.post('/api/messages', requireFamily, msgLimiter, (req, res) => {
  const { text, sender = 'Familie' } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'Leere Nachricht' })
  const msg = db.prepare('INSERT INTO messages (text, sender) VALUES (?, ?) RETURNING *')
    .get(text.trim(), sender)
  io.emit('new_message', msg)
  res.json(msg)
})

app.post('/api/messages/oma', requireAny, msgLimiter, (req, res) => {
  const { text } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'Leere Nachricht' })
  const msg = db.prepare('INSERT INTO messages (text, sender) VALUES (?, ?) RETURNING *')
    .get(text.trim(), 'Oma Sigrid')
  io.emit('new_message', msg)
  res.json(msg)
})

// Reactions
app.post('/api/reactions', requireAny, (req, res) => {
  const { reaction } = req.body
  if (!reaction) return res.status(400).json({ error: 'Keine Reaktion' })
  const r = db.prepare('INSERT INTO reactions (reaction) VALUES (?) RETURNING *').get(reaction)
  io.emit('new_reaction', r)
  res.json(r)
})

app.get('/api/reactions', requireAny, (req, res) => {
  const reactions = db.prepare('SELECT * FROM reactions ORDER BY reacted_at DESC LIMIT 30').all()
  res.json(reactions)
})

// Status (public — used by Docker healthcheck)
app.get('/api/status', (req, res) => res.json({ ok: true, time: new Date().toISOString() }))

// Serve frontends (after all API routes)
app.use('/post', express.static(path.join(__dirname, 'public/post')))
app.use('/', express.static(path.join(__dirname, 'public/oma')))

// SPA fallbacks
app.get('/post/*', (req, res) => res.sendFile(path.join(__dirname, 'public/post/index.html')))
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public/oma/index.html')))

// ── Socket.io ────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id} (${socket.user.role})`)

  socket.on('call_request', (data) => {
    socket.broadcast.emit('incoming_call', data)
  })

  socket.on('call_accepted', () => {
    socket.broadcast.emit('call_accepted')
  })

  socket.on('call_ended', () => {
    io.emit('call_ended')
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

// Morning greeting cron: every day at 08:00
cron.schedule('0 8 * * *', () => {
  console.log('Sending morning greeting')
  io.emit('morning_greeting', {
    message: 'Guten Morgen, Oma Sigrid!',
    sub: 'Ein neuer schöner Tag beginnt. ☀️',
    timestamp: new Date().toISOString()
  })
})

server.listen(PORT, () => {
  console.log(`OmaSys läuft auf Port ${PORT}`)
  console.log(`OmaGUI:  http://localhost:${PORT}/`)
  console.log(`PostGUI: http://localhost:${PORT}/post`)
})
