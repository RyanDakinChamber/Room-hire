import { validationResult } from "express-validator";

const validateRequest = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new Error("Validation failed");
    err.status = 400;
    err.details = errors.array().map((e) => `${e.param}: ${e.msg}`);
    return next(err);
  }
  return next();
};

export default validateRequest;
