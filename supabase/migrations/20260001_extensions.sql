-- Migration 001: Extensions
-- Must run first — other migrations depend on these extensions.

create extension if not exists "uuid-ossp";
create extension if not exists "unaccent";
create extension if not exists "pgcrypto";
