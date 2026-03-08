import React from 'react';

export function FormField(props: {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const hintId = props.hint ? `${props.id}-hint` : undefined;
  const errorId = props.error ? `${props.id}-error` : undefined;

  return (
    <div>
      <label className="block text-sm" htmlFor={props.id}>
        {props.label}
      </label>
      <div className="mt-1">
        {React.isValidElement(props.children)
          ? React.cloneElement(props.children as React.ReactElement<any>, {
              id: props.id,
              'aria-invalid': props.error ? true : undefined,
              'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
            })
          : props.children}
      </div>
      {props.hint ? (
        <p id={hintId} className="mt-1 text-xs text-slate-500">
          {props.hint}
        </p>
      ) : null}
      {props.error ? (
        <p id={errorId} className="mt-1 text-sm text-red-300">
          {props.error}
        </p>
      ) : null}
    </div>
  );
}
