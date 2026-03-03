import React, { useState, useMemo, useEffect } from 'react'
import {
    LayoutDashboard,
    Users,
    Settings,
    Bell,
    Search,
    Menu,
    TrendingUp,
    Activity,
    Eye,
    ShieldCheck,
    ChevronRight,
    UserCircle,
    FileDown,
    RefreshCcw,
    Plus,
    LogOut,
    EyeOff,
    Camera,
    Focus,
    FileText,
    PenTool,
    Key
} from 'lucide-react'
import { motion, AnimatePresence, useMotionValue, useMotionTemplate } from 'framer-motion'
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts'
import { QRCodeCanvas } from 'qrcode.react'
import api from './api/axios'
import { useForm } from 'react-hook-form'

import LoadingScreen from './components/LoadingScreen'
import { Logo, LogoText } from './components/Logo'

// Initial Mock Data (will be replaced by API)
const data = [
    { name: 'Lun', scans: 45, accuracy: 98.2 },
    { name: 'Mar', scans: 52, accuracy: 98.4 },
    { name: 'Mié', scans: 48, accuracy: 98.1 },
    { name: 'Jue', scans: 61, accuracy: 98.7 },
    { name: 'Vie', scans: 55, accuracy: 98.5 },
    { name: 'Sáb', scans: 67, accuracy: 98.9 },
    { name: 'Dom', scans: 72, accuracy: 99.1 },
]

