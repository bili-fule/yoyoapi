import type { Request, Response } from 'express'
import * as qqService from '../services/qq-bind.service.js'
import * as userService from '../services/user.service.js'

export async function getBindCode(req: Request, res: Response): Promise<void> {
  try {
    const data = await qqService.getBindCode(req.user!.id)
    res.json({ code: data.code, expire_seconds: data.expire_seconds })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to get bind code'
    res.status(502).json({ error: { message: msg } })
  }
}

export async function confirmBind(req: Request, res: Response): Promise<void> {
  try {
    const { qqId } = await qqService.confirmBind(req.user!.id)
    userService.updateUser(req.user!.id, { qq_id: qqId })
    res.json({ message: 'QQ bound successfully', qq_id: qqId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to confirm bind'
    res.status(400).json({ error: { message: msg } })
  }
}

export async function unbindQq(req: Request, res: Response): Promise<void> {
  try {
    await qqService.unbindQq(req.user!.id)
    userService.updateUser(req.user!.id, { qq_id: '' })
    res.json({ message: 'QQ unbound successfully' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to unbind'
    res.status(502).json({ error: { message: msg } })
  }
}
