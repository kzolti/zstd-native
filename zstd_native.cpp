/**
 * zstd_native.cc
 * Native Node.js addon for zstd compression using N-API
 * Created: 2025-07-19
 * Author: kzolti (Zoltan Istvan KADA)
 */

#include <napi.h>
#include <zstd.h>
#include <vector>
#include <stdexcept>
#include <cstdint>
#include <mutex>

namespace {
    // Constants for compression
    constexpr int DEFAULT_LEVEL = 3;
    constexpr int MIN_LEVEL = 1;
    constexpr int MAX_LEVEL = 22;
    
    // Default size limits (2GB)
    constexpr size_t DEFAULT_MAX_INPUT_SIZE = 1ULL << 31;
    constexpr size_t DEFAULT_MAX_OUTPUT_SIZE = 1ULL << 31;

    // Configurable size limits with thread-safe access
    std::mutex g_size_mutex;
    size_t g_max_input_size = DEFAULT_MAX_INPUT_SIZE;
    size_t g_max_output_size = DEFAULT_MAX_OUTPUT_SIZE;

    inline int validateLevel(int level) {
        if (level < MIN_LEVEL || level > MAX_LEVEL) {
            throw std::runtime_error("Compression level must be between " + 
                                   std::to_string(MIN_LEVEL) + " and " + 
                                   std::to_string(MAX_LEVEL));
        }
        return level;
    }
    
    inline void validateSize(size_t size, size_t limit, const std::string& context) {
        if (size > limit) {
            throw std::runtime_error(context + " size " + std::to_string(size) + 
                                    " exceeds maximum allowed size " + 
                                    std::to_string(limit));
        }
    }

    inline size_t safeConvertToSizeT(int64_t value, const std::string& context) {
        if (value < 0) {
            throw std::runtime_error(context + " cannot be negative");
        }
        if (static_cast<uint64_t>(value) > SIZE_MAX) {
            throw std::runtime_error(context + " is too large");
        }
        return static_cast<size_t>(value);
    }
}

// Config setter functions
Napi::Value SetMaxInputSize(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Expected a number argument").ThrowAsJavaScriptException();
        return env.Null();
    }

    try {
        const int64_t value = info[0].As<Napi::Number>().Int64Value();
        const size_t new_size = safeConvertToSizeT(value, "Input size limit");
        
        std::lock_guard<std::mutex> lock(g_size_mutex);
        g_max_input_size = new_size;
        return env.Undefined();
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value SetMaxOutputSize(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Expected a number argument").ThrowAsJavaScriptException();
        return env.Null();
    }

    try {
        const int64_t value = info[0].As<Napi::Number>().Int64Value();
        const size_t new_size = safeConvertToSizeT(value, "Output size limit");
        
        std::lock_guard<std::mutex> lock(g_size_mutex);
        g_max_output_size = new_size;
        return env.Undefined();
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value GetLimits(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    std::lock_guard<std::mutex> lock(g_size_mutex);
    
    auto result = Napi::Object::New(env);
    result.Set("maxInputSize", Napi::Number::New(env, static_cast<double>(g_max_input_size)));
    result.Set("maxOutputSize", Napi::Number::New(env, static_cast<double>(g_max_output_size)));
    return result;
}

Napi::Value Compress(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    try {
        // Validate input
        if (info.Length() < 1 || !info[0].IsBuffer()) {
            throw std::runtime_error("First argument must be a Buffer");
        }

        // Get compression level
        const int level = info.Length() > 1 && info[1].IsNumber() ?
            validateLevel(info[1].As<Napi::Number>().Int32Value()) :
            DEFAULT_LEVEL;
            
        // Get input buffer
        auto input = info[0].As<Napi::Buffer<uint8_t>>();
        const size_t srcSize = input.Length();
        
        // Check input size
        {
            std::lock_guard<std::mutex> lock(g_size_mutex);
            validateSize(srcSize, g_max_input_size, "Input");
        }

        // Fast path for empty input
        if (srcSize == 0) {
            return Napi::Buffer<uint8_t>::Copy(env, nullptr, 0);
        }

        const size_t bound = ZSTD_compressBound(srcSize);
        
        // Check output size
        {
            std::lock_guard<std::mutex> lock(g_size_mutex);
            validateSize(bound, g_max_output_size, "Output");
        }

        std::vector<uint8_t> out(bound);

        const size_t compSize = ZSTD_compress(
            out.data(),
            bound,
            input.Data(),
            srcSize,
            level
        );

        // Check for compression errors
        if (ZSTD_isError(compSize)) {
            throw std::runtime_error(std::string("Compression failed: ") + ZSTD_getErrorName(compSize));
        }

        // Return compressed buffer
        return Napi::Buffer<uint8_t>::Copy(env, out.data(), compSize);
    }
    catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value Decompress(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    try {
        // Validate input
        if (info.Length() < 1 || !info[0].IsBuffer()) {
            throw std::runtime_error("First argument must be a Buffer");
        }

        // Get input buffer
        auto input = info[0].As<Napi::Buffer<uint8_t>>();
        const size_t srcSize = input.Length();

        // Check input size
        {
            std::lock_guard<std::mutex> lock(g_size_mutex);
            validateSize(srcSize, g_max_input_size, "Input");
        }

        if (srcSize == 0) {
            return Napi::Buffer<uint8_t>::Copy(env, nullptr, 0);
        }

        const unsigned long long decompressedSize = ZSTD_getFrameContentSize(input.Data(), srcSize);
        
        // Check for decompression size errors
        if (ZSTD_isError(decompressedSize)) {
            throw std::runtime_error(std::string("Invalid compressed data: ") + 
                                   ZSTD_getErrorName(decompressedSize));
        }
        
        if (decompressedSize == ZSTD_CONTENTSIZE_UNKNOWN) {
            throw std::runtime_error("Cannot decompress: Size unknown (streaming not supported)");
        }

        // Check decompressed size
        {
            std::lock_guard<std::mutex> lock(g_size_mutex);
            validateSize(decompressedSize, g_max_output_size, "Output");
        }

        std::vector<uint8_t> out(decompressedSize);
        const size_t result = ZSTD_decompress(
            out.data(),
            decompressedSize,
            input.Data(),
            srcSize
        );

        // Check for decompression errors
        if (ZSTD_isError(result)) {
            throw std::runtime_error(std::string("Decompression failed: ") + ZSTD_getErrorName(result));
        }

        return Napi::Buffer<uint8_t>::Copy(env, out.data(), result);
    }
    catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("zstdCompress", Napi::Function::New(env, Compress));
    exports.Set("zstdDecompress", Napi::Function::New(env, Decompress));
    exports.Set("setMaxInputSize", Napi::Function::New(env, SetMaxInputSize));
    exports.Set("setMaxOutputSize", Napi::Function::New(env, SetMaxOutputSize));
    exports.Set("getLimits", Napi::Function::New(env, GetLimits));
    
    // Export constants
    exports.Set("DEFAULT_LEVEL", Napi::Number::New(env, DEFAULT_LEVEL));
    exports.Set("MIN_LEVEL", Napi::Number::New(env, MIN_LEVEL));
    exports.Set("MAX_LEVEL", Napi::Number::New(env, MAX_LEVEL));
    
    return exports;
}

NODE_API_MODULE(zstd_native, Init)
