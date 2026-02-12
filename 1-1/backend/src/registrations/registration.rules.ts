import type { ActivityStatus } from '@prisma/client'
import { HttpException, HttpStatus } from '@nestjs/common'
import { makeError } from '../common/http/error-response'

export function assertCanRegister(params: {
  status: ActivityStatus
  remainingSlots: number
  deadline: Date
  now: Date
}) {
  const { status, remainingSlots, deadline, now } = params

  if (now.getTime() >= deadline.getTime()) {
    throw new HttpException(
      makeError('DEADLINE_PASSED', '已超過報名截止時間'),
      HttpStatus.UNPROCESSABLE_ENTITY,
    )
  }

  if (status === 'full' || remainingSlots <= 0) {
    throw new HttpException(makeError('FULL', '活動名額已滿'), HttpStatus.CONFLICT)
  }

  if (status !== 'published') {
    throw new HttpException(
      makeError('STATE_INVALID', '目前狀態不允許報名'),
      HttpStatus.UNPROCESSABLE_ENTITY,
    )
  }
}

export function assertCanCancel(params: {
  deadline: Date
  date: Date
  now: Date
}) {
  const { deadline, date, now } = params

  if (now.getTime() >= deadline.getTime()) {
    throw new HttpException(
      makeError('DEADLINE_PASSED', '已超過報名截止時間，無法取消'),
      HttpStatus.UNPROCESSABLE_ENTITY,
    )
  }

  if (now.getTime() >= date.getTime()) {
    throw new HttpException(
      makeError('STATE_INVALID', '活動已結束，無法取消'),
      HttpStatus.UNPROCESSABLE_ENTITY,
    )
  }
}

