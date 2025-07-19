/**
 * zstd_native Node.js addon
 * Created: 2025-07-19
 * Author: kzolti (Zoltan Istvan KADA)
 */

const addon = require('./build/Release/zstd_native.node');

/**
 * Compress data using zstd
 * @param {Buffer} buffer - Data to compress
 * @param {number} [level=3] - Compression level (1-22)
 * @returns {Promise<Buffer>} Compressed data
 * @throws {Error} If input is not a Buffer or compression fails
 */
function zstdCompress(buffer, level) {
    return new Promise((resolve, reject) => {
        try {
            const result = addon.zstdCompress(buffer, level);
            resolve(result);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Decompress zstd compressed data
 * @param {Buffer} buffer - Compressed data to decompress
 * @returns {Promise<Buffer>} Decompressed data
 * @throws {Error} If input is not a Buffer or decompression fails
 */
function zstdDecompress(buffer) {
    return new Promise((resolve, reject) => {
        try {
            const result = addon.zstdDecompress(buffer);
            resolve(result);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Set maximum allowed input size
 * @param {number} size - Maximum size in bytes
 * @throws {Error} If size is not a number
 */
function setMaxInputSize(size) {
    addon.setMaxInputSize(size);
}

/**
 * Set maximum allowed output size
 * @param {number} size - Maximum size in bytes
 * @throws {Error} If size is not a number
 */
function setMaxOutputSize(size) {
    addon.setMaxOutputSize(size);
}

module.exports = {
    zstdCompress,
    zstdDecompress,
    setMaxInputSize,
    setMaxOutputSize,
    getLimits: addon.getLimits,
    MIN_LEVEL: addon.MIN_LEVEL,
    MAX_LEVEL: addon.MAX_LEVEL,
    DEFAULT_LEVEL: addon.DEFAULT_LEVEL
};