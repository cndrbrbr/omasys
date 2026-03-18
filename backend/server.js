const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const multer = require('multer')
const Database = require('better-sqlite3')
const cron = require('node-cron')
const path = require('path')
const fs = require('fs')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'DELETE'] }
})

const PORT = process.env.PORT || 3000
const POST_PASSWORD = process.env.POST_PASSWORD || 'omasys123'
const DATA_DIR = process.env.DATA_DIR || '/data'
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads')

fs.mkdirSync(UPLOADS_DIR, { recursive: true })

// Database setup
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

// Multer file upload
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

app.use(express.json())
app.use('/uploads', express.static(UPLOADS_DIR))

// Auth middleware
const requireAuth = (req, res, next) => {
  const pw = req.headers['x-password'] || req.body?.password
  if (pw !== POST_PASSWORD) return res.status(401).json({ error: 'Falsches Passwort' })
  next()
}

// API: auth
app.post('/api/auth', (req, res) => {
  if (req.body.password === POST_PASSWORD) res.json({ ok: true })
  else res.status(401).json({ ok: false })
})

// API: photos
app.get('/api/photos', (req, res) => {
  const photos = db.prepare('SELECT * FROM photos ORDER BY uploaded_at DESC LIMIT 50').all()
  res.json(photos)
})

app.post('/api/photos', requireAuth, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })
  const caption = req.body.caption || ''
  const photo = db.prepare('INSERT INTO photos (filename, caption) VALUES (?, ?) RETURNING *')
    .get(req.file.filename, caption)
  io.emit('new_photo', photo)
  res.json(photo)
})

app.delete('/api/photos/:id', requireAuth, (req, res) => {
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id)
  if (!photo) return res.status(404).json({ error: 'Not found' })
  try { fs.unlinkSync(path.join(UPLOADS_DIR, photo.filename)) } catch (e) {}
  db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id)
  io.emit('photo_deleted', { id: parseInt(req.params.id) })
  res.json({ ok: true })
})

// API: messages
app.get('/api/messages', (req, res) => {
  const messages = db.prepare('SELECT * FROM messages ORDER BY sent_at DESC LIMIT 100').all()
  res.json(messages.reverse())
})

app.post('/api/messages', requireAuth, (req, res) => {
  const { text, sender = 'Familie' } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'Leere Nachricht' })
  const msg = db.prepare('INSERT INTO messages (text, sender) VALUES (?, ?) RETURNING *')
    .get(text.trim(), sender)
  io.emit('new_message', msg)
  res.json(msg)
})

// Oma can send messages back (no password needed)
app.post('/api/messages/oma', (req, res) => {
  const { text } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'Leere Nachricht' })
  const msg = db.prepare('INSERT INTO messages (text, sender) VALUES (?, ?) RETURNING *')
    .get(text.trim(), 'Oma Sigrid')
  io.emit('new_message', msg)
  res.json(msg)
})

// API: reactions (no auth — Oma sends these)
app.post('/api/reactions', (req, res) => {
  const { reaction } = req.body
  if (!reaction) return res.status(400).json({ error: 'No reaction' })
  const r = db.prepare('INSERT INTO reactions (reaction) VALUES (?) RETURNING *').get(reaction)
  io.emit('new_reaction', r)
  res.json(r)
})

app.get('/api/reactions', (req, res) => {
  const reactions = db.prepare('SELECT * FROM reactions ORDER BY reacted_at DESC LIMIT 30').all()
  res.json(reactions)
})

// API: status
app.get('/api/status', (req, res) => res.json({ ok: true, time: new Date().toISOString() }))

// Serve frontends (after all API routes)
app.use('/post', express.static(path.join(__dirname, 'public/post')))
app.use('/', express.static(path.join(__dirname, 'public/oma')))

// SPA fallbacks
app.get('/post/*', (req, res) => res.sendFile(path.join(__dirname, 'public/post/index.html')))
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public/oma/index.html')))

// Socket.io events
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

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
