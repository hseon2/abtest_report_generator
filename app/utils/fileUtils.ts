function triggerBlobDownload(blob: Blob, fileName: string) {
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
}

export async function downloadFile(
  base64Data: string | undefined,
  url: string | undefined,
  fileName: string,
  mimeType: string
) {
  if (base64Data) {
    // data URL 접두사가 붙어 있어도 순수 base64만 디코딩되도록 처리
    const normalizedBase64 = base64Data.includes(',')
      ? base64Data.split(',').pop() || ''
      : base64Data
    const byteCharacters = atob(normalizedBase64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: mimeType })
    triggerBlobDownload(blob, fileName)
    return
  }

  if (url) {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`파일 다운로드 실패 (status: ${response.status})`)
    }
    const blob = await response.blob()
    triggerBlobDownload(blob, fileName)
  }
}
