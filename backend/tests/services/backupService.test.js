import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const manualDir = path.resolve(__dirname, '../../backups/manual');

const backupService = await import('../../src/services/backupService.js');

describe('backupService.getBackupPath', () => {
  const testFileName = `test-backup-${Date.now()}.json`;
  const testFilePath = path.join(manualDir, testFileName);

  beforeAll(() => {
    fs.mkdirSync(manualDir, { recursive: true });
  });

  beforeEach(() => {
    fs.writeFileSync(testFilePath, JSON.stringify({ ok: true }), 'utf-8');
  });

  afterEach(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  it('retorna caminho válido para arquivos existentes dentro do diretório', () => {
    const result = backupService.getBackupPath(testFileName);
    expect(result).toBe(path.resolve(testFilePath));
  });

  it('bloqueia tentativas de path traversal', () => {
    const result = backupService.getBackupPath(`../${testFileName}`);
    expect(result).toBeNull();
  });

  it('rejeita extensões não permitidas', () => {
    const result = backupService.getBackupPath('arquivo.txt');
    expect(result).toBeNull();
  });
});

