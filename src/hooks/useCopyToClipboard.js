import { useState, useCallback } from 'react'
import { useToast } from '@/components/ui/Toast'

export function useCopyToClipboard({ successMessage = 'Copied to clipboard', errorMessage = 'Failed to copy' } = {}) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const copy = useCallback(async (text) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      toast({ message: successMessage, type: 'success' })
      setTimeout(() => setCopied(false), 2000)
      return true
    } catch {
      toast({ message: errorMessage, type: 'error' })
      return false
    }
  }, [toast, successMessage, errorMessage])

  return { copy, copied }
}
