import './App.css';
import HandTracker from './HandTracker';
import VirtualEnvironment from './VirtualEnvironment';
import React, { useState } from 'react';
import Handtrackertest from './handtrackertest';



function App() {
  const [gesture, setGesture] = useState(null);

  const handleGestureDetected = (detectedGesture) => {
      setGesture(detectedGesture);
  };

  return (
    <div className="App">
      <HandTracker onGesture={handleGestureDetected}></HandTracker>
      <VirtualEnvironment gesture={gesture}></VirtualEnvironment>
      {/* <Handtrackertest></Handtrackertest> */}
    </div> 
  );
}

export default App;
