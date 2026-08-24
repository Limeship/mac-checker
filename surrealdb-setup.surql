-- Run this once against your SurrealDB instance as root to create a read-only
-- frontend user. Replace the password before running.
--
-- Usage (from CLI):
--   surreal sql --conn ws://localhost:8000/rpc \
--               --user root --pass <root-pass> \
--               --ns lime_tracker --db lime_tracker \
--               --file surrealdb-setup.surql

USE NS lime_tracker;
USE DB lime_tracker;

-- Create a scoped database user with SELECT-only access
DEFINE USER frontend ON DATABASE
    PASSWORD 'change_me_frontend_pass'
    ROLES VIEWER;
