let csrfToken: string | null = null;

export function getCsrfToken() {
    return csrfToken;
}

export function setCsrfToken(token: string) {
    csrfToken = token;
    sessionStorage.setItem('csrfToken', token);
}

export function loadCsrfTokenFromStorage() {
    const v = sessionStorage.getItem('csrfToken');
    if (v) csrfToken = v;
}
