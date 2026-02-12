import { notFound } from "next/navigation";

import { prisma } from "@/src/infra/db/prisma";
import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import { getThread } from "@/src/usecases/threads/getThread";
import { listPosts } from "@/src/usecases/posts/listPosts";
import { AuthRequiredAction } from "@/src/ui/components/AuthRequiredAction";
import { PostEditor } from "@/src/ui/post/PostEditor";
import { FavoriteButton } from "@/src/ui/reactions/FavoriteButton";
import { LikeButton } from "@/src/ui/reactions/LikeButton";
import { ReportButton } from "@/src/ui/reports/ReportButton";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;

  let threadData: Awaited<ReturnType<typeof getThread>>;
  let postData: Awaited<ReturnType<typeof listPosts>>;

  try {
    threadData = await getThread(prisma, threadId);
    postData = await listPosts(prisma, threadId);
  } catch (err) {
    if (err instanceof AppError && err.code === ErrorCodes.NotFound) {
      notFound();
    }
    throw err;
  }

  const board = await prisma.board.findUnique({
    where: { id: threadData.thread.boardId },
    select: { isActive: true },
  });
  const interactionsDisabled = board?.isActive === false;
  const interactionsDisabledReason = "此看板已停用，無法互動";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-xl font-semibold">{threadData.thread.title}</h1>
      {threadData.thread.content ? (
        <div className="mt-4 rounded-md border bg-white p-4 text-sm">
          {threadData.thread.content}
        </div>
      ) : null}

      <h2 className="mt-8 text-base font-semibold">回覆</h2>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <AuthRequiredAction label="登入後可按讚">
          <LikeButton
            targetType="thread"
            targetId={threadData.thread.id}
            disabled={interactionsDisabled}
            disabledReason={interactionsDisabledReason}
          />
        </AuthRequiredAction>
        <AuthRequiredAction label="登入後可收藏">
          <FavoriteButton
            threadId={threadData.thread.id}
            disabled={interactionsDisabled}
            disabledReason={interactionsDisabledReason}
          />
        </AuthRequiredAction>
        <AuthRequiredAction label="登入後可檢舉">
          <ReportButton
            targetType="thread"
            targetId={threadData.thread.id}
            disabled={interactionsDisabled}
            disabledReason={interactionsDisabledReason}
          />
        </AuthRequiredAction>
      </div>

      <div className="mt-4">
        <AuthRequiredAction label="登入後可回覆">
          <PostEditor
            threadId={threadData.thread.id}
            disabled={interactionsDisabled || threadData.thread.status !== "published"}
            disabledReason={
              interactionsDisabled
                ? interactionsDisabledReason
                : threadData.thread.status === "locked"
                  ? "此主題已鎖定，無法回覆"
                  : "目前無法回覆此主題"
            }
          />
        </AuthRequiredAction>
      </div>

      <div className="mt-3 grid gap-3">
        {postData.posts.map((p: { id: string; content: string }) => (
          <div key={p.id} className="rounded-md border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-neutral-500">{p.id}</div>
              <AuthRequiredAction label="登入後可檢舉">
                <ReportButton
                  targetType="post"
                  targetId={p.id}
                  label="檢舉回覆"
                  disabled={interactionsDisabled}
                  disabledReason={interactionsDisabledReason}
                />
              </AuthRequiredAction>
            </div>
            <div className="mt-2 text-sm">{p.content}</div>
          </div>
        ))}
        {postData.posts.length === 0 ? (
          <div className="rounded-md border px-4 py-6 text-sm text-neutral-600">
            目前沒有可見回覆。
          </div>
        ) : null}
      </div>
    </main>
  );
}

