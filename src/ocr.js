
export async function ocrExtract(fileOrUrl){
  const { Tesseract } = await import('tesseract.js')
  const res = await Tesseract.recognize(fileOrUrl, 'ara+eng', {
    tessedit_pageseg_mode: 6,
    preserve_interword_spaces: '1'
  })
  const lines = (res?.data?.lines || []).map(l => (l.text||'').trim()).filter(Boolean)
  return lines
}
export function cleanText(s){
  if(!s) return ''
  s = s.replace(/[|،:؛]/g,' ').replace(/\s+/g,' ').trim()
  s = s.replace(/[©#@*+=|~^`"“”'’\[\]\(\)<>{}]/g,' ')
  const codeMatch = s.match(/([A-Za-z]{1,4}-?\d{1,4})$/)
  const code = codeMatch ? codeMatch[1] : ''
  s = s.replace(/\b(?![A-Za-z]{1,4}-?\d{1,4}\b)[A-Za-z]+\b/g,' ').replace(/\s+/g,' ').trim()
  s = s.replace(/[^\u0600-\u06FF0-9\s-]/g,' ').replace(/\s+/g,' ').trim()
  if(code && !s.endsWith(code)) s = (s + ' ' + code).trim()
  return s
}
export function parseNameCode(line){
  const t = cleanText(line)
  if(!t) return { name:'', code:'' }
  let m = t.match(/^(.+?)\s+([A-Za-z]{1,4}-?\d{1,4})$/)
  if(m) return { name: m[1].trim(), code: m[2].trim() }
  m = t.match(/^([A-Za-z]{1,4}-?\d{1,4})\s+(.+)$/)
  if(m) return { name: m[2].trim(), code: m[1].trim() }
  return { name: t.trim(), code: '' }
}
