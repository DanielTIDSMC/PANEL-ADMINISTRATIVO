import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Eye, Activity, ShieldCheck, Cpu } from 'lucide-react'
import { Logo } from './Logo'

export default function LoadingScreen({ label = "SINCRONIZANDO RETISCAN" }: { label?: string }) {
    const [logs, setLogs] = useState<string[]>([])
    const fullLogs = [
        "> INICIALIZANDO NÚCLEO NEURON-X CORE...",
        "> CARGANDO BASE DE DATOS RETINAL...",
        "> ESTABLECIENDO HANDSHAKE SEGURO: ÉXITO",
        "> SYNCHRONIZING WITH LATAM CLUSTER...",
        "> ACTIVANDO PROTOCOLOS DE ENCRIPTACIÓN...",
        "> SISTEMA OPERATIVO RETISCAN v4.2 CARGADO"
    ]

    useEffect(() => {
        let current = 0
        const interval = setInterval(() => {
            if (current < fullLogs.length) {
                setLogs(prev => [...prev, fullLogs[current]])
                current++
            } else {
                clearInterval(interval)
            }
        }, 400)
        return () => clearInterval(interval)
    }, [])

    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#06080C] overflow-hidden"
        >
            {/* Background Grid HUD */}
            <div className="absolute inset-0 grid-pattern opacity-10 pointer-events-none"></div>

            {/* HUD Corner Elements */}
            <div className="absolute inset-20 border border-white/5 pointer-events-none hidden md:block">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/20"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/20"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/20"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/20"></div>
            </div>

            <div className="relative">
                {/* Advanced Quantum Rings */}
                {[1, 2, 3, 4].map((i) => (
                    <motion.div
                        key={i}
                        animate={{
                            rotate: i % 2 === 0 ? 360 : -360,
                            scale: [1, 1.05, 1],
                            opacity: [0.2, 0.05, 0.2]
                        }}
                        transition={{
                            rotate: { duration: 8 + i * 4, repeat: Infinity, ease: "linear" },
                            scale: { duration: 5, repeat: Infinity, ease: "easeInOut" },
                            opacity: { duration: 5, repeat: Infinity, ease: "easeInOut" }
                        }}
                        className="absolute -inset-16 rounded-full border border-primary/10"
                        style={{ padding: `${i * 24}px` }}
                    />
                ))}

                {/* Central Hyper-Module */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative w-40 h-40 rounded-[2.5rem] bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden shadow-[0_0_80px_rgba(0,240,255,0.4)] border border-white/20"
                >
                    <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
                    <Logo size={80} className="text-white relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />

                    {/* Scanning Laser Beam */}
                    <motion.div
                        animate={{ top: ['-100%', '200%'] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-2 bg-white shadow-[0_0_30px_#fff,0_0_60px_rgba(0,240,255,1)] z-20"
                    />

                    <div className="absolute inset-0 bg-black/30 backdrop-blur-md"></div>
                </motion.div>

                {/* Orbiting HUD Elements */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-24 pointer-events-none"
                >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 p-2 bg-primary/10 rounded-xl border border-primary/20 text-primary">
                        <ShieldCheck size={20} />
                    </div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 p-2 bg-secondary/10 rounded-xl border border-secondary/20 text-secondary">
                        <Cpu size={20} />
                    </div>
                </motion.div>
            </div>

            <div className="mt-20 text-center z-10 w-full max-w-lg">
                <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                >
                    <h2 className="text-3xl font-black tracking-[0.5em] text-glow uppercase text-white mb-2">{label}</h2>
                    <div className="flex items-center justify-center space-x-3 mb-6">
                        <div className="h-0.5 w-12 bg-primary/40 rounded-full"></div>
                        <span className="text-[10px] text-primary/60 font-mono tracking-widest uppercase">Encriptación Biométrica Lvl 4</span>
                        <div className="h-0.5 w-12 bg-primary/40 rounded-full"></div>
                    </div>
                </motion.div>

                {/* System Progress Bar */}
                <div className="w-80 h-1 bg-white/[0.03] rounded-full overflow-hidden mx-auto mb-10 border border-white/5 p-0.5">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 3, ease: "easeInOut" }}
                        className="h-full bg-gradient-to-r from-primary to-secondary shadow-[0_0_20px_rgba(0,240,255,1)] rounded-full"
                    />
                </div>

                {/* Live Console Simulation */}
                <div className="font-mono text-[9px] text-primary/40 space-y-1 h-32 overflow-hidden flex flex-col items-center">
                    {logs.map((log, i) => (
                        <motion.p
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white/[0.02] px-3 py-1 rounded-md mb-1 w-fit"
                        >
                            {log}
                        </motion.p>
                    ))}
                </div>
            </div>

            {/* Terminal Statistics Overlay */}
            <div className="absolute bottom-10 right-10 flex flex-col items-end font-mono text-[8px] text-white/10 uppercase tracking-widest space-y-2">
                <p>Uptime: 99.998%</p>
                <p>Lat: 0.002ms</p>
                <p>Ver: RS-4.2-PRO</p>
            </div>
        </motion.div>
    )
}

