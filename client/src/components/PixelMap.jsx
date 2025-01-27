import { useEffect, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { SketchPicker } from 'react-color';
import '../styles/PixelMap.css';

function PixelMap() {
  const width = 384;
  const height = 196;
  const [pixels, setPixels] = useState(Array(height).fill().map(() => Array(width).fill('#FFFFFF')));
  const [selPixelLoc, setSelPixelLoc] = useState({ x: null, y: null });
  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false);
  const [color, setColor] = useState('#000000');
  const [tempColor, setTempColor] = useState('#000000');
  const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');
    ws.onmessage = (event) => {
      const pixels = JSON.parse(event.data);
      setPixels(pixels);
    };

    fetchPixels();

    const lastConfirmTime = localStorage.getItem('lastConfirmTime');
    if (lastConfirmTime) {
      const timeElapsed = (Date.now() - lastConfirmTime) / 1000;
      if (timeElapsed < 180) {
        setIsConfirmDisabled(true);
        setCountdown(180 - timeElapsed);

        const intervalId = setInterval(() => {
          setCountdown((prevCountdown) => {
            if (prevCountdown <= 1) {
              clearInterval(intervalId);
              setIsConfirmDisabled(false);
              return 0;
            }
            return prevCountdown - 1;
          });
        }, 1000);
      }
    }
  }, []);

  const handleClick = (x, y) => {
    setSelPixelLoc({ x, y });
    setTempColor(pixels[y][x]);
    setIsOffcanvasOpen(true);
  };

  const closeOffcanvas = () => {
    setIsOffcanvasOpen(false);
  };

  const handleColorChange = (newColor) => {
    setTempColor(newColor.hex);
  };

  const handleHexChange = (event) => {
    setTempColor(event.target.value);
  };

  const confirmChanges = async () => {
    const newPixels = pixels.map((row, rowIndex) =>
      row.map((pixel, colIndex) => (rowIndex === selPixelLoc.y && colIndex === selPixelLoc.x ? tempColor : pixel))
    );
    setPixels(newPixels);
    setColor(tempColor);
    await storePixels(newPixels);
    closeOffcanvas();
    setIsConfirmDisabled(true);
    setCountdown(180);
    localStorage.setItem('lastConfirmTime', Date.now());

    const intervalId = setInterval(() => {
      setCountdown((prevCountdown) => {
        if (prevCountdown <= 1) {
          clearInterval(intervalId);
          setIsConfirmDisabled(false);
          return 0;
        }
        return prevCountdown - 1;
      });
    }, 1000);
  };

  const fetchPixels = async () => {
    try {
      const response = await fetch('http://localhost:8080/fetch-pixels');
      if (response.ok) {
        const pixels = await response.json();
        setPixels(pixels);
        console.log('Pixels fetched successfully');
      } else {
        console.error('Error fetching pixels:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching pixels:', error);
    }
  };

  const storePixels = async (pixels) => {
    try {
      const response = await fetch('http://localhost:8080/store-pixels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pixels }),
      });
  
      if (response.ok) {
        console.log('Pixels stored successfully');
      } else {
        console.error('Error storing pixels:', response.statusText);
      }
    } catch (error) {
      console.error('Error storing pixels:', error);
    }
  };

  return (
    <div>
      <TransformWrapper>
        <TransformComponent>
          <div className="canvas">
            {pixels.map((row, rowIndex) => (
              <div key={rowIndex} className="row">
                {row.map((pixel, colIndex) => (
                  <div
                    key={colIndex}
                    className="pixel"
                    style={{ backgroundColor: pixel }}
                    onClick={() => handleClick(colIndex, rowIndex)}
                  ></div>
                ))}
              </div>
            ))}
          </div>
        </TransformComponent>
      </TransformWrapper>

      <div className={`offcanvas ${isOffcanvasOpen ? 'open' : ''}`}>
        <div className="offcanvas-content">
          <h3 className="offcanvas-title">
            Edit pixel for {selPixelLoc.x},{selPixelLoc.y}
            <button className="close-btn" onClick={closeOffcanvas}>x</button>
          </h3>
          <input
            type="text"
            value={tempColor}
            onChange={handleHexChange}
            placeholder="Enter hex color"
            className="color-input"
          />
          <div className="color-picker-container">
            <SketchPicker color={tempColor} onChange={handleColorChange} />
          </div>
          <button className="confirm-btn" onClick={confirmChanges} disabled={isConfirmDisabled}>
            {isConfirmDisabled ? `Wait ${Math.ceil(countdown)} seconds` : 'Confirm'}
          </button>
        </div>
      </div>

      <div className={`overlay ${isOffcanvasOpen ? 'open' : ''}`} onClick={closeOffcanvas}></div>
    </div>
  );
}

export default PixelMap;
