const { AppError } = require("./errors");
const { logamarillo } = require("../control/controlLog");

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function notFoundHandler(req, res, next) {
  next(new AppError("Recurso no encontrado", 404));
}

function errorHandler(err, req, res, next) {
  const status = err.statusCode && Number.isFinite(err.statusCode) ? err.statusCode : 500;
  const message = err.message || "Error interno del servidor";

  logamarillo(1, "HTTP %s %s -> %s", req.method, req.originalUrl, message);

  res.status(status).json({
    error: message,
    details: err.details || undefined
  });
}

module.exports = {
  asyncHandler,
  notFoundHandler,
  errorHandler
};
