import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { addMonths, format, parseISO } from 'date-fns';
import { useParking } from '@/contexts/ParkingContext';
import { useAuth } from '@/contexts/AuthContext';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { MonthCheckboxCalendar } from '@/components/MonthCheckboxCalendar';

// Professional: Define explicit type for customer
interface MonthlyCustomer {
  id?: string;
  name: string;
  cpf?: string;
  phone?: string;
  parkingSlot?: number;
  plates?: string[];
  value: number;
  operatorName?: string;
  contractDate?: string;
}

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: MonthlyCustomer;
  onSaved?: () => void;
}

interface PlateItem {
  id: string;
  value: string;
  isEditing: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function CustomerDialog({ open, onOpenChange, customer, onSaved }: CustomerDialogProps) {
  const { addMonthlyCustomer, updateMonthlyCustomer } = useParking();
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [parkingSlot, setParkingSlot] = useState('');
  const [originalParkingSlot, setOriginalParkingSlot] = useState<string | null>(null);
  const [slotError, setSlotError] = useState('');
  const [isCheckingSlot, setIsCheckingSlot] = useState(false);
  const [plates, setPlates] = useState<PlateItem[]>([]);
  const [newPlateValue, setNewPlateValue] = useState('');
  const [isAddingPlate, setIsAddingPlate] = useState(false);
  const [value, setValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [paidAmount, setPaidAmount] = useState('');
  const [change, setChange] = useState(0);
  const [operatorName, setOperatorName] = useState('');
  const [contractDate, setContractDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState('');
  const [selectedRetroactiveMonths, setSelectedRetroactiveMonths] = useState<string[]>([]);

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setCpf(customer.cpf || '');
      setPhone(customer.phone || '');
      const slotStr = customer.parkingSlot?.toString() || '';
      setParkingSlot(slotStr);
      setOriginalParkingSlot(slotStr);
      const customerPlates = Array.isArray(customer.plates) ? customer.plates : [];
      setPlates(
        customerPlates.map((p: string) => ({
          id: Math.random().toString(),
          value: p,
          isEditing: false,
        }))
      );
      setValue(customer.value.toString());
      setOperatorName(customer.operatorName || '');
      if (customer.contractDate) {
        setContractDate(new Date(customer.contractDate));
      }
    } else {
      setName('');
      setCpf('');
      setPhone('');
      setParkingSlot('');
      setOriginalParkingSlot(null);
      setSlotError('');
      setPlates([]);
      setValue('150');
      setPaymentMethod('Dinheiro');
      setPaidAmount('');
      setChange(0);
      setOperatorName('');
      setIsAddingPlate(false);
      setNewPlateValue('');
      setDueDate('');
      setSelectedRetroactiveMonths([]);
    }
  }, [customer, open]);

