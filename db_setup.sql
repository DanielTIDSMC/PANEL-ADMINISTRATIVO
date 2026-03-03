-- 1. Crear la base de datos (Ejecuta esto por separado si aún no existe)
-- CREATE DATABASE retiscan_prueba;

-- 2. Esquema de Usuarios para el Panel Admin
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Para fines de dev, texto plano o hash bcrypt
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Esquema de Pacientes
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) UNIQUE NOT NULL, -- Ej: RS-2024-882
    full_name VARCHAR(255) NOT NULL,
    age INTEGER,
    gender VARCHAR(50),
    medical_notes TEXT,
    status VARCHAR(50) DEFAULT 'Completed',
    pathology VARCHAR(255) DEFAULT 'None',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. INSERT de usuario administrador inicial
INSERT INTO users (email, password) 
VALUES ('admin@retiscan.ai', '********')
ON CONFLICT (email) DO NOTHING;

-- 5. Registro de paciente de ejemplo
INSERT INTO patients (patient_id, full_name, age, gender, medical_notes, pathology) 
VALUES ('RS-9281', 'Juan Pérez', 45, 'Masculino', 'Estado inicial estable', 'None')
ON CONFLICT (patient_id) DO NOTHING;
