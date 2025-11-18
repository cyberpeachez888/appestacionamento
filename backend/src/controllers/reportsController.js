import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';

export default {
  async summary(req, res) {
    try {
      const { start, end } = req.query;
      console.log('[Reports] Fetching financial report', { start, end });
      
      // Fetch payments from payments table
      let paymentsQuery = supabase
        .from('payments')
        .select('*, target_type')
        .order('date', { ascending: false });
      if (start) paymentsQuery = paymentsQuery.gte('date', start);
      if (end) paymentsQuery = paymentsQuery.lte('date', end);
      const paymentsResp = await paymentsQuery;
      if (paymentsResp.error) {
        console.error('[Reports] Error fetching payments:', paymentsResp.error);
        return res.status(500).json({ error: paymentsResp.error });
      }
      console.log('[Reports] Found payments:', paymentsResp.data?.length || 0);

      let payments = paymentsResp.data || [];
      
      // Also fetch completed tickets to ensure we capture all revenue
      // This handles cases where tickets were closed but payments weren't created
      // Fetch tickets that have an exit_time (completed), regardless of status
      let ticketsQuery = supabase
        .from('tickets')
        .select('id, exit_time, amount, metadata, status');
      
      // Apply date filters if provided (this helps reduce data fetched)
      // Only apply exit_time filters if we have date constraints
      // Otherwise, we'll fetch all tickets and filter in code (but this is less efficient)
      if (start) {
        ticketsQuery = ticketsQuery.gte('exit_time', start);
      }
      if (end) {
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        ticketsQuery = ticketsQuery.lte('exit_time', endDate.toISOString());
      }
      
      // If no date filters, limit the query to avoid fetching too many tickets
      // In production, you might want to add pagination or a reasonable date range
      if (!start && !end) {
        // Limit to last 365 days to avoid performance issues
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        ticketsQuery = ticketsQuery.gte('exit_time', oneYearAgo.toISOString());
        console.log('[Reports] No date filters provided, limiting to last year');
      }
      
      const allTicketsResp = await ticketsQuery;
      
      if (allTicketsResp.error) {
        console.warn('[Reports] Error fetching tickets (non-fatal):', allTicketsResp.error);
      } else {
        console.log('[Reports] Found tickets:', allTicketsResp.data?.length || 0);
      }
      
      // Filter tickets that have exit_time (completed tickets)
      // This ensures we only process tickets that were actually completed
      let completedTickets = [];
      if (!allTicketsResp.error && allTicketsResp.data) {
        completedTickets = allTicketsResp.data.filter((ticket) => ticket.exit_time != null);
        console.log('[Reports] Completed tickets (with exit_time):', completedTickets.length);
      }
      
      const ticketsResp = { data: completedTickets, error: null };
      
      if (!ticketsResp.error && ticketsResp.data) {
        // Get all existing payment IDs for tickets to avoid duplicates
        const existingPaymentIds = new Set(
          payments
            .filter((p) => p.target_type === 'ticket')
            .map((p) => p.target_id)
        );
        
        // For each completed ticket, ensure there's a payment record
        for (const ticket of ticketsResp.data) {
          if (!ticket.amount || ticket.amount <= 0) continue;
          
          // Skip if payment already exists
          if (existingPaymentIds.has(ticket.id)) continue;
          
          // Create payment record for this ticket
          const paymentDate = ticket.exit_time || new Date().toISOString();
          const paymentValue = Number(ticket.amount) || 0;
          const paymentMethod = ticket.metadata?.paymentMethod || 'cash';
          
          // Only process if within date range (if specified)
          if (start || end) {
            const ticketDate = new Date(paymentDate);
            if (start && ticketDate < new Date(start)) continue;
            if (end) {
              const endDate = new Date(end);
              endDate.setHours(23, 59, 59, 999);
              if (ticketDate > endDate) continue;
            }
          }
          
          try {
            // Try to create the payment record in database
            const newPaymentId = uuid();
            const insertResult = await supabase.from('payments').insert({
              id: newPaymentId,
              target_type: 'ticket',
              target_id: ticket.id,
              date: paymentDate,
              value: paymentValue,
              method: paymentMethod,
            });
            
            // If successful, add to payments array for this response
            if (!insertResult.error) {
              payments.push({
                id: newPaymentId,
                target_type: 'ticket',
                target_id: ticket.id,
                date: paymentDate,
                value: paymentValue,
                method: paymentMethod,
              });
              existingPaymentIds.add(ticket.id); // Mark as added to avoid duplicates
            } else {
              // If insert fails (e.g., duplicate), still include in response
              console.warn('Failed to create payment for ticket', ticket.id, insertResult.error);
              payments.push({
                id: `temp-${ticket.id}`,
                target_type: 'ticket',
                target_id: ticket.id,
                date: paymentDate,
                value: paymentValue,
                method: paymentMethod,
              });
            }
          } catch (paymentErr) {
            // If creation fails, still include in response for this request
            console.warn('Failed to create payment for ticket', ticket.id, paymentErr);
            payments.push({
              id: `temp-${ticket.id}`,
              target_type: 'ticket',
              target_id: ticket.id,
              date: paymentDate,
              value: paymentValue,
              method: paymentMethod,
            });
          }
        }
      }
      
      // Sort payments by date (most recent first)
      payments.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });
      
      const total = payments.reduce((s, p) => s + (Number(p.value) || 0), 0);
      const byMethod = payments.reduce((acc, p) => {
        acc[p.method || 'unknown'] = (acc[p.method || 'unknown'] || 0) + (Number(p.value) || 0);
        return acc;
      }, {});

      console.log('[Reports] Final response:', {
        total,
        count: payments.length,
        byMethodKeys: Object.keys(byMethod),
      });

      res.json({ total, count: payments.length, byMethod, payments });
    } catch (err) {
      console.error('[Reports] Error in summary:', err);
      res.status(500).json({ error: err.message || err });
    }
  },
};
