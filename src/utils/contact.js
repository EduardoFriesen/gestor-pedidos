export function whatsappUrl(phone, text) {
  let digits = String(phone || '').replace(/\D/g, '').replace(/^0+/, '')
  if (digits.length < 8) return null
  if (!digits.startsWith('54')) digits = '549' + digits
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
