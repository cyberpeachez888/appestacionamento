import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';
import { logEvent } from '../services/auditLogger.js';

const table = 'monthly_customers';

function addMonthsISO(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

// Helper function to convert snake_case to camelCase
function toCamelCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const camelObj = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    camelObj[camelKey] = value;
  }
  return camelObj;
}

export default {
  async list(req, res) {
    console.log('=== MONTHLY CUSTOMERS LIST REQUEST ===');
    console.log('Table:', table);

    try {
      const { data, error, count } = await supabase.from(table).select('*', { count: 'exact' });

      console.log('Supabase Response:');
      console.log('- Error:', error);
      console.log('- Count:', count);
      console.log('- Data length:', data?.length);
      console.log('- First customer:', data?.[0]);

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: error.message });
      }

      if (!data || data.length === 0) {
        console.log('No customers found in database');
        return res.json([]);
      }

      // Fetch last payment method for each customer
      const customersWithPayments = await Promise.all(
        data.map(async (customer) => {
          // Get the most recent payment for this customer
          const { data: lastPayment } = await supabase
            .from('payments')
            .select('method')
            .eq('target_type', 'monthly_customer')
            .eq('target_id', customer.id)
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: customer.id,
            name: customer.name,
            cpf: customer.cpf,
            phone: customer.phone,
            parkingSlot: customer.parking_slot,
            plates: JSON.parse(customer.plates || '[]'),
            vehicleType: customer.vehicle_type,
            value: customer.value,
            contractDate: customer.contract_date,
            dueDate: customer.due_date,
            lastPayment: customer.last_payment,
            lastPaymentMethod: lastPayment?.method || null,
            status: customer.status,
            operatorName: customer.operator_name,
            createdAt: customer.created_at,
            paymentHistory: [], // Will be populated if needed
          };
        })
      );

      console.log('Transformed customers:', JSON.stringify(customersWithPayments, null, 2));
      res.json(customersWithPayments);
    } catch (err) {
      console.error('Unexpected error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async create(req, res) {
    try {
      const id = uuid();
      const contractDate = new Date().toISOString();

      // Validate parking slot is provided
      if (!req.body.parkingSlot) {
        return res.status(400).json({
          error: 'Parking slot is required',
          message: 'Por favor, informe o número da vaga.',
        });
      }

      // Check if parking slot is already taken by an active customer
      const { data: existingSlot, error: slotError } = await supabase
        .from(table)
        .select('id, name, parking_slot')
        .eq('parking_slot', req.body.parkingSlot)
        .eq('status', 'active')
        .maybeSingle();

      if (slotError && slotError.code !== 'PGRST116') {
        return res.status(500).json({ error: slotError });
      }

      if (existingSlot) {
        return res.status(409).json({
          error: 'Slot already taken',
          message: `Esta vaga já está associada ao cliente: ${existingSlot.name}. Por favor, escolha uma vaga diferente.`,
          takenBy: existingSlot.name,
        });
      }

      const payload = {
        id,
        name: req.body.name,
        cpf: req.body.cpf || null,
        phone: req.body.phone || null,
        plates: JSON.stringify(req.body.plates || []),
        parking_slot: parseInt(req.body.parkingSlot),
        value: req.body.value,
        operator_name: req.body.operatorName || null,
        contract_date: contractDate,
        status: 'active',
        last_payment: contractDate,
        due_date: addMonthsISO(contractDate, 1),
      };

      const { data, error } = await supabase.from(table).insert(payload).select().single();
      if (error) {
        console.error('Supabase insert error:', error);
        console.error('Payload sent:', payload);
        return res.status(500).json({
          error: error.message || error,
          details: error.details || 'No details available',
          hint: error.hint || 'Check if all required columns exist in the database',
        });
      }

      // register initial payment in payments table
      // Skip if retroactive customer
      const isRetroactive = req.body.isRetroactive || false;

      if (!isRetroactive) {
        await supabase.from('payments').insert({
          id: uuid(),
          target_type: 'monthly_customer',
          target_id: id,
          date: contractDate,
          value: req.body.value || 0,
          method: req.body.paymentMethod || 'cash',
        });
      }

      // Process retroactive payments if provided
      if (req.body.retroactivePayments && Array.isArray(req.body.retroactivePayments) && req.body.retroactivePayments.length > 0) {
        const retroactiveMonths = req.body.retroactivePayments.sort(); // Sort months (oldest first)

        // Create payment record for each retroactive month
        const retroactivePaymentRecords = retroactiveMonths.map(month => ({
          id: uuid(),
          target_type: 'monthly_customer',
          target_id: id,
          date: `${month}-01T00:00:00.000Z`, // First day of the month
          value: req.body.value || 0,
          method: 'retroactive', // Special method to identify retroactive payments
          metadata: JSON.stringify({ type: 'import', note: 'Pagamento anterior ao cadastro no sistema' }),
        }));

        // Insert all retroactive payments
        const { error: retroError } = await supabase.from('payments').insert(retroactivePaymentRecords);
        if (retroError) {
          console.error('Error creating retroactive payments:', retroError);
          // Don't fail the entire request, just log the error
        }

        // Update customer's contract_date to the first retroactive month
        const firstMonth = retroactiveMonths[0];
        await supabase
          .from(table)
          .update({ contract_date: `${firstMonth}-01T00:00:00.000Z` })
          .eq('id', id);
      }

      // Parse plates back to array for response
      const response = { ...data, plates: JSON.parse(data.plates || '[]') };
      await logEvent({
        actor: req.user,
        action: 'monthlyCustomer.create',
        targetType: 'monthly_customer',
        targetId: id,
        details: { parkingSlot: payload.parking_slot, isRetroactive },
      });
      res.status(201).json(response);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      // Normalize incoming body (accept camelCase from frontend)
      const b = req.body || {};
      const patch = {};
      if (b.name !== undefined) patch.name = b.name;
      if (b.cpf !== undefined) patch.cpf = b.cpf;
      if (b.phone !== undefined) patch.phone = b.phone;
      if (b.plates !== undefined)
        patch.plates = Array.isArray(b.plates) ? JSON.stringify(b.plates) : b.plates; // accept already-string
      if (b.parkingSlot !== undefined) patch.parking_slot = parseInt(b.parkingSlot);
      if (b.value !== undefined) patch.value = b.value;
      if (b.operatorName !== undefined) patch.operator_name = b.operatorName;
      if (b.contractDate !== undefined) patch.contract_date = b.contractDate;
      if (b.dueDate !== undefined) patch.due_date = b.dueDate;
      if (b.lastPayment !== undefined) patch.last_payment = b.lastPayment;
      if (b.status !== undefined) patch.status = b.status;

      const { data, error } = await supabase
        .from(table)
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        // Handle missing column (migration not applied) explicitly to guide operator
        if (error.code === '42703') {
          // undefined_column
          return res.status(500).json({
            error: 'Database schema out of date',
            message:
              'Execute backend/COMPLETE-MIGRATION.sql (or MIGRATION-parking-slot.sql) in Supabase to add required columns (parking_slot, plates, cpf, phone, operator_name).',
            details: error.message,
            missingColumn: (error.message.match(/column \"(.+?)\"/) || [])[1],
          });
        }
        return res.status(400).json({
          error: error.message || 'Failed to update monthly customer',
          details: error.details,
          hint: error.hint,
        });
      }
      // Transform response to camelCase like list()
      const transformed = {
        id: data.id,
        name: data.name,
        cpf: data.cpf,
        phone: data.phone,
        parkingSlot: data.parking_slot,
        plates: JSON.parse(data.plates || '[]'),
        value: data.value,
        contractDate: data.contract_date,
        dueDate: data.due_date,
        lastPayment: data.last_payment,
        status: data.status,
        operatorName: data.operator_name,
      };
      await logEvent({
        actor: req.user,
        action: 'monthlyCustomer.update',
        targetType: 'monthly_customer',
        targetId: id,
        details: Object.keys(patch),
      });
      res.json(transformed);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  async remove(req, res) {
    const { id } = req.params;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) return res.status(500).json({ error });
    await logEvent({
      actor: req.user,
      action: 'monthlyCustomer.delete',
      targetType: 'monthly_customer',
      targetId: id,
    });
    res.sendStatus(204);
  },

  async pay(req, res) {
    try {
      const { id } = req.params; // monthly customer id
      const { value, method } = req.body;
      const payment = {
        id: uuid(),
        target_type: 'monthly_customer',
        target_id: id,
        date: new Date().toISOString(),
        value,
        method,
      };
      const { error: payErr } = await supabase.from('payments').insert(payment);
      if (payErr) return res.status(500).json({ error: payErr });

      // extend due date by 1 month
      const customerResp = await supabase.from(table).select('due_date').eq('id', id).single();
      if (customerResp.error) return res.status(500).json({ error: customerResp.error });
      const currentDue = customerResp.data?.due_date || new Date().toISOString();
      const nextDue = addMonthsISO(currentDue, 1);
      const { data, error } = await supabase
        .from(table)
        .update({ last_payment: payment.date, due_date: nextDue })
        .eq('id', id)
        .select()
        .single();
      if (error) return res.status(500).json({ error });
      await logEvent({
        actor: req.user,
        action: 'monthlyCustomer.payment',
        targetType: 'monthly_customer',
        targetId: id,
        details: { value, method },
      });
      res.json({ payment, customer: data });
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  async getReceipt(req, res) {
    try {
      const { id } = req.params;

      // Get customer data
      const { data: customer, error: customerError } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

      if (customerError) return res.status(500).json({ error: customerError });
      if (!customer) return res.status(404).json({ error: 'Customer not found' });

      // Get company config
      const { data: company, error: companyError } = await supabase
        .from('company_config')
        .select('*')
        .limit(1)
        .single();

      if (companyError) return res.status(500).json({ error: companyError });

      // Get latest payment
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('target_type', 'monthly_customer')
        .eq('target_id', id)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (paymentError && paymentError.code !== 'PGRST116') {
        return res.status(500).json({ error: paymentError });
      }

      // Build receipt data
      const receiptData = {
        customer: {
          name: customer.name,
          cpf: customer.cpf,
          phone: customer.phone,
          parkingSlot: customer.parking_slot,
          plates: JSON.parse(customer.plates || '[]'),
        },
        payment: payment
          ? {
            method: payment.method,
            value: payment.value,
            date: payment.date,
          }
          : null,
        contract: {
          date: customer.contract_date,
          value: customer.value,
          dueDate: customer.due_date,
        },
        company: {
          name: company?.name || 'Estacionamento',
          legalName: company?.legal_name,
          cnpj: company?.cnpj,
          address: company?.address,
          phone: company?.phone,
        },
        operator: customer.operator_name,
      };

      res.json(receiptData);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  async checkSlot(req, res) {
    try {
      const { slotNumber } = req.params;
      const { customerId } = req.query; // Get customer ID from query params (for edit mode)

      if (!slotNumber || isNaN(parseInt(slotNumber))) {
        return res.status(400).json({
          error: 'Invalid slot number',
          available: false,
        });
      }

      // Check if slot is taken by an active customer (excluding current customer if editing)
      let query = supabase
        .from(table)
        .select('id, name, parking_slot')
        .eq('parking_slot', parseInt(slotNumber))
        .eq('status', 'active');

      // If editing an existing customer, exclude that customer from the check
      if (customerId) {
        query = query.neq('id', customerId);
      }

      const { data: existingSlot, error } = await query.maybeSingle();

      if (error) {
        // If column doesn't exist yet (migration not run), return available
        if (error.code === '42703') {
          console.warn('parking_slot column does not exist yet. Run migration first.');
          return res.json({
            available: true,
            message: 'Vaga disponível (migration pendente)',
            warning: 'Database migration required',
          });
        }
        return res.status(500).json({ error });
      }

      if (existingSlot) {
        return res.json({
          available: false,
          message: `Esta vaga já está associada ao cliente: ${existingSlot.name}. Por favor, escolha uma vaga diferente.`,
          takenBy: existingSlot.name,
        });
      }

      res.json({
        available: true,
        message: 'Vaga disponível',
      });
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },
};
