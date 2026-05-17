-- ==========================================
-- Migración 0002: Campos MFA en tabla users
-- Agrega soporte para autenticación TOTP (MFA)
-- ==========================================

ALTER TABLE "users" ADD COLUMN "mfa_secret" TEXT;
ALTER TABLE "users" ADD COLUMN "mfa_enabled" BOOLEAN NOT NULL DEFAULT false;