export default function App() {
    const [loading, setLoading] = useState(true)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [activeBoard, setActiveBoard] = useState('dashboard')
    const [searchQuery, setSearchQuery] = useState('')
    const [notifications, setNotifications] = useState(false)
    const [scanning, setScanning] = useState(false)
    const [showQR, setShowQR] = useState(false)
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'waiting' | 'connected'>('idle')
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('retiscan_token'))
    const [loginLoading, setLoginLoading] = useState(false)
    const [recentScans, setRecentScans] = useState<any[]>([])
    const [networkInfo, setNetworkInfo] = useState<any>(null)
    const [liveFrame, setLiveFrame] = useState<string | null>(null)
    const wsRef = React.useRef<WebSocket | null>(null)
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean,
        title: string,
        message: string,
        type: 'info' | 'success' | 'warning',
        contentType?: 'info' | 'patientForm'
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        contentType: 'info'
    })

    const showModal = (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info', contentType: 'info' | 'patientForm' = 'info') => {
        setModalConfig({ isOpen: true, title, message, type, contentType })
    }

    // Load initial data
    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 2000)
        if (isLoggedIn) {
            loadPatients()
            fetchNetworkInfo()
            connectAdminWS()
        }
        return () => clearTimeout(timer)
    }, [isLoggedIn])

    const fetchNetworkInfo = async () => {
        try {
            const res = await api.get('/network-info')
            setNetworkInfo(res.data)
        } catch {
            setNetworkInfo({ ip: window.location.hostname, wsUrl: `ws://${window.location.hostname}:3000`, mobileUrl: `http://${window.location.hostname}:5173/mobile.html` })
        }
    }

    const connectAdminWS = () => {
        const sessionId = 'main_session'
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}/socket?session=${sessionId}&role=admin`)
        wsRef.current = ws
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                if (data.type === 'phone_connected') setConnectionStatus('connected')
                if (data.type === 'phone_disconnected') { setConnectionStatus('waiting'); setLiveFrame(null) }
                if (data.type === 'camera_stopped') setLiveFrame(null)
            } catch {
                // Binary/frame data - try as JSON first failed, check for frame
                try {
                    const msg = JSON.parse(event.data)
                    if (msg.type === 'video_frame') setLiveFrame(msg.frame)
                } catch { /* not JSON */ }
            }
        }
        ws.onopen = () => console.log('Admin WS connected via proxy')
        ws.onerror = () => console.log('Admin WS error - backend may be offline')
    }

    // Load patients from localStorage or seed demo data
    const loadPatients = async () => {
        // Try API first
        try {
            const response = await api.get('/patients')
            if (response.data && response.data.length > 0) {
                setRecentScans(response.data)
                localStorage.setItem('retiscan_patients', JSON.stringify(response.data))
                return
            }
        } catch (_) { /* API not available, use local */ }

        // Fallback: load from localStorage
        const stored = localStorage.getItem('retiscan_patients')
        if (stored) {
            setRecentScans(JSON.parse(stored))
        } else {
            // Seed with demo patients on first launch
            const demoPatients = [
                { id: 'RS-9281', user: 'Juan Pérez López', status: 'Completed', pathology: 'None', date: '02/03/2024 10:30', age: 45, gender: 'Masculino', notes: '' },
                { id: 'RS-9282', user: 'María García Ruiz', status: 'Pending', pathology: 'Pendiente', date: '02/03/2024 11:15', age: 38, gender: 'Femenino', notes: 'Control de seguimiento' },
                { id: 'RS-9283', user: 'Carlos Ruiz Mendez', status: 'Completed', pathology: 'Retinopathy Stage 1', date: '02/03/2024 12:45', age: 62, gender: 'Masculino', notes: 'Diabetes tipo 2' },
                { id: 'RS-9284', user: 'Elena Sanz Torres', status: 'Completed', pathology: 'None', date: '02/03/2024 13:20', age: 29, gender: 'Femenino', notes: '' },
            ]
            setRecentScans(demoPatients)
            localStorage.setItem('retiscan_patients', JSON.stringify(demoPatients))
        }
    }

    // Save patient to localStorage + state
    const savePatient = (patient: any) => {
        setRecentScans(prev => {
            const updated = [patient, ...prev]
            localStorage.setItem('retiscan_patients', JSON.stringify(updated))
            return updated
        })
    }

    const filteredScans = useMemo(() => {
        const normalize = (str: string) =>
            str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

        const query = normalize(searchQuery);

        return recentScans.filter(scan =>
            normalize(scan.user).includes(query) ||
            normalize(scan.id).includes(query) ||
            normalize(scan.pathology).includes(query)
        )
    }, [searchQuery, recentScans])

    const handleStartScan = () => {
        setShowQR(true)
        setConnectionStatus('waiting')
        // No auto-timeout here, it stays open until explicitly updated or connected
    }

    const handleConnectionSuccess = () => {
        setConnectionStatus('connected')
        setTimeout(() => {
            setShowQR(false)
            setScanning(true)
            setTimeout(() => {
                setScanning(false)
                setActiveBoard('analysis')
                setConnectionStatus('idle')
            }, 2000)
        }, 1500)
    }

    const handleExport = () => {
        setLoginLoading(true)
        setTimeout(() => {
            setLoginLoading(false)
            showModal('REPORTE GENERADO', 'El archivo RetiScan_Analytics_2024.csv ha sido descargado exitosamente.', 'success')
        }, 1500)
    }

    const toggleNotifications = () => {
        setNotifications(!notifications)
    }

    const handleLogin = async (e: React.FormEvent, credentials: any) => {
        setLoginLoading(true)
        try {
            const response = await api.post('/auth/login', credentials)
            localStorage.setItem('retiscan_token', response.data.token)
            setIsLoggedIn(true)
            await loadPatients()
        } catch (error: any) {
            // Demo fallback: if API is offline, allow demo credentials
            if (credentials.email === 'admin@retiscan.ai') {
                localStorage.setItem('retiscan_token', 'demo-token')
                setIsLoggedIn(true)
                await loadPatients()
            } else {
                setLoginLoading(false)
                alert('Credenciales incorrectas o servidor no disponible. Use admin@retiscan.ai')
            }
        } finally {
            setLoginLoading(false)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('retiscan_token')
        setIsLoggedIn(false)
        setActiveBoard('dashboard')
    }

    const handleNewPatient = () => {
        showModal('ALTA DE PACIENTE', 'Complete los datos para integrar al nuevo paciente al sistema central.', 'info', 'patientForm')
    }

    if (!isLoggedIn) {
        return <LoginScreen onLogin={handleLogin} loading={loginLoading} />
    }

    return (
        <div className="flex min-h-screen bg-[#06080C] text-foreground overflow-hidden font-['Outfit']">
            <AnimatePresence>
                {(loading || scanning) && <LoadingScreen label={scanning ? "VINCULANDO DISPOSITIVO..." : "INICIAR SISTEMA..."} />}
            </AnimatePresence>

            <AnimatePresence>
                {showQR && (
                    <QRModal
                        status={connectionStatus}
                        onClose={() => { setShowQR(false); setLiveFrame(null); }}
                        onSimulateSuccess={handleConnectionSuccess}
                        networkInfo={networkInfo}
                        liveFrame={liveFrame}
                    />
                )}
            </AnimatePresence>

            <div className="nebula-bg"></div>

            {/* Sidebar */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.aside
                        initial={{ x: -280, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -280, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                        className="w-72 border-r border-white/5 p-8 flex flex-col space-y-8 z-20 bg-[#0B0E14]/80 backdrop-blur-xl"
                    >
                        <div className="flex items-center space-x-4 mb-10 cursor-pointer group" onClick={() => setActiveBoard('dashboard')}>
                            <motion.div
                                whileHover={{ scale: 1.05, rotate: 5 }}
                                className="relative"
                            >
                                <div className="absolute -inset-1.5 bg-gradient-to-r from-primary via-secondary to-primary rounded-2xl blur-md opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                                <div className="relative w-14 h-14 rounded-2xl bg-[#0B0E14] flex items-center justify-center border border-white/10 overflow-hidden">
                                    <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                                    <Logo size={32} className="text-primary" />
                                </div>
                            </motion.div>
                            <div>
                                <LogoText size={28} className="font-black tracking-tighter" />
                                <div className="flex items-center space-x-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                    <span className="text-[9px] font-black tracking-[0.3em] text-primary/60 uppercase">System Core v3</span>
                                </div>
                            </div>
                        </div>

                        <nav className="flex-1 space-y-3">
                            <SidebarItem
                                icon={<LayoutDashboard size={20} />}
                                label="Escritorio"
                                active={activeBoard === 'dashboard'}
                                onClick={() => setActiveBoard('dashboard')}
                            />
                            <SidebarItem
                                icon={<Eye size={20} />}
                                label="Análisis en Vivo"
                                active={activeBoard === 'analysis'}
                                onClick={() => setActiveBoard('analysis')}
                            />
                            <SidebarItem
                                icon={<Users size={20} />}
                                label="Pacientes"
                                active={activeBoard === 'users'}
                                onClick={() => setActiveBoard('users')}
                            />
                            <SidebarItem
                                icon={<TrendingUp size={20} />}
                                label="Estadísticas"
                                active={activeBoard === 'reports'}
                                onClick={() => setActiveBoard('reports')}
                            />
                            <SidebarItem
                                icon={<Settings size={20} />}
                                label="Sistema"
                                active={activeBoard === 'settings'}
                                onClick={() => setActiveBoard('settings')}
                            />

                            <div className="pt-6 border-t border-white/5 space-y-4">
                                <div
                                    onClick={() => setActiveBoard('settings')}
                                    className="p-4 glass-card bg-white/[0.02] border-white/5 group relative overflow-hidden cursor-pointer hover:bg-white/[0.06] transition-all"
                                >
                                    <div className="flex items-center space-x-3 relative z-10">
                                        <div className="w-10 h-10 rounded-full border-2 border-primary/30 p-0.5">
                                            <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                                                <UserCircle size={24} className="text-primary" />
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-sm font-bold text-white">Dr. Raul</p>
                                            <p className="text-[10px] text-primary/70 font-mono uppercase tracking-widest">Medical Admin</p>
                                        </div>
                                    </div>
                                </div>
                                <motion.button
                                    whileHover={{ x: 5 }}
                                    onClick={handleLogout}
                                    className="w-full p-4 flex items-center space-x-4 text-white/40 hover:text-secondary hover:bg-secondary/5 rounded-2xl transition-all border border-transparent hover:border-secondary/20 group"
                                >
                                    <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
                                    <span className="text-sm font-bold tracking-tight">Cerrar Sesión</span>
                                </motion.button>
                            </div>
                        </nav>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative overflow-y-auto">
                <header className="h-20 px-10 flex items-center justify-between sticky top-0 bg-transparent backdrop-blur-md z-10 border-b border-white/[0.03]">
                    <div className="flex items-center space-x-6">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2.5 hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10"
                        >
                            <Menu size={22} className="text-white/70" />
                        </button>
                        <div className="relative group max-w-md w-96 hidden md:block">
                            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-all duration-500 group-focus-within:scale-110" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Consultar base de datos..."
                                className="bg-white/[0.02] border border-white/5 rounded-3xl py-3.5 pl-14 pr-6 w-full focus:outline-none focus:border-primary/30 focus:bg-white/[0.05] transition-all duration-500 text-sm backdrop-blur-3xl font-medium tracking-tight placeholder:text-white/10"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md bg-white/5 border border-white/5 text-[9px] font-mono text-white/20 group-focus-within:opacity-0 transition-opacity uppercase tracking-widest">Ctrl+K</div>
                        </div>
                    </div>

                    <div className="hidden xl:flex items-center space-x-8">
                        <div className="h-10 w-px bg-white/10"></div>
                        <div className="flex flex-col items-start font-mono text-[10px]">
                            <div className="flex items-center space-x-2">
                                <span className="text-white/30 uppercase">System Time:</span>
                                <span className="text-primary font-black tabular-nums tracking-widest leading-none">
                                    <RealTimeClock />
                                </span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                                <span className="text-white/30 uppercase">Core Load:</span>
                                <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        animate={{ width: ['20%', '45%', '30%', '40%'] }}
                                        transition={{ duration: 5, repeat: Infinity }}
                                        className="h-full bg-primary/40"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-6">
                        <div className="h-10 w-px bg-white/10"></div>
                        <div className="flex flex-col items-start font-mono text-[10px]">
                            <div className="flex items-center space-x-2">
                                <span className="text-white/30 uppercase">System Time:</span>
                                <span className="text-primary font-black tabular-nums tracking-widest leading-none">
                                    <RealTimeClock />
                                </span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                                <span className="text-white/30 uppercase">Core Load:</span>
                                <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        animate={{ width: ['20%', '45%', '30%', '40%'] }}
                                        transition={{ duration: 5, repeat: Infinity }}
                                        className="h-full bg-primary/40"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-6">
                        <div className="flex items-center px-4 py-2 bg-primary/5 rounded-xl border border-primary/20 cursor-help" title="Sincronización en tiempo real">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse mr-3"></div>
                            <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">Live Database Sync</span>
                        </div>

                        <div className="relative">
                            <button
                                onClick={toggleNotifications}
                                className="relative p-2.5 hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10"
                            >
                                <Bell size={22} className="text-white/70" />
                                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-secondary rounded-full"></span>
                            </button>
                            <AnimatePresence>
                                {notifications && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute right-0 mt-4 w-64 glass-card p-4 z-50 border-white/10"
                                    >
                                        <p className="text-xs font-bold mb-2">Notificaciones</p>
                                        <div className="space-y-2">
                                            <div className="p-2 bg-white/5 rounded-lg text-[10px] border-l-2 border-primary">Nuevo escaneo de RS-9284 archivado.</div>
                                            <div className="p-2 bg-white/5 rounded-lg text-[10px] border-l-2 border-secondary">Alerta de precisión en RS-9282.</div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <button
                            onClick={handleStartScan}
                            className="btn-antigravity flex items-center space-x-2 text-sm"
                        >
                            <Logo size={18} className="text-white" />
                            <span>INICIAR ESCANEO</span>
                        </button>
                    </div>
                </header>

                {activeBoard === 'dashboard' && (
                    <div className="p-10 space-y-10 max-w-[1600px] mx-auto w-full">
                        {/* Welcome Header */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between space-y-4 md:space-y-0 relative">
                            <div className="flex flex-col space-y-2">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: '100px' }}
                                    className="h-1 bg-primary mb-4 rounded-full shadow-[0_0_15px_#00F0FF]"
                                />
                                <motion.h2
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-6xl font-black tracking-tighter flex items-baseline hover:animate-glitch cursor-default"
                                >
                                    <span className="text-glow text-white">BIENVENIDO</span>
                                    <span className="mx-4 text-white/10 text-4xl">/</span>
                                    <span className="text-3xl opacity-40 font-light tracking-widest uppercase">Escritorio Central</span>
                                </motion.h2>
                                <p className="text-xs text-white/30 font-mono tracking-[0.3em] uppercase">Autenticación Biométrica: <span className="text-primary">DR. RAUL [VERIFIED]</span></p>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.05, x: -5 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleLogout}
                                className="flex items-center space-x-3 px-6 py-3 rounded-2xl bg-secondary/10 border border-secondary/30 text-secondary hover:bg-secondary/20 transition-all group overflow-hidden relative"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                                <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
                                <span className="text-xs font-black uppercase tracking-widest">Cerrar Sesión Segura</span>
                            </motion.button>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <StatCard
                                icon={<Logo className="text-primary" size={28} />}
                                label="Escaneos Totales"
                                value="1,284"
                                trend="+12.5%"
                                color="primary"
                                delay={0.1}
                            />
                            <StatCard
                                icon={<Activity className="text-secondary" size={28} />}
                                label="Precisión IA"
                                value="99.1%"
                                trend="+0.3%"
                                color="secondary"
                                delay={0.2}
                            />
                            <StatCard
                                icon={<Users className="text-blue-400" size={28} />}
                                label="Pacientes Activos"
                                value="84"
                                trend="+5.2%"
                                color="blue"
                                delay={0.3}
                            />
                            <StatCard
                                icon={<ShieldCheck className="text-green-400" size={28} />}
                                label="Integridad Médica"
                                value="SECURE"
                                trend="99.9%"
                                color="green"
                                delay={0.4}
                            />
                        </div>

                        {/* Main Analysis Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            {/* Chart Area */}
                            <div className="lg:col-span-2 glass-card p-8 flex flex-col h-[500px]">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-xl font-bold flex items-center space-x-3">
                                            <TrendingUp className="text-primary" size={24} />
                                            <span>Fluctuación de Diagnósticos</span>
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1">Análisis predictivo basado en los últimos 7 días</p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/10 transition-all">Día</button>
                                        <button className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-widest text-primary">Semana</button>
                                        <button className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/10 transition-all">Mes</button>
                                    </div>
                                </div>

                                <div className="flex-1 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={data}>
                                            <defs>
                                                <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#00F0FF" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8A2BE2" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#8A2BE2" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#ffffff05" />
                                            <XAxis
                                                dataKey="name"
                                                stroke="#94A3B8"
                                                fontSize={11}
                                                tickLine={false}
                                                axisLine={false}
                                                dy={15}
                                            />
                                            <YAxis
                                                stroke="#94A3B8"
                                                fontSize={11}
                                                tickLine={false}
                                                axisLine={false}
                                                dx={-10}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(11, 14, 20, 0.9)',
                                                    borderColor: 'rgba(255, 255, 255, 0.1)',
                                                    borderRadius: '20px',
                                                    backdropFilter: 'blur(10px)',
                                                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                                                }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="scans"
                                                stroke="#00F0FF"
                                                fillOpacity={1}
                                                fill="url(#colorScans)"
                                                strokeWidth={4}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="accuracy"
                                                stroke="#8A2BE2"
                                                fillOpacity={1}
                                                fill="url(#colorAccuracy)"
                                                strokeWidth={4}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Live Scanner Visualizer */}
                            <div className="glass-card p-8 flex flex-col justify-between overflow-hidden relative group min-h-[500px]">
                                <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

                                <div className="flex items-center justify-between relative z-10">
                                    <div>
                                        <h3 className="text-xl font-black mb-1 flex items-center space-x-2">
                                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]"></span>
                                            <span>Unidad de Captura 01</span>
                                        </h3>
                                        <p className="text-[10px] font-mono text-primary/60 tracking-[0.2em]">ID: RET-EYE-9210-X</p>
                                    </div>
                                    <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                                        <div className="flex items-center space-x-2">
                                            <Activity size={14} className="text-primary animate-pulse" />
                                            <span className="text-[10px] font-black font-mono">24 FPS</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 flex items-center justify-center relative my-10 group/scanner">
                                    {/* Advanced Eye Visualizer */}
                                    <div className="relative w-64 h-64">
                                        {/* Outer Rings */}
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                                            className="absolute -inset-4 rounded-full border border-dashed border-primary/10"
                                        />
                                        <motion.div
                                            animate={{ rotate: -360 }}
                                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                            className="absolute -inset-8 rounded-full border border-primary/5"
                                        />

                                        {/* Main Eye Body */}
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#1A1F2B] to-[#06080C] border border-white/10 shadow-2xl flex items-center justify-center overflow-hidden">
                                            {/* Retinal Pattern Mockup */}
                                            <div className="absolute inset-2 rounded-full opacity-20 bg-[radial-gradient(circle_at_center,_var(--primary)_0%,_transparent_70%)] filter blur-xl"></div>

                                            {/* Pupil */}
                                            <motion.div
                                                animate={{
                                                    scale: [1, 0.95, 1.05, 1],
                                                    filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)']
                                                }}
                                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                                className="w-24 h-24 rounded-full bg-black border-[6px] border-primary/30 relative flex items-center justify-center shadow-[0_0_40px_rgba(0,240,255,0.3)]"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-primary/20 backdrop-blur-sm relative">
                                                    <div className="absolute top-1 left-2 w-2 h-2 rounded-full bg-white/40 blur-[1px]"></div>
                                                </div>

                                                {/* HUD Over Pupil */}
                                                <div className="absolute inset-[-10px] border border-primary/20 rounded-full animate-spin-slow"></div>
                                            </motion.div>

                                            {/* Scanning Line */}
                                            <motion.div
                                                animate={{ top: ['-10%', '110%'] }}
                                                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                                                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_#00F0FF] z-20 flex items-center justify-center"
                                            >
                                                <div className="px-2 py-0.5 rounded-full bg-primary text-[6px] font-black text-black uppercase transform -translate-y-4">SCANNING_DATA</div>
                                            </motion.div>
                                        </div>

                                        {/* Crosshair Elements */}
                                        <div className="absolute inset-0 pointer-events-none">
                                            <div className="absolute top-1/2 left-[-20px] right-[-20px] h-px bg-primary/20 divide-x divide-primary/40 flex justify-between">
                                                <div className="w-4"></div><div className="w-4"></div>
                                            </div>
                                            <div className="absolute left-1/2 top-[-20px] bottom-[-20px] w-px bg-primary/20 flex flex-col justify-between">
                                                <div className="h-4 bg-primary/40"></div><div className="h-4 bg-primary/40"></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Data Readouts on Sides */}
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 space-y-4 text-right">
                                        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="font-mono">
                                            <p className="text-[8px] text-white/30 uppercase">Pressure</p>
                                            <p className="text-xs font-black text-primary">12.4 mmHg</p>
                                        </motion.div>
                                        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.7 }} className="font-mono">
                                            <p className="text-[8px] text-white/30 uppercase">Precision</p>
                                            <p className="text-xs font-black text-secondary">99.98%</p>
                                        </motion.div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 relative z-10">
                                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-3xl cursor-pointer hover:bg-white/[0.05] transition-all group/item">
                                        <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mb-1 group-hover/item:text-primary transition-colors">Estado Enfoque</p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xl font-black text-primary">ÓPTIMO</p>
                                            <ChevronRight size={14} className="text-white/20 group-hover/item:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-3xl cursor-pointer hover:bg-white/[0.05] transition-all group/item">
                                        <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mb-1 group-hover/item:text-secondary transition-colors">Profundidad</p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xl font-black text-secondary">0.024mm</p>
                                            <ChevronRight size={14} className="text-white/20 group-hover/item:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Section: Records & Health */}
                        <div className="grid grid-cols-1 xl:grid-cols-4 gap-10">
                            <div className="xl:col-span-3 glass-card overflow-hidden h-fit flex flex-col">
                                <div className="p-8 border-b border-white/[0.03] flex items-center justify-between bg-white/[0.01]">
                                    <div>
                                        <h3 className="text-xl font-black flex items-center space-x-3">
                                            <Activity className="text-primary" size={24} />
                                            <span className="tracking-tight">Historial de Análisis Inteligente</span>
                                        </h3>
                                        <div className="flex items-center space-x-3 mt-1">
                                            <span className="text-[10px] text-white/30 uppercase tracking-widest">Motor Neuron-X v4.2</span>
                                            <span className="w-1 h-1 rounded-full bg-white/10"></span>
                                            <span className="text-[10px] text-primary/60 font-mono">LATENCY: 12ms</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <div className="flex items-center rounded-2xl bg-[#06080C] border border-white/5 p-1">
                                            <button className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-primary/10 text-primary">Todos</button>
                                            <button className="px-4 py-2 rounded-xl text-[10px] font-black uppercase text-white/30 hover:text-white transition-colors">Alertas</button>
                                        </div>
                                        <button
                                            onClick={handleExport}
                                            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center space-x-3 group"
                                        >
                                            <FileDown size={14} className="group-hover:translate-y-0.5 transition-transform" />
                                            <span>Exportar</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-white/[0.01] text-white/20 text-[9px] uppercase font-black tracking-[0.3em]">
                                                <th className="px-10 py-6 border-b border-white/[0.02]">Expediente</th>
                                                <th className="px-10 py-6 border-b border-white/[0.02]">Paciente Identidad</th>
                                                <th className="px-10 py-6 border-b border-white/[0.02]">Estado Motor IA</th>
                                                <th className="px-10 py-6 border-b border-white/[0.02]">Patología</th>
                                                <th className="px-10 py-6 border-b border-white/[0.02]">Sincronización</th>
                                                <th className="px-10 py-6 border-b border-white/[0.02] text-right">Métricas</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.02]">
                                            {filteredScans.map((scan) => (
                                                <tr key={scan.id} className="hover:bg-primary/[0.01] transition-all group cursor-pointer" onClick={() => showModal('DETALLES DE ESCANEO', `Visualizando detalles del escaneo ${scan.id} para ${scan.user}.`, 'info')}>
                                                    <td className="px-10 py-7">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-mono text-primary font-black">#{scan.id}</span>
                                                            <span className="text-[8px] text-white/20 font-mono mt-1 uppercase">Cloud ID</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-7">
                                                        <div className="flex items-center space-x-4">
                                                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-sm font-black text-white/40 group-hover:border-primary/40 transition-colors">
                                                                {scan.user.split(' ').map(n => n[0]).join('')}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{scan.user}</span>
                                                                <span className="text-[10px] text-white/20">Registrado Mar 2024</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-7">
                                                        <div className={`status-badge w-fit ${scan.status === 'Completed' ? 'bg-green-500/10 text-green-400 border-green-500/10' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/10'
                                                            }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${scan.status === 'Completed' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></span>
                                                            <span>{scan.status}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-7">
                                                        <span className="px-3 py-1 rounded-lg bg-white/[0.03] border border-white/5 text-[10px] font-bold text-white/50">{scan.pathology}</span>
                                                    </td>
                                                    <td className="px-10 py-7 text-xs font-mono text-white/20 italic">{scan.date}</td>
                                                    <td className="px-10 py-7 text-right">
                                                        <button className="p-2.5 rounded-xl bg-white/5 hover:bg-primary/20 hover:text-primary transition-all text-white/20 group-hover/tr:scale-110">
                                                            <ChevronRight size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="glass-card p-8 bg-gradient-to-br from-secondary/10 to-transparent">
                                    <h3 className="text-lg font-bold mb-6 flex items-center">
                                        <Activity className="text-secondary mr-2" size={20} />
                                        Salud del Cluster
                                    </h3>
                                    <div className="space-y-6">
                                        <SystemStatus label="Servidor Latinoamerica" status="99.9% Uptime" progress={99} color="#00F0FF" />
                                        <SystemStatus label="IA Process Unit" status="Under Load" progress={72} color="#8A2BE2" />
                                        <SystemStatus label="Crypto Security" status="Verificado" progress={100} color="#22C55E" />
                                    </div>
                                    <button
                                        onClick={() => showModal('PANEL GLOBAL', 'Accediendo al Panel de Control Global para la gestión de infraestructura.', 'info')}
                                        className="mt-8 w-full py-4 rounded-2xl border border-white/5 hover:border-primary/30 bg-white/[0.03] text-xs font-black uppercase tracking-[0.2em] transition-all hover:bg-white/[0.05] group"
                                    >
                                        <span className="group-hover:text-primary flex items-center justify-center">
                                            Panel Global
                                            <ChevronRight size={14} className="ml-2" />
                                        </span>
                                    </button>
                                </div>

                                <div
                                    className="glass-card p-8 bg-gradient-to-tr from-primary/10 to-transparent flex flex-col items-center justify-center text-center space-y-4 cursor-pointer hover:scale-[1.02] transition-transform"
                                    onClick={() => showModal('IA NEURON-X', 'El motor IA Neuron-X Engine está operando con parámetros óptimos y listo para nuevos diagnósticos.', 'success')}
                                >
                                    <div className="w-16 h-16 rounded-3xl bg-primary/20 flex items-center justify-center text-primary relative">
                                        <div className="absolute inset-0 rounded-3xl animate-ping bg-primary/20"></div>
                                        <Logo size={32} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">IA Neuron-X Activa</h4>
                                        <p className="text-xs text-muted-foreground mt-1">Listo para nuevos diagnósticos</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeBoard === 'analysis' && <AnalysisBoard showModal={showModal} />}
                {activeBoard === 'users' && <PatientsBoard filteredScans={filteredScans} searchQuery={searchQuery} setSearchQuery={setSearchQuery} showModal={showModal} />}
                {activeBoard === 'reports' && <ReportsBoard />}

                {activeBoard === 'settings' && (
                    <SettingsBoard onBack={() => setActiveBoard('dashboard')} showModal={showModal} />
                )}
            </main>

            {/* Floating Action Button for Patients */}
            {
                activeBoard === 'dashboard' && (
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleNewPatient}
                        className="fixed bottom-10 right-10 w-16 h-16 rounded-3xl bg-primary shadow-[0_0_30px_rgba(0,240,255,0.5)] flex items-center justify-center text-white z-50 group overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <Plus size={32} />
                    </motion.button>
                )
            }

            <AnimatePresence>
                {modalConfig.isOpen && (
                    <RetroModal
                        config={modalConfig}
                        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                        onPatientSaved={(patient: any) => {
                            savePatient(patient)
                            setModalConfig({ ...modalConfig, isOpen: false })
                            setTimeout(() => showModal('REGISTRO EXITOSO', `Paciente ${patient.user} integrado al sistema. ID: ${patient.id}`, 'success'), 200)
                        }}
                    />
                )}
            </AnimatePresence>
        </div >
    )
}

