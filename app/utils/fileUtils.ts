export function downloadFile(
  base64Data: string | undefined,
  url: string | undefined,
  fileName: string,
  mimeType: string
) {
  if (base64Data) {
    // Base64 데이터를 Blob으로 변환하여 다운로드
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: mimeType })
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } else if (url) {
    window.open(url, '_blank')
  }
}
