CREATE POLICY abonos_pago_delete_authenticated
  ON abonos_pago FOR DELETE
  TO authenticated
  USING (true);
