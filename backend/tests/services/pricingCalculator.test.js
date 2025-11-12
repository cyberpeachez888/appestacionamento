import { jest } from '@jest/globals';

const supabaseMock = {
  from: jest.fn(),
};

jest.unstable_mockModule('../../src/config/supabase.js', () => ({
  supabase: supabaseMock,
}));

const { calculateAdvancedPrice } = await import('../../src/services/pricingCalculator.js');
const { supabase } = await import('../../src/config/supabase.js');

const MOCK_RATE_ID = 'rate-hourly';
const MOCK_DAILY_ID = 'rate-daily';
const MOCK_VEHICLE_TYPE = 'Carro';

const hourlyRate = {
  id: MOCK_RATE_ID,
  vehicle_type: MOCK_VEHICLE_TYPE,
  rate_type: 'Hora/Fração',
  value: 5,
  unit: 'hora',
  courtesy_minutes: 10,
  config: { courtesyMinutes: 10 },
};

const dailyRate = {
  id: MOCK_DAILY_ID,
  vehicle_type: MOCK_VEHICLE_TYPE,
  rate_type: 'Diária',
  value: 30,
  unit: 'dia',
  config: {},
};

const overnightRate = {
  id: 'rate-overnight',
  vehicle_type: MOCK_VEHICLE_TYPE,
  rate_type: 'Pernoite',
  value: 40,
  unit: 'pernoite',
  config: {},
};

const weeklyRate = {
  id: 'rate-weekly',
  vehicle_type: MOCK_VEHICLE_TYPE,
  rate_type: 'Semanal',
  value: 150,
  unit: 'semana',
  config: {},
};

const thresholds = [
  {
    id: 'threshold-1',
    source_rate_id: MOCK_RATE_ID,
    target_rate_id: MOCK_DAILY_ID,
    threshold_amount: 30,
    auto_apply: false,
    created_at: new Date().toISOString(),
  },
];

const success = (data) => ({ data, error: null });

function createRatesSelectBuilder(relatedRates) {
  const state = {};

  return {
    in: () => success(relatedRates),
    eq: (column, value) => {
      state[column] = value;
      return {
        eq: (column2, value2) => {
          state[column2] = value2;
          return {
            maybeSingle: () => {
              const match = relatedRates.find(
                (rate) =>
                  normalize(rate.vehicle_type) === normalize(state.vehicle_type) &&
                  normalize(rate.rate_type) === normalize(state.rate_type)
              );
              return success(match ?? null);
            },
            order: () => success(relatedRates),
          };
        },
        maybeSingle: () => success(null),
      };
    },
  };
}

function normalize(value) {
  return (value || '').toString().toLowerCase();
}

function mockSupabaseResponses({
  windows = [],
  thresholdsData = thresholds,
  rules = [],
  relatedRates = [hourlyRate, dailyRate, overnightRate, weeklyRate],
} = {}) {
  supabase.from.mockImplementation((table) => {
    if (table === 'rate_time_windows') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => success(windows),
          }),
        }),
      };
    }

    if (table === 'rate_thresholds') {
      return {
        select: () => ({
          eq: () => success(thresholdsData),
        }),
      };
    }

    if (table === 'pricing_rules') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => success(rules),
          }),
        }),
      };
    }

    if (table === 'rates') {
      const selectBuilder = createRatesSelectBuilder(relatedRates);
      return {
        select: () => selectBuilder,
      };
    }

    return {
      select: () => success([]),
    };
  });
}

