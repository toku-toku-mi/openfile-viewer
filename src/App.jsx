import { useEffect, useRef, useState } from "react"
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
    const ctx = canvas.getContext("2d")
    const layer = psdInfo.layers[selectedLayerIndex]

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
    const ctx = canvas.getContext("2d")

    canvas.width = psdInfo.width
    canvas.height = psdInfo.height

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    visibleLayerIndexes.forEach((i) => {
      const layer = psdInfo.layers[i]
      if (layer.canvas) {
        ctx.drawImage(layer.canvas, layer.left || 0, layer.top || 0)
      }
    })
  }, [visibleLayerIndexes, psdInfo])

  const flattenLayers = (layers, result = []) => {
    layers.forEach((layer) => {
      result.push({
        name: layer.name || "Unnamed Layer",
        canvas: layer.canvas,
        hidden: layer.hidden,
        left: layer.left,
        top: layer.top,
      })

      if (layer.children) flattenLayers(layer.children, result)
    })

    return result
  }

  const processFile = async (file) => {
    setFile(file)
    setFileType("")
    setMessage("")

    const name = file.name.toLowerCase()

    if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg")) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setFileType("image")
      return
    }

    if (name.endsWith(".pdf")) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setFileType("pdf")
      return
    }

    if (name.endsWith(".txt") || name.endsWith(".json") || name.endsWith(".csv")) {
      const text = await file.text()
      setTextContent(text)
      setFileType("text")
      return
    }

    if (name.endsWith(".psd")) {
      const buffer = await file.arrayBuffer()
      const psd = readPsd(buffer)

      const layers = flattenLayers(psd.children || [])

      const initialVisible = layers
        .map((layer, index) => (!layer.hidden && layer.canvas ? index : null))
        .filter((i) => i !== null)

      setPsdInfo({
        width: psd.width,
        height: psd.height,
        layers,
        thumbnail: psd.canvas ? psd.canvas.toDataURL() : null,
      })

      setVisibleLayerIndexes(initialVisible)
      setFileType("psd")
      setMessage("PSD読み込み成功")
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) processFile(file)
  }

  const toggleLayerVisibility = (index) => {
    setVisibleLayerIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    )
  }

  const showOnlyThisLayer = (index) => {
    setSelectedLayerIndex(index)
  }

  const clearLayerSelection = () => {
    setSelectedLayerIndex(null)
  }

  const showAllLayers = () => {
    const all = psdInfo.layers
      .map((layer, i) => (layer.canvas ? i : null))
      .filter((i) => i !== null)

    setVisibleLayerIndexes(all)
    setSelectedLayerIndex(null)
  }

  const downloadCanvasAsPng = (canvas, name) => {
    const link = document.createElement("a")
    link.download = name
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  const downloadSingleLayer = () => {
    if (selectedLayerIndex === null) return
    const canvas = layerCanvasRef.current
    downloadCanvasAsPng(canvas, "layer.png")
  }

  const downloadMergedLayers = () => {
    const canvas = mergedCanvasRef.current
    downloadCanvasAsPng(canvas, "merged.png")
  }

  return (
    <div className="app">
      <div className="container">
        <h1>OpenFile Viewer</h1>
        <p className="subtitle">
          PSD, PDF, images, text, and more — all in one viewer.
        </p>

        <input type="file" onChange={handleFileChange} />

        {message && <p>{message}</p>}

        {fileType === "image" && (
          <img src={previewUrl} alt="preview" style={{ maxWidth: "500px" }} />
        )}

        {fileType === "pdf" && (
          <iframe src={previewUrl} width="600" height="600" title="pdf" />
        )}

        {fileType === "text" && (
          <pre style={{ textAlign: "left" }}>{textContent}</pre>
        )}

        {fileType === "psd" && psdInfo && (
          <div>
            <h2>PSD情報</h2>

            {psdInfo.thumbnail && (
              <img src={psdInfo.thumbnail} alt="thumb" width="300" />
            )}

            <h3>単体レイヤー</h3>

            <button onClick={clearLayerSelection}>解除</button>
            <button onClick={downloadSingleLayer}>PNG保存</button>

            <canvas ref={layerCanvasRef}></canvas>

            <h3>合成表示</h3>

            <button onClick={showAllLayers}>全部ON</button>
            <button onClick={downloadMergedLayers}>PNG保存</button>

            <canvas ref={mergedCanvasRef}></canvas>

            <h3>レイヤー一覧</h3>

            <ul>
              {psdInfo.layers.map((layer, index) => (
                <li key={index}>
                  <label>
                    <input
                      type="checkbox"
                      checked={visibleLayerIndexes.includes(index)}
                      onChange={() => toggleLayerVisibility(index)}
                    />
                    {layer.name}
                  </label>

                  <button onClick={() => showOnlyThisLayer(index)}>
                    このレイヤーだけ表示
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default App