function RealTimeClock() {
    const [time, setTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    return <>{time.toLocaleTimeString('en-US', { hour12: false })}</>
}
function SidebarItem({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
    return (
        <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`sidebar-item group ${active ? 'active' : ''}`}
        >
            <span className={`mr-4 transition-all duration-500 ${active ? 'text-primary scale-110' : 'group-hover:text-white group-hover:scale-110'}`}>
                {icon}
            </span>
            <span className="text-sm font-bold tracking-tight">{label}</span>
            {active && (
                <motion.div
                    layoutId="active-nav-glow"
                    className="absolute inset-0 bg-primary/5 blur-xl pointer-events-none"
                />
            )}
        </motion.div>
    )
}

function StatCard({ icon, label, value, trend, color, delay }: any) {
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)

    function handleMouseMove({ currentTarget, clientX, clientY }: any) {
        const { left, top } = currentTarget.getBoundingClientRect()
        mouseX.set(clientX - left)
        mouseY.set(clientY - top)
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay }}
            whileHover={{ y: -5 }}
            onMouseMove={handleMouseMove}
            className="glass-card p-8 group cursor-pointer relative overflow-hidden"
            onClick={() => alert(`Visualizando reporte detallado de ${label}...`)}
        >
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-[2.5rem] opacity-0 transition duration-300 group-hover:opacity-100 z-0"
                style={{
                    background: useMotionTemplate`
                        radial-gradient(
                            400px circle at ${mouseX}px ${mouseY}px,
                            ${color === 'primary' ? 'rgba(0, 240, 255, 0.1)' : 'rgba(138, 43, 226, 0.1)'},
                            transparent 80%
                        )
                    `,
                }}
            />

            <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-[100px] opacity-0 group-hover:opacity-10 transition-opacity duration-700 bg-${color === 'primary' ? 'primary' : 'secondary'}`}></div>

            <div className="flex justify-between items-start mb-10 relative z-10">
                <div className="p-4 bg-white/[0.03] rounded-3xl border border-white/5 group-hover:border-primary/30 group-hover:bg-primary/5 transition-all duration-500">
                    {icon}
                </div>
                <div className={`status-badge ${trend.startsWith('+') ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                    <span className="w-1 h-1 rounded-full bg-current animate-pulse"></span>
                    <span>{trend}</span>
                </div>
            </div>
            <div className="relative z-10">
                <p className="text-white/20 text-[10px] uppercase font-black tracking-[0.3em] mb-2 group-hover:text-primary/60 transition-colors">{label}</p>
                <h4 className="text-4xl font-black text-glow tracking-tighter group-hover:scale-[1.02] transition-transform origin-left">{value}</h4>
            </div>
        </motion.div>
    )
}

