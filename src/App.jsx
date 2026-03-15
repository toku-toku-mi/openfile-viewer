import { useEffect, useMemo, useRef, useState } from "react"
import { readPsd } from "ag-psd"
import "./App.css"

function App() {
  const [file, setFile] = useState(null)
  const [fileType, setFileType] = useState("")
  const [previewUrl, setPreviewUrl] = useState("")
  const [textContent, setTextContent] = useState("")
  const [psdInfo, setPsdInfo] = useState(null)
  const [message, setMessage] = useState("")
  const [selectedLayerIndex, setSelectedLayerIndex] = useState(null)
  const [visibleLayerIndexes, setVisibleLayerIndexes] = useState([])
  const [layerSearch, setLayerSearch] = useState("")

  const layerCanvasRef = useRef(null)
  const mergedCanvasRef = useRef(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    if (!psdInfo || selectedLayerIndex === null) return

    const canvas = layerCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    const layer = psdInfo.layers[selectedLayerIndex]
    if (!layer) return

    canvas.width = psdInfo.width
    canvas.height = psdInfo.height
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (layer.canvas) {
      ctx.drawImage(layer.canvas, layer.left || 0, layer.top || 0)
    }
  }, [selectedLayerIndex, psdInfo])

  useEffect(() => {
    if (!psdInfo) return

    const canvas = mergedCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    canvas.width = psdInfo.width
    canvas.height = psdInfo.height
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    visibleLayerIndexes.forEach((i) => {
      const layer = psdInfo.layers[i]
      if (layer?.canvas) {
        ctx.drawImage(layer.canvas, layer.left || 0, layer.top || 0)
      }
    })
  }, [visibleLayerIndexes, psdInfo])

  const flattenLayers = (layers, result = []) => {
    layers.forEach((layer) => {
      result.push({
        name: layer.name || `Unnamed Layer ${result.length + 1}`,
        canvas: layer.canvas || null,
        hidden: !!layer.hidden,
        left: layer.left ?? 0,
        top: layer.top ?? 0,
      })

      if (layer.children?.length) {
        flattenLayers(layer.children, result)
      }
    })

    return result
  }

  const resetState = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)

    setFile(null)
    setFileType("")
    setPreviewUrl("")
    setTextContent("")
    setPsdInfo(null)
    setMessage("")
    setSelectedLayerIndex(null)
    setVisibleLayerIndexes([])
    setLayerSearch("")
  }

  const processFile = async (selectedFile) => {
    if (!selectedFile) return

    resetState()
    setFile(selectedFile)

    const name = selectedFile.name.toLowerCase()

    if (
      name.endsWith(".png") ||
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg") ||
      name.endsWith(".gif") ||
      name.endsWith(".webp") ||
      name.endsWith(".svg")
    ) {
      const url = URL.createObjectURL(selectedFile)
      setPreviewUrl(url)
      setFileType("image")
      setMessage("画像ファイルを表示しています")
      return
    }

    if (name.endsWith(".pdf")) {
      const url = URL.createObjectURL(selectedFile)
      setPreviewUrl(url)
      setFileType("pdf")
      setMessage("PDFファイルを表示しています")
      return
    }

    if (
      name.endsWith(".txt") ||
      name.endsWith(".json") ||
      name.endsWith(".csv") ||
      name.endsWith(".md")
    ) {
      try {
        const text = await selectedFile.text()
        setTextContent(text)
        setFileType("text")
        setMessage("テキストファイルを表示しています")
      } catch (error) {
        console.error(error)
        setMessage("テキストの読み込みに失敗しました")
      }
      return
    }

    if (name.endsWith(".psd")) {
      try {
        const buffer = await selectedFile.arrayBuffer()
        const psd = readPsd(buffer)

        const layers = flattenLayers(psd.children || [])
        const initialVisible = layers
          .map((layer, index) => (!layer.hidden && layer.canvas ? index : null))
          .filter((index) => index !== null)

        setPsdInfo({
          width: psd.width,
          height: psd.height,
          layers,
          thumbnail: psd.canvas ? psd.canvas.toDataURL("image/png") : null,
        })

        setVisibleLayerIndexes(initialVisible)
        setFileType("psd")
        setMessage("PSDを読み込みました")
      } catch (error) {
        console.error(error)
        setMessage("PSDの読み込みに失敗しました")
      }
      return
    }

    setMessage("このファイル形式はまだ未対応です")
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) processFile(selectedFile)
  }

  const toggleLayerVisibility = (index) => {
    setVisibleLayerIndexes((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    )
  }

  const showOnlyThisLayer = (index) => {
    setSelectedLayerIndex(index)
  }

  const clearLayerSelection = () => {
    setSelectedLayerIndex(null)
  }

  const showAllLayers = () => {
    if (!psdInfo) return

    const all = psdInfo.layers
      .map((layer, i) => (layer.canvas ? i : null))
      .filter((i) => i !== null)

    setVisibleLayerIndexes(all)
    setSelectedLayerIndex(null)
  }

  const hideAllLayers = () => {
    setVisibleLayerIndexes([])
    setSelectedLayerIndex(null)
  }

  const downloadCanvasAsPng = (canvas, name) => {
    if (!canvas) return
    const link = document.createElement("a")
    link.download = name
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  const downloadSingleLayer = () => {
    if (selectedLayerIndex === null || !file) return
    const canvas = layerCanvasRef.current
    if (!canvas) return

    const baseName = file.name.replace(/\.psd$/i, "")
    downloadCanvasAsPng(
      canvas,
      `${baseName}-layer-${selectedLayerIndex + 1}.png`
    )
  }

  const downloadMergedLayers = () => {
    if (!file) return
    const canvas = mergedCanvasRef.current
    if (!canvas) return

    const baseName = file.name.replace(/\.psd$/i, "")
    downloadCanvasAsPng(canvas, `${baseName}-merged.png`)
  }

  const filteredLayers = useMemo(() => {
    if (!psdInfo) return []

    return psdInfo.layers
      .map((layer, index) => ({ ...layer, originalIndex: index }))
      .filter((layer) =>
        layer.name.toLowerCase().includes(layerSearch.toLowerCase())
      )
  }, [psdInfo, layerSearch])

  return (
    <div className="app">
      <div className="container">
        <h1>OpenFile Viewer</h1>
        <p className="subtitle">
          PSD, PDF, images, text, and more — all in one viewer.
        </p>

        <div className="top-bar">
          <input type="file" onChange={handleFileChange} />
          <button className="secondary-button" onClick={resetState}>
            リセット
          </button>
        </div>

        {file && (
          <div className="info-card">
            <p>
              <strong>ファイル名:</strong> {file.name}
            </p>
            <p>
              <strong>サイズ:</strong> {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        )}

        {message && <p className="message">{message}</p>}

        {fileType === "image" && previewUrl && (
          <div className="viewer-card">
            <h2>画像プレビュー</h2>
            <img src={previewUrl} alt="preview" className="preview-image" />
          </div>
        )}

        {fileType === "pdf" && previewUrl && (
          <div className="viewer-card">
            <h2>PDFビューア</h2>
            <iframe src={previewUrl} title="pdf-preview" className="pdf-frame" />
          </div>
        )}

        {fileType === "text" && textContent && (
          <div className="viewer-card">
            <h2>テキスト表示</h2>
            <pre className="text-preview">{textContent}</pre>
          </div>
        )}

        {fileType === "psd" && psdInfo && (
          <div className="psd-layout">
            <div className="viewer-panel">
              <div className="viewer-card">
                <h2>PSD情報</h2>
                <p>幅: {psdInfo.width}px</p>
                <p>高さ: {psdInfo.height}px</p>
                <p>レイヤー数: {psdInfo.layers.length}</p>

                {psdInfo.thumbnail && (
                  <div className="thumbnail-section">
                    <h3>PSD全体サムネイル</h3>
                    <img
                      src={psdInfo.thumbnail}
                      alt="PSD thumbnail"
                      className="psd-thumbnail"
                    />
                  </div>
                )}
              </div>

              <div className="viewer-card">
                <h2>単体レイヤー表示</h2>
                <div className="button-row">
                  <button onClick={clearLayerSelection}>単体表示を解除</button>
                  <button
                    onClick={downloadSingleLayer}
                    disabled={selectedLayerIndex === null}
                  >
                    単体表示をPNG保存
                  </button>
                </div>

                {selectedLayerIndex !== null ? (
                  <canvas ref={layerCanvasRef} className="layer-canvas" />
                ) : (
                  <p className="helper-text">
                    レイヤー一覧から「このレイヤーだけ表示」を押してください。
                  </p>
                )}
              </div>

              <div className="viewer-card">
                <h2>チェックしたレイヤーだけ合成表示</h2>
                <div className="button-row">
                  <button onClick={showAllLayers}>全部ON</button>
                  <button onClick={hideAllLayers}>全部OFF</button>
                  <button onClick={downloadMergedLayers}>PNG保存</button>
                </div>

                <canvas ref={mergedCanvasRef} className="layer-canvas" />
              </div>
            </div>

            <div className="sidebar-panel">
              <div className="viewer-card sticky-card">
                <h2>レイヤー一覧</h2>

                <input
                  type="text"
                  className="search-input"
                  placeholder="レイヤー名で検索"
                  value={layerSearch}
                  onChange={(e) => setLayerSearch(e.target.value)}
                />

                <p className="helper-text">
                  表示中: {filteredLayers.length} / {psdInfo.layers.length}
                </p>

                <ul className="layer-list">
                  {filteredLayers.map((layer) => (
                    <li key={layer.originalIndex} className="layer-item">
                      <div className="layer-main">
                        <label className="layer-checkbox">
                          <input
                            type="checkbox"
                            checked={visibleLayerIndexes.includes(layer.originalIndex)}
                            onChange={() => toggleLayerVisibility(layer.originalIndex)}
                            disabled={!layer.canvas}
                          />
                          <span>{layer.name}</span>
                        </label>

                        <button
                          onClick={() => showOnlyThisLayer(layer.originalIndex)}
                          disabled={!layer.canvas}
                        >
                          このレイヤーだけ表示
                        </button>
                      </div>

                      <div className="layer-sub">
                        {layer.hidden ? "初期状態: 非表示" : "初期状態: 表示"}
                        {!layer.canvas ? " / 画像を持たないレイヤー" : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App