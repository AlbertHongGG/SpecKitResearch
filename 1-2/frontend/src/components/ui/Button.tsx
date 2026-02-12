export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    const { style, ...rest } = props;
    return (
        <button
            {...rest}
            style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #ccc',
                background: '#fff',
                cursor: 'pointer',
                ...style,
            }}
        />
    );
}
