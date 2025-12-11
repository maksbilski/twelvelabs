import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [message, setMessage] = useState('Ładowanie...')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Wywołanie API backendu
    fetch('http://localhost:8000/api/hello')
      .then(response => response.json())
      .then(data => {
        setMessage(data.message)
        setLoading(false)
      })
      .catch(error => {
        setMessage('Błąd połączenia z backendem')
        setLoading(false)
        console.error('Error:', error)
      })
  }, [])

  return (
    <div className="App">
      <h1>TwelveLabs</h1>
      <div className="card">
        {loading ? (
          <p>Ładowanie...</p>
        ) : (
          <p>{message}</p>
        )}
      </div>
      <p className="info">
        Frontend: React + Vite | Backend: FastAPI
      </p>
    </div>
  )
}

export default App

