/**
 * Calculate parking duration in hours
 */
export const calculateDuration = (entryTime, exitTime) => {
  const entry = new Date(entryTime);
  const exit = new Date(exitTime);
  const durationMs = exit - entry;
  const durationHours = durationMs / (1000 * 60 * 60);
  return Math.max(0, durationHours);
};

/**
 * Calculate parking fee based on duration and rate
 */
export const calculateParkingFee = (duration, rate, rateType = 'hourly') => {
  if (rateType === 'hourly') {
    // Round up to next hour
    const hours = Math.ceil(duration);
    return hours * rate;
  } else if (rateType === 'daily') {
    // Round up to next day
    const days = Math.ceil(duration / 24);
    return days * rate;
  }
  return rate;
};

/**
 * Generate unique ticket number
 */
export const generateTicketNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TKT${year}${month}${day}${random}`;
};

/**
 * Generate unique receipt number
 */
export const generateReceiptNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RCP${year}${month}${day}${random}`;
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
};
