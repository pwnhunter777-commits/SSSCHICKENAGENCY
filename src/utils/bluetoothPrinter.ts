import { toCanvas } from 'html-to-image';
import { Bill, ShopSettings } from '../types';

export interface BluetoothPrintResult {
  success: boolean;
  message: string;
  deviceName?: string;
}

// Convert HTML element to ESC/POS raster bitmap commands (100% digital match)
export async function generateRasterEscPosFromElement(
  elementId: string,
  targetWidthDots: number = 576
): Promise<Uint8Array | null> {
  const element = document.getElementById(elementId);
  if (!element) return null;

  try {
    // 1. Render DOM element to high-res Canvas
    const originalCanvas = await toCanvas(element, {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      skipAutoScale: true,
      style: {
        transform: 'none',
        margin: '0',
        borderRadius: '0',
      },
    });

    // 2. Scale to printer dot width (standard 576 dots for 80mm/17cm, or 800 for wide POS)
    const scale = targetWidthDots / originalCanvas.width;
    const targetHeight = Math.round(originalCanvas.height * scale);

    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = targetWidthDots;
    scaledCanvas.height = targetHeight;

    const ctx = scaledCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    // Fill pure white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidthDots, targetHeight);

    // Draw scaled image with crisp rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(originalCanvas, 0, 0, targetWidthDots, targetHeight);

    const imgData = ctx.getImageData(0, 0, targetWidthDots, targetHeight);
    const pixels = imgData.data;

    const widthBytes = Math.ceil(targetWidthDots / 8);
    const totalHeight = targetHeight;

    // 3. Construct ESC/POS Commands
    const commands: number[] = [];

    // Initialize printer
    commands.push(0x1b, 0x40);

    // Center alignment
    commands.push(0x1b, 0x61, 0x01);

    // Print in bands of max 128 rows to prevent printer buffer overflow
    const maxBandHeight = 128;
    for (let startY = 0; startY < totalHeight; startY += maxBandHeight) {
      const currentBandHeight = Math.min(maxBandHeight, totalHeight - startY);

      // GS v 0 m xL xH yL yH
      commands.push(0x1d, 0x76, 0x30, 0x00);
      commands.push(widthBytes & 0xff);
      commands.push((widthBytes >> 8) & 0xff);
      commands.push(currentBandHeight & 0xff);
      commands.push((currentBandHeight >> 8) & 0xff);

      for (let y = startY; y < startY + currentBandHeight; y++) {
        for (let byteX = 0; byteX < widthBytes; byteX++) {
          let byteVal = 0;
          for (let bit = 0; bit < 8; bit++) {
            const pixelX = byteX * 8 + bit;
            if (pixelX < targetWidthDots) {
              const idx = (y * targetWidthDots + pixelX) * 4;
              const r = pixels[idx];
              const g = pixels[idx + 1];
              const b = pixels[idx + 2];
              const a = pixels[idx + 3];

              // High contrast luminance check
              const luminance = a < 128 ? 255 : 0.299 * r + 0.587 * g + 0.114 * b;
              // If dark enough -> black dot (1)
              if (luminance < 175) {
                byteVal |= 0x80 >> bit;
              }
            }
          }
          commands.push(byteVal);
        }
      }
    }

    // Feed lines & cut
    commands.push(0x1b, 0x64, 0x04); // Feed 4 lines
    commands.push(0x1d, 0x56, 0x42, 0x00); // Partial cut

    return new Uint8Array(commands);
  } catch (err) {
    console.error('Error generating raster ESC/POS bitmap:', err);
    return null;
  }
}

// Clean text generator for fallback ESC/POS text mode (sanitizes Tamil to readable English labels)
export function sanitizeForPrinter(text: string): string {
  if (!text) return '';
  // Replace Tamil names if known or strip non-ASCII safely
  return text
    .replace(/[^\x20-\x7E\n]/g, '')
    .trim();
}

