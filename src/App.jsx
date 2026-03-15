import { useState } from 'react'
import { readPsd } from 'ag-psd'
import './App.css'

function App() {
  const [file, setFile] = useState(null)
  const [imageUrl, setImageUrl] = useState('')
  const [psdInfo, setPsdInfo] = useState(null)
  const [message, setMessage] = useState('')

  const getAllLayerNames = (layers = [], result = []) => {
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i]
      result.push(layer.name || `レイヤー${result.length + 1}`)

      if (layer.children && layer.children.length > 0) {
        getAllLayerNames(layer.children, result)
      }
    }
    return result
  }

  const handleFile = async (event) => {
    const selected = event.target.files[0]
    if (!selected) return

    setFile(selected)
    setImageUrl('')
    setPsdInfo(null)
    setMessage('')

    const name = selected.name.toLowerCase()

    if (
      name.endsWith('.png') ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.gif') ||
      name.endsWith('.webp')
    ) {
      const url = URL.createObjectURL(selected)
      setImageUrl(url)
      setMessage('画像ファイルを表示しています')
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

        setMessage('PSDファイルを読み込みました')
      } catch (error) {
        console.error(error)
        setMessage('PSDの読み込みに失敗しました')
      }
      return
    }

    setMessage('このファイル形式はまだ未対応です')
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '60px', padding: '20px' }}>
      <h1>OpenFile Viewer</h1>
      <p>PSD, PDF, images, text, and more — all in one viewer.</p>

      <br />

      <input type="file" onChange={handleFile} />

      {file && (
        <div style={{ marginTop: '24px' }}>
          <p>ファイル名: {file.name}</p>
        </div>
      )}

      {message && (
        <p style={{ marginTop: '16px', fontWeight: 'bold' }}>{message}</p>
      )}

      {imageUrl && (
        <div style={{ marginTop: '24px' }}>
          <img
            src={imageUrl}
            alt="preview"
            style={{
              maxWidth: '500px',
              border: '1px solid #ccc',
              borderRadius: '8px',
            }}
          />
        </div>
      )}

      {psdInfo && (
        <div style={{ marginTop: '24px' }}>
          <p>幅: {psdInfo.width}px</p>
          <p>高さ: {psdInfo.height}px</p>
          <p>レイヤー数: {psdInfo.childrenCount}</p>

          {psdInfo.thumbnail && (
            <div style={{ marginTop: '24px' }}>
              <h3>サムネイル</h3>
              <img
                src={psdInfo.thumbnail}
                alt="PSD thumbnail"
                style={{
                  maxWidth: '320px',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                }}
              />
            </div>
          )}

          <div style={{ marginTop: '24px' }}>
            <h3>レイヤー一覧</h3>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                maxWidth: '420px',
                margin: '0 auto',
                textAlign: 'left',
              }}
            >
              {psdInfo.layerNames.map((name, index) => (
                <li
                  key={index}
                  style={{
                    padding: '8px 12px',
                    marginBottom: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                  }}
                >
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default App