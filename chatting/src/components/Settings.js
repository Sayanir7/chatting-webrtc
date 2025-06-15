import React from 'react';
import './css/Settings.css';
import { Link } from 'react-router-dom';

const Settings = () => {
  return (
    <div className="settings-page">
      <h2>Settings</h2>
      <div className="settings-options">
        <label>
          <input type="checkbox" />
          Enable Dark Mode
        </label>
        <label>
          <input type="checkbox" />
          Mute Notifications
        </label>
        <label>
          <input type="checkbox" />
          Show Online Status
        </label>
        <Link to="/chat">Chat</Link>
      </div>
    </div>
  );
};

export default Settings;