// Generate formatted plain text receipt for printing or preview
export function generateReceiptText(bill: Bill, settings: ShopSettings): string {
  const line = '--------------------------------';
  const dLine = '================================';

  let receipt = '';
  receipt += `${(settings.shopName || 'SSS CHICKEN AGENCY').toUpperCase()}\n`;
  if (settings.address) receipt += `${settings.address}\n`;
  if (settings.phoneNumber) receipt += `Ph: ${settings.phoneNumber}\n`;
  if (settings.gstNumber) receipt += `GST: ${settings.gstNumber}\n`;
  receipt += `${dLine}\n`;
  receipt += `Bill No: #${bill.billNumber}\n`;
  receipt += `Date: ${bill.date}\n`;
  receipt += `Hotel: ${bill.hotelName}\n`;
  receipt += `${line}\n`;
  receipt += `ITEM              KG   RATE  AMT\n`;
  receipt += `${line}\n`;

  bill.items.forEach((item) => {
    const name = item.productName.substring(0, 14).padEnd(14, ' ');
    const kg = item.kg.toFixed(2).padStart(5, ' ');
    const rate = Math.round(item.pricePerKg).toString().padStart(4, ' ');
    const amt = Math.round(item.amount).toString().padStart(6, ' ');
    receipt += `${name} ${kg} ${rate} ${amt}\n`;
  });

  receipt += `${line}\n`;
  receipt += `TOTAL KG:     ${bill.totalKg.toFixed(2)} KG\n`;
  receipt += `CURRENT BILL: Rs. ${Math.round(bill.totalAmount).toLocaleString('en-IN')}/-\n`;
  if (bill.previousBalance !== undefined && bill.previousBalance !== 0) {
    receipt += `OLD BALANCE:  Rs. ${Math.round(bill.previousBalance).toLocaleString('en-IN')}/-\n`;
    const netTotal = bill.netTotalWithBalance ?? bill.totalAmount + bill.previousBalance;
    receipt += `--------------------------------\n`;
    receipt += `   TOTAL DUE: Rs. ${Math.round(netTotal).toLocaleString('en-IN')}/-\n`;
  } else {
    receipt += `--------------------------------\n`;
    receipt += `  GRAND TOTAL: Rs. ${Math.round(bill.totalAmount).toLocaleString('en-IN')}/-\n`;
  }
  receipt += `${dLine}\n`;

  if (settings.upiId) {
    receipt += `UPI ID: ${settings.upiId}\n`;
  }
  receipt += `Thank you! Visit Again\n\n\n`;

  return receipt;
}

// ESC/POS command generator for text mode fallback
export function generateEscPosCommands(bill: Bill, settings: ShopSettings): Uint8Array {
  const encoder = new TextEncoder();
  const bytes: number[] = [];

  // Initialize printer
  bytes.push(0x1b, 0x40);

  // Center align
  bytes.push(0x1b, 0x61, 0x01);

  // Bold & Double height for Shop Name
  bytes.push(0x1b, 0x45, 0x01); // Bold ON
  bytes.push(0x1d, 0x21, 0x11); // Double width & height
  bytes.push(...encoder.encode(`${settings.shopName || 'SSS CHICKEN AGENCY'}\n`));
  bytes.push(0x1d, 0x21, 0x00); // Normal size
  bytes.push(0x1b, 0x45, 0x00); // Bold OFF

  if (settings.address) {
    bytes.push(...encoder.encode(`${settings.address}\n`));
  }
  if (settings.phoneNumber) {
    bytes.push(...encoder.encode(`Ph: ${settings.phoneNumber}\n`));
  }
  if (settings.gstNumber) {
    bytes.push(...encoder.encode(`GST: ${settings.gstNumber}\n`));
  }

  // Left align
  bytes.push(0x1b, 0x61, 0x00);
  bytes.push(...encoder.encode('--------------------------------\n'));
  bytes.push(...encoder.encode(`Bill No : #${bill.billNumber}\n`));
  bytes.push(...encoder.encode(`Date    : ${bill.date}\n`));
  bytes.push(...encoder.encode(`Hotel   : ${bill.hotelName}\n`));
  bytes.push(...encoder.encode('--------------------------------\n'));
  bytes.push(...encoder.encode('ITEM           KG   RATE   AMT\n'));
  bytes.push(...encoder.encode('--------------------------------\n'));

  bill.items.forEach((item) => {
    const cleanName = item.productName.substring(0, 13).padEnd(13, ' ');
    const kg = item.kg.toFixed(2).padStart(5, ' ');
    const rate = Math.round(item.pricePerKg).toString().padStart(4, ' ');
    const amt = Math.round(item.amount).toString().padStart(6, ' ');
    bytes.push(...encoder.encode(`${cleanName} ${kg} ${rate} ${amt}\n`));
  });

  bytes.push(...encoder.encode('--------------------------------\n'));
  bytes.push(0x1b, 0x45, 0x01); // Bold ON
  bytes.push(...encoder.encode(`TOTAL KG     : ${bill.totalKg.toFixed(2)} KG\n`));
  bytes.push(...encoder.encode(`CURRENT BILL : Rs. ${Math.round(bill.totalAmount)}/-\n`));
  if (bill.previousBalance !== undefined && bill.previousBalance !== 0) {
    bytes.push(...encoder.encode(`OLD BALANCE  : Rs. ${Math.round(bill.previousBalance)}/-\n`));
  }
  bytes.push(0x1b, 0x45, 0x00); // Bold OFF
  bytes.push(...encoder.encode('--------------------------------\n'));

  // Center align & Big Double Size for Total Price
  bytes.push(0x1b, 0x61, 0x01); // Center align
  bytes.push(0x1b, 0x45, 0x01); // Bold ON
  if (bill.previousBalance !== undefined && bill.previousBalance !== 0) {
    const netTotal = bill.netTotalWithBalance ?? bill.totalAmount + bill.previousBalance;
    bytes.push(...encoder.encode('TOTAL DUE:\n'));
    bytes.push(0x1d, 0x21, 0x11); // Double width & height
    bytes.push(...encoder.encode(`Rs. ${Math.round(netTotal)}/-\n`));
  } else {
    bytes.push(...encoder.encode('GRAND TOTAL:\n'));
    bytes.push(0x1d, 0x21, 0x11); // Double width & height
    bytes.push(...encoder.encode(`Rs. ${Math.round(bill.totalAmount)}/-\n`));
  }
  bytes.push(0x1d, 0x21, 0x00); // Normal size
  bytes.push(0x1b, 0x45, 0x00); // Bold OFF
  bytes.push(...encoder.encode('================================\n'));

  // Center align footer
  bytes.push(0x1b, 0x61, 0x01);
  if (settings.upiId) {
    bytes.push(...encoder.encode(`UPI: ${settings.upiId}\n`));
  }
  bytes.push(...encoder.encode('Thank You! Visit Again\n\n\n\n'));

  // Cut paper (GS V 66 0)
  bytes.push(0x1d, 0x56, 0x42, 0x00);

  return new Uint8Array(bytes);
}

