import { jest } from '@jest/globals';

const queueState = {
  data: [],
  error: null,
  updates: []
};

const logState = {
  inserts: []
};

const integrationConfigState = {
  data: {
    config: {
      host: 'smtp.test',
      port: 587,
      secure: false,
      from_email: 'no-reply@test.com',
      from_name: 'Test Sender'
    },
    credentials: {
      user: 'smtp-user',
      pass: 'smtp-pass'
    },
    is_enabled: true
  },
  error: null
};

const nodemailerState = {
  shouldThrow: false
};

const transportMock = {
  sendMail: jest.fn()
};

const createTransportMock = jest.fn(() => transportMock);

const createQueueBuilder = () => {
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    lte: jest.fn(() => builder),
    limit: jest.fn(() => Promise.resolve({ data: queueState.data, error: queueState.error })),
    update: jest.fn((payload) => ({
      eq: jest.fn((_field, value) => {
        queueState.updates.push({ id: value, payload });
        return Promise.resolve({ data: null, error: null });
      })
    }))
  };
  return builder;
};

const createLogsBuilder = () => ({
  insert: jest.fn((payload) => {
    logState.inserts.push(payload);
    return Promise.resolve({ data: null, error: null });
  })
});

const createIntegrationBuilder = () => {
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    single: jest.fn(() => Promise.resolve({
      data: integrationConfigState.data,
      error: integrationConfigState.error
    }))
  };
  return builder;
};

const supabaseMock = {
  from: jest.fn()
};

jest.unstable_mockModule('../../src/config/supabase.js', () => ({
  supabase: supabaseMock
}));

jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport: createTransportMock
  }
}));

const notificationService = await import('../../src/services/notificationService.js');

describe('notificationService.processNotificationQueue', () => {
  beforeEach(() => {
    queueState.data = [];
    queueState.error = null;
    queueState.updates = [];
    logState.inserts = [];
    integrationConfigState.data = {
      config: {
        host: 'smtp.test',
        port: 587,
        secure: false,
        from_email: 'no-reply@test.com',
        from_name: 'Test Sender'
      },
      credentials: {
        user: 'smtp-user',
        pass: 'smtp-pass'
      },
      is_enabled: true
    };
    integrationConfigState.error = null;

    nodemailerState.shouldThrow = false;
    createTransportMock.mockClear();
    transportMock.sendMail.mockReset();
    transportMock.sendMail.mockImplementation(() => {
      if (nodemailerState.shouldThrow) {
        return Promise.reject(new Error('SMTP error'));
      }
      return Promise.resolve({ messageId: 'msg-123' });
    });

    supabaseMock.from.mockImplementation((table) => {
      if (table === 'notification_queue') {
        return createQueueBuilder();
      }
      if (table === 'notification_logs') {
        return createLogsBuilder();
      }
      if (table === 'integration_configs') {
        return createIntegrationBuilder();
      }
      return {
        select: jest.fn(() => Promise.resolve({ data: null, error: null })),
        insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
        update: jest.fn(() => Promise.resolve({ data: null, error: null })),
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
        single: jest.fn(() => Promise.resolve({ data: null, error: null }))
      };
    });
  });

  it('retorna zero quando fila vazia', async () => {
    queueState.data = [];

    const result = await notificationService.processNotificationQueue();

    expect(result).toEqual({ processed: 0, succeeded: 0, failed: 0 });
    expect(queueState.updates).toHaveLength(0);
  });

  it('processa notificação de email com sucesso', async () => {
    queueState.data = [{
      id: 'notif-1',
      notification_type: 'email',
      recipient: 'user@example.com',
      subject: 'Teste',
      message: '<p>Olá</p>',
      template_name: null,
      template_data: null,
      retry_count: 0,
      max_retries: 3,
      scheduled_for: new Date().toISOString()
    }];

    const result = await notificationService.processNotificationQueue();

    expect(result).toEqual({ processed: 1, succeeded: 1, failed: 0 });
    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'smtp.test',
      port: 587,
      secure: false,
      auth: { user: 'smtp-user', pass: 'smtp-pass' }
    });
    expect(transportMock.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'user@example.com',
      html: '<p>Olá</p>'
    }));
    expect(queueState.updates).toEqual([
      expect.objectContaining({
        id: 'notif-1',
        payload: expect.objectContaining({ status: 'processing' })
      }),
      expect.objectContaining({
        id: 'notif-1',
        payload: expect.objectContaining({ status: 'sent' })
      })
    ]);
    expect(logState.inserts.length).toBeGreaterThan(0);
  });

  it('incrementa falhas quando envio dispara erro', async () => {
    queueState.data = [{
      id: 'notif-2',
      notification_type: 'email',
      recipient: 'user@example.com',
      subject: 'Teste',
      message: '<p>Olá</p>',
      template_name: null,
      template_data: null,
      retry_count: 1,
      max_retries: 2,
      scheduled_for: new Date().toISOString()
    }];

    nodemailerState.shouldThrow = true;

    const result = await notificationService.processNotificationQueue();

    expect(result).toEqual({ processed: 1, succeeded: 0, failed: 1 });
    expect(transportMock.sendMail).toHaveBeenCalled();
    expect(queueState.updates).toEqual([
      expect.objectContaining({ payload: expect.objectContaining({ status: 'processing' }) }),
      expect.objectContaining({
        payload: expect.objectContaining({
          status: 'failed',
          retry_count: 2
        })
      })
    ]);
    expect(logState.inserts.length).toBeGreaterThan(0);
  });
});

