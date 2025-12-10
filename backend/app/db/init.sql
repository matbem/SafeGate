CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE access_status AS ENUM ('SUCCESS', 'FACE_MISMATCH', 'INVALID_QR', 'NO_FACE', 'TAMPERING_DETECTED');

CREATE TABLE employees (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name TEXT NOT NULL,
    face_encoding VECTOR(128) NOT NULL,
    qr_token UUID NOT NULL UNIQUE,
    qr_valid_until TIMESTAMPTZ NOT NULL,
    reference_photo_path TEXT NOT NULL,
    photo_integrity_hash CHAR(64) NOT NULL, 

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ON employees USING hnsw (face_encoding vector_l2_ops) WITH (m = 16, ef_construction = 64);

CREATE TABLE access_logs (
    log_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    employee_id INT REFERENCES employees(id) ON DELETE SET NULL,
    status access_status NOT NULL,
    confidence FLOAT,
    device_ip INET
);