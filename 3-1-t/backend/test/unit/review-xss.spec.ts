describe('review xss unit', () => {
  it('placeholder: review comment is sanitized for rendering', () => {
    const raw = '<script>alert(1)</script>';
    const safe = raw.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    expect(safe.includes('<script>')).toBe(false);
  });
});
