import './App.css';
import Clock from './components/Clock';

function App() {
  return (
    <div className="dashboard-container">
      {/* --- TOP ROW --- */}
      <div className="top-left">
        <h2><Clock/></h2>
        
      </div>
      
      <div className="top-center">
        {/* Useful for temporary alerts or notifications */}
      </div>
      
      <div className="top-right">
        <h2>72°</h2>
        <p>Clear Skies</p>
      </div>

      {/* --- MIDDLE ROW --- */}
      <div className="middle-center">
        {/* Left intentionally blank for your physical reflection */}
      </div>

      {/* --- BOTTOM ROW --- */}
      <div className="bottom-left">
        <h3>ESP32 Sensors</h3>
        <p>Living Room: 68°</p>
      </div>
      
      <div className="bottom-center">
        <p>Notion Tasks API loading...</p>
      </div>
      
      <div className="bottom-right">
        <h3>System</h3>
        <p>Pi 4 Online</p>
      </div>
    </div>
  );
}

export default App;