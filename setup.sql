DROP TABLE IF EXISTS signatures;

CREATE TABLE signatures (
    id         SERIAL PRIMARY KEY,
    first_name VARCHAR NOT NULL CHECK (first_name != ''),
    last_name  VARCHAR NOT NULL CHECK (last_name != ''),
    image      VARCHAR NOT NULL CHECK (image != ''),
    e_mail     VARCHAR UNIQUE NOT NULL CHECK (e_mail != ''),
    timestamp  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