function SystemStatus({ label, status, progress, color }: any) {
    return (
        <div className="space-y-2 cursor-pointer group" onClick={() => alert(`Estado del sistema: ${label} - ${status}`)}>
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground group-hover:text-white transition-colors">{label}</span>
                <span style={{ color }}>{status}</span>
            </div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                />
            </div>
        </div>
    )
}

function AnalysisBoard({ showModal }: { showModal: (t: string, m: string, ty?: any) => void }) {
    const videoRef = React.useRef<HTMLVideoElement>(null)
    const [streamError, setStreamError] = React.useState(false)

    React.useEffect(() => {
        let stream: MediaStream | null = null

        async function startCamera() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment', // Prefer back camera
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                })
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                }
            } catch (err) {
                console.error("Camera access error:", err)
                setStreamError(true)
            }
        }

        startCamera()

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop())
            }
        }
    }, [])

    return (
        <div className="p-10 space-y-10 max-w-[1600px] mx-auto w-full">
            <div className="flex flex-col space-y-2 relative">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100px' }}
                    className="h-1 bg-secondary mb-4 rounded-full shadow-[0_0_15px_#8A2BE2]"
                />
                <h2 className="text-5xl font-black tracking-tighter uppercase"><span className="text-secondary">Análisis</span> en Vivo</h2>
                <p className="text-xs text-white/30 font-mono tracking-widest uppercase italic">Diagnostic Engine v4.2 / Real-time Processing</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                <div className="lg:col-span-3 glass-card h-[700px] relative overflow-hidden flex flex-col">
                    <div className="absolute inset-0 tech-grid opacity-20 pointer-events-none"></div>
                    <div className="scanline"></div>

                    <div className="p-8 border-b border-white/5 flex items-center justify-between relative z-20 bg-[#0B0E14]/50 backdrop-blur-md">
                        <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]"></div>
                                <span className="text-xs font-black uppercase tracking-widest text-red-500">Recibiendo Stream de PWA</span>
                            </div>
                            <div className="h-4 w-px bg-white/10"></div>
                            <div className="text-[10px] font-mono text-white/40">LATENCY: 12ms | ENCRYPTION: SECURE_SOCKET | OPS: 2.4Tflops</div>
                        </div>
                        <div className="flex space-x-4">
                            <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest text-white/60">Recalibrar</button>
                            <button className="p-2 border border-white/10 rounded-xl hover:bg-white/5 transition-all text-white/40"><Settings size={18} /></button>
                        </div>
                    </div>

                    <div className="flex-1 flex items-center justify-center relative bg-black">
                        {/* Video Layer */}
                        <div className="absolute inset-0 w-full h-full overflow-hidden">
                            {!streamError ? (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover opacity-60 grayscale hover:grayscale-0 transition-all duration-1000 scale-110 blur-[1px] hover:blur-0"
                                />
                            ) : (
                                <div className="w-full h-full bg-[#0B0E14] flex items-center justify-center flex-col space-y-4">
                                    <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center animate-pulse">
                                        <ShieldCheck className="text-red-500" size={32} />
                                    </div>
                                    <p className="text-xs font-mono text-red-500/60 uppercase tracking-widest text-center max-w-xs">
                                        Error de Sincronización de Cámara.<br />Revise permisos del Navegador.
                                    </p>
                                </div>
                            )}
                            {/* Overlay Vignette */}
                            <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)] pointer-events-none"></div>
                        </div>

                        {/* HUD Elements Overlay */}
                        <div className="absolute inset-10 border border-primary/10 pointer-events-none z-10">
                            <div className="absolute top-0 left-0 w-32 h-32 border-t-4 border-l-4 border-primary/40 rounded-tl-3xl"></div>
                            <div className="absolute top-0 right-0 w-32 h-32 border-t-4 border-r-4 border-primary/40 rounded-tr-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-32 h-32 border-b-4 border-l-4 border-primary/40 rounded-bl-3xl"></div>
                            <div className="absolute bottom-0 right-0 w-32 h-32 border-b-4 border-r-4 border-primary/40 rounded-br-3xl"></div>

                            {/* Scanning HUD Crosshair */}
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] border border-white/5 flex items-center justify-center">
                                <div className="w-16 h-px bg-primary/40 absolute left-0"></div>
                                <div className="w-16 h-px bg-primary/40 absolute right-0"></div>
                                <div className="h-16 w-px bg-primary/40 absolute top-0"></div>
                                <div className="h-16 w-px bg-primary/40 absolute bottom-0"></div>

                                {/* Intelligent Scanning Frame */}
                                <motion.div
                                    animate={{
                                        width: ['100%', '80%', '90%', '100%'],
                                        height: ['100%', '70%', '85%', '100%'],
                                        borderColor: ['rgba(0,240,255,0.2)', 'rgba(138,43,226,0.3)', 'rgba(0,240,255,0.2)']
                                    }}
                                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                    className="border-2 border-primary/20 relative"
                                >
                                    <div className="absolute -top-6 left-0 text-[8px] font-mono text-primary font-black uppercase tracking-widest">Tracking_ID: RET_SCAN_LIVE</div>
                                    <div className="absolute -bottom-6 right-0 text-[8px] font-mono text-secondary font-black uppercase tracking-widest">AI_CONFIDENCE: 94.2%</div>
                                </motion.div>
                            </div>
                        </div>

                        {/* Scanning Line */}
                        <motion.div
                            animate={{ top: ['0%', '100%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_30px_#00F0FF] z-20 flex items-center justify-center"
                        >
                            <div className="px-3 py-1 bg-primary text-[8px] font-black text-black uppercase rounded-full transform -translate-y-4">Capturando Mácula</div>
                        </motion.div>

                        {/* Signal Wave Simulation */}
                        <div className="absolute -bottom-4 left-10 right-10 flex items-end space-x-1 justify-center z-30 pointer-events-none">
                            {[...Array(60)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    animate={{ height: [4, 20 + Math.random() * 40, 4] }}
                                    transition={{ duration: 0.8 + Math.random(), repeat: Infinity, delay: i * 0.05 }}
                                    className="flex-1 bg-gradient-to-t from-primary/40 to-transparent rounded-t-sm"
                                />
                            ))}
                        </div>
                    </div>

                    <div className="p-8 border-t border-white/5 bg-white/[0.01] grid grid-cols-4 gap-8 relative z-20">
                        <AnalysisMetric label="Calidad de Señal" value="98.2%" status="ÓPTIMA" />
                        <AnalysisMetric label="Latencia CPU" value="0.4ms" status="ULTRA-BAJA" />
                        <AnalysisMetric label="Ancho de Banda" value="2.4 Gbps" status="ESTABLE" />
                        <AnalysisMetric label="Encriptación" value="AES-256" status="VERIFICADA" />
                    </div>
                </div>

                <div className="space-y-10">
                    <div className="glass-card p-6 bg-primary/5">
                        <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-4 flex items-center">
                            <Activity className="mr-2" size={14} /> Detectores Activos
                        </h4>
                        <div className="space-y-3">
                            <DetectorItem label="Fondo de Ojo" active />
                            <DetectorItem label="Detección de Mácula" active />
                            <DetectorItem label="Mapeo Vascular" active />
                            <DetectorItem label="Análisis de Micro-aneurismas" />
                        </div>
                    </div>

                    <div className="glass-card p-6 relative overflow-hidden">
                        <h4 className="text-xs font-black uppercase tracking-widest text-white/40 mb-4">Análisis Biométrico</h4>
                        <div className="space-y-6">
                            <SystemStatus label="Carga de IA" progress={68} status="68%" color="var(--primary)" />
                            <SystemStatus label="Sincronía PWA" progress={95} status="95%" color="var(--secondary)" />
                            <SystemStatus label="GPU Mem" progress={42} status="42%" color="#10b981" />
                        </div>
                    </div>

                    <button className="btn-antigravity w-full py-5 rounded-3xl group relative overflow-hidden" onClick={() => showModal('GENERANDO REPORTE', 'El motor IA está compilando los datos de la sesión actual. El archivo PDF estará disponible en breve.', 'success')}>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                        <span className="relative z-10 font-black uppercase tracking-widest">Generar Informe Médico</span>
                    </button>
                </div>
            </div>
        </div>
    )
}

