
import React, { useEffect, useRef, useState } from 'react'
import { ocrExtract, parseNameCode } from './ocr.js'

export default function App(){
  const [recipient, setRecipient] = useState('')
  const [deputy, setDeputy] = useState('')
  const [recipientErr, setRecipientErr] = useState(false)
  const [deputyErr, setDeputyErr] = useState(false)
  const [notes, setNotes] = useState('تحديث')
  const [imageUrl, setImageUrl] = useState(null)
  const [people, setPeople] = useState([])
  const [finalText, setFinalText] = useState('')
  const [busy, setBusy] = useState(false)
  const dropRef = useRef(null)

  useEffect(()=>{
    const theme = localStorage.getItem('theme') || 'light'
    document.documentElement.classList.toggle('dark', theme==='dark')
  },[])
  function toggleTheme(){ const isDark = document.documentElement.classList.toggle('dark'); localStorage.setItem('theme', isDark?'dark':'light') }

  function onFile(e){
    const f = e.target.files?.[0]
    if(f){
      const url = URL.createObjectURL(f)
      setImageUrl(url)
      doOCR(f)
    }
  }

  useEffect(()=>{
    function onPaste(e){
      const items = e.clipboardData?.items || []
      for(const it of items){
        if(it.type?.startsWith('image/')){
          const f = it.getAsFile()
          const url = URL.createObjectURL(f)
          setImageUrl(url)
          doOCR(f)
          e.preventDefault()
          break
        }
      }
    }
    window.addEventListener('paste', onPaste)
    return ()=> window.removeEventListener('paste', onPaste)
  },[])

  useEffect(()=>{
    const el = dropRef.current; if(!el) return
    const prevent=e=>{ e.preventDefault(); e.stopPropagation() }
    const drop=e=>{ prevent(e); const f = e.dataTransfer?.files?.[0]; if(f){ const url=URL.createObjectURL(f); setImageUrl(url); doOCR(f) } }
    el.addEventListener('dragover', prevent); el.addEventListener('dragenter', prevent); el.addEventListener('drop', drop)
    return ()=>{ el.removeEventListener('dragover', prevent); el.removeEventListener('dragenter', prevent); el.removeEventListener('drop', drop) }
  },[])

  async function doOCR(f){
    setBusy(true)
    try{
      const lines = await ocrExtract(f)
      const arr = []
      for(const ln of lines){
        if(!/[\u0600-\u06FF]/.test(ln)) continue
        const { name, code } = parseNameCode(ln)
        if(!name) continue
        arr.push({ name, code, status: 'field' })
      }
      const map = new Map()
      for(const p of arr){
        const key = (p.name+'|'+p.code).trim()
        if(!map.has(key)) map.set(key, p)
      }
      setPeople(Array.from(map.values()))
    }catch(err){
      console.error(err)
      alert('تعذر استخراج النص من الصورة')
    }finally{
      setBusy(false)
    }
  }

  function generate(){
    const rEmpty = !recipient.trim()
    const dEmpty = !deputy.trim()
    setRecipientErr(rEmpty)
    setDeputyErr(dEmpty)
    if(rEmpty || dEmpty) return

    const inField = people.filter(p=>p.status!=='oos')
    const oos = people.filter(p=>p.status==='oos')
    const totalField = inField.length + 1

    const fieldLines = inField.map(p => `${p.name}${p.code? ' ' + p.code : ''}${p.status==='busy'?' (مشغول)':''}`).join('\n')
    const oosLines = oos.map(p => `${p.name}${p.code? ' ' + p.code : ''}`).join('\n')

    const text = `📌 استلام العمليات 📌 

 المستلم : ${recipient}

 النائب : ${deputy}
 
عدد و اسماء الوحدات الاسعافيه في الميدان :{${totalField}}
${fieldLines ? fieldLines + '\n' : ''}
خارج الخدمه : (${oos.length})
${oosLines ? oosLines + '\n' : ''}
🎙️ تم استلام العمليات و جاهزون للتعامل مع البلاغات

الملاحظات : ${notes}`
    setFinalText(text)
  }

  async function copyText(){
    if(!finalText) return
    try{ await navigator.clipboard.writeText(finalText); alert('تم النسخ ✅') }
    catch(e){ alert('انسخ يدويًا') }
  }

  return (
    <div className="container">
      <div className="headerWrap">
        <div className="header">
          <img src="/logo-left.png" alt="logo left" className="left" />
          <div className="title">تحديث مركز العمليات للصحة</div>
          <img src="/logo-right.png" alt="logo right" className="right" />
        </div>
        <div className="toolbar">
          <button className="btn" onClick={toggleTheme}>الوضع الداكن/الفاتح</button>
        </div>
      </div>

      <div className="card">
        <div className="grid2">
          <div>
            <label className="label">المستلم</label>
            <input className="input" placeholder="الاسم + الكود" value={recipient} onChange={e=>setRecipient(e.target.value)} />
            {recipientErr && <div className="hint">يجب عليك كتابة الاسم مع كود</div>}
          </div>
          <div>
            <label className="label">النائب</label>
            <input className="input" placeholder="الاسم + الكود" value={deputy} onChange={e=>setDeputy(e.target.value)} />
            {deputyErr && <div className="hint">يجب عليك كتابة الاسم مع كود</div>}
          </div>
        </div>

        <div className="grid2" style={{marginTop:12}}>
          <div>
            <label className="label">📷 ارفع صورة (أو الصق بـ Ctrl+V)</label>
            <input className="input" type="file" accept="image/*" onChange={onFile} />
          </div>
          <div>
            <label className="label">أو اسحب وأفلِت هنا</label>
            <div ref={dropRef} className="drop">اسحب الصورة وأفلِتها هنا</div>
          </div>
        </div>

        {imageUrl && <img src={imageUrl} alt="preview" className="preview" />}

        {people.length>0 && (
          <div style={{marginTop:12}}>
            <div className="label">القائمة المستخرجة (يمكن تعديل الحالة يدويًا):</div>
            <div className="list">
              {people.map((p,idx)=>(
                <div className="item" key={idx}>
                  <input className="input" value={p.name} placeholder="الاسم"
                    onChange={e=>{ const cp=[...people]; cp[idx].name=e.target.value; setPeople(cp) }}/>
                  <input className="input" value={p.code} placeholder="الكود"
                    onChange={e=>{ const cp=[...people]; cp[idx].code=e.target.value; setPeople(cp) }}/>
                  <select className="select" value={p.status}
                    onChange={e=>{ const cp=[...people]; cp[idx].status=e.target.value; setPeople(cp) }}>
                    <option value="field">في الميدان</option>
                    <option value="busy">مشغول (في الميدان)</option>
                    <option value="oos">خارج الخدمة</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="toolbar">
          <button className="btn primary" onClick={generate}>{busy? 'جاري التحليل…':'توليد النص النهائي'}</button>
          <button className="btn" onClick={copyText} disabled={!finalText}>نسخ النتيجة</button>
        </div>
      </div>

      <div className="card">
        <label className="label">النتيجة النهائية</label>
        <textarea className="textarea" value={finalText} onChange={e=>setFinalText(e.target.value)} placeholder="النتيجة النهائية ستظهر هنا بالنموذج المطلوب…" />
        <div className="footerNote">المستلم يُحتسب ضمن العدد ولا يُعرض ضمن قائمة الميدان.</div>
      </div>
    </div>
  )
}
