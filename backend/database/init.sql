CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    description TEXT,
    timestamp TIMESTAMP NOT NULL,
    metadata JSONB,
    status VARCHAR(50) NOT NULL
);

ALTER TABLE transactions 
ALTER COLUMN id TYPE UUID USING id::text::UUID,
ALTER COLUMN id SET DEFAULT gen_random_uuid();