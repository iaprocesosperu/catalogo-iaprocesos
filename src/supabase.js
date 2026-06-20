import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export async function comprimirImagen(file, maxSize = 800) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height
        if (w > h) { if (w > maxSize) { h = h * maxSize / w; w = maxSize } }
        else { if (h > maxSize) { w = w * maxSize / h; h = maxSize } }
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        canvas.toBlob(resolve, 'image/jpeg', 0.78)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export async function subirFoto(blob, codigo) {
  const filename = `${codigo}_${Date.now()}.jpg`
  const { data, error } = await supabase.storage
    .from('productos')
    .upload(filename, blob, { contentType: 'image/jpeg', upsert: true })
  if (error) throw error
  const { data: urlData } = supabase.storage.from('productos').getPublicUrl(filename)
  return urlData.publicUrl
}
