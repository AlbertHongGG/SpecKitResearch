import { Readable } from 'node:stream';

import { NextResponse, type NextRequest } from 'next/server';

import { withRouteHandler } from '../../../../src/server/http/routeHandler';
import { authorizeFileRead } from '../../../../src/server/files/authorizeFileRead';
import { openUploadStream } from '../../../../src/server/files/storage';

export const GET = withRouteHandler(async (req: NextRequest) => {
  const fileId = req.nextUrl.pathname.split('/').pop();
  if (!fileId) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'fileId required' } }, { status: 400 });
  }

  const { file } = await authorizeFileRead({ req, fileId });
  const nodeStream = await openUploadStream(file.path);
  const stream = Readable.toWeb(nodeStream) as ReadableStream;

  return new NextResponse(stream, {
    headers: {
      'content-type': file.mimeType,
      'content-length': String(file.size),
      'content-disposition': `inline; filename="${encodeURIComponent(file.originalName)}"`,
    },
  });
});
