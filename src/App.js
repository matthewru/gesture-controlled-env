import './App.css';
import HandTracker from './HandTracker';
import React from 'react';
import PoseDetector from './PoseDetectionTest';



function App() {

  return (
    <div className="App">
      <HandTracker></HandTracker>
      {/* <PoseDetector></PoseDetector> */}
    </div> 
  );
}

export default App;
