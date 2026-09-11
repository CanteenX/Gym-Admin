import React from 'react';
import { Spinner } from 'reactstrap';
import logo from "../../assets/images/logo.png";

const LoadingScreen = () => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <img src={logo} alt="Logo" className="loading-logo" />
        <Spinner color="primary" className="mt-4" />
      </div>
      <style>{`
        .loading-screen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(248, 249, 250, 0.01);
          backdrop-filter: blur(5px);
          z-index: 9999;
        }
        
        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          border-radius: 10px;
        }
        
        .loading-logo {
          max-width: 250px;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen; 