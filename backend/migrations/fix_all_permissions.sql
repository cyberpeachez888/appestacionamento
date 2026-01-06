-- =====================================================
-- RESTAURAÇÃO TOTAL DE PERMISSÕES (FIX FINAL)
-- =====================================================
-- Este script garante que usuários logados (como você, admin)
-- tenham permissão TOTAL (criar, editar, deletar) em todas as tabelas.

-- Função auxiliar para criar política se não existir
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
        -- 1. Habilitar RLS (segurança) na tabela
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

        -- 2. Criar política de acesso total para usuários logados
        -- Dropar primeiro para garantir que não duplique/conflite
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated" ON %I', t);
        EXCEPTION WHEN OTHERS THEN NULL; END;

        EXECUTE format('CREATE POLICY "Allow all for authenticated" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
        
        -- 3. Criar política de acesso total para o sistema (service_role)
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS "Allow all for service_role" ON %I', t);
        EXCEPTION WHEN OTHERS THEN NULL; END;
        
        EXECUTE format('CREATE POLICY "Allow all for service_role" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);

        RAISE NOTICE 'Permissões restauradas para tabela: %', t;
    END LOOP;
END $$;
