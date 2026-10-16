import zlib from "node:zlib";

const MIN_COMPRESSION_SIZE = 1024; // 1 KB

/**
 * Native zlib HTTP compression middleware for Express.
 * Compresses JSON/text HTTP responses when client sends Accept-Encoding: gzip.
 * Zero external dependencies — avoids bloating package dependencies.
 */
export function compressionMiddleware(req, res, next) {
  const acceptEncoding = req.headers["accept-encoding"] || "";
  if (!acceptEncoding.includes("gzip")) {
    return next();
  }

  const originalSend = res.send.bind(res);

  res.send = function (body) {
    if (res.headersSent || !body) {
      return originalSend(body);
    }

    let rawBuffer;
    if (Buffer.isBuffer(body)) {
      rawBuffer = body;
    } else if (typeof body === "string") {
      rawBuffer = Buffer.from(body);
    } else {
      try {
        rawBuffer = Buffer.from(JSON.stringify(body));
      } catch {
        return originalSend(body);
      }
    }

    // Skip compression for small payloads (< 1KB)
    if (rawBuffer.length < MIN_COMPRESSION_SIZE) {
      return originalSend(body);
    }

    // Do not compress already compressed streams (audio/video/images/already encoded)
    const contentType = (res.getHeader("Content-Type") || "").toString();
    if (
      contentType.includes("audio") ||
      contentType.includes("video") ||
      contentType.includes("image") ||
      res.getHeader("Content-Encoding")
    ) {
      return originalSend(body);
    }

    zlib.gzip(rawBuffer, (err, compressed) => {
      if (err) {
        return originalSend(body);
      }

      res.setHeader("Content-Encoding", "gzip");
      res.setHeader("Vary", "Accept-Encoding");
      res.setHeader("Content-Length", compressed.length);

      if (!res.getHeader("Content-Type")) {
        if (
          typeof body === "object" ||
          (typeof body === "string" && (body.startsWith("{") || body.startsWith("[")))
        ) {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
        }
      }

      originalSend(compressed);
    });
  };

  next();
}
