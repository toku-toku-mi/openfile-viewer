import { useEffect, useState } from 'react'
import { readPsd } from 'ag-psd'
import './App.css'

function App() {
  const [file, setFile] = useState(null)
  const [fileType, setFileType] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [textContent, setTextContent] = useState('')
  const [psdInfo, setPsdInfo] = useState(null)
  const [message, setMessage] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const resetState = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl('')
    setTextContent('')
    setPsdInfo(null)
    setMessage('')
    setFileType('')
  }

  const getAllLayerNames = (layers = [], result = []) => {
    for (const layer of layers) {
      result.push(layer.name || `名前なしレイヤー ${result.length + 1}`)
      if (layer.children && layer.children.length > 0) {
        getAllLayerNames(layer.children, result)
      }
    }
    return result
  }

  const processFile = async (selected) => {
    if (!selected) return

    resetState()
    setFile(selected)

    const name = selected.name.toLowerCase()

    if (
      name.endsWith('.png') ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.gif') ||
      name.endsWith('.webp') ||
      name.endsWith('.svg')
    ) {
      const url = URL.createObjectURL(selected)
      setPreviewUrl(url)
      setFileType('image')
      setMessage('画像ファイルを表示しています')
      return
    }

    if (name.endsWith('.pdf')) {
      const url = URL.createObjectURL(selected)
      setPreviewUrl(url)
      setFileType('pdf')
      setMessage('PDFファイルを表示しています')
      return
    }

    if (
      name.endsWith('.txt') ||
      name.endsWith('.md') ||
      name.endsWith('.json') ||
      name.endsWith('.csv')
    ) {
      try {
        const text = await selected.text()
        setTextContent(text)
        setFileType('text')
        setMessage('テキストファイルを表示しています')
      } catch (error) {
        console.error(error)
        setMessage('テキストの読み込みに失敗しました')
      }
      return
    }

    if (name.endsWith('.psd')) {
      try {
        const buffer = await selected.arrayBuffer()
        const psd = readPsd(buffer)
        const layerNames = getAllLayerNames(psd.children || [])

        let thumbnail = ''
        if (psd.canvas) {
          thumbnail = psd.canvas.toDataURL('image/png')
        }

        setPsdInfo({
          width: psd.width,
          height: psd.height,
          childrenCount: layerNames.length,
          layerNames,
          thumbnail,
        })

        setFileType('psd')
        setMessage('PSDファイルを読み込みました')
      } catch (error) {
        console.error(error)
        setMessage('PSDの読み込みに失敗しました')
      }
      return
    }

    setMessage('このファイル形式はまだ未対応です')
  }

  const handleFileChange = async (event) => {
    const selected = event.target.files[0]
    await processFile(selected)
  }

  const handleDrop = async (event) => {
    event.preventDefault()
    setIsDragging(false)

    const droppedFile = event.dataTransfer.files[0]
    await processFile(droppedFile)
  }

  const handleDragOver = (event) => {
    event.preventDefault()
  }

  const handleDragEnter = (event) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (event) => {
    event.preventDefault()
    setIsDragging(false)
  }

  return (
    <div className="app">
      <div className="container">
        <h1>OpenFile Viewer</h1>
        <p className="subtitle">
          PSD, PDF, images, text, and more — all in one viewer.
        </p>

        <div
          className={`dropzone ${isDragging ? 'dragging' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
        >
          <input type="file" onChange={handleFileChange} />
          <p>ファイルを選択、またはここにドラッグ＆ドロップ</p>
        </div>

        {file && (
          <div className="info-card">
            <p><strong>ファイル名:</strong> {file.name}</p>
            <p><strong>サイズ:</strong> {(file.size / 1024).toFixed(1)} KB</p>
          </div>
        )}

        {message && <p className="message">{message}</p>}

        {fileType === 'image' && previewUrl && (
          <div className="viewer-card">
            <h2>画像プレビュー</h2>
            <img src={previewUrl} alt="preview" className="preview-image" />
          </div>
        )}

        {fileType === 'pdf' && previewUrl && (
          <div className="viewer-card">
            <h2>PDFビューア</h2>
            <iframe
              src={previewUrl}
              title="PDF Preview"
              className="pdf-frame"
            />
          </div>
        )}

        {fileType === 'text' && textContent && (
          <div className="viewer-card">
            <h2>テキスト表示</h2>
            <pre className="text-preview">{textContent}</pre>
          </div>
        )}

        {fileType === 'psd' && psdInfo && (
          <div className="viewer-card">
            <h2>PSD情報</h2>
            <p>幅: {psdInfo.width}px</p>
            <p>高さ: {psdInfo.height}px</p>
            <p>レイヤー数: {psdInfo.childrenCount}</p>

            {psdInfo.thumbnail ? (
              <div className="thumbnail-section">
                <h3>サムネイル</h3>
                <img
                  src={psdInfo.thumbnail}
                  alt="PSD Thumbnail"
                  className="psd-thumbnail"
                />
              </div>
            ) : (
              <p>このPSDにはサムネイルを表示できませんでした。</p>
            )}

            <div className="layers-section">
              <h3>レイヤー一覧</h3>
              <ul className="layer-list">
                {psdInfo.layerNames.map((name, index) => (
                  <li key={index}>{name}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App