// Print via Web Bluetooth with High-Quality Digital Raster Mode (or text fallback)
export async function printViaBluetooth(
  bill: Bill,
  settings: ShopSettings,
  elementId: string = 'printable-thermal-receipt',
  forceTextMode: boolean = false
): Promise<BluetoothPrintResult> {
  const nav = navigator as any;
  if (!nav.bluetooth) {
    return {
      success: false,
      message: 'Bluetooth API is not available on this browser. Please use the Print Receipt option.',
    };
  }

  try {
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // standard thermal printer service
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC
        '0000e0ff-0000-1000-8000-00805f9b34fb',
        '0000ff00-0000-1000-8000-00805f9b34fb',
      ],
    });

    if (!device.gatt) {
      return {
        success: false,
        message: 'Could not connect to printer GATT server.',
      };
    }

    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();

    let writeCharacteristic: any = null;

    for (const service of services) {
      try {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writeCharacteristic = char;
            break;
          }
        }
      } catch (e) {
        // continue
      }
      if (writeCharacteristic) break;
    }

    if (!writeCharacteristic) {
      return {
        success: false,
        message: 'Connected to printer, but write characteristic was not found.',
      };
    }

    let data: Uint8Array | null = null;

    // 1. First try Digital Raster Mode (prints exact digital receipt with Logo, Tamil/English, QR Code & clean layout)
    if (!forceTextMode && document.getElementById(elementId)) {
      // 576 dots is universal standard across 80mm & wide thermal printers
      data = await generateRasterEscPosFromElement(elementId, 576);
    }

    // 2. Fallback to ESC/POS text mode if raster rendering fails
    if (!data) {
      data = generateEscPosCommands(bill, settings);
    }

    // Send in chunks of 512 bytes with small pause for Bluetooth throughput
    const chunkSize = 512;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      if (writeCharacteristic.writeValueWithoutResponse) {
        await writeCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await writeCharacteristic.writeValue(chunk);
      }
      // Small 15ms buffer delay between large chunks
      if (data.length > 2048) {
        await new Promise((r) => setTimeout(r, 15));
      }
    }

    return {
      success: true,
      message: `Successfully printed to ${device.name || 'Bluetooth Printer'}!`,
      deviceName: device.name || 'Bluetooth Printer',
    };
  } catch (error: any) {
    if (error.name === 'NotFoundError' || error.message?.includes('cancelled')) {
      return {
        success: false,
        message: 'Bluetooth printer selection cancelled.',
      };
    }
    return {
      success: false,
      message: `Bluetooth printing failed: ${error.message || 'Unknown error'}`,
    };
  }
}
