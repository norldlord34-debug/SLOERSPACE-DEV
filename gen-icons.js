const path = require('path');
const fs = require('fs');

const src = path.join(__dirname, 'LOGO.png');
const iconsDir = path.join(__dirname, 'src-tauri', 'icons');

if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

const buf = fs.readFileSync(src);

// Copy PNG icons
['32x32.png', '128x128.png', '128x128@2x.png', 'icon.png'].forEach(name => {
  fs.writeFileSync(path.join(iconsDir, name), buf);
  console.log(`LOGO.png -> ${name}`);
});

// Generate a valid ICO file wrapping the PNG data
// ICO format: ICONDIR header + ICONDIRENTRY + PNG data
function createIco(pngBuf) {
  const numImages = 1;
  const headerSize = 6;
  const entrySize = 16;
  const dataOffset = headerSize + (entrySize * numImages);
  const totalSize = dataOffset + pngBuf.length;

  const ico = Buffer.alloc(totalSize);

  // ICONDIR header
  ico.writeUInt16LE(0, 0);       // reserved
  ico.writeUInt16LE(1, 2);       // type: 1 = ICO
  ico.writeUInt16LE(numImages, 4); // number of images

  // ICONDIRENTRY (PNG-in-ICO: width/height 0 = 256+)
  ico.writeUInt8(0, 6);          // width (0 = 256)
  ico.writeUInt8(0, 7);          // height (0 = 256)
  ico.writeUInt8(0, 8);          // color palette
  ico.writeUInt8(0, 9);          // reserved
  ico.writeUInt16LE(1, 10);      // color planes
  ico.writeUInt16LE(32, 12);     // bits per pixel
  ico.writeUInt32LE(pngBuf.length, 14); // image data size
  ico.writeUInt32LE(dataOffset, 18);    // offset to image data

  // Copy PNG data
  pngBuf.copy(ico, dataOffset);

  return ico;
}

const ico = createIco(buf);
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), ico);
console.log('LOGO.png -> icon.ico (valid ICO wrapper)');

console.log('Done - all icon files generated from LOGO.png');
