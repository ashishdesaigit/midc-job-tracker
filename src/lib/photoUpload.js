import imageCompression from 'browser-image-compression'
import { supabase } from './supabase'

export async function uploadPhoto(file, path) {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
  })
  const { error } = await supabase.storage
    .from('job-photos')
    .upload(path, compressed)
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage
    .from('job-photos')
    .getPublicUrl(path)
  return publicUrl
}

export function photoPath(unitId, jobId, type, id) {
  const ts = Date.now()
  const names = {
    sample: `sample_${ts}.jpg`,
    dispatch: `dispatch_${ts}.jpg`,
    rejection: `rejection_${id}.jpg`,
  }
  return `${unitId}/${jobId}/${names[type]}`
}
