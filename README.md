# zstd_native
A native Node.js addon for high-performance compression and decompression using [zstd](https://facebook.github.io/zstd/) via [N-API](https://nodejs.org/api/n-api.html)

## Features

- Fast zstd compression/decompression
- Adjustable compression levels (1-22)
- Configurable size limits (default 2GB)
- Promise-based API

## Installation

```bash
npm install zstd-native
```

> Requires `zstd` library and build tools

## Usage

```javascript
const { zstdCompress, zstdDecompress } = require('zstd-native');

(async () => {
  const input = Buffer.from('Hello zstd!');
  const compressed = await zstdCompress(input);
  const decompressed = await zstdDecompress(compressed);
  console.log(decompressed.toString()); // "Hello zstd!"
})();
```

## API

### `zstdCompress(buffer, [level])`
- `buffer`: Input Buffer to compress
- `level`: Compression level (1-22, default=3)
- Returns: Promise resolving to compressed Buffer

### `zstdDecompress(buffer)`
- `buffer`: Compressed Buffer to decompress
- Returns: Promise resolving to decompressed Buffer

### `setMaxInputSize(size)`
- Set max input size in bytes (default=2GB)

### `setMaxOutputSize(size)`
- Set max output size in bytes (default=2GB)

## Error Handling

```javascript
try {
  const compressed = await zstdCompress(largeBuffer);
} catch (error) {
  if (error.message.includes('exceeds maximum')) {
    console.error('Size limit exceeded');
  }
}
```

## Requirements
- Node.js 14+
- zstd library (`libzstd-dev` on Ubuntu/Debian, `zstd` on Arch, `brew install zstd` on macOS)

## License
MIT