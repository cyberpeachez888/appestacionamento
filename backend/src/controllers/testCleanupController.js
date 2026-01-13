import { supabase } from '../config/supabase.js';

/**
 * Test Cleanup Controller
 * 
 * PROPÓSITO: Testar a limpeza de registros operacionais SEM gerar relatório mensal
 * 
 * SEGURANÇA:
 * - Permite testar com IDs específicos
 * - Mostra logs detalhados para diagnóstico
 * - Pode ser usado em produção com cuidado
 */

export default {
    /**
     * Test Delete Operation
     * POST /api/test/cleanup
     * 
     * Body: {
     *   ticketIds: string[],    // IDs específicos para testar (opcional)
     *   paymentIds: string[],   // IDs específicos para testar (opcional)
     *   dryRun: boolean         // Se true, apenas simula sem deletar (default: true)
     * }
     */
    async testCleanup(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { ticketIds = [], paymentIds = [], dryRun = true } = req.body;

            console.log('🧪 ===== TEST CLEANUP STARTED =====');
            console.log(`🧪 User ID: ${user.id}`);
            console.log(`🧪 User Role: ${user.role}`);
            console.log(`🧪 User Login: ${user.login}`);
            console.log(`🧪 Dry Run: ${dryRun}`);
            console.log(`🧪 Ticket IDs to test: ${ticketIds.length}`);
            console.log(`🧪 Payment IDs to test: ${paymentIds.length}`);

            const results = {
                user: {
                    id: user.id,
                    role: user.role,
                    login: user.login,
                },
                dryRun,
                tickets: {
                    requested: ticketIds.length,
                    deleted: 0,
                    remaining: 0,
                    errors: [],
                },
                payments: {
                    requested: paymentIds.length,
                    deleted: 0,
                    remaining: 0,
                    errors: [],
                },
                rlsDiagnosis: {},
            };

            // === TEST TICKETS DELETION ===
            if (ticketIds.length > 0) {
                console.log(`🧪 Testing deletion of ${ticketIds.length} tickets...`);
                console.log(`🧪 First 3 ticket IDs:`, ticketIds.slice(0, 3));

                // Verificar quantos existem antes
                const { count: beforeCount, error: beforeError } = await supabase
                    .from('tickets')
                    .select('*', { count: 'exact', head: true })
                    .in('id', ticketIds);

                if (beforeError) {
                    console.error('❌ Error counting tickets before:', beforeError);
                    results.tickets.errors.push({
                        stage: 'before_count',
                        error: beforeError.message,
                    });
                } else {
                    console.log(`🔍 Found ${beforeCount} tickets before deletion`);
                }

                if (!dryRun) {
                    // DELETAR DE VERDADE
                    const { data: deletedData, error: deleteError, count } = await supabase
                        .from('tickets')
                        .delete()
                        .in('id', ticketIds)
                        .select();

                    console.log(`🧪 Delete response - Error:`, deleteError);
                    console.log(`🧪 Delete response - Count:`, count);
                    console.log(`🧪 Delete response - Data length:`, deletedData?.length);

                    if (deleteError) {
                        console.error('❌ Error deleting tickets:', deleteError);
                        console.error('❌ Error code:', deleteError.code);
                        console.error('❌ Error hint:', deleteError.hint);
                        console.error('❌ Error details:', deleteError.details);
                        results.tickets.errors.push({
                            stage: 'delete',
                            error: deleteError.message,
                            code: deleteError.code,
                            hint: deleteError.hint,
                        });
                    } else {
                        const actualDeleted = deletedData?.length || 0;
                        results.tickets.deleted = actualDeleted;

                        if (actualDeleted === 0) {
                            console.warn('⚠️  DELETE succeeded but 0 rows affected!');
                            console.warn('⚠️  This usually indicates RLS policy blocking deletion');
                            results.tickets.errors.push({
                                stage: 'delete',
                                error: 'No rows deleted despite no error - likely RLS policy issue',
                            });
                            results.rlsDiagnosis.ticketsBlocked = true;
                        } else if (actualDeleted < ticketIds.length) {
                            console.warn(`⚠️  Partial deletion: ${actualDeleted}/${ticketIds.length}`);
                            results.tickets.errors.push({
                                stage: 'delete',
                                error: `Only ${actualDeleted}/${ticketIds.length} deleted`,
                            });
                            results.rlsDiagnosis.ticketsPartialBlock = true;
                        } else {
                            console.log(`✅ Successfully deleted ${actualDeleted} tickets`);
                        }
                    }

                    // Verificar quantos restam
                    const { count: afterCount, error: afterError } = await supabase
                        .from('tickets')
                        .select('*', { count: 'exact', head: true })
                        .in('id', ticketIds);

                    if (!afterError) {
                        results.tickets.remaining = afterCount;
                        console.log(`🔍 ${afterCount} tickets still in database (should be 0)`);
                        if (afterCount > 0) {
                            console.error(`❌ CRITICAL: ${afterCount} tickets were NOT deleted!`);
                        }
                    }
                } else {
                    console.log('🧪 DRY RUN - Skipping actual deletion');
                    results.tickets.deleted = 0;
                    results.tickets.remaining = beforeCount;
                }
            }

            // === TEST PAYMENTS DELETION ===
            if (paymentIds.length > 0) {
                console.log(`🧪 Testing deletion of ${paymentIds.length} payments...`);
                console.log(`🧪 First 3 payment IDs:`, paymentIds.slice(0, 3));

                // Verificar quantos existem antes
                const { count: beforeCount, error: beforeError } = await supabase
                    .from('payments')
                    .select('*', { count: 'exact', head: true })
                    .in('id', paymentIds);

                if (beforeError) {
                    console.error('❌ Error counting payments before:', beforeError);
                    results.payments.errors.push({
                        stage: 'before_count',
                        error: beforeError.message,
                    });
                } else {
                    console.log(`🔍 Found ${beforeCount} payments before deletion`);
                }

                if (!dryRun) {
                    // DELETAR DE VERDADE
                    const { data: deletedData, error: deleteError, count } = await supabase
                        .from('payments')
                        .delete()
                        .in('id', paymentIds)
                        .select();

                    console.log(`🧪 Delete response - Error:`, deleteError);
                    console.log(`🧪 Delete response - Count:`, count);
                    console.log(`🧪 Delete response - Data length:`, deletedData?.length);

                    if (deleteError) {
                        console.error('❌ Error deleting payments:', deleteError);
                        console.error('❌ Error code:', deleteError.code);
                        console.error('❌ Error hint:', deleteError.hint);
                        results.payments.errors.push({
                            stage: 'delete',
                            error: deleteError.message,
                            code: deleteError.code,
                            hint: deleteError.hint,
                        });
                    } else {
                        const actualDeleted = deletedData?.length || 0;
                        results.payments.deleted = actualDeleted;

                        if (actualDeleted === 0) {
                            console.warn('⚠️  DELETE succeeded but 0 rows affected!');
                            console.warn('⚠️  This usually indicates RLS policy blocking deletion');
                            results.payments.errors.push({
                                stage: 'delete',
                                error: 'No rows deleted despite no error - likely RLS policy issue',
                            });
                            results.rlsDiagnosis.paymentsBlocked = true;
                        } else if (actualDeleted < paymentIds.length) {
                            console.warn(`⚠️  Partial deletion: ${actualDeleted}/${paymentIds.length}`);
                            results.payments.errors.push({
                                stage: 'delete',
                                error: `Only ${actualDeleted}/${paymentIds.length} deleted`,
                            });
                            results.rlsDiagnosis.paymentsPartialBlock = true;
                        } else {
                            console.log(`✅ Successfully deleted ${actualDeleted} payments`);
                        }
                    }

                    // Verificar quantos restam
                    const { count: afterCount, error: afterError } = await supabase
                        .from('payments')
                        .select('*', { count: 'exact', head: true })
                        .in('id', paymentIds);

                    if (!afterError) {
                        results.payments.remaining = afterCount;
                        console.log(`🔍 ${afterCount} payments still in database (should be 0)`);
                        if (afterCount > 0) {
                            console.error(`❌ CRITICAL: ${afterCount} payments were NOT deleted!`);
                        }
                    }
                } else {
                    console.log('🧪 DRY RUN - Skipping actual deletion');
                    results.payments.deleted = 0;
                    results.payments.remaining = beforeCount;
                }
            }

            console.log('🧪 ===== TEST CLEANUP COMPLETE =====');
            console.log('🧪 Results:', JSON.stringify(results, null, 2));

            // Diagnóstico de RLS
            const hasRlsIssue =
                results.rlsDiagnosis.ticketsBlocked ||
                results.rlsDiagnosis.paymentsBlocked ||
                results.rlsDiagnosis.ticketsPartialBlock ||
                results.rlsDiagnosis.paymentsPartialBlock;

            if (hasRlsIssue) {
                results.recommendation =
                    'RLS policy issue detected. Execute DIAGNOSE_RLS_POLICIES.sql in Supabase SQL Editor.';
            }

            res.json({
                success: true,
                message: dryRun ? 'Dry run completed - no data was deleted' : 'Test cleanup completed',
                results,
            });
        } catch (err) {
            console.error('Error in test cleanup:', err);
            res.status(500).json({ error: 'Internal server error', details: err.message });
        }
    },

    /**
     * Get Sample IDs for Testing
     * GET /api/test/cleanup/sample-ids
     * 
     * Query params:
     * - ticketLimit: number (default: 3)
     * - paymentLimit: number (default: 3)
     */
    async getSampleIds(req, res) {
        try {
            const { ticketLimit = 3, paymentLimit = 3 } = req.query;

            // Pegar alguns tickets de exemplo
            const { data: tickets, error: ticketsError } = await supabase
                .from('tickets')
                .select('id, vehicle_plate, entry_time, status')
                .order('entry_time', { ascending: false })
                .limit(Number(ticketLimit));

            if (ticketsError) {
                return res.status(500).json({ error: 'Error fetching tickets', details: ticketsError.message });
            }

            // Pegar alguns pagamentos de exemplo (avulsos apenas)
            const { data: payments, error: paymentsError } = await supabase
                .from('payments')
                .select('id, value, method, date, target_type')
                .eq('target_type', 'ticket')
                .order('date', { ascending: false })
                .limit(Number(paymentLimit));

            if (paymentsError) {
                return res.status(500).json({ error: 'Error fetching payments', details: paymentsError.message });
            }

            res.json({
                tickets: tickets || [],
                payments: payments || [],
                ticketIds: (tickets || []).map((t) => t.id),
                paymentIds: (payments || []).map((p) => p.id),
            });
        } catch (err) {
            console.error('Error getting sample IDs:', err);
            res.status(500).json({ error: 'Internal server error', details: err.message });
        }
    },
};
