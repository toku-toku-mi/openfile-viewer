import { useEffect, useRef, useState } from 'react'
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

  const [selectedLayerIndex, setSelectedLayerIndex] = useState(null)
  const [visibleLayerIndexes, setVisibleLayerIndexes] = useState([])

  const layerCanvasRef = useRef(null)
  const mergedCanvasRef = useRef(null)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  useEffect(() => {
    if (!psdInfo || selectedLayerIndex === null) return
    const canvas = layerCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const selectedLayer = psdInfo.layers[selectedLayerIndex]
    if (!selectedLayer || !selectedLayer.canvas) return

    canvas.width = psdInfo.width
    canvas.height = psdInfo.height
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (selectedLayer.left !== undefined && selectedLayer.top !== undefined) {
      ctx.drawImage(selectedLayer.canvas, selectedLayer.left, selectedLayer.top)
    } else {
      ctx.drawImage(selectedLayer.canvas, 0, 0)
    }
  }, [psdInfo, selectedLayerIndex])

  useEffect(() => {
    if (!psdInfo) return
    const canvas = mergedCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    canvas.width = psdInfo.width
    canvas.height = psdInfo.height
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    visibleLayerIndexes.forEach((index) => {
      const layer = psdInfo.layers[index]
      if (!layer || !layer.canvas) return

      if (layer.left !== undefined && layer.top !== undefined) {
        ctx.drawImage(layer.canvas, layer.left, layer.top)
      } else {
        ctx.drawImage(layer.canvas, 0, 0)
      }
    })
  }, [psdInfo, visibleLayerIndexes])

  const resetState = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl('')
    setTextContent('')
    setPsdInfo(null)
    setMessage('')
    setFileType('')
    setSelectedLayerIndex(null)
    setVisibleLayerIndexes([])
  }

  const flattenLayers = (layers = [], result = []) => {
    for (const layer of layers) {
      result.push({
        name: layer.name || `名前なしレイヤー ${result.length + 1}`,
        canvas: layer.canvas || null,
        hidden: !!layer.hidden,
        left: layer.left ?? 0,
        top: layer.top ?? 0,
      })

      if (layer.children && layer.children.length > 0) {
        flattenLayers(layer.children, result)
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

        const layers = flattenLayers(psd.children || [])
        let thumbnail = ''

        if (psd.canvas) {
          thumbnail = psd.canvas.toDataURL('image/png')
        }

        const initialVisible = layers
          .map((layer, index) => (!layer.hidden && layer.canvas ? index : null))
          .filter((index) => index !== null)

        setPsdInfo({
          width: psd.width,
          height: psd.height,
          layers,
          thumbnail,
        })

        setVisibleLayerIndexes(initialVisible)
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

  const toggleLayerVisibility = (index) => {
    setVisibleLayerIndexes((prev) => {
      if (prev.includes(index)) {
        return prev.filter((item) => item !== index)
      }
      return [...prev, index]
    })
  }

  const showOnlyThisLayer = (index) => {
    setSelectedLayerIndex(index)
  }

  const showAllLayers = () => {
    if (!psdInfo) return
    const allVisible = psdInfo.layers
      .map((layer, index) => (layer.canvas ? index : null))
      .filter((index) => index !== null)

    setVisibleLayerIndexes(allVisible)
    setSelectedLayerIndex(null)
  }

  const clearLayerSelection = () => {
    setSelectedLayerIndex(null)
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
            <p>レイヤー数: {psdInfo.layers.length}</p>

            {psdInfo.thumbnail ? (
              <div className="thumbnail-section">
                <h3>PSD全体サムネイル</h3>
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
              <h3>レイヤー単体表示</h3>
              <div className="button-row">
                <button onClick={clearLayerSelection}>単体表示を解除</button>
              </div>

              {selectedLayerIndex !== null && (
                <div className="canvas-section">
                  <canvas ref={layerCanvasRef} className="layer-canvas" />
                </div>
              )}
            </div>

            <div className="layers-section">
              <h3>チェックしたレイヤーだけ合成表示</h3>
              <div className="button-row">
                <button onClick={showAllLayers}>全部チェックする</button>
              </div>

              <div className="canvas-section">
                <canvas ref={mergedCanvasRef} className="layer-canvas" />
              </div>
            </div>

            <div className="layers-section">
              <h3>レイヤー一覧</h3>
              <ul className="layer-list">
                {psdInfo.layers.map((layer, index) => (
                  <li key={index} className="layer-item">
                    <div className="layer-main">
                      <label className="layer-checkbox">
                        <input
                          type="checkbox"
                          checked={visibleLayerIndexes.includes(index)}
                          onChange={() => toggleLayerVisibility(index)}
                          disabled={!layer.canvas}
                        />
                        <span>{layer.name}</span>
                      </label>

                      <button
                        onClick={() => showOnlyThisLayer(index)}
                        disabled={!layer.canvas}
                      >
                        このレイヤーだけ見る
                      </button>
                    </div>

                    <div className="layer-sub">
                      {layer.hidden ? '初期状態: 非表示' : '初期状態: 表示'}
                      {!layer.canvas && ' / 画像を持たないレイヤー'}
                    </div>
                  </li>
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