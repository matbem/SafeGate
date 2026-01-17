CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE access_status AS ENUM ('SUCCESS', 'FACE_MISMATCH', 'INVALID_QR', 'NO_FACE', 'TAMPERING_DETECTED');

CREATE TABLE employees (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name TEXT NOT NULL,
    face_encoding VECTOR(128) NOT NULL,
    qr_token UUID NOT NULL UNIQUE,
    qr_valid_until TIMESTAMPTZ NOT NULL,
    reference_photo TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ON employees USING hnsw (face_encoding vector_l2_ops) WITH (m = 16, ef_construction = 64);

CREATE TABLE access_logs (
    log_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    employee_id INT REFERENCES employees(id) ON DELETE SET NULL,
    status access_status NOT NULL,
    confidence FLOAT,
    device_ip INET,
    captured_image TEXT,
    qr_content TEXT
);

CREATE TABLE admins (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO admins (username, hashed_password) VALUES
('admin', '$2b$12$nTdR4lRvtq61hGWiD2PGX.hX81MroW3vP397P/z2Yc4NN56.VqS2O'); -- Password is 'admin'

