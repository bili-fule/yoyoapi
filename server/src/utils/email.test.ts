describe('sendVerificationCode', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.SMTP_HOST = ''
    // Ensure clean state for each test
    const val = process.env.LOG_VERIFICATION_CODES
    if (val !== undefined) {
      delete process.env.LOG_VERIFICATION_CODES
    }
  })

  it('should log code when SMTP not configured and LOG_VERIFICATION_CODES is not false', async () => {
    delete process.env.LOG_VERIFICATION_CODES
    const { sendVerificationCode } = await import('./email.js')
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const result = await sendVerificationCode('test@example.com', '123456')
    expect(result).toBe(true)
    expect(spy).toHaveBeenCalledWith('[DEV] Verification code for test@example.com: 123456')
    spy.mockRestore()
  })

  it('should not log when LOG_VERIFICATION_CODES is false', async () => {
    process.env.LOG_VERIFICATION_CODES = 'false'
    const { sendVerificationCode } = await import('./email.js')
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const result = await sendVerificationCode('test@example.com', '123456')
    expect(result).toBe(true)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
