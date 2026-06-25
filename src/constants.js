export const G = {
  gold: '#C5A55A', goldDk: '#A8893E', goldLt: '#F9F5EB', goldSf: '#F0E8D0',
  bg: '#FFFFFF', card: '#FFFFFF', text: '#1F2937', muted: '#6B7280', border: '#E8E3D8',
  ok: '#10B981', err: '#EF4444', warn: '#F59E0B'
}

export const iS = G => ({
  width: '100%', padding: 10, borderRadius: 8, border: '1px solid ' + G.border,
  fontSize: 14, color: G.text, boxSizing: 'border-box', marginBottom: 8, background: '#fff'
})

export const sS = G => ({
  width: '100%', padding: 10, borderRadius: 8, border: '1px solid ' + G.border,
  fontSize: 14, marginBottom: 8, background: '#fff'
})
