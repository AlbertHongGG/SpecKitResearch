import { NextResponse, type NextRequest } from 'next/server';

import { withRouteHandler } from '../../../../src/server/http/routeHandler';
import { getSession } from '../../../../src/server/session/getCurrentUser';

export const GET = withRouteHandler(async (req: NextRequest) => {
  const session = await getSession(req);
  return NextResponse.json({ session });
});
