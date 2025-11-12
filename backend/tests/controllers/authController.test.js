import { jest } from '@jest/globals';

const queryBuilderMock = {
  select: jest.fn(() => queryBuilderMock),
  eq: jest.fn(() => queryBuilderMock),
  maybeSingle: jest.fn()
};

const supabaseMock = {
  from: jest.fn(() => queryBuilderMock)
};

const bcryptMock = {
  compare: jest.fn()
};

const securityMocks = {
  logLoginAttempt: jest.fn(() => Promise.resolve()),
  getFailedAttempts: jest.fn(() => Promise.resolve(0)),
  checkAccountLock: jest.fn(() => Promise.resolve({ isLocked: false, lockedUntil: null })),
  lockAccount: jest.fn(() => Promise.resolve()),
  updateLastLogin: jest.fn(() => Promise.resolve()),
  isPasswordExpired: jest.fn(() => false),
  validatePassword: jest.fn(() => ({ valid: true, errors: [], strength: 4, feedback: {} })),
  isPasswordReused: jest.fn(() => Promise.resolve(false)),
  cleanupOldLoginAttempts: jest.fn(() => Promise.resolve()),
  unlockAccount: jest.fn(() => Promise.resolve())
};

jest.unstable_mockModule('../../src/config/supabase.js', () => ({
  supabase: supabaseMock
}));

jest.unstable_mockModule('../../src/services/securityService.js', () => securityMocks);
jest.unstable_mockModule('bcryptjs', () => ({ default: bcryptMock }));

const authController = (await import('../../src/controllers/authController.js')).default;

const createResponse = () => {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(),
    header: jest.fn(),
    headersSent: false
  };
  return res;
};

describe('authController.login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryBuilderMock.select.mockReturnValue(queryBuilderMock);
    queryBuilderMock.eq.mockReturnValue(queryBuilderMock);
    queryBuilderMock.maybeSingle.mockReset();
    queryBuilderMock.maybeSingle.mockResolvedValue({ data: null, error: null });
    bcryptMock.compare.mockReset();
    bcryptMock.compare.mockResolvedValue(false);
    securityMocks.getFailedAttempts.mockReset();
    securityMocks.getFailedAttempts.mockResolvedValue(0);
    securityMocks.isPasswordExpired.mockReturnValue(false);
    process.env.JWT_SECRET = 'test-secret';
  });

  it('retorna 401 quando usuário não existe', async () => {
    const req = {
      body: { login: 'usuario', password: 'senha' },
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      headers: { 'user-agent': 'jest' }
    };
    const res = createResponse();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Credenciais inválidas'
    }));
    expect(securityMocks.logLoginAttempt).toHaveBeenCalledWith(expect.objectContaining({
      login: 'usuario',
      success: false,
      failureReason: 'User not found'
    }));
  });

  it('retorna token quando credenciais válidas', async () => {
    const userRecord = {
      id: 'user-1',
      name: 'User Test',
      email: 'user@test.com',
      login: 'usuario',
      role: 'operator',
      permissions: { viewReports: true },
      password_hash: 'hashed',
      must_change_password: false,
      is_first_login: false
    };

    queryBuilderMock.maybeSingle.mockResolvedValueOnce({ data: userRecord, error: null });
    bcryptMock.compare.mockResolvedValueOnce(true);

    const req = {
      body: { login: 'usuario', password: 'senhaSegura123!' },
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      headers: { 'user-agent': 'jest' }
    };
    const res = createResponse();

    await authController.login(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      token: expect.any(String),
      user: expect.objectContaining({
        id: 'user-1',
        login: 'usuario'
      })
    }));
    expect(securityMocks.logLoginAttempt).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(securityMocks.updateLastLogin).toHaveBeenCalledWith('user-1', '127.0.0.1');
  });

  it('retorna 401 quando senha é inválida', async () => {
    const userRecord = {
      id: 'user-1',
      name: 'User Test',
      email: 'user@test.com',
      login: 'usuario',
      role: 'operator',
      permissions: {},
      password_hash: 'hashed'
    };

    queryBuilderMock.maybeSingle.mockResolvedValueOnce({ data: userRecord, error: null });
    bcryptMock.compare.mockResolvedValueOnce(false);
    securityMocks.getFailedAttempts.mockResolvedValueOnce(0);

    const req = {
      body: { login: 'usuario', password: 'senhaErrada' },
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      headers: { 'user-agent': 'jest' }
    };
    const res = createResponse();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('Credenciais inválidas')
    }));
    expect(securityMocks.logLoginAttempt).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      failureReason: 'Invalid password'
    }));
  });
});

