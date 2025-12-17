/**
 * Convenios Page - Main Component
 * Gestão de Convênios Empresariais
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Building2,
    TrendingUp,
    ParkingSquare,
    AlertTriangle,
    Plus,
    FileText,
    Receipt,
    Search,
    Filter,
    Play,
    Pause
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ConvenioDetailPanel } from '@/components/convenios/ConvenioDetailPanel';
import { ConveniosRelatoriosPanel } from '@/components/convenios/ConveniosRelatoriosPanel';
import { DialogNovoConvenio } from '@/components/convenios/dialogs/DialogNovoConvenio';
import { DialogAdicionarVeiculo } from '@/components/convenios/dialogs/DialogAdicionarVeiculo';
import { api } from '@/lib/api';

// ... (omitted code) ...

                                            ) : (
    convenios.map((convenio) => (
        <TableRow
            key={convenio.id}
            className={`cursor-pointer hover:bg-muted/50 transition-all duration-200 ${convenio.status === 'suspenso' ? 'opacity-50 grayscale-[0.5]' : ''
                }`}
            onClick={() => setSelectedConvenio(convenio)}
        >
            <TableCell>
                <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                        convenio
                    )}`}
                >
                    {getStatusText(convenio)}
                </span>
            </TableCell>
            <TableCell className="font-medium">{convenio.nome_empresa}</TableCell>
            <TableCell className="text-muted-foreground">
                {formatarCNPJ(convenio.cnpj)}
            </TableCell>
            <TableCell className="capitalize">{convenio.tipo_convenio}</TableCell>
            <TableCell>
                {convenio.vagas_ocupadas} / {convenio.plano_ativo?.num_vagas_contratadas || 0}
                <span className="text-xs text-muted-foreground ml-1">
                    ({convenio.taxa_ocupacao.toFixed(0)}%)
                </span>
            </TableCell>
            <TableCell className="font-medium">
                {formatarValor(convenio.plano_ativo?.valor_mensal || 0)}
            </TableCell>
            <TableCell>
                Dia {convenio.plano_ativo?.dia_vencimento_pagamento || '-'}
            </TableCell>
            <TableCell
                className="flex gap-1"
                onClick={(e) => e.stopPropagation()} // Prevent row selection when clicking actions
            >
                {convenio.status === 'suspenso' ? (
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-green-200 hover:bg-green-50 text-green-700 w-full"
                        onClick={() => handleStatusChange(convenio, 'ativo')}
                    >
                        <Play className="h-3.5 w-3.5 mr-1" />
                        Reativar
                    </Button>
                ) : (
                    <>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => handleStatusChange(convenio, 'suspenso')}>
                            <Pause className="h-4 w-4" />
                        </Button>
                    </>
                )}
            </TableCell>
        </TableRow>
    ))
)}
                                        </TableBody >
                                    </Table >
                                </div >
                            </CardContent >
                        </Card >
                    )}
                </TabsContent >

    <TabsContent value="relatorios">
        <ConveniosRelatoriosPanel />
    </TabsContent>
            </Tabs >

    {/* Dialogs */ }
    < DialogNovoConvenio
open = { dialogNovoConvenio }
onOpenChange = { setDialogNovoConvenio }
onSuccess = {() => {
    fetchConvenios();
    fetchStats();
    setDialogNovoConvenio(false);
}}
            />

    < DialogAdicionarVeiculo
open = { dialogAdicionarVeiculo }
onOpenChange = { setDialogAdicionarVeiculo }
convenioId = { selectedConvenio?.id || ''}
onSuccess = {() => {
    // Update detail panel if needed
}}
            />
        </div >
    );
}