describe('pricingCalculator.calculateAdvancedPrice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calcula tarifa por hora/fração com cortesia', async () => {
    mockSupabaseResponses({ thresholdsData: [] });

    const result = await calculateAdvancedPrice(
      {
        entryDate: '2025-02-12',
        entryTime: '10:00',
        vehicleType: MOCK_VEHICLE_TYPE,
      },
      hourlyRate,
      '2025-02-12',
      '11:05',
    );

    expect(result.price).toBe(5); // 1 fração, 5 reais
    expect(result.breakdown[0]).toEqual(
      expect.objectContaining({
        type: 'hourly',
        fractions: 1,
      }),
    );
  });

  it('aplica segunda fração quando excede cortesia', async () => {
    mockSupabaseResponses({ thresholdsData: [] });

    const result = await calculateAdvancedPrice(
      {
        entryDate: '2025-02-12',
        entryTime: '10:00',
        vehicleType: MOCK_VEHICLE_TYPE,
      },
      hourlyRate,
      '2025-02-12',
      '11:25',
    );

    expect(result.price).toBe(10); // 2 frações
  });

  it('cobra diária com janelas configuradas e sugere troca quando excede', async () => {
    mockSupabaseResponses({
      windows: [
        {
          id: 'window-daily-1',
          rate_id: MOCK_DAILY_ID,
          window_type: 'daily',
          start_time: '08:00',
          end_time: '18:00',
          start_day: 1,
          end_day: 5,
          duration_limit_minutes: null,
          extra_rate_id: null,
          metadata: null,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ],
      relatedRates: [hourlyRate, dailyRate],
      thresholdsData: [
        {
          id: 'threshold-1',
          source_rate_id: MOCK_RATE_ID,
          target_rate_id: MOCK_DAILY_ID,
          threshold_amount: 20,
          auto_apply: false,
          created_at: new Date().toISOString(),
        },
      ],
    });

    const result = await calculateAdvancedPrice(
      {
        entryDate: '2025-02-12',
        entryTime: '08:00',
        vehicleType: MOCK_VEHICLE_TYPE,
      },
      dailyRate,
      '2025-02-12',
      '18:00',
    );

    expect(result.price).toBe(30);
    expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
  });

  it('aplica horas extras após diária quando ultrapassa o fim da janela', async () => {
    mockSupabaseResponses({
      windows: [
        {
          id: 'window-daily-1',
          rate_id: MOCK_DAILY_ID,
          window_type: 'daily',
          start_time: '08:00',
          end_time: '18:00',
          start_day: 1,
          end_day: 5,
          duration_limit_minutes: null,
          extra_rate_id: MOCK_RATE_ID,
          metadata: null,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ],
      relatedRates: [hourlyRate, dailyRate],
      thresholdsData: [],
    });

    const result = await calculateAdvancedPrice(
      {
        entryDate: '2025-02-12',
        entryTime: '08:00',
        vehicleType: MOCK_VEHICLE_TYPE,
      },
      dailyRate,
      '2025-02-12',
      '19:30',
    );

    expect(result.price).toBe(40);
    expect(result.extras).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'daily_extra',
          minutes: 90,
          fractions: 2,
          amount: 10,
        }),
      ]),
    );
  });

  it('aplica pernoite e horas extras após o fim', async () => {
    mockSupabaseResponses({
      windows: [
        {
          id: 'overnight-window',
          rate_id: overnightRate.id,
          window_type: 'overnight',
          start_time: '22:00',
          end_time: '06:00',
          start_day: null,
          end_day: null,
          duration_limit_minutes: null,
          extra_rate_id: MOCK_RATE_ID,
          metadata: null,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ],
      relatedRates: [hourlyRate, overnightRate],
      thresholdsData: [],
    });

    const result = await calculateAdvancedPrice(
      {
        entryDate: '2025-02-12',
        entryTime: '21:30',
        vehicleType: MOCK_VEHICLE_TYPE,
      },
      overnightRate,
      '2025-02-13',
      '07:30',
    );

    expect(result.price).toBe(50);
    expect(result.extras).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'overnight_extra',
          minutes: 90,
          fractions: 2,
          amount: 10,
        }),
      ]),
    );
  });

  it('aplica tarifa semanal e horas extras quando ultrapassa limite', async () => {
    mockSupabaseResponses({
      windows: [
        {
          id: 'weekly-window',
          rate_id: weeklyRate.id,
          window_type: 'weekly',
          start_time: '00:00',
          end_time: '23:59',
          start_day: 1,
          end_day: 7,
          duration_limit_minutes: 7 * 24 * 60,
          extra_rate_id: MOCK_RATE_ID,
          metadata: null,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ],
      relatedRates: [hourlyRate, weeklyRate],
      thresholdsData: [],
    });

    const result = await calculateAdvancedPrice(
      {
        entryDate: '2025-02-01',
        entryTime: '08:00',
        vehicleType: MOCK_VEHICLE_TYPE,
      },
      weeklyRate,
      '2025-02-09',
      '10:00',
    );

    expect(result.price).toBeGreaterThan(150);
    expect(result.extras.some((extra) => extra.type === 'weekly_extra')).toBe(true);
  });
});