function AnalysisMetric({ label, value, status }: any) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">{label}</p>
            <p className="text-xl font-black">{value}</p>
            <p className="text-[9px] text-primary/60 font-mono tracking-tighter italic">{status}</p>
        </div>
    )
}

function DetectorItem({ label, active }: any) {
    return (
        <div className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${active ? 'border-primary/30 bg-primary/10 text-primary' : 'border-white/5 bg-white/[0.02] text-white/20 hover:border-white/20'
            }`}>
            <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
            <div className={`w-2 h-2 rounded-full ${active ? 'bg-primary animate-pulse shadow-[0_0_8px_var(--primary)]' : 'bg-white/10'}`}></div>
        </div>
    )
}

function PatientsBoard({ filteredScans, searchQuery, setSearchQuery, showModal }: any) {
    return (
        <div className="p-10 space-y-10 max-w-[1600px] mx-auto w-full">
            <div className="flex flex-col space-y-2 relative">
                <motion.div initial={{ width: 0 }} animate={{ width: '100px' }} className="h-1 bg-primary mb-4 rounded-full shadow-[0_0_15px_var(--primary)]" />
                <h2 className="text-5xl font-black tracking-tighter uppercase">Directorio de <span className="text-primary">Pacientes</span></h2>
                <p className="text-xs text-white/30 font-mono tracking-widest uppercase">Base de datos centralizada de RetiScan v4</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                <div className="lg:col-span-3 glass-card overflow-visible">
                    <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                        <div className="relative w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                            <input
                                type="text"
                                placeholder="Filtrar por nombre o ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-sm focus:outline-none focus:border-primary/40 focus:bg-white/[0.05] transition-all"
                            />
                        </div>
                        <div className="relative">
                            <PatientDropdown showModal={showModal} />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] uppercase font-black tracking-widest text-white/20 border-b border-white/5">
                                    <th className="px-10 py-6">Expediente</th>
                                    <th className="px-10 py-6">Paciente</th>
                                    <th className="px-10 py-6 text-center">Último Scaneo</th>
                                    <th className="px-10 py-6 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredScans.map((scan: any) => (
                                    <tr key={scan.id} className="hover:bg-white/[0.02] transition-all group cursor-pointer">
                                        <td className="px-10 py-7 font-mono text-xs text-primary font-bold">{scan.id}</td>
                                        <td className="px-10 py-7">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-white/10 to-transparent border border-white/5 flex items-center justify-center font-black text-white/20">
                                                    {scan.user.split(' ').map((n: string) => n[0]).join('')}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{scan.user}</p>
                                                    <p className="text-[10px] text-white/30">Registrado Hace 3 meses</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-7 text-center font-mono text-xs text-white/30 italic">{scan.date}</td>
                                        <td className="px-10 py-7 text-right">
                                            <button className="p-3 bg-white/5 rounded-xl hover:bg-primary/20 hover:text-primary transition-all text-white/20">
                                                <ChevronRight size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="glass-card p-8">
                        <h3 className="text-lg font-bold mb-6 italic">Filtros Inteligentes</h3>
                        <div className="space-y-4">
                            <label className="flex items-center space-x-3 cursor-pointer group">
                                <div className="w-5 h-5 rounded-md border border-white/10 group-hover:border-primary transition-colors flex items-center justify-center">
                                    <div className="w-2.5 h-2.5 rounded-sm bg-primary"></div>
                                </div>
                                <span className="text-xs text-white/60">Todos los Pacientes</span>
                            </label>
                            <label className="flex items-center space-x-3 cursor-pointer group">
                                <div className="w-5 h-5 rounded-md border border-white/10 group-hover:border-secondary transition-colors"></div>
                                <span className="text-xs text-white/60">Con Anomalías</span>
                            </label>
                            <label className="flex items-center space-x-3 cursor-pointer group">
                                <div className="w-5 h-5 rounded-md border border-white/10 group-hover:border-primary transition-colors"></div>
                                <span className="text-xs text-white/60">Pendientes de Revisión</span>
                            </label>
                        </div>
                    </div>

                    <div className="glass-card p-1 items-center justify-center flex flex-col space-y-4 bg-gradient-to-b from-primary/5 to-transparent py-10">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                            <FileDown size={32} />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-black uppercase tracking-widest italic">Backup Cloud</p>
                            <p className="text-[10px] text-white/40 mt-1">Sincronizado hace 2m</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function ReportsBoard() {
    return (
        <div className="p-10 space-y-10 max-w-[1600px] mx-auto w-full">
            <div className="flex flex-col space-y-2 relative">
                <motion.div initial={{ width: 0 }} animate={{ width: '100px' }} className="h-1 bg-green-500 mb-4 rounded-full shadow-[0_0_15px_#22C55E]" />
                <h2 className="text-5xl font-black tracking-tighter uppercase">Inteligencia de <span className="text-green-500">Datos</span></h2>
                <p className="text-xs text-white/30 font-mono tracking-widest uppercase">Métricas de rendimiento IA y salud poblacional</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="glass-card p-8 h-[400px] flex flex-col">
                    <h3 className="text-lg font-bold mb-8">Precisión del Motor Neuron-X</h3>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="name" stroke="#ffffff20" fontSize={10} axisLine={false} tickLine={false} />
                                <YAxis stroke="#ffffff20" fontSize={10} axisLine={false} tickLine={false} domain={[97, 100]} />
                                <Tooltip contentStyle={{ backgroundColor: '#0B0E14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '15px' }} />
                                <Area type="step" dataKey="accuracy" stroke="#22C55E" fill="#22C55E20" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card p-8 h-[400px] flex flex-col">
                    <h3 className="text-lg font-bold mb-8">Volumen de Escaneos Semanales</h3>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="name" stroke="#ffffff20" fontSize={10} axisLine={false} tickLine={false} />
                                <YAxis stroke="#ffffff20" fontSize={10} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#0B0E14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '15px' }} />
                                <Area type="monotone" dataKey="scans" stroke="#00F0FF" fill="#00F0FF20" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-2 glass-card p-10 flex items-center justify-between bg-gradient-to-r from-primary/5 to-secondary/5">
                    <div className="space-y-4 max-w-lg">
                        <h3 className="text-2xl font-black tracking-tighter italic">Optimización Activa del Modelo</h3>
                        <p className="text-sm text-white/60">El motor de IA de RetiScan está aprendiendo de los patrones detectados. Se ha incrementado la precisión en un +0.12% en las últimas 48 horas.</p>
                        <div className="flex space-x-6 pt-4">
                            <div>
                                <p className="text-[10px] text-primary font-black uppercase tracking-widest">Training Loss</p>
                                <p className="text-2xl font-black">0.024</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Epochs</p>
                                <p className="text-2xl font-black">4,209</p>
                            </div>
                        </div>
                    </div>
                    <div className="w-40 h-40 rounded-full border-8 border-primary/20 border-t-primary animate-spin-slow flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full bg-primary/10 animate-pulse flex items-center justify-center font-black text-primary italic">99.1%</div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function QRModal({ status, onClose, onSimulateSuccess, networkInfo, liveFrame }: {
    status: string, onClose: () => void, onSimulateSuccess: () => void,
    networkInfo?: any, liveFrame?: string | null
}) {
    const sessionId = 'main_session'
    const protocol = window.location.protocol;
    const host = window.location.hostname === 'localhost' ? '192.168.3.76' : window.location.hostname;
    const port = window.location.port ? ':' + window.location.port : '';
    const mobileUrl = `${protocol}//${host}${port}/mobile.html?session=${sessionId}`

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#06080C]/90 backdrop-blur-2xl px-6"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="glass-card max-w-2xl w-full p-10 text-center relative overflow-hidden"
            >
                <div className="absolute inset-0 tech-grid opacity-10"></div>

                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full text-white/20 hover:text-white transition-colors z-30"
                >
                    <Plus size={24} className="rotate-45" />
                </button>

                <div className="relative z-20">
                    <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-6">
                        Secure Handshake Protocol · Red Local
                    </div>
                    <h3 className="text-3xl font-black tracking-tighter italic mb-2">Vincular Dispositivo</h3>
                    <p className="text-sm text-white/40 font-medium mb-8">Escanea el código QR con tu celular para iniciar la transmisión en vivo</p>

                    <div className="grid grid-cols-2 gap-8 items-start">
                        {/* QR Code */}
                        <div className="flex flex-col items-center space-y-4">
                            <div className="relative w-48 h-48 group">
                                <div className="absolute -inset-3 border border-white/5 pointer-events-none rounded-2xl">
                                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary"></div>
                                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary"></div>
                                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary"></div>
                                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary"></div>
                                </div>
                                <div className="w-full h-full bg-white rounded-2xl p-3 flex items-center justify-center overflow-hidden">
                                    <QRCodeCanvas
                                        value={mobileUrl}
                                        size={168}
                                        bgColor={"#ffffff"}
                                        fgColor={"#06080C"}
                                        level={"H"}
                                        includeMargin={false}
                                    />
                                    <motion.div
                                        animate={{ y: ['0%', '350%', '0%'] }}
                                        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                                        className="absolute left-0 right-0 h-0.5 bg-primary/50 shadow-[0_0_15px_var(--primary)] pointer-events-none"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1 text-center">
                                <p className="text-[9px] text-white/20 font-mono uppercase tracking-widest">URL del celular:</p>
                                <p className="text-[9px] text-primary/60 font-mono break-all max-w-[180px]">{mobileUrl.split('?')[0]}</p>
                            </div>
                            {status === 'waiting' && (
                                <button onClick={onSimulateSuccess} className="px-4 py-2 bg-white/5 border border-dashed border-white/10 rounded-xl text-[9px] font-bold text-white/30 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest">
                                    [ Demo: Simular Conexión ]
                                </button>
                            )}
                        </div>

                        {/* Live Camera Feed */}
                        <div className="flex flex-col space-y-3">
                            <div className="aspect-video bg-black/40 rounded-2xl border border-white/10 overflow-hidden relative flex items-center justify-center min-h-[160px]">
                                {liveFrame ? (
                                    <>
                                        <img src={liveFrame} className="w-full h-full object-cover" alt="Live feed" />
                                        <div className="absolute top-2 right-2 flex items-center space-x-1 px-2 py-1 bg-red-500/80 rounded-lg">
                                            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                                            <span className="text-[9px] font-black text-white uppercase">En Vivo</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center space-y-2 p-4">
                                        <Camera size={32} className="text-white/10 mx-auto" />
                                        <p className="text-[10px] text-white/20 uppercase tracking-widest">
                                            {status === 'connected' ? 'Iniciando cámara...' : 'Esperando celular...'}
                                        </p>
                                    </div>
                                )}
                            </div>
                            {/* Status */}
                            <div className={`flex items-center space-x-2 p-3 rounded-xl border text-xs font-bold ${status === 'connected' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-white/5 border-white/10 text-white/30'}`}>
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status === 'connected' ? 'bg-green-400 animate-pulse' : 'bg-white/20 animate-ping'}`}></span>
                                <span>{status === 'connected' ? 'Celular conectado · Transmisión activa' : 'Esperando conexión del celular...'}</span>
                            </div>
                            {networkInfo && (
                                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-left space-y-1">
                                    <p className="text-[9px] text-white/20 uppercase font-bold tracking-widest">Red Local</p>
                                    <p className="text-[10px] font-mono text-white/50">Panel: <span className="text-primary/70">{networkInfo.adminUrl}</span></p>
                                    <p className="text-[10px] font-mono text-white/50">Celular: <span className="text-primary/70">{networkInfo.mobileUrl?.split('?')[0]}</span></p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}


function SettingsBoard({ onBack, showModal }: { onBack: () => void, showModal: (t: string, m: string, ty?: any) => void }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    const handleOption = (title: string, msg: string) => {
        setIsMenuOpen(false)
        showModal(title, msg, 'info')
    }

    return (
        <div className="p-10 space-y-10 max-w-[1600px] mx-auto w-full relative">
            <div className="flex flex-col md:flex-row md:items-end justify-between space-y-6 md:space-y-0 relative">
                <div className="flex flex-col space-y-2">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '100px' }}
                        className="h-1 bg-primary mb-4 rounded-full shadow-[0_0_15px_#00F0FF]"
                    />
                    <h2 className="text-5xl font-black tracking-tighter uppercase">Perfil de <span className="text-primary">Administrador</span></h2>
                    <p className="text-xs text-white/30 font-mono tracking-widest uppercase italic">Gestión de Perfil y Parámetros del Dr. Raul</p>
                </div>
                <button
                    onClick={onBack}
                    className="flex items-center space-x-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-xs font-black uppercase tracking-widest"
                >
                    Volver al Escritorio
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-1 space-y-8">
                    <div className="glass-card p-8 flex flex-col items-center text-center relative overflow-visible group">
                        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none"></div>

                        <div className="relative mb-6">
                            <div className="w-32 h-32 rounded-full border-4 border-primary/20 p-1 relative z-10 transition-transform group-hover:scale-105 duration-500">
                                <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center overflow-hidden">
                                    <UserCircle size={80} className="text-primary" />
                                </div>
                            </div>

                            <div className="relative z-30">
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className={`absolute bottom-1 right-1 w-10 h-10 rounded-full flex items-center justify-center text-black border-4 border-[#0B0E14] transition-all z-20 shadow-[0_0_15px_rgba(0,240,255,0.5)] ${isMenuOpen ? 'bg-secondary scale-110 rotate-45' : 'bg-primary hover:scale-110'}`}
                                >
                                    <Plus size={18} />
                                </button>

                                <AnimatePresence>
                                    {isMenuOpen && (
                                        <>
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                onClick={() => setIsMenuOpen(false)}
                                                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
                                            />
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.8, y: 10, x: 20 }}
                                                animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                                                exit={{ opacity: 0, scale: 0.8, y: 10, x: 20 }}
                                                className="absolute top-full right-0 mt-4 w-56 bg-[#0B0E14] border border-white/10 rounded-3xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
                                                <div className="relative space-y-1">
                                                    <ProfileMenuOption icon={<Camera size={14} />} label="Cambiar Foto" onClick={() => handleOption('ACTUALIZAR AVATAR', 'Inicializando interfaz de captura de alta resolución. Por favor, mire fijamente a la cámara.')} />
                                                    <ProfileMenuOption icon={<PenTool size={14} />} label="Editar Título" onClick={() => handleOption('MODO EDICIÓN', 'Usted está entrando al modo de edición de credenciales médicas. Los cambios requieren firma digital.')} />
                                                    <ProfileMenuOption icon={<FileText size={14} />} label="Firma Digital" onClick={() => handleOption('GESTIÓN DE FIRMA', 'Cargando certificados RSA de 4096 bits para autenticación de reportes.')} />
                                                    <div className="h-px bg-white/5 my-2 mx-2"></div>
                                                    <ProfileMenuOption icon={<Key size={14} />} label="Credenciales" color="text-secondary" onClick={() => handleOption('SEGURIDAD', 'Generando nuevas llaves de acceso para la terminal. Esta acción cerrará su sesión actual.')} />
                                                </div>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <h3 className="text-2xl font-black text-white">Dr. Raul</h3>
                        <p className="text-xs text-primary/70 font-mono uppercase tracking-widest mt-1">Medical Admin Specialist</p>

                        <div className="mt-8 w-full space-y-4">
                            <button className="w-full py-4 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white/10 transition-all border-b-2 border-b-primary/40">Cuenta Verificada</button>
                            <button className="w-full py-4 rounded-2xl bg-red-500/10 border border-red-500/10 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/20 transition-all text-glow-red">Reportar Incidencia</button>
                        </div>
                    </div>

                    <div className="glass-card p-8 space-y-6">
                        <h4 className="text-xs font-black uppercase tracking-widest text-white/40 flex items-center">
                            <ShieldCheck className="mr-2 text-primary" size={14} /> Seguridad de Cuenta
                        </h4>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                <span className="text-xs text-white/60">Verificación 2FA</span>
                                <div className="w-10 h-5 bg-primary/20 rounded-full relative cursor-pointer">
                                    <div className="absolute right-1 top-1 w-3 h-3 bg-primary rounded-full shadow-[0_0_8px_var(--primary)]"></div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                <span className="text-xs text-white/60">Inicios de sesión remotos</span>
                                <div className="w-10 h-5 bg-white/10 rounded-full relative cursor-pointer">
                                    <div className="absolute left-1 top-1 w-3 h-3 bg-white/40 rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-10">
                    <div className="glass-card p-10 space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] pointer-events-none"></div>

                        <h3 className="text-xl font-bold flex items-center space-x-3">
                            <Settings className="text-primary" size={24} />
                            <span>Parámetros del Sistema Médico</span>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] text-white/40 uppercase font-black tracking-widest ml-1">Idioma del Sistema</label>
                                <select className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-primary/30 text-white cursor-pointer hover:bg-white/[0.05] transition-all">
                                    <option className="bg-[#0B0E14]">Español (México)</option>
                                    <option className="bg-[#0B0E14]">English (USA)</option>
                                    <option className="bg-[#0B0E14]">Português (Brasil)</option>
                                </select>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] text-white/40 uppercase font-black tracking-widest ml-1">Región de Servidor</label>
                                <select className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-primary/30 text-white cursor-pointer hover:bg-white/[0.05] transition-all">
                                    <option className="bg-[#0B0E14]">Cloud - South America (Netlify)</option>
                                    <option className="bg-[#0B0E14]">Cloud - North America (Azure)</option>
                                    <option className="bg-[#0B0E14]">Local Hub - Terminal RS-01</option>
                                </select>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] text-white/40 uppercase font-black tracking-widest ml-1">Sincronización de Datos</label>
                                <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-between">
                                    <span className="text-xs text-white/40 italic">Estado: Optimizado v3.2</span>
                                    <RefreshCcw size={16} className="text-primary animate-spin-slow" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] text-white/40 uppercase font-black tracking-widest ml-1">Fidelidad de Escaneo</label>
                                <div className="flex space-x-2">
                                    <button className="flex-1 py-3 px-2 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase text-white/30">Standard</button>
                                    <button className="flex-1 py-3 px-2 rounded-xl bg-primary/20 border border-primary/40 text-[9px] font-black uppercase text-primary shadow-[0_0_15px_rgba(0,240,255,0.1)]">HD Pro (Active)</button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div className="flex items-center space-x-4">
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                    <Activity size={28} />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-sm font-bold">Motor IA RetiScan Neuron-X</p>
                                    <p className="text-[10px] text-white/20 uppercase font-mono tracking-widest">Compilación: BUILD_2024_03_02_1537</p>
                                </div>
                            </div>
                            <button
                                onClick={() => showModal('PARÁMETROS GUARDADOS', 'La configuración del sistema ha sido actualizada y sincronizada con el nodo central.', 'success')}
                                className="px-12 py-4 bg-gradient-to-r from-primary to-blue-500 text-black text-xs font-black uppercase tracking-[0.2em] rounded-3xl hover:brightness-110 transition-all shadow-[0_0_40px_rgba(0,240,255,0.4)]"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function LoginScreen({ onLogin, loading }: { onLogin: (e: React.FormEvent, creds: any) => void, loading: boolean }) {
    const [email, setEmail] = useState(localStorage.getItem('retiscan_remembered_email') || 'admin@retiscan.ai')
    const [password, setPassword] = useState('********')
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('retiscan_remembered_email'))

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (rememberMe) {
            localStorage.setItem('retiscan_remembered_email', email)
        } else {
            localStorage.removeItem('retiscan_remembered_email')
        }
        onLogin(e, { email, password })
    }

    return (
        <div className="min-h-screen bg-[#06080C] flex items-center justify-center p-6 relative overflow-hidden font-['Outfit']">
            <div className="nebula-bg"></div>
            <div className="tech-grid opacity-20"></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="glass-card max-w-md w-full p-12 relative z-10 border-white/10"
            >
                <div className="flex flex-col items-center mb-10 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/30 mb-6 shadow-[0_0_40px_rgba(0,240,255,0.15)]">
                        <Logo size={48} />
                    </div>
                    <div className="space-y-1">
                        <LogoText className="text-3xl" />
                        <p className="text-[10px] text-primary font-black uppercase tracking-[0.3em] mt-2">Terminal de Administración Médica</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] text-white/40 uppercase font-black tracking-widest ml-4">Identificador de Acceso</label>
                        <div className="relative group">
                            <UserCircle size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-sm focus:outline-none focus:border-primary/30 focus:bg-white/[0.06] transition-all text-white border-white/10"
                                placeholder="Correo electrónico"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] text-white/40 uppercase font-black tracking-widest ml-4">Clave de Seguridad</label>
                        <div className="relative group">
                            <ShieldCheck size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-secondary transition-colors" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-14 pr-12 text-sm focus:outline-none focus:border-secondary/30 focus:bg-white/[0.06] transition-all text-white border-white/10"
                                placeholder="Contraseña"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/20 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-2 pt-2">
                        <label className="flex items-center space-x-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <div className="w-5 h-5 rounded-md border border-white/10 bg-white/5 flex items-center justify-center group-hover:border-primary/40 transition-colors">
                                <div className={`w-2.5 h-2.5 rounded-[2px] bg-primary transition-transform ${rememberMe ? 'scale-100' : 'scale-0'}`}></div>
                            </div>
                            <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Recordar Terminal</span>
                        </label>
                        <button type="button" className="text-[10px] text-primary font-black uppercase tracking-widest hover:brightness-125 transition-all">¿Olvidó su clave?</button>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={loading}
                        className="w-full btn-antigravity py-4 rounded-2xl text-xs flex items-center justify-center space-x-3 mt-8 group relative overflow-hidden"
                    >
                        {loading ? (
                            <div className="flex items-center space-x-3">
                                <RefreshCcw size={16} className="animate-spin text-white" />
                                <span className="font-black uppercase tracking-widest">Descifrando...</span>
                            </div>
                        ) : (
                            <>
                                <span className="font-black uppercase tracking-widest">Inicializar Sistema</span>
                                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </motion.button>
                </form>

                <div className="mt-12 pt-8 border-t border-white/[0.03] flex flex-col items-center space-y-4">
                    <p className="text-[9px] text-white/20 uppercase font-bold tracking-widest">Encriptación Biométrica Avanzada Activa</p>
                    <div className="flex space-x-4">
                        <div className="w-8 h-8 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-white/20 hover:text-primary transition-colors cursor-help" title="Simulación Huella">
                            <Plus size={14} />
                        </div>
                        <div className="w-8 h-8 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-white/20 hover:text-secondary transition-colors cursor-help" title="Simulación FaceID">
                            <Eye size={14} />
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Decorative background elements */}
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 blur-[150px] rounded-full animate-pulse"></div>
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-secondary/10 blur-[150px] rounded-full animate-pulse delay-700"></div>
        </div>
    )
}

