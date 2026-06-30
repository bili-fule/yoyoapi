import {
  AppError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  RateLimitError,
} from './errors.js'

describe('AppError', () => {
  it('should create an error with statusCode, message, and code', () => {
    const err = new AppError(400, 'Bad request', 'bad_request')
    expect(err.statusCode).toBe(400)
    expect(err.message).toBe('Bad request')
    expect(err.code).toBe('bad_request')
  })

  it('should be instanceof Error', () => {
    const err = new AppError(500, 'Server error')
    expect(err).toBeInstanceOf(Error)
  })

  it('should have name AppError', () => {
    const err = new AppError(400, 'Test')
    expect(err.name).toBe('AppError')
  })

  it('should accept code as optional', () => {
    const err = new AppError(400, 'message')
    expect(err.code).toBeUndefined()
  })
})

describe('AuthError', () => {
  it('should have status 401 and code unauthorized', () => {
    const err = new AuthError()
    expect(err.statusCode).toBe(401)
    expect(err.code).toBe('unauthorized')
  })

  it('should use default message', () => {
    const err = new AuthError()
    expect(err.message).toBe('Unauthorized')
  })

  it('should accept custom message', () => {
    const err = new AuthError('Custom auth error')
    expect(err.message).toBe('Custom auth error')
  })

  it('should be instanceof AppError and Error', () => {
    const err = new AuthError()
    expect(err).toBeInstanceOf(AppError)
    expect(err).toBeInstanceOf(Error)
  })
})

describe('ForbiddenError', () => {
  it('should have status 403 and code forbidden', () => {
    const err = new ForbiddenError()
    expect(err.statusCode).toBe(403)
    expect(err.code).toBe('forbidden')
  })

  it('should use default message', () => {
    const err = new ForbiddenError()
    expect(err.message).toBe('Forbidden')
  })

  it('should accept custom message', () => {
    const err = new ForbiddenError('Custom forbidden')
    expect(err.message).toBe('Custom forbidden')
  })

  it('should be instanceof AppError', () => {
    const err = new ForbiddenError()
    expect(err).toBeInstanceOf(AppError)
  })
})

describe('NotFoundError', () => {
  it('should have status 404 and code not_found', () => {
    const err = new NotFoundError()
    expect(err.statusCode).toBe(404)
    expect(err.code).toBe('not_found')
  })

  it('should use default message', () => {
    const err = new NotFoundError()
    expect(err.message).toBe('Not found')
  })

  it('should accept custom message', () => {
    const err = new NotFoundError('User not found')
    expect(err.message).toBe('User not found')
  })

  it('should be instanceof AppError', () => {
    const err = new NotFoundError()
    expect(err).toBeInstanceOf(AppError)
  })
})

describe('ValidationError', () => {
  it('should have status 400 and code validation_error', () => {
    const err = new ValidationError('Invalid input')
    expect(err.statusCode).toBe(400)
    expect(err.code).toBe('validation_error')
  })

  it('should require a message', () => {
    const err = new ValidationError('Email is required')
    expect(err.message).toBe('Email is required')
  })

  it('should be instanceof AppError', () => {
    const err = new ValidationError('Bad')
    expect(err).toBeInstanceOf(AppError)
  })
})

describe('RateLimitError', () => {
  it('should have status 429 and code rate_limit', () => {
    const err = new RateLimitError()
    expect(err.statusCode).toBe(429)
    expect(err.code).toBe('rate_limit')
  })

  it('should use default message', () => {
    const err = new RateLimitError()
    expect(err.message).toBe('Too many requests')
  })

  it('should accept custom message', () => {
    const err = new RateLimitError('Slow down!')
    expect(err.message).toBe('Slow down!')
  })

  it('should be instanceof AppError', () => {
    const err = new RateLimitError()
    expect(err).toBeInstanceOf(AppError)
  })
})
