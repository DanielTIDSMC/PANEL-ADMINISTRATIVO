import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { networkInterfaces } from 'os';
import pkg from 'pg';
import jwt from 'jsonwebtoken';

dotenv.config();

const { Pool } = pkg;
const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

// PostgreSQL Pool (optional - gracefully handles missing DB)
let pool = null;
try {
    pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432'),
    });
} catch (e) {
    console.warn('⚠️  PostgreSQL no disponible - modo demo activo');
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    if (token === 'demo-token') { req.user = { id: 1, email: 'admin@retiscan.ai' }; return next(); }
    try {
        const user = jwt.verify(token, process.env.JWT_SECRET || 'retiscan_secret');
        req.user = user;
        next();
    } catch {
        return res.sendStatus(403);
    }
};

// --- WEBSOCKET SETUP ---
const wss = new WebSocketServer({ server });
const sessions = new Map(); // sessionId -> { phone: ws, admin: ws[] }

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://localhost`);
    const sessionId = url.searchParams.get('session') || 'default';
    const role = url.searchParams.get('role') || 'admin'; // 'phone' or 'admin'

    console.log(`🔌 WebSocket conectado | Sesión: ${sessionId} | Rol: ${role}`);

    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, { phone: null, admins: [] });
    }

    const session = sessions.get(sessionId);

    if (role === 'phone') {
        session.phone = ws;
        // Notify admins that phone connected
        session.admins.forEach(admin => {
            if (admin.readyState === WebSocket.OPEN) {
                admin.send(JSON.stringify({ type: 'phone_connected', sessionId }));
            }
        });
        console.log(`📱 Celular conectado a sesión ${sessionId}`);

        ws.on('message', (data) => {
            // Forward camera frames from phone to all admins
            session.admins.forEach(admin => {
                if (admin.readyState === WebSocket.OPEN) {
                    admin.send(data);
                }
            });
        });

        ws.on('close', () => {
            session.phone = null;
            session.admins.forEach(admin => {
                if (admin.readyState === WebSocket.OPEN) {
                    admin.send(JSON.stringify({ type: 'phone_disconnected', sessionId }));
                }
            });
        });

    } else {
        // Admin panel connection
        session.admins.push(ws);
        // Tell admin if phone is already connected
        if (session.phone && session.phone.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'phone_connected', sessionId }));
        }

        ws.on('close', () => {
            session.admins = session.admins.filter(a => a !== ws);
        });
    }
});

// --- GET LOCAL IP ---
const getLocalIp = () => {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
};

// --- REST ROUTES ---

app.get('/api/network-info', (req, res) => {
    const ip = getLocalIp();
    res.json({
        ip,
        adminUrl: `http://${ip}:5173`,
        mobileUrl: `http://${ip}:5173/mobile.html`,
        wsUrl: `ws://${ip}:${port}`
    });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    // Demo mode - always works
    if (email === 'admin@retiscan.ai') {
        const token = jwt.sign({ id: 1, email }, process.env.JWT_SECRET || 'retiscan_secret', { expiresIn: '7d' });
        return res.json({ token, user: { email, role: 'admin' } });
    }
    // Try DB if available
    if (pool) {
        try {
            const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            const user = result.rows[0];
            if (user && user.password === password) {
                const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'retiscan_secret', { expiresIn: '7d' });
                return res.json({ token });
            }
        } catch (err) { console.error(err); }
    }
    res.status(401).json({ message: 'Credenciales inválidas' });
});

app.get('/api/patients', authenticateToken, async (req, res) => {
    if (!pool) return res.json([]); // Let frontend use localStorage
    try {
        const result = await pool.query('SELECT * FROM patients ORDER BY created_at DESC');
        const patients = result.rows.map(row => ({
            id: row.patient_id,
            user: row.full_name,
            status: row.status || 'Completed',
            pathology: row.pathology || 'None',
            date: new Date(row.created_at).toLocaleString('es-MX'),
            age: row.age,
            gender: row.gender,
            notes: row.medical_notes
        }));
        res.json(patients);
    } catch (err) {
        console.error(err);
        res.json([]); // Return empty, let frontend use localStorage
    }
});

app.post('/api/patients', authenticateToken, async (req, res) => {
    const { user, id, age, gender, notes } = req.body;
    if (!pool) {
        // Demo mode: return mock response
        return res.status(201).json({ patient_id: id, full_name: user, age, gender, medical_notes: notes });
    }
    try {
        const result = await pool.query(
            'INSERT INTO patients (full_name, patient_id, age, gender, medical_notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [user, id, age, gender, notes]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al registrar paciente' });
    }
});

server.listen(port, '0.0.0.0', () => {
    const ip = getLocalIp();
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   🏥  RetiScan Backend - ACTIVO        ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║  API:     http://localhost:${port}        ║`);
    console.log(`║  Red:     http://${ip}:${port}     ║`);
    console.log(`║  WS:      ws://${ip}:${port}       ║`);
    console.log('╚════════════════════════════════════════╝\n');
});