function PatientDropdown({ showModal }: { showModal: (t: string, m: string, ty?: any) => void }) {
    const [isOpen, setIsOpen] = useState(false)

    const handleAction = (title: string, msg: string) => {
        setIsOpen(false)
        showModal(title, msg, 'info')
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`px-6 py-3 bg-primary text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center space-x-2 relative z-50 ${isOpen ? 'scale-105 brightness-110' : ''}`}
            >
                <Plus size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} />
                <span>Nuevo Paciente</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-full right-0 mt-3 w-64 bg-[#0B0E14] border border-white/10 rounded-3xl p-3 shadow-[0_25px_60px_rgba(0,0,0,0.6)] z-50 pointer-events-auto"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
                            <div className="relative space-y-1">
                                <ProfileMenuOption icon={<Users size={14} />} label="Alta Manual" onClick={() => { setIsOpen(false); showModal('ALTA DE PACIENTE', 'Complete los datos para integrar al nuevo paciente al sistema central.', 'info', 'patientForm'); }} />
                                <ProfileMenuOption icon={<FileDown size={14} />} label="Importar Excel" onClick={() => handleAction('IMPORTACIÓN', 'Iniciando módulo de lectura masiva de datos. Formatos compatibles: .XLSX, .CSV')} />
                                <ProfileMenuOption icon={<RefreshCcw size={14} />} label="Sincronizar CRM" onClick={() => handleAction('SINCRONIZACIÓN', 'Conectando con el Servidor Central de Salud para descargar registros actualizados.')} />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}

