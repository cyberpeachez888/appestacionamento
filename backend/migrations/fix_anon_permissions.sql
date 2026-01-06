-- =====================================================
-- LIBERAÇÃO DE ACESSO PARA API (ANON)
-- =====================================================
-- Como o backend usa a chave 'anon', precisamos liberar
-- o acesso a essa role para que o sistema funcione.

DO $$
DECLARE
    tables TEXT[] := ARRAY[
        'convenios', 
        'convenios_planos', 
        'convenios_veiculos', 
        'convenios_movimentacoes',
        'convenios_faturas',
        'convenios_historico',
        'convenios_documentos',
        'notificacoes',
        'rates',
        'tickets',
        'payments',
        'monthly_customers',
        'vehicle_types',
        'company_settings',
        'users'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        -- Cria política permitindo acesso total para role 'anon'
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS "Allow anon access" ON %I', t);
        EXCEPTION WHEN OTHERS THEN NULL; END;

        EXECUTE format('CREATE POLICY "Allow anon access" ON %I FOR ALL TO anon USING (true) WITH CHECK (true)', t);

        RAISE NOTICE 'Acesso liberado para tabela: %', t;
    END LOOP;
END $$;
