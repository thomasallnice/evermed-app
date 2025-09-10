declare module 'pdf-parse' {
  const pdfParse: (data: Buffer | Uint8Array, options?: any) => Promise<{ text?: string }>
  export default pdfParse
}
