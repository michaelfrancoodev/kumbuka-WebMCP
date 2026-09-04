import { useEffect, useMemo, useState } from 'react'
import { Mic, Square, Keyboard, Check, X, RotateCcw } from 'lucide-react'
import { useLang } from '../lib/lang'
import { useSpeech } from '../hooks/useSpeech'
import { useRecords } from '../hooks/useRecords'
import { parseSentence, generateTitle } from '../lib/parse'
import { isWebMCPAvailable } from '../lib/webmcp'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Sheet } from '../components/ui/Sheet'
import type { ParsedDraft } from '../lib/types'

export function RecordPage() {
  const { t, lang } = useLang()
  const { add } = useRecords()
  const { listening, transcript, start, stop, reset, supported } = useSpeech()

  const [inputMode, setInputMode] = useState<'voice' | 'text'>(supported ? 'voice' : 'text')
  const [textValue, setTextValue] = useState('')
  const [draft, setDraft] = useState<ParsedDraft | null>(null)
  // What the user sees and can correct in the review sheet. Starts as the
  // recognized/typed sentence verbatim; editing this is the ONLY way to
  // change what gets saved — there are no separate person/amount/item
  // fields to keep in sync, so nothing can drift out of agreement with it.
  const [editedText, setEditedText] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [source, setSource] = useState<'voice' | 'text'>('text')

  // Re-parse live as the user corrects the text, so the "what we understood"
  // preview always reflects exactly what's in the box, in any language —
  // nothing from the sentence is dropped, since the full text is always kept
  // verbatim as the record's note/originalText regardless of parsing.
  const liveDraft = useMemo(() => (sheetOpen ? parseSentence(editedText) : null), [sheetOpen, editedText])

  // When voice recognition stops with a transcript, parse it and open the review sheet.
  useEffect(() => {
    if (!listening && transcript.trim().length > 0) {
      const parsed = parseSentence(transcript)
      setDraft(parsed)
      setEditedText(transcript.trim())
      setSource('voice')
      setSheetOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening])

  function handleMicTap() {
    if (listening) {
      stop()
    } else {
      reset()
      start()
    }
  }

  function handleTextSubmit() {
    if (!textValue.trim()) return
    const parsed = parseSentence(textValue)
    setDraft(parsed)
    setEditedText(textValue.trim())
    setSource('text')
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
    setDraft(null)
    setEditedText('')
    setTextValue('')
    reset()
  }

  async function handleConfirm() {
    const finalText = editedText.trim()
    if (!finalText) return
    // Always re-parse from whatever text the user actually confirmed in the
    // review box — that's the single source of truth, so the saved record
    // (and its title) can never disagree with what's on screen.
    const final = parseSentence(finalText)
    const finalTitle = generateTitle(final, final.originalText)
    await add({
      id: crypto.randomUUID(),
      title: finalTitle,
      type: final.type,
      person: final.person,
      amount: final.amount,
      item: final.item,
      unit: final.unit,
      note: final.note,
      originalText: final.originalText,
      lang,
      source,
      confirmed: true,
      createdAt: Date.now(),
    })
    closeSheet()
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1800)
  }

  return (
    <div className="px-4 md:px-8 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-white mb-1">{t('appName')}</h1>
        <p className="text-sm text-white/50">{t('tagline')}</p>
      </div>

      <Card className="p-6 md:p-8 flex flex-col items-center gap-6">
        <div className="flex gap-2 self-start">
          <button
            onClick={() => setInputMode('voice')}
            disabled={!supported}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${inputMode === 'voice' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'} disabled:opacity-30`}
          >
            <Mic className="w-3.5 h-3.5 inline mr-1" /> {t('voice')}
          </button>
          <button
            onClick={() => setInputMode('text')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${inputMode === 'text' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
          >
            <Keyboard className="w-3.5 h-3.5 inline mr-1" /> {t('text')}
          </button>
        </div>

        {inputMode === 'voice' ? (
          <>
            <p className="text-sm text-white/50 text-center">{t('recordDesc')}</p>
            <button
              onClick={handleMicTap}
              className={`w-28 h-28 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                listening ? 'bg-red-500/20 border-2 border-red-400/50 animate-pulse-soft' : 'btn-primary shadow-lg shadow-accent/20 ring-2 ring-accent/25'
              }`}
            >
              {listening ? <Square className="w-8 h-8 text-red-400" /> : <Mic className="w-9 h-9" />}
            </button>
            <p className="text-sm font-medium text-white/70">{listening ? t('listening') : t('tapToSpeak')}</p>
            {listening && transcript && (
              <p className="text-sm text-white/60 italic text-center max-w-md">"{transcript}"</p>
            )}
          </>
        ) : (
          <div className="w-full flex flex-col gap-3">
            <p className="text-sm text-white/50 text-center">{t('typeDesc')}</p>
            <textarea
              value={textValue}
              onChange={e => setTextValue(e.target.value)}
              placeholder={t('askPlaceholder')}
              rows={3}
              className="input w-full rounded-xl px-4 py-3 text-sm text-white resize-none"
            />
            <Button onClick={handleTextSubmit} disabled={!textValue.trim()} full>
              {t('save')}
            </Button>
          </div>
        )}
      </Card>

      <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-white/30">
        <span className={`w-1.5 h-1.5 rounded-full ${isWebMCPAvailable() ? 'bg-emerald-400' : 'bg-white/20'}`} />
        {isWebMCPAvailable() ? t('webmcpReady') : t('webmcpOff')}
      </div>

      {savedFlash && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-sm font-medium animate-in">
          <Check className="w-4 h-4 inline mr-1.5" /> {t('save')}
        </div>
      )}

      <Sheet open={sheetOpen} onClose={closeSheet} title={t('reviewFirst')}>
        {draft && liveDraft && (
          <div className="flex flex-col gap-4">
            {/* What the agent understood — a live preview, not editable here.
                It updates as the text below is corrected, so the user can
                confirm at a glance whether the correction "took". */}
            <p className="text-sm font-medium text-white">{generateTitle(liveDraft, liveDraft.originalText)}</p>

            <div>
              <label className="text-xs text-white/50 mb-1.5 block">{t('original')}</label>
              <textarea
                value={editedText}
                onChange={e => setEditedText(e.target.value)}
                rows={3}
                autoFocus
                className="input w-full rounded-xl px-4 py-3 text-sm text-white resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="secondary" onClick={closeSheet} full>
                <X className="w-4 h-4" /> {t('discard')}
              </Button>
              {source === 'voice' && (
                <Button variant="secondary" onClick={() => { closeSheet(); reset(); start() }}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
              <Button onClick={handleConfirm} full disabled={!editedText.trim()}>
                <Check className="w-4 h-4" /> {t('confirm')}
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
