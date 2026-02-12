import { useState } from 'react'
import { TextArea } from '../../components/form/TextArea'
import { Button } from '../../components/form/Button'
import { FormError } from '../../components/form/FormError'
import { isApiError } from '../../api/errors'
import { usePostInternalNote } from '../../api/agentActions'

export function InternalNoteBox(props: { ticketId: string; disabled?: boolean }) {
  const [content, setContent] = useState('')
  const post = usePostInternalNote(props.ticketId)
  const apiError = isApiError(post.error) ? post.error : null

  return (
    <div className="rounded border bg-white p-4">
      <div className="text-sm font-medium">內部備註</div>
      <div className="mt-3 space-y-3">
        <TextArea
          label="內容（Customer 不可見）"
          rows={3}
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
            variant="secondary"
            disabled={!content.trim() || post.isPending || props.disabled}
            onClick={async () => {
              await post.mutateAsync({ content })
              setContent('')
            }}
          >
            {post.isPending ? '送出中…' : '新增內部備註'}
          </Button>
        </div>
      </div>
    </div>
  )
}
