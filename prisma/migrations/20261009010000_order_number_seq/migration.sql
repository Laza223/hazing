-- Secuencia del número de pedido (HZG-000001). La usa checkout-service con
-- nextval(); faltaba en las migraciones (glamify la crea en su migración M2).
CREATE SEQUENCE IF NOT EXISTS order_number_seq AS bigint START WITH 1 INCREMENT BY 1;

-- Solo el backend (Prisma) la usa: sin acceso para los roles públicos de Supabase.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON SEQUENCE order_number_seq FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON SEQUENCE order_number_seq FROM authenticated;
  END IF;
END $$;
