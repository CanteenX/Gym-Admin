import React from 'react';
import PropTypes from 'prop-types';

const LoadingOverlay = ({ fullScreen = false }) => {
  const overlayStyle = {
    position: fullScreen ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100000
  };

  const spinnerWrapperStyle = {
    textAlign: 'center'
  };

  const textStyle = {
    color: '#fff',
    marginTop: '10px',
    fontWeight: '500'
  };

  return (
    <div style={overlayStyle}>
      <div style={spinnerWrapperStyle}>
        <output className="spinner-border text-primary">
          <span className="visually-hidden">Loading...</span>
        </output>
        <div style={textStyle}>Loading...</div>
      </div>
    </div>
  );
};

LoadingOverlay.propTypes = {
  fullScreen: PropTypes.bool,
};

export default LoadingOverlay;