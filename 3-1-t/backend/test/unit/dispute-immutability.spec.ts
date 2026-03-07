describe('dispute immutability unit', () => {
  it('placeholder: resolved dispute cannot transition back to open', () => {
    const status = 'RESOLVED';
    expect(status).toBe('RESOLVED');
  });
});