function PatientForm({ onSuccess, onCancel }: { onSuccess: () => void, onCancel: () => void }) {
    const { register, handleSubmit, formState: { errors } } = useForm()
    const [submitting, setSubmitting] = useState(false)

    const onSubmit = async (data: any) => {
        setSubmitting(true)
        try {
            await api.post('/patients', data)
            onSuccess(data)
        } catch (error: any) {
            // Demo fallback: if API unavailable, save locally
            const demoPatient = {
                id: data.id || `RS-${Date.now().toString().slice(-5)}`,
                user: data.user,
                status: 'Completed',
                pathology: 'Pendiente',
                date: new Date().toLocaleString('es-MX'),
                age: data.age,
                gender: data.gender,
                notes: data.notes
            }
            onSuccess(demoPatient)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} id="patient-form">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5 mt-6"
            >
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[9px] text-white/40 uppercase font-black tracking-widest ml-2">Nombre Completo</label>
                        <input {...register("user", { required: true })} type="text" placeholder="Ej: Juan Pérez" className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-primary/40 focus:bg-white/[0.05] transition-all text-white placeholder:text-white/10" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[9px] text-white/40 uppercase font-black tracking-widest ml-2">ID / Expediente</label>
                        <input {...register("id", { required: true })} type="text" placeholder="RS-2024-882" className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-primary/40 focus:bg-white/[0.05] transition-all text-white placeholder:text-white/10 font-mono" />
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label className="text-[9px] text-white/40 uppercase font-black tracking-widest ml-2">Edad</label>
                        <input {...register("age")} type="number" placeholder="00" className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-primary/40 focus:bg-white/[0.05] transition-all text-white placeholder:text-white/10" />
                    </div>
                    <div className="col-span-2 space-y-2">
                        <label className="text-[9px] text-white/40 uppercase font-black tracking-widest ml-2">Género / Tipo</label>
                        <div className="relative">
                            <select {...register("gender")} className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-primary/40 transition-all text-white appearance-none">
                                <option value="Masculino">Masculino</option>
                                <option value="Femenino">Femenino</option>
                                <option value="Otro">Otro / No especificado</option>
                            </select>
                            <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-white/20 pointer-events-none" />
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[9px] text-white/40 uppercase font-black tracking-widest ml-2">Observaciones Médicas Preliminares</label>
                    <textarea
                        {...register("notes")}
                        placeholder="Ingrese notas sobre el estado del paciente o motivo de consulta..."
                        className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-primary/40 focus:bg-white/[0.05] transition-all text-white placeholder:text-white/10 h-24 resize-none"
                    />
                </div>
            </motion.div>
        </form>
    )
}

