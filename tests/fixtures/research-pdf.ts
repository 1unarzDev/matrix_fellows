export function researchPdfFixture(pageTexts = ['We use simulation to evaluate robot navigation.', 'Our goal is to compare failure modes.']): Uint8Array {
  const objects: string[] = []
  const fontId = 3 + pageTexts.length * 2
  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  objects.push(`<< /Type /Pages /Kids [${pageTexts.map((_, i) => `${3 + i * 2} 0 R`).join(' ')}] /Count ${pageTexts.length} >>`)
  for (let i = 0; i < pageTexts.length; i++) {
    const escaped = pageTexts[i]!.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')
    const stream = `BT /F1 12 Tf 50 700 Td (${escaped}) Tj ET`
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${4 + i * 2} 0 R >>`)
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  }
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  let text = '%PDF-1.4\n'
  const offsets = [0]
  for (let i = 0; i < objects.length; i++) { offsets.push(text.length); text += `${i + 1} 0 obj\n${objects[i]}\nendobj\n` }
  const xref = text.length
  text += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new TextEncoder().encode(text)
}
