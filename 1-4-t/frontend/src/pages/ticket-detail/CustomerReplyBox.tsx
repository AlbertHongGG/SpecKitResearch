import { useState } from 'react'
import { Button } from '../../components/form/Button'
import { TextArea } from '../../components/form/TextArea'
import { FormError } from '../../components/form/FormError'
import { usePostMessage } from '../../api/ticketActions'
import { isApiError } from '../../api/errors'

export function CustomerReplyBox(props: { ticketId: string; disabled?: boolean }) {
  const [content, setContent] = useState('')
  const post = usePostMessage(props.ticketId)

  const apiError = isApiError(post.error) ? post.error : null

  return (
    <div className="rounded border bg-white p-4">
      <div className="text-sm font-medium">回覆客服</div>
      <div className="mt-3 space-y-3">
        <TextArea
          label="內容"
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={post.isPending || props.disabled}
        />
        {apiError ? (
          <FormError
            message={`${apiError.message}${apiError.requestId ? ` (request_id: ${apiError.requestId})` : ''}`}
          />
        ) : null}
        <div className="flex justify-end">
          <Button
            type="button"
            disabled={!content.trim() || post.isPending || props.disabled}
            onClick={async () => {
              await post.mutateAsync({ content })
              setContent('')
            }}
          >
            {post.isPending ? '送出中…' : '送出'}
          </Button>
        </div>
      </div>
    </div>
  )
}
