export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    const { style, ...rest } = props;
    return (
        <input
            {...rest}
            style={{
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #ccc',
                width: '100%',
                ...style,
            }}
        />
    );
}
