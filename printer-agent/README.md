# Parking Print Agent

Agente local responsável por consumir a fila de impressão do backend (`printer_jobs`) e enviar recibos para a impressora térmica.

## Requisitos

- Node.js 20+
- Impressora térmica compatível com ESC/POS (USB ou rede)
- Backend com ambiente atualizado (variáveis `PRINTER_AGENT_SECRET` e rotas `/printer-agent/*` disponíveis)

## Instalação

```bash
cd printer-agent
npm install
```

### Configuração

Crie um arquivo `.env` dentro de `printer-agent/` com base nos exemplos abaixo:

```
PRINTER_AGENT_API_URL=http://localhost:3000
PRINTER_AGENT_SECRET=coloque-a-mesma-chave-configurada-no-backend
PRINTER_AGENT_ID=estacionamento-caixa-01
PRINTER_AGENT_PROFILE=default
PRINTER_AGENT_CONNECTION_TYPE=mock
PRINTER_AGENT_POLL_INTERVAL=5000
PRINTER_AGENT_JOB_TYPES=manual_receipt,ticket_receipt
PRINTER_AGENT_OUTPUT_DIR=./out
```

Dependendo do tipo de conexão configure também:

```
# USB
PRINTER_AGENT_USB_VENDOR_ID=0x0416
PRINTER_AGENT_USB_PRODUCT_ID=0x5011

# Rede
PRINTER_AGENT_NETWORK_HOST=192.168.0.50
PRINTER_AGENT_NETWORK_PORT=9100
```

## Uso

```bash
npm start        # roda em loop infinito
npx parking-print-agent --once   # processa um job e encerra
```

Opções CLI:

- `--once`: processa apenas um job e encerra (útil para depuração).
- `--interval <ms>`: sobrescreve o intervalo de polling padrão (5000ms).
- `--log-level`: `fatal`, `error`, `warn`, `info`, `debug` (padrão `info`).

## Modos de impressão suportados

- `mock` (padrão): imprime no console.
- `file`: salva o recibo em `PRINTER_AGENT_OUTPUT_DIR`.
- `usb`: exige VendorID/ProductID e dependências `@node-escpos/core` + `@node-escpos/usb`.
- `network`: utiliza IP/porta (`@node-escpos/core` + `@node-escpos/network`).

## Fluxo de funcionamento

1. Frontend cria jobs com `api.enqueuePrinterJob`.
2. Backend registra em `printer_jobs` e snapshots de configuração.
3. Print Agent consulta `/printer-agent/claim`, marca como `printing`, executa os comandos ESC/POS e marca como `complete` (ou `fail` com re-tentativa).

Consulte os logs do agente para analisar qualquer falha (sem papel, impressora offline, etc.).

