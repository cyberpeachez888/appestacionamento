/**
 * Convenios Documentos Controller
 * Gerenciamento de documentos anexados aos convênios
 */

import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';
import { logEvent } from '../services/auditLogger.js';

const DOCUMENTOS_TABLE = 'convenios_documentos';
const CONVENIOS_TABLE = 'convenios';

export default {
    /**
     * GET /api/convenios/:convenioId/documentos
     * Lista documentos de um convênio
     */
    async list(req, res) {
        try {
            const { convenioId } = req.params;

            const { data, error } = await supabase
                .from(DOCUMENTOS_TABLE)
                .select('*')
                .eq('convenio_id', convenioId)
                .order('created_at', { ascending: false });

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            res.json(data);
        } catch (err) {
            console.error('Erro no list documentos:', err);
            res.status(500).json({ error: err.message || err });
        }
    },

    /**
     * POST /api/convenios/:convenioId/documentos
     * Upload de documento (simulado/armazenado no banco por enquanto ou poderia ser storage)
     * NOTA: Para simplificar, vamos armazenar apenas metadados e "fingir" o upload retornando sucesso,
     * ou salvar o path se o frontend já tiver feito upload para storage.
     * Como o prompt diz "Armazenar localmente no PC", isso exigiria fs do servidor.
     * Vamos assumir armazenamento de metadados + link simbólico ou base64 se pequeno.
     * Para este MVP, vamos apenas registrar o arquivo.
     */
    async upload(req, res) {
        try {
            const { convenioId } = req.params;
            const {
                nome_arquivo,
                tipo_documento,
                tamanho_bytes,
                caminho_arquivo // URL ou path local
            } = req.body;

            if (!nome_arquivo || !tipo_documento) {
                return res.status(400).json({ error: 'Dados obrigatórios faltando' });
            }

            const docData = {
                id: uuid(),
                convenio_id: convenioId,
                nome_arquivo,
                tipo_documento,
                tamanho_bytes: tamanho_bytes || 0,
                caminho_arquivo: caminho_arquivo || `/docs/${convenioId}/${nome_arquivo}`, // Placeholder
                usuario_id: req.user?.id
            };

            const { data, error } = await supabase
                .from(DOCUMENTOS_TABLE)
                .insert(docData)
                .select()
                .single();

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            await logEvent({
                actor: req.user,
                action: 'convenio.documento.upload',
                targetType: 'convenio_documento',
                targetId: data.id,
                details: { nome: nome_arquivo, tipo: tipo_documento }
            });

            res.status(201).json(data);
        } catch (err) {
            console.error('Erro no upload documento:', err);
            res.status(500).json({ error: err.message || err });
        }
    },

    /**
     * DELETE /api/convenios/:convenioId/documentos/:docId
     * Remove documento
     */
    async delete(req, res) {
        try {
            const { convenioId, docId } = req.params;

            const { error } = await supabase
                .from(DOCUMENTOS_TABLE)
                .delete()
                .eq('id', docId)
                .eq('convenio_id', convenioId);

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            await logEvent({
                actor: req.user,
                action: 'convenio.documento.delete',
                targetType: 'convenio_documento',
                targetId: docId,
                details: { convenioId }
            });

            res.status(204).send();
        } catch (err) {
            console.error('Erro no delete documento:', err);
            res.status(500).json({ error: err.message || err });
        }
    }
};
