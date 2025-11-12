export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const parseHexOrDecimal = (value) => {
  if (value === undefined || value === null) return undefined;
  const trimmed = value.toString().trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.startsWith('0x') || trimmed.startsWith('0X') ? trimmed.slice(2) : trimmed;
  const parsed = Number.parseInt(normalized, trimmed.startsWith('0x') || trimmed.startsWith('0X') ? 16 : 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const ensureDirectory = async (fs, dirPath) => {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
};

