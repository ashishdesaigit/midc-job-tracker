export function openWhatsApp(phone, message) {
  const cleaned = phone.replace(/\D/g, '')
  const number = cleaned.startsWith('91') ? cleaned : `91${cleaned}`
  // whatsapp:// opens the app directly on mobile — no intermediate webpage
  // Falls back to wa.me on desktop where WhatsApp app may not be installed
  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)
  const url = isMobile
    ? `whatsapp://send?phone=${number}&text=${encodeURIComponent(message)}`
    : `https://wa.me/${number}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank')
}
