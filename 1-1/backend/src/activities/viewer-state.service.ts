import { Injectable } from '@nestjs/common'
import type { ActivityStatus } from '@prisma/client'

export type ViewerStateSummary = {
  is_registered: boolean
  can_register: boolean
}

export type ViewerStateDetail = ViewerStateSummary & {
  can_cancel: boolean
}

@Injectable()
export class ViewerStateService {
  computeSummary(params: {
    viewerUserId?: string
    isRegistered: boolean
    status: ActivityStatus
    remainingSlots: number
    deadline: Date
    now: Date
  }): ViewerStateSummary {
    const { viewerUserId, isRegistered, status, remainingSlots, deadline, now } = params

    if (!viewerUserId) {
      return {
        is_registered: false,
        can_register: false,
      }
    }

    const canRegister =
      !isRegistered &&
      status === 'published' &&
      remainingSlots > 0 &&
      now.getTime() < deadline.getTime()

    return {
      is_registered: isRegistered,
      can_register: canRegister,
    }
  }

  computeDetail(params: {
    viewerUserId?: string
    isRegistered: boolean
    status: ActivityStatus
    remainingSlots: number
    deadline: Date
    date: Date
    now: Date
  }): ViewerStateDetail {
    const summary = this.computeSummary({
      viewerUserId: params.viewerUserId,
      isRegistered: params.isRegistered,
      status: params.status,
      remainingSlots: params.remainingSlots,
      deadline: params.deadline,
      now: params.now,
    })

    const canCancel =
      !!params.viewerUserId &&
      params.isRegistered &&
      params.now.getTime() < params.deadline.getTime() &&
      params.now.getTime() < params.date.getTime()

    return {
      ...summary,
      can_cancel: canCancel,
    }
  }
}