  // Format CPF: XXX.XXX.XXX-XX
  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return value;
  };

  // Format Phone: (XX) XXXXX-XXXX
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
    }
    return value;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCpf(e.target.value));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleAddPlate = () => {
    if (plates.length >= 5) return;
    setIsAddingPlate(true);
    setNewPlateValue('');
  };

  const handlePlateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = newPlateValue.trim();
      if (trimmed) {
        const upperPlate = trimmed.toUpperCase();
        setPlates((prev) => [
          ...prev,
          { id: Date.now().toString(), value: upperPlate, isEditing: false },
        ]);
        setNewPlateValue('');
        setIsAddingPlate(false);
      }
    } else if (e.key === 'Escape') {
      setNewPlateValue('');
      setIsAddingPlate(false);
    }
  };

  const handlePlateInputBlur = () => {
    // Only close if input is empty, otherwise keep open
    if (!newPlateValue.trim()) {
      setIsAddingPlate(false);
    }
  };

  const handleEditPlate = (id: string) => {
    setPlates((prev) => prev.map((p) => (p.id === id ? { ...p, isEditing: true } : p)));
  };

  const handleSavePlateEdit = (id: string, newValue: string) => {
    setPlates((prev) =>
      prev.map((p) => (p.id === id ? { ...p, value: newValue.toUpperCase(), isEditing: false } : p))
    );
  };

  const handleDeletePlate = (id: string) => {
    setPlates((prev) => prev.filter((p) => p.id !== id));
  };

  // Calculate change for cash payment
  useEffect(() => {
    if (paymentMethod === 'Dinheiro' && paidAmount && value) {
      const paid = parseFloat(paidAmount);
      const val = parseFloat(value);
      setChange(paid > val ? paid - val : 0);
    } else {
      setChange(0);
    }
  }, [paidAmount, value, paymentMethod]);

  // Validate parking slot availability
  const checkSlotAvailability = async (slotNumber: string) => {
    if (!slotNumber || isNaN(parseInt(slotNumber))) {
      setSlotError('');
      return;
    }

    setIsCheckingSlot(true);
    setSlotError('');

    try {
      // When editing, pass customer ID to exclude current customer from validation
      const url = customer?.id
        ? `${API_URL}/monthlyCustomers/slot/${slotNumber}/check?customerId=${customer.id}`
        : `${API_URL}/monthlyCustomers/slot/${slotNumber}/check`;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(url, { headers });
      const data = await response.json();

      if (response.ok) {
        if (!data.available) {
          setSlotError(data.message || 'Esta vaga já está em uso.');
        }
      } else {
        // If there's a server error (like missing column), just allow it
        // The backend validation will catch real issues
        console.warn('Slot check failed:', data.error);
        setSlotError('');
      }
    } catch (err) {
      console.error('Erro ao verificar vaga:', err);
      // On network error, don't block the user
      setSlotError('');
    } finally {
      setIsCheckingSlot(false);
    }
  };

  const handleParkingSlotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only numbers
    setParkingSlot(value);
    setSlotError(''); // Clear error immediately when user changes value
  };

  // Debounced slot validation - runs 500ms after user stops typing
  useEffect(() => {
    if (!parkingSlot) {
      setSlotError('');
      return;
    }

    // Skip validation if editing and slot unchanged
    if (customer?.id && originalParkingSlot && parkingSlot === originalParkingSlot) {
      setSlotError('');
      return;
    }

    const timer = setTimeout(() => {
      checkSlotAvailability(parkingSlot);
    }, 500);

    return () => clearTimeout(timer);
  }, [parkingSlot, customer?.id, originalParkingSlot, token]); // Include deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Detailed validation with specific error messages
    if (!name.trim()) {
      alert('Por favor, preencha o nome do cliente.');
      return;
    }

    if (!cpf.trim()) {
      alert('Por favor, preencha o CPF do cliente.');
      return;
    }

    if (!phone.trim()) {
      alert('Por favor, preencha o telefone do cliente.');
      return;
    }

    if (!parkingSlot) {
      alert('Por favor, informe o número da vaga.');
      return;
    }

    if (plates.length === 0) {
      alert('Por favor, adicione pelo menos uma placa de veículo.');
      return;
    }

    if (!value || parseFloat(value) <= 0) {
      alert('Por favor, informe o valor mensal.');
      return;
    }

    if (slotError) {
      alert('Por favor, escolha uma vaga disponível antes de continuar.');
      return;
    }

    try {
      if (customer?.id) {
        // Update existing customer (no receipt generation)
        const patch = {
          name: name.trim(),
          cpf: cpf.trim(),
          phone: phone.trim(),
          parkingSlot: parseInt(parkingSlot),
          plates: plates.map((p) => p.value),
          value: parseFloat(value),
          operatorName: operatorName.trim() || undefined,
        };
        await updateMonthlyCustomer(customer.id, patch);
      } else {
        // Create new customer and print initial receipt
        const customerData = {
          name: name.trim(),
          cpf: cpf.trim(),
          phone: phone.trim(),
          parkingSlot: parseInt(parkingSlot),
          plates: plates.map((p) => p.value),
          value: parseFloat(value),
          paymentMethod,
          paidAmount: paymentMethod === 'Dinheiro' ? parseFloat(paidAmount) : undefined,
          operatorName: operatorName.trim() || undefined,
          status: 'Em dia' as const,
          contractDate: contractDate.toISOString(),
          dueDate: dueDate || addMonths(contractDate, 1).toISOString(),
          retroactivePayments: selectedRetroactiveMonths.length > 0 ? selectedRetroactiveMonths : undefined,
        };
        const created = await addMonthlyCustomer(customerData);
        if (created?.id) {
          // Generate and print receipt (authenticated request)
          const response = await fetch(`${API_URL}/monthlyCustomers/${created.id}/receipt`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (response.ok) {
            const receiptData = await response.json();
            printReceipt(receiptData);
          }
        }
      }
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Erro ao salvar cliente:', message);
      alert(`Erro ao salvar cliente: ${message}\n\nVerifique o console para mais detalhes.`);
    }
  };

  // Professional: Define explicit type for receiptData
  interface ReceiptData {
    company: {
      name: string;
      legalName?: string;
      cnpj?: string;
      address?: string;
      phone?: string;
    };
    customer: {
      name: string;
      cpf?: string;
      phone?: string;
      parkingSlot?: number;
      plates: string[];
    };
    contract: {
      date: string;
      value: number;
      dueDate: string;
    };
    payment?: {
      method: string;
      value: number;
      date: string;
    };
    operator?: string;
  }

  const printReceipt = (receiptData: ReceiptData) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recibo de Mensalista</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            .receipt { border: 2px solid #000; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 15px; }
            .header h1 { font-size: 24px; margin-bottom: 5px; }
            .header p { font-size: 12px; margin: 2px 0; }
            .section { margin: 15px 0; }
            .section-title { font-weight: bold; font-size: 14px; margin-bottom: 8px; border-bottom: 1px solid #000; }
            .field { display: flex; margin: 5px 0; font-size: 12px; }
            .field-label { font-weight: bold; width: 150px; }
            .field-value { flex: 1; }
            .plates { display: flex; flex-wrap: wrap; gap: 10px; }
            .plate-badge { background: #333; color: white; padding: 5px 10px; border-radius: 4px; font-weight: bold; }
            .footer { margin-top: 20px; padding-top: 15px; border-top: 2px solid #000; text-align: center; font-size: 11px; }
            @media print {
              body { padding: 0; }
              @page { margin: 0.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1>${receiptData.company.name}</h1>
              ${receiptData.company.legalName ? `<p>${receiptData.company.legalName}</p>` : ''}
              ${receiptData.company.cnpj ? `<p>CNPJ: ${receiptData.company.cnpj}</p>` : ''}
              ${receiptData.company.address ? `<p>${receiptData.company.address}</p>` : ''}
              ${receiptData.company.phone ? `<p>Tel: ${receiptData.company.phone}</p>` : ''}
            </div>
            
            <div class="section">
              <div class="section-title">RECIBO DE CONTRATO MENSALISTA</div>
            </div>

            <div class="section">
              <div class="section-title">Dados do Cliente</div>
              <div class="field">
                <span class="field-label">Nome:</span>
                <span class="field-value">${receiptData.customer.name}</span>
              </div>
              ${receiptData.customer.cpf
        ? `
              <div class="field">
                <span class="field-label">CPF:</span>
                <span class="field-value">${receiptData.customer.cpf}</span>
              </div>`
        : ''
      }
              ${receiptData.customer.phone
        ? `
              <div class="field">
                <span class="field-label">Telefone:</span>
                <span class="field-value">${receiptData.customer.phone}</span>
              </div>`
        : ''
      }
            </div>

            <div class="section">
              <div class="section-title">Vaga e Veículos</div>
              ${receiptData.customer.parkingSlot
        ? `
              <div class="field">
                <span class="field-label">Vaga Reservada:</span>
                <span class="field-value" style="font-size: 18px; font-weight: bold; color: #2563eb;">Nº ${receiptData.customer.parkingSlot}</span>
              </div>`
        : ''
      }
              <div class="field" style="margin-top: 10px;">
                <span class="field-label">Placas Cadastradas:</span>
              </div>
              <div class="plates">
                ${receiptData.customer.plates.map((plate: string) => `<span class="plate-badge">${plate}</span>`).join('')}
              </div>
              <p style="font-size: 11px; margin-top: 8px; color: #666;">
                * O cliente possui ${receiptData.customer.plates.length} veículo(s) cadastrado(s) para esta vaga.
              </p>
            </div>

            <div class="section">
              <div class="section-title">Dados do Contrato</div>
              <div class="field">
                <span class="field-label">Data do Contrato:</span>
                <span class="field-value">${format(new Date(receiptData.contract.date), 'dd/MM/yyyy HH:mm')}</span>
              </div>
              <div class="field">
                <span class="field-label">Valor Mensal:</span>
                <span class="field-value">R$ ${receiptData.contract.value.toFixed(2)}</span>
              </div>
              <div class="field">
                <span class="field-label">Vencimento:</span>
                <span class="field-value">${format(new Date(receiptData.contract.dueDate), 'dd/MM/yyyy')}</span>
              </div>
            </div>

            ${receiptData.payment
        ? `
            <div class="section">
              <div class="section-title">Pagamento</div>
              <div class="field">
                <span class="field-label">Forma de Pagamento:</span>
                <span class="field-value">${receiptData.payment.method}</span>
              </div>
              <div class="field">
                <span class="field-label">Valor Pago:</span>
                <span class="field-value">R$ ${receiptData.payment.value.toFixed(2)}</span>
              </div>
              <div class="field">
                <span class="field-label">Data do Pagamento:</span>
                <span class="field-value">${format(new Date(receiptData.payment.date), 'dd/MM/yyyy HH:mm')}</span>
              </div>
            </div>`
        : ''
      }

            ${receiptData.operator
        ? `
            <div class="section">
              <div class="field">
                <span class="field-label">Operador:</span>
                <span class="field-value">${receiptData.operator}</span>
              </div>
            </div>`
        : ''
      }

            <div class="footer">
              <p>Este recibo é comprovante de contrato de estacionamento mensal.</p>
              <p>Emitido em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer ? 'Editar Cliente' : 'Adicionar Cliente Mensalista'}</DialogTitle>
          <DialogDescription>
            {customer
              ? 'Edite os dados do cliente mensalista.'
              : 'Registre um novo cliente mensalista com pagamento e recibo.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Contract Date Display */}
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="text-sm font-medium text-muted-foreground">Data do Contrato</div>
              <div className="text-lg font-semibold">
                {format(contractDate, "dd/MM/yyyy 'às' HH:mm")}
              </div>
            </div>

            {/* Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nome <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="Nome completo do cliente"
                required
              />
            </div>

            {/* CPF */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cpf" className="text-right">
                CPF <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cpf"
                value={cpf}
                onChange={handleCpfChange}
                className="col-span-3"
                placeholder="000.000.000-00"
                maxLength={14}
                required
              />
            </div>

            {/* Phone */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Telefone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={handlePhoneChange}
                className="col-span-3"
                placeholder="(00) 00000-0000"
                maxLength={15}
                required
              />
            </div>

            {/* Parking Slot */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="parkingSlot" className="text-right">
                Vaga <span className="text-red-500">*</span>
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="parkingSlot"
                  type="number"
                  value={parkingSlot}
                  onChange={handleParkingSlotChange}
                  placeholder="Número da vaga"
                  min="1"
                  required
                  className={slotError ? 'border-red-500' : ''}
                />
                {isCheckingSlot && (
                  <p className="text-sm text-muted-foreground">Verificando disponibilidade...</p>
                )}
                {slotError && <p className="text-sm text-red-500 font-medium">{slotError}</p>}
                {parkingSlot && !slotError && !isCheckingSlot && (
                  <p className="text-sm text-green-600 font-medium">✓ Vaga disponível</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Uma vaga por cliente (até 5 veículos na mesma vaga)
                </p>
              </div>
            </div>

            {/* Plates Management */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                Placas <span className="text-red-500">*</span>
              </Label>
              <div className="col-span-3 space-y-2">
                {/* Display added plates */}
                {plates.map((plate) => (
                  <div key={plate.id} className="flex gap-2 items-center">
                    {plate.isEditing ? (
                      <Input
                        value={plate.value}
                        onChange={(e) => {
                          const newValue = e.target.value.toUpperCase();
                          setPlates((prev) =>
                            prev.map((p) => (p.id === plate.id ? { ...p, value: newValue } : p))
                          );
                        }}
                        onBlur={() => handleSavePlateEdit(plate.id, plate.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSavePlateEdit(plate.id, plate.value);
                          }
                        }}
                        autoFocus
                        placeholder="ABC-1234"
                        className="flex-1"
                      />
                    ) : (
                      <div className="flex-1 px-3 py-2 border rounded-md bg-muted font-mono font-semibold">
                        {plate.value}
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditPlate(plate.id)}
                      disabled={plate.isEditing}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePlate(plate.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}

                {/* New plate input */}
                {isAddingPlate && (
                  <div className="space-y-2">
                    <Input
                      value={newPlateValue}
                      onChange={(e) => setNewPlateValue(e.target.value.toUpperCase())}
                      onKeyDown={handlePlateKeyDown}
                      onBlur={handlePlateInputBlur}
                      placeholder="ABC-1234 (pressione Enter ou clique Confirmar)"
                      autoFocus
                      maxLength={8}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => {
                          const trimmed = newPlateValue.trim();
                          if (trimmed) {
                            const upperPlate = trimmed.toUpperCase();
                            setPlates((prev) => [
                              ...prev,
                              { id: Date.now().toString(), value: upperPlate, isEditing: false },
                            ]);
                            setNewPlateValue('');
                            setIsAddingPlate(false);
                          }
                        }}
                        disabled={!newPlateValue.trim()}
                        className="flex-1"
                      >
                        Confirmar Placa
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewPlateValue('');
                          setIsAddingPlate(false);
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Add plate button */}
                {!isAddingPlate && plates.length < 5 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddPlate}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Placa {plates.length > 0 && `(${plates.length}/5)`}
                  </Button>
                )}

                {plates.length >= 5 && (
                  <p className="text-sm text-muted-foreground">✓ Máximo de 5 veículos atingido</p>
                )}

                {plates.length === 0 && !isAddingPlate && (
                  <p className="text-sm text-muted-foreground italic">
                    Clique no botão acima para adicionar a primeira placa
                  </p>
                )}
              </div>
            </div>

            {/* Monthly Value */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="value" className="text-right">
                Valor Mensal <span className="text-red-500">*</span>
              </Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="150.00"
                className="col-span-3"
                required
              />
            </div>

            {/* Due Date (only for new customers) */}
            {!customer && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dueDate" className="text-right">
                  Próximo Vencimento
                </Label>
                <div className="col-span-3 space-y-1">
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="col-span-3"
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco para usar o padrão (1 mês após hoje)
                  </p>
                </div>
              </div>
            )}

            {/* Retroactive Payments Calendar (only for new customers) */}
            {!customer && dueDate && parseFloat(value) > 0 && (
              <div className="col-span-4">
                <MonthCheckboxCalendar
                  dueDate={dueDate}
                  monthlyValue={parseFloat(value)}
                  selectedMonths={selectedRetroactiveMonths}
                  onMonthsChange={setSelectedRetroactiveMonths}
                />
              </div>
            )}

            {/* Operator Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="operator" className="text-right">
                Operador
              </Label>
              <Input
                id="operator"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                placeholder="Nome do operador (opcional)"
                className="col-span-3"
              />
            </div>

            {/* Payment Section (only for creation) */}
            {!customer && (
              <div className="border-t pt-4 mt-2">
                <h3 className="font-semibold mb-3">Pagamento</h3>

                <div className="grid grid-cols-4 items-center gap-4 mb-3">
                  <Label className="text-right">Forma</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="Pix">Pix</SelectItem>
                      <SelectItem value="Cartão Débito">Cartão Débito</SelectItem>
                      <SelectItem value="Cartão Crédito">Cartão Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentMethod === 'Dinheiro' && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4 mb-3">
                      <Label htmlFor="paidAmount" className="text-right">
                        Valor Pago
                      </Label>
                      <Input
                        id="paidAmount"
                        type="number"
                        step="0.01"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        placeholder="200.00"
                        className="col-span-3"
                      />
                    </div>
                    {change > 0 && (
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Troco</Label>
                        <div className="col-span-3 px-3 py-2 bg-muted rounded-md font-semibold text-green-600">
                          R$ {change.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              {customer ? 'Salvar Alterações' : 'Salvar + Imprimir Recibo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
