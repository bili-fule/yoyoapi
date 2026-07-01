import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { errorHandler } from './error.js'
import { AppError, NotFoundError, AuthError, ForbiddenError } from '../utils/errors.js'

function createMockRes(): Response {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }
  return res as Response
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('errorHandler', () => {
  const mockReq = {} as Request
  const mockNext = vi.fn() as NextFunction

  it('returns 400 with validation details for ZodError', () => {
    const res = createMockRes()
    const zodError = new ZodError([
      { code: 'invalid_string', path: ['email'], message: 'Invalid email' },
      { code: 'too_small', path: ['password'], message: 'Password too short' },
    ])

    errorHandler(zodError, mockReq, res, mockNext)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Validation error',
        code: 'validation_error',
        details: [
          { path: 'email', message: 'Invalid email' },
          { path: 'password', message: 'Password too short' },
        ],
      },
    })
  })

  it('returns 400 with validation details for single-path ZodError', () => {
    const res = createMockRes()
    const zodError = new ZodError([
      { code: 'invalid_type', path: ['body', 'name'], message: 'Required' },
    ])

    errorHandler(zodError, mockReq, res, mockNext)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Validation error',
        code: 'validation_error',
        details: [{ path: 'body.name', message: 'Required' }],
      },
    })
  })

  it('returns AppError statusCode and error code', () => {
    const res = createMockRes()
    const appError = new AppError(404, 'User not found', 'not_found')

    errorHandler(appError, mockReq, res, mockNext)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'User not found', code: 'not_found' },
    })
  })

  it('handles AppError without explicit code', () => {
    const res = createMockRes()
    const appError = new AppError(429, 'Too many requests')

    errorHandler(appError, mockReq, res, mockNext)

    expect(res.status).toHaveBeenCalledWith(429)
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Too many requests', code: undefined },
    })
  })

  it('handles NotFoundError subclass', () => {
    const res = createMockRes()
    const err = new NotFoundError('Channel not found')

    errorHandler(err, mockReq, res, mockNext)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Channel not found', code: 'not_found' },
    })
  })

  it('handles AuthError subclass', () => {
    const res = createMockRes()
    const err = new AuthError('Invalid token')

    errorHandler(err, mockReq, res, mockNext)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Invalid token', code: 'unauthorized' },
    })
  })

  it('handles ForbiddenError subclass', () => {
    const res = createMockRes()
    const err = new ForbiddenError('Admin only')

    errorHandler(err, mockReq, res, mockNext)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Admin only', code: 'forbidden' },
    })
  })

  it('returns 500 with internal_error for unknown Error', () => {
    const res = createMockRes()
    const err = new Error('Something broke')

    errorHandler(err, mockReq, res, mockNext)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Internal server error', code: 'internal_error' },
    })
  })

  it('returns 500 for non-Error thrown values', () => {
    const res = createMockRes()
    const err = 'string error'

    errorHandler(err as unknown as Error, mockReq, res, mockNext)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Internal server error', code: 'internal_error' },
    })
  })
})
