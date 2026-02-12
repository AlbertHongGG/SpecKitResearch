export function AsyncButton(props: {
  className: string;
  disabled?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  children: React.ReactNode;
}) {
  return (
    <button
      className={props.className}
      disabled={props.disabled || props.isLoading}
      onClick={props.onClick}
      type={props.type ?? 'button'}
    >
      {props.isLoading ? props.loadingText ?? '處理中…' : props.children}
    </button>
  );
}