function RetroModal({ config, onClose, onPatientSaved }: { config: any, onClose: () => void, onPatientSaved?: (patient: any) => void }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="glass-card max-w-lg w-full p-1 border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden"
            >
                <div className="p-8 space-y-6 relative">
                    {/* Decorative lines */}
                    <div className="absolute top-0 right-0 w-32 h-1 bg-gradient-to-l from-primary to-transparent"></div>

                    <div className="flex items-start space-x-6">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border shrink-0 ${config.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]' :
                            config.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' :
                                'bg-primary/10 border-primary/30 text-primary shadow-[0_0_20px_rgba(0,240,255,0.2)]'
                            }`}>
                            {config.contentType === 'patientForm' ? <Users size={32} /> : config.type === 'success' ? <ShieldCheck size={32} /> : <Activity size={32} />}
                        </div>
                        <div className="space-y-2 flex-1">
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-white">{config.title}</h3>
                            <p className="text-sm text-white/40 leading-relaxed font-medium">{config.message}</p>

                            {config.contentType === 'patientForm' && <PatientForm onCancel={onClose} onSuccess={(patientData: any) => {
                                if (onPatientSaved) onPatientSaved(patientData)
                            }} />}
                        </div>
                    </div>

                    <div className="flex justify-end space-x-4 pt-4 border-t border-white/5">
                        <button
                            onClick={onClose}
                            className="px-8 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white/60 hover:text-white hover:bg-white/10 transition-all font-['Outfit']"
                        >
                            {config.contentType === 'patientForm' ? 'Cancelar' : 'Cerrar'}
                        </button>
                        <button
                            form={config.contentType === 'patientForm' ? 'patient-form' : undefined}
                            type={config.contentType === 'patientForm' ? 'submit' : 'button'}
                            onClick={() => {
                                if (config.contentType !== 'patientForm') onClose();
                            }}
                            className="px-8 py-3 rounded-xl bg-primary text-black text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] font-['Outfit']"
                        >
                            {config.contentType === 'patientForm' ? 'Guardar Registro' : 'Aceptar'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

function ProfileMenuOption({ icon, label, onClick, color = "text-white/70" }: { icon: any, label: string, onClick: () => void, color?: string }) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center space-x-4 p-3.5 rounded-2xl hover:bg-white/[0.08] active:scale-95 transition-all group relative overflow-hidden text-left"
        >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className={`relative p-2.5 rounded-xl bg-white/[0.03] border border-white/5 ${color} group-hover:scale-110 group-hover:bg-white/5 transition-all`}>
                {icon}
            </div>
            <span className={`relative text-[11px] font-black uppercase tracking-wider ${color} group-hover:text-white transition-colors`}>{label}</span>
            <ChevronRight size={12} className="relative ml-auto opacity-0 group-hover:opacity-40 group-hover:translate-x-1 transition-all" />
        </button>
    )
}
