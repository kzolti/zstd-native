/**
 * zstd_native type definitions
 * Created: 2025-07-19
 * Updated: 2025-07-20
 * Author: kzolti (Zoltan Istvan KADA)
 */

/// <reference types="node" />

/**
 * Compress data using zstd
 * @param buffer - Data to compress (must be a Buffer)
 * @param level - Compression level (1-22), default: 3
 * @returns Promise with compressed Buffer
 * @throws {Error} If input is not a Buffer or compression fails
 * @throws {Error} If input size exceeds maximum allowed size
 * @throws {Error} If output would exceed maximum allowed size
 */
export function compress(buffer: Buffer, level?: number): Promise<Buffer>;

/**
 * Decompress zstd compressed data
 * @param buffer - Compressed data to decompress (must be a Buffer)
 * @returns Promise with decompressed Buffer
 * @throws {Error} If input is not a Buffer or decompression fails
 * @throws {Error} If input size exceeds maximum allowed size
 * @throws {Error} If decompressed size would exceed maximum allowed size
 * @throws {Error} If compressed data is invalid or size unknown
 */
export function decompress(buffer: Buffer): Promise<Buffer>;

/**
 * Set maximum allowed input size
 * @param size - Maximum size in bytes (default: 2GB)
 * @throws {Error} If size is negative or too large
 */
export function setMaxInputSize(size: number): void;

/**
 * Set maximum allowed output size
 * @param size - Maximum size in bytes (default: 2GB)
 * @throws {Error} If size is negative or too large
 */
export function setMaxOutputSize(size: number): void;

/**
 * Get current size limits
 * @returns Object with maxInputSize and maxOutputSize properties
 */
export function getLimits(): {
    maxInputSize: number;
    maxOutputSize: number;
};

/**
 * Minimum supported compression level
 */
export const MIN_LEVEL: number;

/**
 * Maximum supported compression level
 */
export const MAX_LEVEL: number;

/**
 * Default compression level
 */
export const DEFAULT_LEVEL: number;